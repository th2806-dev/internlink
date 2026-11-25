import { apiRequest } from "../lib/apiClient";
import type {
  AuditLogPage,
  EmployerRubricConfig,
  GradingRuleSet,
  RolePermissionRow,
  SaveEmployerRubricConfig,
  SystemImpersonationContext,
  SystemImpersonationTarget,
  SysRole,
  TenantSupportSession,
} from "../types/systemAdmin";

export const systemAdminService = {
  getRoles: () =>
    apiRequest<SysRole[]>("/api/v1/system/roles", { skipCache: true }),

  getImpersonationTargets: () =>
    apiRequest<SystemImpersonationTarget[]>(
      "/api/v1/system/impersonation/available-targets",
      { skipCache: true },
    ),

  startImpersonation: (roleCode: string) =>
    apiRequest<SystemImpersonationContext>(
      "/api/v1/system/impersonation/token",
      { method: "POST", body: { roleCode } },
    ),

  startTenantSupport: (tenantId: string, reason: string) =>
    apiRequest<TenantSupportSession>(
      `/api/v1/system/tenants/${tenantId}/impersonate`,
      { method: "POST", body: { reason } },
    ),

  endTenantSupport: () =>
    apiRequest<{ sessionId: string; endedAt: string }>(
      "/api/v1/system/impersonate/exit",
      { method: "POST" },
    ),

  getRolePermissions: (roleId: number) =>
    apiRequest<RolePermissionRow[]>(
      `/api/v1/system/roles/${roleId}/permissions`,
      { skipCache: true },
    ),

  saveRolePermissions: (roleId: number, rows: RolePermissionRow[]) =>
    apiRequest<RolePermissionRow[]>(
      `/api/v1/system/roles/${roleId}/permissions`,
      {
        method: "PUT",
        body: rows.map((row) => ({
          moduleCode: row.moduleCode,
          canView: row.canView,
          canCreate: row.canCreate,
          canEdit: row.canEdit,
          canDelete: row.canDelete,
          canExport: row.canExport,
          canImport: row.canImport,
          canPrint: row.canPrint,
          canApprove: row.canApprove,
          canLock: row.canLock,
        })),
      },
    ),

  resetRolePermissions: (roleId: number) =>
    apiRequest<RolePermissionRow[]>(
      `/api/v1/system/roles/${roleId}/permissions/reset`,
      { method: "POST" },
    ),

  getGradingRuleSet: (semesterId: string, departmentId: string | null) => {
    const query = new URLSearchParams({ semesterId });
    if (departmentId) query.set("departmentId", departmentId);
    return apiRequest<GradingRuleSet>(
      `/api/v1/system/grading-rule-sets?${query.toString()}`,
      { skipCache: true },
    );
  },

  saveGradingRuleSet: (rules: GradingRuleSet) => {
    const query = new URLSearchParams({ semesterId: rules.semesterId });
    if (rules.departmentId) query.set("departmentId", rules.departmentId);
    return apiRequest<GradingRuleSet>(
      `/api/v1/system/grading-rule-sets?${query.toString()}`,
      {
        method: "PUT",
        body: rules,
      },
    );
  },

  getEmployerRubric: (semesterId: string, departmentId: string | null) => {
    const query = new URLSearchParams({ semesterId });
    if (departmentId) query.set("departmentId", departmentId);
    return apiRequest<EmployerRubricConfig | null>(
      `/api/v1/system/employer-rubrics?${query.toString()}`,
      { skipCache: true },
    );
  },

  saveEmployerRubric: (
    semesterId: string,
    departmentId: string | null,
    rubric: SaveEmployerRubricConfig,
  ) => {
    const query = new URLSearchParams({ semesterId });
    if (departmentId) query.set("departmentId", departmentId);
    return apiRequest<EmployerRubricConfig>(
      `/api/v1/system/employer-rubrics?${query.toString()}`,
      { method: "PUT", body: rubric },
    );
  },

  getAuditLogs: (filters: {
    from: string;
    to: string;
    actionType: string;
    tableName: string;
    page: number;
    pageSize: number;
  }) => {
    const query = new URLSearchParams({
      from: filters.from,
      to: filters.to,
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    });
    if (filters.actionType) query.set("actionType", filters.actionType);
    if (filters.tableName) query.set("tableName", filters.tableName);
    return apiRequest<AuditLogPage>(
      `/api/v1/system/audit-logs?${query.toString()}`,
      { skipCache: true },
    );
  },
};
