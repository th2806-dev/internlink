import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Send,
  Upload,
  History,
  FileText,
  Search,
  Download,
  FileArchive,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  FileCode,
  Presentation,
  Loader2,
} from "lucide-react";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { Toolbar } from "../../../components/common/Toolbar";
import { EmptyState } from "../../../components/common/EmptyState";
import { TableSkeleton } from "../../../components/common/SkeletonLoader";
import { getApiErrorMessage } from "../../../lib/apiClient";
import {
  mapFeedbackDtoToStudentUi,
  mapWeeklyReportFeedbackToStudentUi,
  type StudentFeedbackUiItem,
} from "../../../lib/portalMappers";
import { submissionApiService } from "../../../services/submissionApi.service";
import { weeklyReportService } from "../../../services/weeklyReport.service";

const WORKFLOW_STEPS = [
  "Nộp bài",
  "Chờ duyệt",
  "Phản hồi",
  "Chỉnh sửa",
  "Hoàn thành",
];

export const FeedbackView = ({
  onShowToast,
  onNavigateToWeeklyReports,
}: {
  onShowToast?: (msg: string) => void;
  onNavigateToWeeklyReports?: () => void;
}) => {
  const { profile } = useStudentPortal();
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  // Feedback của sinh viên thường ít → 5/10/20 dòng/trang.
  const [pageSize, setPageSize] = useState(5);
  const [feedbacks, setFeedbacks] = useState<StudentFeedbackUiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(
    null,
  );
  const [replyText, setReplyText] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadVersion, setUploadVersion] = useState("v1.2");
  const [uploadDescription, setUploadDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadFeedbacks = useCallback(async () => {
    setIsLoading(true);
    try {
      const [submissions, reports] = await Promise.all([
        submissionApiService.getMine(),
        weeklyReportService.getMine(),
      ]);

      const fromSubmissions = submissions
        .map((sub) => {
          const threadFeedbacks = (sub.feedbacks ?? []).filter((f) => f.isPublic);
          const latestFeedback = [...threadFeedbacks].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )[0];
          return latestFeedback
            ? mapFeedbackDtoToStudentUi(latestFeedback, sub, threadFeedbacks)
            : null;
        })
        .filter((item): item is StudentFeedbackUiItem => item !== null);

      const fromReports = reports
        .filter((r) => r.lecturerComment?.trim() || (r.feedbacks?.length ?? 0) > 0)
        .map((r) =>
          mapWeeklyReportFeedbackToStudentUi(r, profile.lecturerName),
        );

      const items = [...fromSubmissions, ...fromReports].sort(
        (a, b) =>
          new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime(),
      );

      setFeedbacks(items);
      setSelectedFeedbackId((prev) => {
        if (prev && items.some((i) => i.id === prev)) return prev;
        return items[0]?.id ?? null;
      });
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast, profile.lecturerName]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  const selectedFeedback =
    feedbacks.find((f) => f.id === selectedFeedbackId) ?? null;

  const filteredFeedbacks = feedbacks.filter((fb) => {
    const matchSearch =
      fb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fb.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fb.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (activeTab === "Unread") return fb.status === "Chưa xem";
    if (activeTab === "Need Revision") return fb.status === "Cần chỉnh sửa";
    if (activeTab === "Completed") return fb.status === "Đã hoàn thành";
    return true;
  });

  const totalPages = Math.ceil(filteredFeedbacks.length / pageSize) || 1;
  const paginatedFeedbacks = filteredFeedbacks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleMarkAsRead = async (id: string) => {
    const item = feedbacks.find((feedback) => feedback.id === id);
    if (!item) return;
    try {
      if (item.submissionId) await submissionApiService.markFeedbacksRead(item.submissionId);
      if (item.reportId) await weeklyReportService.markFeedbacksRead(item.reportId);
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err));
      return;
    }
    setFeedbacks((prev) =>
      prev.map((f) =>
        f.id === id && f.status === "Chưa xem"
          ? { ...f, status: "Đã xem" }
          : f,
      ),
    );
    onShowToast?.("Đã đánh dấu là Đã xem!");
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    if (!replyText.trim()) {
      onShowToast?.("Vui lòng nhập nội dung trả lời!");
      return;
    }
    try {
      if (selectedFeedback.submissionId) {
        await submissionApiService.studentReply(selectedFeedback.submissionId, replyText.trim());
      } else if (selectedFeedback.reportId) {
        await weeklyReportService.studentReply(selectedFeedback.reportId, replyText.trim());
      } else {
        throw new Error("Feedback target is missing");
      }
      await loadFeedbacks();
      setReplyText("");
      onShowToast?.("Đã gửi tin nhắn phản hồi tới giảng viên!");
    } catch {
      onShowToast?.("Lỗi khi gửi phản hồi");
    }
  };

  const handleUploadRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;

    if (selectedFeedback.sourceType === "weeklyReport") {
      onShowToast?.(
        "Vui lòng nộp bản sửa báo cáo tuần tại trang Báo cáo tuần.",
      );
      setShowUploadModal(false);
      onNavigateToWeeklyReports?.();
      return;
    }

    if (!selectedFeedback.submissionId) {
      onShowToast?.("Không tìm thấy bài nộp liên quan.");
      return;
    }
    if (!selectedFile) {
      onShowToast?.("Vui lòng chọn tệp đính kèm!");
      return;
    }

    setIsSubmitting(true);
    try {
      await submissionApiService.resubmitUpload(
        selectedFeedback.submissionId,
        {
          title: uploadVersion
            ? `${selectedFeedback.title} ${uploadVersion}`
            : selectedFeedback.title,
          description: uploadDescription,
          file: selectedFile,
        },
      );
      await loadFeedbacks();
      onShowToast?.(
        `Đã tải lên tệp chỉnh sửa ${uploadVersion || "mới"} thành công!`,
      );
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadDescription("");
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenUploadModal = () => {
    if (!selectedFeedback) {
      onShowToast?.("Vui lòng chọn một phản hồi trước khi nộp bản sửa.");
      return;
    }
    if (selectedFeedback.sourceType === "weeklyReport") {
      onNavigateToWeeklyReports?.();
      return;
    }
    setShowUploadModal(true);
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "Khẩn":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "Cao":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "Chưa xem":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Đã xem":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "Cần chỉnh sửa":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "Đã hoàn thành":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-4 h-4 text-rose-600" />;
      case "docx":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "pptx":
        return <Presentation className="w-4 h-4 text-amber-600" />;
      case "zip":
        return <FileArchive className="w-4 h-4 text-amber-600" />;
      case "image":
        return <ImageIcon className="w-4 h-4 text-blue-600" />;
      default:
        return <FileCode className="w-4 h-4 text-slate-600" />;
    }
  };

  const unreadCount = feedbacks.filter((f) => f.status === "Chưa xem").length;
  const needRevisionCount = feedbacks.filter(
    (f) => f.status === "Cần chỉnh sửa",
  ).length;

  return (
    <div className="space-y-5 animate-in fade-in duration-200 max-w-7xl mx-auto">
      <PageHeader
        icon={MessageSquare}
        title="Phản hồi & Chỉnh sửa"
        subtitle="Theo dõi ý kiến đánh giá từ Giảng viên hướng dẫn và nộp bản chỉnh sửa bổ sung."
        badge={`${feedbacks.length} phản hồi`}
        badgeColor="bg-blue-100 text-blue-800 border-blue-200"
        actions={[
          {
            label: "Nộp bản chỉnh sửa",
            icon: Upload,
            onClick: handleOpenUploadModal,
            variant: "primary",
          },
        ]}
      >
        {unreadCount > 0 && (
          <span className="px-2 py-0.5 font-semibold text-[10px] rounded-md border bg-amber-100 text-amber-800 border-amber-200">
            {unreadCount} chưa đọc
          </span>
        )}
        {needRevisionCount > 0 && (
          <span className="px-2 py-0.5 font-semibold text-[10px] rounded-md border bg-rose-100 text-rose-800 border-rose-200">
            {needRevisionCount} cần chỉnh sửa
          </span>
        )}
      </PageHeader>

      <Toolbar
        left={
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            <span>
              Tổng{" "}
              <span className="text-slate-900 font-bold">{feedbacks.length}</span>
            </span>
            {unreadCount > 0 && (
              <span className="text-amber-800 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                {unreadCount} chưa đọc
              </span>
            )}
            {needRevisionCount > 0 && (
              <span className="text-rose-800 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                {needRevisionCount} cần chỉnh sửa
              </span>
            )}
          </div>
        }
        right={
          <button
            type="button"
            onClick={handleOpenUploadModal}
            disabled={!selectedFeedback || isLoading}
            className="il-btn il-btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" /> Nộp bản chỉnh sửa
          </button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : feedbacks.length === 0 ? (
        <Panel className="p-4">
          <EmptyState
            title="Chưa có phản hồi hoặc nhận xét nào"
            description="Khi Giảng viên hướng dẫn nhận xét báo cáo tuần hoặc sản phẩm nộp của bạn, phản hồi chi tiết sẽ hiển thị tại đây."
            action={
              onNavigateToWeeklyReports
                ? { label: "Đi tới Báo cáo tuần", onClick: onNavigateToWeeklyReports }
                : undefined
            }
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Panel className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" /> Danh
                    sách góp ý & nhận xét
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-40 sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm góp ý/giảng viên..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-md text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
                {[
                  { key: "All", label: "Tất cả" },
                  { key: "Unread", label: "Chưa đọc" },
                  { key: "Need Revision", label: "Cần chỉnh sửa" },
                  { key: "Completed", label: "Đã hoàn thành" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-md overflow-hidden">
                {filteredFeedbacks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 font-medium">
                    Không tìm thấy phản hồi nào phù hợp với bộ lọc hiện tại.
                  </div>
                ) : (
                  paginatedFeedbacks.map((fb) => {
                    const isSelected = fb.id === selectedFeedbackId;
                    return (
                      <div
                        key={fb.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedFeedbackId(fb.id);
                          if (fb.status === "Chưa xem") handleMarkAsRead(fb.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setSelectedFeedbackId(fb.id);
                            if (fb.status === "Chưa xem")
                              handleMarkAsRead(fb.id);
                          }
                        }}
                        className={`p-3.5 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isSelected ? "bg-blue-50/70 border-l-4 border-l-blue-600" : fb.status === "Chưa xem" ? "bg-slate-50/80 font-bold" : "hover:bg-slate-50/50"}`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <InitialsAvatar
                            name={fb.senderName}
                            seed={fb.senderName}
                            size={32}
                            className="mt-0.5"
                          />
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {fb.senderName}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-md">
                                {fb.category}
                              </span>
                            </div>
                            <p
                              className={`text-xs truncate ${isSelected ? "text-blue-900 font-bold" : "text-slate-800 font-medium"}`}
                            >
                              {fb.title}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {fb.detail}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getPriorityBadge(fb.priority)}`}
                          >
                            {fb.priority}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${getStatusBadge(fb.status)}`}
                          >
                            {fb.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500 font-medium">
                  Hiển thị {paginatedFeedbacks.length} /{" "}
                  {filteredFeedbacks.length} phản hồi
                </span>

                <label className="flex items-center gap-1.5 font-medium text-slate-600">
                  <span>Số dòng:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                    aria-label="Số phản hồi mỗi trang"
                  >
                    <option value={5}>5 dòng</option>
                    <option value={10}>10 dòng</option>
                    <option value={20}>20 dòng</option>
                  </select>
                </label>
                <div className="flex items-center gap-1.5 font-bold">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Panel>

            {selectedFeedback ? (
              <Panel className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <InitialsAvatar
                      name={selectedFeedback.senderName}
                      seed={selectedFeedback.senderName}
                      size={36}
                    />
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {selectedFeedback.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {selectedFeedback.senderName} (
                        {selectedFeedback.senderRole}) •{" "}
                        {selectedFeedback.dateStr}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleOpenUploadModal}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {selectedFeedback.sourceType === "weeklyReport"
                        ? "Sửa báo cáo tuần"
                        : "Nộp bản sửa"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Tiến trình xử lý
                  </p>
                  <div className="flex items-center gap-1">
                    {WORKFLOW_STEPS.map((step, i) => (
                      <div key={step} className="flex items-center flex-1 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            i + 1 <= selectedFeedback.currentWorkflowStep
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-400"
                          }`}
                          title={step}
                        >
                          {i + 1}
                        </div>
                        {i < WORKFLOW_STEPS.length - 1 && (
                          <div
                            className={`flex-1 h-0.5 mx-0.5 ${
                              i + 1 < selectedFeedback.currentWorkflowStep
                                ? "bg-blue-600"
                                : "bg-slate-200"
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                    {WORKFLOW_STEPS.map((step) => (
                      <span key={step} className="truncate px-0.5">
                        {step}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-md space-y-2 text-xs">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Nhận
                    xét từ Giảng viên:
                  </p>
                  <p className="text-slate-800 font-medium leading-relaxed bg-white/80 p-3 rounded-lg border border-amber-200/60">
                    &ldquo;{selectedFeedback.detail}&rdquo;
                  </p>

                  {selectedFeedback.attachments.length > 0 && (
                    <div className="pt-2 border-t border-amber-200/60 space-y-1.5">
                      <p className="text-[10px] font-bold text-amber-900 uppercase">
                        File đính kèm từ Giảng viên:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedFeedback.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="bg-white px-3 py-1.5 rounded-lg border border-amber-200/80 text-xs flex items-center gap-2"
                          >
                            {getFileTypeIcon(att.type)}
                            <span className="font-bold text-slate-800">
                              {att.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({att.size})
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onShowToast?.(`Đang tải tệp ${att.name}...`)
                              }
                              className="p-1 hover:bg-amber-50 text-amber-700 rounded transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Trao
                    đổi ({selectedFeedback.conversation.length})
                  </h4>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {selectedFeedback.conversation.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 text-xs ${msg.sender === "student" ? "flex-row-reverse" : ""}`}
                      >
                        <InitialsAvatar
                          name={msg.senderName}
                          seed={msg.sender === "student" ? profile.mssv : msg.senderName}
                          size={28}
                          className="mt-0.5"
                        />
                        <div
                          className={`space-y-1 max-w-[85%] ${msg.sender === "student" ? "items-end text-right" : ""}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-[11px]">
                              {msg.senderName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {msg.time}
                            </span>
                          </div>
                          <div
                            className={`p-3 rounded-lg leading-relaxed text-xs font-medium inline-block ${msg.sender === "student" ? "bg-blue-600 text-white rounded-tr-none" : "bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-none"}`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleSendReply}
                    className="flex gap-2 pt-2 border-t border-slate-100"
                  >
                    <input
                      type="text"
                      placeholder="Nhập nội dung phản hồi tới giảng viên..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" /> Trả lời
                    </button>
                  </form>
                </div>
              </Panel>
            ) : (
              <Panel className="py-12 text-center space-y-2">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-600">
                  Chọn một phản hồi để xem chi tiết
                </p>
              </Panel>
            )}
          </div>

          <div className="lg:col-span-1 space-y-5">
            {selectedFeedback ? (
              <Panel className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" /> Lịch sử nộp (
                  {selectedFeedback.revisions.length} bản)
                </h3>

                {selectedFeedback.revisions.length === 0 ? (
                  <p className="text-xs text-slate-500 font-medium py-4 text-center">
                    Chưa có lịch sử nộp bản cho mục này.
                  </p>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {selectedFeedback.revisions.map((rev, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50/80 rounded-md border border-slate-200/80 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-700">
                            {rev.version}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {rev.submissionTime}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 truncate">
                          {rev.fileName}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                          {rev.description}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${rev.status === "Đã duyệt" ? "bg-emerald-100 text-emerald-800" : rev.status === "Chờ duyệt" ? "bg-blue-100 text-blue-800" : "bg-rose-100 text-rose-800"}`}
                          >
                            {rev.status}
                          </span>
                          {selectedFeedback.submissionId && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await submissionApiService.download(
                                    selectedFeedback.submissionId!,
                                    rev.fileName,
                                  );
                                  onShowToast?.(
                                    `Đã tải xuống ${rev.fileName}`,
                                  );
                                } catch (err) {
                                  onShowToast?.(getApiErrorMessage(err));
                                }
                              }}
                              className="text-[10px] text-blue-600 hover:underline font-bold flex items-center gap-0.5"
                            >
                              <Download className="w-3 h-3" /> Tải về
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            ) : null}

            <Panel className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Giảng viên Hướng dẫn
              </h3>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-blue-50/60 rounded-md border border-blue-200/60 space-y-1">
                  <span className="text-[10px] font-bold text-blue-700 uppercase">
                    Phụ trách chấm bài
                  </span>
                  <p className="font-bold text-slate-900">
                    {profile.lecturerName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Liên hệ qua hệ thống hoặc email trường
                  </p>
                </div>

                {onNavigateToWeeklyReports && (
                  <button
                    type="button"
                    onClick={onNavigateToWeeklyReports}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-slate-500" /> Xem danh
                    sách Báo cáo tuần
                  </button>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {showUploadModal && selectedFeedback && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUploadRevisionSubmit}
            className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-md border border-slate-200 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" /> Nộp bản chỉnh sửa
                cho {selectedFeedback.category}
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phiên bản *
                </label>
                <input
                  type="text"
                  required
                  placeholder="v1.1, v1.2, v2.0..."
                  value={uploadVersion}
                  onChange={(e) => setUploadVersion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú chỉnh sửa
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Mô tả các nội dung đã tiếp thu và bổ sung..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn tệp đính kèm *
                </label>
                <div className="border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 text-center rounded-md hover:border-blue-400 transition-colors space-y-1">
                  <Upload className="w-5 h-5 text-blue-600 mx-auto" />
                  <p className="font-bold text-slate-800 text-xs">
                    Bấm chọn tệp bên dưới
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Hỗ trợ PDF, ZIP, DOCX, PPTX (Tối đa 50MB)
                  </p>
                </div>
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    setSelectedFile(e.target.files?.[0] ?? null);
                  }}
                  className="mt-2 w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {selectedFile && (
                  <p className="text-[11px] text-emerald-700 font-bold mt-1">
                    Đã chọn: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs disabled:opacity-60 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải...
                  </>
                ) : (
                  "Tải lên"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export { FeedbackView as StudentFeedbackView };
