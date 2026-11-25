import { X } from "lucide-react";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import type { AuthUser } from "../../../contexts/AuthContext";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { useSystemMenu } from "../../../hooks/useSystemMenu";
import type { AdminNavStats } from "../../../hooks/useAdminNavStats";
import { formatCountBadge } from "../../../lib/userDisplay";
import {
  getSuperAdminMenuGroup,
  getSystemMenuItemId,
  getSystemMenuRoutes,
  sortSuperAdminRoutes,
} from "../../../lib/systemMenu";
import { getMenuIcon } from "../../../lib/menuIconRegistry";
import { resolveAppAssetUrl, useAppBranding } from "../../../contexts/AppBrandingContext";

export const Sidebar = ({
  activeTab,
  onNavigate,
  stats,
  user,
  isOpen = false,
  onClose,
}: {
  activeTab: string;
  onNavigate: (id: string) => void;
  stats?: AdminNavStats;
  user?: AuthUser | null;
  isOpen?: boolean;
  onClose?: () => void;
}) => {
  const { branding } = useAppBranding();
  const { isSuperAdmin, roleDisplayLabel } = useAdminCapabilities();
  const menuQuery = useSystemMenu();
  const routes = sortSuperAdminRoutes(getSystemMenuRoutes(menuQuery.data ?? []).map((route) => ({
    ...route,
    groupName: isSuperAdmin ? getSuperAdminMenuGroup(route.item) : route.groupName,
  })));
  const sections = routes.reduce<{ title: string; items: typeof routes }[]>(
    (groups, route) => {
      const section = groups.find((group) => group.title === route.groupName);
      if (section) section.items.push(route);
      else groups.push({ title: route.groupName, items: [route] });
      return groups;
    },
    [],
  );
  const displayName = user?.name || user?.username || roleDisplayLabel;
  const displayRole = roleDisplayLabel;

  const getBadge = (moduleCode: string, databaseBadge: string | null) => {
    if (databaseBadge) return { text: databaseBadge, alert: false };
    if (moduleCode === "STUDENTS" && stats?.studentCount)
      return { text: formatCountBadge(stats.studentCount), alert: false };
    if (moduleCode === "LECTURER" && stats?.lecturerCount)
      return { text: formatCountBadge(stats.lecturerCount), alert: false };
    if (moduleCode === "ASSIGNMENTS" && stats?.unassignedCount)
      return { text: `${stats.unassignedCount} chưa PC`, alert: true };
    if (moduleCode === "NOTIFICATIONS" && stats?.unreadNotificationCount)
      return { text: String(stats.unreadNotificationCount), alert: true };
    if (moduleCode === "NOTIFICATIONS" && stats?.notificationCampaignCount)
      return { text: String(stats.notificationCampaignCount), alert: false };
    return null;
  };

  return (
    <aside
      id="admin-navigation"
      aria-label="Điều hướng quản trị"
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={`admin-sidebar-drawer fixed inset-y-0 left-0 z-50 flex h-dvh w-64 shrink-0 select-none flex-col justify-between border-r border-slate-200/90 bg-white transition-transform duration-200 lg:hidden ${
        isOpen ? "is-open" : ""
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/90 bg-gradient-to-b from-blue-50/40 to-white p-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-lg border border-[#026aa7]/20 bg-[#026aa7]/10 p-1.5">
              <img
                src={resolveAppAssetUrl(branding.appLogoUrl)}
                alt={branding.appName}
                className="h-7 w-7 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center text-lg font-bold leading-none tracking-tight">
                <span className="text-slate-900">{branding.appShortName}</span>
              </div>
              <p className="mt-1 inline-block rounded bg-[#026aa7]/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#026aa7]">
                {user?.backendRole === "SuperAdmin" ? "QUẢN TRỊ HỆ THỐNG" : "QUẢN TRỊ KHOA"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="cursor-pointer p-1 text-slate-400 hover:text-slate-600 lg:hidden"
            onClick={onClose}
            aria-label="Đóng menu điều hướng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav
          className="il-scrollbar max-h-[calc(100dvh-155px)] space-y-2.5 overflow-y-auto p-3"
          aria-label="Điều hướng quản trị"
        >
          {menuQuery.isPending && (
            <p role="status" className="px-3 py-4 text-xs text-slate-500">
              Đang tải phân hệ được cấp quyền...
            </p>
          )}
          {menuQuery.isError && (
            <p role="alert" className="px-3 py-4 text-xs text-rose-700">
              Không thể tải menu từ hệ thống phân quyền.
            </p>
          )}
          {!menuQuery.isPending && !menuQuery.isError && sections.length === 0 && (
            <p className="px-3 py-4 text-xs text-slate-500">
              Vai trò hiện chưa được cấp quyền xem phân hệ nào.
            </p>
          )}
          {sections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              <p className="px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              {section.items.map(({ item }) => {
                const id = getSystemMenuItemId(item);
                const normalizedActive = activeTab.startsWith("admin-")
                  ? activeTab
                  : `admin-${activeTab}`;
                const isActive = normalizedActive === id;
                const Icon = getMenuIcon(item.iconName);
                const badge = getBadge(item.moduleCode, item.badgeText);
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => onNavigate(id)}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                      isActive
                        ? "bg-[#026aa7] font-semibold text-white shadow-2xs"
                        : "font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon
                        aria-hidden="true"
                        className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`}
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    {badge && (
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                          badge.alert
                            ? "bg-rose-500 text-white"
                            : isActive
                              ? "bg-white/20 text-white"
                              : "border border-blue-200/80 bg-blue-50 text-[#026aa7]"
                        }`}
                      >
                        {badge.text}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-slate-200/90 bg-slate-50/70 p-3">
        <button
          type="button"
          onClick={() => onNavigate("admin-account")}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2 text-left shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50"
          aria-label={`Mở tài khoản ${displayName}`}
        >
          <InitialsAvatar
            name={displayName}
            seed={user?.id || user?.email || displayName}
            size={34}
          />
          <span className="min-w-0 flex-1 overflow-hidden">
            <span className="block truncate text-xs font-bold text-slate-900">{displayName}</span>
            <span className="block truncate text-[10.5px] font-medium text-slate-500">{displayRole}</span>
          </span>
        </button>
      </div>
    </aside>
  );
};

export { Sidebar as AdminSidebar };
