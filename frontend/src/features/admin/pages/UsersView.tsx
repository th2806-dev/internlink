import { useMemo, useState } from "react";
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
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { Panel } from "../../../components/common/Panel";
import { Toolbar } from "../../../components/common/Toolbar";
import type { AdminUser, AdminUserRole, AdminUserStatus } from "../../../types/user";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { useAdminUsers } from "../../../hooks/useAdminUsers";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import {
  CreateUserModal,
  type CreateUserFormPayload,
  type CreateUserRole,
} from "../components/modals/CreateUserModal";

const ROLE_LABEL: Record<AdminUserRole, string> = {
  admin: "Admin",
  lecturer: "Giảng viên",
  student: "Sinh viên",
};

const STATUS_STYLE: Record<AdminUserStatus, string> = {
  active: "bg-emerald-50 text-emerald-800 border-emerald-200",
  locked: "bg-rose-50 text-rose-800 border-rose-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
};

const STATUS_LABEL: Record<AdminUserStatus, string> = {
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
  const {
    users,
    loading: isLoadingApi,
    refetch,
    createUser,
    toggleLock: toggleUserLock,
    resetPassword: resetUserPassword,
    deleteUser: removeUser,
  } = useAdminUsers();
  const { isSuperAdmin, isDepartmentAdmin } = useAdminCapabilities();

  const allowedCreateRoles: CreateUserRole[] = isSuperAdmin
    ? ["DepartmentAdmin"]
    : ["Student", "Lecturer"];
  const canCreateUser = isSuperAdmin || isDepartmentAdmin;
  const canMutateUser = (u: AdminUser) =>
    isSuperAdmin ? u.role === "admin" : u.role === "student" || u.role === "lecturer";

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AdminUserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminUserStatus>(
    "all",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await removeUser(deleteTarget.id);
      onShowToast(`Đã xóa tài khoản ${deleteTarget.fullName} khỏi hệ thống.`);
      setDeleteTarget(null);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchQ =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      return matchQ && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const counts = useMemo(
    () => ({
      total: users.length,
      locked: users.filter((u) => u.status === "locked").length,
      pending: users.filter((u) => u.status === "pending").length,
    }),
    [users],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (visiblePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, visiblePage]);

  const updateSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const updateRoleFilter = (value: "all" | AdminUserRole) => {
    setRoleFilter(value);
    setCurrentPage(1);
  };

  const updateStatusFilter = (value: "all" | AdminUserStatus) => {
    setStatusFilter(value);
    setCurrentPage(1);
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
    setIsResetting(true);
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
    } finally {
      setIsResetting(false);
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

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      <PageHeader
        icon={Users}
        title="Người dùng"
        subtitle="Tài khoản hệ thống — danh sách, khóa/mở, đặt lại mật khẩu"
        actions={
          canCreateUser
            ? [
                {
                  label: "Tạo tài khoản",
                  icon: UserPlus,
                  onClick: () => setIsCreateOpen(true),
                  variant: "primary" as const,
                },
              ]
            : []
        }
      />

      {isSuperAdmin && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Phân quyền quản lý tài khoản:</strong> Quản trị hệ thống chỉ tạo và quản lý tài khoản Quản trị khoa. Tài khoản Sinh viên và Giảng viên do Quản trị khoa trực tiếp phụ trách.
          </span>
        </div>
      )}

      <Toolbar
        left={
          <p className="text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800">{counts.total}</span>{" "}
            tài khoản ·{" "}
            <span className="font-bold text-amber-700">{counts.pending}</span>{" "}
            chờ kích hoạt ·{" "}
            <span className="font-bold text-rose-700">{counts.locked}</span>{" "}
            đang khóa
          </p>
        }
      />

      <Panel className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Danh sách tài khoản ({filtered.length})
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Gộp quản lý Admin / Giảng viên / Sinh viên
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => updateSearch(e.target.value)}
                placeholder="Tìm mã, tên, email…"
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:border-blue-500 outline-none w-52"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => updateRoleFilter(e.target.value as "all" | AdminUserRole)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 font-medium outline-none cursor-pointer"
            >
              <option value="all">Mọi vai trò</option>
              <option value="admin">Admin</option>
              <option value="lecturer">Giảng viên</option>
              <option value="student">Sinh viên</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => updateStatusFilter(e.target.value as "all" | AdminUserStatus)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 font-medium outline-none cursor-pointer"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="pending">Chờ kích hoạt</option>
              <option value="locked">Đã khóa</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="py-2.5 pr-3">Người dùng</th>
                <th className="py-2.5 pr-3">Vai trò</th>
                <th className="py-2.5 pr-3">Đơn vị</th>
                <th className="py-2.5 pr-3">Đăng nhập gần nhất</th>
                <th className="py-2.5 pr-3">Trạng thái</th>
                <th className="py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedUsers.map((u) => {
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
                        <RoleIcon className="w-3.5 h-3.5 text-slate-400" />
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
                      {canMutateUser(u) ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setResetTarget(u)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-amber-50 hover:text-amber-700 cursor-pointer"
                            title="Đặt lại mật khẩu"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleLock(u)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                            title={u.status === "locked" ? "Mở khóa" : "Khóa"}
                          >
                            {u.status === "locked" ? (
                              <Unlock className="w-3.5 h-3.5" />
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Chỉ xem</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-slate-400 font-medium"
                  >
                    Không có tài khoản khớp bộ lọc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Hiển thị {filtered.length === 0 ? 0 : (visiblePage - 1) * pageSize + 1}
              –{Math.min(visiblePage * pageSize, filtered.length)} / {filtered.length} tài khoản
            </span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded-md bg-white font-medium text-slate-700 outline-none"
              aria-label="Số tài khoản mỗi trang"
            >
              <option value={10}>10 / trang</option>
              <option value={25}>25 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={visiblePage === 1}
              className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="min-w-16 text-center font-semibold text-slate-700">
              {visiblePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={visiblePage === totalPages}
              className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
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
