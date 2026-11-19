import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronDown,
  Expand,
  Eye,
  Menu,
  Minimize,
  User,
} from "lucide-react";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { NotificationDropdown } from "../../../components/common/NotificationDropdown";
import { useSemester } from "../../../contexts/SemesterContext";
import { useImpersonation } from "../../../contexts/ImpersonationContext";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { useSystemMenu } from "../../../hooks/useSystemMenu";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { findSystemMenuRoute } from "../../../lib/systemMenu";
import { systemAdminService } from "../../../services/systemAdmin.service";
import type { AuthUser } from "../../../contexts/AuthContext";

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
  const { isSuperAdmin, roleDisplayLabel } = useAdminCapabilities();
  const {
    semesters,
    selectedSemesterId,
    selectSemester,
    departments,
    selectedDepartmentId,
    selectDepartment,
  } = useSemester();
  const { impersonation, startImpersonation } = useImpersonation();
  const { data: menu = [] } = useSystemMenu();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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
  const activeRoute = findSystemMenuRoute(menu, activePath);
  const pageTitle =
    activeRoute?.item.name ??
    (activePath === "/admin/account" ? "Hồ sơ tài khoản" : "Phân hệ quản trị");

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
    <header className="sticky top-0 z-40 flex h-[38px] w-full items-center justify-between gap-2 bg-[#0f172a] px-2.5 text-white sm:px-3">
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
          src="/logo/logo_internlink-02.png"
          alt="InternLink"
          className="h-5 w-5 shrink-0 object-contain"
        />
        <span aria-hidden="true" className="h-5 border-l border-white/25" />
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-white">{pageTitle}</span>
          {activeRoute && (
            <span className="hidden shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-slate-300 sm:inline">
              {activeRoute.item.code}
            </span>
          )}
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        <label className="flex h-7 max-w-48 items-center gap-1.5 rounded-md border border-white/10 bg-white/10 px-2 text-[10px] text-slate-200">
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
        {isSuperAdmin && departments.length > 0 && (
          <label className="flex h-7 max-w-40 items-center gap-1 rounded-md border border-white/10 bg-white/10 px-2 text-[10px] text-slate-200">
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
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
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
            className="inline-flex h-8 max-w-44 items-center gap-1.5 rounded-full px-1 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7bc043]"
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
              className="absolute right-0 mt-1.5 w-72 rounded-lg border border-slate-200 bg-white p-2.5 text-slate-800 shadow-xl"
            >
              <div className="border-b border-slate-100 px-2 pb-2">
                <p className="truncate text-xs font-bold">{displayName}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-[#026aa7]">
                  {roleDisplayLabel}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500">{displayEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  onNavigate("admin-account");
                }}
                className="mt-1 flex min-h-9 w-full items-center justify-between rounded px-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
              >
                Hồ sơ tài khoản
                <User aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {isSuperAdmin && (
                <div className="mt-1 border-t border-slate-100 pt-1.5">
                  <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <Eye aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
                    Mô phỏng góc nhìn
                  </p>
                  {impersonation && (
                    <p className="px-2 pb-1 text-[10px] text-[#026aa7]">
                      Đang xem: {impersonation.roleName}
                    </p>
                  )}
                  {impersonationTargetsQuery.isPending ? (
                    <p role="status" className="px-2 py-2 text-xs text-slate-500">
                      Đang tải vai trò...
                    </p>
                  ) : impersonationTargetsQuery.isError ? (
                    <p role="alert" className="px-2 py-2 text-xs text-rose-700">
                      Không tải được danh sách vai trò.{" "}
                      {getApiErrorMessage(impersonationTargetsQuery.error)}
                    </p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto">
                      {impersonationTargetsQuery.data?.map((target) => (
                        <button
                          key={target.roleId}
                          type="button"
                          disabled={impersonationMutation.isPending}
                          onClick={() => impersonationMutation.mutate(target.roleCode)}
                          className="flex min-h-9 w-full items-center rounded px-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-[#026aa7]/5 hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {target.roleName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="mt-1 min-h-9 w-full border-t border-slate-100 px-2 pt-1.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
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
