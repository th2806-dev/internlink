import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCheck, Clock, Info, RefreshCw, Search, ShieldCheck, User, X } from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import { LecturerSubPageHeader } from "../components/LecturerSubPageHeader";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { mapNotificationDtoToLecturerUi } from "../../../lib/portalMappers";
import { notificationService } from "../../../services/notification.service";

export type SystemNotificationItem = ReturnType<typeof mapNotificationDtoToLecturerUi> & {
  student?: string;
  studentMssv?: string;
};
type NotificationItem = SystemNotificationItem;
type ViewFilter = "all" | "system" | "deadline" | "feedback";

const filterLabels: Record<ViewFilter, string> = {
  all: "Tất cả",
  system: "Hệ thống",
  deadline: "Deadline",
  feedback: "Phản hồi sinh viên",
};

function matchesFilter(item: NotificationItem, filter: ViewFilter) {
  if (filter === "system") return item.category === "Hệ thống & Admin";
  if (filter === "deadline") return item.category === "Tiến độ Deadline";
  if (filter === "feedback") return item.category === "Phản hồi SV";
  return true;
}

export const NotificationsView = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    notificationService.getMine()
      .then((rows) => {
        if (cancelled) return;
        const mapped = rows.map(mapNotificationDtoToLecturerUi);
        setNotifications(mapped);
        setSelected(mapped[0] ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setNotifications([]);
        setSelected(null);
        setError(getApiErrorMessage(err));
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [reloadToken]);

  const unreadCount = notifications.filter((item) => item.isUnread).length;
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications
      .filter((item) => matchesFilter(item, filter))
      .filter((item) => !unreadOnly || item.isUnread)
      .filter((item) => !query || [item.title, item.desc, item.sender, item.content].some((value) => value?.toLowerCase().includes(query)))
      .sort((a, b) => {
        // Mới nhất trước theo createdAt thật (GUID id không có thứ tự thời gian)
        const ta = Date.parse(a.createdAt ?? "");
        const tb = Date.parse(b.createdAt ?? "");
        if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
        return 0;
      });
  }, [filter, notifications, search, unreadOnly]);

  const markRead = async (item: NotificationItem) => {
    if (!item.isUnread || markingIds.has(item.id)) return;
    setActionError(null);
    setMarkingIds((current) => new Set(current).add(item.id));
    try {
      await notificationService.markRead(item.id);
      setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, isUnread: false } : entry));
      setSelected((current) => current?.id === item.id ? { ...current, isUnread: false } : current);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setMarkingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setActionError(null);
    setIsMarkingAll(true);
    try {
      await notificationService.markAllRead();
      setNotifications((current) => current.map((item) => ({ ...item, isUnread: false })));
      setSelected((current) => current ? { ...current, isUnread: false } : current);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setIsMarkingAll(false);
    }
  };

  const iconFor = (item: NotificationItem) => item.category === "Hệ thống & Admin"
    ? <ShieldCheck className="h-4 w-4" />
    : item.category === "Tiến độ Deadline"
      ? <Clock className="h-4 w-4" />
      : item.category === "Phản hồi SV"
        ? <User className="h-4 w-4" />
        : <Info className="h-4 w-4" />;

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 pb-12 font-sans">
      <LecturerSubPageHeader
        icon={Bell}
        title="Thông báo"
        subtitle={`${notifications.length} thông báo · ${unreadCount} chưa đọc`}
      >
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={unreadCount === 0 || isMarkingAll}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCheck className={`h-3.5 w-3.5 ${isMarkingAll ? "animate-pulse" : ""}`} aria-hidden="true" />
          Đánh dấu đã đọc tất cả
        </button>
      </LecturerSubPageHeader>

      {error && (
        <Panel role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center shadow-2xs">
          <AlertTriangle className="h-6 w-6 text-rose-600" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Không thể tải thông báo</h2>
            <p className="mt-1 text-xs text-rose-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="il-btn il-btn-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Thử lại
          </button>
        </Panel>
      )}

      {actionError && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          Không thể cập nhật trạng thái thông báo: {actionError}
        </p>
      )}

      <Panel className="space-y-3 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm thông báo..." aria-label="Tìm thông báo" className="min-h-10 w-full rounded-full border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus:ring-2 focus:ring-[#026aa7]/20" />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} className="rounded border-slate-300 accent-[#026aa7]" />
            Chưa đọc
          </label>
        </div>
        <div role="tablist" aria-label="Lọc thông báo" className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
          {(Object.keys(filterLabels) as ViewFilter[]).map((key) => (
            <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)} className={`min-h-9 rounded-full px-4 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 ${filter === key ? "bg-[#026aa7] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {filterLabels[key]}{key === "all" ? ` (${notifications.length})` : ""}
            </button>
          ))}
        </div>

        {isLoading ? <p role="status" className="py-10 text-center text-xs text-slate-500">Đang tải thông báo...</p> : error ? null : visible.length === 0 ? (
          <div className="rounded-xl border border-slate-200/90 bg-slate-50 px-4 py-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-slate-700">{notifications.length === 0 ? "Chưa có thông báo." : "Không có thông báo phù hợp."}</p>
            <p className="mt-1 text-[11px] text-slate-500">{notifications.length === 0 ? "Thông báo hệ thống sẽ hiển thị tại đây khi được gửi đến tài khoản." : "Thử đổi bộ lọc hoặc từ khóa tìm kiếm."}</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {visible.map((item) => (
                <button key={item.id} type="button" onClick={() => { setSelected(item); void markRead(item); }} aria-current={selected?.id === item.id ? "true" : undefined} className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 ${selected?.id === item.id ? "border-[#026aa7]/40 bg-[#026aa7]/5" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                  <div className="flex gap-2.5">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.isUnread ? "bg-[#026aa7]/10 text-[#026aa7]" : "bg-slate-100 text-slate-500"}`}>{iconFor(item)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <strong className="line-clamp-1 text-xs text-slate-900">{item.title}</strong>
                        {item.isUnread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#026aa7]" aria-label="Chưa đọc" />}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed text-slate-500">{item.desc}</span>
                      <span className="mt-1 block text-[10px] text-slate-400">{item.time} · {item.sender}</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="min-h-[300px] rounded-xl border border-slate-200/90 bg-slate-50 p-4">
              {selected ? (
                <article className="space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                    <div><span className="text-[10px] font-bold uppercase text-[#026aa7]">{selected.category}</span><h2 className="mt-1 text-base font-bold text-slate-900">{selected.title}</h2></div>
                    <button type="button" onClick={() => setSelected(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]" title="Đóng chi tiết" aria-label="Đóng chi tiết"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500"><span>Từ: <strong className="text-slate-700">{selected.sender}</strong></span><span>{selected.time}</span><span className={selected.priority === "Khẩn cấp" ? "font-bold text-rose-600" : ""}>{selected.priority}</span></div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.content || selected.desc}</p>
                  {selected.student && <p className="border-t border-slate-200 pt-3 text-xs text-slate-600">Sinh viên: <strong>{selected.student}</strong>{selected.studentMssv ? ` · ${selected.studentMssv}` : ""}</p>}
                </article>
              ) : <p className="py-20 text-center text-xs text-slate-500">Chọn một thông báo để xem chi tiết.</p>}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
};
