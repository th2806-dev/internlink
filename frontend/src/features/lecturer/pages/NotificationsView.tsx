import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Clock, Info, Search, ShieldCheck, User, X } from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
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

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    notificationService.getMine()
      .then((rows) => {
        if (cancelled) return;
        const mapped = rows.map(mapNotificationDtoToLecturerUi);
        setNotifications(mapped);
        setSelected(mapped[0] ?? null);
      })
      .catch((err) => { if (!cancelled) setError(getApiErrorMessage(err)); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

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
        return b.id.localeCompare(a.id);
      });
  }, [filter, notifications, search, unreadOnly]);

  const markRead = async (item: NotificationItem) => {
    if (!item.isUnread) return;
    try {
      await notificationService.markRead(item.id);
    } catch {
      // API lỗi vẫn tối ưu UI trước, dữ liệu sẽ đồng bộ khi refresh
    }
    setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, isUnread: false } : entry));
    setSelected((current) => current?.id === item.id ? { ...current, isUnread: false } : current);
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
    } catch {
      // API lỗi vẫn tối ưu UI trước, dữ liệu sẽ đồng bộ khi refresh
    }
    setNotifications((current) => current.map((item) => ({ ...item, isUnread: false })));
    setSelected((current) => current ? { ...current, isUnread: false } : current);
  };

  const iconFor = (item: NotificationItem) => item.category === "Hệ thống & Admin"
    ? <ShieldCheck className="h-4 w-4" />
    : item.category === "Tiến độ Deadline"
      ? <Clock className="h-4 w-4" />
      : item.category === "Phản hồi SV"
        ? <User className="h-4 w-4" />
        : <Info className="h-4 w-4" />;

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <PageHeader
        icon={Bell}
        title="Thông báo"
        subtitle={`${notifications.length} thông báo · ${unreadCount} chưa đọc`}
        actions={[{
          label: "Đánh dấu đã đọc tất cả",
          icon: CheckCheck,
          onClick: () => void markAllRead(),
          variant: "secondary",
          disabled: unreadCount === 0,
        }]}
      />

      <Panel className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm thông báo..." className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:bg-white" />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} className="rounded border-slate-300 text-blue-600" />
            Chưa đọc
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
          {(Object.keys(filterLabels) as ViewFilter[]).map((key) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-md px-3 py-1.5 text-xs font-bold ${filter === key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {filterLabels[key]}{key === "all" ? ` (${notifications.length})` : ""}
            </button>
          ))}
        </div>

        {isLoading ? <p className="py-10 text-center text-xs text-slate-500">Đang tải thông báo...</p> : error ? <p className="rounded-md bg-rose-50 p-4 text-xs text-rose-700">{error}</p> : visible.length === 0 ? <p className="py-10 text-center text-xs text-slate-500">Không có thông báo phù hợp.</p> : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {visible.map((item) => (
                <button key={item.id} type="button" onClick={() => { setSelected(item); void markRead(item); }} className={`w-full rounded-md border p-3 text-left transition-colors ${selected?.id === item.id ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                  <div className="flex gap-2.5">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${item.isUnread ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{iconFor(item)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <strong className="line-clamp-1 text-xs text-slate-900">{item.title}</strong>
                        {item.isUnread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed text-slate-500">{item.desc}</span>
                      <span className="mt-1 block text-[10px] text-slate-400">{item.time} · {item.sender}</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="min-h-[300px] rounded-md border border-slate-200 bg-slate-50 p-4">
              {selected ? (
                <article className="space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                    <div><span className="text-[10px] font-bold uppercase text-blue-600">{selected.category}</span><h2 className="mt-1 text-base font-bold text-slate-900">{selected.title}</h2></div>
                    <button type="button" onClick={() => setSelected(null)} className="p-1 text-slate-400 hover:text-slate-700" title="Đóng chi tiết"><X className="h-4 w-4" /></button>
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
