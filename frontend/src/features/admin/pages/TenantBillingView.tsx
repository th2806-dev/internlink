import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Download,
  LoaderCircle,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCw,
  Settings2,
  X,
} from "lucide-react";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { useActiveTenant } from "../../../contexts/ActiveTenantContext";
import type { ToastType } from "../../../contexts/ToastContext";
import { ApiClientError, getApiErrorMessage } from "../../../lib/apiClient";
import { PLATFORM_PAGE_CONTENT_CLASS, PlatformPageHeader } from "../components/PlatformPageHeader";
import { BillingPaymentNoticeModal } from "../components/BillingPaymentNoticeModal";
import {
  billingStatusLabel,
  systemBillingService,
  type BillingInvoiceStatus,
  type BillingPriceCatalog,
  type BillingPriceCatalogItem,
  type BillingPlanOption,
  type CreateBillingPriceCatalogItem,
  type CreateTenantBillingInvoice,
  type TenantBillingInvoice,
  type UpdateBillingPriceCatalogItem,
  type VietQrPayment,
  type VietQrSettings,
} from "../../../services/systemBilling.service";
import { systemCatalogService } from "../../../services/systemCatalog.service";

type Props = { onShowToast: (message: string, type?: ToastType) => void };
const PAGE_SIZE = 25;

function formatCurrency(value: number): string {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
}

function statusClass(status: BillingInvoiceStatus): string {
  switch (status) {
    case "Paid": return "border-[#7bc043]/40 bg-[#7bc043]/10 text-slate-800";
    case "PendingPayment": return "border-amber-200 bg-amber-50 text-amber-800";
    case "Overdue":
    case "Cancelled": return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

function InvoiceForm({
  tenantId,
  onClose,
  onCreate,
}: {
  tenantId: string;
  onClose: () => void;
  onCreate: (request: CreateTenantBillingInvoice) => Promise<void>;
}) {
  const { tenants } = useActiveTenant();
  const [selectedTenantId, setSelectedTenantId] = useState(tenantId);
  const [planCode, setPlanCode] = useState("");
  const [cycle, setCycle] = useState(12);
  const [paymentMethod, setPaymentMethod] = useState<"VietQR" | "BankTransfer">("VietQR");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priceQuery = useQuery({
    queryKey: ["system-admin", "billing", "price-catalog", "current"],
    queryFn: ({ signal }) => systemBillingService.getPriceCatalog(true, signal),
  });
  const catalogQuery = useQuery({
    queryKey: ["system-admin", "catalogs"],
    queryFn: ({ signal }) => systemCatalogService.getCatalog(signal),
  });
  const catalog = priceQuery.data;
  const availablePlans = catalog?.plans.filter((plan) =>
    catalog.items.some((price) => price.planCode === plan.code)) ?? [];
  const selectedPlanCode = availablePlans.some((plan) => plan.code === planCode)
    ? planCode
    : availablePlans[0]?.code ?? "";
  const selectedPlan = catalog?.plans.find((plan) => plan.code === selectedPlanCode);
  const cycleOptions = catalog?.billingCycleOptions.filter((option) =>
    catalog.items.some((price) =>
      price.planCode === selectedPlanCode && price.billingCycleMonths === option)) ?? [];
  const selectedCycle = cycleOptions.includes(cycle) ? cycle : cycleOptions[0] ?? 12;
  const selectedPrice = catalog?.items.find((price) =>
    price.planCode === selectedPlanCode && price.billingCycleMonths === selectedCycle);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!selectedPrice) {
      setError("Không có mức giá đang hiệu lực cho lựa chọn này.");
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        tenantId: selectedTenantId,
        planCode: selectedPlanCode,
        billingCycleMonths: selectedCycle,
        paymentMethod,
        dueDate: dueDate ? new Date(`${dueDate}T23:59:59.000Z`).toISOString() : null,
      });
      onClose();
    } catch (reason: unknown) {
      setError(getApiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "h-9 w-full rounded-[4px] border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20";
  const labelClass = "mb-1 block text-[11px] font-semibold text-slate-600";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3">
      <button type="button" className="absolute inset-0 bg-slate-950/45" onClick={onClose} aria-label="Đóng tạo hóa đơn" />
      <section role="dialog" aria-modal="true" aria-labelledby="invoice-form-title" className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-md border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 id="invoice-form-title" className="text-sm font-bold text-slate-900">Tạo hóa đơn bản quyền</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Giá và VAT được tính từ catalog đang có hiệu lực.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[4px] text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X className="h-4 w-4" aria-hidden="true" /></button>
        </header>
        <form onSubmit={(event) => void submit(event)} className="space-y-3 p-4">
          {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">{error}</p>}
          {priceQuery.error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">{getApiErrorMessage(priceQuery.error)}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className={labelClass}>Đơn vị *</span>
              <select required value={selectedTenantId} onChange={(event) => setSelectedTenantId(event.target.value)} className={inputClass}>
                <option value="">Chọn đơn vị</option>
                {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.tenantCode})</option>)}
              </select>
            </label>
            <label>
              <span className={labelClass}>Gói bản quyền *</span>
              <select
                required
                value={selectedPlanCode}
                onChange={(event) => {
                  setPlanCode(event.target.value);
                  setCycle(12);
                }}
                className={inputClass}
                disabled={availablePlans.length === 0}
              >
                {availablePlans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
              </select>
            </label>
            <label>
              <span className={labelClass}>Chu kỳ thanh toán *</span>
              <select
                value={selectedCycle}
                onChange={(event) => setCycle(Number(event.target.value))}
                className={inputClass}
                disabled={cycleOptions.length === 0}
              >
                {cycleOptions.map((option) => <option key={option} value={option}>{option} tháng</option>)}
              </select>
            </label>
            <div className="sm:col-span-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
              {priceQuery.isLoading ? (
                <p role="status" className="text-slate-500">Đang tải bảng giá...</p>
              ) : selectedPrice ? (
                <dl className="grid grid-cols-2 gap-2">
                  <dt className="text-slate-500">Đơn giá trước VAT</dt>
                  <dd className="text-right font-semibold tabular-nums text-slate-800">{formatCurrency(selectedPrice.baseAmountVnd)}</dd>
                  <dt className="text-slate-500">VAT ({selectedPrice.taxRatePercent}%)</dt>
                  <dd className="text-right font-semibold tabular-nums text-slate-800">{formatCurrency(selectedPrice.taxAmountVnd ?? 0)}</dd>
                  <dt className="font-bold text-slate-700">Tổng thanh toán</dt>
                  <dd className="text-right font-bold tabular-nums text-slate-900">{formatCurrency(selectedPrice.totalAmountVnd ?? 0)}</dd>
                  <dt className="border-t border-slate-200 pt-2 text-slate-500">Hạn mức theo gói</dt>
                  <dd className="border-t border-slate-200 pt-2 text-right font-semibold text-slate-800">
                    {selectedPlan
                      ? `${selectedPlan.maxStudentsQuota.toLocaleString("vi-VN")} SV · ${selectedPlan.maxLecturersQuota.toLocaleString("vi-VN")} GV · ${(selectedPlan.storageQuotaBytes / 1024 ** 3).toLocaleString("vi-VN")} GB`
                      : "—"}
                  </dd>
                </dl>
              ) : (
                <p className="text-amber-800">Chưa có gói/chu kỳ với thuế suất đã cấu hình và đang hiệu lực. Hãy cập nhật catalog trước khi tạo hóa đơn.</p>
              )}
            </div>
            <label>
              <span className={labelClass}>Phương thức *</span>
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "VietQR" | "BankTransfer")} className={inputClass}>
                {(catalogQuery.data?.paymentMethods ?? []).map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>Hạn thanh toán</span>
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClass} />
            </label>
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={onClose} className="h-9 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-600">Hủy</button>
            <button type="submit" disabled={saving || !selectedTenantId || !selectedPrice || priceQuery.isLoading} className="inline-flex h-9 items-center gap-2 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e] disabled:opacity-50">
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />} Tạo hóa đơn
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fromLocalDateTimeInput(value: string): string {
  return new Date(value).toISOString();
}

function BillingPriceCatalogModal({
  onClose,
  onSaved,
  onShowToast,
}: {
  onClose: () => void;
  onSaved: () => void;
  onShowToast: Props["onShowToast"];
}) {
  const cache = useQueryClient();
  const catalogQuery = useQuery({
    queryKey: ["system-admin", "billing", "price-catalog"],
    queryFn: ({ signal }) => systemBillingService.getPriceCatalog(false, signal),
  });
  const catalog: BillingPriceCatalog | undefined = catalogQuery.data;
  const [editingPrice, setEditingPrice] = useState<BillingPriceCatalogItem | null>(null);
  const [planCode, setPlanCode] = useState("");
  const [cycle, setCycle] = useState(12);
  const [baseAmount, setBaseAmount] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(toLocalDateTimeInput(new Date().toISOString()));
  const [effectiveTo, setEffectiveTo] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<BillingPlanOption | null>(null);
  const [planStudents, setPlanStudents] = useState("");
  const [planLecturers, setPlanLecturers] = useState("");
  const [planStorageGB, setPlanStorageGB] = useState("");
  const [planSaveError, setPlanSaveError] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const inputClass = "h-9 w-full rounded-[4px] border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20";
  const labelClass = "mb-1 block text-[11px] font-semibold text-slate-600";

  const resetEditor = () => {
    setEditingPrice(null);
    setPlanCode(catalog?.plans[0]?.code ?? "");
    setCycle(catalog?.billingCycleOptions[0] ?? 12);
    setBaseAmount("");
    setTaxRate("");
    setEffectiveFrom(toLocalDateTimeInput(new Date().toISOString()));
    setEffectiveTo("");
    setIsActive(true);
    setSaveError(null);
  };

  const editPrice = (price: BillingPriceCatalogItem) => {
    setEditingPrice(price);
    setPlanCode(price.planCode);
    setCycle(price.billingCycleMonths);
    setBaseAmount(String(price.baseAmountVnd));
    setTaxRate(price.taxRatePercent == null ? "" : String(price.taxRatePercent));
    setEffectiveFrom(toLocalDateTimeInput(price.effectiveFrom));
    setEffectiveTo(price.effectiveTo ? toLocalDateTimeInput(price.effectiveTo) : "");
    setIsActive(price.isActive);
    setSaveError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const request: CreateBillingPriceCatalogItem = {
        planCode,
        billingCycleMonths: cycle,
        baseAmountVnd: Number(baseAmount),
        taxRatePercent: Number(taxRate),
        effectiveFrom: fromLocalDateTimeInput(effectiveFrom),
        effectiveTo: effectiveTo ? fromLocalDateTimeInput(effectiveTo) : null,
      };
      if (editingPrice) {
        const update: UpdateBillingPriceCatalogItem = { ...request, isActive };
        await systemBillingService.updatePriceCatalogItem(editingPrice.id, update);
      } else {
        await systemBillingService.createPriceCatalogItem(request);
      }
      await cache.invalidateQueries({ queryKey: ["system-admin", "billing", "price-catalog"] });
      await cache.invalidateQueries({ queryKey: ["system-admin", "billing"] });
      onShowToast(editingPrice ? "Đã cập nhật phiên bản giá." : "Đã thêm phiên bản giá.", "success");
      resetEditor();
      onSaved();
    } catch (reason: unknown) {
      setSaveError(getApiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const prices = catalog?.items ?? [];
  const lockedPriceFields = editingPrice?.isUsedByInvoice ?? false;

  const editPlan = (plan: BillingPlanOption) => {
    setEditingPlan(plan);
    setPlanStudents(String(plan.maxStudentsQuota));
    setPlanLecturers(String(plan.maxLecturersQuota));
    setPlanStorageGB(String(plan.storageQuotaBytes / 1024 ** 3));
    setPlanSaveError(null);
  };

  const savePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPlan) return;
    setPlanSaveError(null);
    setSavingPlan(true);
    try {
      await systemBillingService.updatePlan(editingPlan.code, {
        maxStudentsQuota: Number(planStudents),
        maxLecturersQuota: Number(planLecturers),
        storageQuotaBytes: Math.round(Number(planStorageGB) * 1024 ** 3),
      });
      await cache.invalidateQueries({ queryKey: ["system-admin", "billing", "price-catalog"] });
      setEditingPlan(null);
      onShowToast("Đã cập nhật hạn mức gói. Hóa đơn hiện có không thay đổi.", "success");
    } catch (reason: unknown) {
      setPlanSaveError(getApiErrorMessage(reason));
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3">
      <button type="button" className="absolute inset-0 bg-slate-950/45" onClick={onClose} aria-label="Đóng bảng giá" />
      <section role="dialog" aria-modal="true" aria-labelledby="billing-price-title" className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-y-auto rounded-md border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 id="billing-price-title" className="text-sm font-bold text-slate-900">Bảng giá dịch vụ</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Đơn giá trước VAT; thuế suất được cấu hình theo từng phiên bản giá.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-8 w-8 items-center justify-center rounded-[4px] text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" aria-hidden="true" /></button>
        </header>
        <div className="space-y-4 p-4">
          {catalogQuery.error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">{getApiErrorMessage(catalogQuery.error)}</p>}
          {saveError && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">{saveError}</p>}
          <section className="space-y-3 rounded-md border border-slate-200 p-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Hạn mức gói bản quyền</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">Thay đổi chỉ áp dụng cho hóa đơn và kỳ bản quyền tạo mới; dữ liệu đã phát hành được giữ nguyên.</p>
            </div>
            {planSaveError && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">{planSaveError}</p>}
            <div className="grid gap-2 md:grid-cols-3">
              {(catalog?.plans ?? []).map((plan) => (
                <article key={plan.code} className="flex items-start justify-between gap-2 rounded-md bg-slate-50 p-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{plan.name}</p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-500">
                      {plan.maxStudentsQuota.toLocaleString("vi-VN")} SV · {plan.maxLecturersQuota.toLocaleString("vi-VN")} GV · {(plan.storageQuotaBytes / 1024 ** 3).toLocaleString("vi-VN")} GB
                    </p>
                  </div>
                  <button type="button" aria-label={`Chỉnh sửa hạn mức ${plan.name}`} onClick={() => editPlan(plan)} className="shrink-0 rounded-[4px] border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100">
                    Chỉnh sửa
                  </button>
                </article>
              ))}
            </div>
            {editingPlan && (
              <form onSubmit={(event) => void savePlan(event)} className="grid gap-3 rounded-md border border-[#026aa7]/20 bg-[#026aa7]/5 p-3 sm:grid-cols-3">
                <p className="sm:col-span-3 text-xs font-bold text-slate-800">Hạn mức mới · {editingPlan.name}</p>
                <label>
                  <span className={labelClass}>Sinh viên</span>
                  <input required min="1" type="number" value={planStudents} onChange={(event) => setPlanStudents(event.target.value)} className={inputClass} />
                </label>
                <label>
                  <span className={labelClass}>Giảng viên</span>
                  <input required min="1" type="number" value={planLecturers} onChange={(event) => setPlanLecturers(event.target.value)} className={inputClass} />
                </label>
                <label>
                  <span className={labelClass}>Lưu trữ (GB)</span>
                  <input required min="1" step="0.5" type="number" value={planStorageGB} onChange={(event) => setPlanStorageGB(event.target.value)} className={inputClass} />
                </label>
                <footer className="flex justify-end gap-2 sm:col-span-3">
                  <button type="button" onClick={() => setEditingPlan(null)} className="h-8 rounded-[4px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">Hủy</button>
                  <button type="submit" disabled={savingPlan} className="h-8 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white disabled:opacity-50">
                    {savingPlan ? "Đang lưu..." : "Lưu hạn mức"}
                  </button>
                </footer>
              </form>
            )}
          </section>
          <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-slate-800">{editingPrice ? `Chỉnh sửa ${editingPrice.planCode} · ${editingPrice.billingCycleMonths} tháng` : "Thêm phiên bản giá"}</h3>
              {editingPrice && <button type="button" onClick={resetEditor} className="text-[11px] font-semibold text-[#026aa7]">Hủy chỉnh sửa</button>}
            </div>
            {lockedPriceFields && <p className="text-[11px] text-amber-800">Phiên bản này đã được dùng trên hóa đơn; chỉ được điều chỉnh ngày kết thúc và trạng thái, không được thay đổi giá hoặc thuế suất.</p>}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label>
                <span className={labelClass}>Gói bản quyền *</span>
                <select required value={planCode} onChange={(event) => setPlanCode(event.target.value)} disabled={lockedPriceFields || !catalog?.plans.length} className={inputClass}>
                  {(catalog?.plans ?? []).map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
                </select>
              </label>
              <label>
                <span className={labelClass}>Chu kỳ *</span>
                <select required value={cycle} onChange={(event) => setCycle(Number(event.target.value))} disabled={lockedPriceFields || !catalog?.billingCycleOptions.length} className={inputClass}>
                  {(catalog?.billingCycleOptions ?? []).map((option) => <option key={option} value={option}>{option} tháng</option>)}
                </select>
              </label>
              <label>
                <span className={labelClass}>Đơn giá trước VAT (VND) *</span>
                <input required min="1" step="1" type="number" value={baseAmount} onChange={(event) => setBaseAmount(event.target.value)} disabled={lockedPriceFields} className={inputClass} />
              </label>
              <label>
                <span className={labelClass}>Thuế suất VAT (%) *</span>
                <input required min="0" max="100" step="0.01" type="number" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} disabled={lockedPriceFields} className={inputClass} />
              </label>
              <label>
                <span className={labelClass}>Hiệu lực từ *</span>
                <input required type="datetime-local" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} disabled={lockedPriceFields} className={inputClass} />
              </label>
              <label>
                <span className={labelClass}>Hiệu lực đến (không bao gồm, để trống = vô thời hạn)</span>
                <input type="datetime-local" value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} className={inputClass} />
              </label>
              {editingPrice && (
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
                  Đang kích hoạt
                </label>
              )}
            </div>
            <footer className="flex justify-end gap-2">
              <button type="submit" disabled={saving || catalogQuery.isLoading || !planCode || !effectiveFrom} className="inline-flex h-9 items-center gap-2 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e] disabled:opacity-50">
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {editingPrice ? "Lưu thay đổi" : "Thêm giá"}
              </button>
            </footer>
          </form>

          <section className="overflow-x-auto rounded-md border border-slate-200">
            {catalogQuery.isLoading ? (
              <p role="status" className="p-6 text-center text-xs text-slate-500">Đang tải bảng giá...</p>
            ) : prices.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">Chưa có phiên bản giá.</p>
            ) : (
              <table className="w-full min-w-[900px] border-collapse text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>{["Gói / chu kỳ", "Đơn giá trước VAT", "VAT", "Tổng", "Hiệu lực", "Trạng thái", "Thao tác"].map((item) => <th key={item} className="px-3 py-2.5">{item}</th>)}</tr>
                </thead>
                <tbody>
                  {prices.map((price) => (
                    <tr key={price.id} className="border-t border-slate-100">
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{price.planName}<span className="block text-[10px] font-normal text-slate-500">{price.billingCycleMonths} tháng</span></td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatCurrency(price.baseAmountVnd)}</td>
                      <td className="px-3 py-2.5">{price.taxRatePercent == null ? "Chưa cấu hình" : `${price.taxRatePercent}%`}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-semibold tabular-nums">{price.totalAmountVnd == null ? "—" : formatCurrency(price.totalAmountVnd)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[10px] text-slate-600">{formatDateTime(price.effectiveFrom)} – {formatDateTime(price.effectiveTo)}</td>
                      <td className="px-3 py-2.5">{price.isActive ? "Kích hoạt" : "Ngưng"}{price.isUsedByInvoice && <span className="ml-1 text-[10px] text-slate-500">· đã xuất HĐ</span>}</td>
                      <td className="px-3 py-2.5"><button type="button" onClick={() => editPrice(price)} className="h-7 rounded-[4px] border border-slate-200 px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50">Chỉnh sửa</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function VietQrModal({
  invoice,
  onClose,
  onPrint,
}: {
  invoice: TenantBillingInvoice;
  onClose: () => void;
  onPrint: () => void;
}) {
  const [payment, setPayment] = useState<VietQrPayment | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const paymentQuery = useQuery({
    queryKey: ["system-admin", "billing", "vietqr", invoice.id],
    queryFn: ({ signal }) => systemBillingService.getVietQr(invoice.id, signal),
    staleTime: 0,
  });
  const catalogQuery = useQuery({
    queryKey: ["system-admin", "catalogs"],
    queryFn: ({ signal }) => systemCatalogService.getCatalog(signal),
  });
  const paymentBank = catalogQuery.data?.vietQrBanks.find((bank) => bank.value === payment?.bankId);
  const paymentBankName = paymentBank?.label;
  const isConfigurationError = paymentQuery.error instanceof ApiClientError
    && paymentQuery.error.status === 503;

  useEffect(() => {
    if (!paymentQuery.data) return;
    setPayment(paymentQuery.data);
    void QRCode.toDataURL(paymentQuery.data.payload, { width: 280, margin: 2, errorCorrectionLevel: "M" })
      .then(setQrDataUrl)
      .catch((reason: unknown) => setError(getApiErrorMessage(reason)));
  }, [paymentQuery.data]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3">
      <button type="button" className="absolute inset-0 bg-slate-950/45" onClick={onClose} aria-label="Đóng VietQR" />
      <section role="dialog" aria-modal="true" aria-labelledby="vietqr-title" className="relative w-full max-w-md rounded-md border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div><h2 id="vietqr-title" className="text-sm font-bold text-slate-900">Mã thanh toán VietQR</h2><p className="text-[11px] text-slate-500">{invoice.invoiceNumber}</p></div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="flex h-8 w-8 items-center justify-center rounded-[4px] text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" aria-hidden="true" /></button>
        </header>
        <div className="p-4">
          {paymentQuery.isLoading && <div role="status" className="flex min-h-48 items-center justify-center text-xs text-slate-500"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Đang tạo mã thanh toán...</div>}
          {(paymentQuery.error || error) && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error ?? getApiErrorMessage(paymentQuery.error)}</p>}
          {isConfigurationError && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              VietQR chưa được cấu hình trên máy chủ. Cần thiết lập `Billing:VietQr:BankId`, `AccountNo`, `AccountName` và `MerchantCity` bằng thông tin tài khoản nhận tiền hợp lệ trước khi tạo mã.
            </p>
          )}
          {payment && (
            <div className="text-center">
              {qrDataUrl && <img src={qrDataUrl} alt={`Mã VietQR cho hóa đơn ${invoice.invoiceNumber}`} className="mx-auto h-64 w-64" />}
              <p className="mt-2 text-lg font-bold tabular-nums text-slate-900">{formatCurrency(payment.amountVnd)}</p>
              <dl className="mt-3 space-y-1 rounded-md bg-slate-50 p-3 text-left text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Ngân hàng</dt>
                  <dd className="flex items-center gap-2 font-semibold text-slate-800">
                    {paymentBank?.logoUrl && <img src={paymentBank.logoUrl} alt="" className="h-6 w-6 object-contain" />}
                    {paymentBankName ?? "Ngân hàng thụ hưởng"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Số tài khoản</dt><dd className="font-mono font-semibold text-slate-800">{payment.accountNo}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Chủ tài khoản</dt><dd className="font-semibold text-slate-800">{payment.accountName}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Nội dung</dt><dd className="font-mono font-semibold text-slate-800">{payment.memo}</dd></div>
              </dl>
              <p className="mt-2 break-all text-[10px] text-slate-400">{payment.payload}</p>
            </div>
          )}
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            In giấy đề nghị thanh toán A4
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e]"
          >
            Đóng
          </button>
        </footer>
      </section>
    </div>
  );
}

function normalizeAsciiUpper(value: string): string {
  return value
    .replace(/[đĐ]/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function VietQrSettingsModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const cache = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["system-admin", "billing", "vietqr-settings"],
    queryFn: ({ signal }) => systemBillingService.getVietQrSettings(signal),
  });
  const catalogQuery = useQuery({
    queryKey: ["system-admin", "catalogs"],
    queryFn: ({ signal }) => systemCatalogService.getCatalog(signal),
  });
  const [settings, setSettings] = useState<VietQrSettings>({
    bankId: "",
    accountNo: "",
    accountName: "",
    merchantCity: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewPayment, setPreviewPayment] = useState<VietQrPayment | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState("");

  useEffect(() => {
    if (settingsQuery.data) setSettings(settingsQuery.data);
  }, [settingsQuery.data]);

  const changeSettings = (update: (current: VietQrSettings) => VietQrSettings) => {
    setSettings(update);
    setPreviewError(null);
    setPreviewPayment(null);
    setPreviewQrUrl("");
  };

  const createPreview = async () => {
    setPreviewError(null);
    setPreviewing(true);
    try {
      const payment = await systemBillingService.previewVietQr({
        ...settings,
        bankId: settings.bankId.trim(),
        accountNo: settings.accountNo.trim(),
        accountName: normalizeAsciiUpper(settings.accountName).trim(),
        merchantCity: normalizeAsciiUpper(settings.merchantCity).trim(),
      });
      const qrUrl = await QRCode.toDataURL(payment.payload, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      setPreviewPayment(payment);
      setPreviewQrUrl(qrUrl);
    } catch (reason: unknown) {
      setPreviewError(getApiErrorMessage(reason));
    } finally {
      setPreviewing(false);
    }
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const saved = await systemBillingService.updateVietQrSettings({
        ...settings,
        bankId: settings.bankId.trim(),
        accountNo: settings.accountNo.trim(),
        accountName: normalizeAsciiUpper(settings.accountName).trim(),
        merchantCity: normalizeAsciiUpper(settings.merchantCity).trim(),
      });
      cache.setQueryData(["system-admin", "billing", "vietqr-settings"], saved);
      onSaved();
    } catch (reason: unknown) {
      setSaveError(getApiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "h-9 w-full rounded-[4px] border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20";
  const labelClass = "mb-1 block text-[11px] font-semibold text-slate-600";
  const vietQrBanks = catalogQuery.data?.vietQrBanks ?? [];
  const hasCustomBank = settings.bankId && !vietQrBanks.some((bank) => bank.value === settings.bankId);
  const previewBankName = previewPayment
    ? vietQrBanks.find((bank) => bank.value === previewPayment.bankId)?.label
    : undefined;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45"
        onClick={onClose}
        disabled={saving}
        aria-label="Đóng cấu hình VietQR"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="vietqr-settings-title"
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-md border border-slate-200 bg-white shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !saving) onClose();
        }}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 id="vietqr-settings-title" className="text-sm font-bold text-slate-900">Cấu hình Tài khoản Thụ hưởng VietQR</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Thông tin này được lưu trên máy chủ và dùng cho mọi hóa đơn VietQR.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Đóng" className="flex h-8 w-8 items-center justify-center rounded-[4px] text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <form onSubmit={(event) => void saveSettings(event)} className="space-y-3 p-4">
          {settingsQuery.isLoading && <p role="status" className="text-xs text-slate-500">Đang tải cấu hình...</p>}
          {settingsQuery.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
              <span>{getApiErrorMessage(settingsQuery.error)}</span>
              <button type="button" onClick={() => void settingsQuery.refetch()} className="ml-auto font-semibold">Thử lại</button>
            </div>
          )}
          {saveError && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">{saveError}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className={labelClass}>Ngân hàng *</span>
              <select
                required
                value={settings.bankId}
                onChange={(event) => changeSettings((current) => ({ ...current, bankId: event.target.value }))}
                className={inputClass}
              >
                <option value="">Chọn ngân hàng</option>
                {hasCustomBank && <option value={settings.bankId}>Ngân hàng đang cấu hình</option>}
                {vietQrBanks.map((bank) => (
                  <option key={bank.value} value={bank.value}>{bank.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>Số tài khoản *</span>
              <input
                required
                maxLength={19}
                pattern="[A-Za-z0-9]{1,19}"
                autoComplete="off"
                value={settings.accountNo}
                onChange={(event) => changeSettings((current) => ({ ...current, accountNo: event.target.value }))}
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Tên chủ tài khoản (không dấu) *</span>
              <input
                required
                maxLength={25}
                value={settings.accountName}
                onChange={(event) => changeSettings((current) => ({
                  ...current,
                  accountName: normalizeAsciiUpper(event.target.value),
                }))}
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Chi nhánh *</span>
              <input
                required
                maxLength={15}
                value={settings.merchantCity}
                onChange={(event) => changeSettings((current) => ({ ...current, merchantCity: event.target.value }))}
                className={inputClass}
              />
            </label>
          </div>
          {previewError && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">{previewError}</p>}
          {previewPayment && previewQrUrl && (
            <section aria-label="Mã VietQR thử nghiệm" className="flex flex-col items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-center sm:flex-row sm:text-left">
              <img src={previewQrUrl} alt="Mã VietQR thử nghiệm trị giá 10.000 đồng" className="h-40 w-40 rounded-md border border-slate-200 bg-white p-2" />
              <div className="min-w-0 text-xs text-slate-700">
                <p className="font-bold text-slate-900">Mã thử nghiệm · {formatCurrency(previewPayment.amountVnd)}</p>
                <p className="mt-1 flex items-center gap-2">
                  {previewBankName && (
                    <img
                      src={vietQrBanks.find((bank) => bank.value === previewPayment.bankId)?.logoUrl ?? ""}
                      alt=""
                      className="h-6 w-6 object-contain"
                    />
                  )}
                  <span>Ngân hàng: {previewBankName ?? "Ngân hàng thụ hưởng"}</span>
                </p>
                <p>Số tài khoản: <span className="font-mono">{previewPayment.accountNo}</span></p>
                <p>Tên thụ hưởng: {previewPayment.accountName}</p>
                <p className="mt-1 text-[11px] text-slate-500">Không lưu cấu hình và không gắn với hóa đơn thật.</p>
              </div>
            </section>
          )}
          <footer className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={onClose} disabled={saving} className="h-9 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-50">Hủy</button>
            <button
              type="button"
              onClick={() => void createPreview()}
              disabled={saving || previewing || settingsQuery.isLoading
                || !settings.bankId.trim() || !settings.accountNo.trim()
                || !settings.accountName.trim() || !settings.merchantCity.trim()}
              className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {previewing ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <QrCode className="h-4 w-4" aria-hidden="true" />}
              Tạo mã thử nghiệm
            </button>
            <button type="submit" disabled={saving || settingsQuery.isLoading} className="inline-flex h-9 items-center gap-2 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e] disabled:opacity-50">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Settings2 className="h-4 w-4" aria-hidden="true" />}
              Lưu cấu hình
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export function TenantBillingView({ onShowToast }: Props) {
  const cache = useQueryClient();
  const { tenants, selectedTenant, selectedTenantId, selectTenant, isLoading: tenantsLoading, error: tenantsError } = useActiveTenant();
  const [tenantFilter, setTenantFilter] = useState(selectedTenantId);
  const [statusFilter, setStatusFilter] = useState<BillingInvoiceStatus | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [priceCatalogOpen, setPriceCatalogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [qrInvoice, setQrInvoice] = useState<TenantBillingInvoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<TenantBillingInvoice | null>(null);
  const [actionInvoiceId, setActionInvoiceId] = useState<string | null>(null);
  const [markPaidInvoice, setMarkPaidInvoice] = useState<TenantBillingInvoice | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [markPaidError, setMarkPaidError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["system-admin", "billing", tenantFilter, statusFilter, fromDate, toDate, page],
    queryFn: ({ signal }) => systemBillingService.getInvoices({
      tenantId: tenantFilter || undefined,
      status: statusFilter,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      page,
      pageSize: PAGE_SIZE,
    }, signal),
  });
  const invoices = query.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((query.data?.totalCount ?? 0) / PAGE_SIZE));
  const selectedTenantForHeader = useMemo(
    () => selectedTenant ? { name: selectedTenant.name, tenantCode: selectedTenant.tenantCode } : null,
    [selectedTenant],
  );

  const createInvoice = async (request: CreateTenantBillingInvoice) => {
    await systemBillingService.createInvoice(request);
    await cache.invalidateQueries({ queryKey: ["system-admin", "billing"] });
    onShowToast("Đã tạo hóa đơn thanh toán.", "success");
  };

  const exportReport = async () => {
    try {
      const report = await systemBillingService.getInvoices({
        tenantId: tenantFilter || undefined,
        status: statusFilter,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page: 1,
        pageSize: 100,
      });
      const headers = [
        "Mã hóa đơn",
        "Đơn vị",
        "Mã đơn vị",
        "Gói",
        "Chu kỳ",
        "Giá trước VAT",
        "VAT",
        "VAT tiền",
        "Tổng tiền",
        "Trạng thái",
        "Phương thức",
        "Ngày tạo",
        "Hạn thanh toán",
        "Ngày thanh toán",
        "Mã giao dịch",
      ];
      const rows = report.items.map((invoice) => [
        invoice.invoiceNumber,
        invoice.tenantName,
        invoice.tenantCode,
        `${invoice.planName} (${invoice.planCode})`,
        invoice.billingCycleMonths,
        invoice.baseAmountVnd,
        invoice.taxRatePercent,
        invoice.taxAmountVnd,
        invoice.amountVnd,
        billingStatusLabel(invoice.status),
        invoice.paymentMethod,
        formatDate(invoice.createdAt),
        formatDate(invoice.dueDate),
        formatDate(invoice.paidAt),
        invoice.paymentReference ?? "",
      ]);
      const csv = [headers, ...rows]
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\r\n");
      const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `bao-cao-hoa-don-${fromDate || "tat-ca"}-${toDate || "tat-ca"}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      onShowToast(`Đã xuất ${report.items.length} hóa đơn.`, "success");
    } catch (reason: unknown) {
      onShowToast(getApiErrorMessage(reason), "danger");
    }
  };

  const markPaid = async (invoice: TenantBillingInvoice) => {
    if (!paymentReference.trim()) {
      setMarkPaidError("Mã giao dịch thanh toán không được để trống.");
      return;
    }
    setMarkPaidError(null);
    setActionInvoiceId(invoice.id);
    try {
      await systemBillingService.markPaid(invoice.id, paymentReference.trim());
      await cache.invalidateQueries({ queryKey: ["system-admin", "billing"] });
      await cache.invalidateQueries({ queryKey: ["system-admin", "tenants"] });
      setMarkPaidInvoice(null);
      setPaymentReference("");
      onShowToast("Đã xác nhận thanh toán và cập nhật bản quyền.", "success");
    } catch (reason: unknown) {
      setMarkPaidError(getApiErrorMessage(reason));
      onShowToast(getApiErrorMessage(reason), "danger");
    } finally {
      setActionInvoiceId(null);
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      <PlatformPageHeader
        title="Thanh toán & Hóa đơn B2B"
        description="Theo dõi hóa đơn, xác nhận thanh toán và cấp kỳ bản quyền cho đơn vị."
        breadcrumbs={[
          { label: "Quản trị nền tảng", href: "/admin/dashboard" },
          { label: "Đơn vị & bản quyền" },
          { label: "Thanh toán & hóa đơn" },
        ]}
        statistic={query.data ? `${query.data.totalCount.toLocaleString("vi-VN")} hóa đơn` : undefined}
        activeTenant={selectedTenantForHeader}
        onChangeTenant={() => selectTenant("")}
      />
      <CompactActionBar
        icon={ReceiptText}
        title="Thanh toán & Hóa đơn"
        subtitle="Quản lý thanh toán bản quyền"
        hideTitle
        total={query.data?.totalCount ?? 0}
        filters={
          <>
            <label className="sr-only" htmlFor="billing-tenant-filter">Lọc theo đơn vị</label>
            <select id="billing-tenant-filter" value={tenantFilter} onChange={(event) => { setTenantFilter(event.target.value); setPage(1); }} className="h-8 max-w-56 rounded-[4px] border border-slate-200 bg-white px-2 text-xs">
              <option value="">Tất cả đơn vị</option>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
            <label className="sr-only" htmlFor="billing-status-filter">Lọc theo trạng thái</label>
            <select id="billing-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as BillingInvoiceStatus | ""); setPage(1); }} className="h-8 rounded-[4px] border border-slate-200 bg-white px-2 text-xs">
              <option value="">Tất cả trạng thái</option>
              <option value="PendingPayment">Chờ thanh toán</option>
              <option value="Paid">Đã thanh toán</option>
              <option value="Overdue">Quá hạn</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
            <label className="flex h-8 items-center gap-1.5 text-[11px] text-slate-600">
              Từ
              <input aria-label="Từ ngày tạo hóa đơn" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className="h-8 rounded-[4px] border border-slate-200 bg-white px-2 text-xs" />
            </label>
            <label className="flex h-8 items-center gap-1.5 text-[11px] text-slate-600">
              Đến
              <input aria-label="Đến ngày tạo hóa đơn" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className="h-8 rounded-[4px] border border-slate-200 bg-white px-2 text-xs" />
            </label>
          </>
        }
        actions={[
          {
            label: "Xuất báo cáo",
            icon: Download,
            variant: "secondary",
            onClick: () => void exportReport(),
            disabled: query.isFetching,
          },
          {
            label: "Cấu hình tài khoản nhận tiền",
            icon: Settings2,
            variant: "secondary",
            onClick: () => setSettingsOpen(true),
          },
          {
            label: "Bảng giá dịch vụ",
            icon: CircleDollarSign,
            variant: "secondary",
            onClick: () => setPriceCatalogOpen(true),
          },
          {
            label: "Tạo hóa đơn mới",
            icon: CircleDollarSign,
            variant: "primary",
            onClick: () => setCreateOpen(true),
          },
        ]}
      />
      <main className={PLATFORM_PAGE_CONTENT_CLASS}>
        {query.data?.summary && (
          <section aria-label="KPI thanh toán" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Tổng hóa đơn",
                value: `${query.data.summary.totalCount} hóa đơn`,
                detail: `${formatCurrency(query.data.summary.totalAmountVnd)} tổng giá trị`,
                icon: ReceiptText,
                tone: "bg-[#026aa7]/10 text-[#026aa7]",
              },
              {
                label: "Chờ thanh toán",
                value: `${query.data.summary.pendingCount + query.data.summary.overdueCount} hóa đơn`,
                detail: `${formatCurrency(query.data.summary.outstandingAmountVnd)} còn phải thu`,
                icon: CircleDollarSign,
                tone: "bg-amber-100 text-amber-800",
              },
              {
                label: "Đã thanh toán",
                value: `${query.data.summary.paidCount} hóa đơn`,
                detail: `${formatCurrency(query.data.summary.paidAmountVnd)} đã thu`,
                icon: CheckCircle2,
                tone: "bg-[#7bc043]/15 text-[#385d1b]",
              },
              {
                label: "Quá hạn",
                value: `${query.data.summary.overdueCount} hóa đơn`,
                detail: query.data.summary.cancelledCount ? `${query.data.summary.cancelledCount} hóa đơn đã hủy` : "Không có hóa đơn quá hạn",
                icon: AlertCircle,
                tone: "bg-rose-100 text-rose-700",
              },
            ].map((metric) => (
              <article key={metric.label} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-500">{metric.label}</p>
                    <p className="mt-1 truncate text-xl font-bold tabular-nums text-slate-900">{metric.value}</p>
                  </div>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${metric.tone}`}>
                    <metric.icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-slate-500">{metric.detail}</p>
              </article>
            ))}
          </section>
        )}
        {(tenantsError || query.error) && (
          <div role="alert" className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {getApiErrorMessage(tenantsError ?? query.error)}
            <button type="button" onClick={() => { void query.refetch(); }} className="ml-auto inline-flex items-center gap-1 font-semibold"><RefreshCw className="h-3 w-3" aria-hidden="true" />Thử lại</button>
          </div>
        )}
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          {query.isLoading || tenantsLoading ? (
            <div role="status" className="flex min-h-44 items-center justify-center gap-2 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Đang tải hóa đơn...</div>
          ) : invoices.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <ReceiptText className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="mt-2 text-xs font-semibold text-slate-700">Chưa có hóa đơn phù hợp</p>
              <p className="mt-1 text-[11px] text-slate-500">Tạo hóa đơn mới để bắt đầu theo dõi thanh toán.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>{["Mã hóa đơn", "Đơn vị", "Gói / chu kỳ", "Giá trị", "Ngày tạo", "Hạn thanh toán", "Trạng thái", "Thao tác"].map((item) => <th key={item} className="whitespace-nowrap px-3 py-2.5">{item}</th>)}</tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-3 py-2.5"><span className="font-mono font-semibold text-[#026aa7]">{invoice.invoiceNumber}</span><span className="mt-0.5 block text-[10px] text-slate-500">{invoice.paymentMethod}</span></td>
                      <td className="px-3 py-2.5"><span className="block font-semibold text-slate-800">{invoice.tenantName}</span><span className="font-mono text-[10px] text-slate-500">{invoice.tenantCode}</span></td>
                      <td className="px-3 py-2.5"><span className="font-semibold text-slate-700">{invoice.planName}</span><span className="block text-[10px] text-slate-500">{invoice.planCode} · {invoice.billingCycleMonths} tháng</span></td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-semibold tabular-nums text-slate-800">
                        {formatCurrency(invoice.amountVnd)}
                        <span className="block text-[10px] font-normal text-slate-500">
                          Trước VAT {formatCurrency(invoice.baseAmountVnd)} · VAT {invoice.taxRatePercent}%
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{formatDate(invoice.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{formatDate(invoice.dueDate)}</td>
                      <td className="px-3 py-2.5"><span className={`inline-flex whitespace-nowrap rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold ${statusClass(invoice.status)}`}>{billingStatusLabel(invoice.status)}</span></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPrintInvoice(invoice)}
                            aria-label={`In đề nghị thanh toán ${invoice.invoiceNumber}`}
                            className="inline-flex h-8 items-center gap-1 rounded-[4px] border border-slate-200 px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                            In đề nghị
                          </button>
                          {invoice.status !== "Paid" && invoice.status !== "Cancelled" && invoice.paymentMethod === "VietQR" && (
                            <button type="button" onClick={() => setQrInvoice(invoice)} className="inline-flex h-8 items-center gap-1 rounded-[4px] border border-[#026aa7]/20 px-2 text-[10px] font-semibold text-[#026aa7] hover:bg-[#026aa7]/5"><QrCode className="h-3.5 w-3.5" aria-hidden="true" />Xem mã VietQR</button>
                          )}
                          {invoice.status === "PendingPayment" || invoice.status === "Overdue" ? (
                            <button type="button" disabled={actionInvoiceId === invoice.id} onClick={() => { setMarkPaidInvoice(invoice); setPaymentReference(""); setMarkPaidError(null); }} className="inline-flex h-8 items-center gap-1 rounded-[4px] border border-[#7bc043]/40 px-2 text-[10px] font-semibold text-[#3f6416] hover:bg-[#7bc043]/10 disabled:opacity-50">
                              {actionInvoiceId === invoice.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}Xác nhận thanh toán
                            </button>
                          ) : invoice.paidAt ? <span className="text-[10px] text-slate-500">Đã thu {formatDate(invoice.paidAt)}</span> : "—"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <footer className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500">
            <span>{query.data?.totalCount ?? 0} hóa đơn</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || query.isFetching} className="h-7 rounded-[4px] border border-slate-200 px-2 disabled:opacity-40">Trước</button>
              <span>Trang {page} / {pageCount}</span>
              <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page >= pageCount || query.isFetching} className="h-7 rounded-[4px] border border-slate-200 px-2 disabled:opacity-40">Sau</button>
            </div>
          </footer>
        </section>
      </main>
      {createOpen && <InvoiceForm tenantId={selectedTenantId} onClose={() => setCreateOpen(false)} onCreate={createInvoice} />}
      {priceCatalogOpen && (
        <BillingPriceCatalogModal
          onClose={() => setPriceCatalogOpen(false)}
          onSaved={() => setPriceCatalogOpen(false)}
          onShowToast={onShowToast}
        />
      )}
      {qrInvoice && (
        <VietQrModal
          invoice={qrInvoice}
          onClose={() => setQrInvoice(null)}
          onPrint={() => {
            setQrInvoice(null);
            setPrintInvoice(qrInvoice);
          }}
        />
      )}
      {printInvoice && (
        <BillingPaymentNoticeModal
          invoice={printInvoice}
          onClose={() => setPrintInvoice(null)}
        />
      )}
      {markPaidInvoice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => !actionInvoiceId && setMarkPaidInvoice(null)}
            aria-label="Đóng xác nhận thanh toán"
          />
          <section role="dialog" aria-modal="true" aria-labelledby="mark-paid-title" className="relative w-full max-w-md rounded-md border border-slate-200 bg-white shadow-2xl">
            <header className="border-b border-slate-200 px-4 py-3">
              <h2 id="mark-paid-title" className="text-sm font-bold text-slate-900">Xác nhận thanh toán</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">{markPaidInvoice.invoiceNumber} · {formatCurrency(markPaidInvoice.amountVnd)}</p>
            </header>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void markPaid(markPaidInvoice);
              }}
              className="space-y-3 p-4"
            >
              {markPaidError && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">{markPaidError}</p>}
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-600">Mã giao dịch ngân hàng *</span>
                <input
                  autoFocus
                  required
                  maxLength={100}
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  className="h-9 w-full rounded-[4px] border border-slate-200 px-2.5 text-xs outline-none focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                  placeholder="Ví dụ: FT260001234567"
                />
              </label>
              <footer className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setMarkPaidInvoice(null)} disabled={Boolean(actionInvoiceId)} className="h-9 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-50">Hủy</button>
                <button type="submit" disabled={Boolean(actionInvoiceId)} className="inline-flex h-9 items-center gap-2 rounded-[4px] bg-[#548a28] px-3 text-xs font-semibold text-white disabled:opacity-50">
                  {actionInvoiceId ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                  Xác nhận đã thanh toán
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {settingsOpen && (
        <VietQrSettingsModal
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false);
            onShowToast("Đã lưu cấu hình tài khoản nhận tiền VietQR.", "success");
          }}
        />
      )}
    </div>
  );
}
