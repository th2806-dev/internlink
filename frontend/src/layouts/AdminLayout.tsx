import { ReactNode, useEffect, useState } from "react";
import { Sidebar as AdminSidebar } from "../features/admin/components/Sidebar";
import { CommandTopBar } from "../features/admin/components/CommandTopBar";
import { RibbonMenu } from "../features/admin/components/RibbonMenu";
import { Toast } from "../components/common/Toast";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import { useAdminNavStats } from "../hooks/useAdminNavStats";
import { useSemester } from "../contexts/SemesterContext";
import { SuperAdminImpersonationBanner } from "../features/admin/components/SuperAdminImpersonationBanner";
import { AdminMenuRouteGuard } from "../features/admin/components/AdminMenuRouteGuard";
import { ActiveTenantProvider } from "../contexts/ActiveTenantContext";
import { PlatformAnnouncementBanner } from "../features/admin/components/PlatformAnnouncementBanner";

import type { UserRole } from "../types/common";

interface AdminLayoutProps {
  children: ReactNode;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onSwitchPortal: (role: UserRole) => void;
  onLogout: () => void;
}

export default function AdminLayout({
  children,
  activeTab,
  onNavigate,
  onSwitchPortal: _onSwitchPortal,
  onLogout,
}: AdminLayoutProps) {
  const { message, type, clearToast, showToast } = useToast();
  const { user } = useAuth();
  const { selectedSemesterId, selectedDepartmentId } = useSemester();
  const { stats } = useAdminNavStats(true, selectedSemesterId, selectedDepartmentId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSidebarOpen]);

  return (
    <ActiveTenantProvider>
    <div className="flex h-dvh w-full overflow-hidden bg-[var(--il-surface-bg)] font-sans text-slate-800 antialiased">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Đóng menu điều hướng"
          className="fixed inset-0 z-40 bg-slate-950/25 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <AdminSidebar
        activeTab={activeTab}
        onNavigate={(tab) => {
          onNavigate(tab);
          setIsSidebarOpen(false);
        }}
        stats={stats}
        user={user}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <SuperAdminImpersonationBanner />
        <CommandTopBar
          activeTab={activeTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
          onShowToast={showToast}
          user={user}
          onMenuOpen={() => setIsSidebarOpen((open) => !open)}
          isMenuOpen={isSidebarOpen}
        />
        <PlatformAnnouncementBanner />
        <RibbonMenu onNavigate={onNavigate} />
        <Toast message={message} type={type} onClose={clearToast} />
        <main className="admin-main-scroll min-h-0 w-full flex-1 overflow-y-auto px-3 py-3 sm:px-5">
          <AdminMenuRouteGuard>{children}</AdminMenuRouteGuard>
        </main>
      </div>
    </div>
    </ActiveTenantProvider>
  );
}
