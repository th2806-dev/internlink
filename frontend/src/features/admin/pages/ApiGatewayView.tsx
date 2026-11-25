import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Clipboard,
  Edit2,
  KeyRound,
  LoaderCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Trash2,
  Webhook,
  X,
} from "lucide-react";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { useActiveTenant } from "../../../contexts/ActiveTenantContext";
import type { ToastType } from "../../../contexts/ToastContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { PLATFORM_PAGE_CONTENT_CLASS, PlatformPageHeader } from "../components/PlatformPageHeader";
import { PlatformTabBar } from "../components/PlatformTabBar";
import {
  systemApiGatewayService,
  type ApiKeyResponse,
  type ApiKeySecretResponse,
  type CreateApiKeyRequest,
  type WebhookDeliveryResponse,
  type WebhookResponse,
} from "../../../services/systemApiGateway.service";

type Props = { onShowToast: (message: string, type?: ToastType) => void };
type GatewayTab = "keys" | "webhooks" | "dead-letters";
type GatewayStatus = "active" | "disabled" | "expired";

const INPUT_CLASS =
  "h-9 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-800 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20";

function formatDate(value: string | null): string {
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

function StatusBadge({ status }: { status: GatewayStatus }) {
  const styles: Record<GatewayStatus, string> = {
    active: "border-[#7bc043]/40 bg-[#7bc043]/10 text-[#385d1b]",
    disabled: "border-slate-200 bg-slate-100 text-slate-600",
    expired: "border-rose-200 bg-rose-50 text-rose-700",
  };
  const labels: Record<GatewayStatus, string> = {
    active: "Đang hoạt động",
    disabled: "Đã tắt",
    expired: "Đã hết hạn",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-[1px] ${
        status === "active" ? "bg-[#7bc043]" : status === "expired" ? "bg-rose-500" : "bg-slate-400"
      }`} />
      {labels[status]}
    </span>
  );
}

function deliveryStatusLabel(status: string | null): string {
  switch (status) {
    case "Delivered":
      return "Đã gửi";
    case "Failed":
      return "Thất bại";
    default:
      return status ?? "Chưa gửi";
  }
}

function ApiKeyDialog({
  existing,
  saving,
  onClose,
  onSave,
}: {
  existing: ApiKeyResponse | null;
  saving: boolean;
  onClose: () => void;
  onSave: (request: CreateApiKeyRequest & { isActive: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [scopes, setScopes] = useState(existing?.scopes.join(", ") ?? "students.read");
  const [rateLimit, setRateLimit] = useState(existing?.rateLimitPerMinute ?? 120);
  const [expiresAt, setExpiresAt] = useState(() => {
    if (!existing?.expiresAt) return "";
    const date = new Date(existing.expiresAt);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  });
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedScopes = scopes
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean);
    if (normalizedScopes.length === 0) {
      setError("Nhập ít nhất một phạm vi quyền, phân tách bằng dấu phẩy.");
      return;
    }

    setError(null);
    try {
      await onSave({
        name: name.trim(),
        scopes: normalizedScopes,
        rateLimitPerMinute: rateLimit,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        isActive,
      });
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="api-key-dialog-title" className="w-full max-w-lg rounded-md border border-slate-200 bg-white shadow-xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 id="api-key-dialog-title" className="text-sm font-bold text-slate-900">{existing ? "Chỉnh sửa khóa API" : "Cấp khóa API mới"}</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Mã bí mật chỉ hiển thị một lần khi tạo hoặc cấp lại khóa.</p>
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose} disabled={saving} className="rounded-[4px] p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <form onSubmit={(event) => void submit(event)} className="space-y-3 p-4">
          <label className="block text-xs font-semibold text-slate-700">
            Tên khóa <span className="text-rose-600">*</span>
            <input autoFocus required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} className={`${INPUT_CLASS} mt-1`} placeholder="Ví dụ: SIS phòng Đào tạo" />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Phạm vi quyền <span className="text-rose-600">*</span>
            <textarea required value={scopes} onChange={(event) => setScopes(event.target.value)} rows={2} className="mt-1 w-full resize-y rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20" placeholder="students.read, reports.write" />
            <span className="mt-1 block text-[10px] font-normal text-slate-500">Nhập phạm vi quyền, phân tách bằng dấu phẩy.</span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-700">
              Giới hạn lượt gọi/phút
              <input required type="number" min={1} max={100000} value={rateLimit} onChange={(event) => setRateLimit(Number(event.target.value))} className={`${INPUT_CLASS} mt-1`} />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Hết hạn (không bắt buộc)
              <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className={`${INPUT_CLASS} mt-1`} />
            </label>
          </div>
          {existing && (
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="accent-[#026aa7]" />
              Cho phép sử dụng khóa
            </label>
          )}
          {error && <p role="alert" className="rounded-[4px] border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
          <footer className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={onClose} disabled={saving} className="h-8 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Hủy</button>
            <button type="submit" disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[#026aa7] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e] disabled:opacity-50">
              {saving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {existing ? "Lưu thay đổi" : "Cấp khóa"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function WebhookDialog({
  existing,
  saving,
  onClose,
  onSave,
}: {
  existing: WebhookResponse | null;
  saving: boolean;
  onClose: () => void;
  onSave: (request: { url: string; eventType: string; isActive: boolean }) => Promise<void>;
}) {
  const [url, setUrl] = useState(existing?.url ?? "");
  const [eventType, setEventType] = useState(existing?.eventType ?? "");
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await onSave({ url: url.trim(), eventType: eventType.trim(), isActive });
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="webhook-dialog-title" className="w-full max-w-lg rounded-md border border-slate-200 bg-white shadow-xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 id="webhook-dialog-title" className="text-sm font-bold text-slate-900">{existing ? "Chỉnh sửa webhook" : "Đăng ký webhook"}</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Chỉ HTTPS tới IP công khai được phép để bảo vệ hạ tầng nội bộ.</p>
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose} disabled={saving} className="rounded-[4px] p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <form onSubmit={(event) => void submit(event)} className="space-y-3 p-4">
          <label className="block text-xs font-semibold text-slate-700">
            URL HTTPS <span className="text-rose-600">*</span>
            <input autoFocus required type="url" maxLength={2048} value={url} onChange={(event) => setUrl(event.target.value)} className={`${INPUT_CLASS} mt-1`} placeholder="https://example.edu.vn/hooks/internlink" />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Loại sự kiện <span className="text-rose-600">*</span>
            <input required maxLength={100} value={eventType} onChange={(event) => setEventType(event.target.value)} className={`${INPUT_CLASS} mt-1`} placeholder="report.submitted" />
          </label>
          {existing && (
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="accent-[#026aa7]" />
              Cho phép gửi sự kiện
            </label>
          )}
          {error && <p role="alert" className="rounded-[4px] border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
          <footer className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={onClose} disabled={saving} className="h-8 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Hủy</button>
            <button type="submit" disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[#026aa7] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e] disabled:opacity-50">
              {saving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {existing ? "Lưu thay đổi" : "Đăng ký"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function OneTimeSecretDialog({
  response,
  onClose,
  onShowToast,
}: {
  response: ApiKeySecretResponse | { webhook: WebhookResponse; secret: string } | null;
  onClose: () => void;
  onShowToast: Props["onShowToast"];
}) {
  if (!response) return null;
  const label = "apiKey" in response ? "Khóa API" : "Mã bí mật ký webhook";
  const secret = response.secret;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-3">
      <section role="dialog" aria-modal="true" aria-labelledby="secret-title" className="w-full max-w-lg rounded-md border border-slate-200 bg-white shadow-xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 id="secret-title" className="text-sm font-bold text-slate-900">Lưu mã bí mật ngay</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Mã bí mật chỉ hiển thị một lần. Hãy lưu vào kho bí mật an toàn.</p>
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose} className="rounded-[4px] p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" aria-hidden="true" /></button>
        </header>
        <div className="space-y-3 p-4">
          <label htmlFor="one-time-secret" className="text-xs font-semibold text-slate-700">{label}</label>
          <textarea id="one-time-secret" readOnly rows={3} value={secret} className="w-full resize-none rounded-[4px] border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-800" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => {
              void navigator.clipboard.writeText(secret).then(
                () => onShowToast("Đã sao chép mã bí mật.", "success"),
                () => onShowToast("Không thể sao chép; hãy chọn và sao chép thủ công.", "warning"),
              );
            }} className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Clipboard className="h-3.5 w-3.5" aria-hidden="true" /> Sao chép
            </button>
            <button type="button" onClick={onClose} className="h-8 rounded-[4px] border border-[#026aa7] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e]">Đã lưu</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ApiGatewayView({ onShowToast }: Props) {
  const queryClient = useQueryClient();
  const {
    tenants,
    selectedTenant,
    selectedTenantId: tenantId,
    selectTenant,
    isLoading: tenantListLoading,
    error: tenantListError,
  } = useActiveTenant();
  const [tab, setTab] = useState<GatewayTab>("keys");
  const [search, setSearch] = useState("");
  const [keyDialog, setKeyDialog] = useState<"create" | "edit" | null>(null);
  const [editingKey, setEditingKey] = useState<ApiKeyResponse | null>(null);
  const [webhookDialog, setWebhookDialog] = useState<"create" | "edit" | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<WebhookResponse | null>(null);
  const [secretResponse, setSecretResponse] = useState<OneTimeSecretDialogProps["response"]>(null);
  const [secretResponseTenantId, setSecretResponseTenantId] = useState("");
  const [interactionTenantId, setInteractionTenantId] = useState(tenantId);
  const activeTenantIdRef = useRef(tenantId);

  const keysQuery = useQuery({
    queryKey: ["erp3-api-keys", tenantId],
    queryFn: ({ signal }) => systemApiGatewayService.getApiKeys(tenantId, signal),
    enabled: Boolean(tenantId),
  });
  const webhooksQuery = useQuery({
    queryKey: ["erp3-webhooks", tenantId],
    queryFn: ({ signal }) => systemApiGatewayService.getWebhooks(tenantId, signal),
    enabled: Boolean(tenantId),
  });
  const deadLettersQuery = useQuery({
    queryKey: ["erp3-dead-letters", tenantId],
    queryFn: ({ signal }) => systemApiGatewayService.getDeadLetters(tenantId, signal),
    enabled: Boolean(tenantId),
  });

  const createKeyMutation = useMutation({
    mutationFn: ({ tenantId: targetTenantId, request }: { tenantId: string; request: CreateApiKeyRequest }) =>
      systemApiGatewayService.createApiKey(targetTenantId, request),
    onSuccess: async (result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["erp3-api-keys", variables.tenantId] });
      if (activeTenantIdRef.current !== variables.tenantId) return;
      setKeyDialog(null);
      setSecretResponse(result);
      setSecretResponseTenantId(variables.tenantId);
      onShowToast("Đã cấp khóa API. Hãy lưu mã bí mật ngay.", "success");
    },
  });
  const updateKeyMutation = useMutation({
    mutationFn: (request: CreateApiKeyRequest & { isActive: boolean }) => {
      if (!editingKey) throw new Error("Chưa chọn khóa API cần chỉnh sửa.");
      return systemApiGatewayService.updateApiKey(tenantId, editingKey.id, request);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["erp3-api-keys", tenantId] });
      setKeyDialog(null);
      setEditingKey(null);
      onShowToast("Đã cập nhật khóa API.", "success");
    },
  });
  const deleteKeyMutation = useMutation({
    mutationFn: (id: string) => systemApiGatewayService.deleteApiKey(tenantId, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["erp3-api-keys", tenantId] });
      onShowToast("Đã thu hồi khóa API.", "success");
    },
    onError: (reason) => onShowToast(getApiErrorMessage(reason), "danger"),
  });
  const rotateKeyMutation = useMutation({
    mutationFn: ({ tenantId: targetTenantId, id }: { tenantId: string; id: string }) =>
      systemApiGatewayService.rotateApiKey(targetTenantId, id),
    onSuccess: async (result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["erp3-api-keys", variables.tenantId] });
      if (activeTenantIdRef.current !== variables.tenantId) return;
      setSecretResponse(result);
      setSecretResponseTenantId(variables.tenantId);
      onShowToast("Đã cấp mã bí mật mới; mã cũ không còn hiệu lực.", "success");
    },
    onError: (reason) => onShowToast(getApiErrorMessage(reason), "danger"),
  });
  const createWebhookMutation = useMutation({
    mutationFn: ({ tenantId: targetTenantId, request }: { tenantId: string; request: { url: string; eventType: string } }) =>
      systemApiGatewayService.createWebhook(targetTenantId, request),
    onSuccess: async (result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["erp3-webhooks", variables.tenantId] });
      if (activeTenantIdRef.current !== variables.tenantId) return;
      setWebhookDialog(null);
      setSecretResponse(result);
      setSecretResponseTenantId(variables.tenantId);
      onShowToast("Đã đăng ký webhook. Hãy lưu mã bí mật ký ngay.", "success");
    },
  });
  const updateWebhookMutation = useMutation({
    mutationFn: (request: { url: string; eventType: string; isActive: boolean }) => {
      if (!editingWebhook) throw new Error("Chưa chọn webhook cần chỉnh sửa.");
      return systemApiGatewayService.updateWebhook(tenantId, editingWebhook.id, request);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["erp3-webhooks", tenantId] });
      setWebhookDialog(null);
      setEditingWebhook(null);
      onShowToast("Đã cập nhật webhook.", "success");
    },
  });
  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => systemApiGatewayService.deleteWebhook(tenantId, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["erp3-webhooks", tenantId] });
      onShowToast("Webhook đã được xóa.", "success");
    },
    onError: (reason) => onShowToast(getApiErrorMessage(reason), "danger"),
  });
  const testWebhookMutation = useMutation({
    mutationFn: (id: string) => systemApiGatewayService.testWebhook(tenantId, id),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["erp3-webhooks", tenantId] }),
        queryClient.invalidateQueries({ queryKey: ["erp3-dead-letters", tenantId] }),
      ]);
      onShowToast(
        result.status === "Delivered" ? "Webhook thử nghiệm đã gửi thành công." : "Webhook thử nghiệm thất bại; xem lịch sử gửi.",
        result.status === "Delivered" ? "success" : "warning",
      );
    },
    onError: (reason) => onShowToast(getApiErrorMessage(reason), "danger"),
  });
  const retryMutation = useMutation({
    mutationFn: (id: string) => systemApiGatewayService.retryDelivery(tenantId, id),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["erp3-dead-letters", tenantId] }),
        queryClient.invalidateQueries({ queryKey: ["erp3-webhooks", tenantId] }),
      ]);
      onShowToast(
        result.status === "Delivered" ? "Đã gửi lại thành công." : "Gửi lại vẫn thất bại; xem lịch sử mới nhất.",
        result.status === "Delivered" ? "success" : "warning",
      );
    },
    onError: (reason) => onShowToast(getApiErrorMessage(reason), "danger"),
  });
  useEffect(() => {
    setInteractionTenantId(tenantId);
    setSecretResponse(null);
    setSecretResponseTenantId("");
    setEditingKey(null);
    setKeyDialog(null);
    setEditingWebhook(null);
    setWebhookDialog(null);
  }, [tenantId]);
  useLayoutEffect(() => {
    activeTenantIdRef.current = tenantId;
  }, [tenantId]);

  const filteredKeys = useMemo(() => (keysQuery.data ?? []).filter((item) =>
    `${item.name} ${item.keyPrefix} ${item.scopes.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase())), [keysQuery.data, search]);
  const filteredWebhooks = useMemo(() => (webhooksQuery.data ?? []).filter((item) =>
    `${item.url} ${item.eventType}`.toLowerCase().includes(search.trim().toLowerCase())), [webhooksQuery.data, search]);

  async function saveKey(request: CreateApiKeyRequest & { isActive: boolean }) {
    if (editingKey) await updateKeyMutation.mutateAsync(request);
    else await createKeyMutation.mutateAsync({ tenantId, request });
  }

  async function saveWebhook(request: { url: string; eventType: string; isActive: boolean }) {
    if (editingWebhook) await updateWebhookMutation.mutateAsync(request);
    else await createWebhookMutation.mutateAsync({
      tenantId,
      request: { url: request.url, eventType: request.eventType },
    });
  }

  const busy =   tenantListLoading
    || keysQuery.isFetching
    || webhooksQuery.isFetching
    || deadLettersQuery.isFetching;
  const error = tenantListError
    ?? (keysQuery.isError ? keysQuery.error : null)
    ?? (webhooksQuery.isError ? webhooksQuery.error : null)
    ?? (deadLettersQuery.isError ? deadLettersQuery.error : null);
  const refresh = () => {
    void Promise.all([
      keysQuery.refetch(),
      webhooksQuery.refetch(),
      deadLettersQuery.refetch(),
    ]);
  };

  return (
    <div className="min-h-full bg-slate-50">
      <PlatformPageHeader
        title="Cổng Tích hợp & Khóa API (API Gateway)"
        description="Quản lý khóa API, webhook và lịch sử gửi theo đơn vị."
        breadcrumbs={[
          { label: "Quản trị nền tảng", href: "/admin/dashboard" },
          { label: "Kết nối & tích hợp" },
          { label: "Cổng tích hợp & khóa API" },
        ]}
        activeTenant={selectedTenant}
        onChangeTenant={() => document.getElementById("gateway-tenant")?.focus()}
      />
      <CompactActionBar
        icon={Webhook}
        title="Cổng tích hợp và khóa API"
        subtitle="Quản lý khóa tích hợp, webhook và lịch sử gửi"
        hideTitle
        total={tenantId ? `Đơn vị: ${tenants.find((tenant) => tenant.id === tenantId)?.tenantCode ?? "—"}` : undefined}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Tìm kiếm theo từ khóa...",
          ariaLabel: "Tìm khóa API hoặc webhook",
        }}
        filters={
          <>
            <label htmlFor="gateway-tenant" className="sr-only">Đơn vị triển khai</label>
            <select id="gateway-tenant" value={tenantId} onChange={(event) => selectTenant(event.target.value)} disabled={tenantListLoading || tenants.length === 0} className="h-8 max-w-56 rounded-[4px] border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#026aa7]">
              {tenants.length > 0 && !tenantId && <option value="">Chọn đơn vị triển khai</option>}
              {tenants.length === 0 && <option value="">{tenantListLoading ? "Đang tải đơn vị..." : "Chưa có đơn vị"}</option>}
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.tenantCode}</option>)}
            </select>
          </>
        }
        actions={[{
          label: "Làm mới",
          icon: RefreshCw,
          onClick: refresh,
          loading: busy,
        }]}
      />

      <main className={PLATFORM_PAGE_CONTENT_CLASS}>
        {error && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{getApiErrorMessage(error)}</span>
            <button type="button" onClick={refresh} className="rounded-[4px] border border-rose-200 px-2.5 py-1 font-semibold hover:bg-rose-100">Thử lại</button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white">
          <PlatformTabBar
            ariaLabel="Phân hệ API Gateway"
            selectedId={tab}
            className="flex-1 border-b-0"
            tabs={[
              { id: "keys", label: "Khóa API", onSelect: () => setTab("keys") },
              { id: "webhooks", label: "Webhook", onSelect: () => setTab("webhooks") },
              {
                id: "dead-letters",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    Hàng đợi gửi lỗi
                    {(deadLettersQuery.data?.length ?? 0) > 0 && (
                      <span className="rounded-[3px] bg-rose-100 px-1 text-[10px] text-rose-700">
                        {deadLettersQuery.data?.length}
                      </span>
                    )}
                  </span>
                ),
                onSelect: () => setTab("dead-letters"),
              },
            ]}
          />
          {tab === "keys" && (
            <div className="flex shrink-0 items-center pr-2">
              <button type="button" onClick={() => { setInteractionTenantId(tenantId); setEditingKey(null); setKeyDialog("create"); }} disabled={!tenantId} className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[#026aa7] bg-[#026aa7] px-2.5 text-xs font-semibold text-white hover:bg-[#025a8e] disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Tạo mới khóa API
              </button>
            </div>
          )}
          {tab === "webhooks" && (
            <div className="flex shrink-0 items-center pr-2">
              <button type="button" onClick={() => { setInteractionTenantId(tenantId); setEditingWebhook(null); setWebhookDialog("create"); }} disabled={!tenantId} className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[#026aa7] bg-[#026aa7] px-2.5 text-xs font-semibold text-white hover:bg-[#025a8e] disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Thêm mới webhook
              </button>
            </div>
          )}
        </div>

        {!tenantId && !tenantListLoading ? (
          <section className="rounded-md border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
            {tenants.length
            ? "Chọn đơn vị triển khai ở thanh công cụ để quản lý khóa API và webhook."
            : "Tạo đơn vị triển khai trước khi quản lý khóa API và webhook."}
          </section>
        ) : tab === "keys" ? (
          <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <h2 className="flex items-center gap-2 text-xs font-bold text-slate-800"><KeyRound className="h-4 w-4 text-[#026aa7]" aria-hidden="true" /> Danh mục khóa API</h2>
              <span className="text-[11px] text-slate-500">{filteredKeys.length} khóa</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead className="bg-slate-50"><tr className="border-b border-slate-200">
                  {["Tên khóa", "Tiền tố", "Phạm vi quyền", "Giới hạn/phút", "Hết hạn", "Sử dụng lần cuối", "Trạng thái", ""].map((heading) => <th key={heading || "actions"} className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{heading}</th>)}
                </tr></thead>
                <tbody>
                  {keysQuery.isLoading ? (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-xs text-slate-500"><LoaderCircle className="mr-1 inline h-4 w-4 animate-spin" aria-hidden="true" />Đang tải...</td></tr>
                  ) : filteredKeys.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-xs text-slate-500">{search ? "Không tìm thấy khóa API phù hợp." : "Chưa cấp khóa API cho đơn vị này."}</td></tr>
                  ) : filteredKeys.map((key) => (
                    <tr key={key.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                      <td className="px-2.5 py-2 text-xs font-semibold text-slate-800">{key.name}</td>
                      <td className="px-2.5 py-2 font-mono text-[11px] text-[#026aa7]">{key.keyPrefix}…</td>
                      <td className="max-w-64 px-2.5 py-2 text-[11px] text-slate-600">{key.scopes.join(", ")}</td>
                      <td className="px-2.5 py-2 text-xs tabular-nums text-slate-700">{key.rateLimitPerMinute.toLocaleString("vi-VN")}/phút</td>
                      <td className="whitespace-nowrap px-2.5 py-2 text-[11px] text-slate-600">{formatDate(key.expiresAt)}</td>
                      <td className="whitespace-nowrap px-2.5 py-2 text-[11px] text-slate-600">{formatDate(key.lastUsedAt)}</td>
                      <td className="px-2.5 py-2"><StatusBadge status={
                        key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()
                          ? "expired"
                          : key.isActive ? "active" : "disabled"
                      } /></td>
                      <td className="px-2.5 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" aria-label={`Chỉnh sửa ${key.name}`} title="Chỉnh sửa" onClick={() => { setInteractionTenantId(tenantId); setEditingKey(key); setKeyDialog("edit"); }} className="rounded-[4px] p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#026aa7]"><Edit2 className="h-3.5 w-3.5" aria-hidden="true" /></button>
                          <button type="button" aria-label={`Cấp lại khóa API ${key.name}`} title="Cấp lại khóa API" onClick={() => {
                            if (window.confirm(`Cấp lại khóa API cho “${key.name}”? Khóa hiện tại sẽ mất hiệu lực ngay.`)) rotateKeyMutation.mutate({ tenantId, id: key.id });
                          }} disabled={rotateKeyMutation.isPending} className="rounded-[4px] p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /></button>
                          <button type="button" aria-label={`Thu hồi ${key.name}`} title="Thu hồi" onClick={() => {
                            if (window.confirm(`Thu hồi khóa API “${key.name}”?`)) deleteKeyMutation.mutate(key.id);
                          }} disabled={deleteKeyMutation.isPending} className="rounded-[4px] p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : tab === "webhooks" ? (
          <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <h2 className="flex items-center gap-2 text-xs font-bold text-slate-800"><Webhook className="h-4 w-4 text-[#026aa7]" aria-hidden="true" /> Danh mục webhook</h2>
              <span className="text-[11px] text-slate-500">{filteredWebhooks.length} webhook</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="bg-slate-50"><tr className="border-b border-slate-200">
                  {["Địa chỉ nhận", "Sự kiện", "Lần gửi cuối", "Kết quả", "Trạng thái", ""].map((heading) => <th key={heading || "actions"} className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{heading}</th>)}
                </tr></thead>
                <tbody>
                  {webhooksQuery.isLoading ? (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-xs text-slate-500"><LoaderCircle className="mr-1 inline h-4 w-4 animate-spin" aria-hidden="true" />Đang tải...</td></tr>
                  ) : filteredWebhooks.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-xs text-slate-500">{search ? "Không tìm thấy webhook phù hợp." : "Chưa đăng ký webhook cho đơn vị này."}</td></tr>
                  ) : filteredWebhooks.map((webhook) => (
                    <tr key={webhook.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                      <td className="max-w-[360px] px-2.5 py-2 text-xs text-slate-700"><span className="block truncate" title={webhook.url}>{webhook.url}</span></td>
                      <td className="px-2.5 py-2 font-mono text-[11px] text-slate-600">{webhook.eventType}</td>
                      <td className="whitespace-nowrap px-2.5 py-2 text-[11px] text-slate-600">{formatDate(webhook.lastTriggeredAt)}</td>
                      <td className="max-w-48 px-2.5 py-2 text-[11px] text-slate-600">{deliveryStatusLabel(webhook.lastStatus)}</td>
                      <td className="px-2.5 py-2"><StatusBadge status={webhook.isActive ? "active" : "disabled"} /></td>
                      <td className="px-2.5 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" aria-label={`Gửi thử cho ${webhook.eventType}`} title="Gửi thử" onClick={() => testWebhookMutation.mutate(webhook.id)} disabled={testWebhookMutation.isPending || !webhook.isActive} className="rounded-[4px] p-1.5 text-slate-500 hover:bg-[#026aa7]/10 hover:text-[#026aa7] disabled:opacity-50"><Send className="h-3.5 w-3.5" aria-hidden="true" /></button>
                          <button type="button" aria-label={`Chỉnh sửa webhook ${webhook.eventType}`} title="Chỉnh sửa" onClick={() => { setInteractionTenantId(tenantId); setEditingWebhook(webhook); setWebhookDialog("edit"); }} className="rounded-[4px] p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#026aa7]"><Edit2 className="h-3.5 w-3.5" aria-hidden="true" /></button>
                          <button type="button" aria-label={`Xóa webhook ${webhook.eventType}`} title="Xóa" onClick={() => {
                            if (window.confirm(`Xóa webhook ${webhook.eventType}?`)) deleteWebhookMutation.mutate(webhook.id);
                          }} disabled={deleteWebhookMutation.isPending} className="rounded-[4px] p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <DeliveryTable
            items={deadLettersQuery.data ?? []}
            loading={deadLettersQuery.isLoading}
            retrying={retryMutation.isPending}
            onRetry={(id) => retryMutation.mutate(id)}
          />
        )}

        {tenants.length === 100 && <p className="text-[10px] text-slate-500">Đang giới hạn 100 đơn vị đầu tiên trong danh sách.</p>}
      </main>

      {keyDialog && interactionTenantId === tenantId && <ApiKeyDialog
        key={interactionTenantId}
        existing={keyDialog === "edit" ? editingKey : null}
        saving={createKeyMutation.isPending || updateKeyMutation.isPending}
        onClose={() => { setKeyDialog(null); setEditingKey(null); }}
        onSave={saveKey}
      />}
      {webhookDialog && interactionTenantId === tenantId && <WebhookDialog
        existing={webhookDialog === "edit" ? editingWebhook : null}
        saving={createWebhookMutation.isPending || updateWebhookMutation.isPending}
        onClose={() => { setWebhookDialog(null); setEditingWebhook(null); }}
        onSave={saveWebhook}
      />}
      <OneTimeSecretDialog
        response={secretResponseTenantId === tenantId ? secretResponse : null}
        onClose={() => {
          setSecretResponse(null);
          setSecretResponseTenantId("");
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
}

function DeliveryTable({
  items,
  loading,
  retrying,
  onRetry,
}: {
  items: WebhookDeliveryResponse[];
  loading: boolean;
  retrying: boolean;
  onRetry: (id: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <h2 className="text-xs font-bold text-slate-800">Hàng đợi webhook gửi lỗi</h2>
        <span className="rounded-[3px] border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">{items.length} thất bại</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="bg-slate-50"><tr className="border-b border-slate-200">
            {["Sự kiện", "Mã lượt gửi", "Số lần thử", "Mã HTTP", "Thời gian", "Lỗi", ""].map((heading) => <th key={heading || "actions"} className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{heading}</th>)}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-xs text-slate-500"><LoaderCircle className="mr-1 inline h-4 w-4 animate-spin" aria-hidden="true" />Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-xs text-slate-500"><Check className="mr-1 inline h-4 w-4 text-[#7bc043]" aria-hidden="true" />Không có lượt gửi thất bại.</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 last:border-0">
                <td className="px-2.5 py-2 text-xs font-semibold text-slate-800">{item.eventType}</td>
                <td className="px-2.5 py-2 font-mono text-[10px] text-slate-600">{item.deliveryId}</td>
                <td className="px-2.5 py-2 text-xs tabular-nums text-slate-700">{item.attemptNumber}</td>
                <td className="px-2.5 py-2 text-xs tabular-nums text-slate-700">{item.httpStatusCode ?? "—"}</td>
                <td className="whitespace-nowrap px-2.5 py-2 text-[11px] text-slate-600">{formatDate(item.startedAt)}</td>
                <td className="max-w-64 px-2.5 py-2 text-[11px] text-rose-700">{item.errorMessage ?? item.responseBody ?? "Gửi webhook thất bại."}</td>
                <td className="px-2.5 py-2 text-right">
                  <button type="button" onClick={() => onRetry(item.id)} disabled={retrying} className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-slate-200 px-2 text-[11px] font-semibold text-slate-700 hover:border-[#026aa7] hover:text-[#026aa7] disabled:opacity-50">
                    {retrying ? <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-3 w-3" aria-hidden="true" />} Thử lại
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type OneTimeSecretDialogProps = {
  response: ApiKeySecretResponse | { webhook: WebhookResponse; secret: string } | null;
  onClose: () => void;
  onShowToast: Props["onShowToast"];
};
