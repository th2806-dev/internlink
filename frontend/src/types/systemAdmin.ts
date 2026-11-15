export interface SysRole {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export interface SystemImpersonationTarget {
  roleId: number;
  roleCode: string;
  roleName: string;
}

export interface SystemImpersonationContext extends SystemImpersonationTarget {
  startedAt: string;
  isVisualOnly: boolean;
}

export interface RolePermissionRow {
  moduleCode: string;
  featureCode: string;
  functionName: string;
  sortOrder: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canImport: boolean;
  canPrint: boolean;
  canApprove: boolean;
}

export interface GradingRuleSet {
  id: number | null;
  semesterId: string;
  departmentId: string | null;
  ruleSetName: string;
  processScoreWeight: number;
  examScoreWeight: number;
  employerScoreWeight: number;
  requiredWeeklyReportsCount: number;
  stepPenaltyPerLateReport: number;
  stepPenaltyPerMissingReport: number;
  requireFinalReportForExamEligibility: boolean;
  weeklyDeadlineDay: number;
  latePenaltyPointsPerDay: number;
  minimumPassingScore: number;
}

export interface AuditLogEntry {
  id: number;
  createdAt: string;
  actionType: "CREATE" | "UPDATE" | "SOFT_DELETE";
  tableName: string;
  recordId: string;
  username: string | null;
  userId: string | null;
  functionCode: string | null;
  ipAddress: string | null;
  oldValuesJson: string | null;
  newValuesJson: string | null;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
}
