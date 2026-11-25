import { apiRequest } from "../lib/apiClient";

export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimitPerMinute: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKeySecretResponse {
  apiKey: ApiKeyResponse;
  secret: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  rateLimitPerMinute: number;
  expiresAt: string | null;
}

export type UpdateApiKeyRequest = CreateApiKeyRequest & { isActive: boolean };

export interface WebhookResponse {
  id: string;
  url: string;
  eventType: string;
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastStatus: string | null;
  createdAt: string;
}

export interface CreateWebhookResponse {
  webhook: WebhookResponse;
  secret: string;
}

export interface WebhookDeliveryResponse {
  id: string;
  deliveryId: string;
  webhookId: string;
  eventType: string;
  status: string;
  attemptNumber: number;
  httpStatusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface SystemHealthProbe {
  name: "sql" | "redis" | "s3" | "smtp" | string;
  label: string;
  status: "Healthy" | "Unhealthy" | "NotConfigured" | string;
  durationMs: number;
  detail: string;
  metrics: Record<string, string | null>;
}

export interface SystemHealthResponse {
  checkedAt: string;
  probes: SystemHealthProbe[];
}

export interface JobExecutionResponse {
  id: string;
  jobCode: string;
  status: string;
  triggeredBy: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  resultSummary: string | null;
  errorMessage: string | null;
}

export interface SystemJobResponse {
  jobCode: string;
  jobName: string;
  cronExpression: string;
  description: string | null;
  isEnabled: boolean;
  status: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastDurationMs: number | null;
  lastErrorMessage: string | null;
  recentExecutions: JobExecutionResponse[];
}

export interface SystemJobsDashboardResponse {
  jobs: SystemJobResponse[];
  recentExecutions: JobExecutionResponse[];
}

export const systemApiGatewayService = {
  getApiKeys: (tenantId: string, signal?: AbortSignal) =>
    apiRequest<ApiKeyResponse[]>(
      `/api/v1/system/tenants/${tenantId}/api-keys`,
      { skipCache: true, signal },
    ),

  createApiKey: (tenantId: string, request: CreateApiKeyRequest) =>
    apiRequest<ApiKeySecretResponse>(
      `/api/v1/system/tenants/${tenantId}/api-keys`,
      { method: "POST", body: request },
    ),

  updateApiKey: (tenantId: string, id: string, request: UpdateApiKeyRequest) =>
    apiRequest<ApiKeyResponse>(
      `/api/v1/system/tenants/${tenantId}/api-keys/${id}`,
      { method: "PUT", body: request },
    ),

  deleteApiKey: (tenantId: string, id: string) =>
    apiRequest<void>(
      `/api/v1/system/tenants/${tenantId}/api-keys/${id}`,
      { method: "DELETE" },
    ),

  rotateApiKey: (tenantId: string, id: string) =>
    apiRequest<ApiKeySecretResponse>(
      `/api/v1/system/tenants/${tenantId}/api-keys/${id}/rotate-secret`,
      { method: "POST" },
    ),

  getWebhooks: (tenantId: string, signal?: AbortSignal) =>
    apiRequest<WebhookResponse[]>(
      `/api/v1/system/tenants/${tenantId}/webhooks`,
      { skipCache: true, signal },
    ),

  createWebhook: (tenantId: string, request: { url: string; eventType: string }) =>
    apiRequest<CreateWebhookResponse>(
      `/api/v1/system/tenants/${tenantId}/webhooks`,
      { method: "POST", body: request },
    ),

  updateWebhook: (
    tenantId: string,
    id: string,
    request: { url: string; eventType: string; isActive: boolean },
  ) =>
    apiRequest<WebhookResponse>(
      `/api/v1/system/tenants/${tenantId}/webhooks/${id}`,
      { method: "PUT", body: request },
    ),

  deleteWebhook: (tenantId: string, id: string) =>
    apiRequest<void>(
      `/api/v1/system/tenants/${tenantId}/webhooks/${id}`,
      { method: "DELETE" },
    ),

  testWebhook: (tenantId: string, id: string) =>
    apiRequest<WebhookDeliveryResponse>(
      `/api/v1/system/tenants/${tenantId}/webhooks/${id}/test`,
      { method: "POST" },
    ),

  getDeadLetters: (tenantId: string, signal?: AbortSignal) =>
    apiRequest<WebhookDeliveryResponse[]>(
      `/api/v1/system/tenants/${tenantId}/webhook-deliveries/dead-letter-queue`,
      { skipCache: true, signal },
    ),

  retryDelivery: (tenantId: string, id: string) =>
    apiRequest<WebhookDeliveryResponse>(
      `/api/v1/system/tenants/${tenantId}/webhook-deliveries/${id}/retry`,
      { method: "POST" },
    ),

  getHealth: (signal?: AbortSignal) =>
    apiRequest<SystemHealthResponse>("/api/v1/system/health/probes", {
      skipCache: true,
      signal,
    }),

  getJobs: (signal?: AbortSignal) =>
    apiRequest<SystemJobsDashboardResponse>("/api/v1/system/jobs", {
      skipCache: true,
      signal,
    }),

  triggerJob: (jobCode: string) =>
    apiRequest<JobExecutionResponse>(
      `/api/v1/system/jobs/${encodeURIComponent(jobCode)}/run`,
      { method: "POST" },
    ),

  setJobEnabled: (jobCode: string, isEnabled: boolean) =>
    apiRequest<SystemJobResponse>(
      `/api/v1/system/jobs/${encodeURIComponent(jobCode)}/enabled`,
      { method: "PATCH", body: { isEnabled } },
    ),

  setJobSchedule: (jobCode: string, cronExpression: string) =>
    apiRequest<SystemJobResponse>(
      `/api/v1/system/jobs/${encodeURIComponent(jobCode)}/schedule`,
      { method: "PUT", body: { cronExpression } },
    ),
};
