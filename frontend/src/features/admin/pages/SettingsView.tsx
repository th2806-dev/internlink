import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sliders,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  HardDrive,
  Image as ImageIcon,
  Upload,
  Save,
  RotateCcw,
  Send,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { adminEmailService } from "../../../services/adminEmail.service";
import {
  adminSettingsService,
  type AdminFacultySettings,
} from "../../../services/adminSettings.service";
import { queryKeys } from "../../../lib/queryKeys";
import { useAuth } from "../../../hooks/useAuth";
import { formatBrandingText, resolveAppAssetUrl, useAppBranding } from "../../../contexts/AppBrandingContext";
import { PLATFORM_PAGE_CONTENT_CLASS, PlatformPageHeader } from "../components/PlatformPageHeader";

type FacultySettings = AdminFacultySettings;

const EMPTY_FACULTY_SETTINGS: FacultySettings = {
  appName: "",
  appShortName: "",
  browserTitle: "",
  copyrightText: "",
  appUrl: "",
  appLogoUrl: "",
  appFaviconUrl: "",
  appPrimaryColor: "#026aa7",
  departmentName: "",
  supportEmail: "",
  phone: "",
  address: "",
  companyName: "",
  companyTaxCode: "",
  companyAddress: "",
  companyHotline: "",
  billingEmail: "",
  emailEnabled: true,
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpUseSsl: true,
  smtpUsername: "",
  smtpPassword: "",
  emailFromAddress: "",
  emailFromName: "InternLink",
  passwordResetPath: "/reset-password",
  passwordResetTokenExpiryHours: 24,
  maxStudentsPerLecturer: 0,
  defaultReportDeadlineDay: "",
  maxFileSizeMb: 0,
  allowLateSubmission: false,
  autoLockSemesterEnd: false,
};

import type { ToastType } from "../../../contexts/ToastContext";
export const SettingsView = ({
  onShowToast,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
  onNavigateTab?: (tab: string) => void;
}) => {
  const { user } = useAuth();
  const { refreshBranding } = useAppBranding();
  const queryClient = useQueryClient();
  const settingsKey = queryKeys.admin.settings.data({
    backendRole: user?.backendRole ?? "",
    userId: user?.id ?? user?.username ?? "anonymous",
  });
  const settingsQuery = useQuery({
    queryKey: settingsKey,
    queryFn: adminSettingsService.getSettings,
  });
  const [settings, setSettings] = useState<FacultySettings>(EMPTY_FACULTY_SETTINGS);

  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isUploadingBrandAsset, setIsUploadingBrandAsset] = useState<"logo" | "favicon" | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedSettings, setSavedSettings] = useState<FacultySettings>(EMPTY_FACULTY_SETTINGS);
  const isLoadingSettings = settingsQuery.isPending;
  const settingsLoadError = settingsQuery.isError;
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
      setSavedSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings.appName.trim() || !settings.appShortName.trim()) {
      onShowToast("Tên ứng dụng và tên ngắn không được để trống.", "danger");
      return;
    }
    if (!settings.companyName.trim() || !settings.companyTaxCode.trim() || !settings.companyAddress.trim()) {
      onShowToast("Vui lòng nhập đầy đủ tên công ty, MST và địa chỉ pháp nhân.", "danger");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...settings,
        departmentName: settings.departmentName.trim(),
        supportEmail: settings.supportEmail.trim(),
        phone: settings.phone.trim(),
        address: settings.address.trim(),
      };
      const updated = await adminSettingsService.updateSettings(payload);
      setSettings(updated);
      setSavedSettings(updated);
      queryClient.setQueryData(settingsKey, updated);
      await refreshBranding();
      onShowToast("Đã lưu các thiết lập cài đặt thành công!");
    } catch (err) {
      onShowToast(`Không thể lưu cài đặt lên hệ thống. ${getApiErrorMessage(err)}`, "danger");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setIsSaving(true);
    try {
      
        const res = await adminSettingsService.resetSettings();
        setSettings(res);
        setSavedSettings(res);
        queryClient.setQueryData(settingsKey, res);
        await refreshBranding();
      onShowToast("Đã khôi phục tất cả cài đặt về giá trị mặc định của Khoa.");
    } catch (err) {
      onShowToast(`Không thể khôi phục cài đặt mặc định. ${getApiErrorMessage(err)}`, "danger");
    } finally {
      setIsSaving(false);
      setShowResetConfirm(false);
    }
  };

  const handleTestEmail = async () => {
    const toEmail = settings.supportEmail.trim();
    if (!toEmail) {
      onShowToast("Vui lòng nhập email hỗ trợ trước khi gửi thử.");
      return;
    }
    
    setIsTestingEmail(true);
    try {
      await adminEmailService.testEmail({
        toEmail,
        fullName: "Quản trị khoa",
        role: "Lecturer",
      });
      onShowToast(`Đã gửi email kiểm tra kết nối tới ${toEmail}`);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleBrandAssetUpload = async (
    file: File | undefined,
    type: "logo" | "favicon",
  ) => {
    if (!file) return;
    setIsUploadingBrandAsset(type);
    try {
      const branding = await adminSettingsService.uploadBrandingAsset(file, type);
      setSettings((current) => ({
        ...current,
        appLogoUrl: branding.appLogoUrl,
        appFaviconUrl: branding.appFaviconUrl,
      }));
      setSavedSettings((current) => ({
        ...current,
        appLogoUrl: branding.appLogoUrl,
        appFaviconUrl: branding.appFaviconUrl,
      }));
      await refreshBranding();
      onShowToast(type === "logo" ? "Đã cập nhật logo ứng dụng." : "Đã cập nhật favicon.", "success");
    } catch (reason) {
      onShowToast(getApiErrorMessage(reason), "danger");
    } finally {
      setIsUploadingBrandAsset(null);
    }
  };

  return (
    <div className="min-h-full w-full min-w-0 bg-slate-50 pb-12 font-sans">
      <PlatformPageHeader
        title="Cài đặt hệ thống"
        description="Cấu hình thương hiệu, pháp nhân, email và kết nối nền tảng."
        breadcrumbs={[
          { label: "Quản trị nền tảng", href: "/admin/dashboard" },
          { label: "Hệ thống" },
          { label: "Cài đặt" },
        ]}
      />
      <CompactActionBar
        icon={Sliders}
        title="Cài đặt hệ thống"
        subtitle="Cấu hình thương hiệu, pháp nhân, email và kết nối nền tảng."
        hideTitle
        badge={hasUnsavedChanges ? "Thay đổi chưa lưu" : "Đã đồng bộ"}
        badgeColor={hasUnsavedChanges
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-[#7bc043]/30 bg-[#7bc043]/10 text-[#385d1b]"}
        actions={[
          {
            label: "Đặt lại mặc định",
            icon: RotateCcw,
            onClick: () => setShowResetConfirm(true),
            disabled: isSaving || isLoadingSettings || settingsLoadError,
          },
          {
            label: isSaving ? "Đang lưu…" : "Lưu cài đặt",
            icon: Save,
            variant: "primary",
            onClick: () => void handleSave(),
            disabled: isSaving || isLoadingSettings || settingsLoadError || !hasUnsavedChanges,
            loading: isSaving,
          },
        ]}
      />

      <main className={PLATFORM_PAGE_CONTENT_CLASS}>
      {settingsLoadError && (
        <div role="alert" className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
            <div>
              <p className="font-bold">Không thể tải cài đặt từ máy chủ</p>
              <p className="mt-0.5 text-rose-800">
                Dữ liệu cấu hình chưa được tải. Thử tải lại để xem và chỉnh sửa giá trị hiện tại.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void settingsQuery.refetch()}
            disabled={settingsQuery.isFetching}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${settingsQuery.isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
            Thử tải lại
          </button>
        </div>
      )}

      {isLoadingSettings && (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-md">
          Đang tải cài đặt hiện tại…
        </div>
      )}

      {!isLoadingSettings && !settingsLoadError && <form onSubmit={handleSave} className="space-y-1.5">
        <fieldset disabled={isLoadingSettings || isSaving} className="space-y-1.5 disabled:opacity-70">
        <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="rounded-md bg-[#026aa7]/5 p-2 text-[#026aa7]">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Thông tin ứng dụng & thương hiệu</h2>
              <p className="text-xs font-medium text-slate-500">Tên ứng dụng, logo, favicon và màu chủ đạo áp dụng cho toàn hệ thống.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <label htmlFor="settings-app-name">
              <span className="mb-1 block font-bold text-slate-700">Tên ứng dụng *</span>
              <input id="settings-app-name" required value={settings.appName} onChange={(event) => setSettings({ ...settings, appName: event.target.value })} className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white" />
            </label>
            <label htmlFor="settings-app-short-name">
              <span className="mb-1 block font-bold text-slate-700">Tên ngắn / thương hiệu *</span>
              <input id="settings-app-short-name" required value={settings.appShortName} onChange={(event) => setSettings({ ...settings, appShortName: event.target.value })} className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white" />
            </label>
            <label htmlFor="settings-app-url" className="sm:col-span-2">
              <span className="mb-1 block font-bold text-slate-700">URL công khai của ứng dụng *</span>
              <input id="settings-app-url" required type="url" value={settings.appUrl} onChange={(event) => setSettings({ ...settings, appUrl: event.target.value })} placeholder="https://ten-don-vi.edu.vn" className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white" />
            </label>
            <label htmlFor="settings-browser-title" className="sm:col-span-2">
              <span className="mb-1 block font-bold text-slate-700">Tiêu đề trình duyệt</span>
              <input id="settings-browser-title" maxLength={160} value={settings.browserTitle} onChange={(event) => setSettings({ ...settings, browserTitle: event.target.value })} placeholder="{appName} - Nền tảng quản lý thực tập" className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white" />
              <span className="mt-1 block text-[10px] text-slate-500">Có thể dùng {"{appName}"} để tự thay bằng tên ứng dụng.</span>
            </label>
            <label htmlFor="settings-copyright-text" className="sm:col-span-2">
              <span className="mb-1 block font-bold text-slate-700">Copyright / chân trang</span>
              <input id="settings-copyright-text" maxLength={250} value={settings.copyrightText} onChange={(event) => setSettings({ ...settings, copyrightText: event.target.value })} placeholder="© {year} {appName} · {companyName}" className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white" />
              <span className="mt-1 block text-[10px] text-slate-500">Hỗ trợ {"{year}"}, {"{appName}"} và {"{companyName}"}.</span>
              <span className="mt-1 block text-[10px] text-slate-600">
                Xem trước: {formatBrandingText(settings.copyrightText || "© {year} {appName} · {companyName}", {
                  appName: settings.appName || "Tên ứng dụng",
                  companyName: settings.companyName || "Tên pháp nhân",
                  year: new Date().getFullYear(),
                })}
              </span>
            </label>
            <label htmlFor="settings-app-primary-color">
              <span className="mb-1 block font-bold text-slate-700">Màu thương hiệu chính</span>
              <div className="flex gap-2">
                <input type="color" value={/^#[0-9A-Fa-f]{6}$/.test(settings.appPrimaryColor) ? settings.appPrimaryColor : "#026aa7"} onChange={(event) => setSettings({ ...settings, appPrimaryColor: event.target.value })} className="h-8 w-12 rounded-[4px] border border-slate-200 bg-white p-1" />
                <input id="settings-app-primary-color" value={settings.appPrimaryColor} onChange={(event) => setSettings({ ...settings, appPrimaryColor: event.target.value })} className="h-8 min-w-0 flex-1 rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white" />
              </div>
            </label>
            <div className="flex items-end">
              <div className="flex h-14 w-full items-center gap-3 rounded-[4px] border border-slate-200 bg-slate-50 px-3">
                <img src={resolveAppAssetUrl(settings.appLogoUrl || "/logo/logo_internlink-02.png")} alt="Xem trước logo" className="h-10 w-10 object-contain" />
                <div>
                  <p className="text-xs font-bold" style={{ color: settings.appPrimaryColor }}>{settings.appName || "Tên ứng dụng"}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Xem trước thương hiệu</p>
                </div>
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-700">Logo ứng dụng</p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">
                    {settings.appLogoUrl ? "Logo hiện tại đã được thiết lập" : "PNG, JPG, WEBP hoặc SVG"}
                  </p>
                </div>
                <label className={`relative inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-[4px] border border-[#026aa7] bg-white px-2.5 text-[11px] font-semibold text-[#026aa7] transition-colors hover:bg-[#026aa7]/5 focus-within:ring-2 focus-within:ring-[#026aa7]/30 ${isUploadingBrandAsset !== null ? "pointer-events-none opacity-50" : ""}`}>
                  <Upload aria-hidden="true" className="h-3.5 w-3.5" />
                  {isUploadingBrandAsset === "logo" ? "Đang tải..." : settings.appLogoUrl ? "Thay logo" : "Chọn logo"}
                  <input
                    aria-label="Tải logo ứng dụng"
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(event) => void handleBrandAssetUpload(event.target.files?.[0], "logo")}
                    disabled={isUploadingBrandAsset !== null}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-700">Favicon</p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">
                    {settings.appFaviconUrl ? "Favicon hiện tại đã được thiết lập" : "PNG, JPG, WEBP hoặc SVG"}
                  </p>
                </div>
                <label className={`relative inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-[4px] border border-[#026aa7] bg-white px-2.5 text-[11px] font-semibold text-[#026aa7] transition-colors hover:bg-[#026aa7]/5 focus-within:ring-2 focus-within:ring-[#026aa7]/30 ${isUploadingBrandAsset !== null ? "pointer-events-none opacity-50" : ""}`}>
                  <Upload aria-hidden="true" className="h-3.5 w-3.5" />
                  {isUploadingBrandAsset === "favicon" ? "Đang tải..." : settings.appFaviconUrl ? "Thay favicon" : "Chọn favicon"}
                  <input
                    aria-label="Tải favicon"
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(event) => void handleBrandAssetUpload(event.target.files?.[0], "favicon")}
                    disabled={isUploadingBrandAsset !== null}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
        {/* SECTION 1: FACULTY CONTACT INFORMATION */}
        <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Thông tin pháp nhân</h2>
            <p className="mt-0.5 text-xs text-slate-500">Dùng chung cho bản in A4, hóa đơn và email thanh toán.</p>
          </div>
            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <div>
                <label htmlFor="settings-company-name" className="mb-1 block font-bold text-slate-700">Tên công ty <span className="text-rose-500">*</span></label>
                <input id="settings-company-name" required value={settings.companyName} onChange={(event) => setSettings({ ...settings, companyName: event.target.value })} className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white" />
              </div>
              <div>
                <label htmlFor="settings-company-tax-code" className="mb-1 block font-bold text-slate-700">Mã số thuế <span className="text-rose-500">*</span></label>
                <input id="settings-company-tax-code" required value={settings.companyTaxCode} onChange={(event) => setSettings({ ...settings, companyTaxCode: event.target.value })} className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="settings-company-address" className="mb-1 block font-bold text-slate-700">Địa chỉ pháp nhân <span className="text-rose-500">*</span></label>
                <input id="settings-company-address" required value={settings.companyAddress} onChange={(event) => setSettings({ ...settings, companyAddress: event.target.value })} className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white" />
              </div>
              <div>
                <label htmlFor="settings-company-hotline" className="mb-1 block font-bold text-slate-700">Hotline</label>
                <input id="settings-company-hotline" value={settings.companyHotline} onChange={(event) => setSettings({ ...settings, companyHotline: event.target.value })} className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white" />
              </div>
              <div>
                <label htmlFor="settings-billing-email" className="mb-1 block font-bold text-slate-700">Email thanh toán</label>
                <input id="settings-billing-email" type="email" value={settings.billingEmail} onChange={(event) => setSettings({ ...settings, billingEmail: event.target.value })} className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white" />
              </div>
            </div>
          </div>

        <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3 shadow-md">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Cấu hình Email / SMTP</h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500">Máy chủ thư, địa chỉ người gửi và đường dẫn đặt lại mật khẩu.</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={settings.emailEnabled} onChange={(event) => setSettings({ ...settings, emailEnabled: event.target.checked })} className="h-4 w-4 accent-[#026aa7]" />
              Bật gửi email
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
            <label htmlFor="settings-smtp-host">
              <span className="mb-1 block font-bold text-slate-700">Máy chủ SMTP *</span>
              <input id="settings-smtp-host" required={settings.emailEnabled} value={settings.smtpHost} onChange={(event) => setSettings({ ...settings, smtpHost: event.target.value })} placeholder="smtp.example.com" className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none focus:border-[#026aa7] focus:bg-white" />
            </label>
            <label htmlFor="settings-smtp-port">
              <span className="mb-1 block font-bold text-slate-700">Cổng SMTP *</span>
              <input id="settings-smtp-port" required={settings.emailEnabled} type="number" min={1} max={65535} value={settings.smtpPort} onChange={(event) => setSettings({ ...settings, smtpPort: Number(event.target.value) })} className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none focus:border-[#026aa7] focus:bg-white" />
            </label>
            <label className="flex min-h-14 items-center gap-2 pt-5 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={settings.smtpUseSsl} onChange={(event) => setSettings({ ...settings, smtpUseSsl: event.target.checked })} className="h-4 w-4 accent-[#026aa7]" />
              Dùng STARTTLS/SSL
            </label>
            <label htmlFor="settings-smtp-username">
              <span className="mb-1 block font-bold text-slate-700">Tài khoản SMTP</span>
              <input id="settings-smtp-username" value={settings.smtpUsername} onChange={(event) => setSettings({ ...settings, smtpUsername: event.target.value })} autoComplete="username" className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none focus:border-[#026aa7] focus:bg-white" />
            </label>
            <label htmlFor="settings-smtp-password">
              <span className="mb-1 block font-bold text-slate-700">Mật khẩu SMTP</span>
              <input id="settings-smtp-password" type="password" value={settings.smtpPassword} onChange={(event) => setSettings({ ...settings, smtpPassword: event.target.value })} autoComplete="new-password" placeholder="Nhập để thay đổi" className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none focus:border-[#026aa7] focus:bg-white" />
            </label>
            <label htmlFor="settings-email-from-address">
              <span className="mb-1 block font-bold text-slate-700">Email người gửi *</span>
              <input id="settings-email-from-address" required={settings.emailEnabled} type="email" value={settings.emailFromAddress} onChange={(event) => setSettings({ ...settings, emailFromAddress: event.target.value })} className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none focus:border-[#026aa7] focus:bg-white" />
            </label>
            <label htmlFor="settings-email-from-name">
              <span className="mb-1 block font-bold text-slate-700">Tên người gửi</span>
              <input id="settings-email-from-name" value={settings.emailFromName} onChange={(event) => setSettings({ ...settings, emailFromName: event.target.value })} className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none focus:border-[#026aa7] focus:bg-white" />
            </label>
            <label htmlFor="settings-password-reset-path">
              <span className="mb-1 block font-bold text-slate-700">Đường dẫn reset mật khẩu</span>
              <input id="settings-password-reset-path" value={settings.passwordResetPath} onChange={(event) => setSettings({ ...settings, passwordResetPath: event.target.value })} className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none focus:border-[#026aa7] focus:bg-white" />
            </label>
            <label htmlFor="settings-password-reset-expiry">
              <span className="mb-1 block font-bold text-slate-700">Thời hạn mã reset (giờ)</span>
              <input id="settings-password-reset-expiry" type="number" min={1} max={168} value={settings.passwordResetTokenExpiryHours} onChange={(event) => setSettings({ ...settings, passwordResetTokenExpiryHours: Number(event.target.value) })} className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none focus:border-[#026aa7] focus:bg-white" />
            </label>
          </div>
        </div>

        </fieldset>
      </form>}
      </main>

      {/* CONFIRM RESET DIALOG */}
      <ConfirmDialog
        open={showResetConfirm}
        title="Khôi phục cài đặt mặc định"
        description="Bạn có chắc chắn muốn đặt lại toàn bộ thương hiệu, pháp nhân và cấu hình nền tảng về giá trị mặc định?"
        confirmLabel="Khôi phục mặc định"
        variant="danger"
        onConfirm={handleResetDefaults}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};

export default SettingsView;
export { SettingsView as AdminSettingsView };
