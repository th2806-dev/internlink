import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  Check,
  Database,
  GraduationCap,
  LoaderCircle,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { useActiveTenant } from "../../../contexts/ActiveTenantContext";
import type { ToastType } from "../../../contexts/ToastContext";
import { PLATFORM_PAGE_CONTENT_CLASS, PlatformPageHeader } from "../components/PlatformPageHeader";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { systemBillingService } from "../../../services/systemBilling.service";
import {
  licenseTierLabel,
  systemTenantsService,
  type LicenseTier,
  type TenantLicenseStudio,
} from "../../../services/systemTenants.service";

type Props = { onShowToast: (message: string, type?: ToastType) => void };
const BYTES_PER_GB = 1024 ** 3;

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatGB(bytes: number): string {
  return (bytes / BYTES_PER_GB).toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
  });
}

function usagePercent(used: number, quota: number): number {
  if (quota <= 0) return 0;
  return Math.min(100, Math.round((used / quota) * 100));
}

function getLicenseStatus(
  isActive: boolean,
  validTo: string | null,
): "active" | "suspended" | "expired" {
  const expiration = validTo ? new Date(validTo).getTime() : Number.POSITIVE_INFINITY;
  if (Number.isFinite(expiration) && expiration <= Date.now()) return "expired";
  return isActive ? "active" : "suspended";
}

function QuotaCard({
  icon: Icon,
  title,
  usedLabel,
  percent,
  detail,
}: {
  icon: typeof UsersRound;
  title: string;
  usedLabel: string;
  percent: number;
  detail: string;
}) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-slate-500">{title}</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{usedLabel}</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#026aa7]/10 text-[#026aa7]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-[2px] bg-slate-100" role="progressbar" aria-label={`${title} đã sử dụng`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div
          className={`h-full rounded-[2px] transition-[width] duration-300 ${percent >= 90 ? "bg-amber-500" : "bg-[#7bc043]"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1.5 flex justify-between text-[10px] text-slate-500">
        <span>{detail}</span>
        <span className="font-semibold tabular-nums">{percent}%</span>
      </p>
    </article>
  );
}

export function TenantLicenseStudioView({ onShowToast }: Props) {
  const {
    tenants,
    selectedTenant,
    selectedTenantId,
    selectTenant,
    isLoading: loadingTenants,
    error: tenantListError,
  } = useActiveTenant();
  const [tenantSearch, setTenantSearch] = useState("");
  const [license, setLicense] = useState<TenantLicenseStudio | null>(null);
  const [licenseTenantId, setLicenseTenantId] = useState("");
  const [tier, setTier] = useState<LicenseTier>(1);
  const [validTo, setValidTo] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [loadingLicense, setLoadingLicense] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const plansQuery = useQuery({
    queryKey: ["system-admin", "billing", "price-catalog", "plans"],
    queryFn: ({ signal }) => systemBillingService.getPriceCatalog(false, signal),
  });

  useEffect(() => {
    if (!selectedTenantId) {
      setLicense(null);
      setLicenseTenantId("");
      setLoadingLicense(false);
      return;
    }
    const controller = new AbortController();
    setLoadingLicense(true);
    setError(null);
    setLicense(null);
    setTier(1);
    setValidTo("");
    setAutoRenew(false);
    void systemTenantsService.getLicense(selectedTenantId, controller.signal)
      .then((result) => {
        setLicense(result);
        setLicenseTenantId(selectedTenantId);
        setTier(result.licenseTier ?? 1);
        setValidTo(result.validTo ? new Date(result.validTo).toISOString().slice(0, 10) : "");
        setAutoRenew(result.autoRenew);
      }).catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(reason));
      }).finally(() => {
        if (!controller.signal.aborted) setLoadingLicense(false);
      });
    return () => controller.abort();
  }, [selectedTenantId, refreshKey]);

  const activeLicense = licenseTenantId === selectedTenantId ? license : null;
  const selectedPlan = plansQuery.data?.plans.find((plan) => plan.licenseTier === tier);
  const studentPercent = useMemo(
    () => usagePercent(activeLicense?.activeStudents ?? 0, activeLicense?.maxStudentsQuota ?? 0),
    [activeLicense],
  );
  const lecturerPercent = useMemo(
    () => usagePercent(activeLicense?.activeLecturers ?? 0, activeLicense?.maxLecturersQuota ?? 0),
    [activeLicense],
  );
  const storagePercent = useMemo(
    () => usagePercent(activeLicense?.currentStorageBytes ?? 0, activeLicense?.storageQuotaBytes ?? 0),
    [activeLicense],
  );
  const filteredTenants = useMemo(() => {
    const term = tenantSearch.trim().toLocaleLowerCase("vi-VN");
    if (!term) return tenants;
    return tenants.filter((tenant) =>
      `${tenant.name} ${tenant.tenantCode}`.toLocaleLowerCase("vi-VN").includes(term),
    );
  }, [tenantSearch, tenants]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTenantId || !validTo || !selectedPlan) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await systemTenantsService.updateLicense(selectedTenantId, {
        planCode: selectedPlan.code,
        validTo: new Date(`${validTo}T23:59:59.000Z`).toISOString(),
        autoRenew,
      });
      setLicense(updated);
      setLicenseTenantId(selectedTenantId);
      onShowToast("Đã cập nhật bản quyền và tạo kỳ hạn mới.", "success");
    } catch (reason: unknown) {
      setError(getApiErrorMessage(reason));
      onShowToast(getApiErrorMessage(reason), "danger");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "h-9 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-800 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20";
  const displayedError = error
    ?? tenantListError?.message
    ?? (plansQuery.error ? getApiErrorMessage(plansQuery.error) : null);
  const licenseStatus = activeLicense
    ? getLicenseStatus(activeLicense.isActive, activeLicense.validTo)
    : null;

  return (
    <div className="min-h-full bg-slate-50">
      <PlatformPageHeader
        title="Quản lý Gói & Giấy phép bản quyền (Licenses)"
        description="Theo dõi hạn mức và kỳ hạn theo đơn vị triển khai."
        breadcrumbs={[
          { label: "Quản trị nền tảng", href: "/admin/dashboard" },
          { label: "Đơn vị & bản quyền", href: "/admin/tenants" },
          { label: "Bản quyền & hạn mức" },
        ]}
        activeTenant={selectedTenant}
        onChangeTenant={() => document.getElementById("license-tenant")?.focus()}
      />
      <CompactActionBar
        icon={Award}
        title="Bản quyền & hạn mức"
        subtitle="Quản lý gói bản quyền và hạn mức"
        hideTitle
        actions={[{
          label: "Làm mới",
          icon: RefreshCw,
          onClick: () => setRefreshKey((value) => value + 1),
          loading: loadingTenants || loadingLicense,
        }]}
      />
      <main className={PLATFORM_PAGE_CONTENT_CLASS}>
        {displayedError && (
          <div role="alert" className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{displayedError}
          </div>
        )}

        <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-md">
            <label htmlFor="license-tenant-search" className="mb-1 block text-[11px] font-bold text-slate-600">Tìm đơn vị triển khai</label>
            <input id="license-tenant-search" type="search" value={tenantSearch} onChange={(event) => setTenantSearch(event.target.value)} placeholder="Tên hoặc mã đơn vị..." className={`${inputClass} mb-2`} />
            <label htmlFor="license-tenant" className="sr-only">Đơn vị triển khai</label>
            <select id="license-tenant" value={selectedTenantId} onChange={(event) => {
              selectTenant(event.target.value);
              setTenantSearch("");
            }} disabled={loadingTenants || tenants.length === 0} className={inputClass}>
              {tenants.length > 0 && !selectedTenantId && <option value="">Chọn đơn vị triển khai</option>}
              {tenants.length === 0 && <option value="">{loadingTenants ? "Đang tải đơn vị..." : "Chưa có đơn vị triển khai"}</option>}
              {filteredTenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.tenantCode}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-slate-500">{filteredTenants.length.toLocaleString("vi-VN")} / {tenants.length.toLocaleString("vi-VN")} đơn vị</p>
          </div>
          {activeLicense && (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`rounded-[3px] border px-2 py-1 font-semibold ${
                licenseStatus === "active"
                  ? "border-[#7bc043]/40 bg-[#7bc043]/10 text-[#385d1b]"
                  : licenseStatus === "expired"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-amber-200 bg-amber-50 text-amber-800"
              }`}>
                {licenseStatus === "active"
                  ? "Đang hoạt động"
                  : licenseStatus === "expired"
                    ? "Đã hết hạn"
                    : "Tạm dừng"}
              </span>
              <span className="text-slate-500">Hiệu lực đến <b className="text-slate-700">{formatDate(activeLicense.validTo)}</b></span>
            </div>
          )}
        </section>

        {activeLicense && (
          <>
            <section aria-label="Mức độ sử dụng hạn mức" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <QuotaCard
                icon={GraduationCap}
                title="Sinh viên đang hoạt động"
                usedLabel={`${activeLicense.activeStudents.toLocaleString("vi-VN")} / ${activeLicense.maxStudentsQuota.toLocaleString("vi-VN")} SV`}
                percent={studentPercent}
                detail={`Còn ${Math.max(0, activeLicense.maxStudentsQuota - activeLicense.activeStudents).toLocaleString("vi-VN")} suất`}
              />
              <QuotaCard
                icon={UsersRound}
                title="Giảng viên đang hoạt động"
                usedLabel={`${activeLicense.activeLecturers.toLocaleString("vi-VN")} / ${activeLicense.maxLecturersQuota.toLocaleString("vi-VN")} GV`}
                percent={lecturerPercent}
                detail={`Còn ${Math.max(0, activeLicense.maxLecturersQuota - activeLicense.activeLecturers).toLocaleString("vi-VN")} suất`}
              />
              <QuotaCard
                icon={Database}
                title="Dung lượng lưu trữ"
                usedLabel={`${formatGB(activeLicense.currentStorageBytes)} / ${formatGB(activeLicense.storageQuotaBytes)} GB`}
                percent={storagePercent}
                detail="Dung lượng sử dụng"
              />
            </section>

            <section className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,.9fr)]">
              <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Lịch sử bản quyền</h2>
                    <p className="mt-0.5 text-[11px] text-slate-500">Các kỳ cấp mới, nâng cấp và gia hạn đã ghi nhận.</p>
                  </div>
                  <span className="rounded-[3px] border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{activeLicense.history.length} kỳ</span>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-left">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        {["Gói bản quyền", "Hạn mức", "Thời hạn", "Trạng thái"].map((heading) => (
                          <th key={heading} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeLicense.history.length === 0 ? (
                        <tr><td colSpan={4} className="px-3 py-10 text-center text-xs text-slate-500">Chưa có lịch sử bản quyền.</td></tr>
                      ) : activeLicense.history.map((term) => {
                        const termStatus = getLicenseStatus(term.isActive, term.validTo);
                        return (
                          <tr key={term.id} className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-2.5 text-xs font-semibold text-slate-800">{licenseTierLabel(term.licenseTier)}</td>
                            <td className="px-3 py-2.5 text-[11px] text-slate-600">
                              <span className="block">{term.maxStudentsQuota.toLocaleString("vi-VN")} SV</span>
                              <span className="text-slate-400">{term.maxLecturersQuota.toLocaleString("vi-VN")} GV · {formatGB(term.storageQuotaBytes)} GB</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-slate-600">{formatDate(term.validFrom)} — {formatDate(term.validTo)}</td>
                            <td className="px-3 py-2.5">
                              <span className={`rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold ${
                                termStatus === "active"
                                  ? "border-[#7bc043]/40 bg-[#7bc043]/10 text-[#385d1b]"
                                  : termStatus === "expired"
                                    ? "border-rose-200 bg-rose-50 text-rose-700"
                                    : "border-slate-200 bg-slate-50 text-slate-500"
                              }`}>
                                {termStatus === "active"
                                  ? "Đang hoạt động"
                                  : termStatus === "expired"
                                    ? "Đã hết hạn"
                                    : "Đã kết thúc"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                <div className="border-b border-slate-100 pb-2">
                  <h2 className="text-sm font-bold text-slate-800">Điều chỉnh hợp đồng</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">Cấp/gia hạn trực tiếp, không tạo hóa đơn. Muốn thu phí, hãy tạo hóa đơn tại trang Thanh toán.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold text-slate-600">Gói bản quyền</span>
                    <select value={tier} onChange={(event) => setTier(Number(event.target.value) as LicenseTier)} disabled={plansQuery.isLoading || !plansQuery.data?.plans.length} className={inputClass}>
                      {(plansQuery.data?.plans ?? []).map((plan) => (
                        <option key={plan.code} value={plan.licenseTier}>{plan.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold text-slate-600">Gia hạn đến</span>
                    <input required type="date" min={new Date().toISOString().slice(0, 10)} value={validTo} onChange={(event) => setValidTo(event.target.value)} className={inputClass} />
                  </label>
                  <div className="sm:col-span-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold text-slate-600">Hạn mức chuẩn của gói</p>
                    {selectedPlan ? (
                      <p className="mt-1 text-xs font-semibold text-slate-800">
                        {selectedPlan.maxStudentsQuota.toLocaleString("vi-VN")} sinh viên · {selectedPlan.maxLecturersQuota.toLocaleString("vi-VN")} giảng viên · {formatGB(selectedPlan.storageQuotaBytes)} GB
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-800">Chưa tải được cấu hình gói.</p>
                    )}
                    <p className="mt-1 text-[10px] text-slate-500">Muốn thay đổi hạn mức chuẩn, cập nhật tại Bảng giá dịch vụ. Các kỳ đã cấp không bị thay đổi.</p>
                  </div>
                  <label className="flex min-h-9 items-center gap-2 self-end rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-700">
                    <input type="checkbox" checked={autoRenew} onChange={(event) => setAutoRenew(event.target.checked)} className="h-4 w-4 accent-[#026aa7]" />
                    Tự động gia hạn
                  </label>
                </div>
                <div className="flex justify-end border-t border-slate-100 pt-3">
                  <button type="submit" disabled={saving || loadingLicense || plansQuery.isLoading || !selectedPlan || !validTo} className="inline-flex h-9 items-center gap-2 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e] disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    Lưu kỳ hạn mới
                  </button>
                </div>
              </form>
            </section>
          </>
        )}

        {loadingLicense && (
          <div className="flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white p-10 text-xs text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin text-[#026aa7]" aria-hidden="true" />Đang tải mức sử dụng bản quyền...
          </div>
        )}
        {!loadingTenants && tenants.length === 0 && (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center">
            <Award className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-slate-700">Chưa có đơn vị triển khai</p>
            <p className="mt-1 text-[11px] text-slate-500">Tạo đơn vị triển khai trước khi quản lý bản quyền.</p>
          </div>
        )}
        {!loadingTenants && tenants.length > 0 && !selectedTenantId && (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-600">
            Chọn đơn vị triển khai ở danh sách phía trên để xem và quản lý bản quyền.
          </div>
        )}
      </main>
    </div>
  );
}
