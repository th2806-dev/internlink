import { useState, useMemo } from "react";
import {
  Bell,
  Send,
  FileText,
  Paperclip,
  Eye,
  Search,
  Trash2,
  Copy,
  RefreshCw,
  Download,
  X,
  RotateCcw,
} from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import { Toolbar } from "../../../components/common/Toolbar";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { EmptyState } from "../../../components/common/EmptyState";
import { RequestErrorState } from "../../../components/common/RequestErrorState";
import { TableSkeleton } from "../../../components/common/SkeletonLoader";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { exportNotificationsHistoryCsv } from "../../../lib/adminNotificationsExport";
import { useAdminNavStats } from "../../../hooks/useAdminNavStats";
import { useSemester } from "../../../contexts/SemesterContext";
import {
  useAdminNotifications,
  type AdminNotificationItem,
} from "../../../hooks/useAdminNotifications";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";

type NotificationItem = AdminNotificationItem;

import type { ToastType } from "../../../contexts/ToastContext";
export const NotificationsView = ({
  onShowToast,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
  onNavigateTab?: (tab: string) => void;
}) => {
  const { selectedSemesterId, selectedDepartmentId } = useSemester();
  const { stats: navStats } = useAdminNavStats(true, selectedSemesterId, selectedDepartmentId);
  const { canMutateOps } = useAdminCapabilities();
  const {
    notifications,
    loading: isLoading,
    error,
    refetch: loadCampaigns,
    broadcast,
    deleteCampaign,
  } = useAdminNotifications();

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("Học tập");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [audience, setAudience] = useState<"all" | "student" | "lecturer">("all");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal / Detail State
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotificationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recipient calculation
  const calculatedRecipientCount = useMemo(() => {
    if (navStats) {
      switch (audience) {
        case "all":
          return (navStats.studentCount ?? 0) + (navStats.lecturerCount ?? 0);
        case "lecturer":
          return navStats.lecturerCount ?? 0;
        case "student":
          return navStats.studentCount ?? 0;
      }
    }
    return 0;
  }, [audience, navStats]);

  const handleResetForm = () => {
    setTitle("");
    setContent("");
    setType("Học tập");
    setPriority("medium");
    setAudience("all");
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      onShowToast("Vui lòng nhập đầy đủ Tiêu đề và Nội dung thông báo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await broadcast({
        title: title.trim(),
        content: content.trim(),
        audience,
      });
      onShowToast(`Đã phát hành thông báo thành công tới ${result.recipientCount} người nhận!`);
      handleResetForm();
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotification = (notif: NotificationItem) => {
    setDeleteTarget(notif);
  };

  const confirmDeleteNotification = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteCampaign({
        title: deleteTarget.title,
        content: deleteTarget.content,
        sentAt: deleteTarget.campaignSentAt ?? deleteTarget.sentAt,
      });
      onShowToast("Đã xóa thông báo thành công.");
      setDeleteTarget(null);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = (notif: NotificationItem) => {
    setTitle(`[Sao chép] ${notif.title}`);
    setContent(notif.content);
    setType(notif.type);
    setPriority(notif.priority);
    setAudience(notif.audienceType);
    onShowToast("Đã sao chép nội dung vào khung soạn thảo phía trên.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExportCsv = () => {
    if (notifications.length === 0) {
      onShowToast("Không có dữ liệu thông báo để xuất file.");
      return;
    }
    exportNotificationsHistoryCsv(
      notifications.map((n) => ({
        title: n.title,
        content: n.content,
        audienceLabel: n.audienceLabel,
        recipientCount: n.recipientCount,
        readCount: 0,
        sentAt: n.sentAt,
        status: "Đã gửi",
      })),
    );
    onShowToast(`Đã xuất ${notifications.length} thông báo ra file CSV thành công.`);
  };

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchAudience =
        audienceFilter === "all" || item.audienceType === audienceFilter;
      const matchType = typeFilter === "all" || item.type === typeFilter;
      return matchSearch && matchAudience && matchType;
    });
  }, [notifications, searchQuery, audienceFilter, typeFilter]);

  const totalPages = Math.ceil(filteredNotifications.length / pageSize) || 1;
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredNotifications.slice(start, start + pageSize);
  }, [filteredNotifications, currentPage, pageSize]);

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "urgent":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "high":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "low":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "medium":
      default:
        return "bg-[#026aa7]/9 text-[#025a8e] border-[#026aa7]/20";
    }
  };

  const getPriorityLabel = (p: string) => {
    switch (p) {
      case "urgent":
        return "Khẩn cấp";
      case "high":
        return "Quan trọng";
      case "low":
        return "Thấp";
      case "medium":
      default:
        return "Bình thường";
    }
  };

  const getAudienceBadge = (aud: string) => {
    switch (aud) {
      case "student":
        return "bg-[#f2f8eb] text-[#3f6416] border-[#dcebc9]";
      case "lecturer":
        return "bg-sky-50 text-sky-800 border-sky-200";
      case "all":
      default:
        return "bg-[#026aa7]/5 text-[#025a8e] border-[#026aa7]/20";
    }
  };

  return (
    <div className="mx-auto min-w-0 max-w-[1300px] space-y-4 pb-12 font-sans">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#026aa7] px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <Bell className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-wide">Quản lý thông báo</h1>
              <p className="mt-0.5 text-xs text-white/80">
                Soạn, phát hành và tra cứu thông báo gửi tới sinh viên, giảng viên và toàn hệ thống
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadCampaigns()}
              disabled={isLoading}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              Làm mới
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-bold text-[#026aa7] transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Xuất file CSV
            </button>
          </div>
        </div>
      </section>

      <Toolbar
        left={
          <p className="text-xs font-medium text-slate-600">
            {isLoading ? "Đang cập nhật lịch sử thông báo…" : "Soạn và quản lý lịch sử thông báo"}
          </p>
        }
      />

      {/* 3. COMPOSE SECTION */}
      {canMutateOps && (
        <Panel className="space-y-5 rounded-xl border-slate-200/90 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#026aa7]/5 text-[#026aa7] rounded-lg">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Soạn &amp; Phát hành Thông báo Mới
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Gửi thông báo trực tiếp tới cổng thông tin và hòm thư của người nhận.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Số người nhận dự kiến:</span>
            <span className="px-2.5 py-1 bg-[#026aa7]/5 text-[#025a8e] border border-[#026aa7]/20 text-xs font-bold rounded-md">
              {calculatedRecipientCount.toLocaleString("vi-VN")} người
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Tiêu đề thông báo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Khẩn: Yêu cầu sinh viên hoàn tất nộp Báo cáo Thực tập Tuần 6..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-[#026aa7] font-medium text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Audience */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nhóm đối tượng nhận <span className="text-rose-500">*</span>
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as "all" | "student" | "lecturer")}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-[#026aa7] font-bold text-slate-800"
              >
                <option value="all">Toàn bộ hệ thống (GV &amp; SV)</option>
                <option value="student">Chỉ Sinh viên</option>
                <option value="lecturer">Chỉ Giảng viên</option>
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Loại thông báo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-[#026aa7] font-medium text-slate-800"
              >
                <option value="Học tập">Học tập &amp; Tiến độ</option>
                <option value="Lịch trình">Lịch trình &amp; Hội đồng</option>
                <option value="Quy chế">Quy chế &amp; Biểu mẫu</option>
                <option value="Hệ thống">Hệ thống &amp; Bảo trì</option>
                <option value="Khẩn cấp">Khẩn cấp</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mức độ ưu tiên
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high" | "urgent")}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-[#026aa7] font-medium text-slate-800"
              >
                <option value="low">Thấp (Thông tin)</option>
                <option value="medium">Bình thường</option>
                <option value="high">Quan trọng</option>
                <option value="urgent">Khẩn cấp (Cảnh báo đỏ)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nội dung chi tiết thông báo <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung đầy đủ của thông báo..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-[#026aa7] font-medium text-slate-900 leading-relaxed resize-y"
            />
          </div>

          {/* Attachment & Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Làm mới form</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-2 text-white font-bold rounded-md shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 ${priority === "urgent"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-[#026aa7] hover:bg-[#025a8e]"
                  }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isSubmitting ? "Đang gửi..." : "Phát hành thông báo"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </Panel>
      )}

      {/* 4. NOTIFICATIONS HISTORY LIST */}
      <Panel className="space-y-4 rounded-xl border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#026aa7]" />
              Lịch sử Thông báo Đã Phát Hành ({filteredNotifications.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Tra cứu, sao chép hoặc quản lý các thông báo đã gửi trong hệ thống.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tiêu đề, nội dung, mã..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-[#026aa7] font-medium"
            />
          </div>

          {/* Filter Audience */}
          <select
            value={audienceFilter}
            onChange={(e) => {
              setAudienceFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="p-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-[#026aa7] font-medium text-slate-800"
          >
            <option value="all">Toàn bộ hệ thống</option>
            <option value="student">Sinh viên</option>
            <option value="lecturer">Giảng viên</option>
          </select>

          {/* Filter Type */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="p-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-[#026aa7] font-medium text-slate-800"
          >
            <option value="all">Tất cả Loại thông báo</option>
            <option value="Học tập">Học tập &amp; Tiến độ</option>
            <option value="Lịch trình">Lịch trình &amp; Hội đồng</option>
            <option value="Quy chế">Quy chế &amp; Biểu mẫu</option>
            <option value="Hệ thống">Hệ thống &amp; Bảo trì</option>
            <option value="Khẩn cấp">Khẩn cấp</option>
          </select>
        </div>

        {/* Table */}
        {error && notifications.length === 0 ? (
          <RequestErrorState
            title="Không thể tải lịch sử thông báo"
            message={error.message}
            onRetry={() => void loadCampaigns()}
            retrying={isLoading}
          />
        ) : isLoading && notifications.length === 0 ? (
          <TableSkeleton rows={5} columns={7} />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={notifications.length === 0 ? "Chưa có thông báo nào" : "Không tìm thấy thông báo phù hợp"}
            description={notifications.length === 0
              ? "Thông báo đã phát hành sẽ xuất hiện tại đây."
              : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc để xem kết quả khác."}
            secondaryAction={notifications.length > 0 ? {
              label: "Xóa bộ lọc tìm kiếm",
              onClick: () => {
                setSearchQuery("");
                setAudienceFilter("all");
                setTypeFilter("all");
                setCurrentPage(1);
              },
            } : undefined}
          />
        ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200/80">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5">Tiêu đề thông báo</th>
                <th className="py-3 px-3 text-center">Đối tượng</th>
                <th className="py-3 px-3 text-center">Loại</th>
                <th className="py-3 px-3 text-center">Mức ưu tiên</th>
                <th className="py-3 px-3">Thời gian phát hành</th>
                <th className="py-3 px-3 text-center">Người nhận</th>
                <th className="py-3 px-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedNotifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-slate-400 font-bold">
                            {notif.id}
                          </span>
                          {notif.attachmentName && (
                            <span title={`Đính kèm: ${notif.attachmentName}`}>
                              <Paperclip className="w-3 h-3 text-[#026aa7] shrink-0" />
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-900 line-clamp-1 max-w-[320px]">
                          {notif.title}
                        </p>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getAudienceBadge(notif.audienceType)}`}
                      >
                        {notif.audienceLabel}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {notif.type}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getPriorityBadge(notif.priority)}`}
                      >
                        {getPriorityLabel(notif.priority)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-500 font-medium text-[11px]">
                      {notif.sentAt || notif.createdAt}
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-slate-700">
                      {notif.recipientCount.toLocaleString("vi-VN")}
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedNotif(notif)}
                          className="p-1.5 text-slate-500 hover:text-[#026aa7] hover:bg-[#025a8e]/5 rounded-md transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canMutateOps && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDuplicate(notif)}
                              className="p-1.5 text-slate-500 hover:text-[#026aa7] hover:bg-[#025a8e]/5 rounded-md transition-colors"
                              title="Sao chép nội dung để gửi lại"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNotification(notif)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Xóa thông báo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination */}
        {filteredNotifications.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3 text-slate-500 font-medium">
              <span>
                Hiển thị {paginatedNotifications.length} / {filteredNotifications.length} thông báo
              </span>
              <div className="flex items-center gap-1">
                <span>Số dòng:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none"
                >
                  <option value={5}>5 dòng</option>
                  <option value={10}>10 dòng</option>
                  <option value={20}>20 dòng</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-bold">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md disabled:opacity-40 transition-colors"
              >
                Trước
              </button>
              <span className="px-3 py-1.5 bg-slate-50 rounded-md border border-slate-200 text-slate-800">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md disabled:opacity-40 transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </Panel>

      {/* DETAIL MODAL */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden space-y-4 p-6 animate-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#026aa7]/5 text-[#025a8e] font-mono font-bold rounded-md border border-[#026aa7]/20">
                  {selectedNotif.id}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-bold border ${getAudienceBadge(selectedNotif.audienceType)}`}
                >
                  {selectedNotif.audienceLabel}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-bold border ${getPriorityBadge(selectedNotif.priority)}`}
                >
                  {getPriorityLabel(selectedNotif.priority)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {selectedNotif.title}
              </h3>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-md">
                <div>
                  <span className="text-slate-400 font-bold block">Thời gian phát hành:</span>
                  <span className="font-medium text-slate-800">
                    {selectedNotif.sentAt || selectedNotif.createdAt}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Người phát hành:</span>
                  <span className="font-medium text-slate-800">{selectedNotif.createdBy}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Loại thông báo:</span>
                  <span className="font-medium text-slate-800">{selectedNotif.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Số lượng nhận:</span>
                  <span className="font-bold text-[#026aa7]">
                    {selectedNotif.recipientCount.toLocaleString("vi-VN")} người
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 text-slate-800 leading-relaxed font-medium space-y-1.5">
                <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block">
                  Nội dung chi tiết:
                </span>
                <p className="whitespace-pre-line">{selectedNotif.content}</p>
              </div>

              {selectedNotif.attachmentName && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold text-emerald-900 block">
                        {selectedNotif.attachmentName}
                      </span>
                      {selectedNotif.attachmentSize && (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          Dung lượng: {selectedNotif.attachmentSize}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-md"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa thông báo"
        description={
          deleteTarget ? (
            <>
              Bạn có chắc chắn muốn xóa thông báo{" "}
              <strong className="text-slate-900">{deleteTarget.title}</strong> khỏi hệ thống?
              Hành động này không thể hoàn tác.
            </>
          ) : null
        }
        confirmLabel="Xóa thông báo"
        variant="danger"
        loading={isDeleting}
        onConfirm={() => void confirmDeleteNotification()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export { NotificationsView as AdminNotificationsView };
