import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Building2,
  CheckCheck,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  GraduationCap,
  Inbox,
  Info,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useSemester } from "../../../contexts/SemesterContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import {
  mapNotificationDtoToStudentUi,
  type StudentNotificationItem,
} from "../../../lib/portalMappers";
import { notificationService } from "../../../services/notification.service";
import { StudentSubPageHeader } from "../components/StudentSubPageHeader";

type ViewFilter =
  | "all"
  | "unread"
  | "read"
  | "lecturer"
  | "company"
  | "deadline"
  | "faculty";

type NotificationItem = StudentNotificationItem;

const filterLabels: Record<ViewFilter, string> = {
  all: "Tất cả",
  unread: "Chưa đọc",
  read: "Đã đọc",
  lecturer: "Giảng viên",
  company: "Doanh nghiệp",
  deadline: "Hạn chót & Khẩn",
  faculty: "Thông báo Khoa",
};

function matchesFilter(item: NotificationItem, filter: ViewFilter) {
  if (filter === "unread") return item.isUnread;
  if (filter === "read") return !item.isUnread;
  if (filter === "lecturer") return item.category === "Giảng viên";
  if (filter === "company") return item.category === "Doanh nghiệp";
  if (filter === "deadline")
    return item.category === "Deadline" || item.priority === "Khẩn";
  if (filter === "faculty") return item.category === "Thông báo Khoa";
  return true;
}

export const NotificationsView = ({
  onShowToast,
  onNavigate,
}: {
  onShowToast?: (msg: string) => void;
  onNavigate?: (tab: string) => void;
}) => {
  const { selectedSemester } = useSemester();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setError(null);
      const rows = await notificationService.getMine();
      const mapped = rows.map(mapNotificationDtoToStudentUi);
      setNotifications(mapped);
      setSelected((prev) => {
        if (!prev) return mapped[0] ?? null;
        const exists = mapped.find((m) => m.id === prev.id);
        return exists ?? mapped[0] ?? null;
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadNotifications().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications();
    setIsRefreshing(false);
    onShowToast?.("Đã làm mới danh sách thông báo.");
  };

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.isUnread).length,
    [notifications],
  );


  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications
      .filter((item) => matchesFilter(item, filter))
      .filter((item) => {
        if (!query) return true;
        return [item.title, item.description, item.senderName, item.category]
          .some((val) => val.toLowerCase().includes(query));
      });
  }, [filter, notifications, search]);

  const markRead = async (item: NotificationItem) => {
    if (!item.isUnread) return;
    try {
      await notificationService.markRead(item.id);
      setNotifications((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, isUnread: false } : entry,
        ),
      );
      setSelected((current) =>
        current?.id === item.id ? { ...current, isUnread: false } : current,
      );
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err));
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      await notificationService.markAllRead();
      setNotifications((current) =>
        current.map((item) => ({ ...item, isUnread: false })),
      );
      setSelected((current) =>
        current ? { ...current, isUnread: false } : current,
      );
      onShowToast?.("Đã đánh dấu tất cả thông báo là đã đọc.");
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err));
    } finally {
      setIsMarkingAll(false);
    }
  };

  const iconForCategory = (category: string) => {
    switch (category) {
      case "Giảng viên":
        return <GraduationCap className="h-4 w-4" />;
      case "Doanh nghiệp":
        return <Building2 className="h-4 w-4" />;
      case "Deadline":
        return <Clock className="h-4 w-4" />;
      case "Thông báo Khoa":
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case "Giảng viên":
        return {
          bg: "bg-indigo-50",
          text: "text-indigo-700",
          border: "border-indigo-200",
          badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
        };
      case "Doanh nghiệp":
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
          badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "Deadline":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
        };
      case "Thông báo Khoa":
        return {
          bg: "bg-sky-50",
          text: "text-sky-700",
          border: "border-sky-200",
          badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
        };
      default:
        return {
          bg: "bg-slate-100",
          text: "text-slate-600",
          border: "border-slate-200",
          badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
        };
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "Khẩn":
        return "bg-rose-100 text-rose-800 border-rose-200 font-bold";
      case "Quan trọng":
        return "bg-amber-100 text-amber-800 border-amber-200 font-semibold";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      {/* ═══════════════════════════════════════════════════════════════════
          1. TOP CARD BANNER (Chuẩn layout banner xanh #026aa7 + thông tin thực tế)
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <StudentSubPageHeader
          icon={Bell}
          title="Thông báo & nhắc nhở"
          subtitle="Cập nhật thông tin và hạn chót liên quan đến kỳ thực tập."
          semesterName={selectedSemester?.name}
          onRefresh={() => void handleRefresh()}
          isRefreshing={isRefreshing}
        />


      </div>
      {/* ═══════════════════════════════════════════════════════════════════
          2. MAIN CONTENT: TÌM KIẾM, BỘ LỌC & DANH SÁCH THÔNG BÁO CHIA ĐÔI
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Header điều hướng & tác vụ */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#026aa7]">
              <Inbox className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Hộp thư thông báo
              </h3>
              <p className="text-[11px] text-slate-500">
                Hiển thị {visible.length} trên tổng số {notifications.length} thông báo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={unreadCount === 0 || isMarkingAll}
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>Đánh dấu đã đọc tất cả</span>
            </button>
          </div>
        </div>

        {/* Thanh tìm kiếm & Tabs bộ lọc */}
        <div className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm theo tiêu đề, người gửi hoặc nội dung thông báo..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-9.5 pr-3 text-xs outline-none transition-colors focus:border-blue-500 focus:bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  Xóa
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>{visible.length} kết quả</span>
            </div>
          </div>

          {/* Quick filter tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
            {(Object.keys(filterLabels) as ViewFilter[]).map((key) => {
              const active = filter === key;
              const count =
                key === "all"
                  ? notifications.length
                  : notifications.filter((i) => matchesFilter(i, key)).length;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                    active
                      ? "bg-[#026aa7] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{filterLabels[key]}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-white text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trạng thái Loading / Error / Content */}
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw className="mx-auto h-7 w-7 animate-spin text-[#026aa7]" />
            <p className="mt-3 text-xs font-semibold text-slate-600">
              Đang tải danh sách thông báo...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Không thể tải thông báo</p>
              <p className="mt-0.5">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="rounded-md bg-rose-600 px-2.5 py-1 text-white hover:bg-rose-700 font-medium"
            >
              Thử lại
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-600">
              Không tìm thấy thông báo nào phù hợp
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc khác.
            </p>
          </div>
        ) : (
          /* Split layout: Danh sách (trái) + Chi tiết (phải) */
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            {/* Cột trái: Danh sách thông báo */}
            <div className="max-h-[660px] space-y-2 overflow-y-auto pr-1">
              {visible.map((item) => {
                const isSelected = selected?.id === item.id;
                const theme = getCategoryTheme(item.category);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelected(item);
                      void markRead(item);
                    }}
                    className={`w-full rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#026aa7] bg-blue-50/60 ring-1 ring-[#026aa7]/30 shadow-xs"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon phân loại */}
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                          item.isUnread
                            ? `${theme.bg} ${theme.text} ${theme.border}`
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {iconForCategory(item.category)}
                      </span>

                      {/* Thông tin nội dung */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-md border px-1.5 py-0.2 text-[9.5px] font-bold uppercase tracking-wider ${theme.badgeBg}`}
                            >
                              {item.category}
                            </span>
                            {item.priority === "Khẩn" && (
                              <span className="rounded-md border border-rose-200 bg-rose-100 px-1.5 py-0.2 text-[9.5px] font-bold uppercase text-rose-700">
                                Khẩn
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-slate-400">
                              {item.timeAgo}
                            </span>
                            {item.isUnread && (
                              <span
                                className="h-2 w-2 rounded-full bg-blue-600 ring-2 ring-blue-100"
                                title="Chưa đọc"
                              />
                            )}
                          </div>
                        </div>

                        <h4
                          className={`mt-1.5 text-xs line-clamp-1 ${
                            item.isUnread
                              ? "font-bold text-slate-900"
                              : "font-semibold text-slate-700"
                          }`}
                        >
                          {item.title}
                        </h4>

                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                          {item.description}
                        </p>

                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="truncate">
                            Từ: <strong className="font-semibold text-slate-600">{item.senderName}</strong>
                          </span>
                          <span className="flex items-center gap-0.5 font-medium text-slate-400">
                            Xem chi tiết <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Cột phải: Khung xem chi tiết thông báo */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 min-h-[460px] flex flex-col justify-between">
              {selected ? (
                <article className="space-y-4">
                  {/* Header chi tiết */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            getCategoryTheme(selected.category).badgeBg
                          }`}
                        >
                          {selected.category}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] ${getPriorityBadgeClass(
                            selected.priority,
                          )}`}
                        >
                          Mức độ: {selected.priority}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-slate-900 leading-snug">
                        {selected.title}
                      </h2>
                    </div>

                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white shadow-2xs ${
                        getCategoryTheme(selected.category).text
                      } ${getCategoryTheme(selected.category).border}`}
                    >
                      {iconForCategory(selected.category)}
                    </span>
                  </div>

                  {/* Metadata người gửi & thời gian */}
                  <div className="rounded-lg border border-slate-200/80 bg-white p-3 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Người gửi:</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                        {selected.senderName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Vai trò / Kênh:</span>
                      <span className="font-medium text-slate-700">
                        {selected.senderRole || selected.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Thời gian gửi:</span>
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {selected.dateStr}
                      </span>
                    </div>
                  </div>

                  {/* Nội dung thông báo đầy đủ */}
                  <div className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Nội dung thông báo
                    </h4>
                    <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-slate-700 font-normal">
                      {selected.fullContent}
                    </p>
                  </div>

                  {/* Hành động liên quan */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      {selected.isUnread ? (
                        <button
                          type="button"
                          onClick={() => void markRead(selected)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                        >
                          <CheckCheck className="h-3.5 w-3.5 text-blue-600" />
                          Đánh dấu đã đọc
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          <CheckCheck className="h-3.5 w-3.5" />
                          Đã đọc
                        </span>
                      )}
                    </div>

                    {selected.relatedTab && onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate(selected.relatedTab)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#026aa7] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#025a8e] cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Mở nội dung liên quan</span>
                      </button>
                    )}
                  </div>
                </article>
              ) : (
                <div className="my-auto py-20 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 shadow-2xs">
                    <MessageSquare className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-700">
                    Chưa chọn thông báo nào
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400 max-w-[240px] mx-auto">
                    Chọn một thông báo ở danh sách bên trái để xem nội dung chi tiết.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { NotificationsView as StudentNotificationsView };
