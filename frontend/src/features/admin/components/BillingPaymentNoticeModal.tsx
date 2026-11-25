import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, LoaderCircle, Printer, X } from "lucide-react";
import QRCode from "qrcode";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { formatVnCurrencyText } from "../../../lib/formatVnCurrencyText";
import { adminSettingsService } from "../../../services/adminSettings.service";
import { resolveAppAssetUrl, useAppBranding } from "../../../contexts/AppBrandingContext";
import {
  systemBillingService,
  type TenantBillingInvoice,
  type VietQrPayment,
  type VietQrSettings,
} from "../../../services/systemBilling.service";
import { systemCatalogService } from "../../../services/systemCatalog.service";

type Props = {
  invoice: TenantBillingInvoice;
  onClose: () => void;
};

const ISSUER_FALLBACK = {
  name: "CÔNG TY CỔ PHẦN CÔNG NGHỆ INTERNLINK",
  address: "Tầng 8, Tòa nhà Công nghệ, Cầu Giấy, Hà Nội",
  taxCode: "0109887766",
  hotline: "1900 8899",
  email: "billing@internlink.vn",
};

function formatCurrency(value: number): string {
  return `${value.toLocaleString("vi-VN")} VNĐ`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDocumentDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `Ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
}

function formatStorageQuota(bytes: number): string {
  const gibibytes = bytes / 1024 ** 3;
  return `${gibibytes.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} GB`;
}

function invoiceStatusLabel(status: TenantBillingInvoice["status"]): string {
  switch (status) {
    case "Paid": return "Đã thanh toán";
    case "Cancelled": return "Đã hủy";
    case "Overdue": return "Quá hạn";
    case "PendingPayment": return "Chờ thanh toán";
  }
}

function PaymentDetails({
  payment,
  settings,
  invoice,
  bankName,
  bankLogoUrl,
}: {
  payment: VietQrPayment | undefined;
  settings: VietQrSettings | undefined;
  invoice: TenantBillingInvoice;
  bankName: string | undefined;
  bankLogoUrl: string | null | undefined;
}) {
  const bankId = payment?.bankId ?? settings?.bankId;
  const accountNo = payment?.accountNo ?? settings?.accountNo;
  const accountName = payment?.accountName ?? settings?.accountName;
  const memo = payment?.memo ?? `ILPAY ${invoice.invoiceNumber}`;

  if (!bankId || !accountNo || !accountName) {
    return <p className="text-sm text-slate-600">Chưa có thông tin tài khoản nhận tiền khả dụng.</p>;
  }

  return (
    <dl className="mt-3 grid grid-cols-[160px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[10.5pt]">
      <div className="contents">
        <dt className="text-slate-600">Ngân hàng</dt>
        <dd className="min-w-0 break-words text-left font-semibold leading-4">
          {bankName ?? "Ngân hàng thụ hưởng"}
        </dd>
      </div>
      <div className="contents">
        <dt className="text-slate-600">Số tài khoản</dt>
        <dd className="text-left font-mono font-semibold">{accountNo}</dd>
      </div>
      <div className="contents">
        <dt className="text-slate-600">Chủ tài khoản</dt>
        <dd className="pl-1 text-left font-semibold">{accountName}</dd>
      </div>
      <div className="contents">
        <dt className="whitespace-nowrap text-slate-600">Nội dung chuyển khoản</dt>
        <dd className="min-w-0 break-all whitespace-normal pl-1 text-left font-mono font-semibold leading-4">{memo}</dd>
      </div>
      {!payment && settings && (
        <p className="col-span-2 mt-1 min-h-[28px] rounded-[3px] border border-amber-200 bg-amber-50 px-2 py-1.5 text-[9pt] leading-3.5 text-amber-800">
          Thông tin tài khoản lấy từ cấu hình hiện tại; vui lòng xác minh trước khi chuyển khoản.
        </p>
      )}
    </dl>
  );
}

export function BillingPaymentNoticeModal({ invoice, onClose }: Props) {
  const { branding } = useAppBranding();
  const catalogQuery = useQuery({
    queryKey: ["system-admin", "catalogs"],
    queryFn: ({ signal }) => systemCatalogService.getCatalog(signal),
  });
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrError, setQrError] = useState<string | null>(null);
  const issuerQuery = useQuery({
    queryKey: ["admin", "settings", "billing-issuer"],
    queryFn: () => adminSettingsService.getSettings(),
    retry: false,
  });
  const issuer = {
    name: issuerQuery.data?.companyName?.trim() || branding.companyName || ISSUER_FALLBACK.name,
    address: issuerQuery.data?.companyAddress?.trim() || branding.companyAddress || ISSUER_FALLBACK.address,
    taxCode: issuerQuery.data?.companyTaxCode?.trim() || branding.companyTaxCode || ISSUER_FALLBACK.taxCode,
    hotline: issuerQuery.data?.companyHotline?.trim() || branding.companyHotline || ISSUER_FALLBACK.hotline,
    email: issuerQuery.data?.billingEmail?.trim() || branding.billingEmail || ISSUER_FALLBACK.email,
  };
  const canPay = invoice.status === "PendingPayment" || invoice.status === "Overdue";
  const qrQuery = useQuery({
    queryKey: ["system-admin", "billing", "vietqr", invoice.id],
    queryFn: ({ signal }) => systemBillingService.getVietQr(invoice.id, signal),
    enabled: canPay && invoice.paymentMethod === "VietQR",
    retry: false,
  });
  const settingsQuery = useQuery({
    queryKey: ["system-admin", "billing", "vietqr-settings"],
    queryFn: ({ signal }) => systemBillingService.getVietQrSettings(signal),
    enabled: canPay && invoice.paymentMethod === "BankTransfer",
    retry: false,
  });

  useEffect(() => {
    let active = true;
    setQrDataUrl("");
    setQrError(null);
    if (!qrQuery.data) return () => { active = false; };

    void QRCode.toDataURL(qrQuery.data.payload, {
      width: 480,
      margin: 4,
      errorCorrectionLevel: "M",
    }).then((dataUrl) => {
      if (active) setQrDataUrl(dataUrl);
    }).catch((reason: unknown) => {
      if (active) setQrError(getApiErrorMessage(reason));
    });

    return () => { active = false; };
  }, [qrQuery.data]);

  const paymentError = qrError
    ?? (qrQuery.error ? getApiErrorMessage(qrQuery.error) : null)
    ?? (settingsQuery.error ? getApiErrorMessage(settingsQuery.error) : null);
  const isPaymentLoading = qrQuery.isLoading || settingsQuery.isLoading;
  const payment = qrQuery.data;
  const isQrRendering = canPay
    && invoice.paymentMethod === "VietQR"
    && Boolean(payment)
    && !qrDataUrl
    && !paymentError;
  const isPreparingDocument = isPaymentLoading || isQrRendering;
  const settings = settingsQuery.data;
  const storageQuota = formatStorageQuota(invoice.storageQuotaBytes);
  const currentBankId = payment?.bankId ?? settings?.bankId;
  const bank = catalogQuery.data?.vietQrBanks.find((item) => item.value === currentBankId);
  const bankName = bank?.label;
  const bankLogoUrl = bank?.logoUrl;

  return createPortal(
    <div className="billing-print-overlay fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-notice-title"
        className="w-full max-w-4xl overflow-hidden rounded-md bg-white shadow-2xl"
      >
        <header className="billing-print-no-print flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id="billing-notice-title" className="text-sm font-bold text-slate-900">
            Giấy đề nghị thanh toán
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPreparingDocument}
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-2 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#026aa7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              In / Xuất PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng giấy đề nghị thanh toán"
              className="flex h-9 w-9 items-center justify-center rounded-[4px] text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#026aa7]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <article
          id="printable-billing-statement"
          className="billing-print-page max-h-[85vh] overflow-y-auto p-5 text-slate-900 sm:p-8"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-400 pb-4">
            <div className="flex min-w-0 items-start gap-3">
              <img src={resolveAppAssetUrl(branding.appFaviconUrl || branding.appLogoUrl)} alt={`Icon ${branding.appName}`} className="h-8 w-8 shrink-0 object-contain" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold uppercase">{issuer.name}</h3>
                <p className="mt-1 text-xs">{issuer.address}</p>
                <p className="text-xs">MST: {issuer.taxCode} · Hotline: {issuer.hotline}</p>
                <p className="text-xs">Email: {issuer.email}</p>
              </div>
            </div>
            <div className="shrink-0 text-right text-xs">
              <p className="font-semibold">Số chứng từ</p>
              <p className="mt-1 font-mono">DNTT-{invoice.invoiceNumber}</p>
              <p className="mt-2">{formatDocumentDate(invoice.createdAt)}</p>
            </div>
          </div>

          <div className="py-4 text-center">
            <h1 className="text-lg font-bold uppercase tracking-wide">
              Giấy đề nghị thanh toán cước dịch vụ
            </h1>
            <p className="mt-1 text-xs italic">
              (V/v: Bản quyền sử dụng Nền tảng Quản trị Thực tập Đại học {branding.appName})
            </p>
          </div>

          <section className="mb-4 space-y-1 text-sm">
            <p>Kính gửi: <strong>{invoice.tenantName}</strong></p>
            <p>Mã định danh đơn vị: <strong>{invoice.tenantCode}</strong></p>
            <p>Chu kỳ thanh toán: <strong>{invoice.billingCycleMonths} tháng</strong></p>
            <p>Hạn thanh toán: <strong>{invoice.dueDate ? `Trước ngày ${formatDate(invoice.dueDate)}` : "Theo thỏa thuận"}</strong></p>
            <p>Trạng thái hóa đơn: <strong>{invoiceStatusLabel(invoice.status)}</strong></p>
          </section>

          <table className="billing-print-table w-full border-collapse text-xs">
            <thead>
              <tr>
                {["STT", "Nội dung dịch vụ", "Hạn mức", "Chu kỳ", "Đơn giá (VNĐ)", "Thành tiền (VNĐ)"].map((heading) => (
                  <th key={heading} className="border border-slate-500 px-2 py-2 text-center font-bold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-500 px-2 py-2 text-center">1</td>
                <td className="border border-slate-500 px-2 py-2">Bản quyền phần mềm {branding.appName} (Gói {invoice.planName} · {invoice.planCode})</td>
                <td className="border border-slate-500 px-2 py-2 text-center">—</td>
                <td className="border border-slate-500 px-2 py-2 text-center">{invoice.billingCycleMonths} tháng</td>
                <td className="border border-slate-500 px-2 py-2 text-right">{formatCurrency(invoice.baseAmountVnd)}</td>
                <td className="border border-slate-500 px-2 py-2 text-right">{formatCurrency(invoice.baseAmountVnd)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="border border-slate-500 px-2 py-2 text-right">Thuế VAT ({invoice.taxRatePercent}%)</td>
                <td className="border border-slate-500 px-2 py-2 text-right">—</td>
                <td className="border border-slate-500 px-2 py-2 text-right">{formatCurrency(invoice.taxAmountVnd)}</td>
              </tr>
              <tr>
                <td className="border border-slate-500 px-2 py-2 text-center">2</td>
                <td className="border border-slate-500 px-2 py-2">Hạn mức sinh viên thực tập</td>
                <td className="border border-slate-500 px-2 py-2 text-center">{invoice.maxStudentsQuota.toLocaleString("vi-VN")} SV</td>
                <td className="border border-slate-500 px-2 py-2 text-center">Trọn chu kỳ</td>
                <td className="border border-slate-500 px-2 py-2 text-right">Đã gồm</td>
                <td className="border border-slate-500 px-2 py-2 text-right">Đã gồm</td>
              </tr>
              <tr>
                <td className="border border-slate-500 px-2 py-2 text-center">3</td>
                <td className="border border-slate-500 px-2 py-2">Dung lượng lưu trữ đám mây</td>
                <td className="border border-slate-500 px-2 py-2 text-center">{storageQuota}</td>
                <td className="border border-slate-500 px-2 py-2 text-center">Trọn chu kỳ</td>
                <td className="border border-slate-500 px-2 py-2 text-right">Đã gồm</td>
                <td className="border border-slate-500 px-2 py-2 text-right">Đã gồm</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={5} className="border border-slate-500 px-2 py-2 text-right font-bold">
                  Tổng tiền đề nghị thanh toán
                </th>
                <th className="border border-slate-500 px-2 py-2 text-right font-bold">
                  {formatCurrency(invoice.amountVnd)}
                </th>
              </tr>
            </tfoot>
          </table>

          <p className="mt-3 text-sm">
            <strong>Số tiền viết bằng chữ:</strong>{" "}
            <span className="italic">{formatVnCurrencyText(invoice.amountVnd)}</span>
          </p>

          <section className="billing-print-payment mt-5 grid grid-cols-[minmax(340px,1fr)_168px] items-start gap-4 rounded-md border border-slate-400 p-3">
            <div className="min-w-0">
              <h2 className="text-[11pt] font-bold">Thông tin thanh toán</h2>
              {isPaymentLoading && (
                <p role="status" className="mt-3 flex items-center text-xs text-slate-600">
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Đang tải thông tin thanh toán...
                </p>
              )}
              {paymentError && (
                <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {paymentError}
                </p>
              )}
              {canPay && !paymentError && !isPaymentLoading && (
                <PaymentDetails
                  payment={payment}
                  settings={settings}
                  invoice={invoice}
                  bankName={bankName}
                  bankLogoUrl={bankLogoUrl}
                />
              )}
              {!canPay && (
                <div className="mt-3 text-sm text-slate-700">
                  <p>Hóa đơn {invoiceStatusLabel(invoice.status).toLowerCase()}; không tạo mã thanh toán mới.</p>
                  {invoice.paidAt && <p className="mt-1">Ngày thanh toán: {formatDate(invoice.paidAt)}</p>}
                  {invoice.paymentReference && <p className="mt-1">Mã giao dịch: {invoice.paymentReference}</p>}
                </div>
              )}
              {invoice.paymentMethod === "BankTransfer" && canPay && (
                <p className="mt-2 text-xs text-slate-600">Phương thức: Chuyển khoản ngân hàng.</p>
              )}
            </div>
            <div className="flex w-[168px] flex-col items-center justify-start pt-1 text-center">
              {qrDataUrl && canPay ? (
                <img
                  src={qrDataUrl}
                  alt={`Mã VietQR hóa đơn ${invoice.invoiceNumber}`}
                  className="mx-auto h-[132px] w-[132px] object-contain"
                />
              ) : (
                <div className="flex h-[132px] w-[132px] items-center justify-center border border-dashed border-slate-300 px-3 text-center text-xs text-slate-500">
                  {invoice.paymentMethod === "VietQR" && canPay
                    ? "Mã VietQR chưa khả dụng"
                    : "Không áp dụng mã VietQR"}
                </div>
              )}
              <p className="mt-1 max-w-[140px] text-[8.5pt] leading-3.5 text-slate-600">
                Quét mã bằng ứng dụng ngân hàng và kiểm tra đúng số tiền, nội dung chuyển khoản.
              </p>
            </div>
          </section>

          <footer className="billing-print-signatures mt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="font-bold uppercase">Đại diện nhà trường</p>
              <p className="italic">(Ký, ghi rõ họ tên và đóng dấu)</p>
              <div className="h-20" />
            </div>
            <div>
              <p className="font-bold uppercase">Đại diện {issuer.name}</p>
              <p className="italic">(Người lập biểu / Giám đốc ký)</p>
              <div className="h-20" />
            </div>
          </footer>
        </article>
      </section>
    </div>,
    document.body,
  );
}
