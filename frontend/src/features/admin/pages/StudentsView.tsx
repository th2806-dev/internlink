import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  UserPlus,
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
import { DynamicDataGrid } from "../components/DynamicDataGrid";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
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
    <div className="w-full space-y-1.5 pb-12">
      <CompactActionBar
        icon={GraduationCap}
        title="Sinh viên"
        total={isCountsPending
          ? "Đang tải số liệu…"
          : `(${totalStudents.toLocaleString("vi-VN")} SV)`}
        search={{
          value: searchInput,
          onChange: (value) => {
            setSearchInput(value);
            setSearch(value);
          },
          placeholder: "Tìm tên, MSSV, email...",
          ariaLabel: "Tìm sinh viên",
        }}
        filters={
          <>
            <select
              value={filter.class}
              onChange={(event) => setClassFilter(event.target.value)}
              aria-label="Lọc theo lớp"
              className="h-8 max-w-28 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-700"
            >
              <option value="all">Tất cả lớp</option>
              {classOptions.map((classCode) => (
                <option key={classCode} value={classCode}>{classCode}</option>
              ))}
            </select>
            <select
              value={lecturerFilter}
              onChange={(event) => setLecturerFilter(event.target.value)}
              aria-label="Lọc theo giảng viên hướng dẫn"
              className="h-8 max-w-36 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-700"
            >
              <option value="all">Tất cả giảng viên</option>
              {lecturerOptions.map((lecturer) => (
                <option key={lecturer} value={lecturer}>{lecturer}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Lọc theo trạng thái tài khoản"
              className="h-8 max-w-32 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-700"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="active">Đã cấp</option>
              <option value="pending">Chưa cấp</option>
              <option value="locked">Đã khóa</option>
            </select>
            <select
              value={filter.sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Sắp xếp"
              className="h-8 max-w-28 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-700"
            >
              <option value="ten">Tên A-Z</option>
              <option value="mssv">MSSV</option>
              <option value="class">Lớp</option>
            </select>
            {(hasActiveFilters || filter.sortBy !== "ten") && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  clearFilters();
                  setStatusFilter("all");
                  setLecturerFilter("all");
                }}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Xóa lọc
              </button>
            )}
          </>
        }
        actions={[
          {
            label: "Xuất Excel",
            icon: Download,
            onClick: () => void handleExportInternshipList(),
          },
          ...(canMutateOps
            ? [
                {
                  label: "Nhập Excel",
                  icon: FileUp,
                  onClick: () => setIsImportModalOpen(true),
                },
                {
                  label: `Cấp TK${!isCountsPending ? ` (${pendingAccounts})` : ""}`,
                  icon: KeyRound,
                  onClick: () => setIsGenerateAccountsModalOpen(true),
                },
                {
                  label: "Thêm",
                  icon: UserPlus,
                  onClick: () => setIsCreateModalOpen(true),
                  variant: "primary" as const,
                },
              ]
            : []),
        ]}
      >
        {canMutateOps && selectedIds.length > 0 && (
          <button
            type="button"
            onClick={handleBatchGenerateAccounts}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-[#7bc043] px-2.5 text-[11px] font-bold text-slate-900 hover:bg-[#6eae36] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30"
          >
            <KeyRound aria-hidden="true" className="h-3.5 w-3.5" />
            Cấp {selectedIds.length}
          </button>
        )}
      </CompactActionBar>

      {selectedSemester.status === "completed" && (
        <div className="px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-800 flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-slate-600 shrink-0" />
          <span>
            Đợt thực tập <strong>{selectedSemester.name}</strong> đã kết thúc & đóng dữ liệu. Danh sách sinh viên đang ở chế độ <strong>Lưu trữ (Chỉ xem)</strong>.
          </span>
        </div>
      )}

      {/* STUDENTS MAIN TABLE */}
      <div className="space-y-1.5">
        {/* Configurable data table */}
        <div className="overflow-x-auto rounded-md border border-slate-200/80">
          {isError ? (
            <div role="alert" className="flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-sm font-semibold text-rose-700">Không thể tải danh sách sinh viên</p>
              <p className="text-xs text-slate-600">{getApiErrorMessage(error)}</p>
              <button type="button" onClick={() => void refetch()} className="min-h-9 rounded-md bg-[#026aa7] px-3 text-xs font-bold text-white hover:bg-[#025a8e]">Thử tải lại</button>
            </div>
          ) : (
            <DynamicDataGrid
              featureCode="STUDENTS"
              rows={paginatedStudents}
              getRowKey={(student) => student.id}
              isLoading={isLoadingApi && paginatedStudents.length === 0}
              loadingMessage="Đang tải danh sách sinh viên..."
              emptyMessage={hasActiveFilters ? "Không tìm thấy sinh viên phù hợp." : "Chưa có sinh viên trong phạm vi đang chọn."}
              hideFieldCodes={canMutateOps ? [] : ["select"]}
              renderHeader={(fieldCode) => fieldCode === "select" && canMutateOps ? (
                <input type="checkbox" aria-label="Chọn tất cả sinh viên trong trang" checked={isAllPageSelected} onChange={handleToggleSelectAllPage} className="rounded text-[#026aa7]" />
              ) : undefined}
              renderCell={(student, fieldCode) => {
                switch (fieldCode) {
                  case "select":
                    return canMutateOps ? <input type="checkbox" aria-label={`Chọn ${student.fullName}`} checked={selectedIds.includes(student.id)} onChange={() => handleToggleSelect(student.id)} className="rounded text-[#026aa7]" /> : null;
                  case "fullName":
                    return <div className="flex items-center gap-2.5"><InitialsAvatar name={student.fullName} seed={student.mssv} size={24} fontSize={10} className="text-[10px]" /><div className="min-w-0"><p className="truncate font-bold text-slate-900">{student.fullName}</p><p className="truncate text-[10px] text-slate-400">{student.email}</p></div></div>;
                  case "studentCode":
                    return <div><p className="font-mono font-bold text-slate-800">{student.mssv}</p><p className="text-[10px] font-bold text-[#026aa7]">{student.classCode}</p></div>;
                  case "assignedLecturer":
                    return <span className="font-semibold text-slate-800">{student.assignedLecturer}</span>;
                  case "companyName":
                    return <span className="font-semibold text-slate-800">{student.companyName}</span>;
                  case "accountStatus":
                    return <span className={student.accountStatus === "active" ? "rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700" : student.accountStatus === "pending" ? "rounded-md border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700" : "rounded-md border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700"}>{student.accountStatus === "active" ? "Đã cấp" : student.accountStatus === "pending" ? "Chưa cấp" : "Đã khóa"}</span>;
                  case "actions":
                    return <div className="flex items-center justify-center gap-1.5">
                      {canMutateOps && student.accountStatus === "pending" && <button type="button" onClick={() => handleQuickGrantSingle(student)} className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700" title="Cấp tài khoản ngay">Cấp TK</button>}
                      <button type="button" onClick={() => setSelectedStudent(student)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-[#026aa7]" title="Xem chi tiết" aria-label={`Xem ${student.fullName}`}><Eye className="h-4 w-4" /></button>
                      {canMutateOps && <>
                        <button type="button" onClick={() => setEditingStudent(student)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-amber-600" title="Sửa" aria-label={`Sửa ${student.fullName}`}><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => setDeleteTarget(student)} className="rounded-lg p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600" title="Xóa" aria-label={`Xóa ${student.fullName}`}><Trash2 className="h-4 w-4" /></button>
                        <button type="button" onClick={() => handleResetPassword(student)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-amber-600" title="Đặt lại mật khẩu" aria-label={`Đặt lại mật khẩu ${student.fullName}`}><RotateCcw className="h-4 w-4" /></button>
                        <button type="button" onClick={() => handleToggleLockAccount(student.id)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100" title={student.accountStatus === "locked" ? "Mở khóa tài khoản" : "Khóa tài khoản"} aria-label={student.accountStatus === "locked" ? `Mở khóa ${student.fullName}` : `Khóa ${student.fullName}`}>{student.accountStatus === "locked" ? <Unlock className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4 text-rose-600" />}</button>
                      </>}
                    </div>;
                  default:
                    return undefined;
                }
              }}
            />
          )}
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
      </div>

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
                <h4 className="font-bold text-[#026aa7] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Nguyện vọng thực tập
                </h4>
                <div className="p-3 bg-[#026aa7]/5 rounded-md space-y-2 font-medium text-slate-700 border border-[#026aa7]/15">
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
                        <span key={i} className="px-2 py-0.5 bg-[#026aa7]/10 text-[#026aa7] border border-[#026aa7]/20 rounded-full text-[10px] font-bold">
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
