import { ReactNode, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Sidebar as StudentSidebar } from "../features/student/components/Sidebar";
import { Header as StudentHeader } from "../features/student/components/Header";
import { Toast } from "../components/common/Toast";
import { useToast } from "../hooks/useToast";
import {
  StudentPortalProvider,
  useStudentPortal,
} from "../contexts/StudentPortalContext";

import type { UserRole } from "../types/common";

function StudentArchiveAccess({ children }: { children: ReactNode }) {
  const { isArchiveReadOnly, isLoading, error, portalData, refresh } =
    useStudentPortal();
  const location = useLocation();

  if (
    isArchiveReadOnly
    && location.pathname !== "/student/evaluation"
    && location.pathname !== "/student/account"
  ) {
    return <Navigate to="/student/evaluation" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm font-medium text-slate-600">
        Đang tải cổng sinh viên…
      </div>
    );
  }

  if (error && !portalData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p role="alert" className="text-sm text-rose-700">
          Không thể xác định quyền truy cập cổng sinh viên. Vui lòng thử tải lại.
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="min-h-10 rounded-md bg-[#026aa7] px-4 text-sm font-semibold text-white hover:bg-[#025a8e]"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return children;
}

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
      <StudentArchiveAccess>
        <div className="h-dvh overflow-hidden bg-[var(--il-surface-bg)] text-slate-800 font-sans flex antialiased">
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
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto">
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
      </StudentArchiveAccess>
    </StudentPortalProvider>
  );
}
