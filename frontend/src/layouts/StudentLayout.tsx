import { ReactNode, useState } from "react";
import { Sidebar as StudentSidebar } from "../features/student/components/Sidebar";
import { Header as StudentHeader } from "../features/student/components/Header";
import { Toast } from "../components/common/Toast";
import { useToast } from "../hooks/useToast";
import { StudentPortalProvider } from "../contexts/StudentPortalContext";

import type { UserRole } from "../types/common";

interface StudentLayoutProps {
  children: ReactNode;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onSwitchPortal: (role: UserRole) => void;
  onLogout: () => void;
}

export default function StudentLayout({
  children,
  activeTab,
  onNavigate,
  onSwitchPortal,
  onLogout,
}: StudentLayoutProps) {
  const { message, type, clearToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <StudentPortalProvider>
      <div className="min-h-screen bg-[var(--il-surface-bg)] text-slate-800 font-sans flex antialiased">
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Đóng menu điều hướng"
            className="fixed inset-0 z-40 bg-slate-950/25 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <StudentSidebar
          activeTab={activeTab}
          onNavigate={(tab) => {
            onNavigate(tab);
            setIsSidebarOpen(false);
          }}
          onSwitchPortal={onSwitchPortal}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <StudentHeader
            activeTab={activeTab}
            onNavigate={onNavigate}
            onSwitchPortal={onSwitchPortal}
            onLogout={onLogout}
            onMenuOpen={() => setIsSidebarOpen(true)}
            isMenuOpen={isSidebarOpen}
          />
          <Toast message={message} type={type} onClose={clearToast} />
          <main className="min-w-0 p-3 sm:p-4 lg:p-6 space-y-4 max-w-[1440px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </StudentPortalProvider>
  );
}
