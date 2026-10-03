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
      className={`il-sidebar admin-sidebar-drawer w-64 flex flex-col justify-between h-screen sticky top-0 z-40 select-none ${isOpen ? "is-open" : ""}`}
    >
      <div>
        <div className="il-sidebar-header admin-sidebar-header">
          <div className="il-sidebar-logo">
            <img
              src="/logo/logo_internlink-02.png"
              alt="InternLink Mark Logo"
              className="w-7 h-7 object-contain"
            />
          </div>
          <div>
            <div className="flex items-center font-bold text-lg tracking-tight leading-none">
              <span className="il-sidebar-brand-intern">Intern</span>
              <span className="il-sidebar-brand-link">Link</span>
            </div>
            <p className="il-portal-badge">{isSuperAdmin ? "QUẢN TRỊ HỆ THỐNG" : "QUẢN TRỊ KHOA"}</p>
          </div>
          <button
            type="button"
            className="admin-sidebar-close"
            onClick={onClose}
            aria-label="Đóng menu điều hướng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-170px)] il-scrollbar">
          {visibleSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && (
                <p className="il-sidebar-section">{section.title}</p>
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
                    className={`il-sidebar-nav ${isActive ? "is-active" : ""} ${
                      isSuperAdmin && item.id === "admin-settings"
                        ? "border-t border-slate-200 mt-2 pt-3"
                        : ""
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate whitespace-nowrap">
                        {item.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {item.badgeText && (
                        <span className="text-[9px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0">
                          {item.badgeText}
                        </span>
                      )}
                      {item.badge && !item.badgeText && (
                        <span className="il-sidebar-badge">{item.badge}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="il-sidebar-footer">
        <button
          type="button"
          onClick={() => onNavigate("admin-account")}
          className="il-sidebar-profile w-full text-left"
          aria-label={`Mở tài khoản ${displayName}`}
        >
          <div className="relative shrink-0">
            <InitialsAvatar
              name={displayName}
              seed={user?.id || user?.email || displayName}
              size={36}
              className="border border-slate-200"
            />
          </div>

          <div className="overflow-hidden min-w-0 flex-1">
            <p className="il-sidebar-profile-name truncate">{displayName}</p>
            <p className="il-sidebar-profile-meta truncate">{displayRole}</p>
        </div>
        </button>
      </div>
    </aside>
  );
};

export { Sidebar as AdminSidebar };
