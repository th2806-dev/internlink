import { useState } from "react";
import {
  UserPlus,
  Search,
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
  FileUp,
  UserSearch,
  AlertCircle,
} from "lucide-react";
import { useAdminLecturersQuery, LECTURERS_PAGE_SIZE_OPTIONS } from "../../../hooks/useAdminLecturersQuery";
import { CreateLecturerModal } from "../components/modals/CreateLecturerModal";
import type { CreateLecturerFormPayload } from "../components/modals/CreateLecturerModal";
import { EditLecturerModal } from "../components/modals/EditLecturerModal";
import type {
  EditLecturerFormPayload,
  LecturerRowForEdit,
} from "../components/modals/EditLecturerModal";
import { ImportLecturersModal } from "../components/modals/ImportLecturersModal";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { Panel } from "../../../components/common/Panel";
import { EmptyState } from "../../../components/common/EmptyState";
import { SkeletonBox } from "../../../components/common/SkeletonLoader";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { adminLecturersService } from "../../../services/adminLecturers.service";
import { adminUsersService } from "../../../services/adminUsers.service";
import { useSemester, toApiSemesterId, toApiDepartmentId } from "../../../contexts/SemesterContext";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import type { ToastType } from "../../../contexts/ToastContext";
import { DynamicDataGrid } from "../components/DynamicDataGrid";
export const LecturersView = ({
  onShowToast,
  onNavigateTab: _onNavigateTab,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
  onNavigateTab?: (tab: string) => void;
}) => {
  const { selectedSemester, selectedDepartmentId } = useSemester();
  const { canMutateOps } = useAdminCapabilities();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<LecturerRowForEdit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LecturerRowForEdit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState<LecturerRowForEdit | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGenerateAccountsModalOpen, setIsGenerateAccountsModalOpen] =
    useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");

  const lecturersQuery = useAdminLecturersQuery({
    semesterId: toApiSemesterId(selectedSemester?.id),
    departmentId: toApiDepartmentId(selectedDepartmentId),
    onError: (msg) => onShowToast(msg, "danger"),
  });
  const {
    lecturers,
    isPending: isLoadingApi,
    isError,
    error,
    refetch,
    pagination,
    filter,
    setSearch,
    applySearch,
    setAccountStatusFilter,
    setHasGuidanceFilter,
    clearFilters,
    goToPage,
    setPageSize,
  } = lecturersQuery;
  const reloadLecturers = refetch;

  // (fetch/reload thủ công đã thay bằng useAdminLecturersQuery + invalidation)

  const handleAddLecturer = async (payload: CreateLecturerFormPayload) => {

    try {
      await adminLecturersService.create({
        staffCode: payload.staffCode,
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        department: payload.department,
        grantAccount: payload.grantAccount,
      });
      await reloadLecturers();
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
      throw err;
    }
  };

  const handleUpdateLecturer = async (
    id: string,
    payload: EditLecturerFormPayload,
  ) => {
    const existing = lecturers.find((l) => l.id === id);
    if (!existing) return;



    try {
      await adminLecturersService.update(id, {
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        department: payload.department,
      });
      await reloadLecturers();
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
      throw err;
    }
  };

  const handleDeleteLecturer = async (lec: LecturerRowForEdit) => {


    try {
      await adminLecturersService.delete(lec.id);
      if (selectedLecturer?.id === lec.id) setSelectedLecturer(null);
      if (editingLecturer?.id === lec.id) setEditingLecturer(null);
      await reloadLecturers();
      onShowToast(`Đã xóa ${lec.fullName}`);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };

  const confirmDeleteLecturer = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await handleDeleteLecturer(deleteTarget);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter/pagination là server-side → danh sách hiển thị là dữ liệu trang hiện tại.
  const paginatedLecturers = lecturers;
  const pendingAccounts = lecturers.filter((lecturer) => lecturer.accountStatus === "pending").length;
  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    filter.accountStatus !== "all" ||
    filter.hasGuidance !== "all";
  const isAllPageSelected =
    paginatedLecturers.length > 0 &&
    paginatedLecturers.every((l) => selectedIds.includes(l.id));
  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedLecturers.some((pl) => pl.id === id)),
      );
    } else {
      const pageIds = paginatedLecturers.map((l) => l.id);
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
  const handleQuickGrantSingle = async (lec) => {

    try {
      await adminLecturersService.update(lec.id, {
        fullName: lec.fullName,
        email: lec.email !== "—" ? lec.email : undefined,
        phone: lec.phone !== "—" ? lec.phone : undefined,
        department: lec.department !== "—" ? lec.department : undefined,
        grantAccount: true,
      });
      await reloadLecturers();
      onShowToast(
        lec.email !== "—"
          ? `Đã cấp tài khoản ${lec.employeeId} — email mời đã gửi (nếu SMTP bật)`
          : `Đã cấp tài khoản ${lec.employeeId} — chưa có email để gửi mật khẩu`,
      );
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };
  const handleBatchGenerateAccounts = async () => {
    const targetIds =
      selectedIds.length > 0
        ? selectedIds
        : lecturers
            .filter((l) => l.accountStatus === "pending")
            .map((l) => l.id);

    let ok = 0;
    let fail = 0;
    for (const id of targetIds) {
      const lec = lecturers.find((l) => l.id === id);
      if (!lec || lec.accountStatus !== "pending") continue;
      try {
        await adminLecturersService.update(lec.id, {
          fullName: lec.fullName,
          email: lec.email !== "—" ? lec.email : undefined,
          phone: lec.phone !== "—" ? lec.phone : undefined,
          department: lec.department !== "—" ? lec.department : undefined,
          grantAccount: true,
        });
        ok++;
      } catch {
        fail++;
      }
    }
    if (ok > 0) await reloadLecturers();
    onShowToast(
      fail > 0
        ? `Cấp tài khoản: ${ok} thành công, ${fail} lỗi`
        : `Đã cấp tài khoản thành công cho ${ok} giảng viên`,
    );
    setIsGenerateAccountsModalOpen(false);
    setSelectedIds([]);
  };
  const handleResetPassword = async (lec) => {

    const userId = (lec as { userId?: string | null }).userId;
    if (!userId) {
      onShowToast("Giảng viên chưa có tài khoản đăng nhập");
      return;
    }
    try {
      const res = await adminUsersService.resetPassword(userId);
      onShowToast(
        res.emailSent
          ? `Đã gửi email đặt lại mật khẩu cho ${lec.fullName}`
          : `Đã reset mật khẩu cho ${res.username}`,
      );
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };
  const handleToggleLockAccount = async (id) => {
    const lec = lecturers.find((l) => l.id === id);
    if (!lec) return;
    const newStatus = lec.accountStatus === "locked" ? "active" : "locked";

    const userId = (lec as { userId?: string | null }).userId;
    if (!userId) {
      onShowToast("Giảng viên chưa có tài khoản đăng nhập");
      return;
    }
    try {
      await adminUsersService.update(userId, {
        fullName: lec.fullName,
        email: lec.email !== "—" ? lec.email : undefined,
        isActive: newStatus === "active",
      });
      // Invalidate danh sách giảng viên để trạng thái TK đồng bộ lại từ server.
      await reloadLecturers();
      onShowToast(
        `Đã ${newStatus === "locked" ? "khóa" : "mở khóa"} tài khoản của ${lec.fullName}`,
      );
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
              <h1 className="text-base font-bold tracking-wide">Quản lý giảng viên</h1>
              <p className="mt-0.5 text-xs text-white/80">
                Danh sách giảng viên, thông tin liên hệ, phân công và tài khoản
              </p>
            </div>
          </div>
          {canMutateOps && (
            <div className="flex flex-wrap items-center gap-2">
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
                Cấp tài khoản nhanh
              </button>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-bold text-[#026aa7] transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Thêm giảng viên
              </button>
            </div>
          )}
        </div>
      </section>

      {/* LECTURERS MAIN TABLE */}
      <Panel className="space-y-4 rounded-xl border border-slate-200/90 shadow-2xs">
        {isError && paginatedLecturers.length > 0 && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"
          >
            <span>{getApiErrorMessage(error)} Danh sách hiện tại vẫn được giữ lại.</span>
            <button
              type="button"
              onClick={() => void refetch()}
              className="min-h-8 rounded-md border border-rose-300 bg-white px-3 font-bold text-rose-800 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30"
            >
              Thử tải lại
            </button>
          </div>
        )}
        {/* Table Header & Search Filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Danh sách giảng viên
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                Bảng thông tin chi tiết và quản lý quyền truy cập
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                {selectedSemester.name}
              </span>
              <span className="inline-flex items-center rounded-md border border-sky-100 bg-sky-50 px-2.5 py-1 font-semibold text-[#025a8e]">
                {isLoadingApi
                  ? "Đang tải số liệu…"
                  : `${pagination.total.toLocaleString("vi-VN")} giảng viên trong kỳ`}
              </span>
            </div>
          </div>

          {/* Search & Filter Inputs */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
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
                placeholder="Tìm tên, MSGV, Email..."
                aria-label="Tìm giảng viên"
                className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 font-medium outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
              />
            </div>

            {/* Bộ lọc bộ môn giờ do Header department filter đảm nhiệm (server-side departmentId). */}
            <select
              value={filter.accountStatus}
              onChange={(e) => setAccountStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái tài khoản"
              className="h-9 cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="all">Tất cả trạng thái TK</option>
              <option value="active">Đã cấp tài khoản</option>
              <option value="pending">Chưa cấp tài khoản</option>
            </select>

            <select
              value={filter.hasGuidance}
              onChange={(e) => setHasGuidanceFilter(e.target.value as typeof filter.hasGuidance)}
              aria-label="Lọc theo trạng thái hướng dẫn"
              className="h-9 cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="all">Mọi trạng thái hướng dẫn</option>
              <option value="yes">Đang hướng dẫn</option>
              <option value="no">Chưa có SV</option>
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
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  clearFilters();
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Configurable data table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          {isError ? (
            <div role="alert" className="mx-auto flex max-w-xl flex-col items-center gap-3 p-6 text-center">
              <AlertCircle className="h-8 w-8 text-rose-600" aria-hidden="true" />
              <p className="text-sm font-semibold text-rose-700">Không thể tải danh sách giảng viên</p>
              <p className="text-xs text-slate-600">{getApiErrorMessage(error)}</p>
              <button type="button" onClick={() => void refetch()} className="min-h-9 rounded-md bg-[#026aa7] px-3 text-xs font-bold text-white hover:bg-[#025a8e]">Thử tải lại</button>
            </div>
          ) : (
            <DynamicDataGrid
              featureCode="LECTURERS"
              rows={paginatedLecturers}
              getRowKey={(lecturer) => lecturer.id}
              isLoading={isLoadingApi && paginatedLecturers.length === 0}
              loadingMessage="Đang tải danh sách giảng viên..."
              emptyMessage={hasActiveFilters ? "Không tìm thấy giảng viên phù hợp." : "Chưa có giảng viên trong phạm vi đang chọn."}
              hideFieldCodes={canMutateOps ? [] : ["select"]}
              renderHeader={(fieldCode) => fieldCode === "select" && canMutateOps ? (
                <input type="checkbox" aria-label="Chọn tất cả giảng viên trong trang" checked={isAllPageSelected} onChange={handleToggleSelectAllPage} className="rounded text-[#026aa7]" />
              ) : undefined}
              renderCell={(lecturer, fieldCode) => {
                switch (fieldCode) {
                  case "select":
                    return canMutateOps ? <input type="checkbox" aria-label={`Chọn ${lecturer.fullName}`} checked={selectedIds.includes(lecturer.id)} onChange={() => handleToggleSelect(lecturer.id)} className="rounded text-[#026aa7]" /> : null;
                  case "fullName":
                    return <div className="flex items-center gap-2.5"><InitialsAvatar name={lecturer.fullName} seed={lecturer.employeeId || lecturer.email} size={32} /><div><p className="font-bold text-slate-900">{lecturer.fullName}</p><p className="text-[10px] text-slate-400">{lecturer.academicDegree}</p></div></div>;
                  case "staffCode":
                    return <span className="font-mono font-bold text-slate-800">{lecturer.employeeId}</span>;
                  case "department":
                    return <div><p className="font-bold text-slate-800">{lecturer.department}</p><p className="text-[10px] text-slate-400">{lecturer.faculty}</p></div>;
                  case "contact":
                    return <div><p className="font-bold text-[#026aa7]">{lecturer.email}</p><p className="font-mono text-[10px] text-slate-400">{lecturer.phone}</p></div>;
                  case "assignedCount":
                    return <span className="font-bold tabular-nums text-slate-800">{lecturer.currentCount ?? 0}</span>;
                  case "accountStatus":
                    return <span className={lecturer.accountStatus === "active" ? "rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700" : lecturer.accountStatus === "pending" ? "rounded-md border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700" : "rounded-md border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700"}>{lecturer.accountStatus === "active" ? "Đã cấp" : lecturer.accountStatus === "pending" ? "Chưa cấp" : "Đã khóa"}</span>;
                  case "actions":
                    return <div className="flex items-center justify-center gap-1.5">
                      {canMutateOps && lecturer.accountStatus === "pending" && <button type="button" onClick={() => handleQuickGrantSingle(lecturer)} className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700" title="Cấp tài khoản ngay">Cấp TK</button>}
                      <button type="button" onClick={() => setSelectedLecturer(lecturer)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-[#026aa7]" title="Xem chi tiết" aria-label={`Xem ${lecturer.fullName}`}><Eye className="h-4 w-4" /></button>
                      {canMutateOps && <>
                        <button type="button" onClick={() => setEditingLecturer(lecturer)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-amber-600" title="Sửa" aria-label={`Sửa ${lecturer.fullName}`}><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => setDeleteTarget(lecturer)} className="rounded-lg p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600" title="Xóa" aria-label={`Xóa ${lecturer.fullName}`}><Trash2 className="h-4 w-4" /></button>
                        <button type="button" onClick={() => handleResetPassword(lecturer)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-amber-600" title="Đặt lại mật khẩu" aria-label={`Đặt lại mật khẩu ${lecturer.fullName}`}><RotateCcw className="h-4 w-4" /></button>
                        <button type="button" onClick={() => handleToggleLockAccount(lecturer.id)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100" title={lecturer.accountStatus === "locked" ? "Mở khóa tài khoản" : "Khóa tài khoản"} aria-label={lecturer.accountStatus === "locked" ? `Mở khóa ${lecturer.fullName}` : `Khóa ${lecturer.fullName}`}>{lecturer.accountStatus === "locked" ? <Unlock className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4 text-rose-600" />}</button>
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
          <div className="flex items-center gap-3 text-slate-600 font-medium">
            <span>
              Hiển thị {pagination.from}
              –{pagination.to} / {pagination.total} giảng viên
            </span>
            <label className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Số dòng:</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-[#026aa7] cursor-pointer"
                aria-label="Số giảng viên mỗi trang"
              >
                {LECTURERS_PAGE_SIZE_OPTIONS.map((size) => (
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
              Khởi tạo tài khoản đăng nhập MSGV cho{" "}
              <span className="font-bold text-emerald-700">
                {selectedIds.length > 0
                  ? `${selectedIds.length} gi\u1EA3ng vi\xEAn \u0111\xE3 ch\u1ECDn`
                  : `${pendingAccounts} gi\u1EA3ng vi\xEAn ch\u01B0a c\xF3 t\xE0i kho\u1EA3n trong danh s\xE1ch hi\u1EC7n t\u1EA1i`}
              </span>
              .
            </p>

            <div className="p-3 bg-emerald-50 rounded-md border border-emerald-200 text-xs space-y-1">
              <p className="font-bold text-emerald-950">
                Quy tắc cấp tài khoản mặc định:
              </p>
              <ul className="list-disc pl-4 text-[11px] text-emerald-800 space-y-0.5">
                <li>Username: Mã giảng viên (MaGV)</li>
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

      {/* LECTURER DETAIL DRAWER */}
      {selectedLecturer && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-md p-6 space-y-5 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Hồ sơ Giảng viên
              </h3>
              <button
                onClick={() => setSelectedLecturer(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <InitialsAvatar
                name={selectedLecturer.fullName}
                seed={selectedLecturer.employeeId || selectedLecturer.fullName}
                size={56}
                className="text-lg"
              />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {selectedLecturer.fullName}
                </h4>
                <p className="text-xs font-mono font-bold text-[#026aa7]">
                  {selectedLecturer.employeeId}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedLecturer.department}
                </p>
              </div>
            </div>

            {/* Info Details List */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-md space-y-2 font-medium text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bộ môn:</span>
                  <span className="font-bold text-slate-900">
                    {selectedLecturer.department}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bộ môn:</span>
                  <span className="font-bold text-slate-900">
                    {selectedLecturer.department}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-bold text-[#026aa7]">
                    {selectedLecturer.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Số điện thoại:</span>
                  <span className="font-bold text-slate-900">
                    {selectedLecturer.phone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Trạng thái tài khoản:</span>
                  <span className="font-bold uppercase text-emerald-700">
                    {selectedLecturer.accountStatus}
                  </span>
                </div>
              </div>

              {/* Assignment count */}
              <div className="p-4 bg-[#026aa7]/5 border border-[#026aa7]/15 rounded-lg">
                <span className="text-[10px] font-bold uppercase text-[#026aa7] tracking-wider">
                  SV phân công
                </span>
                <p className="text-xl font-bold text-[#005082] mt-1">
                  {selectedLecturer.currentCount ?? 0}
                </p>
                <p className="text-[10px] text-[#025a8e]/70 mt-1">
                  Danh sách chi tiết xem tại tab Phân công hoặc Workspace của từng sinh viên.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            {canMutateOps && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              {selectedLecturer.accountStatus === "pending" && (
                <button
                  onClick={() => {
                    handleQuickGrantSingle(selectedLecturer);
                    setSelectedLecturer(null);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Cấp tài khoản ngay
                </button>
              )}

              <button
                onClick={() => {
                  setEditingLecturer(selectedLecturer);
                  setSelectedLecturer(null);
                }}
                className="w-full py-2 bg-[#026aa7]/5 hover:bg-[#026aa7]/10 text-[#025a8e] border border-[#026aa7]/20 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" /> Sửa hồ sơ
              </button>

              <button
                onClick={() => {
                  setDeleteTarget(selectedLecturer);
                  setSelectedLecturer(null);
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa giảng viên
              </button>

              <button
                onClick={() => handleResetPassword(selectedLecturer)}
                className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Đặt lại mật khẩu tài khoản
              </button>

              <button
                onClick={() => handleToggleLockAccount(selectedLecturer.id)}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />{" "}
                {selectedLecturer.accountStatus === "locked"
                  ? "M\u1EDF kh\xF3a t\xE0i kho\u1EA3n"
                  : "Kh\xF3a t\xE0i kho\u1EA3n"}
              </button>
            </div>
            )}
          </div>
        </div>
      )}

      {/* IMPORT LECTURERS MODAL */}
      <ImportLecturersModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onShowToast={onShowToast}
        onSuccess={() => void reloadLecturers()}
        currentSemesterId={toApiSemesterId(selectedSemester?.id)}
      />

      {/* CREATE LECTURER MODAL */}
      <CreateLecturerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onShowToast={onShowToast}
        onAddLecturer={handleAddLecturer}
      />

      <EditLecturerModal
        isOpen={Boolean(editingLecturer)}
        lecturer={editingLecturer}
        onClose={() => setEditingLecturer(null)}
        onShowToast={onShowToast}
        onSave={handleUpdateLecturer}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa giảng viên"
        description={
          deleteTarget ? (
            <>
              Xóa giảng viên{" "}
              <strong className="text-slate-900">{deleteTarget.fullName}</strong> (
              {deleteTarget.employeeId})? Hành động không thể hoàn tác.
            </>
          ) : null
        }
        confirmLabel="Xóa giảng viên"
        variant="danger"
        loading={isDeleting}
        onConfirm={() => void confirmDeleteLecturer()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export { LecturersView as AdminLecturersView };
