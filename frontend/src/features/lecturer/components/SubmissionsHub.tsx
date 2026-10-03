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
  MessageSquare,
  Send,
  X,
  Loader2,
  ChevronDown,
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
import type { Submission } from "../../../types/submission";

interface StudentGroup {
  key: string;
  studentName: string;
  mssv: string;
  company: string;
  items: Submission[];
}

const isWeekly = (sub: Submission) =>
  sub.sourceType === "weeklyReport" || String(sub.id).startsWith("weekly:");

/** ZIP chỉ gom được file bài nộp sản phẩm (endpoint Submission); báo cáo tuần tải riêng theo từng bài. */
const zipIdsOf = (items: Submission[]) =>
  items.filter((sub) => !isWeekly(sub)).map((sub) => sub.id);

const statusBadge = (status: string) =>
  status === "Đã duyệt"
    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
    : status === "Chờ duyệt" || status === "Đã nộp" || status === "Cần nhận xét" || status === "Quá hạn"
    ? "bg-amber-100 text-amber-800 border border-amber-200"
    : status === "Yêu cầu sửa"
    ? "bg-rose-100 text-rose-800 border border-rose-200"
    : "bg-slate-100 text-slate-700";

const statusIcon = (status: string) =>
  status === "Đã duyệt" ? (
    <CheckCircle2 className="w-3 h-3" />
  ) : status === "Yêu cầu sửa" ? (
    <AlertCircle className="w-3 h-3" />
  ) : (
    <Clock className="w-3 h-3" />
  );

export const SubmissionsHub = ({
  submissions,
  onUpdateSubmissionStatus,
  onToast,
}: {
  submissions: Submission[];
  onUpdateSubmissionStatus?: (id: string, status: string, note?: string) => unknown;
  onToast?: (msg: string, type?: string) => void;
}) => {
  const { selectedSemester } = useSemester();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("all");
  const [selectedReportType, setSelectedReportType] = useState("Tất cả");
  const [selectedCompany, setSelectedCompany] = useState("Tất cả");
  const [selectedDuplicateFilter, setSelectedDuplicateFilter] = useState("Tất cả");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [preview, setPreview] = useState<{ url: string; fileName: string; isPreviewable: boolean } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [isBatchApproving, setIsBatchApproving] = useState(false);
  // Đang gọi API duyệt/yêu cầu sửa 1 bài (modal chi tiết) — khóa nút & hiện trạng thái
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Nhóm theo sinh viên: mở/Thu gọn + phân trang theo NHÓM
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [groupPage, setGroupPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(10);
  // Đang tạo ZIP cho nhóm SV nào (hiện spinner trên đúng nút)
  const [zippingStudentKey, setZippingStudentKey] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const companyList = useMemo((): string[] => {
    const unique = new Set<string>();
    for (const s of submissions) {
      const c = String(s.company ?? "");
      if (c && c !== "—") unique.add(c);
    }
    return ["Tất cả", ...unique];
  }, [submissions]);

  const reportTypeList = useMemo((): string[] => {
    const unique = new Set<string>();
    for (const s of submissions) {
      const t = String(s.reportType ?? "");
      if (t) unique.add(t);
    }
    return ["Tất cả", ...unique];
  }, [submissions]);

  const stats = useMemo(() => {
    const total = submissions.length;
    const approved = submissions.filter((s) => s.status === "Đã duyệt").length;
    const pending = submissions.filter(
      (s) =>
        s.status === "Chờ duyệt" ||
        s.status === "Đã nộp" ||
        s.status === "Cần nhận xét" ||
        s.status === "Quá hạn",
    ).length;
    // "Quá hạn" chỉ thuộc nhóm CHỜ DUYỆT (cần GV xử lý), không đếm vào "cần sửa"
    // để tổng KPI không trùng lặp và khớp bộ lọc tab bên dưới.
    const revision = submissions.filter((s) => s.status === "Yêu cầu sửa").length;
    return { total, approved, pending, revision };
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (activeSubTab === "approved" && sub.status !== "Đã duyệt") return false;
      if (
        activeSubTab === "pending" &&
        (sub.status === "Đã duyệt" || sub.status === "Yêu cầu sửa")
      )
        return false;
      // Tab "Yêu cầu sửa" KHÔNG chứa "Quá hạn" (đã thuộc nhóm chờ duyệt) — khớp KPI stats.
      if (activeSubTab === "revision" && sub.status !== "Yêu cầu sửa") return false;
      if (selectedReportType !== "Tất cả" && sub.reportType !== selectedReportType) return false;
      if (selectedCompany !== "Tất cả" && sub.company !== selectedCompany) return false;
      if (selectedDuplicateFilter !== "Tất cả") {
        const score = sub.duplicateScore || 0;
        if (selectedDuplicateFilter === "safe" && score >= 10) return false;
        if (selectedDuplicateFilter === "warning" && (score < 10 || score > 25)) return false;
        if (selectedDuplicateFilter === "danger" && score <= 25) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          sub.studentName.toLowerCase().includes(q) ||
          sub.mssv.toLowerCase().includes(q) ||
          sub.company.toLowerCase().includes(q) ||
          sub.reportType.toLowerCase().includes(q) ||
          (sub.fileName ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [submissions, activeSubTab, selectedReportType, selectedCompany, selectedDuplicateFilter, searchQuery]);

  // ── Nhóm bài nộp THEO SINH VIÊN — tiện xem toàn bộ hồ sơ & tải zip của từng người ──
  const studentGroups = useMemo((): StudentGroup[] => {
    const map = new Map<string, StudentGroup>();
    for (const sub of filteredSubmissions) {
      const key = sub.mssv && sub.mssv !== "—" ? sub.mssv : sub.studentName || sub.id;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(sub);
      } else {
        map.set(key, {
          key,
          studentName: sub.studentName,
          mssv: sub.mssv,
          company: sub.company,
          items: [sub],
        });
      }
    }
    return [...map.values()];
  }, [filteredSubmissions]);

  const groupTotalPages = Math.max(1, Math.ceil(studentGroups.length / groupPageSize));
  const visibleGroupPage = Math.min(groupPage, groupTotalPages);
  const pagedGroups = useMemo(
    () =>
      studentGroups.slice(
        (visibleGroupPage - 1) * groupPageSize,
        visibleGroupPage * groupPageSize,
      ),
    [studentGroups, groupPageSize, visibleGroupPage],
  );

  useEffect(() => {
    setGroupPage(1);
  }, [activeSubTab, selectedReportType, selectedCompany, selectedDuplicateFilter, searchQuery]);

  const toggleExpand = (key: string) =>
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const expandAll = () => setExpandedStudents(new Set(studentGroups.map((g) => g.key)));
  const collapseAll = () => setExpandedStudents(new Set());

  const toggleGroupSelection = (group: StudentGroup) => {
    const ids = group.items.map((s) => s.id);
    const allSelected = ids.every((id) => selectedSubIds.includes(id));
    setSelectedSubIds((prev) =>
      allSelected
        ? prev.filter((id) => !ids.includes(id))
        : [...new Set([...prev, ...ids])],
    );
  };
  const toggleSelect = (id: string) =>
    setSelectedSubIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );

  const groupSummary = (group: StudentGroup) => {
    const approved = group.items.filter((s) => s.status === "Đã duyệt").length;
    const revision = group.items.filter((s) => s.status === "Yêu cầu sửa").length;
    return { approved, revision, pending: group.items.length - approved - revision };
  };

  const handleBatchApprove = async () => {
    if (selectedSubIds.length === 0 || !onUpdateSubmissionStatus) return;
    setIsBatchApproving(true);
    try {
      const results = await Promise.allSettled(
        selectedSubIds.map((id) =>
          onUpdateSubmissionStatus(id, "Đã duyệt", "Đã phê duyệt hàng loạt"),
        ),
      );
      const succeeded = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - succeeded;
      onToast?.(
        failed === 0
          ? `Đã phê duyệt thành công ${succeeded} bài nộp.`
          : `Đã duyệt ${succeeded} bài, ${failed} bài thất bại. Vui lòng kiểm tra lại.`,
      );
      setSelectedSubIds([]);
    } finally {
      setIsBatchApproving(false);
    }
  };

  // Tải toàn bộ (theo bộ lọc hiện tại) — gom zip theo từng SV trên server
  const handleBatchDownload = async () => {
    const ids = zipIdsOf(filteredSubmissions);
    if (ids.length === 0) {
      onToast?.("Chưa có bài nộp (dạng file) để tải xuống. Báo cáo tuần cần tải riêng theo từng bài.");
      return;
    }
    try {
      await submissionApiService.downloadLecturerZip(ids);
      onToast?.(`Đã tải xuống ${ids.length} bài nộp dưới dạng ZIP.`);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Không thể tạo file ZIP.");
    }
  };

  // Tải ZIP toàn bộ bài nộp FILE của 1 sinh viên
  const handleDownloadStudentZip = async (group: StudentGroup) => {
    const ids = zipIdsOf(group.items);
    if (ids.length === 0) {
      onToast?.("Sinh viên này chỉ có báo cáo tuần — hãy tải file từ từng bài trong nhóm.");
      return;
    }
    setZippingStudentKey(group.key);
    try {
      await submissionApiService.downloadLecturerZip(ids);
      onToast?.(`Đã tải ${ids.length} bài nộp của ${group.studentName} (.zip).`);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Không thể tạo file ZIP.");
    } finally {
      setZippingStudentKey(null);
    }
  };

  const handleOpenDetail = async (sub: Submission) => {
    setSelectedSubmission(sub);
    setFeedbackInput("");
    setShowDetailModal(true);
    setIsLoadingFeedback(true);
    try {
      const weekly = isWeekly(sub);
      const reportId = sub.sourceId ?? sub.id.replace(/^weekly:/, "");
      const detail = weekly
        ? await weeklyReportService.getById(reportId)
        : await submissionApiService.getById(sub.id);
      setSelectedSubmission((current) =>
        current
          ? {
              ...current,
              fileName: detail.fileName ?? current.fileName,
              fileUrl: detail.fileUrl ?? detail.fileName ?? current.fileUrl,
              assets: "assets" in detail ? detail.assets ?? current.assets ?? [] : current.assets ?? [],
              feedbacks: detail.feedbacks ?? [],
              lecturerNote:
                detail.feedbacks?.[detail.feedbacks.length - 1]?.comment
                  ?? ("lecturerComment" in detail ? detail.lecturerComment : undefined)
                  ?? current.lecturerNote,
            }
          : current,
      );
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
      const weekly = isWeekly(selectedSubmission);
      const reportId = selectedSubmission.sourceId ?? selectedSubmission.id.replace(/^weekly:/, "");
      const asset =
        selectedSubmission.assets?.find((item) => item.id === assetId && item.assetType === "file")
        ?? selectedSubmission.assets?.find((item) => item.assetType === "file")
        ?? null;
      if (!weekly && selectedSubmission.assets?.length && !asset) {
        const link = selectedSubmission.assets.find((item) => item.assetType === "link")?.fileUrl;
        if (link) window.open(link, "_blank", "noopener,noreferrer");
        return;
      }
      const fallbackName = asset?.fileName ?? selectedSubmission.fileUrl ?? "Tài liệu nộp";
      const { blob, filename } = weekly
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
      const weekly = isWeekly(selectedSubmission);
      const reportId = selectedSubmission.sourceId ?? selectedSubmission.id.replace(/^weekly:/, "");
      const asset =
        selectedSubmission.assets?.find((item) => item.id === assetId && item.assetType === "file")
        ?? selectedSubmission.assets?.find((item) => item.assetType === "file")
        ?? null;
      if (!weekly && selectedSubmission.assets?.length && !asset) {
        const link = selectedSubmission.assets.find((item) => item.assetType === "link")?.fileUrl;
        if (link) window.open(link, "_blank", "noopener,noreferrer");
        return;
      }
      const fallbackName = asset?.fileName ?? selectedSubmission.fileUrl ?? "Tài liệu nộp";
      await (weekly
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

  const handleSendFeedback = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSubmission || !feedbackInput.trim() || isSendingFeedback) return;
    setIsSendingFeedback(true);
    try {
      const weekly = isWeekly(selectedSubmission);
      const reportId = selectedSubmission.sourceId ?? selectedSubmission.id.replace(/^weekly:/, "");
      const updated = weekly
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
        isPublic: true,
        authorRole: "Lecturer" as const,
        lecturerName: "Giảng viên",
        createdAt: new Date().toISOString(),
      };
      setSelectedSubmission((current) =>
        current
          ? {
              ...current,
              lecturerNote: latestFeedback?.comment ?? current.lecturerNote,
              feedbacks: updated.feedbacks ?? [...(current.feedbacks ?? []), localFeedback],
            }
          : current,
      );
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
        "Đã duyệt",
        feedbackInput || "Đã kiểm tra & phê duyệt bài nộp",
      );
      onToast?.(`Đã phê duyệt bài nộp của ${selectedSubmission.studentName}`);
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
        "Yêu cầu sửa",
        feedbackInput || "Cần bổ sung chi tiết theo yêu cầu",
      );
      onToast?.(`Đã gửi yêu cầu chỉnh sửa cho ${selectedSubmission.studentName}`);
      setShowDetailModal(false);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Không thể gửi yêu cầu chỉnh sửa. Vui lòng thử lại.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Duyệt trực tiếp trên hàng bài nộp — await API, chỉ toast khi thành công
  const handleApproveRow = async (sub: { id: string; studentName: string }) => {
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      await onUpdateSubmissionStatus?.(sub.id, "Đã duyệt", "Đã duyệt trực tiếp");
      onToast?.(`Đã duyệt bài nộp của ${sub.studentName}`);
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
            label: "Tải tất cả (.ZIP)",
            icon: Download,
            variant: "primary",
            onClick: () => void handleBatchDownload(),
            ariaLabel: "Tải toàn bộ file báo cáo dưới dạng ZIP",
          },
        ]}
      />

      <Toolbar
        left={
          <p className="text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800">{stats.total}</span> bài
            ·{" "}
            <span className="font-bold text-emerald-700">{stats.approved}</span> đã duyệt
            ·{" "}
            <span className="font-bold text-amber-700">{stats.pending}</span> chờ
            ·{" "}
            <span className="font-bold text-rose-700">{stats.revision}</span> cần sửa
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

        {/* Search & Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
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

          <select
            value={selectedReportType}
            onChange={(e) => setSelectedReportType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-md outline-none focus:border-blue-500 font-medium text-slate-700"
          >
            <option value="Tất cả">Loại báo cáo: Tất cả</option>
            {reportTypeList
              .filter((t) => t !== "Tất cả")
              .map((t, i) => (
                <option key={i} value={t}>
                  {t}
                </option>
              ))}
          </select>

          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-md outline-none focus:border-blue-500 font-medium text-slate-700"
          >
            <option value="Tất cả">Doanh nghiệp: Tất cả</option>
            {companyList
              .filter((c) => c !== "Tất cả")
              .map((c, i) => (
                <option key={i} value={c}>
                  {c}
                </option>
              ))}
          </select>

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

        {/* List header */}
        {studentGroups.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700">
              Bài nộp theo sinh viên{" "}
              <span className="font-medium text-slate-500">
                ({studentGroups.length} sinh viên)
              </span>
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={expandAll}
                className="px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Mở tất cả
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Thu gọn
              </button>
            </div>
          </div>
        )}

        {/* ── Danh sách nhóm theo sinh viên ── */}
        {studentGroups.length === 0 ? (
          <div className="border border-slate-200/80 rounded-md py-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-sm text-slate-600">Không tìm thấy bài nộp nào phù hợp</p>
            <p className="text-xs text-slate-400 mt-0.5">Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pagedGroups.map((group) => {
              const summary = groupSummary(group);
              const expanded =
                expandedStudents.has(group.key) || studentGroups.length === 1;
              const ids = zipIdsOf(group.items);
              const allSelected =
                group.items.length > 0 &&
                group.items.every((s) => selectedSubIds.includes(s.id));
              const isZipping = zippingStudentKey === group.key;
              return (
                <div
                  key={group.key}
                  className="border border-slate-200/80 rounded-lg overflow-hidden bg-white"
                  data-testid="student-submission-group"
                >
                  {/* Group header */}
                  <div
                    className="flex items-center gap-3 p-3 bg-slate-50/80 hover:bg-slate-100/70 cursor-pointer transition-colors"
                    onClick={() => toggleExpand(group.key)}
                  >
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => toggleGroupSelection(group)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-300 text-blue-600 cursor-pointer"
                      title="Chọn tất cả bài nộp của sinh viên này"
                    />
                    <InitialsAvatar name={group.studentName} seed={group.mssv} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-sm truncate">{group.studentName}</p>
                      <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 truncate">
                        <span className="font-mono font-bold">MSSV: {group.mssv}</span>
                        <span>·</span>
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{group.company}</span>
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-1.5 text-[10px] font-bold shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600">
                        {group.items.length} bài
                      </span>
                      {summary.approved > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {summary.approved} đã duyệt
                        </span>
                      )}
                      {summary.pending > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {summary.pending} chờ
                        </span>
                      )}
                      {summary.revision > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          {summary.revision} cần sửa
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDownloadStudentZip(group);
                      }}
                      disabled={ids.length === 0 || isZipping}
                      className="shrink-0 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        ids.length === 0
                          ? "Chỉ có báo cáo tuần — tải file riêng trong từng bài"
                          : `Tải ${ids.length} bài nộp của sinh viên này (.zip)`
                      }
                    >
                      {isZipping ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>{isZipping ? "Đang tạo..." : `Tải .zip (${ids.length})`}</span>
                    </button>
                  </div>

                  {/* Expanded rows: từng bài nộp của sinh viên */}
                  {expanded && (
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                      {group.items.map((sub) => (
                        <div
                          key={sub.id}
                          className={`flex items-start gap-3 p-3 hover:bg-slate-50/70 transition-colors ${selectedSubIds.includes(sub.id) ? "bg-blue-50/40" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSubIds.includes(sub.id)}
                            onChange={() => toggleSelect(sub.id)}
                            className="mt-1 rounded border-slate-300 text-blue-600 cursor-pointer"
                          />

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">{sub.reportType}</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(sub.status)}`}>
                                {statusIcon(sub.status)}
                                {sub.status}
                              </span>
                              {(sub.duplicateScore || 0) > 0 && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${(sub.duplicateScore || 0) < 10 ? "bg-emerald-50 text-emerald-700" : (sub.duplicateScore || 0) <= 25 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                                  {(sub.duplicateScore || 0) < 10 ? (
                                    <ShieldCheck className="w-3 h-3" />
                                  ) : (
                                    <ShieldAlert className="w-3 h-3" />
                                  )}
                                  Trùng lặp {sub.duplicateScore}%
                                </span>
                              )}
                              {sub.assetCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                                  {sub.assetCount} tài nguyên
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => void handleOpenDetail(sub)}
                              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 max-w-full"
                            >
                              <FileText className="w-3 h-3 shrink-0" />
                              <span className="truncate">{sub.fileName || "Không có tệp đính kèm"}</span>
                              {sub.fileName && sub.fileSize && (
                                <span className="text-slate-500 text-[11px] shrink-0">({sub.fileSize})</span>
                              )}
                            </button>

                            <p className="text-[11px] text-slate-500">
                              Nộp lúc <strong className="text-slate-700">{sub.time}</strong> ngày {sub.date}
                              {sub.lecturerNote && (
                                <>
                                  {" · "}
                                  <span className="italic">&ldquo;{sub.lecturerNote}&rdquo;</span>
                                </>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => void handleOpenDetail(sub)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors border border-slate-200/60"
                              title="Xem chi tiết bài nộp"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                            </button>

                            {sub.status !== "Đã duyệt" && (
                              <button
                                onClick={() => void handleApproveRow(sub)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-2xs transition-colors flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Duyệt</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination theo NHÓM sinh viên */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Hiển thị {studentGroups.length === 0 ? 0 : (visibleGroupPage - 1) * groupPageSize + 1}
              –{Math.min(visibleGroupPage * groupPageSize, studentGroups.length)} / {studentGroups.length} sinh viên
            </span>
            <select
              value={groupPageSize}
              onChange={(event) => {
                setGroupPageSize(Number(event.target.value));
                setGroupPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded-md bg-white font-medium text-slate-700 outline-none"
              aria-label="Số sinh viên mỗi trang"
            >
              <option value={5}>5 sinh viên / trang</option>
              <option value={10}>10 sinh viên / trang</option>
              <option value={20}>20 sinh viên / trang</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setGroupPage((page) => Math.max(1, page - 1))}
              disabled={visibleGroupPage === 1}
              className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="min-w-16 text-center font-semibold text-slate-700">
              {visibleGroupPage} / {groupTotalPages}
            </span>
            <button
              type="button"
              onClick={() => setGroupPage((page) => Math.min(groupTotalPages, page + 1))}
              disabled={visibleGroupPage === groupTotalPages}
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
                    Sinh viên: {selectedSubmission.studentName} • MSSV: {selectedSubmission.mssv}
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
                    <span className="text-slate-500 text-[11px]">{selectedSubmission.company}</span>
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
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${selectedSubmission.status === "Đã duyệt" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                  >
                    {selectedSubmission.status}
                  </span>
                </div>
              </div>

              {/* Summary Section */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block text-xs">Tóm tắt nội dung bài nộp:</label>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-md text-slate-700 leading-relaxed font-medium">
                  {selectedSubmission.summary || "Chưa có bản tóm tắt nội dung bổ sung."}
                </div>
              </div>

              {/* Document File Card */}
              <div className="p-3.5 bg-blue-50/60 rounded-md border border-blue-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block truncate">
                      {selectedSubmission.assets?.length
                        ? `${selectedSubmission.assets.length} tài nguyên đính kèm`
                        : selectedSubmission.fileUrl || "Chưa có file đính kèm"}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {selectedSubmission.assets?.length
                        ? selectedSubmission.assets
                            .map((asset) => asset.label || asset.fileName || asset.fileUrl)
                            .join(" • ")
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
