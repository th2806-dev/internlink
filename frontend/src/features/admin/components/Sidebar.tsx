import {
  X,
  LayoutDashboard,
  UserCheck,
  Users,
  UserPlus,
  Building2,
  KeyRound,
  Bell,
  Settings,
  User,
  Calendar,
  FileText,
  ClipboardList,
  CalendarCheck,
  Archive,
  DatabaseBackup,
} from "lucide-react";
import { FEATURES } from "../../../config/featureFlags";
import { formatCountBadge } from "../../../lib/userDisplay";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import type { AdminNavStats } from "../../../hooks/useAdminNavStats";
import type { AuthUser } from "../../../contexts/AuthContext";

type NavItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  badgeAlert?: boolean;
  badgeText?: string;
  flag?: keyof typeof FEATURES;
};

export const Sidebar = ({
  activeTab,
  onNavigate,
  stats,
  user,
  isOpen = false,
  onClose,
}: {
  activeTab: string;
  onNavigate: (id: string) => void;
  stats?: AdminNavStats;
  user?: AuthUser | null;
  isOpen?: boolean;
  onClose?: () => void;
}) => {
  const { isSuperAdmin, roleDisplayLabel } = useAdminCapabilities();
  const unassigned = stats?.unassignedCount ?? 0;
  const campaigns = stats?.notificationCampaignCount ?? 0;
  const unread = stats?.unreadNotificationCount ?? 0;

  // Trình tự theo WORKFLOW đợt thực tập:
  // Chuẩn bị (kỳ, SV, GV, DN, phân công, biểu mẫu) → Vận hành (điểm danh, thông báo)
  // → Tổng kết (báo cáo khoa) → Hệ thống & cá nhân.
  const navSections: { title: string; items: NavItem[] }[] = [
    {
      title: "TỔNG QUAN",
      items: [
        { id: "admin-dashboard", label: "Tổng quan", icon: LayoutDashboard },
      ],
    },
    {
      title: "CHUẨN BỊ KỲ THỰC TẬP",
      items: [
        {
          id: "admin-semesters",
          label: "Kỳ thực tập",
          icon: Calendar,
          flag: "adminSemesters",
        },
        {
          id: "admin-students",
          label: "Sinh viên",
          icon: Users,
          badge:
            stats && stats.studentCount > 0
              ? formatCountBadge(stats.studentCount)
              : undefined,
        },
        {
          id: "admin-lecturers",
          label: "Giảng viên",
          icon: UserCheck,
          badge:
            stats && stats.lecturerCount > 0
              ? formatCountBadge(stats.lecturerCount)
              : undefined,
        },
        {
          id: "admin-companies",
          label: "Doanh nghiệp",
          icon: Building2,
        },
        {
          id: "admin-assignments",
          label: "Phân công hướng dẫn",
          icon: UserPlus,
          ...(unassigned > 0
            ? { badgeText: `${unassigned} chưa PC` }
            : {}),
        },
        {
          id: "admin-templates",
          label: "Biểu mẫu & Tài liệu",
          icon: FileText,
        },
      ],
    },
    {
      title: "VẬN HÀNH KỲ THỰC TẬP",
      items: [
        {
          id: "admin-attendance",
          label: "Điểm danh & Buổi gặp",
          icon: CalendarCheck,
        },
        {
          id: "admin-report-archive",
          label: "Kho báo cáo tuần",
          icon: Archive,
        },
        {
          id: "admin-notifications",
          label: "Thông báo",
          icon: Bell,
          ...(unread > 0
            ? { badge: String(unread), badgeAlert: true }
            : campaigns > 0
            ? { badge: String(campaigns) }
            : {}),
        },
      ],
    },
    {
      title: "TỔNG KẾT KỲ THỰC TẬP",
      items: [
        {
          id: "admin-summary",
          label: "Báo cáo tổng kết",
          icon: ClipboardList,
        },
      ],
    },
    {
      title: "HỆ THỐNG & CÁ NHÂN",
      items: [
        {
          id: "admin-departments",
          label: "Khoa",
          icon: Building2,
        },
        {
          id: "admin-users",
          label: "Người dùng",
          icon: KeyRound,
        },
        { id: "admin-settings", label: "Cài đặt", icon: Settings },
        { id: "admin-backups", label: "Sao lưu & Khôi phục", icon: DatabaseBackup },
        { id: "admin-account", label: "Tài khoản", icon: User },
      ],
    },
  ];

  const displayName = user?.name || user?.username || roleDisplayLabel;
  const displayRole = roleDisplayLabel;

  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (isSuperAdmin) {
          const superAdminItems = new Set([
            "admin-dashboard",
            "admin-departments",
            "admin-semesters",
            "admin-users",
            "admin-settings",
            "admin-backups",
            "admin-account",
          ]);
          if (!superAdminItems.has(item.id)) return false;
        }
        if ((item.id === "admin-departments" || item.id === "admin-settings") && !isSuperAdmin) {
          return false;
        }
        return !item.flag || FEATURES[item.flag];
      }),
    }))
    .filter((section) => section.items.length > 0);

  const visibleSections = isSuperAdmin
    ? [{ title: "", items: filteredSections.flatMap((section) => section.items) }]
    : filteredSections;

  return (
    <aside
      id="admin-navigation"
      aria-label="Điều hướng quản trị"
      className={`w-64 shrink-0 flex flex-col justify-between h-screen sticky top-0 z-40 select-none bg-white border-r border-slate-200/90 admin-sidebar-drawer ${
        isOpen ? "is-open" : ""
      }`}
    >
      <div>
        {/* Top Header & Brand */}
        <div className="p-4 border-b border-slate-200/90 flex items-center justify-between gap-3 bg-gradient-to-b from-blue-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#026aa7]/10 border border-[#026aa7]/20 rounded-lg shrink-0">
              <img
                src="/logo/logo_internlink-02.png"
                alt="InternLink Mark Logo"
                className="w-7 h-7 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center font-bold text-lg tracking-tight leading-none">
                <span className="text-slate-900">Intern</span>
                <span className="text-[#026aa7]">Link</span>
              </div>
              <p className="text-[10px] font-bold tracking-wider text-[#026aa7] bg-[#026aa7]/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                {isSuperAdmin ? "QUẢN TRỊ HỆ THỐNG" : "QUẢN TRỊ KHOA"}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="p-1 text-slate-400 hover:text-slate-600 lg:hidden cursor-pointer"
            onClick={onClose}
            aria-label="Đóng menu điều hướng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav
          className="p-3 space-y-2.5 overflow-y-auto max-h-[calc(100dvh-155px)] il-scrollbar"
          aria-label="Điều hướng quản trị"
        >
          {visibleSections.map((section, idx) => (
            <div key={idx} className="space-y-0.5">
              {section.title && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-2.5 pb-1">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const normalizedActive = activeTab?.startsWith("admin-")
                  ? activeTab
                  : `admin-${activeTab}`;
                const isActive = normalizedActive === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={`flex w-full items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors select-none text-left ${
                      isActive
                        ? "bg-[#026aa7] text-white shadow-2xs font-semibold"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium"
                    } ${
                      isSuperAdmin && item.id === "admin-settings"
                        ? "border-t border-slate-200 mt-2 pt-2.5"
                        : ""
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                      <span className="truncate whitespace-nowrap">
                        {item.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {item.badgeText && (
                        <span className="text-[9px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0">
                          {item.badgeText}
                        </span>
                      )}
                      {item.badge && !item.badgeText && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-blue-50 text-[#026aa7] border border-blue-200/80"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer User Profile Card */}
      <div className="p-3 border-t border-slate-200/90 bg-slate-50/70">
        <button
          type="button"
          onClick={() => onNavigate("admin-account")}
          className="flex w-full items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer text-left"
          aria-label={`Mở tài khoản ${displayName}`}
        >
          <div className="relative shrink-0">
            <InitialsAvatar
              name={displayName}
              seed={user?.id || user?.email || displayName}
              size={34}
            />
          </div>

          <div className="overflow-hidden min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
            <p className="text-[10.5px] text-slate-500 font-medium truncate">{displayRole}</p>
          </div>
        </button>
      </div>
    </aside>
  );
};

export { Sidebar as AdminSidebar };
