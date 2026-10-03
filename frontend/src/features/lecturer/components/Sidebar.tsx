import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  FileCheck,
  Award,
  BarChart3,
  Bell,
  History,
  User,
  CalendarCheck,
  X,
} from "lucide-react";
import { FEATURES } from "../../../config/featureFlags";
import { useAuth } from "../../../hooks/useAuth";
import { useLecturerNavStats } from "../../../hooks/useLecturerNavStats";
import { toApiSemesterId, useSemester } from "../../../contexts/SemesterContext";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";

type NavItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  badgeAlert?: boolean;
  flag?: keyof typeof FEATURES;
};

export const Sidebar = ({
  activeTab,
  onNavigate,
  currentLecturer = "Giảng viên",
  isOpen = false,
  onClose,
}: {
  activeTab: string;
  onNavigate: (id: string) => void;
  currentLecturer?: string;
  isOpen?: boolean;
  onClose?: () => void;
}) => {
  const { user } = useAuth();
  // Badge sidebar theo HỌC KỲ đang chọn ("all" → toàn bộ kỳ) — đổi kỳ là tự reload,
  // khớp số liệu với các trang bên trong.
  const { selectedSemesterId } = useSemester();
  const { stats } = useLecturerNavStats(toApiSemesterId(selectedSemesterId));

  const displayName = user?.name || currentLecturer || "Giảng viên";

  // Trình tự công việc: chuẩn bị nhóm → hướng dẫn hằng ngày → đánh giá → tra cứu và tài khoản.
  const navSections: { title: string; items: NavItem[] }[] = [
    {
      title: "TỔNG QUAN",
      items: [{ id: "dashboard", label: "Tổng quan", icon: LayoutDashboard }],
    },
    {
      title: "CHUẨN BỊ HƯỚNG DẪN",
      items: [
        {
          id: "students",
          label: "Sinh viên",
          icon: Users,
          badge: stats.studentCount > 0 ? String(stats.studentCount) : undefined,
        },
        {
          id: "enterprises",
          label: "Doanh nghiệp",
          icon: Building2,
          badge: stats.enterpriseCount > 0 ? String(stats.enterpriseCount) : undefined,
        },
        { id: "templates", label: "Biểu mẫu", icon: FileText },
      ],
    },
    {
      title: "HƯỚNG DẪN HẰNG NGÀY",
      items: [
        {
          id: "reports",
          label: "Báo cáo & Bài nộp",
          icon: FileCheck,
          badge: stats.pendingReviewCount > 0 ? String(stats.pendingReviewCount) : undefined,
        },
        {
          id: "attendance",
          label: "Điểm danh & Buổi gặp",
          icon: CalendarCheck,
        },
      ],
    },
    {
      title: "ĐÁNH GIÁ & TỔNG KẾT",
      items: [
        {
          id: "evaluations",
          label: "Đánh giá & Chấm điểm",
          icon: Award,
          badge: stats.evaluatedCount > 0 ? String(stats.evaluatedCount) : undefined,
        },
        {
          id: "analytics",
          label: "Thống kê & Phân tích",
          icon: BarChart3,
          flag: "lecturerAnalytics",
        },
      ],
    },
    {
      title: "HỒ SƠ & TÀI KHOẢN",
      items: [
        { id: "history", label: "Lịch sử hướng dẫn", icon: History },
        {
          id: "notifications",
          label: "Thông báo",
          icon: Bell,
          badgeAlert: stats.unreadNotificationCount > 0,
        },
        { id: "account", label: "Tài khoản", icon: User },
      ],
    },
  ];

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.flag || FEATURES[item.flag],
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      id="lecturer-navigation"
      className={`il-sidebar lecturer-sidebar-drawer w-64 flex flex-col justify-between h-screen sticky top-0 z-40 select-none ${isOpen ? "is-open" : ""}`}
    >
      <button
        type="button"
        aria-label="Đóng menu điều hướng"
        className="lecturer-sidebar-close lg:hidden"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
      <div>
        <div className="il-sidebar-header">
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
            <p className="il-portal-badge">CỔNG GIẢNG VIÊN</p>
          </div>
        </div>

        <nav className="p-3 space-y-3 overflow-y-auto max-h-[calc(100dvh-160px)] il-scrollbar" aria-label="Điều hướng giảng viên">
          {visibleSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && (
                <p className="il-sidebar-section">{section.title}</p>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={`il-sidebar-nav ${isActive ? "is-active" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="il-sidebar-badge">{item.badge}</span>
                    )}

                    {item.badgeAlert && !isActive && (
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                    )}
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
          onClick={() => onNavigate("account")}
          className="il-sidebar-profile w-full text-left"
          aria-label="Mở tài khoản giảng viên"
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
            <p className="il-sidebar-profile-name truncate">
              {displayName}
            </p>
            <p className="il-sidebar-profile-meta truncate">
              {user?.email || "Giảng viên hướng dẫn"}
            </p>
          </div>
        </button>
      </div>
    </aside>
  );
};
