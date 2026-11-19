import type { SystemMenuItem } from "../types/system";

export interface SystemMenuRoute {
  item: SystemMenuItem;
  groupName: string;
  parentName: string | null;
}

export function getSystemMenuRoutes(menu: SystemMenuItem[]): SystemMenuRoute[] {
  const routes: SystemMenuRoute[] = [];

  const visit = (
    item: SystemMenuItem,
    inheritedGroupName: string,
    parentName: string | null,
  ) => {
    const groupName = item.groupName || inheritedGroupName;
    if (item.funcUrl) routes.push({ item, groupName, parentName });
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
