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
      className={`w-64 shrink-0 flex flex-col justify-between h-screen sticky top-0 z-40 select-none bg-white border-r border-slate-200/90 lecturer-sidebar-drawer ${
        isOpen ? "is-open" : ""
      }`}
    >
      <button
        type="button"
        aria-label="Đóng menu điều hướng"
        className="lecturer-sidebar-close lg:hidden"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>

      {/* Top Header & Brand */}
      <div>
        <div className="p-4 border-b border-slate-200/90 flex items-center gap-3 bg-gradient-to-b from-blue-50/40 to-white">
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
              CỔNG GIẢNG VIÊN
            </p>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav
          className="p-3 space-y-2.5 overflow-y-auto max-h-[calc(100dvh-155px)] il-scrollbar"
          aria-label="Điều hướng giảng viên"
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
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={`flex w-full items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors select-none text-left ${
                      isActive
                        ? "bg-[#026aa7] text-white shadow-2xs font-semibold"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
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

                      {item.badgeAlert && !isActive && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
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
          onClick={() => onNavigate("account")}
          className="flex w-full items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer text-left"
          aria-label="Mở tài khoản giảng viên"
        >
          <div className="relative shrink-0">
            <InitialsAvatar
              name={displayName}
              seed={user?.id || user?.email || displayName}
              size={34}
            />
          </div>

          <div className="overflow-hidden min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">
              {displayName}
            </p>
            <p className="text-[10.5px] text-slate-500 font-medium truncate">
              {user?.email || "Giảng viên hướng dẫn"}
            </p>
          </div>
        </button>
      </div>
    </aside>
  );
};
