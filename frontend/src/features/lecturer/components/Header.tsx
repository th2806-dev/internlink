import { useState } from "react";
import { User, CalendarDays, Menu, LogOut } from "lucide-react";
import { NotificationDropdown } from "../../../components/common/NotificationDropdown";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { useAuth } from "../../../hooks/useAuth";
import { useSemester } from "../../../contexts/SemesterContext";

export const Header = ({
  activeTab,
  onNavigate,
  currentLecturer,
  assignedStudentsCount,
  onLogout,
  onMenuOpen,
  isMenuOpen = false,
}: {
  activeTab: string;
  onNavigate: (tab: string) => void;
  currentLecturer?: string;
  assignedStudentsCount?: number;
  onLogout?: () => void;
  onMenuOpen?: () => void;
  isMenuOpen?: boolean;
}) => {
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
        return "Kết quả đánh giá";
      case "summary":
        return "Kết quả đánh giá";
      case "templates":
        return "Biểu mẫu";
      case "evaluations":
      case "evaluation":
        return "Đánh giá & Chấm điểm";
      case "analytics":
        return "Thống kê & Phân tích";
      case "reports":
        return "Báo cáo & Bài nộp";
      case "history":
        return "Lịch sử hướng dẫn";
      case "notifications":
        return "Thông báo";
      case "account":
        return "Tài khoản & Cài đặt";
      default:
        return "Tổng quan";
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2.5 sm:gap-4 sm:px-4 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label={isMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
          aria-expanded={isMenuOpen}
          aria-controls="lecturer-navigation"
          className="lecturer-menu-button lg:hidden"
          onClick={onMenuOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
        <nav aria-label="Điều hướng" className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="hidden cursor-pointer whitespace-nowrap bg-transparent p-0 transition-colors hover:text-blue-600 sm:inline"
          >
            Cổng Giảng viên
          </button>
          <span className="hidden sm:inline text-slate-300">/</span>
          <span className="truncate font-semibold text-slate-900">
            {getTabLabel(activeTab)}
          </span>
        </nav>

        <SemesterBadge currentLecturer={currentLecturer} assignedStudentsCount={assignedStudentsCount} />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <NotificationDropdown role="lecturer" onNavigate={onNavigate} />

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            aria-label="Mở menu tài khoản"
            aria-expanded={showProfileMenu}
            aria-controls="lecturer-profile-menu"
          >
            <InitialsAvatar
              name={lecturerName}
              seed={user?.id || user?.email || lecturerName}
              size={32}
            />
          </button>

          {showProfileMenu && (
            <div id="lecturer-profile-menu" className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white rounded-lg shadow-md border border-slate-200 p-2 z-50">
              <div className="p-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{lecturerName}</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Giảng viên hướng dẫn
                  {assignedStudentsCount != null ? ` · ${assignedStudentsCount} sinh viên` : ""}
                </p>
              </div>

              <div className="py-1 text-xs space-y-0.5">
                <button
                  type="button"
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
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-md flex items-center justify-between font-semibold transition-colors cursor-pointer"
                >
                  <span>Đăng xuất hệ thống</span>
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
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
    <div className="hidden min-w-0 max-w-[520px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 xl:flex">
      <span className={`w-2 h-2 rounded-full shrink-0 ${activeSemester ? "bg-emerald-500" : "bg-slate-400"}`} />
      <span className="flex min-w-0 items-center gap-1.5 truncate">
        <CalendarDays className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="truncate">{semesterLabel}</span>
        {currentLecturer && <span className="hidden 2xl:inline">· {currentLecturer}</span>}
        {assignedStudentsCount != null && <span className="shrink-0">· {assignedStudentsCount} SV</span>}
      </span>
    </div>
  );
}
