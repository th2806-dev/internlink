import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, RefreshCw, ToggleLeft, X } from "lucide-react";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { useActiveTenant } from "../../../contexts/ActiveTenantContext";
import type { ToastType } from "../../../contexts/ToastContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { PLATFORM_PAGE_CONTENT_CLASS, PlatformPageHeader } from "../components/PlatformPageHeader";
import {
  platformOperationsService,
  type AnnouncementAudience,
  type CreatePlatformAnnouncement,
  type PlatformAnnouncement,
  type PlatformAnnouncementType,
} from "../../../services/platformOperations.service";
import { systemCatalogService } from "../../../services/systemCatalog.service";

type Props = { onShowToast: (message: string, type?: ToastType) => void };

function toLocalInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value: string): string {
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

function typeLabel(type: PlatformAnnouncementType): string {
  switch (type) {
    case "Maintenance": return "Bảo trì";
    case "ReleaseNote": return "Bản phát hành";
    case "SecurityAlert": return "Khẩn cấp / bảo mật";
    case "General": return "Thông báo chung";
  }
}

function typeStyle(type: PlatformAnnouncementType): string {
  if (type === "SecurityAlert") return "border-amber-300 bg-amber-50 text-amber-900";
  if (type === "Maintenance") return "border-[#026aa7]/30 bg-[#026aa7]/5 text-[#026aa7]";
  if (type === "ReleaseNote") return "border-[#7bc043]/40 bg-[#7bc043]/10 text-slate-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function CreateAnnouncementForm({
  pending,
  onClose,
  onCreate,
}: {
  pending: boolean;
  onClose: () => void;
  onCreate: (request: CreatePlatformAnnouncement) => Promise<void>;
}) {
  const { tenants, isLoading: isTenantsLoading, error: tenantsError } = useActiveTenant();
  const catalogQuery = useQuery({
    queryKey: ["system-admin", "catalogs"],
    queryFn: ({ signal }) => systemCatalogService.getCatalog(signal),
  });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<PlatformAnnouncementType>("Maintenance");
  const [targetAudience, setTargetAudience] = useState<AnnouncementAudience>("AllUsers");
  const [targetTenantId, setTargetTenantId] = useState("");
  const [startsAt, setStartsAt] = useState(() => toLocalInput(new Date()));
  const [endsAt, setEndsAt] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [showBanner, setShowBanner] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (new Date(startsAt) >= new Date(endsAt)) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }

    try {
      await onCreate({
        title: title.trim(),
        content: content.trim(),
        type,
        targetAudience,
        targetTenantId: targetTenantId || null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        showBanner,
      });
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    }
  };

  const inputClass = "h-9 w-full rounded-[4px] border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20";
  const labelClass = "mb-1 block text-[11px] font-semibold text-slate-600";

  return (
    <section role="dialog" aria-modal="true" aria-labelledby="announcement-form-title" className="rounded-md border border-[#026aa7]/20 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
        <div>
          <h2 id="announcement-form-title" className="text-sm font-bold text-slate-900">Tạo thông báo mới</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Chọn đối tượng và thời gian hiển thị thông báo.</p>
        </div>
        <button type="button" aria-label="Đóng biểu mẫu thông báo" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </header>
      <form onSubmit={(event) => void submit(event)} className="space-y-3 p-3">
        {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">{error}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            <span className={labelClass}>Tiêu đề *</span>
            <input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>Loại thông báo *</span>
            <select aria-label="Loại thông báo" value={type} onChange={(event) => setType(event.target.value as PlatformAnnouncementType)} className={inputClass}>
              {(catalogQuery.data?.announcementTypes ?? []).map((item) => <option key={item.value} value={item.value as PlatformAnnouncementType}>{item.label}</option>)}
            </select>
          </label>
          <label className="md:col-span-2">
            <span className={labelClass}>Nội dung *</span>
            <textarea required maxLength={5000} rows={3} value={content} onChange={(event) => setContent(event.target.value)} className="w-full rounded-[4px] border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20" />
          </label>
          <label>
            <span className={labelClass}>Đối tượng nhận</span>
            <select aria-label="Đối tượng nhận thông báo" value={targetAudience} onChange={(event) => setTargetAudience(event.target.value as AnnouncementAudience)} className={inputClass}>
              {(catalogQuery.data?.announcementAudiences ?? []).map((item) => (
                <option key={item.value} value={item.value as AnnouncementAudience}>{item.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Đơn vị nhận (không bắt buộc)</span>
            <select aria-label="Đơn vị nhận thông báo" value={targetTenantId} onChange={(event) => setTargetTenantId(event.target.value)} disabled={isTenantsLoading} className={inputClass}>
              <option value="">Toàn sàn</option>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.tenantCode})</option>)}
            </select>
            {tenantsError && <span role="alert" className="mt-1 block text-[10px] text-rose-700">Không tải được danh sách đơn vị; thông báo sẽ áp dụng toàn sàn.</span>}
          </label>
          <label>
            <span className={labelClass}>Bắt đầu *</span>
            <input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>Kết thúc *</span>
            <input required type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={inputClass} />
          </label>
        </div>
        <label className="inline-flex min-h-8 items-center gap-2 text-xs font-medium text-slate-700">
          <input type="checkbox" checked={showBanner} onChange={(event) => setShowBanner(event.target.checked)} className="h-4 w-4 accent-[#026aa7]" />
          Hiển thị banner cho thông báo bảo trì / bảo mật đang diễn ra
        </label>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={pending} className="inline-flex h-9 items-center justify-center rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Hủy</button>
          <button type="submit" disabled={pending} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:cursor-wait disabled:opacity-60">
            {pending ? <RefreshCw aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Plus aria-hidden="true" className="h-3.5 w-3.5" />}
            Tạo thông báo
          </button>
        </div>
      </form>
    </section>
  );
}

export function PlatformAnnouncementView({ onShowToast }: Props) {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<PlatformAnnouncementType | "">("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const catalogQuery = useQuery({
    queryKey: ["system-admin", "catalogs"],
    queryFn: ({ signal }) => systemCatalogService.getCatalog(signal),
  });
  const announcementsQuery = useQuery({
    queryKey: ["platform-announcements", "list", typeFilter],
    queryFn: ({ signal }) => platformOperationsService.getAnnouncements(typeFilter, signal),
  });
  const createMutation = useMutation({
    mutationFn: platformOperationsService.createAnnouncement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform-announcements"] });
      setIsFormOpen(false);
      onShowToast("Đã tạo thông báo nền tảng.", "success");
    },
    onError: (reason) => onShowToast(getApiErrorMessage(reason), "danger"),
  });
  const toggleMutation = useMutation({
    mutationFn: platformOperationsService.toggleAnnouncement,
    onSuccess: async (announcement) => {
      await queryClient.invalidateQueries({ queryKey: ["platform-announcements"] });
      onShowToast(
        announcement.isActive ? "Đã bật phát thông báo." : "Đã tạm dừng thông báo.",
        "success",
      );
    },
    onError: (reason) => onShowToast(getApiErrorMessage(reason), "danger"),
  });
  const inputClass = "h-8 rounded-[4px] border border-slate-200 bg-white px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30";

  return (
    <div className="min-h-full bg-slate-50">
      <PlatformPageHeader
        title="Trung tâm Thông báo Nền tảng"
        description="Lên lịch bảo trì, thông tin phát hành và cảnh báo bảo mật theo đơn vị."
        breadcrumbs={[
          { label: "Quản trị nền tảng", href: "/admin/dashboard" },
          { label: "Chỉ huy nền tảng" },
          { label: "Thông báo nền tảng" },
        ]}
        statistic={announcementsQuery.data ? `${announcementsQuery.data.length} thông báo` : undefined}
      />
      <CompactActionBar
        icon={Megaphone}
        title="Thông báo nền tảng"
        subtitle="Quản lý nội dung phát hành trên toàn sàn"
        hideTitle
        total={announcementsQuery.data ? `${announcementsQuery.data.length} thông báo` : undefined}
        actions={[
          {
            label: "Tạo thông báo mới",
            icon: Plus,
            variant: "primary",
            onClick: () => setIsFormOpen(true),
          },
          {
            label: "Làm mới",
            icon: RefreshCw,
            onClick: () => void announcementsQuery.refetch(),
            loading: announcementsQuery.isFetching,
          },
        ]}
      />
      <main className={PLATFORM_PAGE_CONTENT_CLASS}>
        {isFormOpen && (
          <CreateAnnouncementForm
            pending={createMutation.isPending}
            onClose={() => setIsFormOpen(false)}
            onCreate={async (request) => {
              await createMutation.mutateAsync(request);
            }}
          />
        )}
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Danh sách thông báo</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">Các thông báo có thể được bật/tạm dừng mà không xóa dữ liệu.</p>
            </div>
            <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
              Lọc theo loại
              <select aria-label="Lọc thông báo theo loại" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as PlatformAnnouncementType | "")} className={inputClass}>
                <option value="">Tất cả loại</option>
                {(catalogQuery.data?.announcementTypes ?? []).map((item) => <option key={item.value} value={item.value as PlatformAnnouncementType}>{item.label}</option>)}
              </select>
            </label>
          </header>
          {announcementsQuery.error && (
            <div role="alert" className="flex items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <span>{getApiErrorMessage(announcementsQuery.error)}</span>
              <button type="button" onClick={() => void announcementsQuery.refetch()} className="rounded-[4px] border border-rose-300 bg-white px-2.5 py-1 font-semibold hover:bg-rose-100">Thử lại</button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  {["Thông báo", "Loại", "Đối tượng", "Thời gian phát", "Banner", "Trạng thái", "Thao tác"].map((heading) => <th key={heading} className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {announcementsQuery.isLoading ? (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-xs text-slate-500"><RefreshCw aria-hidden="true" className="mr-1 inline h-4 w-4 animate-spin" />Đang tải thông báo...</td></tr>
                ) : !announcementsQuery.data?.length ? (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-xs text-slate-500">Chưa có thông báo phù hợp.</td></tr>
                ) : announcementsQuery.data.map((announcement: PlatformAnnouncement) => (
                  <tr key={announcement.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="max-w-80 px-2.5 py-2 align-top">
                      <p className="text-xs font-semibold text-slate-800">{announcement.title}</p>
                      <p className="mt-1 line-clamp-2 whitespace-pre-line text-[11px] leading-4 text-slate-500">{announcement.content}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{announcement.targetTenantName ?? "Toàn sàn"}</p>
                    </td>
                    <td className="px-2.5 py-2 align-top"><span className={`inline-flex rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold ${typeStyle(announcement.type)}`}>{typeLabel(announcement.type)}</span></td>
                    <td className="whitespace-nowrap px-2.5 py-2 align-top text-[11px] text-slate-600">{announcement.targetAudience === "TenantAdminsOnly" ? "Quản trị viên đơn vị" : "Tất cả người dùng"}</td>
                    <td className="whitespace-nowrap px-2.5 py-2 align-top text-[11px] text-slate-600">{formatDate(announcement.startsAt)}<br /><span className="text-slate-400">đến</span> {formatDate(announcement.endsAt)}</td>
                    <td className="px-2.5 py-2 align-top text-[11px] text-slate-600">{announcement.showBanner ? "Có" : "Không"}</td>
                    <td className="px-2.5 py-2 align-top"><span className={`inline-flex rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold ${announcement.isActive ? "border-[#7bc043]/40 bg-[#7bc043]/10 text-slate-800" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{announcement.isActive ? "Đang phát" : "Đã tạm dừng"}</span></td>
                    <td className="whitespace-nowrap px-2.5 py-2 text-right align-top">
                      <button type="button" onClick={() => toggleMutation.mutate(announcement.id)} disabled={toggleMutation.isPending} aria-label={`${announcement.isActive ? "Tạm dừng" : "Phát lại"} ${announcement.title}`} className={`inline-flex h-7 items-center gap-1 rounded-[4px] border px-2 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:opacity-50 ${announcement.isActive ? "border-amber-300 text-amber-800 hover:bg-amber-50" : "border-[#026aa7] text-[#026aa7] hover:bg-[#026aa7]/5"}`}>
                        <ToggleLeft aria-hidden="true" className="h-3.5 w-3.5" />
                        {toggleMutation.isPending && toggleMutation.variables === announcement.id ? "Đang cập nhật..." : announcement.isActive ? "Tạm dừng" : "Phát lại"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
