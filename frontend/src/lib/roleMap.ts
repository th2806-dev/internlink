import type { UserRole } from "../contexts/AuthContext";

/** Map backend JWT role → FE portal route role. */
export function mapBackendRole(role: string): UserRole | null {
  switch (role) {
    case "SuperAdmin":
      return "admin";
    case "DepartmentAdmin":
      return "admin"; // DepartmentAdmin uses the same admin portal
    case "Lecturer":
      return "lecturer";
    case "Student":
      return "student";
    default:
      return null;
  }
}

/** Map backend role → FE admin user filter role. */
export function mapBackendRoleToAdminUserRole(
  role: string,
): "admin" | "lecturer" | "student" | null {
  const mapped = mapBackendRole(role);
  return mapped;
}

/** FE display label for backend role string. */
export function backendRoleLabel(role: string): string {
  switch (role) {
    case "SuperAdmin":
      return "Quản trị hệ thống";
    case "DepartmentAdmin":
      return "Admin khoa";
    case "Lecturer":
      return "Giảng viên";
    case "Student":
      return "Sinh viên";
    default:
      return role;
  }
}
