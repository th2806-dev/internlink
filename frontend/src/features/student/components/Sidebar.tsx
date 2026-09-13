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
export const Sidebar = ({
  activeTab,
  onNavigate,
  onSwitchPortal: _onSwitchPortal,
  studentName = "Nguyễn Văn A",
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
  const navSections = [
    {
      title: "TỔNG QUAN",
      items: [
        { id: "student-dashboard", label: "Tổng quan", icon: LayoutDashboard },
      ],
    },
    {
      title: "KỲ THỰC TẬP",
      items: [
        {
          id: "student-internship",
          label: "Kỳ thực tập của tôi",
          icon: Briefcase,
          badge: "Active",
        },
        {
          id: "student-attendance",
          label: "Lịch gặp & Điểm danh",
          icon: CalendarCheck,
        },
      ],
    },
    {
      title: "TÀI LIỆU & BÁO CÁO",
      items: [
        {
          id: "student-templates",
          label: "Biểu mẫu & Tài liệu",
          icon: FileText,
        },
        {
          id: "student-weekly-reports",
          label: "Báo cáo tuần",
          icon: FileCheck2,
        },
        {
          id: "student-submissions",
          label: "Sản phẩm thực tập",
          icon: FolderKanban,
        },
      ],
    },
    {
      title: "PHẢN HỒI & HỆ THỐNG",
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
        {
          id: "student-notifications",
          label: "Thông báo",
          icon: Bell,
          badgeAlert: true,
        },
        { id: "student-account", label: "Tài khoản", icon: User },
      ],
    },
  ];

  return (
    <aside
      className={`il-sidebar w-64 flex flex-col justify-between h-screen sticky top-0 z-40 select-none student-sidebar-drawer ${isOpen ? "is-open" : ""}`}
    >
      <button
        type="button"
        aria-label="Đóng menu điều hướng"
        className="student-sidebar-close md:hidden"
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

        <nav className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-160px)] il-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
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
        <div
          onClick={() => onNavigate("student-account")}
          className="il-sidebar-profile"
        >
          <div className="relative shrink-0">
            <InitialsAvatar
              name={displayName}
              seed={profile.mssv}
              size={36}
            />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"
              title="Trực tuyến"
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
