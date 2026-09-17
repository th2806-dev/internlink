import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  User,
  ShieldCheck,
  Settings,
  Calendar,
  Building2,
  ChevronDown,
} from "lucide-react";
import { formatRelativeTimeVi } from "../../../lib/formatRelativeTimeVi";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { useSemester } from "../../../contexts/SemesterContext";
import { NotificationDropdown } from "../../../components/common/NotificationDropdown";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import type { AdminNavStats } from "../../../hooks/useAdminNavStats";
import type { AuthUser, UserRole } from "../../../contexts/AuthContext";
import type { NotificationDto } from "../../../types/api";

export const Header = ({
  activeTab,
  onNavigate,
  onLogout,
  onShowToast,
  user,
  stats,
  recentNotifications = [],
}: {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onSwitchPortal?: (role: UserRole) => void;
  onLogout?: () => void;
  onShowToast: (msg: string) => void;
  user?: AuthUser | null;
  stats?: AdminNavStats | null;
  recentNotifications?: NotificationDto[];
}) => {
  const navigate = useNavigate();
  const { isSuperAdmin, roleDisplayLabel } = useAdminCapabilities();
  const {
    semesters,
    selectedSemesterId,
    selectedSemester,
    selectSemester,
    departments,
    selectedDepartmentId,
    selectedDepartment,
    selectDepartment,
  } = useSemester();
  const [showSemesterMenu, setShowSemesterMenu] = useState(false);
  const [showDepartmentMenu, setShowDepartmentMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const displayName = user?.name || user?.username || roleDisplayLabel;
  const displayEmail = user?.email ?? user?.username ?? "—";

  const getTabTitle = (tab: string) => {
    const normalized = tab?.startsWith("admin-") ? tab : `admin-${tab}`;
    switch (normalized) {
      case "admin-dashboard":
        return "Tổng quan hệ thống";
      case "admin-lecturers":
        return "Danh sách Giảng viên";
      case "admin-students":
        return "Danh sách Sinh viên";
      case "admin-companies":
        return "Doanh nghiệp";
      case "admin-users":
        return "Người dùng";
      case "admin-assignments":
        return "Phân công hướng dẫn";
      case "admin-semesters":
        return "Quản lý Kỳ thực tập";
      case "admin-templates":
        return "Quản lý Biểu mẫu & Tài liệu";
      case "admin-notifications":
        return "Trung tâm Thông báo";
      case "admin-settings":
        return "Cài đặt Hệ thống";
      case "admin-account":
        return "Hồ sơ Quản trị";
      default:
        return "Trang quản trị";
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/admin/students?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 font-medium min-w-0">
          <span
            onClick={() => onNavigate("admin-dashboard")}
            className="cursor-pointer hover:text-blue-600 transition-colors hidden sm:inline"
          >
            Cổng Quản trị
          </span>
          <span className="hidden sm:inline">›</span>
          <span className="text-slate-900 font-semibold truncate">
            {getTabTitle(activeTab)}
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-800 rounded-md border border-slate-200 font-semibold text-xs shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-slate-600">{roleDisplayLabel}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        </div>

        {/* SEMESTER SELECTOR DROPDOWN */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSemesterMenu(!showSemesterMenu)}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-blue-50/80 hover:bg-blue-100/80 text-blue-900 rounded-md border border-blue-200 font-medium text-xs transition-colors shrink-0"
            title="Chọn đợt thực tập để xem dữ liệu"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="max-w-[140px] sm:max-w-[180px] truncate font-semibold">
              {selectedSemester.name}
            </span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                selectedSemester.status === "active"
                  ? "bg-emerald-500"
                  : selectedSemester.status === "upcoming"
                  ? "bg-amber-500"
                  : "bg-slate-400"
              }`}
            />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {showSemesterMenu && (
            <div className="absolute left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 p-2 z-50 animate-in fade-in">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                <span>Chọn Kỳ / Đợt thực tập</span>
                <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => { onNavigate("admin-semesters"); setShowSemesterMenu(false); }}>
                  Quản lý
                </span>
              </div>
              <div className="mt-1 space-y-1 max-h-60 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    selectSemester("all");
                    setShowSemesterMenu(false);
                    onShowToast("Đã chuyển sang chế độ: Tất cả học kỳ");
                  }}
                  className={`w-full text-left p-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                    selectedSemesterId === "all"
                      ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="truncate font-medium">Tất cả học kỳ</p>
                    <p className="text-[10px] text-slate-400 font-normal">Hiển thị toàn bộ dữ liệu</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap bg-blue-100 text-blue-700">
                    Tất cả
                  </span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                {semesters.map((sem) => (
                  <button
                    key={sem.id}
                    type="button"
                    onClick={() => {
                      selectSemester(sem.id);
                      setShowSemesterMenu(false);
                      onShowToast(`Đã chuyển sang đợt: "${sem.name}"`);
                    }}
                    className={`w-full text-left p-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                      sem.id === selectedSemesterId
                        ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="truncate font-medium">{sem.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal">
                        {sem.term} ({sem.academicYear})
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap ${
                        sem.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : sem.status === "upcoming"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {sem.status === "active"
                        ? "Đang chạy"
                        : sem.status === "upcoming"
                        ? "Sắp tới"
                        : "Đã đóng"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isSuperAdmin && departments.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDepartmentMenu(!showDepartmentMenu)}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 rounded-md border border-emerald-200 font-medium text-xs transition-colors shrink-0"
              title="Chọn khoa để lọc dữ liệu"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="max-w-[140px] sm:max-w-[180px] truncate font-semibold">
                {selectedDepartment.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {showDepartmentMenu && (
              <div className="absolute left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 p-2 z-50 animate-in fade-in">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Chọn Khoa
                </div>
                <div className="mt-1 space-y-1 max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      selectDepartment("all");
                      setShowDepartmentMenu(false);
                      onShowToast("Đã chuyển sang chế độ: Tất cả khoa");
                    }}
                    className={`w-full text-left p-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                      selectedDepartmentId === "all"
                        ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="truncate font-medium">Tất cả khoa</p>
                      <p className="text-[10px] text-slate-400 font-normal">Hiển thị toàn bộ dữ liệu</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap bg-emerald-100 text-emerald-700">
                      Tất cả
                    </span>
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  {departments.map((department) => (
                    <button
                      key={department.id}
                      type="button"
                      onClick={() => {
                        selectDepartment(department.id);
                        setShowDepartmentMenu(false);
                        onShowToast(`Đã chọn khoa: "${department.name}"`);
                      }}
                      className={`w-full text-left p-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                        department.id === selectedDepartmentId
                          ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="truncate font-medium">{department.name}</p>
                        <p className="text-[10px] text-slate-400 font-normal">{department.code}</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap bg-slate-100 text-slate-600">
                        {department.code}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <form
          onSubmit={handleSearchSubmit}
          className="relative w-48 sm:w-64 md:w-80 hidden md:block"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm MSSV, Giảng viên, Doanh nghiệp..."
            className="w-full pl-9 pr-3 py-1.5 text-xs md:text-sm bg-slate-100 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-500 rounded-md outline-none transition-colors placeholder:text-slate-400"
          />
        </form>

        {/* Notifications Popover */}
        <NotificationDropdown
          role="admin"
          backendRole={user?.backendRole}
          onNavigate={onNavigate}
          onShowToast={onShowToast}
        />

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="rounded-full focus-visible:outline-none"
            title="Tài khoản"
          >
            <InitialsAvatar
              name={displayName}
              seed={user?.id || user?.email || displayName}
              size={32}
            />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-md border border-slate-200 p-3 z-50">
              <div className="pb-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-blue-600 font-semibold">
                  {roleDisplayLabel}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {displayEmail}
                </p>
              </div>

              <div className="py-1 text-xs space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigate("admin-account");
                  }}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-lg flex items-center justify-between font-medium transition-colors"
                >
                  <span>Hồ sơ tài khoản</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate("admin-settings");
                    }}
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-lg flex items-center justify-between font-medium transition-colors"
                  >
                    <span>Cài đặt hệ thống</span>
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition-colors border-t border-slate-100 pt-2.5 mt-1 cursor-pointer"
                  >
                    Đăng xuất
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

export { Header as AdminHeader };
