import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { useActiveTenant } from "../../../contexts/ActiveTenantContext";
import type { ToastType } from "../../../contexts/ToastContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { PLATFORM_PAGE_CONTENT_CLASS, PlatformPageHeader } from "../components/PlatformPageHeader";
import {
  systemTenantSsoService,
  type SsoProvider,
} from "../../../services/systemTenantSso.service";

type Props = { onShowToast: (message: string, type?: ToastType) => void };

const INPUT_CLASS =
  "h-9 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-800 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20";

const PROVIDERS: { value: SsoProvider; title: string; detail: string }[] = [
  { value: "AzureAD", title: "Azure AD / Office 365", detail: "OpenID Connect · Microsoft Entra ID" },
  { value: "GoogleWorkspace", title: "Google Workspace", detail: "OpenID Connect · Education" },
  { value: "SAML2", title: "SAML 2.0", detail: "Liên kết với nhà cung cấp định danh hỗ trợ SAML" },
  { value: "CAS_LDAP", title: "CAS / LDAP", detail: "Cổng định danh nội bộ của trường" },
];

export function TenantSsoHubView({ onShowToast }: Props) {
  const queryClient = useQueryClient();
  const {
    tenants,
    selectedTenant,
    selectedTenantId: tenantId,
    selectTenant,
    isLoading: tenantsLoading,
    error: tenantListError,
  } = useActiveTenant();
  const [provider, setProvider] = useState<SsoProvider>("AzureAD");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [discoveryUrl, setDiscoveryUrl] = useState("");
  const [domainsText, setDomainsText] = useState("");
  const [isEnforced, setIsEnforced] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [discoveryMessage, setDiscoveryMessage] = useState<{ success: boolean; message: string; issuer: string | null } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formTenantId, setFormTenantId] = useState(tenantId);

  const configQuery = useQuery({
    queryKey: ["system-admin", "tenant-sso", tenantId],
    queryFn: ({ signal }) => systemTenantSsoService.getConfiguration(tenantId, signal),
    enabled: Boolean(tenantId),
  });
  const config = configQuery.data;

  useEffect(() => {
    setFormTenantId(tenantId);
    setProvider("AzureAD");
    setClientId("");
    setClientSecret("");
    setDiscoveryUrl("");
    setDomainsText("");
    setIsEnforced(false);
    setDiscoveryMessage(null);
    setFormError(null);
    setShowDisconnect(false);
  }, [tenantId]);

  useEffect(() => {
    if (!config) return;
    setProvider(config.providerType);
    setClientId(config.clientId);
    setClientSecret("");
    setDiscoveryUrl(config.discoveryUrl);
    setDomainsText(config.allowedEmailDomains.join("\n"));
    setIsEnforced(config.isEnforced);
    setDiscoveryMessage(null);
    setFormError(null);
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () => systemTenantSsoService.saveConfiguration(tenantId, {
      providerType: provider,
      clientId: clientId.trim(),
      clientSecret,
      discoveryUrl: discoveryUrl.trim(),
      allowedEmailDomains: domainsText.split(/[\n,;]+/).map((domain) => domain.trim()).filter(Boolean),
      isEnforced,
    }),
    onSuccess: async () => {
      setClientSecret("");
      setDiscoveryMessage(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["system-admin", "tenant-sso", tenantId] });
      onShowToast("Đã lưu cấu hình SSO. Secret chỉ được lưu dạng mã hóa.", "success");
    },
    onError: (error) => setFormError(getApiErrorMessage(error)),
  });
  const testMutation = useMutation({
    mutationFn: () => systemTenantSsoService.testDiscovery(tenantId, provider, discoveryUrl.trim()),
    onSuccess: (result) => setDiscoveryMessage({
      success: result.isSuccess,
      message: result.message,
      issuer: result.issuer,
    }),
    onError: (error) => setDiscoveryMessage({
      success: false,
      message: getApiErrorMessage(error),
      issuer: null,
    }),
  });
  const deleteMutation = useMutation({
    mutationFn: () => systemTenantSsoService.deleteConfiguration(tenantId),
    onSuccess: async () => {
      setShowDisconnect(false);
      await queryClient.invalidateQueries({ queryKey: ["system-admin", "tenant-sso", tenantId] });
      onShowToast("Đã hủy liên kết SSO; đăng nhập truyền thống được khôi phục.", "success");
    },
    onError: (error) => onShowToast(getApiErrorMessage(error), "danger"),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (domainsText.split(/[\n,;]+/).map((domain) => domain.trim()).filter(Boolean).length === 0) {
      setFormError("Nhập ít nhất một domain email được phép.");
      return;
    }
    saveMutation.mutate();
  }

  const isOidcProvider = provider === "AzureAD" || provider === "GoogleWorkspace";
  const busy = saveMutation.isPending || testMutation.isPending || deleteMutation.isPending;
  const canShowTenantConfiguration = Boolean(tenantId && formTenantId === tenantId);

  return (
    <div className="min-h-full w-full bg-slate-50 pb-12 font-sans">
      <PlatformPageHeader
        title="Trung tâm Tích hợp Định danh Doanh nghiệp (SSO Hub)"
        description="Quản lý nhà cung cấp định danh và chính sách đăng nhập theo đơn vị."
        breadcrumbs={[
          { label: "Quản trị nền tảng", href: "/admin/dashboard" },
          { label: "Kết nối & tích hợp", href: "/admin/api-gateway" },
          { label: "Trung tâm tích hợp định danh (SSO Hub)" },
        ]}
        activeTenant={selectedTenant}
        onChangeTenant={() => document.getElementById("sso-tenant")?.focus()}
      />
      <CompactActionBar
        icon={Fingerprint}
        title="Trung tâm tích hợp định danh doanh nghiệp"
        subtitle="Quản lý nhà cung cấp định danh và chính sách đăng nhập theo đơn vị."
        hideTitle
      />

      <main className={PLATFORM_PAGE_CONTENT_CLASS}>
      <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
        <label htmlFor="sso-tenant" className="mb-1 block text-xs font-semibold text-slate-700">
          Đơn vị triển khai
        </label>
        <select
          id="sso-tenant"
          className={`${INPUT_CLASS} max-w-xl`}
          value={tenantId}
          onChange={(event) => selectTenant(event.target.value)}
          disabled={tenantsLoading || !tenants.length}
        >
          {tenants.length > 0 && !tenantId && <option value="">Chọn đơn vị triển khai</option>}
          {!tenants.length && <option value="">{tenantsLoading ? "Đang tải đơn vị..." : "Chưa có đơn vị triển khai"}</option>}
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.tenantCode}</option>
          ))}
        </select>
      </section>

      {tenantListError && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {getApiErrorMessage(tenantListError)}
        </div>
      )}
      {!tenantId && tenantsLoading && (
        <p role="status" className="flex items-center gap-2 text-xs text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Đang tải danh sách đơn vị…
        </p>
      )}
      {!tenantsLoading && !tenants.length && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Chưa có đơn vị để cấu hình SSO.
        </div>
      )}
      {!tenantsLoading && tenants.length > 0 && !tenantId && (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-600">
          Chọn đơn vị triển khai ở danh sách phía trên để xem cấu hình SSO.
        </div>
      )}
      {configQuery.isError && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {getApiErrorMessage(configQuery.error)}
        </div>
      )}

      {canShowTenantConfiguration && (
        <form onSubmit={submit} className="space-y-4">
          <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Nhà cung cấp định danh</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Chọn hệ thống đăng nhập mà đơn vị đang sử dụng.
                </p>
              </div>
              {config?.isConfigured && (
                <span className="rounded-[3px] border border-[#7bc043]/40 bg-[#7bc043]/10 px-2 py-1 text-[10px] font-semibold text-[#385d1b]">
                  Đã cấu hình
                </span>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {PROVIDERS.map((item) => (
                <label
                  key={item.value}
                  className={`flex cursor-pointer gap-2 rounded-md border p-3 transition-colors ${
                    provider === item.value
                      ? "border-[#026aa7] bg-[#026aa7]/5 ring-1 ring-[#026aa7]/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="sso-provider"
                    value={item.value}
                    checked={provider === item.value}
                    onChange={() => setProvider(item.value)}
                    className="mt-0.5 accent-[#026aa7]"
                  />
                  <span>
                    <span className="block text-xs font-bold text-slate-800">{item.title}</span>
                    <span className="mt-1 block text-[10px] leading-4 text-slate-500">{item.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Thông tin kết nối</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-medium text-slate-700">
                  Mã ứng dụng (Client ID)
                  <input
                    className={`${INPUT_CLASS} mt-1`}
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
                    maxLength={200}
                    required
                    autoComplete="off"
                  />
                </label>
                <label className="text-xs font-medium text-slate-700">
                  Mã bí mật ứng dụng (Client Secret)
                  <input
                    className={`${INPUT_CLASS} mt-1`}
                    value={clientSecret}
                    onChange={(event) => setClientSecret(event.target.value)}
                    type="password"
                    maxLength={1024}
                    autoComplete="new-password"
                    placeholder={config?.hasClientSecret ? config.maskedClientSecret : "Nhập mã bí mật của nhà cung cấp định danh"}
                  />
                  <span className="mt-1 block text-[10px] font-normal text-slate-500">
                    {config?.hasClientSecret
                      ? "Mã bí mật hiện tại được giữ nguyên nếu để trống."
                      : "Mã bí mật được mã hóa trước khi lưu; API không trả về mã gốc."}
                  </span>
                </label>
              </div>
              <label className="block text-xs font-medium text-slate-700">
                Địa chỉ Discovery OIDC
                <input
                  className={`${INPUT_CLASS} mt-1`}
                  value={discoveryUrl}
                  onChange={(event) => {
                    setDiscoveryUrl(event.target.value);
                    setDiscoveryMessage(null);
                  }}
                  type="url"
                  maxLength={2048}
                  required
                  placeholder="https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration"
                />
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Danh sách tên miền email được phép
                <textarea
                  className="mt-1 min-h-20 w-full resize-y rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                  value={domainsText}
                  onChange={(event) => setDomainsText(event.target.value)}
                  placeholder={"ten-truong.edu.vn\nsinh-vien.ten-truong.edu.vn"}
                  maxLength={1000}
                  required
                />
                <span className="mt-1 block text-[10px] font-normal text-slate-500">
                  Nhập mỗi tên miền trên một dòng; có thể nhập dạng @ten-truong.edu.vn.
                </span>
              </label>
            </div>

            <aside className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-2">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#026aa7]" aria-hidden="true" />
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Chính sách đăng nhập</h3>
                  <p className="mt-1 text-[11px] leading-4 text-slate-600">
                    Chỉ người dùng có email thuộc danh sách cho phép mới được xác thực qua nhà cung cấp định danh.
                  </p>
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-white p-3">
                <input
                  type="checkbox"
                  checked={isEnforced}
                  onChange={(event) => setIsEnforced(event.target.checked)}
                  className="mt-0.5 accent-[#026aa7]"
                />
                <span>
                  <span className="block text-xs font-semibold text-slate-800">Bắt buộc đăng nhập qua SSO</span>
                  <span className="mt-1 block text-[10px] leading-4 text-slate-500">
                    Chỉ bật sau khi đã xác minh cấu hình và email domain của đơn vị.
                  </span>
                </span>
              </label>
              {isEnforced && (
                <div role="alert" className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-4 text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Lưu ý: nếu IdP hoặc whitelist sai, người dùng có thể không đăng nhập được. Hãy thử Discovery trước khi lưu.
                </div>
              )}
              {isOidcProvider && (
                <button
                  type="button"
                  onClick={() => testMutation.mutate()}
                  disabled={!tenantId || !discoveryUrl.trim() || busy}
                  className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-[4px] border border-[#026aa7]/30 bg-white px-3 text-xs font-semibold text-[#026aa7] hover:bg-[#026aa7]/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {testMutation.isPending
                    ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    : <RefreshCw className="h-3.5 w-3.5" />}
                  Kiểm tra OIDC Discovery
                </button>
              )}
              {discoveryMessage && (
                <div className={`rounded-md border p-2.5 text-[11px] ${
                  discoveryMessage.success
                    ? "border-[#7bc043]/40 bg-[#7bc043]/10 text-[#385d1b]"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}>
                  <p className="flex items-center gap-1.5 font-semibold">
                    {discoveryMessage.success
                      ? <CheckCircle2 className="h-3.5 w-3.5" />
                      : <AlertCircle className="h-3.5 w-3.5" />}
                    {discoveryMessage.message}
                  </p>
                  {discoveryMessage.issuer && (
                    <p className="mt-1 break-all font-mono text-[10px]">{discoveryMessage.issuer}</p>
                  )}
                </div>
              )}
              {!isOidcProvider && (
                <p className="text-[10px] leading-4 text-slate-500">
                  Kiểm tra Discovery tự động chỉ áp dụng cho Azure AD và Google Workspace (OIDC).
                </p>
              )}
            </aside>
          </section>

          {formError && (
            <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {config?.isConfigured && (
                <button
                  type="button"
                  onClick={() => setShowDisconnect(true)}
                  disabled={busy}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hủy liên kết SSO
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={busy || configQuery.isLoading || !selectedTenant}
              className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-[#026aa7] px-4 text-xs font-semibold text-white hover:bg-[#025a8e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveMutation.isPending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
              Lưu cấu hình SSO
            </button>
          </div>
        </form>
      )}
      </main>

      {showDisconnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3">
          <section role="dialog" aria-modal="true" aria-labelledby="disconnect-sso-title" className="w-full max-w-md rounded-md border border-slate-200 bg-white shadow-xl">
            <header className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 id="disconnect-sso-title" className="text-sm font-bold text-slate-900">Hủy liên kết SSO?</h2>
                <p className="mt-1 text-xs text-slate-500">{selectedTenant?.name}</p>
              </div>
              <button type="button" onClick={() => setShowDisconnect(false)} className="rounded-[4px] p-1 text-slate-500 hover:bg-slate-100" aria-label="Đóng">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="space-y-3 p-4">
              <p className="text-xs leading-5 text-slate-600">
                Secret sẽ bị xóa, chế độ SSO bắt buộc được tắt và người dùng quay lại đăng nhập truyền thống.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowDisconnect(false)} className="h-8 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  Giữ cấu hình
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                  Hủy liên kết
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
