import { apiRequest } from "../lib/apiClient";

export interface SystemCatalogOption {
  value: string;
  label: string;
  logoUrl?: string | null;
}

export interface SystemCatalogResponse {
  vietQrBanks: SystemCatalogOption[];
  billingPlans: SystemCatalogOption[];
  billingCycles: number[];
  paymentMethods: SystemCatalogOption[];
  announcementTypes: SystemCatalogOption[];
  announcementAudiences: SystemCatalogOption[];
}

export const systemCatalogService = {
  getCatalog: (signal?: AbortSignal) =>
    apiRequest<SystemCatalogResponse>("/api/v1/system/catalogs", {
      skipCache: true,
      signal,
    }),
};
