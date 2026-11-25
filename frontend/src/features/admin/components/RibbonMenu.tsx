import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useSystemMenu } from "../../../hooks/useSystemMenu";
import {
  getSuperAdminMenuGroup,
  getSystemMenuItemId,
  getSystemMenuRoutes,
  sortSuperAdminRoutes,
} from "../../../lib/systemMenu";
import { getMenuIcon } from "../../../lib/menuIconRegistry";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";

export function RibbonMenu({
  onNavigate,
}: {
  onNavigate: (tab: string) => void;
}) {
  const menuQuery = useSystemMenu();
  const { isSuperAdmin } = useAdminCapabilities();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuItemRefs = useRef<HTMLButtonElement[]>([]);
  const toggleRefs = useRef(new Map<string, HTMLButtonElement>());
  const routes = sortSuperAdminRoutes(getSystemMenuRoutes(menuQuery.data ?? []).map((route) => ({
    ...route,
    groupName: isSuperAdmin ? getSuperAdminMenuGroup(route.item) : route.groupName,
  })));
  const dashboardRoutes = routes.filter(
    ({ item }) => item.funcUrl?.replace(/\/+$/, "") === "/admin/dashboard",
  );
  const groupedRoutes = routes.filter(
    ({ item }) => item.funcUrl?.replace(/\/+$/, "") !== "/admin/dashboard",
  );
  const sections = groupedRoutes.reduce<{ title: string; routes: typeof groupedRoutes }[]>(
    (groups, route) => {
      const title = route.groupName || route.parentName || route.item.moduleCode;
      const section = groups.find((group) => group.title === title);
      if (section) section.routes.push(route);
      else groups.push({ title, routes: [route] });
      return groups;
    },
    [],
  );

  useEffect(() => {
    if (!openGroup) return;
    const frame = window.requestAnimationFrame(() => menuItemRefs.current[0]?.focus());
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenGroup(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      toggleRefs.current.get(openGroup)?.focus();
      setOpenGroup(null);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openGroup]);

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = menuItemRefs.current.filter((item) => item?.isConnected);
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") {
      event.preventDefault();
      if (openGroup) toggleRefs.current.get(openGroup)?.focus();
      setOpenGroup(null);
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === "ArrowDown")
      nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    if (event.key === "ArrowUp")
      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      items[nextIndex]?.focus();
    }
  };

  const navigateTo = (item: (typeof routes)[number]["item"]) => {
    setOpenGroup(null);
    onNavigate(getSystemMenuItemId(item));
  };

  return (
    <nav
      ref={navRef}
      aria-label="Ribbon điều hướng quản trị"
      className="sticky top-9 z-30 min-h-8 w-full bg-[#026aa7] text-white shadow-sm"
    >
      <div className="flex min-h-8 w-full flex-wrap items-center gap-1 px-2 py-0.5 lg:flex-nowrap lg:overflow-visible">
        {menuQuery.isPending && (
          <span role="status" className="px-2 text-xs text-white/80">
            Đang tải phân hệ...
          </span>
        )}
        {menuQuery.isError && (
          <span role="alert" className="px-2 text-xs text-white">
            Không thể tải menu phân quyền.
          </span>
        )}
        {!menuQuery.isPending && !menuQuery.isError && dashboardRoutes.map(({ item }) => {
          const Icon = getMenuIcon(item.iconName);
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => navigateTo(item)}
              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[4px] px-2.5 text-xs font-semibold transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Icon aria-hidden="true" className="h-3.5 w-3.5" />
              {item.name}
            </button>
          );
        })}
        {!menuQuery.isPending &&
          !menuQuery.isError &&
          sections.map((section) => {
            const isOpen = openGroup === section.title;
            return (
              <div key={section.title} className="relative shrink-0">
                <button
                  ref={(element) => {
                    if (element) toggleRefs.current.set(section.title, element);
                    else toggleRefs.current.delete(section.title);
                  }}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  aria-controls={`ribbon-menu-${encodeURIComponent(section.title)}`}
                  onClick={() => {
                    setOpenGroup((current) =>
                      current === section.title ? null : section.title,
                    );
                    menuItemRefs.current = [];
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" && !isOpen) {
                      event.preventDefault();
                      setOpenGroup(section.title);
                    }
                  }}
                  className={`inline-flex h-7 max-w-full items-center gap-1.5 rounded-[4px] px-2.5 text-xs font-semibold transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    isOpen ? "bg-[#025a8e]" : ""
                  }`}
                >
                  <span className="max-w-56 truncate">{section.title}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div
                    id={`ribbon-menu-${encodeURIComponent(section.title)}`}
                    role="menu"
                    aria-label={section.title}
                    onKeyDown={handleMenuKeyDown}
                    className="absolute left-0 top-full z-[60] mt-1 min-w-64 max-w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-md border border-slate-200 bg-white p-1.5 text-slate-800 shadow-xl"
                  >
                    {section.routes.map(({ item }, index) => {
                      const Icon = getMenuIcon(item.iconName);
                      return (
                        <button
                          key={item.code}
                          ref={(element) => {
                            if (element) menuItemRefs.current[index] = element;
                          }}
                          type="button"
                          role="menuitem"
                          onClick={() => navigateTo(item)}
                          className="flex min-h-9 w-full items-center gap-2 rounded-[4px] px-2.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-sky-50 hover:text-[#025a8e] focus-visible:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                        >
                          <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#026aa7]" />
                          <span className="min-w-0 flex-1 truncate">{item.name}</span>
                          {item.badgeText && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                              {item.badgeText}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </nav>
  );
}
