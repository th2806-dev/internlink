import {
  Archive,
  Bell,
  Building2,
  Calendar,
  CalendarCheck,
  ClipboardList,
  DatabaseBackup,
  FileText,
  KeyRound,
  LayoutDashboard,
  Settings,
  User,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

export type AdminNavigationItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  flag?: "adminSemesters";
};

export type AdminNavigationSection = {
  title: string;
  items: AdminNavigationItem[];
};

export const ADMIN_NAVIGATION_SECTIONS: AdminNavigationSection[] = [
  {
    title: "TỔNG QUAN",
    items: [{ id: "admin-dashboard", label: "Tổng quan", icon: LayoutDashboard }],
  },
  {
    title: "CHUẨN BỊ KỲ THỰC TẬP",
    items: [
      { id: "admin-semesters", label: "Kỳ thực tập", icon: Calendar, flag: "adminSemesters" },
      { id: "admin-students", label: "Sinh viên", icon: Users },
      { id: "admin-lecturers", label: "Giảng viên", icon: UserCheck },
      { id: "admin-companies", label: "Doanh nghiệp", icon: Building2 },
      { id: "admin-assignments", label: "Phân công hướng dẫn", icon: UserPlus },
      { id: "admin-templates", label: "Biểu mẫu & Tài liệu", icon: FileText },
    ],
  },
  {
    title: "VẬN HÀNH KỲ THỰC TẬP",
    items: [
      { id: "admin-attendance", label: "Điểm danh & Buổi gặp", icon: CalendarCheck },
      { id: "admin-report-archive", label: "Kho hồ sơ lưu trữ", icon: Archive },
      { id: "admin-notifications", label: "Thông báo", icon: Bell },
    ],
  },
  {
    title: "TỔNG KẾT KỲ THỰC TẬP",
    items: [{ id: "admin-summary", label: "Báo cáo tổng kết", icon: ClipboardList }],
  },
  {
    title: "HỆ THỐNG & CÁ NHÂN",
    items: [
      { id: "admin-departments", label: "Khoa", icon: Building2 },
      { id: "admin-users", label: "Người dùng", icon: KeyRound },
      { id: "admin-settings", label: "Cài đặt", icon: Settings },
      { id: "admin-backups", label: "Sao lưu & Khôi phục", icon: DatabaseBackup },
      { id: "admin-account", label: "Tài khoản", icon: User },
    ],
  },
];

const ADMIN_PAGE_TITLES: Record<string, string> = {
  "admin-config": "Cấu hình bảng",
  "admin-config/grid": "Cấu hình bảng",
  "admin-config/field-policies": "Chính sách trường dữ liệu",
  "admin-config/grading-rules": "Quy chế điểm & deadline",
  "admin-config/import-excel": "Nhập dữ liệu từ Excel",
  "admin-functions": "Quản lý chức năng",
  "admin-system/permissions": "Phân quyền chức năng",
  "admin-logs/audit": "Nhật ký kiểm toán",
  "admin-account-requests": "Yêu cầu tài khoản",
};

export function getAdminPageTitle(tab: string): string {
  const normalized = tab?.startsWith("admin-") ? tab : `admin-${tab || "dashboard"}`;
  return ADMIN_PAGE_TITLES[normalized]
    ?? ADMIN_NAVIGATION_SECTIONS.flatMap((section) => section.items)
      .find((item) => item.id === normalized)?.label
    ?? "Tổng quan";
}
