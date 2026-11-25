import { apiRequest } from "../lib/apiClient";

export interface DataRetentionPolicy {
  code: string;
  name: string;
  description: string;
  retentionYears: number;
  isEnabled: boolean;
  updatedAt: string | null;
}

export interface AnonymizationPreview {
  eligibleStudentCount: number;
  retentionYears: number;
  eligibleBefore: string;
  isEnabled: boolean;
}

export interface ComplianceLog {
  id: string;
  operationCode: string;
  status: string;
  affectedCount: number;
  retentionYears: number;
  cutoffAt: string;
  executedAt: string;
  triggeredBy: string;
  details: string | null;
}

export interface ComplianceExecution {
  id: string;
  operationCode: string;
  status: string;
  affectedCount: number;
  retentionYears: number;
  cutoffAt: string;
  executedAt: string;
  triggeredBy: string;
}

export const systemComplianceService = {
  getPolicies: (signal?: AbortSignal) =>
    apiRequest<DataRetentionPolicy[]>("/api/v1/system/compliance/policies", {
      skipCache: true,
      signal,
    }),

  updatePolicy: (code: string, retentionYears: number, isEnabled: boolean) =>
    apiRequest<DataRetentionPolicy>(`/api/v1/system/compliance/policies/${encodeURIComponent(code)}`, {
      method: "PUT",
      body: { retentionYears, isEnabled },
    }),

  getAnonymizationPreview: (signal?: AbortSignal) =>
    apiRequest<AnonymizationPreview>("/api/v1/system/compliance/anonymize/preview", {
      skipCache: true,
      signal,
    }),

  executeAnonymization: (expectedEligibleCount: number, confirmationPhrase: string) =>
    apiRequest<ComplianceExecution>("/api/v1/system/compliance/anonymize/execute", {
      method: "POST",
      body: { expectedEligibleCount, confirmationPhrase },
    }),

  getAuditLogs: (page = 1, pageSize = 25, signal?: AbortSignal) =>
    apiRequest<ComplianceLog[]>(
      `/api/v1/system/compliance/audit-logs?page=${page}&pageSize=${pageSize}`,
      { skipCache: true, signal },
    ),
};
