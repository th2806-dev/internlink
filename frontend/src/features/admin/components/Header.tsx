import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, Eye, Menu, User } from "lucide-react";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { NotificationDropdown } from "../../../components/common/NotificationDropdown";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { useSystemMenu } from "../../../hooks/useSystemMenu";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { useImpersonation } from "../../../contexts/ImpersonationContext";
import { systemAdminService } from "../../../services/systemAdmin.service";
import { findSystemMenuRoute } from "../../../lib/systemMenu";
import type { AuthUser } from "../../../contexts/AuthContext";

export const Header = ({
  activeTab,
  onNavigate,
  onLogout,
  onShowToast,
  user,
  onMenuOpen,
  isMenuOpen = false,
}: {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout?: () => void;
  onShowToast: (msg: string) => void;
  user?: AuthUser | null;
  onMenuOpen?: () => void;
  isMenuOpen?: boolean;
}) => {
  const { isSuperAdmin, roleDisplayLabel } = useAdminCapabilities();
  const { impersonation, startImpersonation } = useImpersonation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuQuery = useSystemMenu();
  const impersonationTargetsQuery = useQuery({
    queryKey: ["system-admin", "impersonation-targets"],
    queryFn: systemAdminService.getImpersonationTargets,
    enabled: isSuperAdmin,
    retry: false,
  });
  const impersonationMutation = useMutation({
    mutationFn: startImpersonation,
    onSuccess: () => {
      setShowProfileMenu(false);
      onShowToast("Đã bật chế độ xem trước vai trò.");
    },
    onError: (error) =>
      onShowToast(`Không thể bật chế độ mô phỏng. ${getApiErrorMessage(error)}`),
  });

  const displayName = user?.name || user?.username || roleDisplayLabel;
  const displayEmail = user?.email ?? user?.username ?? "—";
  const activePath = activeTab.startsWith("admin-")
    ? `/admin/${activeTab.slice("admin-".length)}`
    : `/admin/${activeTab || "dashboard"}`;
  const activeRoute = findSystemMenuRoute(menuQuery.data ?? [], activePath);
  const pageTitle = activeRoute?.item.name
    ?? (activePath === "/admin/account" ? "Hồ sơ tài khoản" : "Phân hệ quản trị");

  return (
    <header className="sticky top-0 z-30 flex h-12 w-full shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 bg-white px-3.5 sm:px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          aria-label={isMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
          aria-expanded={isMenuOpen}
          aria-controls="admin-navigation"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] lg:hidden"
          onClick={onMenuOpen}
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
        <nav aria-label="Điều hướng" className="flex min-w-0 items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => onNavigate("admin-dashboard")}
            className="hidden whitespace-nowrap font-medium text-slate-500 transition-colors hover:text-[#026aa7] sm:inline"
          >
            Cổng Quản trị
          </button>
          {activeRoute?.groupName && (
            <>
              <span aria-hidden="true" className="hidden text-slate-300 sm:inline">›</span>
              <span className="hidden truncate text-slate-500 md:inline">
                {activeRoute.groupName}
              </span>
            </>
          )}
          <span aria-hidden="true" className="hidden text-slate-300 sm:inline">›</span>
          <span className="truncate font-semibold text-slate-900">
            {pageTitle}
          </span>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <NotificationDropdown
          role="admin"
          backendRole={user?.backendRole}
          onNavigate={onNavigate}
          onShowToast={onShowToast}
        />
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu((open) => !open)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full p-0.5 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
            title="Tài khoản"
            aria-label="Mở menu tài khoản"
            aria-expanded={showProfileMenu}
            aria-controls="admin-profile-menu"
          >
            <InitialsAvatar
              name={displayName}
              seed={user?.id || user?.email || displayName}
              size={32}
            />
            <ChevronDown aria-hidden="true" className="mr-1 h-3.5 w-3.5 text-slate-500" />
          </button>

          {showProfileMenu && (
            <div
              id="admin-profile-menu"
              className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
            >
              <div className="border-b border-slate-100 pb-2.5">
                <p className="truncate text-xs font-bold text-slate-900">{displayName}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-[#026aa7]">
                  {roleDisplayLabel}
                </p>
                <p className="mt-1 truncate text-[10px] text-slate-500">{displayEmail}</p>
              </div>

              <div className="space-y-0.5 pt-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigate("admin-account");
                  }}
                  className="flex min-h-10 w-full items-center justify-between rounded-lg px-2.5 text-left font-medium text-slate-700 transition-colors hover:bg-[#026aa7]/5 hover:text-[#026aa7]"
                >
                  <span>Hồ sơ tài khoản</span>
                  <User aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {isSuperAdmin && (
                  <>
                    <div className="mt-1 border-t border-slate-100 pt-2">
                      <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        <Eye aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
                        Mô phỏng góc nhìn
                      </p>
                      {impersonation && (
                        <p className="px-2.5 pb-1 text-[11px] text-[#026aa7]">
                          Đang xem: {impersonation.roleName}
                        </p>
                      )}
                      {impersonationTargetsQuery.isPending ? (
                        <p role="status" className="px-2.5 py-2 text-xs text-slate-500">
                          Đang tải vai trò...
                        </p>
                      ) : impersonationTargetsQuery.isError ? (
                        <p role="alert" className="px-2.5 py-2 text-xs text-rose-700">
                          Không tải được danh sách vai trò.{" "}
                          {getApiErrorMessage(impersonationTargetsQuery.error)}
                        </p>
                      ) : (
                        <div className="max-h-44 overflow-y-auto">
                          {impersonationTargetsQuery.data?.map((target) => (
                            <button
                              key={target.roleId}
                              type="button"
                              disabled={impersonationMutation.isPending}
                              onClick={() => impersonationMutation.mutate(target.roleCode)}
                              className="flex min-h-10 w-full items-center rounded-lg px-2.5 text-left font-medium text-slate-700 transition-colors hover:bg-[#026aa7]/5 hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:opacity-50"
                            >
                              {target.roleName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="mt-1 min-h-10 w-full rounded-lg border-t border-slate-100 px-2.5 pt-2 text-left font-bold text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    Đăng xuất
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export { Header as AdminHeader };
