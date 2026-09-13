import { useAuth } from "./useAuth";

/**
 * Admin portal capabilities.
 * Direction: Super Admin = system overview (read-only on department ops);
 * Department Admin = full mutation within their department.
 */
export function useAdminCapabilities() {
  const { user } = useAuth();
  const normalizedBackendRole = user?.backendRole?.toLowerCase();
  const isSuperAdmin = normalizedBackendRole === "superadmin";
  const isDepartmentAdmin = normalizedBackendRole === "departmentadmin";
  /** Faculty/department operational CRUD (SV, GV, DN, phân công, kỳ, biểu mẫu, …). */
  const canMutateOps = !isSuperAdmin;
  /** System-level actions (khoa, settings, tạo Admin khoa). */
  const canManageSystem = isSuperAdmin;
  const roleDisplayLabel = isSuperAdmin ? "Super Admin" : "Admin khoa";

  return {
    user,
    isSuperAdmin,
    isDepartmentAdmin,
    canMutateOps,
    canManageSystem,
    roleDisplayLabel,
  };
}
