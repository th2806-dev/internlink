import { useState, useMemo } from "react";
import {
  Bell,
  Send,
  Calendar,
  Clock,
  FileText,
  Paperclip,
  Users,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Search,
  Trash2,
  Copy,
  RefreshCw,
  Download,
  X,
  FileCheck,
  GraduationCap,
  Building2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { KpiCard, KpiGrid } from "../../../components/common/KpiCard";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
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


const QUICK_TEMPLATES = [
  {
    label: "Nhắc hạn nộp báo cáo tuần",
    type: "Học tập",
    priority: "urgent" as const,
    audience: "student" as const,
    title: "Khẩn: Nhắc nhở thời hạn nộp Báo cáo Thực tập tuần này",
    content:
      "Yêu cầu tất cả sinh viên hoàn tất việc viết nhật ký công việc và nộp báo cáo tuần lên hệ thống InternLink trước 23:59 Chủ Nhật. Các trường hợp nộp trễ sẽ bị trừ điểm chuyên cần theo quy định.",
  },
  {
    label: "Lịch họp Hội đồng khoa",
    type: "Lịch trình",
    priority: "high" as const,
    audience: "lecturer" as const,
    title: "Thông báo Lịch họp Hội đồng Đánh giá Thực tập",
    content:
      "Kính mời Quý Thầy/Cô Giảng viên hướng dẫn tham dự buổi họp tổng kết đánh giá tiến độ thực tập tại Phòng họp B1 vào lúc 09:00 Thứ Sáu tuần này. Đề nghị Quý Thầy/Cô mang theo bảng tổng hợp điểm đánh giá sơ bộ.",
  },
  {
    label: "Mở đợt đăng ký doanh nghiệp",
    type: "Học tập",
    priority: "medium" as const,
    audience: "student" as const,
    title: "Thông báo Mở cổng đăng ký nguyện vọng Doanh nghiệp thực tập",
    content:
      "Hệ thống đã chính thức mở cổng tiếp nhận đăng ký nguyện vọng thực tập tại các Doanh nghiệp đối tác của Nhà trường. Sinh viên truy cập mục Doanh nghiệp để lựa chọn vị trí và nộp CV ứng tuyển.",
  },
  {
    label: "Bảo trì nâng cấp hệ thống",
    type: "Hệ thống",
    priority: "medium" as const,
    audience: "all" as const,
    title: "Thông báo Lịch bảo trì định kỳ Cổng InternLink",
    content:
      "Hệ thống sẽ tạm thời bảo trì để nâng cấp tính năng và bảo mật từ 23:00 đến 02:00 sáng. Trong thời gian này các dịch vụ có thể gián đoạn. Kính mong Quý Thầy/Cô và các bạn sinh viên thông cảm.",
  },
];

import type { ToastType } from "../../../contexts/ToastContext";
export const NotificationsView = ({
  onShowToast,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
  onNavigateTab?: (tab: string) => void;
}) => {
  const { selectedSemesterId } = useSemester();
  const { stats: navStats } = useAdminNavStats(true, selectedSemesterId);
  const { canMutateOps, isSuperAdmin } = useAdminCapabilities();
  const {
    notifications,
    loading: isLoading,
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
  const [attachment, setAttachment] = useState<{ name: string; size: string } | null>(null);

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

  const audienceLabel = useMemo(() => {
    switch (audience) {
      case "all":
        return "Toàn bộ hệ thống";
      case "lecturer":
        return "Giảng viên";
      case "student":
        return "Sinh viên";
    }
  }, [audience]);

  // Quick template filler
  const handleApplyTemplate = (tmpl: (typeof QUICK_TEMPLATES)[0]) => {
    setTitle(tmpl.title);
    setContent(tmpl.content);
    setType(tmpl.type);
    setPriority(tmpl.priority);
    setAudience(tmpl.audience);
    onShowToast(`Đã áp dụng mẫu: "${tmpl.label}"`);
  };

  const handleResetForm = () => {
    setTitle("");
    setContent("");
    setType("Học tập");
    setPriority("medium");
    setAudience("all");
    setAttachment(null);
  };

  const handleAddAttachment = () => {
    setAttachment({
      name: "Thong_Bao_InternLink_Kem_Theo.pdf",
      size: "1.5 MB",
    });
    onShowToast("Đã đính kèm tệp văn bản thành công.");
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

  // KPI Metrics
  const totalCount = notifications.length;
  const allSystemCount = notifications.filter((n) => n.audienceType === "all").length;
  const studentCount = notifications.filter((n) => n.audienceType === "student").length;
  const lecturerCount = notifications.filter((n) => n.audienceType === "lecturer").length;

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
        return "bg-blue-100 text-blue-800 border-blue-200";
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
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "lecturer":
        return "bg-sky-50 text-sky-800 border-sky-200";
      case "all":
      default:
        return "bg-blue-50 text-blue-800 border-blue-200";
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto min-w-0 font-sans pb-12 animate-in fade-in">
      {/* 1. PAGE HEADER */}
      <PageHeader
        icon={Bell}
        title="Quản lý Thông báo (Notification Center)"
        subtitle="Soạn thảo, phát hành và quản lý lịch sử thông báo gửi tới Sinh viên, Giảng viên và Toàn hệ thống."
        actions={[
          {
            label: "Xuất file CSV",
            icon: Download,
            onClick: handleExportCsv,
            variant: "secondary",
          },
        ]}
      >
        <button
          type="button"
          onClick={() => void loadCampaigns()}
          disabled={isLoading}
          className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md transition-colors disabled:opacity-50"
          title="Tải lại dữ liệu"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </PageHeader>

      {isSuperAdmin && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>
            <strong>Chế độ chỉ xem nghiệp vụ khoa:</strong> Bạn đang đăng nhập tài khoản Super Admin. Thao tác soạn thảo, phát hành và xóa thông báo gửi sinh viên/giảng viên thuộc thẩm quyền nghiệp vụ của Admin khoa. Bạn có thể tra cứu lịch sử, xem chi tiết thông báo và xuất báo cáo CSV.
          </span>
        </div>
      )}

      {/* 2. KPI METRICS (Clean & Meaningful) */}
      <KpiGrid>
        <KpiCard
          tone="blue"
          title="Tổng thông báo"
          value={totalCount}
          unit="thông báo"
          icon={Bell}
          footer="Đã phát hành trong hệ thống"
        />
        <KpiCard
          tone="sky"
          title="Toàn hệ thống"
          value={allSystemCount}
          unit="tin chung"
          icon={Users}
          footer="Gửi tới cả GV & SV"
        />
        <KpiCard
          tone="emerald"
          title="Gửi Sinh viên"
          value={studentCount}
          unit="thông báo"
          icon={GraduationCap}
          footer="Nhắc nộp báo cáo & thực tập"
        />
        <KpiCard
          tone="amber"
          title="Gửi Giảng viên"
          value={lecturerCount}
          unit="thông báo"
          icon={Building2}
          footer="Lịch họp & phân công hướng dẫn"
        />
      </KpiGrid>

      {/* 3. COMPOSE SECTION */}
      {canMutateOps && (
        <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
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
            <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold rounded-md">
              {calculatedRecipientCount.toLocaleString("vi-VN")} người
            </span>
          </div>
        </div>

        {/* Quick Templates Bar */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Mẫu thông báo nhanh:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium text-xs rounded-md border border-slate-200/80 transition-colors"
              >
                {tmpl.label}
              </button>
            ))}
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
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500 font-medium text-slate-900"
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
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-800"
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
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500 font-medium text-slate-800"
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
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500 font-medium text-slate-800"
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
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500 font-medium text-slate-900 leading-relaxed resize-y"
            />
          </div>

          {/* Attachment & Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddAttachment}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md border border-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                <span>Đính kèm tệp</span>
              </button>

              {attachment && (
                <div className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md flex items-center gap-1.5 font-medium">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="truncate max-w-[200px]">{attachment.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="text-emerald-600 hover:text-emerald-900"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

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
                    : "bg-blue-600 hover:bg-blue-700"
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
      </div>
      )}

      {/* 4. NOTIFICATIONS HISTORY LIST */}
      <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
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
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500 font-medium"
            />
          </div>

          {/* Filter Audience */}
          <select
            value={audienceFilter}
            onChange={(e) => {
              setAudienceFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="p-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500 font-medium text-slate-800"
          >
            <option value="all">Tất cả Đối tượng nhận</option>
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
            className="p-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500 font-medium text-slate-800"
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
        <div className="overflow-x-auto border border-slate-200 rounded-md">
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
              {paginatedNotifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    Không tìm thấy thông báo nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedNotifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-slate-400 font-bold">
                            {notif.id}
                          </span>
                          {notif.attachmentName && (
                            <span title={`Đính kèm: ${notif.attachmentName}`}>
                              <Paperclip className="w-3 h-3 text-blue-500 shrink-0" />
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
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canMutateOps && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDuplicate(notif)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
      </div>

      {/* DETAIL MODAL */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden space-y-4 p-6 animate-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-mono font-bold rounded-md border border-blue-200">
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
                  <span className="font-bold text-blue-700">
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
                  <button
                    type="button"
                    onClick={() =>
                      onShowToast(`Đang tải tệp đính kèm: ${selectedNotif.attachmentName}...`)
                    }
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md"
                  >
                    Tải về
                  </button>
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
