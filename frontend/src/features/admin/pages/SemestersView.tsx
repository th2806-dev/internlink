import { useState, useEffect } from "react";
import {
  CalendarDays,
  Sparkles,
  Plus,
  Search,
  Users,
  CheckCircle2,
  Clock,
  Edit3,
  Copy,
  Lock,
  Eye,
  FileUp,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSemester } from "../../../contexts/SemesterContext";
import type { Semester } from "../../../contexts/SemesterContext";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { CreateSemesterModal } from "../components/modals/CreateSemesterModal";
import { SchoolAcademicTermsPanel } from "../components/SchoolAcademicTermsPanel";
import { EvidenceDeadlinePanel } from "../components/EvidenceDeadlinePanel";
import { AssignLecturerModal } from "../components/modals/AssignLecturerModal";
import { ImportStudentsModal } from "../components/modals/ImportStudentsModal";
import { ImportLecturersModal } from "../components/modals/ImportLecturersModal";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { adminStudentsService } from "../../../services/adminStudents.service";
import { adminLecturersService } from "../../../services/adminLecturers.service";
import { adminCompaniesService } from "../../../services/adminCompanies.service";
import type { ToastType } from "../../../contexts/ToastContext";

const EMPTY_SEMESTER = {
  id: "",
  name: "Chưa có kỳ thực tập",
  term: "",
  academicYear: "",
  startDate: "—",
  endDate: "—",
  lecturersCount: 0,
  studentsCount: 0,
  placedStudents: 0,
  companiesCount: 0,
  status: "upcoming" as const,
  progressPercent: 0,
  currentPhase: "Vui lòng tạo kỳ thực tập mới",
  description: "Nhấn nút \u201Ctạo kỳ thực tập mới\u201D để bắt đầu.",
};

function getInternshipPeriod(semester: Semester): { dates: string; weeks: string } {
  const parseDate = (value: string): Date | null => {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? null
      : new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
  };
  const schoolStart = parseDate(semester.startDate);
  const schoolEnd = parseDate(semester.endDate);
  const startWeek = semester.internshipStartWeek;
  const duration = semester.totalWeeks;
  if (!schoolStart || !schoolEnd || startWeek < 1 || duration < 1) {
    return { dates: "Chưa cấu hình", weeks: "" };
  }

  const internshipStart = new Date(schoolStart.getTime() + (startWeek - 1) * 7 * 86400000);
  const configuredEnd = new Date(internshipStart.getTime() + duration * 7 * 86400000 - 86400000);
  const internshipEnd = configuredEnd < schoolEnd ? configuredEnd : schoolEnd;
  if (internshipStart > schoolEnd || internshipEnd < internshipStart) {
    return { dates: "Cấu hình tuần không hợp lệ", weeks: "" };
  }

  const format = (date: Date) => date.toLocaleDateString("vi-VN", { timeZone: "UTC" });
  const availableWeeks = Math.ceil((schoolEnd.getTime() - schoolStart.getTime() + 86400000) / (7 * 86400000));
  const endWeek = startWeek + duration - 1;
  return {
    dates: `${format(internshipStart)} – ${format(internshipEnd)}`,
    weeks: `Tuần HK ${startWeek}–${endWeek}/${availableWeeks}`,
  };
}

export const SemestersView = ({ onShowToast, onNavigateTab }: { onShowToast: (msg: string, type?: ToastType) => void; onNavigateTab?: (tab: string) => void }) => {
  const { isSuperAdmin, isDepartmentAdmin } = useAdminCapabilities();
  // Semester lifecycle is department business: only Quản trị khoa mutates terms.
  const canMutateSemesters = isDepartmentAdmin;
  const {
    semesters: semestersList,
    selectedSemesterId,
    selectSemester,
    createSemester,
    updateSemester,
    closeSemester,
    startSemester,
    duplicateSemester,
    refreshApiCounts,
  } = useSemester();
  const [showCreateModal, setShowCreateModal] = useState(false);
  // null = create mode; a semester object = edit mode for that term.
  const [editingSemester, setEditingSemester] = useState<null | {
    id: string;
    name: string;
    term: string;
    academicYear: string;
    startDate: string;
    endDate: string;
    totalWeeks?: number;
    internshipStartWeek?: number;
    targetStudents?: number;
    description?: string;
  }>(null);
  const [importType, setImportType] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [tableFilterStatus, setTableFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  // Kỳ thực tập thường ít → 5/10/20 dòng/trang.
  const [pageSize, setPageSize] = useState(5);

  const [formData, setFormData] = useState({
    name: "",
    term: "Học kỳ I",
    academicYear: "2026 - 2027",
    startDate: "",
    endDate: "",
    description: "",
  });

  const currentActiveSem =
    semestersList.find((s) => s.id === selectedSemesterId && s.status !== "completed") ||
    semestersList.find((s) => s.status === "active") ||
    semestersList.find((s) => s.status === "upcoming") ||
    semestersList[0] ||
    EMPTY_SEMESTER;

  const handleCreateNewFromForm = (e, isDraft = false) => {
    e.preventDefault();
    if (!formData.name) {
      onShowToast("Vui lòng nhập tên kỳ thực tập!");
      return;
    }
    createSemester({
      name: formData.name,
      term: formData.term,
      academicYear: formData.academicYear,
      startDate: formData.startDate || "01/09/2026",
      endDate: formData.endDate || "15/12/2026",
      status: isDraft ? "draft" : "upcoming",
      description: formData.description || `Đợt thực tập ${formData.term} ${formData.academicYear}`,
      totalWeeks: 6,
    });
    onShowToast(
      `Đã ${isDraft ? "lưu nháp" : "tạo thành công"} kỳ thực tập: "${formData.name}"`,
    );
    setFormData({
      name: "",
      term: "Học kỳ I",
      academicYear: "2026 - 2027",
      startDate: "",
      endDate: "",
      description: "",
    });
  };

  const handleDuplicateSemester = (sem) => {
    duplicateSemester(sem, onShowToast);
  };

  const handleCloseSemester = (semId: string, _semName: string) => {
    closeSemester(semId, onShowToast);
  };
  const handleStartSemester = (semId: string) => {
    void startSemester(semId, onShowToast);
  };
  const activeSem = currentActiveSem;
  const activeInternshipPeriod = getInternshipPeriod(currentActiveSem as Semester);
  const hasRealSemester = !!currentActiveSem.id;
  const filteredSemesters = semestersList.filter((s) => {
    const matchesFilter =
      tableFilterStatus === "all" || s.status === tableFilterStatus;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.academicYear.includes(searchQuery) ||
      s.term.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });
  const totalPages = Math.ceil(filteredSemesters.length / pageSize) || 1;
  const paginatedSemesters = filteredSemesters.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      {isSuperAdmin && <SchoolAcademicTermsPanel onShowToast={onShowToast} />}
      <PageHeader
        icon={CalendarDays}
        title="Quản lý kỳ thực tập"
        actions={
          canMutateSemesters
            ? [
                {
                  label: "Nhập giảng viên",
                  icon: FileUp,
                  onClick: () => setImportType("lecturers"),
                  variant: "secondary",
                },
                {
                  label: "Nhập sinh viên",
                  icon: Users,
                  onClick: () => setImportType("students"),
                  variant: "secondary",
                },
                {
                  label: "Tạo kỳ thực tập mới",
                  icon: Plus,
                  onClick: () => {
                    setEditingSemester(null);
                    setShowCreateModal(true);
                  },
                  variant: "primary",
                },
              ]
            : []
        }
      />

      {canMutateSemesters && hasRealSemester && (
        <EvidenceDeadlinePanel semesterId={activeSem.id} semesterName={activeSem.name} />
      )}

      {/* Current semester summary and semester list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-12 space-y-5">
          {/* ACTIVE INTERNSHIP FEATURED SUMMARY */}
          <Panel className="space-y-5 relative overflow-hidden border-blue-200/90">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-lg shadow-md shadow-blue-600/20 shrink-0">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {currentActiveSem.name}
                    </h2>
                    <span className={`px-3 py-0.5 text-xs font-bold rounded-full flex items-center gap-1.5 ${activeSem.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : activeSem.status === "completed" ? "bg-slate-100 text-slate-600 border border-slate-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                      <span className={`w-2 h-2 rounded-full ${activeSem.status === "active" ? "bg-emerald-500" : activeSem.status === "completed" ? "bg-slate-400" : "bg-blue-500"}`} />
                      {activeSem.status === "active" ? "Đang diễn ra" : activeSem.status === "completed" ? "Đã hoàn thành" : "Sắp tới"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {currentActiveSem.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {canMutateSemesters && (
                  <>
                    <button
                      onClick={() => {
                        setEditingSemester({
                          id: currentActiveSem.id,
                          name: currentActiveSem.name,
                          term: currentActiveSem.term,
                          academicYear: currentActiveSem.academicYear,
                          startDate: currentActiveSem.startDate,
                          endDate: currentActiveSem.endDate,
                          totalWeeks: "totalWeeks" in currentActiveSem ? currentActiveSem.totalWeeks : undefined,
                          internshipStartWeek: "internshipStartWeek" in currentActiveSem ? currentActiveSem.internshipStartWeek : undefined,
                          targetStudents: currentActiveSem.targetStudents,
                          description: currentActiveSem.description,
                        });
                        setShowCreateModal(true);
                      }}
                      disabled={!currentActiveSem.id}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Chỉnh sửa</span>
                    </button>

                    {currentActiveSem.id && (
                      <>
                        {(activeSem.status === "upcoming" || activeSem.status === "draft") && (
                          <button
                            onClick={() => handleStartSemester(currentActiveSem.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md border border-emerald-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Bắt đầu kỳ</span>
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleCloseSemester(
                              currentActiveSem.id,
                              currentActiveSem.name,
                            )
                          }
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-md border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Đóng đợt</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Key Grid Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-md border border-slate-200/70">
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Học kỳ & Niên khóa
                </p>
                <p className="font-bold text-slate-800 text-xs mt-1">
                  {currentActiveSem.term} ({currentActiveSem.academicYear})
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200/70">
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Thời gian diễn ra
                </p>
                <p className="font-bold text-slate-800 text-xs mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-600" />{" "}
                  {activeInternshipPeriod.dates}
                </p>
                <p className="mt-1 text-[10px] font-medium text-slate-500">{activeInternshipPeriod.weeks}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200/70">
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Quy mô tham gia
                </p>
                <p className="font-bold text-slate-800 text-xs mt-1">
                  {currentActiveSem.studentsCount} SV /{" "}
                  {currentActiveSem.lecturersCount} GV
                </p>
              </div>

              <div className="p-3 bg-blue-50/80 rounded-md border border-blue-100">
                <p className="text-[10px] font-bold uppercase text-blue-700">
                  Doanh nghiệp tiếp nhận
                </p>
                <p className="font-bold text-blue-950 text-xs mt-1">
                  {currentActiveSem.companiesCount} Doanh nghiệp
                </p>
              </div>
            </div>

            {/* Progress Bar & Phase Status */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" /> Tiến độ đợt
                  thực tập
                </span>
                <span className="font-bold text-blue-700">
                  {currentActiveSem.progressPercent}% hoàn thành
                </span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 border border-slate-200 overflow-hidden">
                <div
                  className="bg-[#1d4ed8] h-full rounded-full transition-all duration-500 relative"
                  style={{ width: `${currentActiveSem.progressPercent}%` }}
                />
              </div>

              <div className="p-2.5 bg-blue-50/60 rounded-md border border-blue-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-bold text-slate-800">
                    Giai đoạn hiện tại:{" "}
                    <span className="text-blue-700">
                      {currentActiveSem.currentPhase}
                    </span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  {activeSem.status === "completed" ? "Hoàn thành" : activeSem.status === "active" ? `Tiến độ ${activeSem.progressPercent}%` : "Chưa bắt đầu"}
                </span>
              </div>
            </div>
          </Panel>

          {/* INTERNSHIP LIST TABLE (Clean Data Grid) */}
          <Panel className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Danh sách các kỳ thực tập
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Tìm kiếm, lọc trạng thái và quản lý các kỳ thực tập
                </p>
              </div>

              {/* Table Filters & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên kỳ, khóa..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium outline-none focus:border-blue-500 w-44"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setTableFilterStatus("all")}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${tableFilterStatus === "all" ? "bg-white text-blue-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setTableFilterStatus("active")}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${tableFilterStatus === "active" ? "bg-white text-emerald-800 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Hoạt động
                  </button>
                  <button
                    onClick={() => setTableFilterStatus("upcoming")}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${tableFilterStatus === "upcoming" ? "bg-white text-blue-800 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Sắp tới
                  </button>
                  <button
                    onClick={() => setTableFilterStatus("completed")}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${tableFilterStatus === "completed" ? "bg-white text-slate-800 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Đã đóng
                  </button>
                </div>
              </div>
            </div>

            {/* Table Element */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Tên kỳ thực tập</th>
                    <th className="py-3 px-3">Học kỳ / Niên khóa</th>
                    <th className="py-3 px-3">Thời gian thực tập</th>
                    <th className="py-3 px-3 text-center">Giảng viên</th>
                    <th className="py-3 px-3 text-center">Sinh viên</th>
                    <th className="py-3 px-3 text-center">Doanh nghiệp</th>
                    <th className="py-3 px-3 text-center">Nộp đúng hạn</th>
                    <th className="py-3 px-3 text-center">Trạng thái</th>
                    <th className="py-3 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSemesters.map((sem) => (
                    <tr
                      key={sem.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div>
                          <p className="text-xs group-hover:text-blue-600 transition-colors">
                            {sem.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium line-clamp-1">
                            {sem.currentPhase}
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-700">
                        {sem.term} ({sem.academicYear})
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-600 whitespace-nowrap">
                        <p>{getInternshipPeriod(sem).dates}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{getInternshipPeriod(sem).weeks}</p>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-blue-900">
                        {sem.lecturersCount} GV
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-blue-900">
                        {sem.studentsCount} SV
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {sem.companiesCount} DN
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {sem.onTimeSubmissionRate == null ? "—" : `${sem.onTimeSubmissionRate}%`}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${sem.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : sem.status === "upcoming" ? "bg-blue-50 text-blue-700 border-blue-200" : sem.status === "draft" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}
                        >
                          {sem.status === "active"
                            ? "Ho\u1EA1t \u0111\u1ED9ng"
                            : sem.status === "upcoming"
                              ? "S\u1EAFp di\u1EC5n ra"
                              : sem.status === "draft"
                                ? "Nh\xE1p"
                                : "\u0110\xE3 \u0111\xF3ng"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              selectSemester(sem.id);
                              onShowToast(
                                `Đã chọn xem chi tiết: ${sem.name}`,
                              );
                            }}
                            className="p-1.5 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canMutateSemesters && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingSemester({
                                    id: sem.id,
                                    name: sem.name,
                                    term: sem.term,
                                    academicYear: sem.academicYear,
                                    startDate: sem.startDate,
                                    endDate: sem.endDate,
                                    totalWeeks: sem.totalWeeks,
                                    internshipStartWeek: sem.internshipStartWeek,
                                    targetStudents: sem.targetStudents,
                                    description: sem.description,
                                  });
                                  setShowCreateModal(true);
                                }}
                                className="p-1.5 hover:bg-amber-50 text-slate-600 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                                title="Chỉnh sửa kỳ này"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDuplicateSemester(sem)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                                title="Sao chép"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {(sem.status === "upcoming" || sem.status === "draft") && (
                                <button
                                  onClick={() => handleStartSemester(sem.id)}
                                  className="p-1.5 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                                  title="Bắt đầu kỳ"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {sem.status !== "completed" && (
                                <button
                                  onClick={() =>
                                    handleCloseSemester(sem.id, sem.name)
                                  }
                                  className="p-1.5 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="Đóng kỳ"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phân trang danh sách kỳ (ít dữ liệu → 5/10/20 dòng) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2.5 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">
                Hiển thị {filteredSemesters.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredSemesters.length)} / {filteredSemesters.length} kỳ
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-slate-500 font-medium">
                  Số dòng
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold outline-none cursor-pointer"
                    aria-label="Số kỳ mỗi trang"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </label>
                <div className="flex items-center gap-1.5 font-bold">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                    aria-label="Trang sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Panel>
        </div>

      </div>

      {/* MODALS */}
      <CreateSemesterModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingSemester(null);
        }}
        onShowToast={onShowToast}
        editing={editingSemester}
        onCreate={(data) => createSemester({
            name: data.name,
            term: data.term,
            academicYear: data.academicYear,
            startDate: data.startDate,
            endDate: data.endDate,
            targetStudents: data.targetStudents,
            studentsCount: data.targetStudents,
            totalWeeks: data.totalWeeks,
            internshipStartWeek: data.internshipStartWeek,
            status: "upcoming",
            description: `Đợt thực tập ${data.term} ${data.academicYear}`,
          })}
        onUpdate={(id, data) => updateSemester(
            id,
            {
              name: data.name,
              term: data.term,
              academicYear: data.academicYear,
              startDate: data.startDate,
              endDate: data.endDate,
              totalWeeks: data.totalWeeks,
              internshipStartWeek: data.internshipStartWeek,
              targetStudents: data.targetStudents,
              description: data.description,
            },
            onShowToast,
          )}
      />

      <AssignLecturerModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onShowToast={onShowToast}
      />

      {/* IMPORT MODALS */}
      <ImportStudentsModal
        isOpen={importType === "students"}
        onClose={() => setImportType(null)}
        onShowToast={onShowToast}
        onSuccess={() => {
          setImportType(null);
          void refreshApiCounts();
        }}
        currentSemesterId={currentActiveSem?.id}
      />

      <ImportLecturersModal
        isOpen={importType === "lecturers"}
        onClose={() => setImportType(null)}
        onShowToast={onShowToast}
        onSuccess={() => {
          setImportType(null);
          void refreshApiCounts();
        }}
        currentSemesterId={currentActiveSem?.id}
      />
    </div>
  );
};

export { SemestersView as AdminSemestersView };
