import { useEffect, useState, useMemo } from "react";
import {
  FileCheck,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  Eye,
  Check,
  ShieldCheck,
  ShieldAlert,
  Building2,
  FileSpreadsheet,
  MessageSquare,
  Send,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Toolbar } from "../../../components/common/Toolbar";
import { Panel } from "../../../components/common/Panel";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { useSemester } from "../../../contexts/SemesterContext";
import { submissionApiService } from "../../../services/submissionApi.service";
import { weeklyReportService } from "../../../services/weeklyReport.service";

export const SubmissionsHub = ({
  submissions,
  onUpdateSubmissionStatus,
  onToast,
}) => {
  const { selectedSemester } = useSemester();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("all");
  const [selectedReportType, setSelectedReportType] =
    useState("T\u1EA5t c\u1EA3");
  const [selectedCompany, setSelectedCompany] = useState("T\u1EA5t c\u1EA3");
  const [selectedDuplicateFilter, setSelectedDuplicateFilter] =
    useState("T\u1EA5t c\u1EA3");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [preview, setPreview] = useState<{ url: string; fileName: string; isPreviewable: boolean } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedSubIds, setSelectedSubIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);
  const companyList = useMemo((): string[] => {
    const unique = new Set<string>();
    for (const s of submissions as { company?: string }[]) {
      const c = String(s.company ?? "");
      if (c) unique.add(c);
    }
    return ["T\u1EA5t c\u1EA3", ...unique];
  }, [submissions]);
  const reportTypeList = useMemo((): string[] => {
    const unique = new Set<string>();
    for (const s of submissions as { reportType?: string }[]) {
      const t = String(s.reportType ?? "");
      if (t) unique.add(t);
    }
    return ["T\u1EA5t c\u1EA3", ...unique];
  }, [submissions]);
  const stats = useMemo(() => {
    const total = submissions.length;
    const approved = submissions.filter(
      (s) => s.status === "\u0110\xE3 duy\u1EC7t",
    ).length;
    const pending = submissions.filter(
      (s) =>
        s.status === "Ch\u1EDD duy\u1EC7t" ||
        s.status === "\u0110\xE3 n\u1ED9p" ||
        s.status === "C\u1EA7n nh\u1EADn x\xE9t" ||
        s.status === "Qu\xE1 h\u1EA1n",
    ).length;
    // "Quá hạn" chỉ thuộc nhóm CHỜ DUYỆT (cần GV xử lý), không đếm vào "cần sửa"
    // để tổng KPI không trùng lặp và khớp bộ lọc tab bên dưới.
    const revision = submissions.filter(
      (s) => s.status === "Y\xEAu c\u1EA7u s\u1EEDa",
    ).length;
    const avgPlagiarism =
      total > 0
        ? Math.round(
            submissions.reduce((acc, s) => acc + (s.duplicateScore || 0), 0) /
              total,
          )
        : 0;
    return { total, approved, pending, revision, avgPlagiarism };
  }, [submissions]);
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (activeSubTab === "approved" && sub.status !== "\u0110\xE3 duy\u1EC7t")
        return false;
      if (
        activeSubTab === "pending" &&
        (sub.status === "\u0110\xE3 duy\u1EC7t" ||
          sub.status === "Y\xEAu c\u1EA7u s\u1EEDa")
      )
        return false;
      // Tab "Yêu cầu sửa" KHÔNG chứa "Quá hạn" (đã thuộc nhóm chờ duyệt) — khớp KPI stats.
      if (activeSubTab === "revision" && sub.status !== "Y\xEAu c\u1EA7u s\u1EEDa")
        return false;
      if (
        selectedReportType !== "T\u1EA5t c\u1EA3" &&
        sub.reportType !== selectedReportType
      )
        return false;
      if (
        selectedCompany !== "T\u1EA5t c\u1EA3" &&
        sub.company !== selectedCompany
      )
        return false;
      if (selectedDuplicateFilter === "safe" && (sub.duplicateScore || 0) >= 10)
        return false;
      if (
        selectedDuplicateFilter === "warning" &&
        ((sub.duplicateScore || 0) < 10 || (sub.duplicateScore || 0) > 25)
      )
        return false;
      if (
        selectedDuplicateFilter === "danger" &&
        (sub.duplicateScore || 0) <= 25
      )
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = sub.studentName.toLowerCase().includes(q);
        const matchMssv = sub.mssv.toLowerCase().includes(q);
        const matchCompany = sub.company.toLowerCase().includes(q);
        const matchType = sub.reportType.toLowerCase().includes(q);
        if (!matchName && !matchMssv && !matchCompany && !matchType)
          return false;
      }
      return true;
    });
  }, [
    submissions,
    activeSubTab,
    selectedReportType,
    selectedCompany,
    selectedDuplicateFilter,
    searchQuery,
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / pageSize));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedSubmissions = useMemo(() => {
    const start = (visiblePage - 1) * pageSize;
    return filteredSubmissions.slice(start, start + pageSize);
  }, [filteredSubmissions, pageSize, visiblePage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSubTab, selectedReportType, selectedCompany, selectedDuplicateFilter, searchQuery]);
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedSubIds(filteredSubmissions.map((s) => s.id));
    } else {
      setSelectedSubIds([]);
    }
  };
  const handleToggleSelect = (id) => {
    setSelectedSubIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };
  const [isBatchApproving, setIsBatchApproving] = useState(false);
  // Đang gọi API duyệt/yêu cầu sửa 1 bài (modal chi tiết) — khóa nút & hiện trạng thái
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleBatchApprove = async () => {
    if (selectedSubIds.length === 0) return;
    if (!onUpdateSubmissionStatus) return;

    setIsBatchApproving(true);
    try {
      const results = await Promise.allSettled(
        selectedSubIds.map((id) =>
          onUpdateSubmissionStatus(
            id,
            "\u0110\xE3 duy\u1EC7t",
            "\u0110\xE3 ph\xEA duy\u1EC7t h\xE0ng lo\u1EA1t",
          ),
        ),
      );
      const succeeded = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - succeeded;
      onToast?.(
        failed === 0
          ? `\u0110\xE3 ph\xEA duy\u1EC7t th\xE0nh c\xF4ng ${succeeded} b\xE0i n\u1ED9p.`
          : `\u0110\xE3 duy\u1EC7t ${succeeded} b\xE0i, ${failed} b\xE0i th\u1EA5t b\u1EA1i. Vui l\xF2ng ki\u1EC3m tra l\u1EA1i.`,
      );
      setSelectedSubIds([]);
    } finally {
      setIsBatchApproving(false);
    }
  };
  const handleBatchDownload = async () => {
    const ids = selectedSubIds.length > 0
      ? selectedSubIds
      : filteredSubmissions.map((submission) => submission.id);
    const submissionIds = ids.filter((id) => !id.startsWith("weekly:"));
    if (submissionIds.length === 0) {
      onToast?.("Chưa có bài nộp để tải xuống.");
      return;
    }
    try {
      await submissionApiService.downloadLecturerZip(submissionIds);
      onToast?.(`Đã tải xuống ${submissionIds.length} bài nộp dưới dạng ZIP.`);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Không thể tạo file ZIP.");
    }
  };
  const handleOpenDetail = async (sub) => {
    setSelectedSubmission(sub);
    setFeedbackInput("");
    setShowDetailModal(true);
    setIsLoadingFeedback(true);
    try {
      const isWeekly = sub.sourceType === "weeklyReport" || sub.id.startsWith("weekly:");
      const reportId = sub.sourceId ?? sub.id.replace(/^weekly:/, "");
      const detail = isWeekly
        ? await weeklyReportService.getById(reportId)
        : await submissionApiService.getById(sub.id);
      setSelectedSubmission((current) => current ? {
        ...current,
        fileName: detail.fileName ?? current.fileName,
        fileUrl: detail.fileUrl ?? detail.fileName ?? current.fileUrl,
        assets: "assets" in detail ? detail.assets ?? current.assets ?? [] : current.assets ?? [],
        feedbacks: detail.feedbacks ?? [],
        lecturerNote: detail.feedbacks?.[detail.feedbacks.length - 1]?.comment
          ?? ("lecturerComment" in detail ? detail.lecturerComment : undefined)
          ?? current.lecturerNote,
      } : current);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Không thể tải luồng nhận xét.");
    } finally {
      setIsLoadingFeedback(false);
    }
  };
  const handlePreview = async (assetId?: string) => {
    if (!selectedSubmission) return;
    setPreviewLoading(true);
    try {
      const isWeekly = selectedSubmission.sourceType === "weeklyReport" || selectedSubmission.id.startsWith("weekly:");
      const reportId = selectedSubmission.sourceId ?? selectedSubmission.id.replace(/^weekly:/, "");
      const asset = selectedSubmission.assets?.find((item) => item.id === assetId && item.assetType === "file")
        ?? selectedSubmission.assets?.find((item) => item.assetType === "file")
        ?? null;
      if (!isWeekly && selectedSubmission.assets?.length && !asset) {
        const link = selectedSubmission.assets.find((item) => item.assetType === "link")?.fileUrl;
        if (link) window.open(link, "_blank", "noopener,noreferrer");
        return;
      }
      const fallbackName = asset?.fileName ?? selectedSubmission.fileUrl ?? "Tài liệu nộp";
      const { blob, filename } = isWeekly
        ? await weeklyReportService.download(reportId, selectedSubmission.fileUrl ?? fallbackName, false)
        : asset
          ? await submissionApiService.downloadAsset(selectedSubmission.id, asset.id, fallbackName, false)
          : await submissionApiService.download(selectedSubmission.id, fallbackName, false);
      const mime = blob.type.toLowerCase();
      const isPreviewable = mime.includes("pdf") || mime.startsWith("image/");
      if (preview?.url) URL.revokeObjectURL(preview.url);
      setPreview({ url: URL.createObjectURL(blob), fileName: filename, isPreviewable });
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Không thể xem trước file.");
    } finally {
      setPreviewLoading(false);
    }
  };
  const handleDownload = async (assetId?: string) => {
    if (!selectedSubmission || isDownloading) return;
    setIsDownloading(true);
    try {
      const isWeekly = selectedSubmission.sourceType === "weeklyReport" || selectedSubmission.id.startsWith("weekly:");
      const reportId = selectedSubmission.sourceId ?? selectedSubmission.id.replace(/^weekly:/, "");
      const asset = selectedSubmission.assets?.find((item) => item.id === assetId && item.assetType === "file")
        ?? selectedSubmission.assets?.find((item) => item.assetType === "file")
        ?? null;
      if (!isWeekly && selectedSubmission.assets?.length && !asset) {
        const link = selectedSubmission.assets.find((item) => item.assetType === "link")?.fileUrl;
        if (link) window.open(link, "_blank", "noopener,noreferrer");
        return;
      }
      const fallbackName = asset?.fileName ?? selectedSubmission.fileUrl ?? "Tài liệu nộp";
      await (isWeekly
        ? weeklyReportService.download(reportId, selectedSubmission.fileUrl ?? fallbackName)
        : asset
          ? submissionApiService.downloadAsset(selectedSubmission.id, asset.id, fallbackName)
          : submissionApiService.download(selectedSubmission.id, fallbackName));
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Không thể tải file.");
    } finally {
      setIsDownloading(false);
    }
  };
  const handleSendFeedback = async (event) => {
    event.preventDefault();
    if (!selectedSubmission || !feedbackInput.trim() || isSendingFeedback) return;
    setIsSendingFeedback(true);
    try {
      const isWeekly = selectedSubmission.sourceType === "weeklyReport" || selectedSubmission.id.startsWith("weekly:");
      const reportId = selectedSubmission.sourceId ?? selectedSubmission.id.replace(/^weekly:/, "");
      const updated = isWeekly
        ? await weeklyReportService.review(reportId, {
            status: "Reviewed",
            lecturerComment: feedbackInput.trim(),
          })
        : await submissionApiService.addFeedback(selectedSubmission.id, {
            comment: feedbackInput.trim(),
            isPublic: true,
          });
      const latestFeedback = updated.feedbacks?.[updated.feedbacks.length - 1];
      const localFeedback = {
        id: `local-${Date.now()}`,
        comment: feedbackInput.trim(),
        authorRole: "Lecturer",
        lecturerName: "Giảng viên",
        createdAt: new Date().toISOString(),
      };
      setSelectedSubmission((current) => current ? {
        ...current,
        lecturerNote: latestFeedback?.comment ?? current.lecturerNote,
        feedbacks: updated.feedbacks ?? [...(current.feedbacks ?? []), localFeedback],
      } : current);
      setFeedbackInput("");
      onToast?.("Đã gửi nhận xét cho sinh viên.");
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Không thể gửi nhận xét.");
    } finally {
      setIsSendingFeedback(false);
    }
  };
  const handleApproveSingle = async () => {
    if (!selectedSubmission || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      await onUpdateSubmissionStatus?.(
        selectedSubmission.id,
        "\u0110\xE3 duy\u1EC7t",
        feedbackInput ||
          "\u0110\xE3 ki\u1EC3m tra & ph\xEA duy\u1EC7t b\xE0i n\u1ED9p",
      );
      onToast?.(
        `\u0110\xE3 ph\xEA duy\u1EC7t b\xE0i n\u1ED9p c\u1EE7a ${selectedSubmission.studentName}`,
      );
      setShowDetailModal(false);
    } catch (err) {
      // API lỗi → toast lỗi thật, không đóng modal để GV thử lại
      onToast?.(err instanceof Error ? err.message : "Không thể phê duyệt bài nộp. Vui lòng thử lại.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  const handleRequestRevisionSingle = async () => {
    if (!selectedSubmission || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      await onUpdateSubmissionStatus?.(
        selectedSubmission.id,
        "Y\xEAu c\u1EA7u s\u1EEDa",
        feedbackInput ||
          "C\u1EA7n b\u1ED5 sung chi ti\u1EBFt theo y\xEAu c\u1EA7u",
      );
      onToast?.(
        `\u0110\xE3 g\u1EEDi y\xEAu c\u1EA7u ch\u1EC9nh s\u1EEDa cho ${selectedSubmission.studentName}`,
      );
      setShowDetailModal(false);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Không thể gửi yêu cầu chỉnh sửa. Vui lòng thử lại.");
    } finally {
    setIsUpdatingStatus(false);
    }
  };
  // Duyệt trực tiếp trên hàng bảng — await API, chỉ toast khi thành công
  const handleApproveRow = async (sub: { id: string; studentName: string }) => {
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      await onUpdateSubmissionStatus?.(sub.id, "\u0110\xE3 duy\u1EC7t", "\u0110\xE3 duy\u1EC7t tr\u1EF1c ti\u1EBFp");
      onToast?.(`\u0110\xE3 duy\u1EC7t b\xE0i n\u1ED9p c\u1EE7a ${sub.studentName}`);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Không thể duyệt bài nộp. Vui lòng thử lại.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  return (
    <div className="space-y-5 max-w-[1500px] mx-auto animate-in fade-in duration-200">
      <PageHeader
        icon={FileCheck}
        title="Kho Báo Cáo & Bài Nộp Sinh Viên"
        subtitle={`Tổng hợp báo cáo tuần, giữa kỳ & cuối kỳ do sinh viên tải lên · ${selectedSemester?.name || "Kỳ thực tập đang chọn"}`}
        actions={[
          {
            label: "Tải toàn bộ (.ZIP)",
            icon: Download,
            variant: "primary",
            onClick: handleBatchDownload,
            ariaLabel: "Tải toàn bộ file báo cáo dưới dạng ZIP",
          },
        ]}
      />

      <Toolbar
        left={
          <p className="text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800">{stats.total}</span> bài
            ·{" "}
            <span className="font-bold text-emerald-700">{stats.approved}</span>{" "}
            đã duyệt ·{" "}
            <span className="font-bold text-amber-700">{stats.pending}</span>{" "}
            chờ ·{" "}
            <span className="font-bold text-rose-700">{stats.revision}</span> cần
            sửa
          </p>
        }
      />

      <Panel className="space-y-4">
        {/* Sub-tabs & filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-md">
            <button
              onClick={() => setActiveSubTab("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubTab === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              Tất cả bài nộp ({submissions.length})
            </button>

            <button
              onClick={() => setActiveSubTab("approved")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeSubTab === "approved" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đã phê duyệt ({stats.approved})</span>
            </button>

            <button
              onClick={() => setActiveSubTab("pending")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeSubTab === "pending" ? "bg-amber-500 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Chờ duyệt ({stats.pending})</span>
            </button>

            <button
              onClick={() => setActiveSubTab("revision")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeSubTab === "revision" ? "bg-rose-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Yêu cầu sửa ({stats.revision})</span>
            </button>
          </div>

          {/* Batch Selection Action Bar if items selected */}
          {selectedSubIds.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-md text-xs font-bold text-blue-900 animate-in fade-in">
              <span>Đã chọn {selectedSubIds.length} bài nộp</span>
              <button
                onClick={() => void handleBatchApprove()}
                disabled={isBatchApproving}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Duyệt tất cả</span>
              </button>
            </div>
          )}
        </div>

        {/* Search & Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo Tên, MSSV, Doanh nghiệp..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-md outline-none focus:border-blue-500 font-medium text-slate-800"
            />
          </div>

          {/* Filter by Report Type */}
          <div>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-md outline-none focus:border-blue-500 font-medium text-slate-700"
            >
              <option value="Tất cả">Loại báo cáo: Tất cả</option>
              {reportTypeList
                .filter((t) => t !== "T\u1EA5t c\u1EA3")
                .map((t, i) => (
                  <option key={i} value={t}>
                    {t}
                  </option>
                ))}
            </select>
          </div>

          {/* Filter by Enterprise */}
          <div>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-md outline-none focus:border-blue-500 font-medium text-slate-700"
            >
              <option value="Tất cả">Doanh nghiệp: Tất cả</option>
              {companyList
                .filter((c) => c !== "T\u1EA5t c\u1EA3")
                .map((c, i) => (
                  <option key={i} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>

          {/* Filter by Plagiarism level */}
          <div>
            <select
              value={selectedDuplicateFilter}
              onChange={(e) => setSelectedDuplicateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-md outline-none focus:border-blue-500 font-medium text-slate-700"
            >
              <option value="Tất cả">Kiểm tra trùng lặp: Tất cả</option>
              <option value="safe">🟢 An toàn (&lt;10%)</option>
              <option value="warning">🟡 Cần lưu ý (10-25%)</option>
              <option value="danger">🔴 Cảnh báo (&gt;25%)</option>
            </select>
          </div>
        </div>

      {/* Submissions Repository Table */}
      <div className="border border-slate-200/80 rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedSubIds.length > 0 &&
                      selectedSubIds.length === filteredSubmissions.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-600 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3.5">SINH VIÊN & MSSV</th>
                <th className="py-3 px-3.5">DOANH NGHIỆP</th>
                <th className="py-3 px-3.5">BÁO CÁO & TẬP TIN</th>
                <th className="py-3 px-3.5">THỜI GIAN NỘP</th>
                <th className="py-3 px-3.5 text-center">TRÙNG LẶP</th>
                <th className="py-3 px-3.5">TRẠNG THÁI & GHI CHÚ</th>
                <th className="py-3 px-3.5 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">
                      Không tìm thấy bài nộp nào phù hợp
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedSubmissions.map((sub) => {
                  const isChecked = selectedSubIds.includes(sub.id);
                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isChecked ? "bg-blue-50/30" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(sub.id)}
                          className="rounded border-slate-300 text-blue-600 cursor-pointer"
                        />
                      </td>

                      {/* Student Info */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <InitialsAvatar name={sub.studentName} seed={sub.mssv} size={36} />
                          <div>
                            <p
                              className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                              onClick={() => handleOpenDetail(sub)}
                            >
                              {sub.studentName}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono font-bold">
                              MSSV: {sub.mssv}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{sub.company}</span>
                        </div>
                      </td>

                      {/* Report & File */}
                      <td className="py-3.5 px-3.5">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 block">
                            {sub.reportType}
                            {sub.assetCount ? ` · ${sub.assetCount} tài nguyên` : ""}
                          </span>
                          <button
                            onClick={() => handleOpenDetail(sub)}
                            className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{sub.fileName || "Không có tệp đính kèm"}</span>
                            {sub.fileName && sub.fileSize && (
                              <span className="text-slate-500 text-[11px]">
                                ({sub.fileSize})
                              </span>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-3.5 text-xs text-slate-500">
                        <div className="font-semibold text-slate-800">
                          {sub.date}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {sub.time}
                        </div>
                      </td>

                      {/* Duplicate Score */}
                      <td className="py-3.5 px-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${(sub.duplicateScore || 0) < 10 ? "bg-emerald-100 text-emerald-800" : (sub.duplicateScore || 0) <= 25 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800 border border-rose-200"}`}
                        >
                          {(sub.duplicateScore || 0) < 10 ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <ShieldAlert className="w-3 h-3" />
                          )}
                          {sub.duplicateScore || 0}%
                        </span>
                      </td>

                      {/* Status & Lecturer Note */}
                      <td className="py-3.5 px-3.5">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${sub.status === "\u0110\xE3 duy\u1EC7t" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : sub.status === "Ch\u1EDD duy\u1EC7t" || sub.status === "\u0110\xE3 n\u1ED9p" ? "bg-amber-100 text-amber-800 border border-amber-200" : sub.status === "Y\xEAu c\u1EA7u s\u1EEDa" ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-slate-100 text-slate-700"}`}
                          >
                            {sub.status === "\u0110\xE3 duy\u1EC7t" && (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {sub.status === "Ch\u1EDD duy\u1EC7t" && (
                              <Clock className="w-3 h-3" />
                            )}
                            {sub.status === "Y\xEAu c\u1EA7u s\u1EEDa" && (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            {sub.status}
                          </span>

                          {sub.lecturerNote && (
                            <p className="text-xs text-slate-600 italic line-clamp-1">
                              &ldquo;{sub.lecturerNote}&rdquo;
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(sub)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors border border-slate-200/60"
                            title="Xem chi tiết bài nộp"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                          </button>

                          {sub.status !== "\u0110\xE3 duy\u1EC7t" && (
                            <button
                              onClick={() => void handleApproveRow(sub)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-2xs transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Duyệt</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>
            Hiển thị {filteredSubmissions.length === 0 ? 0 : (visiblePage - 1) * pageSize + 1}
            –{Math.min(visiblePage * pageSize, filteredSubmissions.length)} / {filteredSubmissions.length} bài nộp
          </span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 border border-slate-200 rounded-md bg-white font-medium text-slate-700 outline-none"
            aria-label="Số bài nộp mỗi trang"
          >
            <option value={5}>5 / trang</option>
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={visiblePage === 1}
            className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-16 text-center font-semibold text-slate-700">
            {visiblePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={visiblePage === totalPages}
            className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      </Panel>

      {/* DETAIL DOCUMENT MODAL */}
      {showDetailModal && selectedSubmission && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-md border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {selectedSubmission.reportType}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Sinh viên: {selectedSubmission.studentName} • MSSV:{" "}
                    {selectedSubmission.mssv}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs font-sans">
              {/* Student Header Summary */}
              <div className="p-3.5 bg-slate-50 rounded-md border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <InitialsAvatar
                    name={selectedSubmission.studentName}
                    seed={selectedSubmission.mssv}
                    size={40}
                  />
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">
                      {selectedSubmission.studentName}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {selectedSubmission.company}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">
                    Nộp lúc:{" "}
                    <strong>
                      {selectedSubmission.time} - {selectedSubmission.date}
                    </strong>
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${selectedSubmission.status === "\u0110\xE3 duy\u1EC7t" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                  >
                    {selectedSubmission.status}
                  </span>
                </div>
              </div>

              {/* Summary Section */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block text-xs">
                  Tóm tắt nội dung bài nộp:
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-md text-slate-700 leading-relaxed font-medium">
                  {selectedSubmission.summary ||
                    "Ch\u01B0a c\xF3 b\u1EA3n t\xF3m t\u1EAFt n\u1ED9i dung b\u1ED5 sung."}
                </div>
              </div>

              {/* Document File Card */}
              <div className="p-3.5 bg-blue-50/60 rounded-md border border-blue-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    PDF
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {selectedSubmission.assets?.length
                        ? `${selectedSubmission.assets.length} tài nguyên đính kèm`
                        : selectedSubmission.fileUrl || "Chưa có file đính kèm"}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {selectedSubmission.assets?.length
                        ? selectedSubmission.assets.map((asset) => asset.label || asset.fileName || asset.fileUrl).join(" • ")
                        : `Kích thước: ${selectedSubmission.fileSize || "—"} • Trùng lặp: ${selectedSubmission.duplicateScore || 0}%`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handlePreview()}
                    disabled={previewLoading}
                    className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 font-bold rounded-lg text-xs flex items-center gap-1 border border-blue-200 disabled:opacity-60"
                  >
                    {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>Xem trước</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    disabled={isDownloading}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs disabled:opacity-60"
                  >
                    {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{isDownloading ? "Đang tải..." : "Tải file"}</span>
                  </button>
                </div>

                {selectedSubmission.assets && selectedSubmission.assets.length > 0 && (
                  <div className="grid gap-1 border-t border-blue-100 pt-2">
                    {selectedSubmission.assets.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate text-slate-700">{asset.label || asset.fileName || asset.fileUrl}</span>
                        {asset.assetType === "link" ? (
                          <a href={asset.fileUrl ?? "#"} target="_blank" rel="noreferrer" className="shrink-0 font-bold text-blue-700 hover:underline">
                            Mở link
                          </a>
                        ) : (
                          <button type="button" disabled={isDownloading} onClick={() => void handleDownload(asset.id)} className="shrink-0 font-bold text-blue-700 hover:underline disabled:opacity-60">
                            Tải file
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <label className="font-bold text-slate-800 text-xs">Trao đổi với sinh viên</label>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                  {isLoadingFeedback ? (
                    <p className="flex items-center justify-center gap-2 text-[11px] text-slate-400 py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải nhận xét…
                    </p>
                  ) : (selectedSubmission.feedbacks ?? []).length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-2">Chưa có nhận xét nào.</p>
                  ) : (
                    (selectedSubmission.feedbacks ?? []).map((feedback) => (
                      <div key={feedback.id} className={`rounded-md px-3 py-2 text-[11px] ${feedback.authorRole === "Lecturer" ? "bg-blue-50 border border-blue-100 ml-5" : "bg-white border border-slate-200 mr-5"}`}>
                        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                          <strong className="text-slate-700">{feedback.lecturerName ?? (feedback.authorRole === "Lecturer" ? "Giảng viên" : "Sinh viên")}</strong>
                          <span>{new Date(feedback.createdAt).toLocaleString("vi-VN")}</span>
                        </div>
                        <p className="mt-1 text-slate-700 leading-relaxed">{feedback.comment}</p>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleSendFeedback} className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Nhập nhận xét, sinh viên sẽ nhận được ngay…"
                    className="flex-1 p-2.5 bg-white border border-slate-200 rounded-md text-xs outline-none focus:border-blue-500 resize-none"
                  />
                  <button type="submit" disabled={!feedbackInput.trim() || isSendingFeedback} className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50" title="Gửi nhận xét">
                    {isSendingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md text-xs"
                >
                  Đóng
                </button>

                <button
                  type="button"
                  onClick={() => void handleRequestRevisionSingle()}
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-md text-xs border border-rose-200 flex items-center gap-1.5 disabled:opacity-60"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{isUpdatingStatus ? "Đang xử lý..." : "Yêu cầu sửa lại"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleApproveSingle()}
                  disabled={isUpdatingStatus}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-xs shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>{isUpdatingStatus ? "Đang xử lý..." : "Phê Duyệt Bài Nộp"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {preview && (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl h-[86vh] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
              <p className="text-sm font-bold text-slate-900 truncate">{preview.fileName}</p>
              <button type="button" onClick={() => setPreview(null)} className="p-1.5 text-slate-500 hover:text-slate-900" title="Đóng xem trước">
                <X className="w-5 h-5" />
              </button>
            </div>
            {preview.isPreviewable ? (
              <iframe title={`Xem trước ${preview.fileName}`} src={preview.url} className="flex-1 w-full" />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <FileText className="h-10 w-10 text-slate-400" />
                <p className="text-sm font-semibold text-slate-700">Định dạng này không hỗ trợ xem trước trực tiếp.</p>
                <p className="text-xs text-slate-500">Hãy đóng cửa sổ này và dùng nút “Tải file”.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
