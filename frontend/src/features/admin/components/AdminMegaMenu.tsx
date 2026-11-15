import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  LayoutGrid,
  LogOut,
  UserRound,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { systemService } from "../../../services/system.service";
import type { SystemMenuItem } from "../../../types/system";

type AdminMenuItem = {
  label: string;
  destination?: string;
  action?: "logout";
};

type AdminMenuSection = {
  title: string;
  items: AdminMenuItem[];
};

const GRID_CONFIG_ITEM: AdminMenuItem = {
  label: "Cấu hình bảng",
  destination: "admin-config/grid",
};

const SECTIONS: AdminMenuSection[] = [
  {
    title: "HỆ THỐNG",
    items: [
      { label: "Chức năng", destination: "admin-functions" },
      { label: "Nhóm thành viên" },
      { label: "Thành viên", destination: "admin-users" },
      { label: "Phân nhóm thành viên" },
      { label: "Phân quyền chức năng", destination: "admin-system/permissions" },
    ],
  },
  {
    title: "TÀI KHOẢN",
    items: [
      { label: "Thông tin thành viên", destination: "admin-account" },
      { label: "Đổi mật khẩu", destination: "admin-account" },
      { label: "Đăng xuất", action: "logout" },
      { label: "Nhật ký đăng nhập cá nhân" },
    ],
  },
  {
    title: "CẤU HÌNH",
    items: [
      { ...GRID_CONFIG_ITEM, label: "Định nghĩa màu column" },
      { ...GRID_CONFIG_ITEM, label: "Ẩn / hiện column" },
      { ...GRID_CONFIG_ITEM, label: "Điều chỉnh độ rộng cột" },
      { ...GRID_CONFIG_ITEM, label: "Cấu hình đóng băng cột" },
      { ...GRID_CONFIG_ITEM, label: "Cấu hình grid field" },
      { label: "Chính sách trường dữ liệu", destination: "admin-config/field-policies" },
      { label: "Multi Language" },
      { label: "Drill Down" },
      { label: "Ngày filter mặc định" },
      { label: "Quản lý Help Guide" },
      { label: "Cấu hình số phiếu" },
      { label: "Cấu hình Grid UI Global" },
      { label: "Quy chế điểm & deadline", destination: "admin-config/grading-rules" },
    ],
  },
  {
    title: "NHẬT KÝ",
    items: [
      { label: "Nhật ký đăng nhập", destination: "admin-logs/audit" },
      { label: "Nhật ký Import Excel" },
      { label: "Nhật ký truy cập tính năng" },
      { label: "Record Action History (CRUD)", destination: "admin-logs/audit" },
      { label: "Log API" },
      { label: "Nhật ký Export Excel" },
    ],
  },
  {
    title: "CẤU HÌNH IT",
    items: [
      { label: "Cấu hình mẫu in phiếu" },
      { label: "Nhập sinh viên từ Excel", destination: "admin-config/import-excel" },
      { label: "Cấu hình mẫu Import Excel" },
      { label: "Nhóm PDA" },
      { label: "Phân nhóm PDA" },
      { label: "Cấu hình chức năng App" },
      { label: "Cấu hình Component App" },
      { label: "Reset mật khẩu thành viên", destination: "admin-users" },
    ],
  },
  {
    title: "API, WEBHOOK",
    items: [
      { label: "API Source" },
      { label: "Cấu hình sử dụng API Source" },
      { label: "Webhook" },
      { label: "Cấu hình gửi Webhook" },
      { label: "Daily Schedule job" },
      { label: "Luồng chạy ngầm liên tục" },
      { label: "Garbage collector Info" },
    ],
  },
];

function getAdminDestination(path: string | null): string | undefined {
  if (!path) return undefined;
  const normalizedPath = path.trim();
  if (!normalizedPath.startsWith("/admin/")) return undefined;
  return `admin-${normalizedPath.slice("/admin/".length)}`;
}

function getRouteItems(node: SystemMenuItem): AdminMenuItem[] {
  const ownRoute = getAdminDestination(node.funcUrl);
  const childRoutes = node.children.flatMap(getRouteItems);
  return ownRoute
    ? [{ label: node.name, destination: ownRoute }]
    : childRoutes;
}

function toDynamicSections(menu: SystemMenuItem[]): AdminMenuSection[] {
  return menu
    .map((module) => ({
      title: module.name.toLocaleUpperCase("vi-VN"),
      items: getRouteItems(module),
    }))
    .filter((section) => section.items.length > 0);
}

interface AdminMegaMenuProps {
  onNavigate: (tab: string) => void;
  onShowToast: (message: string) => void;
  onLogout?: () => void;
}

export function AdminMegaMenu({
  onNavigate,
  onShowToast,
  onLogout,
}: AdminMegaMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dynamicSections, setDynamicSections] = useState<AdminMenuSection[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    systemService.getMyMenu()
      .then((menu) => {
        if (active) setDynamicSections(toDynamicSections(menu));
      })
      .catch(() => {
        if (active) setDynamicSections(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target))
        setIsOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [isOpen]);

  const handleItemClick = (item: AdminMenuItem) => {
    setIsOpen(false);
    if (item.action === "logout") {
      onLogout?.();
      return;
    }
    if (item.destination) {
      onNavigate(item.destination);
      return;
    }
    onShowToast("Tính năng đang được phát triển theo cấu hình đơn vị.");
  };
  const sections = dynamicSections?.length ? dynamicSections : SECTIONS;

  return (
    <div ref={rootRef} className="contents">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Hệ Thống & Cấu Hình"
        aria-expanded={isOpen}
        aria-controls="admin-mega-menu"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#026aa7]/20 bg-[#026aa7]/5 px-3 text-xs font-semibold text-[#026aa7] transition-colors hover:border-[#026aa7]/30 hover:bg-[#026aa7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
      >
        <LayoutGrid aria-hidden="true" className="h-4 w-4 text-[#026aa7]" />
        <span className="hidden 2xl:inline">Hệ Thống &amp; Cấu Hình</span>
        <span className="2xl:hidden">Hệ thống</span>
      </button>

      {isOpen && (
        <div
          id="admin-mega-menu"
          className="absolute inset-x-0 top-full z-50 border-y border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          <div className="mx-auto max-h-[min(74dvh,680px)] max-w-[1300px] overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
            <nav
              aria-label="Menu hệ thống và cấu hình"
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
            >
              {sections.map((section) => (
                <section
                  key={section.title}
                  aria-labelledby={`admin-menu-${section.title}`}
                  className="min-w-0 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3"
                >
                  <h2
                    id={`admin-menu-${section.title}`}
                    className="mb-2 border-b border-slate-200 pb-2 text-[11px] font-bold tracking-[0.08em] text-[#026aa7] uppercase"
                  >
                    {section.title}
                  </h2>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => {
                      const isLogout = item.action === "logout";
                      const ItemIcon = isLogout
                        ? LogOut
                        : item.destination === "admin-account"
                          ? UserRound
                          : ChevronRight;
                      return (
                        <li key={item.label}>
                          <button
                            type="button"
                            onClick={() => handleItemClick(item)}
                            className="group flex min-h-9 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs leading-5 text-slate-700 transition-colors hover:bg-[#026aa7]/10 hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                          >
                            <ItemIcon
                              aria-hidden="true"
                              className={`h-3.5 w-3.5 shrink-0 ${isLogout
                                  ? "text-rose-500"
                                  : "text-slate-400 group-hover:text-[#026aa7]"
                                }`}
                            />
                            <span className="min-w-0 flex-1">{item.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
