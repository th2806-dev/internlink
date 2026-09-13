import { useState } from "react";
import { Search, User, CalendarDays } from "lucide-react";
import { NotificationDropdown } from "../../../components/common/NotificationDropdown";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { useAuth } from "../../../hooks/useAuth";
import { useSemester } from "../../../contexts/SemesterContext";
import type { UserRole } from "../../../types/common";

export const Header = ({
  activeTab,
  onNavigate,
  searchQuery,
  onSearchChange,
  unreadCount = 3,
  currentLecturer,
  assignedStudentsCount,
  onSwitchPortal,
  onLogout,
}: {
  activeTab: string;
  onNavigate: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  unreadCount?: number;
  currentLecturer?: string;
  assignedStudentsCount?: number;
  onSwitchPortal?: (role: UserRole) => void;
  onLogout?: () => void;
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { user } = useAuth();
  const lecturerName = user?.name || currentLecturer || "Giảng viên";

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case "dashboard":
        return "Tổng quan";
      case "students":
        return "Sinh viên";
      case "internships":
        return "Đợt thực tập";
      case "enterprises":
        return "Doanh nghiệp";
      case "export":
        return "Export cuối kỳ";
      case "templates":
        return "Biểu mẫu";
      case "evaluations":
        return "Đánh giá & Chấm điểm";
      case "analytics":
        return "Thống kê & Phân tích";
      case "reports":
        return "Kho Báo cáo & Bài nộp";
      case "notifications":
        return "Thông báo";
      case "account":
        return "Tài khoản & Cài đặt";
      default:
        return "Tổng quan";
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 font-medium">
          <span
            onClick={() => onNavigate("dashboard")}
            className="cursor-pointer hover:text-blue-600 transition-colors hidden sm:inline"
          >
            Cổng Giảng viên
          </span>
          <span className="hidden sm:inline text-slate-300">/</span>
          <span className="text-slate-900 font-semibold">
            {getTabLabel(activeTab)}
          </span>
        </div>

        <SemesterBadge currentLecturer={currentLecturer} assignedStudentsCount={assignedStudentsCount} />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-48 sm:w-64 md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm nhanh..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-100 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-500 rounded-md outline-none transition-colors placeholder:text-slate-400"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          ) : null}
        </div>

        {/* Notifications */}
        <NotificationDropdown role="lecturer" onNavigate={onNavigate} />

        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="rounded-full cursor-pointer focus-visible:outline-none"
            title="Tài khoản Giảng viên"
          >
            <InitialsAvatar
              name={lecturerName}
              seed={user?.id || user?.email || lecturerName}
              size={32}
            />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-md border border-slate-200 p-2 z-50">
              <div className="p-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{lecturerName}</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Giảng viên hướng dẫn ({assignedStudentsCount} SV)
                </p>
              </div>

              <div className="py-1 text-xs space-y-0.5">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigate("account");
                  }}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-md flex items-center justify-between font-medium transition-colors cursor-pointer"
                >
                  <span>Hồ sơ cá nhân</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-md flex items-center justify-between font-semibold transition-colors cursor-pointer"
                >
                  <span>Đăng xuất hệ thống</span>
                  <span className="material-symbols-outlined text-sm">
                    logout
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

function SemesterBadge({
  currentLecturer,
  assignedStudentsCount,
}: {
  currentLecturer?: string;
  assignedStudentsCount?: number;
}) {
  const { semesters } = useSemester();
  const activeSemester = semesters.find((semester) => semester.status === "active");
  const semesterLabel = activeSemester
    ? activeSemester.name || `${activeSemester.term} (${activeSemester.academicYear})`
    : "Chưa có kỳ hoạt động";

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 text-slate-800 rounded-md border border-slate-200 font-semibold text-xs">
      <span className={`w-2 h-2 rounded-full shrink-0 ${activeSemester ? "bg-emerald-500" : "bg-slate-400"}`} />
      <span className="truncate max-w-[280px] sm:max-w-none flex items-center gap-1.5">
        <CalendarDays className="w-3 h-3 text-slate-400 shrink-0" />
        {semesterLabel} · GV: {currentLecturer} · {assignedStudentsCount} SV HD
      </span>
    </div>
  );
}
