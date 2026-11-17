import { cloneElement, type ReactElement } from "react";
import { useSystemMenu } from "../../hooks/useSystemMenu";

interface PermissionGuardProps {
  functionCode: string;
  action: string;
  children: ReactElement<{ disabled?: boolean; "aria-disabled"?: boolean }>;
  mode?: "hide" | "disable";
  fallback?: ReactElement | null;
}

export function PermissionGuard({
  functionCode,
  action,
  children,
  mode = "hide",
  fallback = null,
}: PermissionGuardProps) {
  const { data: menu, isPending } = useSystemMenu();
  const permissionCode = `${functionCode}.${action}`.toUpperCase();
  const hasPermission = menu?.some((module) =>
    module.children.some((permission) => permission.code === permissionCode),
  ) ?? false;

  if (isPending || !hasPermission) {
    if (mode === "disable" && !isPending)
      return cloneElement(children, { disabled: true, "aria-disabled": true });
    return fallback;
  }

  return children;
}
