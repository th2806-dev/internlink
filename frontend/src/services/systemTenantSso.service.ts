import { apiRequest } from "../lib/apiClient";

export type SsoProvider = "AzureAD" | "GoogleWorkspace" | "SAML2" | "CAS_LDAP";

export interface TenantSsoConfiguration {
  tenantId: string;
  isConfigured: boolean;
  providerType: SsoProvider;
  clientId: string;
  maskedClientSecret: string;
  hasClientSecret: boolean;
  discoveryUrl: string;
  allowedEmailDomains: string[];
  isEnforced: boolean;
  updatedAt: string | null;
}

export interface UpdateTenantSsoConfigurationRequest {
  providerType: SsoProvider;
  clientId: string;
  clientSecret: string;
  discoveryUrl: string;
  allowedEmailDomains: string[];
  isEnforced: boolean;
}

export interface TenantSsoDiscoveryTest {
  isSuccess: boolean;
  message: string;
  issuer: string | null;
}

export const systemTenantSsoService = {
  getConfiguration: (tenantId: string, signal?: AbortSignal) =>
    apiRequest<TenantSsoConfiguration>(
      `/api/v1/system/tenants/${tenantId}/sso`,
      { skipCache: true, signal },
    ),

  saveConfiguration: (tenantId: string, request: UpdateTenantSsoConfigurationRequest) =>
    apiRequest<TenantSsoConfiguration>(
      `/api/v1/system/tenants/${tenantId}/sso`,
      { method: "PUT", body: request },
    ),

  testDiscovery: (tenantId: string, providerType: SsoProvider, discoveryUrl: string) =>
    apiRequest<TenantSsoDiscoveryTest>(
      `/api/v1/system/tenants/${tenantId}/sso/test-discovery`,
      { method: "POST", body: { providerType, discoveryUrl } },
    ),

  deleteConfiguration: (tenantId: string) =>
    apiRequest<void>(`/api/v1/system/tenants/${tenantId}/sso`, { method: "DELETE" }),
};
