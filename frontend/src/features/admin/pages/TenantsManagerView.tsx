import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit2,
  Download,
  Eye,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Wrench,
  UnlockKeyhole,
  X,
} from "lucide-react";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { useActiveTenant } from "../../../contexts/ActiveTenantContext";
import { useImpersonation } from "../../../contexts/ImpersonationContext";
import { useNavigate } from "react-router-dom";
import type { ToastType } from "../../../contexts/ToastContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { PLATFORM_PAGE_CONTENT_CLASS, PlatformPageHeader } from "../components/PlatformPageHeader";
import { PlatformTabBar } from "../components/PlatformTabBar";
import {
  licenseTierLabel,
  systemTenantsService,
  tenantStatusLabel,
  tenantTypeLabel,
  type CreateTenantRequest,
  type LicenseTier,
  type TenantDirectoryItem,
  type TenantDirectoryPage,
  type TenantStatus,
  type TenantType,
  type UpdateTenantRequest,
} from "../../../services/systemTenants.service";
import {
  billingStatusLabel,
  systemBillingService,
  type TenantBillingInvoice,
} from "../../../services/systemBilling.service";
import { systemTenantSsoService, type TenantSsoConfiguration } from "../../../services/systemTenantSso.service";

type Props = { onShowToast: (message: string, type?: ToastType) => void };
type TenantFormMode = "create" | "edit";

const EMPTY_PAGE: TenantDirectoryPage = {
  items: [],
  page: 1,
  pageSize: 25,
  totalCount: 0,
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function statusStyle(status: TenantStatus): string {
  if (status === 1)
    return "border-[#7bc043]/40 bg-[#7bc043]/10 text-slate-800";
  if (status === 2)
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === 3)
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === 4)
    return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function suggestSubdomain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

function TenantFormModal({
  mode,
  tenant,
  onClose,
  onCreate,
  onUpdate,
}: {
  mode: TenantFormMode;
  tenant?: TenantDirectoryItem | null;
  onClose: () => void;
  onCreate: (request: CreateTenantRequest) => Promise<void>;
  onUpdate: (request: UpdateTenantRequest) => Promise<void>;
}) {
  const [tenantCode, setTenantCode] = useState(tenant?.tenantCode ?? "");
  const [name, setName] = useState(tenant?.name ?? "");
  const [legalName, setLegalName] = useState("");
  const [subdomain, setSubdomain] = useState(tenant?.subdomain ?? "");
  const [domain, setDomain] = useState(tenant?.domain ?? "");
  const [tenantType, setTenantType] = useState<TenantType>(tenant?.tenantType ?? 1);
  const [contactEmail, setContactEmail] = useState(tenant?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(tenant?.contactPhone ?? "");
  const [licenseTier, setLicenseTier] = useState<LicenseTier>(1);
  const planQuery = useQuery({
    queryKey: ["system-admin", "billing", "price-catalog", "plans"],
    queryFn: ({ signal }) => systemBillingService.getPriceCatalog(false, signal),
    enabled: mode === "create",
  });
  const selectedPlan = planQuery.data?.plans.find((plan) => plan.licenseTier === licenseTier);
  const [validTo, setValidTo] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "edit" && tenant) {
      let active = true;
      void systemTenantsService.getTenant(tenant.id)
        .then((details) => {
          if (active) {
            setLegalName(details.legalName);
            setLoadingExisting(false);
          }
        })
        .catch((reason: unknown) => {
          if (active) {
            setError(getApiErrorMessage(reason));
            setLoadingExisting(false);
          }
        });
      return () => {
        active = false;
      };
    }
  }, [mode, tenant]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (mode === "create" && !selectedPlan) {
      setError(planQuery.error
        ? getApiErrorMessage(planQuery.error)
        : "Chưa có cấu hình gói bản quyền để tiếp nhận đơn vị.");
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        await onCreate({
          tenantCode: tenantCode.trim().toUpperCase(),
          name: name.trim(),
          legalName: legalName.trim() || name.trim(),
          subdomain: subdomain.trim(),
          tenantType,
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          planCode: selectedPlan.code,
          validTo: new Date(`${validTo}T23:59:59.000Z`).toISOString(),
        });
      } else {
        await onUpdate({
          name: name.trim(),
          legalName: legalName.trim(),
          domain: domain.trim() || null,
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
        });
      }
      onClose();
    } catch (reason: unknown) {
      setError(getApiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "h-9 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-800 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20";
  const fieldLabel = "mb-1 block text-[11px] font-semibold text-slate-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-950/45"
        aria-label="Đóng hộp thoại"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-form-title"
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-md border border-slate-200 bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <h2 id="tenant-form-title" className="text-sm font-bold text-slate-900">
              {mode === "create" ? "Tiếp nhận đơn vị mới" : "Cập nhật thông tin đơn vị"}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {mode === "create" ? "Tạo hồ sơ triển khai và bản quyền ban đầu." : tenant?.tenantCode}
            </p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] text-slate-500 hover:bg-slate-100" aria-label="Đóng">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          {mode === "create" && planQuery.error && (
            <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
              Không tải được danh mục gói: {getApiErrorMessage(planQuery.error)}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {mode === "create" && (
              <label>
                <span className={fieldLabel}>Mã đơn vị <b className="text-rose-600">*</b></span>
                <input required maxLength={20} value={tenantCode} onChange={(event) => setTenantCode(event.target.value)} className={inputClass} autoComplete="off" />
              </label>
            )}
            <label className={mode === "edit" ? "sm:col-span-2" : ""}>
              <span className={fieldLabel}>Tên đơn vị <b className="text-rose-600">*</b></span>
              <input required minLength={2} maxLength={200} value={name} onChange={(event) => {
                setName(event.target.value);
                if (mode === "create") setSubdomain(suggestSubdomain(event.target.value));
              }} className={inputClass} />
            </label>
            <label>
              <span className={fieldLabel}>Tên pháp lý <b className="text-rose-600">*</b></span>
              <input required minLength={2} maxLength={250} value={legalName} onChange={(event) => setLegalName(event.target.value)} className={inputClass} />
            </label>
            {mode === "create" ? (
              <label>
                <span className={fieldLabel}>Tên miền phụ (subdomain) <b className="text-rose-600">*</b></span>
                <div className="flex">
                  <input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={63} value={subdomain} onChange={(event) => setSubdomain(suggestSubdomain(event.target.value))} className={`${inputClass} rounded-r-none`} />
                  <span className="inline-flex shrink-0 items-center rounded-r-[4px] border border-l-0 border-slate-200 bg-slate-100 px-2 text-[11px] text-slate-500">.internlink.vn</span>
                </div>
              </label>
            ) : (
              <label>
                <span className={fieldLabel}>Tên miền tùy chỉnh</span>
                <input maxLength={253} value={domain} onChange={(event) => setDomain(event.target.value)} className={inputClass} placeholder="portal.example.edu.vn" />
              </label>
            )}
            {mode === "create" && (
              <label>
                <span className={fieldLabel}>Loại hình</span>
                <select value={tenantType} onChange={(event) => setTenantType(Number(event.target.value) as TenantType)} className={inputClass}>
                  <option value={1}>Đại học</option>
                  <option value={2}>Doanh nghiệp</option>
                  <option value={3}>Cơ quan</option>
                </select>
              </label>
            )}
            <label>
              <span className={fieldLabel}>Email liên hệ</span>
              <input type="email" maxLength={200} value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className={inputClass} />
            </label>
            <label>
              <span className={fieldLabel}>Số điện thoại</span>
              <input type="tel" maxLength={50} value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className={inputClass} />
            </label>
          </div>

          {mode === "create" && (
            <fieldset className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
              <legend className="px-1 text-xs font-bold text-slate-800">Bản quyền ban đầu · cấp trực tiếp, không tạo hóa đơn</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className={fieldLabel}>Gói</span>
                  <select value={licenseTier} onChange={(event) => setLicenseTier(Number(event.target.value) as LicenseTier)} disabled={planQuery.isLoading || !planQuery.data?.plans.length} className={inputClass}>
                    {(planQuery.data?.plans ?? []).map((plan) => (
                      <option key={plan.code} value={plan.licenseTier}>{plan.name}</option>
                    ))}
                  </select>
                </label>
                <div className="rounded-md border border-slate-200 bg-white p-2.5">
                  <p className={fieldLabel}>Hạn mức theo gói</p>
                  {selectedPlan ? (
                    <p className="text-xs font-semibold text-slate-800">
                      {selectedPlan.maxStudentsQuota.toLocaleString("vi-VN")} SV · {selectedPlan.maxLecturersQuota.toLocaleString("vi-VN")} GV · {(selectedPlan.storageQuotaBytes / 1024 ** 3).toLocaleString("vi-VN")} GB
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">{planQuery.isLoading ? "Đang tải gói..." : "Chưa có cấu hình gói."}</p>
                  )}
                  <p className="mt-1 text-[10px] text-slate-500">Có thể cập nhật hạn mức trong cấu hình gói tại trang thanh toán.</p>
                </div>
                <label className="sm:col-span-2">
                  <span className={fieldLabel}>Có hiệu lực đến</span>
                  <input required type="date" value={validTo} onChange={(event) => setValidTo(event.target.value)} className={inputClass} />
                </label>
              </div>
            </fieldset>
          )}

          <footer className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={onClose} className="h-9 rounded-[4px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Hủy</button>
            <button type="submit" disabled={saving || loadingExisting || (mode === "create" && (planQuery.isLoading || !selectedPlan))} className="inline-flex h-9 items-center gap-2 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e] disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {mode === "create" ? "Tiếp nhận đơn vị" : "Lưu thay đổi"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

type TenantDetailsTab = "overview" | "license" | "invoices" | "sso";

function formatCurrency(value: number): string {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function formatStorage(value: number): string {
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} GB`;
  if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`;
  return `${value.toLocaleString("vi-VN")} B`;
}

function TenantQuotaMeter({
  label,
  current,
  limit,
  formatValue = (value) => value.toLocaleString("vi-VN"),
}: {
  label: string;
  current: number;
  limit: number;
  formatValue?: (value: number) => string;
}) {
  const percentage = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-600">
          {formatValue(current)} / {limit > 0 ? formatValue(limit) : "Chưa cấp hạn mức"}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className={`h-full rounded-full ${percentage >= 90 ? "bg-amber-500" : "bg-[#026aa7]"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function Tenant360Drawer({
  tenant: tenantItem,
  onClose,
}: {
  tenant: TenantDirectoryItem;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TenantDetailsTab>("overview");
  const [invoicePage, setInvoicePage] = useState(1);
  const [isExportConfirming, setIsExportConfirming] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportCompleted, setExportCompleted] = useState(false);
  const detailsQuery = useQuery({
    queryKey: ["system-admin", "tenants", "detail", tenantItem.id],
    queryFn: ({ signal }) => systemTenantsService.getTenant(tenantItem.id, signal),
  });
  const licenseQuery = useQuery({
    queryKey: ["system-admin", "tenants", tenantItem.id, "license"],
    queryFn: ({ signal }) => systemTenantsService.getLicense(tenantItem.id, signal),
    enabled: tab === "license",
  });
  const invoicesQuery = useQuery({
    queryKey: ["system-admin", "billing", "tenant-history", tenantItem.id, invoicePage],
    queryFn: ({ signal }) => systemBillingService.getInvoices({
      tenantId: tenantItem.id,
      page: invoicePage,
      pageSize: 10,
    }, signal),
    enabled: tab === "invoices",
  });
  const ssoQuery = useQuery({
    queryKey: ["system-admin", "tenants", tenantItem.id, "sso"],
    queryFn: ({ signal }) => systemTenantSsoService.getConfiguration(tenantItem.id, signal),
    enabled: tab === "sso",
  });

  const tenant = detailsQuery.data?.tenant ?? tenantItem;
  const tabs: { id: TenantDetailsTab; label: string; icon: typeof Building2 }[] = [
    { id: "overview", label: "Tổng quan & liên hệ", icon: Building2 },
    { id: "license", label: "Gói dịch vụ & quota", icon: CreditCard },
    { id: "invoices", label: "Lịch sử hóa đơn", icon: ReceiptText },
    { id: "sso", label: "Tích hợp định danh", icon: ShieldCheck },
  ];
  const ssoProviderLabels: Record<TenantSsoConfiguration["providerType"], string> = {
    AzureAD: "Microsoft Entra ID",
    GoogleWorkspace: "Google Workspace",
    SAML2: "SAML 2.0",
    CAS_LDAP: "CAS / LDAP",
  };
  const invoiceData = invoicesQuery.data;
  const invoicePageCount = Math.max(1, Math.ceil((invoiceData?.totalCount ?? 0) / 10));

  const exportTenantData = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportCompleted(false);
    try {
      await systemTenantsService.exportTenant(tenantItem.id);
      setExportCompleted(true);
      setIsExportConfirming(false);
    } catch (error) {
      setExportError(getApiErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  };

  const renderQueryError = (error: unknown, retry: () => unknown) => (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
      <span>{getApiErrorMessage(error)}</span>
      <button type="button" onClick={() => void retry()} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[4px] border border-rose-200 px-2.5 font-semibold hover:bg-rose-100">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Thử lại
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-950/45" onClick={onClose} aria-label="Đóng hồ sơ đơn vị" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-details-title"
        className="relative flex h-full w-full max-w-4xl flex-col border-l border-slate-200 bg-white shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#026aa7]/10 text-[#026aa7]"><Building2 className="h-4 w-4" aria-hidden="true" /></span>
            <div className="min-w-0">
              <h2 id="tenant-details-title" className="truncate text-sm font-bold text-slate-900">{tenant.name}</h2>
              <p className="font-mono text-[11px] text-[#026aa7]">{tenant.tenantCode}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]" aria-label="Đóng">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <PlatformTabBar
          ariaLabel="Thông tin hồ sơ đơn vị"
          selectedId={tab}
          className="shrink-0 sm:px-5"
          tabs={tabs.map(({ id, label, icon }) => ({
            id,
            label,
            icon,
            onSelect: () => setTab(id),
            tabId: `tenant-tab-${id}`,
            ariaControls: "tenant-details-panel",
          }))}
        />

        <div
          role="tabpanel"
          id="tenant-details-panel"
          aria-labelledby={`tenant-tab-${tab}`}
          className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
        >
          {tab === "overview" && (
            <div className="space-y-4">
              <section className="rounded-md border border-[#026aa7]/20 bg-[#026aa7]/[0.04] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-900">Bàn giao dữ liệu đơn vị</h3>
                    <p className="mt-1 text-[11px] leading-5 text-slate-600">
                      Tạo ZIP gồm dữ liệu học vụ, tệp minh chứng và workbook Excel đã định dạng để xem thuận tiện.
                    </p>
                  </div>
                  {!isExportConfirming && (
                    <button
                      type="button"
                      onClick={() => {
                        setExportError(null);
                        setExportCompleted(false);
                        setIsExportConfirming(true);
                      }}
                      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[4px] border border-[#026aa7]/30 bg-white px-3 text-xs font-semibold text-[#026aa7] hover:bg-[#026aa7]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      Xuất gói dữ liệu
                    </button>
                  )}
                </div>
                {isExportConfirming && (
                  <div className="mt-3 rounded-md border border-slate-200 bg-white p-3" role="group" aria-labelledby="tenant-export-confirmation">
                    <p id="tenant-export-confirmation" className="text-xs font-semibold text-slate-800">
                      Xác nhận phạm vi xuất
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-600">
                      Gói gồm sinh viên, giảng viên, học kỳ, doanh nghiệp, phân công, báo cáo, bài nộp,
                      đánh giá, điểm danh, biểu mẫu và tệp minh chứng cục bộ. Workbook Excel có sheet,
                      tiêu đề, bộ lọc và định dạng dễ đọc; CSV giữ dạng dữ liệu thô để nhập/xử lý.
                      Không gồm mật khẩu, token, cấu hình nền tảng, avatar hoặc file chỉ lưu ở dịch vụ ngoài.
                    </p>
                    {exportError && <p role="alert" className="mt-2 text-xs text-rose-700">{exportError}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsExportConfirming(false)}
                        disabled={isExporting}
                        className="inline-flex h-8 items-center rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => void exportTenantData()}
                        disabled={isExporting}
                        className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#015786] disabled:cursor-wait disabled:opacity-60"
                      >
                        {isExporting
                          ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
                        {isExporting ? "Đang tạo gói..." : "Xác nhận và tải"}
                      </button>
                    </div>
                  </div>
                )}
                {exportCompleted && !isExportConfirming && (
                  <p role="status" className="mt-2 text-xs font-medium text-emerald-700">
                    Gói dữ liệu đã được tạo và tải xuống.
                  </p>
                )}
              </section>
              {detailsQuery.isLoading && <p role="status" className="text-xs text-slate-500">Đang tải hồ sơ đơn vị...</p>}
              {detailsQuery.error && renderQueryError(detailsQuery.error, detailsQuery.refetch)}
              <section className="rounded-md border border-slate-200 bg-white p-4">
                <h3 className="text-xs font-bold text-slate-900">Thông tin pháp lý & vận hành</h3>
                <dl className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">
                  {[
                    ["Tên pháp lý", detailsQuery.data?.legalName ?? "—"],
                    ["Mã đơn vị", tenant.tenantCode],
                    ["Tên miền phụ", `${tenant.subdomain}.internlink.vn`],
                    ["Tên miền riêng", tenant.domain || "Chưa cấu hình"],
                    ["Loại hình", tenantTypeLabel(tenant.tenantType)],
                    ["Trạng thái", tenantStatusLabel(tenant.status)],
                    ["Ngày tiếp nhận", formatDate(detailsQuery.data?.createdAt ?? null)],
                    ["Khoa / đơn vị trực thuộc", tenant.departmentCount.toLocaleString("vi-VN")],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0 border-b border-slate-100 pb-2">
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                      <dd className="mt-1 break-words text-xs font-medium text-slate-800">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Các khoa trực thuộc</p>
                  {(detailsQuery.data?.departmentNames ?? []).length ? (
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {(detailsQuery.data?.departmentNames ?? []).map((name) => (
                        <li key={name} className="rounded-[3px] border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700">{name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">{detailsQuery.isLoading ? "Đang tải..." : "Chưa có khoa được ghi nhận."}</p>
                  )}
                </div>
              </section>
              <section className="rounded-md border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
                  <h3 className="text-xs font-bold text-slate-900">Đầu mối liên hệ</h3>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Thông tin đại diện đơn vị được lưu trong hồ sơ tenant.</p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Email liên hệ</dt>
                    <dd className="mt-1 break-all text-xs font-medium text-slate-800">{tenant.contactEmail || "Chưa có email liên hệ"}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Điện thoại</dt>
                    <dd className="mt-1 text-xs font-medium text-slate-800">{tenant.contactPhone || "Chưa có số điện thoại"}</dd>
                  </div>
                </dl>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Quản trị viên đơn vị</p>
                  {(detailsQuery.data?.administratorContacts ?? []).length ? (
                    <ul className="mt-2 space-y-2">
                      {detailsQuery.data?.administratorContacts.map((contact) => (
                        <li key={contact.email} className="min-w-0 text-xs">
                          <span className="font-semibold text-slate-800">{contact.displayName}</span>
                          <span className="mx-1.5 text-slate-400" aria-hidden="true">·</span>
                          <a className="break-all text-[#026aa7] hover:underline" href={`mailto:${contact.email}`}>
                            {contact.email}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">
                      {detailsQuery.isLoading
                        ? "Đang tải..."
                        : detailsQuery.error
                          ? "Không thể tải danh sách quản trị viên."
                          : "Chưa có tài khoản quản trị viên đang hoạt động."}
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}

          {tab === "license" && (
            <div className="space-y-4">
              {licenseQuery.isLoading && <p role="status" className="text-xs text-slate-500">Đang tải gói dịch vụ và hạn mức...</p>}
              {licenseQuery.error && renderQueryError(licenseQuery.error, licenseQuery.refetch)}
              {!licenseQuery.isLoading && !licenseQuery.error && !licenseQuery.data?.licenseId && (
                <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">Đơn vị chưa có bản quyền được cấp.</p>
              )}
              {licenseQuery.data?.licenseId && (
                <>
                  <section className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Gói dịch vụ hiện tại</p>
                        <h3 className="mt-1 text-sm font-bold text-slate-900">{licenseTierLabel(licenseQuery.data.licenseTier)}</h3>
                      </div>
                      <span className={`rounded-[3px] border px-2 py-1 text-[10px] font-semibold ${licenseQuery.data.isActive ? "border-[#7bc043]/40 bg-[#7bc043]/10 text-slate-800" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                        {licenseQuery.data.isActive ? "Đang hoạt động" : "Không hoạt động"}
                      </span>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDate(licenseQuery.data.validFrom)} – {formatDate(licenseQuery.data.validTo)}
                    </p>
                    <div className="mt-5 space-y-4">
                      <TenantQuotaMeter label="Sinh viên" current={licenseQuery.data.activeStudents} limit={licenseQuery.data.maxStudentsQuota} />
                      <TenantQuotaMeter label="Giảng viên" current={licenseQuery.data.activeLecturers} limit={licenseQuery.data.maxLecturersQuota} />
                      <TenantQuotaMeter
                        label="Dung lượng lưu trữ"
                        current={licenseQuery.data.currentStorageBytes}
                        limit={licenseQuery.data.storageQuotaBytes}
                        formatValue={formatStorage}
                      />
                    </div>
                  </section>
                  <section className="rounded-md border border-slate-200 bg-white p-4">
                    <h3 className="text-xs font-bold text-slate-900">Các kỳ bản quyền</h3>
                    {licenseQuery.data.history.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500">Chưa có lịch sử bản quyền.</p>
                    ) : (
                      <ul className="mt-2 divide-y divide-slate-100">
                        {licenseQuery.data.history.map((item) => (
                          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                            <span className="font-semibold text-slate-700">{licenseTierLabel(item.licenseTier)} · {formatDate(item.validFrom)} – {formatDate(item.validTo)}</span>
                            <span className="text-slate-500">{item.isActive ? "Hiện hành" : "Đã kết thúc"}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              )}
            </div>
          )}

          {tab === "invoices" && (
            <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
                <h3 className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <ReceiptText className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
                  Hóa đơn thanh toán
                </h3>
                <span className="text-[11px] text-slate-500">{invoiceData?.totalCount ?? 0} hóa đơn</span>
              </div>
              {invoicesQuery.isLoading && <p role="status" className="p-4 text-xs text-slate-500">Đang tải lịch sử hóa đơn...</p>}
              {invoicesQuery.error && <div className="p-3">{renderQueryError(invoicesQuery.error, invoicesQuery.refetch)}</div>}
              {!invoicesQuery.isLoading && !invoicesQuery.error && invoiceData?.items.length === 0 && (
                <p className="p-8 text-center text-xs text-slate-500">Đơn vị chưa có hóa đơn.</p>
              )}
              {!!invoiceData?.items.length && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-bold">Hóa đơn</th>
                          <th className="px-3 py-2 font-bold">Số tiền</th>
                          <th className="px-3 py-2 font-bold">Trạng thái</th>
                          <th className="px-3 py-2 font-bold">Ngày tạo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceData.items.map((invoice: TenantBillingInvoice) => (
                          <tr key={invoice.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                              <span className="block font-mono font-semibold text-slate-800">{invoice.invoiceNumber}</span>
                              <span className="mt-0.5 block text-[10px] text-slate-500">{invoice.planCode} · {invoice.billingCycleMonths} tháng</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums text-slate-800">{formatCurrency(invoice.amountVnd)}</td>
                            <td className="px-3 py-2 text-slate-700">{billingStatusLabel(invoice.status)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatDate(invoice.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-3 py-2">
                    <button type="button" aria-label="Trang hóa đơn trước" onClick={() => setInvoicePage((current) => Math.max(1, current - 1))} disabled={invoicePage <= 1} className="h-8 rounded-[4px] border border-slate-200 px-2 text-xs disabled:opacity-40">Trước</button>
                    <span className="text-[11px] text-slate-600">Trang {invoicePage} / {invoicePageCount}</span>
                    <button type="button" aria-label="Trang hóa đơn tiếp theo" onClick={() => setInvoicePage((current) => Math.min(invoicePageCount, current + 1))} disabled={invoicePage >= invoicePageCount} className="h-8 rounded-[4px] border border-slate-200 px-2 text-xs disabled:opacity-40">Sau</button>
                  </footer>
                </>
              )}
            </section>
          )}

          {tab === "sso" && (
            <div className="space-y-4">
              {ssoQuery.isLoading && <p role="status" className="text-xs text-slate-500">Đang tải cấu hình định danh...</p>}
              {ssoQuery.error && renderQueryError(ssoQuery.error, ssoQuery.refetch)}
              {ssoQuery.data && (
                <section className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">Nhà cung cấp định danh</h3>
                        <p className="mt-0.5 text-xs text-slate-600">{ssoProviderLabels[ssoQuery.data.providerType]}</p>
                      </div>
                    </div>
                    <span className={`rounded-[3px] border px-2 py-1 text-[10px] font-semibold ${ssoQuery.data.isConfigured ? "border-[#7bc043]/40 bg-[#7bc043]/10 text-slate-800" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                      {ssoQuery.data.isConfigured ? "Đã cấu hình" : "Chưa cấu hình"}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Client ID</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-slate-700">{ssoQuery.data.clientId || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Client secret</dt>
                      <dd className="mt-1 text-xs text-slate-700">
                        {ssoQuery.data.hasClientSecret ? ssoQuery.data.maskedClientSecret || "Đã thiết lập (đã ẩn)" : "Chưa thiết lập"}
                      </dd>
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Discovery URL</dt>
                      <dd className="mt-1 break-all text-xs text-slate-700">{ssoQuery.data.discoveryUrl || "—"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Miền email cho phép</dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {ssoQuery.data.allowedEmailDomains.length
                          ? ssoQuery.data.allowedEmailDomains.map((domain) => <span key={domain} className="rounded-[3px] border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700">{domain}</span>)
                          : <span className="text-xs text-slate-500">Chưa giới hạn theo miền email</span>}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-600">{ssoQuery.data.isEnforced ? "Đăng nhập SSO đang được bắt buộc" : "SSO chưa được bắt buộc"}</span>
                    <span className="text-[10px] text-slate-500">Cập nhật: {formatDate(ssoQuery.data.updatedAt)}</span>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function TenantsManagerView({ onShowToast }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { startTenantSupport } = useImpersonation();
  const { selectedTenantId, selectTenant } = useActiveTenant();
  const [search, setSearch] = useState("");
  const [tenantType, setTenantType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TenantDirectoryPage>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formMode, setFormMode] = useState<TenantFormMode | null>(null);
  const [editingTenant, setEditingTenant] = useState<TenantDirectoryItem | null>(null);
  const [detailsTenant, setDetailsTenant] = useState<TenantDirectoryItem | null>(null);
  const [busyTenantId, setBusyTenantId] = useState<string | null>(null);
  const [supportTenant, setSupportTenant] = useState<TenantDirectoryItem | null>(null);
  const [supportReason, setSupportReason] = useState("");
  const [supportError, setSupportError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      void systemTenantsService.getTenants(
        { search: search.trim(), tenantType, status, page, pageSize: 25 },
        controller.signal,
      ).then(setData).catch((reason: unknown) => {
        if (!controller.signal.aborted) setLoadError(getApiErrorMessage(reason));
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, 180);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search, tenantType, status, page, refreshKey]);

  const pageCount = Math.max(1, Math.ceil(data.totalCount / data.pageSize));
  const visibleRange = useMemo(() => {
    if (data.totalCount === 0) return "0 đơn vị";
    const start = (data.page - 1) * data.pageSize + 1;
    return `${start}–${Math.min(data.page * data.pageSize, data.totalCount)} / ${data.totalCount.toLocaleString("vi-VN")}`;
  }, [data]);

  const refresh = () => {
    setRefreshKey((value) => value + 1);
    void queryClient.invalidateQueries({ queryKey: ["system-admin", "tenants", "directory"] });
  };

  const handleCreate = async (request: CreateTenantRequest) => {
    await systemTenantsService.createTenant(request);
    setPage(1);
    refresh();
    onShowToast("Đã tiếp nhận đơn vị triển khai.", "success");
  };

  const handleUpdate = async (request: UpdateTenantRequest) => {
    if (!editingTenant) return;
    await systemTenantsService.updateTenant(editingTenant.id, request);
    refresh();
    onShowToast("Đã cập nhật thông tin đơn vị.", "success");
  };

  const openDetails = (tenant: TenantDirectoryItem) => setDetailsTenant(tenant);

  const toggleStatus = async (tenant: TenantDirectoryItem) => {
    const nextStatus: TenantStatus = tenant.status === 3 ? 1 : 3;
    const action = nextStatus === 3 ? "tạm khóa" : "mở khóa";
    if (!window.confirm(`Xác nhận ${action} ${tenant.name}?`)) return;
    setBusyTenantId(tenant.id);
    try {
      await systemTenantsService.updateStatus(tenant.id, nextStatus);
      refresh();
      onShowToast(`Đã ${action} đơn vị.`, "success");
    } catch (reason: unknown) {
      onShowToast(getApiErrorMessage(reason), "danger");
    } finally {
      setBusyTenantId(null);
    }
  };

  const openSupportDialog = (tenant: TenantDirectoryItem) => {
    if (tenant.status !== 1 && tenant.status !== 2) {
      onShowToast("Chỉ có thể mở phiên hỗ trợ cho đơn vị đang hoạt động hoặc dùng thử.", "danger");
      return;
    }
    setSupportTenant(tenant);
    setSupportReason("");
    setSupportError(null);
  };

  const closeSupportDialog = () => {
    if (busyTenantId === supportTenant?.id) return;
    setSupportTenant(null);
    setSupportReason("");
    setSupportError(null);
  };

  const submitSupportRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supportTenant || !supportReason.trim()) return;
    setBusyTenantId(supportTenant.id);
    setSupportError(null);
    try {
      await startTenantSupport(supportTenant.id, supportReason.trim());
      const tenantName = supportTenant.name;
      setSupportTenant(null);
      setSupportReason("");
      onShowToast(`Đã mở phiên hỗ trợ cho ${tenantName}.`, "success");
      navigate("/admin/dashboard");
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);
      setSupportError(message);
      onShowToast(message, "danger");
    } finally {
      setBusyTenantId(null);
    }
  };

  const filterClass = "h-8 rounded-[4px] border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#026aa7]";

  return (
    <div className="min-h-full bg-slate-50">
      <PlatformPageHeader
        title="Quản lý Đơn vị & Trường học (Tenants)"
        description="Danh bạ khách hàng, trạng thái triển khai và tiếp nhận đơn vị mới."
        breadcrumbs={[
          { label: "Quản trị nền tảng", href: "/admin/dashboard" },
          { label: "Đơn vị & bản quyền" },
          { label: "Đơn vị triển khai" },
        ]}
        statistic={data.totalCount.toLocaleString("vi-VN") + " đơn vị"}
      />
      <CompactActionBar
        icon={Building2}
        title="Đơn vị triển khai"
        subtitle="Danh bạ đơn vị và tiếp nhận khách hàng"
        hideTitle
        total={visibleRange}
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: "Tìm kiếm theo từ khóa...",
          ariaLabel: "Tìm đơn vị theo tên, mã hoặc subdomain",
        }}
        filters={
          <>
            <label className="sr-only" htmlFor="tenant-type-filter">Loại hình đơn vị</label>
            <select id="tenant-type-filter" value={tenantType} onChange={(event) => { setTenantType(event.target.value); setPage(1); }} className={filterClass}>
              <option value="">Tất cả loại hình</option>
              <option value="1">Đại học</option>
              <option value="2">Doanh nghiệp</option>
              <option value="3">Cơ quan</option>
            </select>
            <label className="sr-only" htmlFor="tenant-status-filter">Trạng thái</label>
            <select id="tenant-status-filter" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={filterClass}>
              <option value="">Tất cả trạng thái</option>
              <option value="1">Đang hoạt động</option>
              <option value="2">Dùng thử</option>
              <option value="3">Tạm dừng</option>
              <option value="4">Đã hết hạn</option>
            </select>
          </>
        }
        actions={[{
          label: "Thêm đơn vị mới",
          icon: Plus,
          variant: "primary",
          onClick: () => {
            setEditingTenant(null);
            setFormMode("create");
          },
        }]}
      />

      <main className={PLATFORM_PAGE_CONTENT_CLASS}>
        {loadError && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{loadError}</span>
            <button type="button" onClick={refresh} className="rounded-[4px] border border-rose-200 px-2.5 py-1 font-semibold hover:bg-rose-100">Thử lại</button>
          </div>
        )}
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Award className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
              Danh mục đơn vị
            </div>
            <span className="text-[11px] text-slate-500">{visibleRange}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  {["Đơn vị triển khai", "Mã", "Tên miền phụ", "Loại hình", "Liên hệ", "Bản quyền", "Trạng thái", "Quản lý", ""].map((heading) => (
                    <th key={heading || "actions"} className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }, (_, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td colSpan={9} className="px-3 py-3"><span className="block h-4 animate-pulse rounded bg-slate-100" /></td>
                    </tr>
                  ))
                ) : data.items.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center">
                    <Building2 className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                    <p className="mt-2 text-xs font-semibold text-slate-700">Chưa có đơn vị phù hợp</p>
                    <p className="mt-1 text-[11px] text-slate-500">Thử thay đổi điều kiện tìm kiếm hoặc tiếp nhận đơn vị mới.</p>
                  </td></tr>
                ) : data.items.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="px-2.5 py-2 align-middle">
                      <div className="flex min-w-48 items-center gap-2">
                        {tenant.logoUrl ? (
                          <img src={tenant.logoUrl} alt="" className="h-8 w-8 rounded-md border border-slate-200 object-contain" loading="lazy" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#026aa7]/10 text-[#026aa7]"><Building2 className="h-4 w-4" aria-hidden="true" /></span>
                        )}
                        <span className="min-w-0">
                          <span className="block max-w-[230px] truncate text-xs font-semibold text-slate-800" title={tenant.name}>{tenant.name}</span>
                          <span className="block text-[10px] text-slate-500">{tenant.activeStudentCount.toLocaleString("vi-VN")} SV · {tenant.activeLecturerCount.toLocaleString("vi-VN")} GV</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2 font-mono text-xs font-semibold text-[#026aa7]">{tenant.tenantCode}</td>
                    <td className="px-2.5 py-2 text-xs text-slate-600">{tenant.subdomain}.internlink.vn</td>
                    <td className="px-2.5 py-2 text-xs text-slate-600">{tenantTypeLabel(tenant.tenantType)}</td>
                    <td className="max-w-40 px-2.5 py-2">
                      <span className="block truncate text-xs text-slate-700" title={tenant.contactEmail}>{tenant.contactEmail || "—"}</span>
                      <span className="block text-[10px] text-slate-500">{tenant.contactPhone || "Chưa có số điện thoại"}</span>
                    </td>
                    <td className="px-2.5 py-2">
                      <span className="block text-xs font-semibold text-slate-700">{licenseTierLabel(tenant.licenseTier)}</span>
                      <span className="text-[10px] text-slate-500">{tenant.maxStudentsQuota?.toLocaleString("vi-VN") ?? 0} SV · đến {formatDate(tenant.licenseValidTo)}</span>
                    </td>
                    <td className="px-2.5 py-2">
                      <span className={`inline-flex whitespace-nowrap rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold ${statusStyle(tenant.status)}`}>
                        {tenantStatusLabel(tenant.status)}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 text-xs text-slate-600">{tenant.departmentCount.toLocaleString("vi-VN")} khoa</td>
                    <td className="sticky right-0 bg-white px-2 py-2 shadow-[-8px_0_10px_-10px_rgba(15,23,42,.35)]">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            selectTenant(tenant.id);
                            onShowToast(`Đang cấu hình: ${tenant.name} (${tenant.tenantCode}).`, "success");
                          }}
                          aria-label={`Chọn ${tenant.name} làm đơn vị đang cấu hình`}
                          aria-pressed={selectedTenantId === tenant.id}
                          title={selectedTenantId === tenant.id ? "Đang chọn cấu hình" : "Chọn làm đơn vị cấu hình"}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] ${
                            selectedTenantId === tenant.id
                              ? "bg-[#026aa7]/10 text-[#026aa7]"
                              : "text-slate-500 hover:bg-[#026aa7]/5 hover:text-[#026aa7]"
                          }`}
                        >
                          {selectedTenantId === tenant.id
                            ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            : <Check className="h-4 w-4" aria-hidden="true" />}
                        </button>
                        <button type="button" onClick={() => openDetails(tenant)} className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] text-slate-600 hover:bg-[#026aa7]/5 hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]" aria-label={`Xem chi tiết ${tenant.name}`} title="Xem chi tiết"><Eye className="h-4 w-4" aria-hidden="true" /></button>
                        <button
                          type="button"
                          onClick={() => openSupportDialog(tenant)}
                          disabled={busyTenantId === tenant.id || (tenant.status !== 1 && tenant.status !== 2)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 disabled:opacity-50"
                          aria-label={`Hỗ trợ kỹ thuật ${tenant.name}`}
                          title={tenant.status === 1 || tenant.status === 2 ? "Hỗ trợ kỹ thuật" : "Chỉ hỗ trợ đơn vị đang hoạt động hoặc dùng thử"}
                        >
                          {busyTenantId === tenant.id ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wrench className="h-4 w-4" aria-hidden="true" />}
                        </button>
                        <button type="button" onClick={() => { setEditingTenant(tenant); setFormMode("edit"); }} className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] text-slate-600 hover:bg-[#026aa7]/5 hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]" aria-label={`Chỉnh sửa ${tenant.name}`} title="Chỉnh sửa"><Edit2 className="h-4 w-4" aria-hidden="true" /></button>
                        <button type="button" onClick={() => void toggleStatus(tenant)} disabled={busyTenantId === tenant.id} className={`inline-flex h-8 w-8 items-center justify-center rounded-[4px] focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 ${tenant.status === 3 ? "text-[#7bc043] hover:bg-[#7bc043]/10 focus-visible:ring-[#7bc043]" : "text-amber-700 hover:bg-amber-50 focus-visible:ring-amber-600"}`} aria-label={`${tenant.status === 3 ? "Kích hoạt" : "Tạm dừng"} ${tenant.name}`} title={tenant.status === 3 ? "Kích hoạt" : "Tạm dừng"}>
                          {busyTenantId === tenant.id ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : tenant.status === 3 ? <UnlockKeyhole className="h-4 w-4" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="flex items-center justify-between border-t border-slate-200 px-3 py-2">
            <p className="text-[11px] text-slate-500">{visibleRange}</p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading} className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Trang trước"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
              <span className="px-2 text-[11px] tabular-nums text-slate-600">Trang {page} / {pageCount}</span>
              <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page >= pageCount || loading} className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Trang sau"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          </footer>
        </section>
      </main>

      {formMode && (
        <TenantFormModal
          key={`${formMode}-${editingTenant?.id ?? "new"}`}
          mode={formMode}
          tenant={editingTenant}
          onClose={() => setFormMode(null)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}
      {detailsTenant && <Tenant360Drawer tenant={detailsTenant} onClose={() => setDetailsTenant(null)} />}
      {supportTenant && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45"
            onClick={closeSupportDialog}
            disabled={busyTenantId === supportTenant.id}
            aria-label="Đóng yêu cầu hỗ trợ"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="tenant-support-title"
            className="relative w-full max-w-lg rounded-md border border-slate-200 bg-white shadow-2xl"
            onKeyDown={(event) => {
              if (event.key === "Escape") closeSupportDialog();
            }}
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 id="tenant-support-title" className="text-sm font-bold text-slate-900">Mở phiên hỗ trợ kỹ thuật</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">{supportTenant.name} ({supportTenant.tenantCode}) · tối đa 30 phút</p>
              </div>
              <button type="button" onClick={closeSupportDialog} disabled={busyTenantId === supportTenant.id} aria-label="Đóng" className="flex h-8 w-8 items-center justify-center rounded-[4px] text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>
            <form onSubmit={(event) => void submitSupportRequest(event)} className="space-y-3 p-4">
              {supportError && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">{supportError}</p>}
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">Lý do hỗ trợ *</span>
                <textarea
                  autoFocus
                  required
                  maxLength={1000}
                  rows={4}
                  value={supportReason}
                  onChange={(event) => setSupportReason(event.target.value)}
                  placeholder="Mô tả yêu cầu cần kiểm tra..."
                  className="w-full resize-y rounded-[4px] border border-slate-200 bg-white p-2.5 text-sm text-slate-800 outline-none focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                />
              </label>
              <p className="text-[11px] text-slate-500">Mọi thao tác trong phiên đều được ghi nhật ký kiểm toán.</p>
              <footer className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={closeSupportDialog} disabled={busyTenantId === supportTenant.id} className="h-9 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-50">Hủy</button>
                <button type="submit" disabled={busyTenantId === supportTenant.id || !supportReason.trim()} className="inline-flex h-9 items-center gap-2 rounded-[4px] bg-rose-700 px-3 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50">
                  {busyTenantId === supportTenant.id && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Bắt đầu hỗ trợ
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
