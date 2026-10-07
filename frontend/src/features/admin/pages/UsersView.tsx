import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Search,
  KeyRound,
  Lock,
  Unlock,
  Shield,
  GraduationCap,
  UserCheck,
  UserPlus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { Panel } from "../../../components/common/Panel";
import { Toolbar } from "../../../components/common/Toolbar";
import { EmptyState } from "../../../components/common/EmptyState";
import { TableSkeleton } from "../../../components/common/SkeletonLoader";
import { RequestErrorState } from "../../../components/common/RequestErrorState";
import type { AdminUser } from "../../../types/user";
import { getApiErrorMessage, ApiClientError } from "../../../lib/apiClient";
import { useAdminUsersQuery, USERS_PAGE_SIZE_OPTIONS } from "../../../hooks/useAdminUsersQuery";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import {
  CreateUserModal,
  type CreateUserFormPayload,
  type CreateUserRole,
} from "../components/modals/CreateUserModal";

const ROLE_LABEL: Record<"admin" | "lecturer" | "student", string> = {
  admin: "Admin",
  lecturer: "Giảng viên",
  student: "Sinh viên",
};

const STATUS_STYLE: Record<"active" | "locked" | "pending", string> = {
  active: "bg-[#7bc043]/15 text-[#3f6416] border-[#7bc043]/40",
  locked: "bg-rose-50 text-rose-800 border-rose-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
};

const STATUS_LABEL: Record<"active" | "locked" | "pending", string> = {
  active: "Hoạt động",
  locked: "Đã khóa",
  pending: "Chờ kích hoạt",
};

import type { ToastType } from "../../../contexts/ToastContext";
export const UsersView = ({
  onShowToast,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
}) => {
  const { isSuperAdmin, isDepartmentAdmin } = useAdminCapabilities();
  const [searchParams, setSearchParams] = useSearchParams();

  const allowedCreateRoles: CreateUserRole[] = isSuperAdmin
    ? ["DepartmentAdmin"]
    : ["Student", "Lecturer"];
  const canCreateUser = isSuperAdmin || isDepartmentAdmin;
  const canMutateUser = (u: AdminUser) =>
    isSuperAdmin ? u.role === "admin" : u.role === "student" || u.role === "lecturer";

  /* ── Filter/pagination đồng bộ URL (?q=&role=&status=&page=) ────────── */
  const q = searchParams.get("q") ?? "";
  const roleParam = (searchParams.get("role") ?? "all") as
    | "all" | "admin" | "lecturer" | "student";
  const statusParam = (searchParams.get("status") ?? "all") as
    | "all" | "active" | "locked";
  const pageParam = Math.max(1, Number(searchParams.get("page")) || 1);

  const usersQuery = useAdminUsersQuery({
    pageSize: USERS_PAGE_SIZE_OPTIONS[0],
    onError: (msg) => onShowToast(msg, "danger"),
  });
  const {
    users,
    pagination,
    counts,
    isPending,
    isError,
    error,
    isFetching,
    refetch,
    filter,
    setSearch,
    applySearch,
    setRole,
    setStatus,
    clearFilters,
    goToPage,
    setPageSize,
    createUser,
    toggleLock: toggleUserLock,
    resetPassword: resetUserPassword,
    deleteUser: removeUser,
    isDeleting,
    isResetting,
  } = usersQuery;
  const hasActiveFilters = Boolean(filter.search) || filter.role !== "all" || filter.status !== "all";

  const [searchInput, setSearchInput] = useState(q);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  // URL → hook (khi vào từ link/share hoặc back/forward).
  useEffect(() => {
    setRole(roleParam);
  }, [roleParam, setRole]);
  useEffect(() => {
    setStatus(statusParam);
  }, [statusParam, setStatus]);
  useEffect(() => {
    if (q !== filter.search) {
      setSearchInput(q);
      // Áp dụng ngay từ URL (link/share) — không chờ debounce.
      setSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  useEffect(() => {
    if (pageParam !== filter.page) goToPage(pageParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageParam]);

  // hook → URL (ghi đè lịch sử, không spam history stack).
  useEffect(() => {
    const next = new URLSearchParams();
    if (filter.search) next.set("q", filter.search);
    if (filter.role !== "all") next.set("role", filter.role);
    if (filter.status !== "all") next.set("status", filter.status);
    if (filter.page > 1) next.set("page", String(filter.page));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.search, filter.role, filter.status, filter.page]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeUser(deleteTarget.id);
      onShowToast(`Đã xóa tài khoản ${deleteTarget.fullName} khỏi hệ thống.`);
      setDeleteTarget(null);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };

  const toggleLock = async (u: AdminUser) => {
    try {
      const msg = await toggleUserLock(u);
      onShowToast(msg);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };

  const confirmReset = async () => {
    if (!resetTarget) return;
    try {
      const res = await resetUserPassword(resetTarget.id);
      onShowToast(
        res.emailSent
          ? `Đã gửi email đặt lại mật khẩu cho ${resetTarget.fullName}`
          : `Đã reset mật khẩu tạm cho ${res.username || resetTarget.fullName}`,
      );
      setResetTarget(null);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };

  const handleCreateUser = async (payload: CreateUserFormPayload) => {
    try {
      const created = await createUser(payload);
      onShowToast(
        created.email && created.email !== "—"
          ? `Đã tạo tài khoản ${created.fullName ?? created.code} — email đã gửi nếu SMTP bật.`
          : `Đã tạo tài khoản ${created.fullName ?? created.code}.`,
      );
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };

  const renderUserActions = (user: AdminUser) =>
    canMutateUser(user) ? (
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => setResetTarget(user)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-amber-50 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
          title="Đặt lại mật khẩu"
          aria-label={`Đặt lại mật khẩu cho ${user.fullName}`}
        >
          <KeyRound className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => void toggleLock(user)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
          title={user.status === "locked" ? "Mở khóa" : "Khóa"}
          aria-label={`${user.status === "locked" ? "Mở khóa" : "Khóa"} tài khoản ${user.fullName}`}
        >
          {user.status === "locked" ? <Unlock className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={() => setDeleteTarget(user)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          title="Xóa tài khoản"
          aria-label={`Xóa tài khoản ${user.fullName}`}
        >
          <Trash2 className="h-4 w-4 text-rose-500" aria-hidden="true" />
        </button>
      </div>
    ) : (
      <span className="text-[11px] font-medium text-slate-400">Chỉ xem</span>
    );

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 pb-12">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#026aa7] px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <Users className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-wide">Quản lý tài khoản</h1>
              <p className="mt-0.5 text-xs text-white/80">
                Tra cứu, phân quyền và quản lý trạng thái tài khoản trong hệ thống
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
              Làm mới
            </button>
            {canCreateUser && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-bold text-[#026aa7] transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Tạo tài khoản
              </button>
            )}
          </div>
        </div>
      </section>

      {isSuperAdmin && (
        <Panel className="flex items-start gap-2.5 rounded-xl border-slate-200/90 shadow-2xs">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#026aa7]" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-slate-700">
            <strong className="text-slate-900">Phân quyền quản lý tài khoản:</strong>{" "}
            Quản trị hệ thống chỉ tạo và quản lý tài khoản Quản trị khoa. Tài khoản
            Sinh viên và Giảng viên do Quản trị khoa trực tiếp phụ trách.
          </p>
        </Panel>
      )}

      <Toolbar
        left={
          <p className="text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800">{counts.total}</span>{" "}
            tài khoản ·{" "}
            <span className="font-bold text-rose-700">{counts.locked}</span>{" "}
            đang khóa
            {isFetching && (
              <span className="ml-2 text-[#026aa7] font-semibold">· Đang tải…</span>
            )}
          </p>
        }
      />

      <Panel className="space-y-4 rounded-xl border-slate-200/90 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Danh sách tài khoản ({pagination.total})
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Gộp quản lý Admin / Giảng viên / Sinh viên
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setSearch(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch();
                }}
                placeholder="Tìm mã, tên, email…"
                aria-label="Tìm tài khoản"
                className="min-h-10 w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 sm:w-52"
              />
            </div>
            <select
              value={filter.role}
              onChange={(e) => setRole(e.target.value as typeof filter.role)}
              aria-label="Lọc theo vai trò"
              className="min-h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 cursor-pointer sm:w-auto"
            >
              <option value="all">Mọi vai trò</option>
              <option value="admin">Admin</option>
              <option value="lecturer">Giảng viên</option>
              <option value="student">Sinh viên</option>
            </select>
            <select
              value={filter.status}
              onChange={(e) => setStatus(e.target.value as typeof filter.status)}
              aria-label="Lọc theo trạng thái"
              className="min-h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 cursor-pointer sm:w-auto"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>
          </div>
        </div>

        {/* ── LỖI: không bao giờ hiển thị nhầm là "không có dữ liệu" ── */}
        {isError && (
          <RequestErrorState
            title="Không thể tải danh sách tài khoản"
            message={error instanceof Error ? error.message : undefined}
            status={error instanceof ApiClientError ? error.status : undefined}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        )}

        {/* ── ĐANG TẢI LẦN ĐẦU: skeleton giữ bố cục bảng ── */}
        {isPending && !isError && <TableSkeleton rows={6} columns={6} />}

        {!isPending && !isError && (
        <>
        <div className={`divide-y divide-slate-100 md:hidden ${isFetching ? "opacity-60" : ""}`} aria-busy={isFetching}>
          {users.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Users}
                title={hasActiveFilters ? "Không có tài khoản khớp bộ lọc" : "Chưa có tài khoản"}
                description={hasActiveFilters
                  ? "Thử đổi từ khóa tìm kiếm, vai trò hoặc trạng thái khác."
                  : "Tài khoản được tạo trong hệ thống sẽ xuất hiện tại đây."}
                action={hasActiveFilters ? { label: "Xóa bộ lọc", onClick: clearFilters } : undefined}
              />
            </div>
          ) : users.map((user) => {
            const RoleIcon = user.role === "admin" ? Shield : user.role === "lecturer" ? UserCheck : GraduationCap;
            return (
              <article key={user.id} className="space-y-3 border-b border-slate-100 py-4 last:border-b-0 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900">{user.fullName}</h3>
                    <p className="mt-0.5 break-all text-[11px] text-slate-500">{user.code} · {user.email}</p>
                  </div>
                  <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[user.status]}`}>
                    {STATUS_LABEL[user.status]}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-3 rounded-md bg-slate-50 p-3 text-xs">
                  <div>
                    <dt className="text-slate-500">Vai trò</dt>
                    <dd className="mt-1 inline-flex items-center gap-1 font-semibold text-slate-800">
                      <RoleIcon className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />{ROLE_LABEL[user.role]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Đơn vị</dt>
                    <dd className="mt-1 truncate font-medium text-slate-800">{user.departmentOrClass}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-500">Đăng nhập gần nhất</dt>
                    <dd className="mt-1 font-medium text-slate-800">{user.lastLogin}</dd>
                  </div>
                </dl>
                {user.mustChangePassword && (
                  <p className="text-[11px] font-semibold text-amber-700">Cần đổi mật khẩu lần đầu</p>
                )}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-[11px] text-slate-500">Thao tác tài khoản</span>
                  {renderUserActions(user)}
                </div>
              </article>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table
            className={`w-full text-left text-xs transition-opacity duration-150 ${isFetching ? "opacity-60" : ""}`}
            aria-busy={isFetching}
          >
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-2.5 pr-3">Người dùng</th>
                <th className="py-2.5 pr-3">Vai trò</th>
                <th className="py-2.5 pr-3">Đơn vị</th>
                <th className="py-2.5 pr-3">Đăng nhập gần nhất</th>
                <th className="py-2.5 pr-3">Trạng thái</th>
                <th className="py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => {
                const RoleIcon =
                  u.role === "admin"
                    ? Shield
                    : u.role === "lecturer"
                      ? UserCheck
                      : GraduationCap;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pr-3">
                      <div className="font-bold text-slate-900">{u.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {u.code} · {u.email}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                        <RoleIcon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-slate-600">
                      {u.departmentOrClass}
                    </td>
                    <td className="py-3 pr-3 text-slate-500">{u.lastLogin}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-bold ${STATUS_STYLE[u.status]}`}
                      >
                        {STATUS_LABEL[u.status]}
                      </span>
                      {u.mustChangePassword && (
                        <span className="ml-1.5 text-[10px] font-semibold text-amber-700">
                          Đổi MK lần đầu
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {renderUserActions(u)}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4">
                    <EmptyState
                      icon={Users}
                      title={hasActiveFilters ? "Không có tài khoản khớp bộ lọc" : "Chưa có tài khoản"}
                      description={hasActiveFilters
                        ? "Thử đổi từ khóa tìm kiếm, vai trò hoặc trạng thái khác."
                        : "Tài khoản được tạo trong hệ thống sẽ xuất hiện tại đây."}
                      action={hasActiveFilters ? { label: "Xóa bộ lọc", onClick: clearFilters } : undefined}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
        )}

        {!isPending && !isError && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Hiển thị {pagination.from}
              –{pagination.to} / {pagination.total} tài khoản
            </span>
            <label className="flex items-center gap-1.5">
              <span>Số dòng:</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="min-h-9 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-700 outline-none focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 cursor-pointer"
                aria-label="Số tài khoản mỗi trang"
              >
                {USERS_PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} dòng
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="inline-flex h-9 w-9 items-center justify-center border border-slate-200 rounded-md hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="min-w-16 text-center font-semibold text-slate-700">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="inline-flex h-9 w-9 items-center justify-center border border-slate-200 rounded-md hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Trang sau"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        )}
      </Panel>

      <ConfirmDialog
        open={Boolean(resetTarget)}
        title="Đặt lại mật khẩu"
        description={
          resetTarget ? (
            <>
              Tài khoản{" "}
              <strong className="text-slate-900">{resetTarget.fullName}</strong> (
              {resetTarget.code}) sẽ nhận mật khẩu tạm 8 ký tự ngẫu nhiên và bắt
              buộc đổi khi đăng nhập.
              {resetTarget.email !== "—" && (
                <span className="block mt-1 text-slate-500">
                  Mật khẩu sẽ gửi qua email nếu SMTP đã bật.
                </span>
              )}
            </>
          ) : null
        }
        confirmLabel="Đặt lại mật khẩu"
        variant="warning"
        loading={isResetting}
        onConfirm={() => void confirmReset()}
        onCancel={() => setResetTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa tài khoản"
        description={
          deleteTarget ? (
            <>
              Bạn có chắc chắn muốn xóa tài khoản{" "}
              <strong className="text-slate-900">{deleteTarget.fullName}</strong> (
              {deleteTarget.code})? Thao tác này không thể hoàn tác.
            </>
          ) : null
        }
        confirmLabel="Xóa tài khoản"
        variant="danger"
        loading={isDeleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onShowToast={onShowToast}
        onCreateUser={handleCreateUser}
        allowedRoles={allowedCreateRoles}
      />
    </div>
  );
};

export { UsersView as AdminUsersView };
