import { ReactNode, useEffect, useState } from "react";
import { Sidebar as LecturerSidebar } from "../features/lecturer/components/Sidebar";
import { Header as LecturerHeader } from "../features/lecturer/components/Header";
import { Toast } from "../components/common/Toast";
import { useToast } from "../hooks/useToast";

interface LecturerLayoutProps {
  children: ReactNode;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  currentLecturer: string;
  assignedStudentsCount: number;
}

export default function LecturerLayout({
  children,
  activeTab,
  onNavigate,
  onLogout,
  currentLecturer,
  assignedStudentsCount,
}: LecturerLayoutProps) {
  const { message, type, clearToast } = useToast();
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
      <LecturerSidebar
        activeTab={activeTab}
        onNavigate={(tab) => {
          onNavigate(tab);
          setIsSidebarOpen(false);
        }}
        currentLecturer={currentLecturer}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <LecturerHeader
          activeTab={activeTab}
          onNavigate={onNavigate}
          currentLecturer={currentLecturer}
          assignedStudentsCount={assignedStudentsCount}
          onLogout={onLogout}
          onMenuOpen={() => setIsSidebarOpen((open) => !open)}
          isMenuOpen={isSidebarOpen}
        />
        <Toast message={message} type={type} onClose={clearToast} />
        <main className="min-w-0 w-full max-w-[1440px] mx-auto p-3 sm:p-4 lg:p-6 space-y-4">
          {children}
        </main>
      </div>
    </div>
  );
}
