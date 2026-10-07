import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  User,
  Settings,
  Calendar,
  Building2,
  ChevronDown,
  Menu,
} from "lucide-react";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { useSemester } from "../../../contexts/SemesterContext";
import { NotificationDropdown } from "../../../components/common/NotificationDropdown";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import type { AuthUser } from "../../../contexts/AuthContext";

export const Header = ({
  activeTab,
  onNavigate,
  onLogout,
  onShowToast,
  user,
  onMenuOpen,
  isMenuOpen = false,
}: {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout?: () => void;
  onShowToast: (msg: string) => void;
  user?: AuthUser | null;
  onMenuOpen?: () => void;
  isMenuOpen?: boolean;
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
      case "admin-report-archive":
        return "Kho báo cáo tuần";
      case "admin-notifications":
        return "Trung tâm Thông báo";
      case "admin-settings":
        return "Cài đặt Hệ thống";
      case "admin-backups":
        return "Sao lưu & Khôi phục";
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
    <header className="sticky top-0 z-30 flex flex-col border-b border-slate-200/90 bg-white">
      {/* Main Topbar Row */}
      <div className="flex h-14 sm:h-15 w-full min-w-0 items-center justify-between px-3.5 sm:px-5 lg:px-6 gap-3">
        {/* Left: Hamburger & Breadcrumbs */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            aria-label={isMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
            aria-expanded={isMenuOpen}
            aria-controls="admin-navigation"
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden transition-colors"
            onClick={onMenuOpen}
          >
            <Menu className="w-5 h-5" />
          </button>
          <nav aria-label="Điều hướng" className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate("admin-dashboard")}
              className="hidden sm:inline whitespace-nowrap hover:text-[#026aa7] transition-colors font-medium"
            >
              Cổng Quản trị
            </button>
            <span className="hidden sm:inline text-slate-300">›</span>
            <span className="text-slate-900 font-bold truncate text-xs sm:text-[13px] tracking-tight">
              {getTabTitle(activeTab)}
            </span>
          </nav>
        </div>

        {/* Right: Selectors + Search + Notification + Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Desktop Semester Selector Pill */}
          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => setShowSemesterMenu(!showSemesterMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/90 bg-slate-50/80 hover:bg-slate-100 text-slate-700 font-medium text-xs transition-colors shadow-2xs cursor-pointer"
              title="Chọn đợt thực tập để xem dữ liệu"
            >
              <Calendar className="w-3.5 h-3.5 text-[#026aa7] shrink-0" />
              <span className="max-w-[140px] truncate text-slate-800 font-semibold">
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
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200/90 p-2 z-50 animate-in fade-in">
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                  <span>Chọn Kỳ / Đợt thực tập</span>
                  <span
                    className="text-[#026aa7] cursor-pointer hover:underline"
                    onClick={() => {
                      onNavigate("admin-semesters");
                      setShowSemesterMenu(false);
                    }}
                  >
                    Quản lý
                  </span>
                </div>
                <div className="mt-1 space-y-1 max-h-60 overflow-y-auto il-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      selectSemester("all");
                      setShowSemesterMenu(false);
                      onShowToast("Đã chuyển sang chế độ: Tất cả học kỳ");
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      selectedSemesterId === "all"
                        ? "bg-blue-50 text-[#026aa7] font-bold border border-blue-200"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="truncate font-medium">Tất cả học kỳ</p>
                      <p className="text-[10px] text-slate-400 font-normal">Hiển thị toàn bộ dữ liệu</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap bg-blue-100 text-[#026aa7]">
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
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        sem.id === selectedSemesterId
                          ? "bg-blue-50 text-[#026aa7] font-bold border border-blue-200"
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

          {/* Desktop Department Selector Pill (Super Admin) */}
          {isSuperAdmin && departments.length > 0 && (
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setShowDepartmentMenu(!showDepartmentMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/90 bg-slate-50/80 hover:bg-slate-100 text-slate-700 font-medium text-xs transition-colors shadow-2xs cursor-pointer"
                title="Chọn khoa để lọc dữ liệu"
              >
                <Building2 className="w-3.5 h-3.5 text-[#026aa7] shrink-0" />
                <span className="max-w-[140px] truncate text-slate-800 font-semibold">
                  {selectedDepartment.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {showDepartmentMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200/90 p-2 z-50 animate-in fade-in">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Chọn Khoa
                  </div>
                  <div className="mt-1 space-y-1 max-h-60 overflow-y-auto il-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        selectDepartment("all");
                        setShowDepartmentMenu(false);
                        onShowToast("Đã chuyển sang chế độ: Tất cả khoa");
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        selectedDepartmentId === "all"
                          ? "bg-blue-50 text-[#026aa7] font-bold border border-blue-200"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="truncate font-medium">Tất cả khoa</p>
                        <p className="text-[10px] text-slate-400 font-normal">Hiển thị toàn bộ dữ liệu</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap bg-blue-100 text-[#026aa7]">
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
                        className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          department.id === selectedDepartmentId
                            ? "bg-blue-50 text-[#026aa7] font-bold border border-blue-200"
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

          {/* Search bar on large screens */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative hidden xl:block w-48 2xl:w-60"
          >
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm MSSV hoặc tên..."
              aria-label="Tìm sinh viên theo MSSV hoặc tên"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white border border-slate-200/90 focus:border-[#026aa7] rounded-full outline-none transition-colors placeholder:text-slate-400 shadow-2xs"
            />
          </form>

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
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 transition-transform hover:scale-105"
              title="Tài khoản"
              aria-label="Mở menu tài khoản"
              aria-expanded={showProfileMenu}
              aria-controls="admin-profile-menu"
            >
              <InitialsAvatar
                name={displayName}
                seed={user?.id || user?.email || displayName}
                size={32}
              />
            </button>

            {showProfileMenu && (
              <div
                id="admin-profile-menu"
                className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="pb-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-[#026aa7] font-semibold mt-0.5">
                    {roleDisplayLabel}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">
                    {displayEmail}
                  </p>
                </div>

                <div className="pt-1.5 text-xs space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate("admin-account");
                    }}
                    className="w-full text-left px-2.5 py-2 text-slate-700 hover:bg-blue-50/50 hover:text-[#026aa7] rounded-lg flex items-center justify-between font-medium transition-colors"
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
                      className="w-full text-left px-2.5 py-2 text-slate-700 hover:bg-blue-50/50 hover:text-[#026aa7] rounded-lg flex items-center justify-between font-medium transition-colors"
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
                      className="w-full text-left px-2.5 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition-colors border-t border-slate-100 pt-2 mt-1 cursor-pointer"
                    >
                      Đăng xuất
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Sub-bar for selectors (< lg) */}
      <div className="flex lg:hidden w-full min-w-0 items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-3.5 py-2">
        <button
          type="button"
          onClick={() => setShowSemesterMenu(!showSemesterMenu)}
          className="flex flex-1 min-w-0 items-center gap-1.5 px-2.5 py-1.5 bg-white text-slate-800 rounded-lg border border-slate-200/90 font-medium text-xs transition-colors shadow-2xs"
        >
          <Calendar className="w-3.5 h-3.5 text-[#026aa7] shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left font-semibold">
            {selectedSemester.name}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {isSuperAdmin && departments.length > 0 && (
          <button
            type="button"
            onClick={() => setShowDepartmentMenu(!showDepartmentMenu)}
            className="flex flex-1 min-w-0 items-center gap-1.5 px-2.5 py-1.5 bg-white text-slate-800 rounded-lg border border-slate-200/90 font-medium text-xs transition-colors shadow-2xs"
          >
            <Building2 className="w-3.5 h-3.5 text-[#026aa7] shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left font-semibold">
              {selectedDepartment.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>
        )}
      </div>
    </header>
  );
};

export { Header as AdminHeader };
