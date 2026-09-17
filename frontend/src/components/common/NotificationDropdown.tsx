import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  CheckCheck,
  Clock,
  Trash2,
  FileText,
  Award,
  Building2,
  ShieldAlert,
  ChevronRight,
  CheckCircle2,
  Info,
  Send,
} from "lucide-react";
import type { UserRole } from "../../types/common";
import type { NotificationDto } from "../../types/api";
import { notificationService } from "../../services/notification.service";
import { adminNotificationsService } from "../../services/adminNotifications.service";
import { signalRNotificationService } from "../../services/signalr.service";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: "report" | "grade" | "enterprise" | "deadline" | "system" | "announcement";
  priority?: "urgent" | "normal" | "low";
  timestamp: string; // e.g. "5 phút trước" or ISO string
  isRead: boolean;
  targetTab?: string;
  actionUrl?: string;
  sender?: {
    name: string;
    role: string;
  };
}

interface NotificationDropdownProps {
  role: UserRole;
  backendRole?: string | null;
  onNavigate?: (tab: string) => void;
  onShowToast?: (msg: string) => void;
}

/* No mock notifications — all data fetched from database API */

const NOTIFS_READ_STORAGE_KEY = "internlink_read_notif_ids";
const NOTIFS_DELETED_STORAGE_KEY = "internlink_deleted_notif_ids";

function getReadNotifIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(NOTIFS_READ_STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveReadNotifId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getReadNotifIds();
    set.add(id);
    localStorage.setItem(NOTIFS_READ_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

function getDeletedNotifIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(NOTIFS_DELETED_STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveDeletedNotifId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getDeletedNotifIds();
    set.add(id);
    localStorage.setItem(NOTIFS_DELETED_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  role,
  backendRole,
  onNavigate,
  onShowToast,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "reports" | "system">("all");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [_isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with API and Local Storage
  const refreshNotifications = async () => {
    const readIds = getReadNotifIds();
    const deletedIds = getDeletedNotifIds();

    try {
      setIsLoading(true);
      if (role === "admin") {
        // For Admin, fetch personal notifications and broadcast campaigns
        const [mineRows, campaigns] = await Promise.all([
          notificationService.getMine().catch(() => []),
          backendRole === "SuperAdmin"
            ? Promise.resolve([])
            : adminNotificationsService.getCampaigns(20).catch(() => []),
        ]);

        const personalNotifs: AppNotification[] = (mineRows || []).map((dto) => {
          const text = `${dto.title} ${dto.content}`.toLowerCase();
          let category: AppNotification["category"] = "system";
          if (text.includes("doanh nghiệp") || text.includes("công ty") || text.includes("đối tác")) category = "enterprise";
          else if (text.includes("báo cáo") || text.includes("nộp")) category = "report";
          else if (text.includes("deadline") || text.includes("hạn") || text.includes("kỳ")) category = "deadline";

          let targetTab = dto.link ?? "admin-notifications";
          if (text.includes("giảng viên")) targetTab = "admin-lecturers";
          else if (text.includes("sinh viên")) targetTab = "admin-students";
          else if (text.includes("tài khoản") || text.includes("mật khẩu")) targetTab = "admin-users";
          else if (text.includes("cài đặt") || text.includes("cấu hình")) targetTab = "admin-settings";
          else if (text.includes("doanh nghiệp")) targetTab = "admin-companies";

          return {
            id: dto.id,
            title: dto.title,
            message: dto.content,
            category,
            priority: text.includes("khẩn") || text.includes("gấp") ? "urgent" : "normal",
            timestamp: dto.createdAt
              ? new Date(dto.createdAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }) + " " + new Date(dto.createdAt).toLocaleDateString("vi-VN")
              : "Vừa xong",
            isRead: dto.isRead || readIds.has(dto.id),
            targetTab,
            sender: { name: dto.senderName ?? "InternLink Admin", role: "Hệ thống" },
          };
        });

        // Also check cached campaigns from localStorage
        let activeCampaigns = campaigns;
        if ((!activeCampaigns || activeCampaigns.length === 0) && typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("internlink_admin_campaigns_cache");
            if (raw) activeCampaigns = JSON.parse(raw);
          } catch {}
        }

        const campaignNotifs: AppNotification[] = (activeCampaigns || []).map((c: any) => {
          // Stable key: backend id (preferred) or, for legacy cached rows without an id,
          // a content-derived key — never Date.now(), which would change every fetch.
          const key = c.id
            ? `campaign-${c.id}`
            : `campaign-${(c.title || "")}-${(c.sentAt || "")}`;
          const audienceLabel =
            c.audience === "student"
              ? "Sinh viên"
              : c.audience === "lecturer"
                ? "Giảng viên"
                : c.audience === "all"
                  ? "Toàn trường"
                  : c.audienceLabel || "Toàn trường";
          return {
            id: key,
            title: `[Chiến dịch] ${c.title}`,
            message: `Gửi đến: ${audienceLabel} (${c.recipientCount || "Toàn bộ"} người nhận) - ${c.content}`,
            category: "announcement",
            priority: (c.priority === "urgent" || c.priority === "high") ? "urgent" : "normal",
            timestamp: c.sentAt
              ? new Date(c.sentAt).toLocaleString("vi-VN")
              : "Vừa xong",
            isRead: readIds.has(key),
            targetTab: "admin-notifications",
            sender: { name: "Ban Quản trị", role: "Chiến dịch" },
          };
        });

        const combinedMap = new Map<string, AppNotification>();
        campaignNotifs.forEach((item) => combinedMap.set(item.id, item));
        personalNotifs.forEach((item) => combinedMap.set(item.id, item));

        const list = Array.from(combinedMap.values()).filter((n) => !deletedIds.has(n.id));
        setNotifications(list);
      } else {
        // For Student & Lecturer
        const rows: NotificationDto[] = await notificationService
          .getMine()
          .catch(() => []);
        if (rows && rows.length > 0) {
          const mapped: AppNotification[] = rows.map((dto) => {
            const text = `${dto.title} ${dto.content}`.toLowerCase();
            let category: AppNotification["category"] = "system";
            if (text.includes("báo cáo") || text.includes("nộp") || text.includes("phản hồi")) category = "report";
            else if (text.includes("điểm") || text.includes("đánh giá") || text.includes("rubric")) category = "grade";
            else if (text.includes("doanh nghiệp") || text.includes("công ty") || text.includes("đối tác") || text.includes("vng") || text.includes("fpt")) category = "enterprise";
            else if (text.includes("deadline") || text.includes("hạn") || text.includes("khóa")) category = "deadline";
            else if (text.includes("thông báo") || text.includes("khoa") || text.includes("lịch")) category = "announcement";

            let sender = { name: dto.senderName ?? "InternLink", role: "Hệ thống" };
            if (text.includes("giảng viên") || text.includes("gvhd")) {
              sender = { name: dto.senderName ?? "Giảng viên hướng dẫn", role: "GVHD" };
            } else if (text.includes("doanh nghiệp") || text.includes("mentor")) {
              sender = { name: dto.senderName ?? "Doanh nghiệp thực tập", role: "Doanh nghiệp" };
            } else if (text.includes("khoa") || text.includes("đào tạo")) {
              sender = { name: dto.senderName ?? "Khoa CNTT", role: "Quản trị khoa" };
            }

            return {
              id: dto.id,
              title: dto.title,
              message: dto.content,
              category,
              priority: text.includes("khẩn") || text.includes("gấp") ? "urgent" : "normal",
              timestamp: dto.createdAt
                ? new Date(dto.createdAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }) + " " + new Date(dto.createdAt).toLocaleDateString("vi-VN")
                : "Vừa xong",
              isRead: dto.isRead || readIds.has(dto.id),
              targetTab: dto.link ?? undefined,
              sender,
            };
          });
          setNotifications(mapped.filter((n) => !deletedIds.has(n.id)));
        } else {
          setNotifications([]);
        }
      }
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshNotifications();

    const handleUpdateEvent = () => {
      void refreshNotifications();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("internlink_notification_updated", handleUpdateEvent);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("internlink_notification_updated", handleUpdateEvent);
      }
    };
  }, [role]);

  // Real-time SignalR Notification Listener
  useEffect(() => {
    signalRNotificationService.start();

    const unsubscribeNotif = signalRNotificationService.onNotification((incoming) => {
      const newNotif: AppNotification = {
        id: incoming.id || `notif-rt-${Date.now()}`,
        title: incoming.title,
        message: incoming.content,
        category: role === "admin" ? "system" : "report",
        priority: "urgent",
        timestamp: "Vừa xong",
        isRead: false,
        targetTab: incoming.link || (role === "admin" ? "admin-notifications" : undefined),
        sender: { name: "Hệ thống (Live)", role: "Realtime Hub" },
      };

      setNotifications((prev) => [newNotif, ...prev]);

      if (onShowToast) {
        onShowToast(`🔔 ${incoming.title}: ${incoming.content}`);
      }
    });

    const unsubscribeReportStatus = signalRNotificationService.onReportStatusChanged(
      (reportId, status, message) => {
        const newNotif: AppNotification = {
          id: `notif-rep-${reportId}-${Date.now()}`,
          title: `Cập nhật báo cáo: ${status}`,
          message: message || `Báo cáo tuần của bạn đã được chuyển sang trạng thái ${status}`,
          category: "report",
          priority: "urgent",
          timestamp: "Vừa xong",
          isRead: false,
          targetTab: "student-weekly-reports",
          sender: { name: "Giảng viên hướng dẫn", role: "GVHD" },
        };
        setNotifications((prev) => [newNotif, ...prev]);
        if (onShowToast) {
          onShowToast(`📑 Báo cáo đã cập nhật: ${status}`);
        }
      }
    );

    return () => {
      unsubscribeNotif();
      unsubscribeReportStatus();
    };
  }, [onShowToast, role]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === "unread") return !item.isRead;
    if (role === "admin") {
      if (activeFilter === "reports") return item.category === "enterprise" || item.category === "announcement";
      if (activeFilter === "system") return item.category === "system" || item.category === "deadline";
    } else {
      if (activeFilter === "reports") return item.category === "report" || item.category === "grade";
      if (activeFilter === "system") return item.category === "system" || item.category === "deadline" || item.category === "enterprise";
    }
    return true;
  });

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    saveReadNotifId(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (!id.startsWith("campaign-")) {
      try {
        await notificationService.markRead(id);
      } catch {}
    }
  };

  const handleMarkAllAsRead = async () => {
    notifications.forEach((n) => saveReadNotifId(n.id));
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    onShowToast?.("Đã đánh dấu tất cả thông báo là đã đọc!");

    try {
      await notificationService.markAllRead();
    } catch {}

  };

  const handleDeleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveDeletedNotifId(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    onShowToast?.("Đã xóa thông báo khỏi danh sách.");
  };

  const handleNotificationClick = (item: AppNotification) => {
    handleMarkAsRead(item.id);
    setIsOpen(false);

    if (item.targetTab && onNavigate) {
      onNavigate(item.targetTab);
    }
  };

  const getCategoryIcon = (category: AppNotification["category"]) => {
    switch (category) {
      case "report":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "grade":
        return <Award className="w-4 h-4 text-amber-600" />;
      case "enterprise":
        return <Building2 className="w-4 h-4 text-emerald-600" />;
      case "deadline":
        return <Clock className="w-4 h-4 text-rose-600" />;
      case "announcement":
        return <Send className="w-4 h-4 text-indigo-600" />;
      case "system":
        return <ShieldAlert className="w-4 h-4 text-purple-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        title="Trung tâm thông báo"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 transition-transform active:scale-90" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[340px] sm:w-[420px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-xs tracking-tight">
                  {role === "admin" ? "Thông báo Quản trị & Hệ thống" : "Trung tâm Thông báo"}
                </h4>
                <p className="text-[10px] text-slate-300">
                  {unreadCount > 0
                    ? `Bạn có ${unreadCount} thông báo chưa đọc`
                    : "Đã cập nhật toàn bộ thông báo"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="px-2 py-1 text-[11px] font-semibold text-blue-300 hover:text-white hover:bg-white/10 rounded transition-colors flex items-center gap-1 cursor-pointer"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Đã đọc hết</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-2.5 py-1 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("unread")}
              className={`px-2.5 py-1 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === "unread"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("reports")}
              className={`px-2.5 py-1 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === "reports"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              {role === "admin" ? "Chiến dịch & Đối tác" : "Báo cáo & Điểm"}
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("system")}
              className={`px-2.5 py-1 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === "system"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              {role === "admin" ? "Bảo mật & Cấu hình" : "Hạn chót & Hệ thống"}
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  Không có thông báo nào trong mục này
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Mọi cập nhật và tin tức mới nhất sẽ tự động xuất hiện tại đây.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`group relative p-3 rounded-lg transition-all cursor-pointer flex items-start gap-3 ${
                    !item.isRead
                      ? "bg-blue-50/50 hover:bg-blue-50 border-l-4 border-l-blue-600"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {/* Category Icon */}
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h5
                        className={`text-xs leading-snug line-clamp-1 ${
                          !item.isRead
                            ? "font-bold text-slate-900"
                            : "font-medium text-slate-800"
                        }`}
                      >
                        {item.title}
                      </h5>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        {item.sender?.name || "Hệ thống"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {item.timestamp}
                      </span>
                    </div>
                  </div>

                  {/* Actions on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteNotification(item.id, e)}
                      className="p-1 hover:bg-rose-100 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Xóa thông báo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">
              Tự động cập nhật thời gian thực
            </span>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onNavigate) {
                  if (role === "student") onNavigate("student-notifications");
                  else if (role === "lecturer") onNavigate("notifications");
                  else onNavigate("admin-notifications");
                }
              }}
              className="font-bold text-[11px] text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
