import { apiRequest } from "../lib/apiClient";

export type BillingInvoiceStatus = "PendingPayment" | "Paid" | "Cancelled" | "Overdue";
export type BillingPaymentMethod = "VietQR" | "BankTransfer";

export interface TenantBillingInvoice {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  invoiceNumber: string;
  planCode: string;
  planName: string;
  baseAmountVnd: number;
  taxRatePercent: number;
  taxAmountVnd: number;
  amountVnd: number;
  billingCycleMonths: number;
  maxStudentsQuota: number;
  maxLecturersQuota: number;
  storageQuotaBytes: number;
  status: BillingInvoiceStatus;
  paymentMethod: BillingPaymentMethod;
  createdAt: string;
  dueDate: string | null;
  paidAt: string | null;
  paymentReference: string | null;
}

export interface TenantBillingInvoicePage {
  items: TenantBillingInvoice[];
  page: number;
  pageSize: number;
  totalCount: number;
  summary: BillingInvoiceSummary;
}

export interface BillingInvoiceSummary {
  totalCount: number;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
  cancelledCount: number;
  totalAmountVnd: number;
  paidAmountVnd: number;
  outstandingAmountVnd: number;
}

export interface CreateTenantBillingInvoice {
  tenantId: string;
  planCode: string;
  billingCycleMonths: number;
  paymentMethod: BillingPaymentMethod;
  dueDate: string | null;
}

export interface BillingPlanOption {
  code: string;
  name: string;
  licenseTier: 1 | 2 | 3;
  maxStudentsQuota: number;
  maxLecturersQuota: number;
  storageQuotaBytes: number;
}

export interface UpdateBillingPlan {
  maxStudentsQuota: number;
  maxLecturersQuota: number;
  storageQuotaBytes: number;
}

export interface BillingPriceCatalogItem {
  id: string;
  planCode: string;
  planName: string;
  billingCycleMonths: number;
  baseAmountVnd: number;
  taxRatePercent: number | null;
  taxAmountVnd: number | null;
  totalAmountVnd: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  isUsedByInvoice: boolean;
}

export interface BillingPriceCatalog {
  plans: BillingPlanOption[];
  billingCycleOptions: number[];
  items: BillingPriceCatalogItem[];
}

export interface CreateBillingPriceCatalogItem {
  planCode: string;
  billingCycleMonths: number;
  baseAmountVnd: number;
  taxRatePercent: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface UpdateBillingPriceCatalogItem extends CreateBillingPriceCatalogItem {
  isActive: boolean;
}

export interface VietQrPayment {
  payload: string;
  bankId: string;
  accountNo: string;
  accountName: string;
  amountVnd: number;
  memo: string;
}

export interface VietQrSettings {
  bankId: string;
  accountNo: string;
  accountName: string;
  merchantCity: string;
}

export const systemBillingService = {
  getPriceCatalog: (currentOnly = false, signal?: AbortSignal) =>
    apiRequest<BillingPriceCatalog>(
      `/api/v1/system/billing/price-catalog?currentOnly=${currentOnly}`,
      { skipCache: true, signal },
    ),

  createPriceCatalogItem: (request: CreateBillingPriceCatalogItem) =>
    apiRequest<BillingPriceCatalogItem>("/api/v1/system/billing/price-catalog", {
      method: "POST",
      body: request,
    }),

  updatePriceCatalogItem: (id: string, request: UpdateBillingPriceCatalogItem) =>
    apiRequest<BillingPriceCatalogItem>(`/api/v1/system/billing/price-catalog/${id}`, {
      method: "PUT",
      body: request,
    }),

  updatePlan: (planCode: string, request: UpdateBillingPlan) =>
    apiRequest<BillingPlanOption>(`/api/v1/system/billing/price-catalog/plans/${encodeURIComponent(planCode)}`, {
      method: "PUT",
      body: request,
    }),

  getInvoices: (filters: {
    tenantId?: string;
    status?: BillingInvoiceStatus | "";
    fromDate?: string;
    toDate?: string;
    page: number;
    pageSize: number;
  }, signal?: AbortSignal) => {
    const query = new URLSearchParams({
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    });
    if (filters.tenantId) query.set("tenantId", filters.tenantId);
    if (filters.status) query.set("status", filters.status);
    if (filters.fromDate) query.set("fromDate", filters.fromDate);
    if (filters.toDate) query.set("toDate", filters.toDate);
    return apiRequest<TenantBillingInvoicePage>(
      `/api/v1/system/billing/invoices?${query.toString()}`,
      { skipCache: true, signal },
    );
  },

  createInvoice: (request: CreateTenantBillingInvoice) =>
    apiRequest<TenantBillingInvoice>("/api/v1/system/billing/invoices", {
      method: "POST",
      body: request,
    }),

  getVietQr: (invoiceId: string, signal?: AbortSignal) =>
    apiRequest<VietQrPayment>(`/api/v1/system/billing/invoices/${invoiceId}/vietqr`, {
      skipCache: true,
      signal,
    }),

  getVietQrSettings: (signal?: AbortSignal) =>
    apiRequest<VietQrSettings>("/api/v1/system/billing/vietqr-settings", {
      skipCache: true,
      signal,
    }),

  updateVietQrSettings: (settings: VietQrSettings) =>
    apiRequest<VietQrSettings>("/api/v1/system/billing/vietqr-settings", {
      method: "PUT",
      body: settings,
    }),

  previewVietQr: (settings: VietQrSettings) =>
    apiRequest<VietQrPayment>("/api/v1/system/billing/vietqr-settings/preview", {
      method: "POST",
      body: settings,
    }),

  markPaid: (invoiceId: string, paymentReference: string) =>
    apiRequest<TenantBillingInvoice>(
      `/api/v1/system/billing/invoices/${invoiceId}/mark-paid`,
      { method: "POST", body: { paymentReference } },
    ),
};

export function billingStatusLabel(status: BillingInvoiceStatus): string {
  switch (status) {
    case "PendingPayment": return "Chờ thanh toán";
    case "Paid": return "Đã thanh toán";
    case "Cancelled": return "Đã hủy";
    case "Overdue": return "Quá hạn";
  }
}
