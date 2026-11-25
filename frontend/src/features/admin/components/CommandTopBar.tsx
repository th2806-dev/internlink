import { useEffect, useRef, useState } from "react";
import {
  Building2,
  ChevronDown,
  Expand,
  Menu,
  Minimize,
  User,
  LogOut,
} from "lucide-react";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { NotificationDropdown } from "../../../components/common/NotificationDropdown";
import { useActiveTenant } from "../../../contexts/ActiveTenantContext";
import { useSemester } from "../../../contexts/SemesterContext";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { useSystemMenu } from "../../../hooks/useSystemMenu";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { findSystemMenuRoute, getSuperAdminMenuGroup } from "../../../lib/systemMenu";
import type { AuthUser } from "../../../contexts/AuthContext";
import { resolveAppAssetUrl, useAppBranding } from "../../../contexts/AppBrandingContext";

export function CommandTopBar({
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
  onShowToast: (message: string) => void;
  user?: AuthUser | null;
  onMenuOpen?: () => void;
  isMenuOpen?: boolean;
}) {
  const { branding } = useAppBranding();
  const { isSuperAdmin, roleDisplayLabel } = useAdminCapabilities();
  const {
    tenants,
    selectedTenant,
    selectedTenantId,
    selectTenant,
    isLoading: isTenantListLoading,
  } = useActiveTenant();
  const {
    semesters,
    selectedSemesterId,
    selectSemester,
    departments,
    selectedDepartmentId,
    selectDepartment,
  } = useSemester();
  const { data: menu = [] } = useSystemMenu();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.name || user?.username || roleDisplayLabel;
  const displayEmail = user?.email ?? user?.username ?? "—";
  const activePath = activeTab.startsWith("admin-")
    ? `/admin/${activeTab.slice("admin-".length)}`
    : `/admin/${activeTab || "dashboard"}`;
  const activeRoute = findSystemMenuRoute(menu, activePath);
  const pageTitle =
    activeRoute?.item.name ??
    (activePath === "/admin/account" ? "Hồ sơ tài khoản" : "Phân hệ quản trị");
  const topBarTitle = isSuperAdmin && activeRoute
    ? activePath === "/admin/dashboard"
      ? "Tổng Quan"
      : getSuperAdminMenuGroup(activeRoute.item)
    : pageTitle;
  const isTenantScopedModule = ["LICENSES", "SSO_HUB", "API_GATEWAY"].includes(
    activeRoute?.item.moduleCode ?? "",
  );
  const isOperationalModule = activeRoute?.groupName
    ?.toLocaleUpperCase("vi-VN")
    .startsWith("GIAI ĐOẠN") ?? false;

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    const startedAt = performance.now();
    const frame = window.requestAnimationFrame(() => {
      setRenderTime(performance.now() - startedAt);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab]);

  useEffect(() => {
    if (!showProfileMenu) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node))
        setShowProfileMenu(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowProfileMenu(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showProfileMenu]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else onShowToast("Trình duyệt này không hỗ trợ chế độ toàn màn hình.");
    } catch (error) {
      onShowToast(`Không thể đổi chế độ toàn màn hình. ${getApiErrorMessage(error)}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-9 w-full items-center justify-between gap-2 bg-[#0f172a] px-2.5 text-white sm:px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          aria-label={isMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
          aria-expanded={isMenuOpen}
          aria-controls="admin-navigation"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7bc043] lg:hidden"
          onClick={onMenuOpen}
        >
          <Menu aria-hidden="true" className="h-4 w-4" />
        </button>
        <img
          src={resolveAppAssetUrl(branding.appFaviconUrl || branding.appLogoUrl)}
          alt={branding.appName}
          className="h-5 w-5 shrink-0 object-contain"
        />
        <span aria-hidden="true" className="h-5 border-l border-white/25" />
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-white">{topBarTitle}</span>
        </div>
      </div>

      <div className="hidden min-w-0 shrink-0 items-center gap-1.5 sm:flex">
        {isSuperAdmin && isOperationalModule ? null : isSuperAdmin && isTenantScopedModule ? (
          <label className="flex h-7 max-w-64 min-w-0 items-center gap-1.5 rounded-[4px] border border-white/10 bg-white/10 px-2 text-[10px] text-slate-200">
            <Building2 aria-hidden="true" className="h-3 w-3 shrink-0 text-[#7bc043]" />
            <span className="shrink-0 text-slate-400">Đang cấu hình:</span>
            <select
              aria-label="Đổi đơn vị đang cấu hình"
              value={selectedTenantId}
              onChange={(event) => selectTenant(event.target.value)}
              disabled={isTenantListLoading || tenants.length === 0}
              className="h-full min-w-0 max-w-40 flex-1 cursor-pointer truncate bg-transparent text-[10px] font-semibold text-white outline-none [&>option]:text-slate-900 disabled:cursor-wait"
              title={selectedTenant ? `${selectedTenant.name} (${selectedTenant.tenantCode})` : undefined}
            >
              {!selectedTenant && (
                <option value="">
                  {isTenantListLoading ? "Đang tải đơn vị..." : "Chọn đơn vị"}
                </option>
              )}
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.tenantCode})
                </option>
              ))}
            </select>
          </label>
        ) : isSuperAdmin ? (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-[4px] border border-slate-700 bg-slate-800 px-2 text-[10px] font-semibold tracking-wide text-slate-300">
            <Building2 aria-hidden="true" className="h-3 w-3 text-[#7bc043]" />
            QUẢN TRỊ NỀN TẢNG TOÀN SÀN
          </span>
        ) : (
          <label className="flex h-7 max-w-48 items-center gap-1.5 rounded-[4px] border border-white/10 bg-white/10 px-2 text-[10px] text-slate-200">
            <span className="sr-only">Kỳ thực tập</span>
            <select
              aria-label="Chọn kỳ thực tập"
              value={selectedSemesterId || "all"}
              onChange={(event) => selectSemester(event.target.value)}
              className="h-full min-w-0 max-w-40 cursor-pointer bg-transparent text-[10px] font-medium text-white outline-none [&>option]:text-slate-900"
            >
              <option value="all">Tất cả kỳ</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {isSuperAdmin && isOperationalModule && (
          <>
            <label className="flex h-7 max-w-48 items-center gap-1.5 rounded-[4px] border border-white/10 bg-white/10 px-2 text-[10px] text-slate-200">
              <span className="sr-only">Kỳ thực tập</span>
              <select
                aria-label="Chọn kỳ thực tập"
                value={selectedSemesterId || "all"}
                onChange={(event) => selectSemester(event.target.value)}
                className="h-full min-w-0 max-w-40 cursor-pointer bg-transparent text-[10px] font-medium text-white outline-none [&>option]:text-slate-900"
              >
                <option value="all">Tất cả kỳ</option>
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>{semester.name}</option>
                ))}
              </select>
            </label>
            {departments.length > 0 && (
              <label className="flex h-7 max-w-40 items-center gap-1 rounded-[4px] border border-white/10 bg-white/10 px-2 text-[10px] text-slate-200">
                <Building2 aria-hidden="true" className="h-3 w-3 shrink-0 text-[#7bc043]" />
                <span className="sr-only">Khoa</span>
                <select
                  aria-label="Chọn khoa"
                  value={selectedDepartmentId || "all"}
                  onChange={(event) => selectDepartment(event.target.value)}
                  className="h-full min-w-0 flex-1 cursor-pointer bg-transparent text-[10px] font-medium text-white outline-none [&>option]:text-slate-900"
                >
                  <option value="all">Tất cả khoa</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span
          className="hidden min-w-12 text-right font-mono text-[9px] tabular-nums text-slate-400 xl:inline"
          title="Thời gian hiển thị giao diện sau khi đổi màn hình"
          aria-label={`Thời gian hiển thị giao diện: ${renderTime === null ? "đang đo" : `${(renderTime / 1000).toFixed(2)} giây`}`}
        >
          {renderTime === null ? "—" : `${(renderTime / 1000).toFixed(2)}s`}
        </span>
        <button
          type="button"
          aria-label={isFullscreen ? "Thoát toàn màn hình" : "Bật toàn màn hình"}
          aria-pressed={isFullscreen}
          onClick={() => void toggleFullscreen()}
          className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7bc043]"
        >
          {isFullscreen ? (
            <Minimize aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <Expand aria-hidden="true" className="h-3.5 w-3.5" />
          )}
        </button>
        <NotificationDropdown
          role="admin"
          backendRole={user?.backendRole}
          onNavigate={onNavigate}
          onShowToast={onShowToast}
        />

        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu((open) => !open)}
            className="inline-flex h-8 max-w-44 items-center gap-1.5 rounded-[4px] px-1 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7bc043]"
            title="Tài khoản"
            aria-label="Mở menu tài khoản"
            aria-expanded={showProfileMenu}
            aria-controls="admin-profile-menu"
          >
            <InitialsAvatar
              name={displayName}
              seed={user?.id || user?.email || displayName}
              size={25}
            />
            <span className="hidden min-w-0 text-left lg:block">
              <span className="block truncate text-[10px] font-semibold leading-3 text-white">
                {displayName}
              </span>
              <span className="block truncate text-[9px] leading-3 text-slate-400">
                {roleDisplayLabel}
              </span>
            </span>
            <ChevronDown aria-hidden="true" className="h-3 w-3 shrink-0 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div
              id="admin-profile-menu"
              className="absolute right-0 mt-1.5 w-72 overflow-hidden rounded-md border border-slate-200 bg-white text-slate-800 shadow-lg"
            >
              <div className="flex items-center gap-2 border-b border-[#025a8e] bg-[#026aa7] px-3 py-2.5 text-white">
                <InitialsAvatar
                  name={displayName}
                  seed={user?.id || user?.email || displayName}
                  size={30}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold leading-4">{displayName}</p>
                  <p className="truncate text-[10px] leading-3.5 text-white/85">
                    {displayEmail}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  onNavigate("admin-account");
                }}
                className="mt-1 flex min-h-9 w-full items-center justify-between rounded-[4px] px-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
              >
                Hồ sơ tài khoản
                <User aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="mt-1 flex min-h-9 w-full items-center gap-2 rounded-[4px] border-t border-slate-100 px-3 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
                  Đăng xuất
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
