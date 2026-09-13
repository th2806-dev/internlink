import { ReactNode } from "react";
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
  const { stats, recentNotifications } = useAdminNavStats(true, selectedSemesterId, selectedDepartmentId);

  return (
    <div className="min-h-screen bg-[var(--il-surface-bg)] text-slate-800 font-sans flex antialiased">
      <AdminSidebar
        activeTab={activeTab}
        onNavigate={onNavigate}
        stats={stats}
        user={user}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AdminHeader
          activeTab={activeTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
          onShowToast={showToast}
          user={user}
          stats={stats}
          recentNotifications={recentNotifications}
        />
        <Toast message={message} type={type} onClose={clearToast} />
        <main className="flex-1 p-4 md:p-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
