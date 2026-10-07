import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  UserPlus,
  Search,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  KeyRound,
  Lock,
  Unlock,
  RotateCcw,
  Eye,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  GraduationCap,
  Building2,
  FileUp,
  Check,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { CreateStudentModal } from "../components/modals/CreateStudentModal";
import type { CreateStudentFormPayload } from "../components/modals/CreateStudentModal";
import { EditStudentModal } from "../components/modals/EditStudentModal";
import type { EditStudentFormPayload } from "../components/modals/EditStudentModal";
import { ImportStudentsModal } from "../components/modals/ImportStudentsModal";
import type { AdminStudentRow } from "../../../hooks/useAdminStudentsQuery";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { Panel } from "../../../components/common/Panel";
import { Toolbar } from "../../../components/common/Toolbar";
import { EmptyState } from "../../../components/common/EmptyState";
import { SkeletonBox } from "../../../components/common/SkeletonLoader";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { mapStudentDtoToRow } from "../../../lib/adminMappers";
import { adminStudentsService } from "../../../services/adminStudents.service";
import { adminUsersService } from "../../../services/adminUsers.service";
import { exportService } from "../../../services/export.service";
import { useAdminStudentsQuery, STUDENTS_PAGE_SIZE_OPTIONS } from "../../../hooks/useAdminStudentsQuery";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { useSemester, toApiSemesterId, toApiDepartmentId } from "../../../contexts/SemesterContext";
import { weeklyReportService } from "../../../services/weeklyReport.service";
import { submissionApiService } from "../../../services/submissionApi.service";
import { StudentReportsTab } from "../../lecturer/components/StudentReportsTab";
import type { SubmissionDto, WeeklyReportDto } from "../../../types/api";
import type { ToastType } from "../../../contexts/ToastContext";
export const StudentsView = ({
  onShowToast,
  onNavigateTab,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
  onNavigateTab?: (tab: string) => void;
}) => {
  const { selectedSemester, selectedDepartmentId } = useSemester();
  const { canMutateOps, isSuperAdmin } = useAdminCapabilities();
  const [searchParams, setSearchParams] = useSearchParams();
  const apiPage = useAdminStudentsQuery({
    semesterId: toApiSemesterId(selectedSemester?.id),
    departmentId: toApiDepartmentId(selectedDepartmentId),
    onError: (msg) => onShowToast(msg, "danger"),
  });
  const {
    students,
    counts,
    isCountsPending,
    classOptions,
    isPending: isLoadingApi,
    isError,
    error,
    isFetching,
    isPlaceholderData,
    refetch,
    pagination,
    filter,
    setSearch,
    applySearch,
    setClassFilter,
    setSortBy,
    clearFilters,
    goToPage,
    setPageSize,
  } = apiPage;
  const reloadStudents = refetch;
  const [statusFilter, setStatusFilter] = useState("all");
  const [lecturerFilter, setLecturerFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<AdminStudentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminStudentRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentRow | null>(null);
  const [studentWeeklyReports, setStudentWeeklyReports] = useState<WeeklyReportDto[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<SubmissionDto[]>([]);
  const [studentFilesLoading, setStudentFilesLoading] = useState(false);
  const [studentFileErrors, setStudentFileErrors] = useState<{ reports?: string; submissions?: string }>({});
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGenerateAccountsModalOpen, setIsGenerateAccountsModalOpen] =
    useState(false);
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadStudentFiles = async (internshipId = selectedStudent?.internshipId) => {
    if (!internshipId) {
      setStudentWeeklyReports([]);
      setStudentSubmissions([]);
      return;
    }
    setStudentFilesLoading(true);
    const [reportsResult, submissionsResult] = await Promise.allSettled([
      weeklyReportService.getByInternship(internshipId),
      submissionApiService.getByInternship(internshipId),
    ]);
    setStudentWeeklyReports(reportsResult.status === "fulfilled" ? reportsResult.value : []);
    setStudentSubmissions(submissionsResult.status === "fulfilled" ? submissionsResult.value : []);
    setStudentFileErrors({
      reports: reportsResult.status === "rejected" ? getApiErrorMessage(reportsResult.reason) : undefined,
      submissions: submissionsResult.status === "rejected" ? getApiErrorMessage(submissionsResult.reason) : undefined,
    });
    setStudentFilesLoading(false);
  };

  useEffect(() => {
    if (selectedStudent?.internshipId) void loadStudentFiles(selectedStudent.internshipId);
    else {
      setStudentWeeklyReports([]);
      setStudentSubmissions([]);
      setStudentFileErrors({});
    }
  }, [selectedStudent?.internshipId]);

  /* ── URL ⇄ hook (q/class/status/internship/sort/page) ──────────────── */
  useEffect(() => {
    const q = searchParams.get("q");
    if (q != null && q !== filter.search) {
      setSearchInput(q);
      setSearch(q);
      goToPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (filter.search) next.set("q", filter.search);
    if (filter.class !== "all") next.set("class", filter.class);
    if (filter.accountStatus !== "all") next.set("status", filter.accountStatus);
    if (filter.internshipStatus !== "all") next.set("internship", filter.internshipStatus);
    if (filter.sortBy !== "ten") next.set("sort", filter.sortBy);
    if (filter.page > 1) next.set("page", String(filter.page));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filter.search,
    filter.class,
    filter.accountStatus,
    filter.internshipStatus,
    filter.sortBy,
    filter.page,
  ]);

  const handleAddStudent = async (payload: CreateStudentFormPayload) => {
    try {
      await adminStudentsService.create({
        studentCode: payload.studentCode,
        fullName: payload.fullName,
        class: payload.class,
        major: payload.major,
        email: payload.email,
        phone: payload.phone,
        department: payload.department,
        desiredPosition: payload.desiredPosition,
        alternativePosition: payload.alternativePosition,
        desiredLocation: payload.desiredLocation,
        workPreference: payload.workPreference,
        preferredIndustry: payload.preferredIndustry,
        skills: payload.skills,
        resumeUrl: payload.resumeUrl,
        grantAccount: payload.grantAccount,
      });
      await reloadStudents();
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
      throw err;
    }
  };

  const handleUpdateStudent = async (
    id: string,
    payload: EditStudentFormPayload,
  ) => {
    const existing = students.find((s) => s.id === id);
    if (!existing) return;

    try {
      await adminStudentsService.update(id, {
        fullName: payload.fullName,
        class: payload.class,
        major: payload.major,
        email: payload.email,
        phone: payload.phone,
        department: payload.department,
        desiredPosition: payload.desiredPosition,
        alternativePosition: payload.alternativePosition,
        desiredLocation: payload.desiredLocation,
        workPreference: payload.workPreference,
        preferredIndustry: payload.preferredIndustry,
        skills: payload.skills,
        resumeUrl: payload.resumeUrl,
      });
      await reloadStudents();
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
      throw err;
    }
  };

  const handleDeleteStudent = async (st: AdminStudentRow) => {


    try {
      await adminStudentsService.delete(st.id);
      if (selectedStudent?.id === st.id) setSelectedStudent(null);
      if (editingStudent?.id === st.id) setEditingStudent(null);
      await reloadStudents();
      onShowToast(`Đã xóa ${st.fullName}`);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };

  const confirmDeleteStudent = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await handleDeleteStudent(deleteTarget);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // KPI đếm trên TOÀN BỘ kỳ từ server (không phụ thuộc trang/bộ lọc hiện tại).
  const totalStudents = counts.total;
  const pendingAccounts = counts.pending;
  // Filter/sort/phân trang là server-side → danh sách hiển thị là dữ liệu trang hiện tại.
  const lecturerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .map((student) => student.assignedLecturer)
            .filter((value): value is string => Boolean(value) && value !== "Chưa phân công"),
        ),
      ).sort((a, b) => a.localeCompare(b, "vi")),
    [students],
  );

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesClass = filter.class === "all" || student.classCode === filter.class;
      const matchesLecturer = lecturerFilter === "all" || student.assignedLecturer === lecturerFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && student.accountStatus === "active") ||
        (statusFilter === "pending" && student.accountStatus === "pending") ||
        (statusFilter === "locked" && student.accountStatus === "locked");

      return matchesClass && matchesLecturer && matchesStatus;
    });
  }, [filter.class, lecturerFilter, statusFilter, students]);

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    filter.class !== "all" ||
    statusFilter !== "all" ||
    lecturerFilter !== "all";
  const paginatedStudents = filteredStudents;
  const totalPages = pagination.totalPages;
  const currentPage = pagination.page;
  const pageSize = pagination.pageSize;
  const isAllPageSelected =
    paginatedStudents.length > 0 &&
    paginatedStudents.every((s) => selectedIds.includes(s.id));
  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedStudents.some((ps) => ps.id === id)),
      );
    } else {
      const pageIds = paginatedStudents.map((s) => s.id);
      setSelectedIds((prev) =>
        Array.from(/* @__PURE__ */ new Set([...prev, ...pageIds])),
      );
    }
  };
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };
  const handleQuickGrantSingle = async (st) => {

    try {
      await adminStudentsService.update(st.id, {
        fullName: st.fullName,
        class: st.classCode !== "—" ? st.classCode : undefined,
        major: st.major !== "—" ? st.major : undefined,
        email: st.email !== "—" ? st.email : undefined,
        phone: st.phone !== "—" ? st.phone : undefined,
        grantAccount: true,
      });
      await reloadStudents();
      onShowToast(
        st.email !== "—"
          ? `Đã cấp tài khoản ${st.mssv} — email mời đã gửi (nếu SMTP bật)`
          : `Đã cấp tài khoản ${st.mssv} — chưa có email để gửi mật khẩu`,
      );
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };
  const handleBatchGenerateAccounts = async () => {
    const targetIds =
      selectedIds.length > 0
        ? selectedIds
        : students
            .filter((s) => s.accountStatus === "pending")
            .map((s) => s.id);

    let ok = 0;
    let fail = 0;
    for (const id of targetIds) {
      const st = students.find((s) => s.id === id);
      if (!st || st.accountStatus !== "pending") continue;
      try {
        const dto = await adminStudentsService.update(st.id, {
          fullName: st.fullName,
          class: st.classCode !== "—" ? st.classCode : undefined,
          major: st.major !== "—" ? st.major : undefined,
          email: st.email !== "—" ? st.email : undefined,
          phone: st.phone !== "—" ? st.phone : undefined,
          grantAccount: true,
        });

        ok++;
      } catch {
        fail++;
      }
    }
    onShowToast(
      fail > 0
        ? `Cấp tài khoản: ${ok} thành công, ${fail} lỗi`
        : `Đã cấp tài khoản thành công cho ${ok} sinh viên`,
    );
    if (ok > 0) await reloadStudents();
    setIsGenerateAccountsModalOpen(false);
    setSelectedIds([]);
  };
  const handleResetPassword = async (st) => {

    const userId = (st as { userId?: string | null }).userId;
    if (!userId) {
      onShowToast("Sinh viên chưa có tài khoản đăng nhập");
      return;
    }
    try {
      const res = await adminUsersService.resetPassword(userId);
      onShowToast(
        res.emailSent
          ? `Đã gửi email đặt lại mật khẩu cho ${st.fullName}`
          : `Đã reset mật khẩu cho ${res.username}`,
      );
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };
  const handleToggleLockAccount = async (id) => {
    const st = students.find((s) => s.id === id);
    if (!st) return;
    const newStatus = st.accountStatus === "locked" ? "active" : "locked";

    const userId = (st as { userId?: string | null }).userId;
    if (!userId) {
      onShowToast("Sinh viên chưa có tài khoản đăng nhập");
      return;
    }
    try {
      await adminUsersService.update(userId, {
        fullName: st.fullName,
        email: st.email !== "—" ? st.email : undefined,
        isActive: newStatus === "active",
      });

      await reloadStudents();

      onShowToast(
        `Đã ${newStatus === "locked" ? "khóa" : "mở khóa"} tài khoản của ${st.fullName}`,
      );
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };


  const handleExportInternshipList = async () => {
    try {
      const departmentId = toApiDepartmentId(selectedDepartmentId);
      await exportService.downloadInternshipExcel(
        toApiSemesterId(selectedSemester?.id),
        undefined,
        undefined,
        departmentId,
      );
      onShowToast("Đã tải xuống Danh sách thực tập (.xlsx)");
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 pb-12">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#026aa7] px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <GraduationCap className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-wide">Quản lý sinh viên</h1>
              <p className="mt-0.5 text-xs text-white/80">
                Danh sách sinh viên, giảng viên hướng dẫn, doanh nghiệp và tài khoản
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleExportInternshipList()}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Xuất danh sách thực tập
            </button>
            {canMutateOps && (
              <>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <FileUp className="h-4 w-4" aria-hidden="true" />
                  Import Excel
                </button>
                <button
                  type="button"
                  onClick={() => setIsGenerateAccountsModalOpen(true)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  Cấp tài khoản nhanh{!isCountsPending && ` (${pendingAccounts})`}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-bold text-[#026aa7] transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Thêm sinh viên
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {selectedSemester.status === "completed" && (
        <div className="px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-800 flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-slate-600 shrink-0" />
          <span>
            Đợt thực tập <strong>{selectedSemester.name}</strong> đã kết thúc & đóng dữ liệu. Danh sách sinh viên đang ở chế độ <strong>Lưu trữ (Chỉ xem)</strong>.
          </span>
        </div>
      )}

      <Toolbar
        left={
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="rounded-full border border-[#026aa7]/20 bg-[#026aa7]/5 px-2.5 py-1 text-[11px] font-bold text-[#025a8e]">
              {selectedSemester.name}
            </span>
            <span>
              {isCountsPending
                ? "Đang tải số liệu…"
                : `${totalStudents.toLocaleString("vi-VN")} sinh viên trong kỳ`}
            </span>
            {isLoadingApi && (
              <span className="ml-2 text-[#026aa7] font-semibold">
                · Đang tải API…
              </span>
            )}
          </div>
        }
      />

      {/* STUDENTS MAIN TABLE */}
      <Panel className="space-y-4 rounded-xl border border-slate-200/90 shadow-2xs">
        {/* Table Header & Search Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Danh sách sinh viên
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Bảng thông tin chi tiết và quản lý tài khoản sinh viên
            </p>
          </div>

          {/* Search & Filter Inputs */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setSearch(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch();
                }}
                placeholder="Tìm tên, MSSV, Email, Doanh nghiệp..."
                aria-label="Tìm sinh viên"
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 font-medium outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
              />
            </div>

            <select
              value={filter.class}
              onChange={(e) => setClassFilter(e.target.value)}
              aria-label="Lọc theo lớp"
              className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-800 outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="all">Tất cả Lớp</option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>
                  Lớp {cls}
                </option>
              ))}
            </select>

            <select
              value={lecturerFilter}
              onChange={(e) => setLecturerFilter(e.target.value)}
              aria-label="Lọc theo giảng viên hướng dẫn"
              className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-800 outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="all">Tất cả giảng viên</option>
              {lecturerOptions.map((lecturer) => (
                <option key={lecturer} value={lecturer}>
                  {lecturer}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái tài khoản"
              className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-800 outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đã cấp tài khoản</option>
              <option value="pending">Chưa cấp tài khoản</option>
              <option value="locked">Tài khoản bị khóa</option>
            </select>

            <select
              value={filter.sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sắp xếp"
              className="cursor-pointer rounded-md border border-[#026aa7]/20 bg-[#026aa7]/5 px-3 py-2 font-bold text-[#025a8e] outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="ten">Sắp xếp: Tên A-Z</option>
              <option value="mssv">Sắp xếp: MSSV</option>
              <option value="class">Sắp xếp: Lớp</option>
            </select>

            {canMutateOps && selectedIds.length > 0 && (
              <button
                onClick={handleBatchGenerateAccounts}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md transition-colors flex items-center gap-1.5 cursor-pointer animate-in fade-in"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Cấp TK đã chọn ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                {canMutateOps && (
                  <th className="py-2.5 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      className="rounded text-[#026aa7] cursor-pointer"
                    />
                  </th>
                )}
                <th className="py-2.5 px-3 text-center w-10">STT</th>
                <th className="py-2.5 px-3">Họ & tên</th>
                <th className="py-2.5 px-3">MSSV & Lớp</th>
                <th className="py-2.5 px-3">GVHD</th>
                <th className="py-2.5 px-3">Doanh nghiệp</th>
                <th className="py-2.5 px-3 text-center">Trạng thái TK</th>
                <th className="py-2.5 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isError ? (
                <tr>
                  <td colSpan={canMutateOps ? 8 : 7} className="p-6">
                    <div role="alert" className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
                      <p className="text-sm font-semibold text-rose-700">
                        Không thể tải danh sách sinh viên
                      </p>
                      <p className="text-xs text-slate-600">{getApiErrorMessage(error)}</p>
                      <button
                        type="button"
                        onClick={() => void refetch()}
                        className="min-h-9 rounded-md bg-[#026aa7] px-3 text-xs font-bold text-white transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30"
                      >
                        Thử tải lại
                      </button>
                    </div>
                  </td>
                </tr>
              ) : isLoadingApi ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {canMutateOps && (
                      <td className="py-3 px-3 text-center"><SkeletonBox className="h-4 w-4 mx-auto" /></td>
                    )}
                    <td className="py-3 px-3 text-center"><SkeletonBox className="h-3.5 w-6 mx-auto" /></td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <SkeletonBox className="w-8 h-8 rounded-full shrink-0" />
                        <div className="space-y-1">
                          <SkeletonBox className="h-3.5 w-28" />
                          <SkeletonBox className="h-2.5 w-20" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3"><SkeletonBox className="h-3.5 w-20" /></td>
                    <td className="py-3 px-3"><SkeletonBox className="h-3.5 w-24" /></td>
                    <td className="py-3 px-3"><SkeletonBox className="h-3.5 w-24" /></td>
                    <td className="py-3 px-3 text-center"><SkeletonBox className="h-5 w-20 rounded-full mx-auto" /></td>
                    <td className="py-3 px-3 text-center"><SkeletonBox className="h-6 w-24 rounded-md mx-auto" /></td>
                  </tr>
                ))
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={canMutateOps ? 8 : 7} className="p-4">
                    <EmptyState
                      title={
                        !hasActiveFilters
                          ? "Chưa có sinh viên để hiển thị"
                          : "Không tìm thấy sinh viên phù hợp"
                      }
                      description={
                        !hasActiveFilters
                          ? "API không trả về sinh viên nào cho kỳ và đơn vị đang chọn."
                          : "Thử thay đổi từ khóa hoặc bộ lọc để tìm sinh viên."
                      }
                      action={
                        hasActiveFilters
                          ? {
                              label: "Xóa bộ lọc tìm kiếm",
                              onClick: () => {
                                setSearchInput("");
                                clearFilters();
                                setStatusFilter("all");
                                setLecturerFilter("all");
                              },
                            }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((st, idx) => {
                  const isSelected = selectedIds.includes(st.id);
                  return (
                    <tr
                      key={st.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? "bg-[#026aa7]/5" : ""}`}
                    >
                      {canMutateOps && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(st.id)}
                            className="rounded text-[#026aa7] cursor-pointer"
                          />
                        </td>
                      )}

                      {/* STT */}
                      <td className="py-3 px-3 text-center text-slate-400 font-mono font-bold">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>

                      {/* Họ & tên */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <InitialsAvatar name={st.fullName} seed={st.mssv} size={32} />
                          <div className="min-w-0">
                            <p
                              className="font-bold text-slate-900 truncate leading-tight"
                              title={st.fullName}
                            >
                              {st.fullName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium truncate leading-tight">
                              {st.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* MSSV & Lớp */}
                      <td className="py-3 px-3">
                        <p className="font-mono font-bold text-slate-800">
                          {st.mssv}
                        </p>
                        <p className="text-[10px] text-[#026aa7] font-bold">
                          {st.classCode}
                        </p>
                      </td>

                      {/* GVHD */}
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">
                          {st.assignedLecturer}
                        </p>
                      </td>

                      {/* Doanh nghiệp */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{st.companyName}</span>
                        </div>
                      </td>

                      {/* Account Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {st.accountStatus === "active" && (
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />{" "}
                            Đã cấp
                          </span>
                        )}
                        {st.accountStatus === "pending" && (
                          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-md inline-flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-amber-600" /> Chưa
                            cấp
                          </span>
                        )}
                        {st.accountStatus === "locked" && (
                          <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-md inline-flex items-center gap-1">
                            <Lock className="w-3 h-3 text-rose-600" /> Đã khóa
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canMutateOps && st.accountStatus === "pending" && (
                            <button
                              onClick={() => handleQuickGrantSingle(st)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Cấp tài khoản ngay"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>Cấp TK ngay</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedStudent(st as AdminStudentRow)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-[#026aa7] rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canMutateOps && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingStudent(st as AdminStudentRow)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                                title="Sửa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteTarget(st as AdminStudentRow)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleResetPassword(st)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                                title="Đặt lại mật khẩu"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleToggleLockAccount(st.id)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title={
                                  st.accountStatus === "locked"
                                    ? "M\u1EDF kh\xF3a t\xE0i kho\u1EA3n"
                                    : "Kh\xF3a t\xE0i kho\u1EA3n"
                                }
                              >
                                {st.accountStatus === "locked" ? (
                                  <Unlock className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Lock className="w-4 h-4 text-rose-600" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-1 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">
              Hiển thị {pagination.from}
              –{pagination.to} / {pagination.total} sinh viên
            </span>
            <label className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Số dòng:</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-[#026aa7] cursor-pointer"
                aria-label="Số sinh viên mỗi trang"
              >
                {STUDENTS_PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} dòng
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1.5 font-bold">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Panel>

      {/* GENERATE ACCOUNTS MODAL */}
      {isGenerateAccountsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-lg border border-slate-200 shadow-md max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Cấp Tài khoản Nhanh
                </h3>
              </div>
              <button
                onClick={() => setIsGenerateAccountsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Khởi tạo tài khoản đăng nhập MSSV cho{" "}
              <span className="font-bold text-emerald-700">
                {selectedIds.length > 0
                  ? `${selectedIds.length} sinh vi\xEAn \u0111\xE3 ch\u1ECDn`
                  : `${pendingAccounts} sinh vi\xEAn ch\u01B0a c\xF3 t\xE0i kho\u1EA3n`}
              </span>
              .
            </p>

            <div className="p-3 bg-emerald-50 rounded-md border border-emerald-200 text-xs space-y-1">
              <p className="font-bold text-emerald-950">
                Quy tắc cấp tài khoản mặc định:
              </p>
              <ul className="list-disc pl-4 text-[11px] text-emerald-800 space-y-0.5">
                <li>Username: Mã số sinh viên (MSSV)</li>
                <li>Mật khẩu tạm: 8 ký tự ngẫu nhiên (gửi qua email nếu có)</li>
                <li>Yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsGenerateAccountsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-md cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleBatchGenerateAccounts}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Kích hoạt ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT DETAIL DRAWER */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-3xl h-full shadow-md p-6 space-y-5 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Hồ sơ Sinh viên
              </h3>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <InitialsAvatar
                name={selectedStudent.fullName}
                seed={selectedStudent.mssv}
                size={56}
                className="text-lg"
              />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {selectedStudent.fullName}
                </h4>
                <p className="text-xs font-mono font-bold text-[#026aa7]">
                  {selectedStudent.mssv}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Lớp: {selectedStudent.classCode} • GPA: {selectedStudent.gpa}
                </p>
              </div>
            </div>

            {/* Details List */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-md space-y-2 font-medium text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ngành học:</span>
                  <span className="font-bold text-slate-900">
                    {selectedStudent.major}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Khóa học:</span>
                  <span className="font-bold text-slate-900">
                    {selectedStudent.cohort}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-bold text-[#026aa7]">
                    {selectedStudent.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Số điện thoại:</span>
                  <span className="font-bold text-slate-900">
                    {selectedStudent.phone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">GV Hướng dẫn:</span>
                  <span className="font-bold text-slate-900">
                    {selectedStudent.assignedLecturer}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Doanh nghiệp thực tập:</span>
                  <span className="font-bold text-slate-900">
                    {selectedStudent.companyName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Trạng thái tài khoản:</span>
                  <span className="font-bold uppercase text-emerald-700">
                    {selectedStudent.accountStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4">
              <h4 className="text-sm font-bold text-slate-900">File minh chứng & nhật ký</h4>
              {selectedStudent.internshipId ? (
                <StudentReportsTab
                  internshipId={selectedStudent.internshipId}
                  studentName={selectedStudent.fullName}
                  studentCode={selectedStudent.mssv}
                  weeklyReports={studentWeeklyReports}
                  submissions={studentSubmissions}
                  isLoading={studentFilesLoading}
                  onRefresh={() => loadStudentFiles(selectedStudent.internshipId)}
                  onShowToast={(message) => onShowToast(message)}
                  errors={studentFileErrors}
                />
              ) : (
                <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">Sinh viên chưa được gán vào kỳ thực tập này.</p>
              )}
            </div>

            {/* Internship Preferences */}
            {(selectedStudent.desiredPosition || selectedStudent.skills || selectedStudent.desiredLocation || selectedStudent.preferredIndustry || selectedStudent.department) && (
              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-violet-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Nguyện vọng thực tập
                </h4>
                <div className="p-3 bg-violet-50/50 rounded-md space-y-2 font-medium text-slate-700 border border-violet-100">
                  {selectedStudent.department && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Khoa:</span>
                      <span className="font-bold text-slate-900">{selectedStudent.department}</span>
                    </div>
                  )}
                  {selectedStudent.desiredPosition && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vị trí mong muốn:</span>
                      <span className="font-bold text-[#025a8e]">{selectedStudent.desiredPosition}</span>
                    </div>
                  )}
                  {selectedStudent.alternativePosition && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vị trí thay thế:</span>
                      <span className="font-bold text-slate-900">{selectedStudent.alternativePosition}</span>
                    </div>
                  )}
                  {selectedStudent.desiredLocation && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Địa điểm:</span>
                      <span className="font-bold text-slate-900">{selectedStudent.desiredLocation}</span>
                    </div>
                  )}
                  {selectedStudent.workPreference && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hình thức:</span>
                      <span className="font-bold text-slate-900">{selectedStudent.workPreference}</span>
                    </div>
                  )}
                  {selectedStudent.preferredIndustry && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lĩnh vực:</span>
                      <span className="font-bold text-slate-900">{selectedStudent.preferredIndustry}</span>
                    </div>
                  )}
                  {selectedStudent.resumeUrl && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">CV / Portfolio:</span>
                      <a
                        href={selectedStudent.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#026aa7] hover:text-[#025a8e] flex items-center gap-1 underline"
                      >
                        Xem CV <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
                {selectedStudent.skills && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStudent.skills.split(/[,;]/).map((skill: string, i: number) => {
                      const s = skill.trim();
                      if (!s) return null;
                      return (
                        <span key={i} className="px-2 py-0.5 bg-violet-100 text-violet-700 border border-violet-200 rounded-full text-[10px] font-bold">
                          {s}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            {canMutateOps && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              {selectedStudent.accountStatus === "pending" && (
                <button
                  onClick={() => {
                    handleQuickGrantSingle(selectedStudent);
                    setSelectedStudent(null);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Cấp tài khoản ngay
                </button>
              )}

              <button
                onClick={() => {
                  setEditingStudent(selectedStudent as AdminStudentRow);
                  setSelectedStudent(null);
                }}
                className="w-full py-2 bg-[#026aa7]/5 hover:bg-[#026aa7]/10 text-[#025a8e] border border-[#026aa7]/20 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" /> Sửa hồ sơ
              </button>

              <button
                onClick={() => {
                  setDeleteTarget(selectedStudent as AdminStudentRow);
                  setSelectedStudent(null);
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa sinh viên
              </button>

              <button
                onClick={() => handleResetPassword(selectedStudent)}
                className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Đặt lại mật khẩu tài khoản
              </button>

              <button
                onClick={() => handleToggleLockAccount(selectedStudent.id)}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />{" "}
                {selectedStudent.accountStatus === "locked"
                  ? "M\u1EDF kh\xF3a t\xE0i kho\u1EA3n"
                  : "Kh\xF3a t\xE0i kho\u1EA3n"}
              </button>
            </div>
            )}
          </div>
        </div>
      )}

      {/* IMPORT STUDENTS MODAL */}
      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onShowToast={onShowToast}
        onSuccess={() => void reloadStudents()}
        currentSemesterId={toApiSemesterId(selectedSemester?.id)}
      />

      {/* CREATE STUDENT MODAL */}
      <CreateStudentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onShowToast={onShowToast}
        onAddStudent={handleAddStudent}
      />

      <EditStudentModal
        isOpen={Boolean(editingStudent)}
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
        onShowToast={onShowToast}
        onSave={handleUpdateStudent}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa sinh viên"
        description={
          deleteTarget ? (
            <>
              Xóa sinh viên{" "}
              <strong className="text-slate-900">{deleteTarget.fullName}</strong> (
              {deleteTarget.mssv})? Hành động không thể hoàn tác.
              Sinh viên đã phát sinh hoạt động thực tập (báo cáo, bài nộp, chấm
              điểm, hồ sơ) sẽ bị chặn xóa.
            </>
          ) : null
        }
        confirmLabel="Xóa sinh viên"
        variant="danger"
        loading={isDeleting}
        onConfirm={() => void confirmDeleteStudent()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export { StudentsView as AdminStudentsView };
