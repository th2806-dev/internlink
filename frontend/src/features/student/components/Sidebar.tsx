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
      className={`w-64 shrink-0 flex flex-col justify-between h-screen sticky top-0 z-40 select-none bg-white border-r border-slate-200/90 student-sidebar-drawer ${
        isOpen ? "is-open" : ""
      }`}
    >
      <button
        type="button"
        aria-label="Đóng menu điều hướng"
        className="student-sidebar-close lg:hidden"
        onClick={onClose}
      >
        Đóng
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
              CỔNG SINH VIÊN
            </p>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav
          className="p-3 space-y-2.5 overflow-y-auto max-h-[calc(100dvh-155px)] il-scrollbar"
          aria-label="Điều hướng sinh viên"
        >
          {navSections.map((section) => (
            <div key={section.title || section.items[0]?.id} className="space-y-0.5">
              {section.title && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-2.5 pb-1">
                  {section.title}
                </p>
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
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer User Profile Card */}
      <div className="p-3 border-t border-slate-200/90 bg-slate-50/70">
        <div
          onClick={() => onNavigate("student-account")}
          className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="relative shrink-0">
            <InitialsAvatar
              name={displayName}
              seed={profile.mssv}
              size={34}
            />
          </div>

          <div className="overflow-hidden min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
            <p className="text-[10.5px] text-slate-500 font-medium truncate">
              MSSV: {profile.mssv || "—"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export { Sidebar as StudentSidebar };
