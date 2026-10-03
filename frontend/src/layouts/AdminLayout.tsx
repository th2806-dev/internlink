import { ReactNode, useEffect, useState } from "react";
import { Sidebar as AdminSidebar } from "../features/admin/components/Sidebar";
import { Header as AdminHeader } from "../features/admin/components/Header";
import { Toast } from "../components/common/Toast";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import { useAdminNavStats } from "../hooks/useAdminNavStats";
import { useSemester } from "../contexts/SemesterContext";

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
    <div className="min-h-screen bg-[var(--il-surface-bg)] text-slate-800 font-sans flex antialiased">
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
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AdminHeader
          activeTab={activeTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
          onShowToast={showToast}
          user={user}
          onMenuOpen={() => setIsSidebarOpen((open) => !open)}
          isMenuOpen={isSidebarOpen}
        />
        <Toast message={message} type={type} onClose={clearToast} />
        <main className="flex-1 p-4 md:p-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
