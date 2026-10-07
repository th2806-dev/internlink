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
import { Toolbar } from "../../../components/common/Toolbar";
import { EmptyState } from "../../../components/common/EmptyState";
import { SkeletonBox } from "../../../components/common/SkeletonLoader";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { adminLecturersService } from "../../../services/adminLecturers.service";
import { adminUsersService } from "../../../services/adminUsers.service";
import { useSemester, toApiSemesterId, toApiDepartmentId } from "../../../contexts/SemesterContext";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import type { ToastType } from "../../../contexts/ToastContext";
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

      <Toolbar
        left={
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full border border-[#026aa7]/20 bg-[#026aa7]/5 px-2.5 py-1 text-[11px] font-bold text-[#025a8e]">
              {selectedSemester.name}
            </span>
            <span>
              {isLoadingApi
                ? "Đang tải danh sách…"
                : `${pagination.total.toLocaleString("vi-VN")} giảng viên trong kỳ`}
            </span>
          </div>
        }
      />

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Danh sách giảng viên
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Bảng thông tin chi tiết và quản lý quyền truy cập
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
                placeholder="Tìm tên, MSGV, Email..."
                aria-label="Tìm giảng viên"
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 font-medium outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
              />
            </div>

            {/* Bộ lọc bộ môn giờ do Header department filter đảm nhiệm (server-side departmentId). */}
            <select
              value={filter.accountStatus}
              onChange={(e) => setAccountStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái tài khoản"
              className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-800 outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="all">Tất cả trạng thái TK</option>
              <option value="active">Đã cấp tài khoản</option>
              <option value="pending">Chưa cấp tài khoản</option>
            </select>

            <select
              value={filter.hasGuidance}
              onChange={(e) => setHasGuidanceFilter(e.target.value as typeof filter.hasGuidance)}
              aria-label="Lọc theo trạng thái hướng dẫn"
              className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-800 outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
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
                <th className="py-2.5 px-3">Giảng viên</th>
                <th className="py-2.5 px-3">MSGV</th>
                <th className="py-2.5 px-3">Khoa / Bộ môn</th>
                <th className="py-2.5 px-3">Liên hệ</th>
                <th className="py-2.5 px-3 text-center">SV phân công</th>
                <th className="py-2.5 px-3 text-center">Trạng thái TK</th>
                <th className="py-2.5 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isError && paginatedLecturers.length === 0 ? (
                <tr>
                  <td colSpan={canMutateOps ? 8 : 7} className="p-6">
                    <div role="alert" className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
                      <AlertCircle className="h-8 w-8 text-rose-600" aria-hidden="true" />
                      <p className="text-sm font-semibold text-rose-700">
                        Không thể tải danh sách giảng viên
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
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    {canMutateOps && (
                      <td className="px-3 py-3 text-center">
                        <SkeletonBox className="mx-auto h-4 w-4" />
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <SkeletonBox className="h-8 w-8 shrink-0 rounded-full" />
                        <div className="space-y-1">
                          <SkeletonBox className="h-3.5 w-28" />
                          <SkeletonBox className="h-2.5 w-20" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><SkeletonBox className="h-3.5 w-16" /></td>
                    <td className="px-3 py-3"><SkeletonBox className="h-3.5 w-24" /></td>
                    <td className="px-3 py-3"><SkeletonBox className="h-3.5 w-28" /></td>
                    <td className="px-3 py-3 text-center"><SkeletonBox className="mx-auto h-3.5 w-8" /></td>
                    <td className="px-3 py-3 text-center"><SkeletonBox className="mx-auto h-5 w-20 rounded-full" /></td>
                    <td className="px-3 py-3 text-center"><SkeletonBox className="mx-auto h-6 w-24 rounded-md" /></td>
                  </tr>
                ))
              ) : paginatedLecturers.length === 0 ? (
                <tr>
                  <td
                    colSpan={canMutateOps ? 8 : 7}
                    className="p-4"
                  >
                    <EmptyState
                      icon={UserSearch}
                      title={
                        hasActiveFilters
                          ? "Không tìm thấy giảng viên phù hợp"
                          : "Chưa có giảng viên để hiển thị"
                      }
                      description={
                        hasActiveFilters
                          ? "Thử thay đổi từ khóa hoặc bộ lọc để tìm giảng viên."
                          : "API không trả về giảng viên nào cho kỳ và đơn vị đang chọn."
                      }
                      action={
                        hasActiveFilters
                          ? {
                              label: "Xóa bộ lọc tìm kiếm",
                              onClick: () => {
                                setSearchInput("");
                                clearFilters();
                              },
                            }
                          : canMutateOps
                            ? {
                                label: "Thêm giảng viên",
                                onClick: () => setIsCreateModalOpen(true),
                              }
                            : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginatedLecturers.map((lec) => {
                  const isSelected = selectedIds.includes(lec.id);
                  return (
                    <tr
                      key={lec.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? "bg-[#026aa7]/5" : ""}`}
                    >
                      {canMutateOps && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(lec.id)}
                            className="rounded text-[#026aa7] cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Name & Academic Degree */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <InitialsAvatar
                            name={lec.fullName}
                            seed={lec.employeeId || lec.email || lec.fullName}
                            size={32}
                          />
                          <div>
                            <p className="font-bold text-slate-900">
                              {lec.fullName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {lec.academicDegree}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {lec.employeeId}
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800 block">
                          {lec.department}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {lec.faculty}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3">
                        <p className="font-bold text-[#026aa7]">{lec.email}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {lec.phone}
                        </p>
                      </td>

                      {/* Assignment count */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-800 tabular-nums">
                          {lec.currentCount}
                        </span>
                      </td>

                      {/* Account Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {lec.accountStatus === "active" && (
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />{" "}
                            Đã cấp
                          </span>
                        )}
                        {lec.accountStatus === "pending" && (
                          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-md inline-flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-amber-600" /> Chưa
                            cấp
                          </span>
                        )}
                        {lec.accountStatus === "locked" && (
                          <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-md inline-flex items-center gap-1">
                            <Lock className="w-3 h-3 text-rose-600" /> Đã khóa
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canMutateOps && lec.accountStatus === "pending" && (
                            <button
                              onClick={() => handleQuickGrantSingle(lec)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Cấp tài khoản ngay"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>Cấp TK ngay</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedLecturer(lec)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-[#026aa7] rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canMutateOps && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingLecturer(lec)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                                title="Sửa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteTarget(lec)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleResetPassword(lec)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                                title="Đặt lại mật khẩu"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleToggleLockAccount(lec.id)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title={
                                  lec.accountStatus === "locked"
                                    ? "M\u1EDF kh\xF3a t\xE0i kho\u1EA3n"
                                    : "Kh\xF3a t\xE0i kho\u1EA3n"
                                }
                              >
                                {lec.accountStatus === "locked" ? (
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
