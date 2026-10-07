import { useState } from "react";
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
  AlertCircle,
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
  lecturersCount: null,
  studentsCount: null,
  placedStudents: null,
  companiesCount: null,
  status: "upcoming" as const,
  progressPercent: null,
  currentPhase: "Chưa có dữ liệu kỳ thực tập",
  description: "Tạo kỳ thực tập mới để bắt đầu quản lý.",
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

  const currentActiveSem =
    semestersList.find((s) => s.id === selectedSemesterId && s.status !== "completed") ||
    semestersList.find((s) => s.status === "active") ||
    semestersList.find((s) => s.status === "upcoming") ||
    semestersList[0] ||
    EMPTY_SEMESTER;

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
  const hasRealSemester = !!currentActiveSem.id;
  const activeInternshipPeriod = hasRealSemester
    ? getInternshipPeriod(currentActiveSem as Semester)
    : { dates: "Chưa cập nhật", weeks: "" };
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
    <div className="mx-auto max-w-[1300px] space-y-4 pb-12">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#026aa7] px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-wide">Quản lý kỳ thực tập</h1>
              <p className="mt-0.5 text-xs text-white/80">
                Quản lý thời gian, trạng thái và quy mô các kỳ thực tập
              </p>
            </div>
          </div>
          {canMutateSemesters && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setImportType("lecturers")}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Nhập giảng viên
              </button>
              <button
                type="button"
                onClick={() => setImportType("students")}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                Nhập sinh viên
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingSemester(null);
                  setShowCreateModal(true);
                }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-bold text-[#026aa7] transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tạo kỳ thực tập mới
              </button>
            </div>
          )}
        </div>
      </section>

      {isSuperAdmin && <SchoolAcademicTermsPanel onShowToast={onShowToast} />}

      {canMutateSemesters && hasRealSemester && (
        <EvidenceDeadlinePanel semesterId={activeSem.id} semesterName={activeSem.name} />
      )}

      {/* Current semester summary and semester list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-12 space-y-5">
          {/* ACTIVE INTERNSHIP FEATURED SUMMARY */}
          <Panel className="relative space-y-5 overflow-hidden rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#026aa7]/5 rounded-bl-full pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#026aa7] text-white rounded-lg shadow-md shadow-[#026aa7]/20 shrink-0">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {currentActiveSem.name}
                    </h2>
                    <span className={`flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold ${!hasRealSemester || activeSem.status === "completed" ? "border-slate-200 bg-slate-100 text-slate-600" : activeSem.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[#026aa7]/20 bg-[#026aa7]/5 text-[#026aa7]"}`}>
                      {hasRealSemester && (
                        <span className={`h-2 w-2 rounded-full ${activeSem.status === "active" ? "bg-emerald-500" : activeSem.status === "completed" ? "bg-slate-400" : "bg-[#026aa7]"}`} />
                      )}
                      {!hasRealSemester ? "Chưa cập nhật" : activeSem.status === "active" ? "Đang diễn ra" : activeSem.status === "completed" ? "Đã hoàn thành" : "Sắp tới"}
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
                          targetStudents: "targetStudents" in currentActiveSem ? currentActiveSem.targetStudents : undefined,
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

            {!hasRealSemester ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <AlertCircle className="h-8 w-8 text-slate-300" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-700">Chưa có kỳ thực tập</p>
                <p className="max-w-md text-xs text-slate-500">
                  Tạo kỳ thực tập mới để cấu hình thời gian và bắt đầu quản lý.
                </p>
              </div>
            ) : (
              <>
            {/* Key Grid Details */}
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
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
                  <Clock className="w-3 h-3 text-[#026aa7]" />{" "}
                  {activeInternshipPeriod.dates}
                </p>
                <p className="mt-1 text-[10px] font-medium text-slate-500">{activeInternshipPeriod.weeks}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200/70">
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Quy mô tham gia
                </p>
                <p className="font-bold text-slate-800 text-xs mt-1">
                  {currentActiveSem.studentsCount ?? "—"} SV /{" "}
                  {currentActiveSem.lecturersCount ?? "—"} GV
                </p>
              </div>

              <div className="p-3 bg-[#026aa7]/4 rounded-md border border-[#026aa7]/14">
                <p className="text-[10px] font-bold uppercase text-[#026aa7]">
                  Doanh nghiệp tiếp nhận
                </p>
                <p className="font-bold text-[#005082] text-xs mt-1">
                  {currentActiveSem.companiesCount ?? "—"} Doanh nghiệp
                </p>
              </div>
            </div>

            {/* Progress Bar & Phase Status */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#026aa7]" /> Tiến độ đợt
                  thực tập
                </span>
                <span className="font-bold text-[#026aa7]">
                  {currentActiveSem.progressPercent ?? "—"}% hoàn thành
                </span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 border border-slate-200 overflow-hidden">
                <div
                  className="bg-[#026aa7] h-full rounded-full transition-all duration-500 relative"
                  style={{ width: `${Math.min(100, Math.max(0, currentActiveSem.progressPercent ?? 0))}%` }}
                />
              </div>

              <div className="p-2.5 bg-[#026aa7]/3 rounded-md border border-[#026aa7]/14 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#026aa7] shrink-0" />
                  <span className="font-bold text-slate-800">
                    Giai đoạn hiện tại:{" "}
                    <span className="text-[#026aa7]">
                      {currentActiveSem.currentPhase || "Chưa cập nhật"}
                    </span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  {activeSem.status === "completed" ? "Hoàn thành" : activeSem.status === "active" ? `Tiến độ ${activeSem.progressPercent ?? "—"}%` : "Chưa bắt đầu"}
                </span>
              </div>
            </div>
              </>
            )}
          </Panel>

          {/* INTERNSHIP LIST TABLE (Clean Data Grid) */}
          <Panel className="space-y-4 rounded-xl border border-slate-200/90 shadow-2xs">
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
                    aria-label="Tìm kỳ thực tập"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên kỳ, khóa..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium outline-none focus:border-[#026aa7] w-44"
                  />
                </div>

                <div role="group" aria-label="Lọc kỳ theo trạng thái" className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200 text-xs font-bold">
                  <button
                      type="button"
                      aria-pressed={tableFilterStatus === "all"}
                      onClick={() => setTableFilterStatus("all")}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${tableFilterStatus === "all" ? "bg-white text-[#005082] shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    aria-pressed={tableFilterStatus === "active"}
                    onClick={() => setTableFilterStatus("active")}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${tableFilterStatus === "active" ? "bg-white text-emerald-800 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Hoạt động
                  </button>
                  <button
                    type="button"
                    aria-pressed={tableFilterStatus === "upcoming"}
                    onClick={() => setTableFilterStatus("upcoming")}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${tableFilterStatus === "upcoming" ? "bg-white text-[#025a8e] shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Sắp tới
                  </button>
                  <button
                    type="button"
                    aria-pressed={tableFilterStatus === "completed"}
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
                  {paginatedSemesters.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                          <CalendarDays className="h-8 w-8 text-slate-300" aria-hidden="true" />
                          <p className="text-sm font-semibold text-slate-700">
                            {semestersList.length === 0
                              ? "Chưa có kỳ thực tập"
                              : "Không tìm thấy kỳ thực tập phù hợp"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {semestersList.length === 0
                              ? "Tạo kỳ thực tập mới hoặc tải dữ liệu từ danh sách được cấp."
                              : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedSemesters.map((sem) => (
                    <tr
                      key={sem.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div>
                          <p className="text-xs group-hover:text-[#026aa7] transition-colors">
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

                      <td className="py-3 px-3 text-center font-bold text-[#005082]">
                        {sem.lecturersCount} GV
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-[#005082]">
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
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${sem.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : sem.status === "upcoming" ? "bg-[#026aa7]/5 text-[#026aa7] border-[#026aa7]/20" : sem.status === "draft" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}
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
                            type="button"
                            aria-label={`Xem chi tiết ${sem.name}`}
                            onClick={() => {
                              selectSemester(sem.id);
                              onShowToast(
                                `Đã chọn xem chi tiết: ${sem.name}`,
                              );
                            }}
                            className="p-1.5 hover:bg-[#025a8e]/5 text-slate-600 hover:text-[#026aa7] rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canMutateSemesters && (
                            <>
                              <button
                                type="button"
                                aria-label={`Chỉnh sửa ${sem.name}`}
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
                                type="button"
                                aria-label={`Sao chép ${sem.name}`}
                                onClick={() => handleDuplicateSemester(sem)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                                title="Sao chép"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {(sem.status === "upcoming" || sem.status === "draft") && (
                                <button
                                  type="button"
                                  aria-label={`Bắt đầu ${sem.name}`}
                                  onClick={() => handleStartSemester(sem.id)}
                                  className="p-1.5 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                                  title="Bắt đầu kỳ"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {sem.status !== "completed" && (
                                <button
                                  type="button"
                                  aria-label={`Đóng ${sem.name}`}
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
