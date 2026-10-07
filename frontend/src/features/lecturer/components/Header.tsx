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
    <header className="sticky top-0 z-30 flex h-14 sm:h-15 items-center justify-between border-b border-slate-200/90 bg-white px-3.5 sm:px-5 lg:px-6">
      {/* Left: Mobile hamburger menu & Breadcrumbs */}
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          aria-label={isMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
          aria-expanded={isMenuOpen}
          aria-controls="lecturer-navigation"
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden transition-colors"
          onClick={onMenuOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
        <nav aria-label="Điều hướng" className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="hidden whitespace-nowrap hover:text-[#026aa7] transition-colors font-medium sm:inline"
          >
            Cổng Giảng viên
          </button>
          <span className="hidden text-slate-300 sm:inline">›</span>
          <span className="truncate font-bold text-slate-900 text-xs sm:text-[13px] tracking-tight">
            {getTabLabel(activeTab)}
          </span>
        </nav>
      </div>

      {/* Right: Semester Badge + Notification + User Profile */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        <SemesterBadge currentLecturer={currentLecturer} assignedStudentsCount={assignedStudentsCount} />

        <NotificationDropdown role="lecturer" onNavigate={onNavigate} />

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 transition-transform hover:scale-105"
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
            <div
              id="lecturer-profile-menu"
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="pb-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{lecturerName}</p>
                <p className="text-[11px] text-[#026aa7] font-semibold mt-0.5 truncate">
                  Giảng viên hướng dẫn
                  {assignedStudentsCount != null ? ` • ${assignedStudentsCount} sinh viên` : ""}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 truncate">
                  {user?.email || "Chưa cập nhật email"}
                </p>
              </div>

              <div className="pt-1.5 text-xs space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigate("account");
                  }}
                  className="w-full text-left px-2.5 py-2 text-slate-700 hover:bg-blue-50/50 hover:text-[#026aa7] rounded-lg flex items-center justify-between font-medium transition-colors"
                >
                  <span>Hồ sơ cá nhân</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-2.5 py-2 text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-between font-semibold transition-colors border-t border-slate-100 pt-2 mt-1"
                  >
                    <span>Đăng xuất hệ thống</span>
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

function SemesterBadge({
  currentLecturer: _currentLecturer,
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
    <div className="hidden lg:flex min-w-0 max-w-[620px] items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs">
      <CalendarDays className="w-3.5 h-3.5 text-[#026aa7] shrink-0" />
      <span className="max-w-[200px] truncate text-slate-700 font-medium">
        {semesterLabel}
      </span>
      {assignedStudentsCount != null && (
        <>
          <span className="text-slate-300">•</span>
          <span className="font-semibold text-slate-800 shrink-0">
            {assignedStudentsCount} SV hướng dẫn
          </span>
        </>
      )}
      <span className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full text-[10px] shrink-0 ml-0.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            activeSemester ? "bg-emerald-600 animate-pulse" : "bg-slate-400"
          }`}
        />
        {activeSemester ? "Đang diễn ra" : "Đã kết thúc"}
      </span>
    </div>
  );
}
