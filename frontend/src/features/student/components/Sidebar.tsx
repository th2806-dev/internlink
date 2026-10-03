import {
  LayoutDashboard,
  Briefcase,
  FileCheck2,
  FolderKanban,
  MessageSquare,
  FileText,
  Bell,
  User,
  Award,
  CalendarCheck,
} from "lucide-react";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import type { UserRole } from "../../../types/common";

type StudentNavItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  badgeAlert?: boolean;
};

type StudentNavSection = {
  title: string;
  items: StudentNavItem[];
};

export const Sidebar = ({
  activeTab,
  onNavigate,
  onSwitchPortal: _onSwitchPortal,
  studentName = "Sinh viên",
  isOpen = false,
  onClose,
}: {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onSwitchPortal?: (role: UserRole) => void;
  studentName?: string;
  isOpen?: boolean;
  onClose?: () => void;
}) => {
  const { profile } = useStudentPortal();
  const displayName = profile.name || studentName;
  const navSections: StudentNavSection[] = [
    {
      title: "",
      items: [
        { id: "student-dashboard", label: "Tổng quan", icon: LayoutDashboard },
      ],
    },
    {
      title: "THỰC TẬP",
      items: [
        {
          id: "student-internship",
          label: "Kỳ thực tập của tôi",
          icon: Briefcase,
        },
        {
          id: "student-attendance",
          label: "Lịch gặp & Điểm danh",
          icon: CalendarCheck,
        },
      ],
    },
    {
      title: "BÀI NỘP",
      items: [
        {
          id: "student-weekly-reports",
          label: "Báo cáo tuần",
          icon: FileCheck2,
        },
        {
          id: "student-submissions",
          label: "Hồ sơ & sản phẩm",
          icon: FolderKanban,
        },
        {
          id: "student-templates",
          label: "Biểu mẫu & Tài liệu",
          icon: FileText,
        },
      ],
    },
    {
      title: "PHẢN HỒI & KẾT QUẢ",
      items: [
        {
          id: "student-feedback",
          label: "Phản hồi & Chỉnh sửa",
          icon: MessageSquare,
        },
        {
          id: "student-evaluation",
          label: "Kết quả Đánh giá",
          icon: Award,
        },
      ],
    },
    {
      title: "",
      items: [
        {
          id: "student-notifications",
          label: "Thông báo",
          icon: Bell,
        },
        { id: "student-account", label: "Tài khoản", icon: User },
      ],
    },
  ];

  return (
    <aside
      id="student-navigation"
      className={`il-sidebar w-64 shrink-0 flex flex-col justify-between h-screen sticky top-0 z-40 select-none student-sidebar-drawer ${isOpen ? "is-open" : ""}`}
    >
      <button
        type="button"
        aria-label="Đóng menu điều hướng"
        className="student-sidebar-close lg:hidden"
        onClick={onClose}
      >
        Đóng
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
            <p className="il-portal-badge">CỔNG SINH VIÊN</p>
          </div>
        </div>

        <nav className="p-3 space-y-3 overflow-y-auto max-h-[calc(100dvh-160px)] il-scrollbar" aria-label="Điều hướng sinh viên">
          {navSections.map((section) => (
            <div key={section.title || section.items[0]?.id} className="space-y-1">
              {section.title && (
                <p className="il-sidebar-section">{section.title}</p>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const normalizedActive = activeTab?.startsWith("student-")
                  ? activeTab
                  : `student-${activeTab}`;
                const isActive = normalizedActive === item.id;
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

                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="il-sidebar-footer">
        <div className="il-sidebar-profile">
          <div className="relative shrink-0">
            <InitialsAvatar
              name={displayName}
              seed={profile.mssv}
              size={36}
            />
          </div>

          <div className="overflow-hidden min-w-0 flex-1">
            <p className="il-sidebar-profile-name">{displayName}</p>
            <p className="il-sidebar-profile-meta">MSSV: {profile.mssv}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export { Sidebar as StudentSidebar };
