import { useAuth } from "./useAuth";

/**
 * Admin portal capabilities.
 * Direction (per approved plan): "Quản trị hệ thống" (Super Admin) = system overview
 * (read-only on department ops); "Quản trị khoa" (Department Admin) = full mutation
 * within their department.
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
  const roleDisplayLabel = isSuperAdmin ? "Quản trị hệ thống" : "Quản trị khoa";

  return {
    user,
    isSuperAdmin,
    isDepartmentAdmin,
    canMutateOps,
    canManageSystem,
    roleDisplayLabel,
  };
}
