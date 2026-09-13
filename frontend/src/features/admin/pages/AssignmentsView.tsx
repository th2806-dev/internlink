import { useState, useMemo, useCallback, useEffect } from "react";
import type { ToastType } from "../../../contexts/ToastContext";
import {
  UserPlus,
  Search,
  UserCheck,
  Users,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  GraduationCap,
  X,
  History,
  Check,
  BarChart3,
  TrendingUp,
  Clock,
  FileUp,
  UserX,
  ChevronDown,
  ChevronUp,
  UserMinus,
  ArrowLeftRight,
  Mail,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Toolbar } from "../../../components/common/Toolbar";
import { Panel } from "../../../components/common/Panel";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { formatRelativeTimeVi } from "../../../lib/formatRelativeTimeVi";
import { adminAssignmentsService } from "../../../services/adminAssignments.service";
import { useAdminAssignmentMatrix } from "../../../hooks/useAdminAssignmentMatrix";
import { useSemester } from "../../../contexts/SemesterContext";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { CompanyAllocationsTab } from "../components/CompanyAllocationsTab";
import { ImportLecturerAssignmentsModal } from "../components/modals/ImportLecturerAssignmentsModal";

export const AssignmentsView = ({
  onShowToast,
  onNavigateTab,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
  onNavigateTab?: (tab: string) => void;
}) => {
  const { semesters, selectedSemesterId, selectedSemester: currentSemesterObj, selectSemester } = useSemester();
  const { canMutateOps, isSuperAdmin } = useAdminCapabilities();
  const selectedSemester = selectedSemesterId;
  const setSelectedSemester = selectSemester;
  const effectiveSemesterId = selectedSemester === "all" ? undefined : selectedSemester;
  const apiMatrix = useAdminAssignmentMatrix(true, selectedSemesterId, onShowToast);
  const [activeTab, setActiveTab] = useState("by-lecturer");

  const lecturers = apiMatrix.lecturers;
  const students = apiMatrix.students;
  const selectedLecturerId = (apiMatrix.selectedLecturerId ?? "");
  const setSelectedLecturerId = (
    value: string | ((prev: string) => string),
  ) => {

    const next =
      typeof value === "function"
        ? value(apiMatrix.selectedLecturerId ?? "")
        : value;
    apiMatrix.setSelectedLecturerId(next);
  };

  const [lecturerSearch, setLecturerSearch] = useState("");
  const [lecturerDeptFilter, setLecturerDeptFilter] = useState("all");
  const [assignedStudentSearch, setAssignedStudentSearch] = useState("");
  const [assignedClassFilter, setAssignedClassFilter] = useState("all");
  const groupViewMode: string = "single";
  const [selectedAssignedStudentIds, setSelectedAssignedStudentIds] = useState(
    [],
  );
  const [showImportLecturerModal, setShowImportLecturerModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [majorFilter, setMajorFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [selectedUnassignedIds, setSelectedUnassignedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [targetReassignLecturerId, setTargetReassignLecturerId] =
    useState("lec-2");
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [expandedLecturerIds, setExpandedLecturerIds] = useState<string[]>([]);
  const unassignedStudents = useMemo(() => {
    return students.filter((s) => s.assignmentStatus === "unassigned");
  }, [students]);
  const assignedStudents = useMemo(() => {
    return students.filter((s) => s.assignmentStatus === "assigned");
  }, [students]);
  const lecturerDepartments = useMemo(
    () =>
      Array.from(
        new Set(
          lecturers
            .map((lecturer) => lecturer.department?.trim())
            .filter((department): department is string => Boolean(department)),
        ),
      ).sort((a, b) => a.localeCompare(b, "vi")),
    [lecturers],
  );
  const activeLecturerObj = useMemo(() => {
    return lecturers.find((l) => l.id === selectedLecturerId) || lecturers[0];
  }, [lecturers, selectedLecturerId]);
  const activeLecturerStudents = useMemo(() => {
    if (!activeLecturerObj) return [];
    return students.filter(
      (s) =>
        s.assignmentStatus === "assigned" &&
        s.assignedLecturerId === activeLecturerObj.id,
    );
  }, [students, activeLecturerObj]);
  const filteredActiveLecturerStudents = useMemo(() => {
    return activeLecturerStudents.filter((s) => {
      const matchSearch =
        s.fullName
          .toLowerCase()
          .includes(assignedStudentSearch.toLowerCase()) ||
        s.studentId.toLowerCase().includes(assignedStudentSearch.toLowerCase());
      const matchClass =
        assignedClassFilter === "all" || s.classCode === assignedClassFilter;
      return matchSearch && matchClass;
    });
  }, [activeLecturerStudents, assignedStudentSearch, assignedClassFilter]);
  const assignedClassOptions = useMemo(
    () =>
      Array.from(
        new Set(
          activeLecturerStudents
            .map((student) => student.classCode?.trim())
            .filter((classCode): classCode is string => Boolean(classCode)),
        ),
      ).sort((a, b) => a.localeCompare(b, "vi")),
    [activeLecturerStudents],
  );
  const filteredLecturers = useMemo(() => {
    return lecturers.filter((l) => {
      const matchSearch =
        l.fullName.toLowerCase().includes(lecturerSearch.toLowerCase()) ||
        l.employeeId.toLowerCase().includes(lecturerSearch.toLowerCase());
      const matchDept =
        lecturerDeptFilter === "all" || l.department === lecturerDeptFilter;
      return matchSearch && matchDept;
    });
  }, [lecturers, lecturerSearch, lecturerDeptFilter]);
  const filteredUnassignedStudents = useMemo(() => {
    return unassignedStudents.filter((s) => {
      const matchSearch =
        s.studentId.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.fullName.toLowerCase().includes(studentSearch.toLowerCase());
      const matchClass = classFilter === "all" || s.classCode === classFilter;
      const matchMajor = majorFilter === "all" || s.major === majorFilter;
      const matchCompany =
        companyFilter === "all" ||
        (s.companyName &&
          s.companyName.toLowerCase().includes(companyFilter.toLowerCase()));
      return matchSearch && matchClass && matchMajor && matchCompany;
    });
  }, [
    unassignedStudents,
    studentSearch,
    classFilter,
    majorFilter,
    companyFilter,
  ]);
  const unassignedFilterOptions = useMemo(
    () => ({
      classes: Array.from(
        new Set(
          unassignedStudents
            .map((student) => student.classCode?.trim())
            .filter((classCode): classCode is string => Boolean(classCode)),
        ),
      ).sort((a, b) => a.localeCompare(b, "vi")),
      majors: Array.from(
        new Set(
          unassignedStudents
            .map((student) => student.major?.trim())
            .filter((major): major is string => Boolean(major)),
        ),
      ).sort((a, b) => a.localeCompare(b, "vi")),
      companies: Array.from(
        new Set(
          unassignedStudents
            .map((student) => student.companyName?.trim())
            .filter((company): company is string => Boolean(company)),
        ),
      ).sort((a, b) => a.localeCompare(b, "vi")),
    }),
    [unassignedStudents],
  );
  useEffect(() => {
    setLecturerDeptFilter("all");
    setAssignedClassFilter("all");
    setClassFilter("all");
    setMajorFilter("all");
    setCompanyFilter("all");
    setCurrentPage(1);
  }, [selectedSemesterId]);
  const totalPages =
    Math.ceil(filteredUnassignedStudents.length / pageSize) || 1;
  const paginatedUnassignedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUnassignedStudents.slice(start, start + pageSize);
  }, [filteredUnassignedStudents, currentPage, pageSize]);
  const totalStudentsSemester = students.length;
  const totalAssignedCount = assignedStudents.length;
  const totalUnassignedCount = unassignedStudents.length;
  const assignmentRate =
    totalStudentsSemester > 0
      ? Math.round((totalAssignedCount / totalStudentsSemester) * 100)
      : 0;
  const totalLecturersCount = lecturers.length;
  const lecturersByAssignedCount = useMemo(() => {
    return [...lecturers]
      .map((lec) => ({
        ...lec,
        assignedCount: students.filter(
          (s) =>
            s.assignmentStatus === "assigned" &&
            s.assignedLecturerId === lec.id,
        ).length,
      }))
      .sort((a, b) => b.assignedCount - a.assignedCount);
  }, [lecturers, students]);
  const handleUnassignStudent = async (studentId, studentName) => {
    if (!activeLecturerObj) return;

    try {
      await adminAssignmentsService.unassign({
        lecturerId: activeLecturerObj.id,
        studentId,
        semesterId: effectiveSemesterId,
      });
      onShowToast(
        `Đã hủy phân công hướng dẫn của sinh viên ${studentName}`,
      );
      setSelectedAssignedStudentIds((prev) =>
        prev.filter((id) => id !== studentId),
      );
      await apiMatrix.reload();
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };
  const handleBulkUnassign = async () => {
    if (selectedAssignedStudentIds.length === 0) {
      onShowToast(
        "Vui lòng chọn ít nhất 1 sinh viên để hủy phân công!",
      );
      return;
    }
    const count = selectedAssignedStudentIds.length;

    try {
      for (const studentId of selectedAssignedStudentIds) {
        await adminAssignmentsService.unassign({
          lecturerId: activeLecturerObj.id,
          studentId,
          semesterId: effectiveSemesterId,
        });
      }
      onShowToast(
        `Đã hủy phân công ${count} sinh viên khỏi ${activeLecturerObj.fullName}!`,
      );
      setSelectedAssignedStudentIds([]);
      await apiMatrix.reload();
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };
  const handleExecuteReassign = async () => {
    if (selectedAssignedStudentIds.length === 0) {
      onShowToast(
        "Vui lòng chọn ít nhất 1 sinh viên để chuyển giảng viên!",
      );
      return;
    }
    const targetLecturer = lecturers.find(
      (l) => l.id === targetReassignLecturerId,
    );
    if (!targetLecturer) return;
    const count = selectedAssignedStudentIds.length;
    try {
      const result = await adminAssignmentsService.bulkAssign({
        lecturerId: targetLecturer.id,
        studentIds: selectedAssignedStudentIds,
        semesterId: effectiveSemesterId,
      });
      onShowToast(
        `Đã chuyển ${result.assignedCount} sinh viên sang giảng viên ${targetLecturer.fullName}!`,
      );
      setSelectedAssignedStudentIds([]);
      setShowReassignModal(false);
      await apiMatrix.reload();
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
      return;
    }
  };
  const handleConfirmMatrixAssignment = async () => {
    if (selectedUnassignedIds.length === 0) {
      onShowToast("Vui lòng chọn ít nhất 1 sinh viên!");
      return;
    }
    const targetLecturer = activeLecturerObj;
    if (!targetLecturer) return;

    try {
      const result = await adminAssignmentsService.bulkAssign({
        lecturerId: targetLecturer.id,
        studentIds: selectedUnassignedIds,
        semesterId: effectiveSemesterId,
      });
      if (result.failedCount > 0) {
        onShowToast(
          `Phân công một phần: ${result.assignedCount} thành công, ${result.failedCount} lỗi`,
        );
      } else {
        onShowToast(
          `Đã phân công ${result.assignedCount} sinh viên cho ${targetLecturer.fullName}`,
        );
      }
      setSelectedUnassignedIds([]);
      await apiMatrix.reload();
      return;
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
      return;
    }
  };
  const toggleAccordionLecturer = (id) => {
    setExpandedLecturerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const loadAssignmentHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const items = await adminAssignmentsService.getHistory(50, effectiveSemesterId);
      setRecentAssignments(
        items.map((item) => ({
          id: item.id,
          lecturerName: item.lecturerName,
          studentCount: item.studentCount,
          timestamp: formatRelativeTimeVi(item.timestamp),
          classGroups: item.classGroups,
          assignedBy: item.assignedBy,
        })),
      );
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsHistoryLoading(false);
    }
  }, [effectiveSemesterId, onShowToast]);

  const handleOpenHistory = () => {
    setShowHistoryModal(true);
    void loadAssignmentHistory();
  };

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      <PageHeader
        icon={UserPlus}
        title="Phân công Hướng dẫn Thực tập"
        subtitle={
          apiMatrix.isLoading
            ? "Đang tải danh sách GV/SV từ API…"
            : `${apiMatrix.lecturers.length} GV · ${apiMatrix.students.length} SV`
        }
        actions={[
          ...(canMutateOps
            ? [
                {
                  label: "Import PC Giảng viên",
                  icon: FileUp,
                  onClick: () => setShowImportLecturerModal(true),
                  variant: "secondary" as const,
                },
              ]
            : []),
          {
            label: "Lịch sử phân công",
            icon: History,
            onClick: handleOpenHistory,
            variant: "secondary",
          },
        ]}
      />

      {isSuperAdmin && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Chế độ chỉ xem nghiệp vụ khoa — Super Admin không thể phân công / hủy phân công / import.
          </span>
        </div>
      )}

      <Toolbar
        left={
          <p className="text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800">
              {totalStudentsSemester.toLocaleString("vi-VN")}
            </span>{" "}
            SV ·{" "}
            <span className="font-bold text-emerald-700">
              {totalAssignedCount}
            </span>{" "}
            đã PC ·{" "}
            <span className="font-bold text-amber-700">
              {totalUnassignedCount}
            </span>{" "}
            chưa PC ·{" "}
            <span className="font-bold text-sky-700">{assignmentRate}%</span>{" "}
            hoàn thành
          </p>
        }
      />

      {apiMatrix.isLoading && lecturers.length === 0 ? (
        <Panel className="py-16 text-center">
          <p className="text-sm font-bold text-slate-600">
            Đang tải dữ liệu phân công từ hệ thống…
          </p>
        </Panel>
      ) : !apiMatrix.isLoading && lecturers.length === 0 ? (
        <Panel className="py-16 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">
            Chưa có giảng viên trong hệ thống
          </p>
          <p className="text-xs text-slate-500">
            Thêm giảng viên ở mục Quản lý Giảng viên trước khi phân công.
          </p>
        </Panel>
      ) : (
        <>
          {currentSemesterObj.status === "completed" && (
            <div className="px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-800 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-slate-600 shrink-0" />
              <span>
                Đợt thực tập <strong>{currentSemesterObj.name}</strong> đã đóng dữ liệu. Ma trận phân công đang ở chế độ <strong>Lưu trữ (Chỉ xem)</strong>.
              </span>
            </div>
          )}

          {/* SEMESTER SELECTOR & MAIN TAB SWITCHER BAR */}
          <Panel className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 max-w-full overflow-hidden" padding="sm">
            {/* Semester Selector */}
            <div className="flex items-center gap-3 min-w-0 max-w-full">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100 shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div className="min-w-0 max-w-full">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Kỳ thực tập đang chọn
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => {
                    setSelectedSemester(e.target.value);
                    if (e.target.value === "all") {
                      onShowToast("Đã chọn: Tất cả học kỳ");
                    } else {
                      const sem = semesters.find((s) => s.id === e.target.value);
                      if (sem) onShowToast(`Đã chọn đợt: "${sem.name}"`);
                    }
                  }}
                  className="mt-0.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 text-xs outline-none focus:bg-white focus:border-blue-500 cursor-pointer max-w-full truncate"
                >
                  <option value="all">Tất cả học kỳ</option>
                  {semesters.map((sem) => (
                    <option key={sem.id} value={sem.id}>
                      {sem.name} — [{sem.status === "active" ? "Đang chạy" : sem.status === "upcoming" ? "Sắp tới" : "Đã đóng"}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Primary workflow navigation */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-md border border-slate-200 text-xs font-bold max-w-full overflow-x-auto shrink-0">
              <button
                onClick={() => setActiveTab("by-lecturer")}
                className={`px-3.5 py-2 rounded-lg transition-all flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${activeTab === "by-lecturer" ? "bg-white text-blue-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>Phân công GVHD</span>
              </button>

              <button
                onClick={() => setActiveTab("company-allocation")}
                className={`px-3.5 py-2 rounded-lg transition-all flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${activeTab === "company-allocation" ? "bg-white text-blue-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span>Phân bổ doanh nghiệp</span>
              </button>

              <button
                onClick={() => setActiveTab("stats")}
                className={`px-3.5 py-2 rounded-lg transition-all flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${activeTab === "stats" ? "bg-white text-blue-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Thống kê &amp; cân bằng tải</span>
              </button>
            </div>
          </Panel>

          {/* TAB 1: DANH SÁCH SINH VIÊN THEO GIẢNG VIÊN (MAIN FEATURE REQUIRED BY USER) */}
          {activeTab === "by-lecturer" && (
            <div className="space-y-6">
              {/* MODE 1: SINGLE LECTURER SPLIT WORKSPACE */}
              {groupViewMode === "single" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* LEFT SIDEBAR: LECTURER DIRECTORY (4 COLUMNS) */}
                  <Panel className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                          Danh sách Giảng viên ({filteredLecturers.length})
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          Chọn giảng viên để xem sinh viên hướng dẫn
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-md">
                        {currentSemesterObj.name}
                      </span>
                    </div>

                    {/* Filters */}
                    <div className="space-y-2 text-xs">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={lecturerSearch}
                          onChange={(e) => setLecturerSearch(e.target.value)}
                          placeholder="Tìm tên hoặc Mã GV..."
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
                        />
                      </div>

                      <select
                        value={lecturerDeptFilter}
                        onChange={(e) => setLecturerDeptFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer text-xs"
                      >
                        <option value="all">Tất cả Bộ môn</option>
                        {lecturerDepartments.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lecturer List Item Cards */}
                    <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                      {filteredLecturers.map((lec) => {
                        const isSelected = selectedLecturerId === lec.id;
                        const count = students.filter(
                          (s) =>
                            s.assignmentStatus === "assigned" &&
                            s.assignedLecturerId === lec.id,
                        ).length;
                        return (
                          <div
                            key={lec.id}
                            onClick={() => {
                              setSelectedLecturerId(lec.id);
                              setSelectedAssignedStudentIds([]);
                            }}
                            className={`p-3.5 rounded-lg border cursor-pointer transition-all ${isSelected ? "bg-blue-50/90 border-blue-600 shadow-sm ring-2 ring-blue-500/20" : "bg-white hover:bg-slate-50 border-slate-200/80"}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <InitialsAvatar
                                  name={lec.fullName}
                                  seed={lec.employeeId || lec.fullName}
                                  size={36}
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 text-xs truncate">
                                    {lec.fullName}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-medium truncate">
                                    {lec.department}
                                  </p>
                                </div>
                              </div>

                              <span className="text-sm font-bold text-slate-800 tabular-nums shrink-0">
                                {count}
                                <span className="text-[10px] font-medium text-slate-500 ml-0.5">
                                  SV
                                </span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>

                  {/* RIGHT MAIN AREA: ASSIGNED STUDENTS TABLE UNDER ACTIVE LECTURER (8 COLUMNS) */}
                  <div className="lg:col-span-8 space-y-5">
                    {/* LECTURER BANNER CARD */}
                    <Panel className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <InitialsAvatar
                            name={activeLecturerObj.fullName}
                            seed={activeLecturerObj.employeeId || activeLecturerObj.fullName}
                            size={56}
                            className="text-xl"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-lg font-bold text-slate-900">
                                {activeLecturerObj.fullName}
                              </h2>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold rounded-md">
                                {activeLecturerObj.employeeId}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              {activeLecturerObj.title} • Bộ môn{" "}
                              {activeLecturerObj.department}
                            </p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-blue-600" />{" "}
                                {activeLecturerObj.email}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-right shrink-0">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                            SV phân công
                          </span>
                          <p className="text-2xl font-bold text-slate-900 tabular-nums">
                            {activeLecturerStudents.length}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="relative w-48">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                            <input
                              type="text"
                              value={assignedStudentSearch}
                              onChange={(e) =>
                                setAssignedStudentSearch(e.target.value)
                              }
                              placeholder="Lọc sinh viên của GV..."
                              className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500"
                            />
                          </div>

                          <select
                            value={assignedClassFilter}
                            onChange={(e) => setAssignedClassFilter(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none cursor-pointer"
                          >
                            <option value="all">Tất cả Lớp</option>
                            {assignedClassOptions.map((classCode) => (
                              <option key={classCode} value={classCode}>
                                {classCode}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          {canMutateOps && selectedAssignedStudentIds.length > 0 && (
                            <>
                              <button
                                onClick={() => setShowReassignModal(true)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                <span>
                                  Chuyển GV ({selectedAssignedStudentIds.length})
                                </span>
                              </button>

                              <button
                                onClick={handleBulkUnassign}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                <span>
                                  Hủy phân công ({selectedAssignedStudentIds.length}
                                  )
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </Panel>

                    {/* TABLE OF ASSIGNED STUDENTS UNDER SELECTED LECTURER */}
                    <Panel className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">
                            Danh sách sinh viên trực tiếp hướng dẫn (
                            {filteredActiveLecturerStudents.length})
                          </h3>
                        </div>

                        <span className="text-xs font-bold text-slate-500">
                          {currentSemesterObj.name}
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-slate-200/80 rounded-md">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                              <th className="py-2.5 px-3 text-center w-10">
                                <input
                                  type="checkbox"
                                  checked={
                                    filteredActiveLecturerStudents.length > 0 &&
                                    filteredActiveLecturerStudents.every((s) =>
                                      selectedAssignedStudentIds.includes(s.id),
                                    )
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAssignedStudentIds(
                                        filteredActiveLecturerStudents.map(
                                          (s) => s.id,
                                        ),
                                      );
                                    } else {
                                      setSelectedAssignedStudentIds([]);
                                    }
                                  }}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </th>
                              <th className="py-2.5 px-3">MSSV</th>
                              <th className="py-2.5 px-3">Họ và tên</th>
                              <th className="py-2.5 px-3">Lớp / Chuyên ngành</th>
                              <th className="py-2.5 px-3">Doanh nghiệp thực tập</th>
                              <th className="py-2.5 px-3">Ngày phân công</th>
                              <th className="py-2.5 px-3 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredActiveLecturerStudents.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="py-12 text-center text-slate-400 font-medium"
                                >
                                  <UserX className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                  <p className="font-bold text-slate-700">
                                    Chưa có sinh viên nào được phân công cho giảng
                                    viên này!
                                  </p>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    Chọn sinh viên ở hàng chờ bên dưới để phân công
                                    vào giảng viên này.
                                  </p>
                                </td>
                              </tr>
                            ) : (
                              filteredActiveLecturerStudents.map((st) => {
                                const isSelected =
                                  selectedAssignedStudentIds.includes(st.id);
                                return (
                                  <tr
                                    key={st.id}
                                    className={`transition-colors hover:bg-slate-50/80 ${isSelected ? "bg-blue-50/70" : ""}`}
                                  >
                                    <td className="py-3 px-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {
                                          setSelectedAssignedStudentIds((prev) =>
                                            prev.includes(st.id)
                                              ? prev.filter((id) => id !== st.id)
                                              : [...prev, st.id],
                                          );
                                        }}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                      />
                                    </td>

                                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                      {st.studentId}
                                    </td>

                                    <td className="py-3 px-3">
                                      <p className="font-bold text-slate-900 text-xs">
                                        {st.fullName}
                                      </p>
                                      {st.gpa && (
                                        <p className="text-[10px] text-slate-400 font-medium">
                                          GPA: {st.gpa}
                                        </p>
                                      )}
                                    </td>

                                    <td className="py-3 px-3">
                                      <span className="font-bold text-slate-800 block">
                                        {st.classCode}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        {st.major}
                                      </span>
                                    </td>

                                    <td className="py-3 px-3 font-medium text-slate-800">
                                      {st.companyName ? (
                                        <span className="flex items-center gap-1 font-bold text-slate-800">
                                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          {st.companyName}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic">
                                          Chưa đăng ký
                                        </span>
                                      )}
                                    </td>

                                    <td className="py-3 px-3 text-slate-500 text-[11px] font-mono">
                                      {st.assignedDate || "10/01/2025"}
                                    </td>

                                    <td className="py-3 px-3 text-right space-x-1">
                                      {canMutateOps ? (
                                        <button
                                          onClick={() =>
                                            handleUnassignStudent(st.id, st.fullName)
                                          }
                                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-lg border border-rose-200 transition-colors"
                                          title="Hủy phân công sinh viên khỏi giảng viên này"
                                        >
                                          Hủy phân công
                                        </button>
                                      ) : (
                                        <span className="text-[11px] text-slate-400 font-medium">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary Bar */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-medium">
                        <span>
                          Đang hiển thị{" "}
                          <strong>{filteredActiveLecturerStudents.length}</strong> /{" "}
                          <strong>{activeLecturerStudents.length}</strong> sinh viên
                          hướng dẫn
                        </span>
                      </div>
                    </Panel>
                  </div>
                </div>
              )}

              {/* MODE 2: ACCORDION GRID FOR ALL LECTURERS AND THEIR ASSIGNED STUDENTS */}
              {groupViewMode === "accordion" && (
                <div className="space-y-4">
                  {filteredLecturers.map((lec) => {
                    const lecStudents = students.filter(
                      (s) =>
                        s.assignmentStatus === "assigned" &&
                        s.assignedLecturerId === lec.id,
                    );
                    const isExpanded = expandedLecturerIds.includes(lec.id);
                    return (
                      <div
                        key={lec.id}
                        className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden"
                      >
                        {/* ACCORDION HEADER */}
                        <div
                          onClick={() => toggleAccordionLecturer(lec.id)}
                          className="p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60"
                        >
                          <div className="flex items-center gap-3">
                            <InitialsAvatar
                              name={lec.fullName}
                              seed={lec.employeeId || lec.fullName}
                              size={40}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 text-sm">
                                  {lec.fullName}
                                </h3>
                                <span className="text-xs font-mono font-bold text-slate-400">
                                  ({lec.employeeId})
                                </span>
                                <span className="text-xs text-slate-500">
                                  • {lec.department}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium">
                                {lec.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-bold text-slate-800 tabular-nums">
                              {lecStudents.length} SV
                            </span>

                            <div className="p-1 text-slate-400">
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ACCORDION BODY: STUDENT LIST */}
                        {isExpanded && (
                          <div className="p-4 space-y-3 animate-in fade-in">
                            {lecStudents.length === 0 ? (
                              <div className="p-6 text-center text-slate-400 text-xs font-medium">
                                Chưa có sinh viên nào được gán cho giảng viên này.
                              </div>
                            ) : (
                              <div className="overflow-x-auto border border-slate-200 rounded-md">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                      <th className="py-2 px-3">MSSV</th>
                                      <th className="py-2 px-3">Họ tên</th>
                                      <th className="py-2 px-3">Lớp</th>
                                      <th className="py-2 px-3">Chuyên ngành</th>
                                      <th className="py-2 px-3">Doanh nghiệp</th>
                                      <th className="py-2 px-3">Ngày PC</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {lecStudents.map((st) => (
                                      <tr key={st.id} className="hover:bg-slate-50">
                                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                          {st.studentId}
                                        </td>
                                        <td className="py-2.5 px-3 font-bold text-slate-900">
                                          {st.fullName}
                                        </td>
                                        <td className="py-2.5 px-3 font-bold text-slate-800">
                                          {st.classCode}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600">
                                          {st.major}
                                        </td>
                                        <td className="py-2.5 px-3 font-medium text-slate-800">
                                          {st.companyName ||
                                            "Ch\u01B0a \u0111\u0103ng k\xFD"}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                                          {st.assignedDate || "10/01/2025"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* UNASSIGNED STUDENT QUEUE IN THE UNIFIED ASSIGNMENT WORKSPACE */}
          {activeTab === "by-lecturer" && (
            <div className="space-y-6">
                <Panel className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center">
                          1
                        </span>
                        <h2 className="text-base font-bold text-slate-900 tracking-tight">
                          Hàng chờ sinh viên chưa phân công (
                          {unassignedStudents.length})
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Tích chọn sinh viên bên dưới để ghép nối với giảng viên
                        hướng dẫn.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {canMutateOps && (
                        <>
                          <button
                            onClick={() =>
                              setSelectedUnassignedIds(
                                filteredUnassignedStudents.map((s) => s.id),
                              )
                            }
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
                          >
                            Chọn tất cả ({filteredUnassignedStudents.length})
                          </button>

                          {selectedUnassignedIds.length > 0 && (
                            <button
                              onClick={() => setSelectedUnassignedIds([])}
                              className="text-xs font-bold text-rose-600 hover:underline px-2"
                            >
                              Bỏ chọn ({selectedUnassignedIds.length})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleConfirmMatrixAssignment}
                            disabled={selectedUnassignedIds.length === 0}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-md transition-colors flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Phân công {selectedUnassignedIds.length > 0 ? `(${selectedUnassignedIds.length})` : ""}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Filters Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="MSSV hoặc Họ tên..."
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>

                    <select
                      value={classFilter}
                      onChange={(e) => {
                        setClassFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                    >
                      <option value="all">Tất cả Lớp học</option>
                      {unassignedFilterOptions.classes.map((classCode) => (
                        <option key={classCode} value={classCode}>
                          {classCode}
                        </option>
                      ))}
                    </select>

                    <select
                      value={majorFilter}
                      onChange={(e) => {
                        setMajorFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                    >
                      <option value="all">Tất cả Chuyên ngành</option>
                      {unassignedFilterOptions.majors.map((major) => (
                        <option key={major} value={major}>
                          {major}
                        </option>
                      ))}
                    </select>

                    <select
                      value={companyFilter}
                      onChange={(e) => {
                        setCompanyFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                    >
                      <option value="all">Tất cả Doanh nghiệp</option>
                      {unassignedFilterOptions.companies.map((company) => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto border border-slate-200/80 rounded-md">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3 text-center w-10">Chọn</th>
                          <th className="py-2.5 px-3">MSSV</th>
                          <th className="py-2.5 px-3">Họ và tên</th>
                          <th className="py-2.5 px-3">Lớp / Ngành</th>
                          <th className="py-2.5 px-3">Doanh nghiệp thực tập</th>
                          <th className="py-2.5 px-3 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedUnassignedStudents.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="py-10 text-center text-slate-400 font-medium"
                            >
                              <UserX className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="font-bold text-slate-600">
                                Không còn sinh viên chưa phân công nào khớp bộ lọc!
                              </p>
                            </td>
                          </tr>
                        ) : (
                          paginatedUnassignedStudents.map((st) => {
                            const isSelected = selectedUnassignedIds.includes(
                              st.id,
                            );
                            return (
                              <tr
                                key={st.id}
                                onClick={() => {
                                  setSelectedUnassignedIds((prev) =>
                                    prev.includes(st.id)
                                      ? prev.filter((id) => id !== st.id)
                                      : [...prev, st.id],
                                  );
                                }}
                                className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50/80 hover:bg-blue-100/80" : "hover:bg-slate-50"}`}
                              >
                                <td
                                  className="py-2.5 px-3 text-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      setSelectedUnassignedIds((prev) =>
                                        prev.includes(st.id)
                                          ? prev.filter((id) => id !== st.id)
                                          : [...prev, st.id],
                                      );
                                    }}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </td>

                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                  {st.studentId}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">
                                  {st.fullName}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-bold text-slate-800 block">
                                    {st.classCode}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {st.major}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-700 font-medium">
                                  {st.companyName ? (
                                    <span className="flex items-center gap-1 font-bold text-slate-800">
                                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />{" "}
                                      {st.companyName}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">
                                      Chưa đăng ký
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold rounded-md inline-block">
                                    Chưa phân công
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100 font-medium text-slate-600">
                    <span>
                      Hiển thị {paginatedUnassignedStudents.length} /{" "}
                      {filteredUnassignedStudents.length} sinh viên
                    </span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-3 py-1 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                        }
                        disabled={currentPage === totalPages}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Panel>
            </div>
          )}

          {/* TAB 3: PHÂN BỔ DOANH NGHIỆP THỰC TẬP (NEW) */}
          {activeTab === "company-allocation" && (
            <CompanyAllocationsTab
              selectedSemesterId={selectedSemester}
              onShowToast={onShowToast}
            />
          )}

          {/* TAB 4: THỐNG KÊ & CÂN BẰNG TẢI */}
          {activeTab === "stats" && (
            <div className="space-y-6">
              <Panel className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Phân bổ sinh viên theo giảng viên
                  </h2>
                </div>

                <div className="space-y-2">
                  {lecturersByAssignedCount.map((lec) => (
                    <div
                      key={lec.id}
                      className="p-3 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{lec.fullName}</p>
                        <p className="text-[10px] text-slate-500">{lec.department}</p>
                      </div>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {lec.assignedCount} SV
                      </span>
                    </div>
                  ))}
                  {lecturersByAssignedCount.length === 0 && (
                    <p className="py-8 text-center text-slate-400 text-sm">
                      Chưa có dữ liệu phân công.
                    </p>
                  )}
                </div>
              </Panel>

              {/* RECENT LOG FEED */}
              <Panel className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      Nhật ký Phân công gần đây
                    </h2>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  {recentAssignments.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 bg-slate-50 rounded-md border border-slate-200/80 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          Phân công{" "}
                          <span className="text-blue-700">
                            {log.studentCount} sinh viên
                          </span>{" "}
                          cho{" "}
                          <span className="text-blue-900">{log.lecturerName}</span>
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Lớp: {log.classGroups.join(", ")} • Thực hiện bởi:{" "}
                          {log.assignedBy}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">
                        {log.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

        </>
      )}

      {/* MODAL: REASSIGN LECTURER */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Chuyển Giảng viên Hướng dẫn
                </h3>
                <p className="text-xs text-slate-500">
                  Đang chọn {selectedAssignedStudentIds.length} sinh viên để
                  điều chuyển
                </p>
              </div>
              <button
                onClick={() => setShowReassignModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-bold text-slate-800">
                Chọn Giảng viên tiếp nhận mới *
              </label>
              <select
                value={targetReassignLecturerId}
                onChange={(e) => setTargetReassignLecturerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              >
                {lecturers
                  .filter((l) => l.id !== activeLecturerObj.id)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName} — {l.currentCount} SV
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowReassignModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-md"
              >
                Hủy
              </button>
              <button
                onClick={handleExecuteReassign}
                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-md shadow-xs"
              >
                Xác nhận chuyển
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: HISTORY LOG */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Lịch sử Phân công Hướng dẫn
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-1">
              {isHistoryLoading ? (
                <p className="py-8 text-center text-slate-500 font-medium">
                  Đang tải lịch sử…
                </p>
              ) : recentAssignments.length === 0 ? (
                <p className="py-8 text-center text-slate-400 font-medium">
                  Chưa có lịch sử phân công.
                </p>
              ) : (
                recentAssignments.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{log.lecturerName}</span>
                      <span className="text-blue-700">
                        {log.studentCount} Sinh viên
                      </span>
                    </div>
                    <p className="text-slate-600">
                      Phân nhóm: {log.classGroups.join(", ")}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Thực hiện: {log.assignedBy} • {log.timestamp}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-800 font-bold text-xs rounded-md"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: IMPORT LECTURER ASSIGNMENTS */}
      <ImportLecturerAssignmentsModal
        isOpen={showImportLecturerModal}
        onClose={() => setShowImportLecturerModal(false)}
        onShowToast={onShowToast}
        onSuccess={() => {
          setShowImportLecturerModal(false);
          apiMatrix.reload();
        }}
        currentSemesterId={selectedSemester === "all" ? undefined : selectedSemester}
      />
    </div>
  );
};

export { AssignmentsView as AdminAssignmentsView };
