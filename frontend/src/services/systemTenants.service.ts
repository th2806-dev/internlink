import { apiRequest, downloadAuthenticatedFile } from "../lib/apiClient";

export type TenantType = 1 | 2 | 3;
export type TenantStatus = 1 | 2 | 3 | 4;
export type LicenseTier = 1 | 2 | 3;

export interface TenantDirectoryItem {
  id: string;
  tenantCode: string;
  name: string;
  logoUrl: string | null;
  subdomain: string;
  tenantType: TenantType;
  domain: string | null;
  contactEmail: string;
  contactPhone: string;
  status: TenantStatus;
  departmentCount: number;
  activeStudentCount: number;
  activeLecturerCount: number;
  licenseTier: LicenseTier | null;
  maxStudentsQuota: number | null;
  licenseValidTo: string | null;
}

export interface TenantDirectoryPage {
  items: TenantDirectoryItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface TenantDetails {
  tenant: TenantDirectoryItem;
  legalName: string;
  createdAt: string;
  departmentNames: string[];
  administratorContacts: { displayName: string; email: string }[];
}

export interface TenantLicenseHistoryItem {
  id: string;
  licenseTier: LicenseTier;
  maxStudentsQuota: number;
  maxLecturersQuota: number;
  storageQuotaBytes: number;
  validFrom: string;
  validTo: string;
  autoRenew: boolean;
  isActive: boolean;
}

export interface TenantLicenseStudio {
  tenantId: string;
  tenantName: string;
  licenseId: string | null;
  licenseTier: LicenseTier | null;
  activeStudents: number;
  maxStudentsQuota: number;
  activeLecturers: number;
  maxLecturersQuota: number;
  currentStorageBytes: number;
  storageQuotaBytes: number;
  validFrom: string | null;
  validTo: string | null;
  autoRenew: boolean;
  isActive: boolean;
  history: TenantLicenseHistoryItem[];
}

export interface CreateTenantRequest {
  tenantCode: string;
  name: string;
  legalName: string;
  subdomain: string;
  tenantType: TenantType;
  contactEmail: string;
  contactPhone: string;
  planCode: string;
  validTo: string;
}

export interface UpdateTenantRequest {
  name: string;
  legalName: string;
  domain: string | null;
  contactEmail: string;
  contactPhone: string;
}

export interface UpdateLicenseRequest {
  planCode: string;
  validTo: string;
  autoRenew: boolean;
}

export const systemTenantsService = {
  getTenants: (filters: {
    search: string;
    tenantType: string;
    status: string;
    page: number;
    pageSize: number;
  }, signal?: AbortSignal) => {
    const query = new URLSearchParams({
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    });
    if (filters.search) query.set("search", filters.search);
    if (filters.tenantType) query.set("tenantType", filters.tenantType);
    if (filters.status) query.set("status", filters.status);
    return apiRequest<TenantDirectoryPage>(
      `/api/v1/system/tenants?${query.toString()}`,
      { skipCache: true, signal },
    );
  },

  getAllTenants: async (signal?: AbortSignal): Promise<TenantDirectoryItem[]> => {
    const pageSize = 100;
    const firstPage = await systemTenantsService.getTenants(
      { search: "", tenantType: "", status: "", page: 1, pageSize },
      signal,
    );
    const tenants = [...firstPage.items];
    const pageCount = Math.ceil(firstPage.totalCount / pageSize);

    for (let page = 2; page <= pageCount; page += 1) {
      const result = await systemTenantsService.getTenants(
        { search: "", tenantType: "", status: "", page, pageSize },
        signal,
      );
      tenants.push(...result.items);
    }

    return tenants;
  },

  createTenant: (request: CreateTenantRequest) =>
    apiRequest<TenantDetails>("/api/v1/system/tenants", {
      method: "POST",
      body: request,
    }),

  getTenant: (id: string, signal?: AbortSignal) =>
    apiRequest<TenantDetails>(`/api/v1/system/tenants/${id}`, {
      skipCache: true,
      signal,
    }),

  exportTenant: (id: string) =>
    downloadAuthenticatedFile(
      `/api/v1/system/tenants/${id}/export`,
      `tenant-${id}-data.zip`,
    ),

  updateTenant: (id: string, request: UpdateTenantRequest) =>
    apiRequest<TenantDetails>(`/api/v1/system/tenants/${id}`, {
      method: "PUT",
      body: request,
    }),

  updateStatus: (id: string, status: TenantStatus) =>
    apiRequest<TenantDetails>(`/api/v1/system/tenants/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),

  getLicense: (tenantId: string, signal?: AbortSignal) =>
    apiRequest<TenantLicenseStudio>(
      `/api/v1/system/tenants/${tenantId}/license`,
      { skipCache: true, signal },
    ),

  updateLicense: (tenantId: string, request: UpdateLicenseRequest) =>
    apiRequest<TenantLicenseStudio>(
      `/api/v1/system/tenants/${tenantId}/license`,
      { method: "PUT", body: request },
    ),
};

export function tenantTypeLabel(type: TenantType): string {
  return type === 1 ? "Đại học" : type === 2 ? "Doanh nghiệp" : "Cơ quan";
}

export function tenantStatusLabel(status: TenantStatus): string {
  switch (status) {
    case 1:
      return "Đang hoạt động";
    case 2:
      return "Dùng thử";
    case 3:
      return "Tạm dừng";
    case 4:
      return "Đã hết hạn";
    default:
      return "Không xác định";
  }
}

export function licenseTierLabel(tier: LicenseTier | null): string {
  return tier === 1
    ? "Tiêu chuẩn"
    : tier === 2
      ? "Chuyên nghiệp"
      : tier === 3
        ? "Doanh nghiệp"
        : "Chưa cấp";
}
