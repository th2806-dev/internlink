import type { SystemMenuItem } from "../types/system";

export interface SystemMenuRoute {
  item: SystemMenuItem;
  groupName: string;
  parentName: string | null;
}

const SUPERADMIN_MENU_GROUPS: Record<string, string> = {
  DASHBOARD: "CHỈ HUY NỀN TẢNG",
  "SYSTEM.ANNOUNCEMENTS": "CHỈ HUY NỀN TẢNG",
  TENANTS: "ĐƠN VỊ & BẢN QUYỀN",
  LICENSES: "ĐƠN VỊ & BẢN QUYỀN",
  BILLING: "ĐƠN VỊ & BẢN QUYỀN",
  SSO_HUB: "KẾT NỐI & TÍCH HỢP",
  API_GATEWAY: "KẾT NỐI & TÍCH HỢP",
  OBSERVABILITY: "HẠ TẦNG & JOBS",
  "SYSTEM.SECURITY_SESSIONS": "HẠ TẦNG & AN NINH",
  "SYSTEM.BACKUPS": "HẠ TẦNG & JOBS",
  COMPLIANCE: "QUẢN TRỊ & TUÂN THỦ",
  AUDIT: "QUẢN TRỊ & TUÂN THỦ",
  SYSTEM: "QUẢN TRỊ & TUÂN THỦ",
  ACCOUNTS: "QUẢN TRỊ & TUÂN THỦ",
  CONFIG: "QUẢN TRỊ & TUÂN THỦ",
  IT_CONFIG: "QUẢN TRỊ & TUÂN THỦ",
  API_WEBHOOK: "QUẢN TRỊ & TUÂN THỦ",
  DEPARTMENTS: "QUẢN TRỊ & TUÂN THỦ",
  GRID_CONFIG: "QUẢN TRỊ & TUÂN THỦ",
  FIELD_POLICIES: "QUẢN TRỊ & TUÂN THỦ",
};
const HIDDEN_INTERNAL_ROUTES = new Set([
  "/admin/config/grid",
  "/admin/config/field-policies",
]);

export const SUPERADMIN_SECTION_PRIORITY: Record<string, number> = {
  "CHỈ HUY NỀN TẢNG": 10,
  "ĐƠN VỊ & BẢN QUYỀN": 20,
  "HẠ TẦNG & AN NINH": 30,
  "HẠ TẦNG & JOBS": 31,
  "KẾT NỐI & TÍCH HỢP": 40,
  "QUẢN TRỊ & TUÂN THỦ": 50,
};

export const SUPERADMIN_ITEM_PRIORITY: Record<string, number> = {
  "/admin/dashboard": 10,
  "/admin/announcements": 11,
  "/admin/tenants": 20,
  "/admin/licenses": 21,
  "/admin/billing": 22,
  "/admin/security/sessions": 30,
  "/admin/observability": 31,
  "/admin/sso-hub": 40,
  "/admin/api-gateway": 41,
  "/admin/functions": 50,
  "/admin/users": 50,
  "/admin/system/permissions": 51,
  "/admin/settings": 52,
  "/admin/logs/audit": 53,
  "/admin/compliance": 54,
};

export function sortSuperAdminRoutes(
  routes: SystemMenuRoute[],
): SystemMenuRoute[] {
  return [...routes].sort((left, right) => {
    const leftSection = SUPERADMIN_SECTION_PRIORITY[left.groupName] ?? 900;
    const rightSection = SUPERADMIN_SECTION_PRIORITY[right.groupName] ?? 900;
    if (leftSection !== rightSection) return leftSection - rightSection;
    const leftItem = SUPERADMIN_ITEM_PRIORITY[left.item.funcUrl ?? ""] ?? 800;
    const rightItem = SUPERADMIN_ITEM_PRIORITY[right.item.funcUrl ?? ""] ?? 800;
    if (leftItem !== rightItem) return leftItem - rightItem;
    return left.item.sortOrder - right.item.sortOrder
      || left.item.name.localeCompare(right.item.name, "vi");
  });
}

export function getSystemMenuRoutes(menu: SystemMenuItem[]): SystemMenuRoute[] {
  const routes: SystemMenuRoute[] = [];

  const visit = (
    item: SystemMenuItem,
    inheritedGroupName: string,
    parentName: string | null,
  ) => {
    const groupName = item.groupName || inheritedGroupName;
    if (item.funcUrl && !HIDDEN_INTERNAL_ROUTES.has(normalizePath(item.funcUrl))) {
      routes.push({ item, groupName, parentName });
    }
    for (const child of item.children) {
      visit(child, groupName, item.name);
    }
  };

  for (const root of menu) {
    const groupName = root.groupName || root.name;
    visit(root, groupName, null);
  }

  return routes;
}

export function getSuperAdminMenuGroup(item: SystemMenuItem): string {
  return SUPERADMIN_MENU_GROUPS[item.code] ?? SUPERADMIN_MENU_GROUPS[item.moduleCode] ?? "QUẢN TRỊ & TUÂN THỦ";
}

export function findSystemMenuRoute(
  menu: SystemMenuItem[],
  pathname: string,
): SystemMenuRoute | undefined {
  const targetPath = normalizePath(pathname);
  return getSystemMenuRoutes(menu).find(({ item }) => {
    if (!item.funcUrl) return false;
    const menuPath = normalizePath(item.funcUrl);
    return targetPath === menuPath || targetPath.startsWith(`${menuPath}/`);
  });
}

export function getSystemMenuItemId(item: SystemMenuItem): string {
  return `admin-${(item.funcUrl ?? "/admin/dashboard").replace(/^\/admin\/?/, "")}`;
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\/+$/, "");
  return normalized || "/";
}
