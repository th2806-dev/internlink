import { useState } from "react";
import { Building2, LogOut, User, CalendarDays, Menu } from "lucide-react";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { useSemester } from "../../../contexts/SemesterContext";
import { NotificationDropdown } from "../../../components/common/NotificationDropdown";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";

import type { UserRole } from "../../../types/common";

export interface HeaderProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onSwitchPortal?: (role: UserRole) => void;
  onLogout: () => void;
  onMenuOpen?: () => void;
  isMenuOpen?: boolean;
}

export const Header = ({
  activeTab,
  onNavigate,
  onSwitchPortal: _onSwitchPortal,
  onLogout,
  onMenuOpen,
  isMenuOpen = false,
}: HeaderProps) => {
  const { profile } = useStudentPortal();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const getTabLabel = (tab: string) => {
    const normalized = tab?.startsWith("student-") ? tab : `student-${tab}`;
    switch (normalized) {
      case "student-dashboard":
        return "Tổng quan";
      case "student-internship":
        return "Kỳ thực tập của tôi";
      case "student-weekly-reports":
        return "Báo cáo tuần";
      case "student-submissions":
        return "Hồ sơ & sản phẩm";
      case "student-feedback":
        return "Phản hồi & Chỉnh sửa";
      case "student-templates":
        return "Biểu mẫu & Tài liệu";
      case "student-evaluation":
        return "Kết quả Đánh giá";
      case "student-attendance":
        return "Lịch gặp & Điểm danh";
      case "student-notifications":
        return "Thông báo";
      case "student-account":
        return "Tài khoản";
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
          aria-controls="student-navigation"
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden transition-colors"
          onClick={onMenuOpen}
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Điều hướng" className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => onNavigate("student-dashboard")}
            className="hidden whitespace-nowrap hover:text-[#026aa7] transition-colors font-medium sm:inline"
          >
            Cổng Sinh viên
          </button>
          <span className="hidden text-slate-300 sm:inline">›</span>
          <span className="truncate font-bold text-slate-900 text-xs sm:text-[13px] tracking-tight">
            {getTabLabel(activeTab)}
          </span>
        </nav>
      </div>

      {/* Right: Semester/Enterprise Badge + Notification + User Profile */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        <StudentSemesterBadge profile={profile} />

        <NotificationDropdown role="student" onNavigate={onNavigate} />

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 transition-transform hover:scale-105"
            aria-label="Mở menu tài khoản"
            aria-expanded={showProfileMenu}
            aria-controls="student-profile-menu"
          >
            <InitialsAvatar name={profile.name} seed={profile.mssv} size={32} />
          </button>

          {showProfileMenu && (
            <div
              id="student-profile-menu"
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="pb-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {profile.name}
                </p>
                <p className="text-[11px] text-[#026aa7] font-semibold mt-0.5 truncate">
                  MSSV: {profile.mssv || "—"} • Lớp {profile.class || "—"}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 truncate">
                  GVHD: {profile.lecturerName || "Chưa phân công"}
                </p>
              </div>

              <div className="pt-1.5 text-xs space-y-0.5">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigate("student-account");
                  }}
                  className="w-full text-left px-2.5 py-2 text-slate-700 hover:bg-blue-50/50 hover:text-[#026aa7] rounded-lg flex items-center justify-between font-medium transition-colors"
                >
                  <span>Hồ sơ cá nhân</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {onLogout && (
                  <button
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

function StudentSemesterBadge({
  profile,
}: {
  profile: { company: string; position: string; statusBadge: string };
}) {
  const { semesters } = useSemester();
  const activeSemester = semesters.find((semester) => semester.status === "active");
  const semesterLabel = activeSemester
    ? activeSemester.name || `${activeSemester.term} (${activeSemester.academicYear})`
    : "Kỳ thực tập hiện tại";

  return (
    <div className="hidden lg:flex min-w-0 max-w-[620px] items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs">
      <CalendarDays className="w-3.5 h-3.5 text-[#026aa7] shrink-0" />
      <span className="max-w-[160px] truncate text-slate-600 font-medium">
        {semesterLabel}
      </span>
      <span className="text-slate-300">•</span>
      <Building2 className="w-3.5 h-3.5 text-[#026aa7] shrink-0" />
      <span className="max-w-[180px] truncate font-semibold text-slate-800">
        {profile.company && profile.company !== "—" ? profile.company : "Chưa phân bổ"}
      </span>
      <span className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full text-[10px] shrink-0">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            activeSemester ? "bg-emerald-600 animate-pulse" : "bg-slate-400"
          }`}
        />
        {profile.statusBadge || "Đang thực tập"}
      </span>
    </div>
  );
}

export { Header as StudentHeader };
