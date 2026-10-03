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
    switch (tab) {
      case "student-dashboard":
        return "T\u1ED5ng quan";
      case "student-internship":
        return "K\u1EF3 th\u1EF1c t\u1EADp c\u1EE7a t\xF4i";
      case "student-weekly-reports":
        return "B\xE1o c\xE1o tu\u1EA7n";
      case "student-submissions":
        return "S\u1EA3n ph\u1EA9m th\u1EF1c t\u1EADp";
      case "student-feedback":
        return "Ph\u1EA3n h\u1ED3i & Ch\u1EC9nh s\u1EEDa";
      case "student-templates":
        return "Bi\u1EC3u m\u1EABu & T\xE0i li\u1EC7u";
      case "student-evaluation":
        return "K\u1EBFt qu\u1EA3 \u0111\xE1nh gi\xE1";
      case "student-attendance":
        return "L\u1ECBch g\u1EB7p & \u0110i\u1EC3m danh";
      case "student-notifications":
        return "Th\xF4ng b\xE1o";
      case "student-account":
        return "T\xE0i kho\u1EA3n";
      default:
        return "T\u1ED5ng quan";
    }
  };
  
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2.5 sm:gap-4 sm:px-4 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label={isMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
          aria-expanded={isMenuOpen}
          aria-controls="student-navigation"
          className="student-menu-button lg:hidden"
          onClick={onMenuOpen}
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* Navigation Breadcrumb */}
        <nav aria-label="Điều hướng" className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
          <button
            type="button"
            onClick={() => onNavigate("student-dashboard")}
            className="hidden whitespace-nowrap hover:text-blue-600 sm:inline"
          >
            Cổng Sinh viên
          </button>
          <span className="hidden sm:inline">›</span>
          <span className="truncate font-semibold text-slate-900">
            {getTabLabel(activeTab)}
          </span>
        </nav>
        <StudentSemesterBadge profile={profile} />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        <NotificationDropdown role="student" onNavigate={onNavigate} />

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            aria-label="Mở menu tài khoản"
            aria-expanded={showProfileMenu}
            aria-controls="student-profile-menu"
          >
            <InitialsAvatar name={profile.name} seed={profile.mssv} size={32} />
          </button>

          {showProfileMenu && (
            <div id="student-profile-menu" className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-md border border-slate-200 p-3 z-50">
              <div className="pb-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">
                  {profile.name}
                </p>
                <p className="text-[11px] text-blue-600 font-semibold">
                  MSSV: {profile.mssv} • Lớp {profile.class}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  GVHD: {profile.lecturerName}
                </p>
              </div>

              <div className="py-1 text-xs space-y-0.5">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigate("student-account");
                  }}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-lg flex items-center justify-between font-medium transition-colors"
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
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-between font-bold transition-colors border-t border-slate-100 pt-2.5 mt-1"
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

function StudentSemesterBadge({ profile }: { profile: { company: string; position: string; statusBadge: string } }) {
  const { semesters } = useSemester();
  const activeSemester = semesters.find((semester) => semester.status === "active");
  const semesterLabel = activeSemester
    ? activeSemester.name || `${activeSemester.term} (${activeSemester.academicYear})`
    : "Chưa có kỳ hoạt động";

  return (
    <div className="hidden min-w-0 max-w-[520px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 xl:flex">
      <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span className="max-w-[180px] truncate">
        {semesterLabel}
      </span>
      <span className="text-slate-300">•</span>
      <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      <span className="max-w-[200px] truncate">
        {profile.company} • {profile.position}
      </span>
      <span className={`w-2 h-2 rounded-full shrink-0 ml-1 ${activeSemester ? "bg-emerald-500" : "bg-slate-400"}`} />
      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold">
        {profile.statusBadge}
      </span>
    </div>
  );
}

export { Header as StudentHeader };
