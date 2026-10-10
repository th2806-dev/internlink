import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  Package,
  FileCode,
  Database,
  FileText,
  Video,
  Presentation,
  Upload,
  Download,
  ExternalLink,
  RefreshCw,
  Send,
  Plus,
  ShieldAlert,
  MessageSquare,
  BookOpen,
  Building2,
  Loader2,
  X,
  Trash2,
} from "lucide-react";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { useSemester } from "../../../contexts/SemesterContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { mapStudentSubmissionToUpload } from "../../../lib/portalMappers";
import { submissionApiService } from "../../../services/submissionApi.service";
import {
  semesterReportScheduleService,
  type SupplementalDeadline,
} from "../../../services/semesterReportSchedule.service";
import type { SubmissionDto } from "../../../types/api";
import { StudentSubPageHeader } from "../components/StudentSubPageHeader";

type UploadItem = {
  id: string;
  title: string;
  category: string;
  fileType: string;
  size: string;
  version: string;
  uploadDate: string;
  status: string;
  notes: string;
  fileUrl?: string;
  assetId?: string;
};

type SubmissionLink = { label: string; url: string };

function mapSubmissionResources(submission: SubmissionDto): UploadItem[] {
  const base = mapStudentSubmissionToUpload(submission);
  const status =
    submission.status === "Approved"
      ? "Đã duyệt"
      : submission.status === "RevisionRequested"
        ? "Cần chỉnh sửa"
        : submission.status === "Rejected"
          ? "Không đạt yêu cầu"
          : submission.status === "Submitted" || submission.status === "Reviewed"
            ? "Chờ duyệt"
            : base.status;
  const assets = submission.assets ?? [];
  if (assets.length === 0) {
    return submission.fileUrl || submission.fileName
      ? [{ ...base, status }]
      : [];
  }

  return assets.map((asset) => ({
    ...base,
    title: asset.label || asset.fileName || base.title,
    fileType:
      asset.assetType === "link"
        ? "Liên kết"
        : asset.fileName?.split(".").pop()?.toUpperCase() || "Tệp",
    size: asset.fileSize
      ? asset.fileSize < 1024 * 1024
        ? `${Math.round(asset.fileSize / 1024)} KB`
        : `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB`
      : "—",
    uploadDate: asset.uploadedAt
      ? new Date(asset.uploadedAt).toLocaleDateString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
        })
      : base.uploadDate,
    status,
    fileUrl: asset.fileUrl ?? base.fileUrl,
    assetId: asset.id,
  }));
}

export const SubmissionsView: React.FC<{
  onShowToast?: (msg: string, type?: "success" | "error" | "info" | string) => void;
}> = ({ onShowToast }) => {
  const navigate = useNavigate();
  const { profile, internshipId, refresh: refreshProfile } = useStudentPortal();
  const { selectedSemester, selectedSemesterId } = useSemester();

  const [evidenceDeadline, setEvidenceDeadline] = useState<SupplementalDeadline | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [rawSubmissions, setRawSubmissions] = useState<SubmissionDto[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSubmissions = useCallback(async (notifyOnError = true) => {
    setLoadError(null);
    try {
      setIsLoading(true);
      const rows = await submissionApiService.getMine();
      setRawSubmissions(rows);
      setUploads(rows.flatMap(mapSubmissionResources));
      return true;
    } catch (err) {
      const message = getApiErrorMessage(err);
      setLoadError(message);
      if (notifyOnError) onShowToast?.(message, "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
      await loadSubmissions();
      onShowToast?.("Đã làm mới danh sách hồ sơ & sản phẩm thực tập", "success");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!selectedSemesterId || selectedSemesterId === "all") {
      setEvidenceDeadline(null);
      return;
    }
    void semesterReportScheduleService
      .getEvidenceDeadline(selectedSemesterId)
      .then(setEvidenceDeadline)
      .catch(() => setEvidenceDeadline(null));
  }, [selectedSemesterId]);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<UploadItem | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<"FinalReport" | "Product" | "Evidence">("FinalReport");
  const [uploadNotes, setUploadNotes] = useState("");
  const [employerScore, setEmployerScore] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadLinks, setUploadLinks] = useState<SubmissionLink[]>([
    { label: "", url: "" },
  ]);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancellingSubmissionId, setCancellingSubmissionId] = useState<string | null>(null);
  const [contactMsg, setContactMsg] = useState("");

  const evidenceWindowOpen = Boolean(
    evidenceDeadline &&
      Date.now() >= new Date(evidenceDeadline.startDate).getTime() &&
      Date.now() <= new Date(evidenceDeadline.endDate).getTime(),
  );

  const employerScoreValue = Number(employerScore);
  const employerScoreValid =
    employerScore.trim() !== "" &&
    Number.isFinite(employerScoreValue) &&
    employerScoreValue >= 0 &&
    employerScoreValue <= 10;
  const hasEmployerImage = uploadFiles.some((file) =>
    /\.(png|jpe?g|webp|gif)$/i.test(file.name),
  );
  const hasRequiredUploadFile =
    uploadCategory === "FinalReport"
      ? uploadFiles.length > 0
      : uploadCategory !== "Evidence" || hasEmployerImage;
  const validUploadLinks = uploadLinks.filter((link) => link.url.trim());
  const hasAnyResource = uploadFiles.length > 0 || validUploadLinks.length > 0;

  const latestSubmissionOfType = (type: string) =>
    rawSubmissions
      .filter((submission) => submission.type.toLowerCase() === type.toLowerCase())
      .sort(
        (first, second) =>
          new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime(),
      )[0];

  const finalReport = latestSubmissionOfType("FinalReport");
  const productSubmission = latestSubmissionOfType("Product");
  const employerEvidence = latestSubmissionOfType("Evidence");
  const pendingProductSubmissions = rawSubmissions
    .filter((submission) =>
      submission.type.toLowerCase() === "product" &&
      (submission.status === "Submitted" || submission.status === "Reviewed"),
    )
    .sort(
      (first, second) =>
        new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime(),
    );

  const isRevisionRequested = (submission?: SubmissionDto) =>
    submission?.status === "RevisionRequested";
  const canCancelSubmission = (submission?: SubmissionDto) =>
    submission?.status === "Submitted" || submission?.status === "Reviewed";

  const handleCancelSubmission = async (submission: SubmissionDto) => {
    if (!canCancelSubmission(submission) || cancellingSubmissionId) return;
    if (!window.confirm(`Bạn có chắc muốn hủy nộp "${submission.title || "hồ sơ"}"? Tệp đã tải lên sẽ bị xóa.`)) {
      return;
    }

    setCancellingSubmissionId(submission.id);
    try {
      await submissionApiService.cancel(submission.id);
      setRawSubmissions((current) => current.filter((item) => item.id !== submission.id));
      setUploads((current) => current.filter((item) => item.id !== submission.id));
      onShowToast?.("Đã hủy nộp hồ sơ và xóa tệp tải lên.", "success");
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    } finally {
      setCancellingSubmissionId(null);
    }
  };

  const renderCancelButton = (submission: SubmissionDto) => (
    <button
      type="button"
      onClick={() => void handleCancelSubmission(submission)}
      disabled={cancellingSubmissionId !== null}
      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={`Hủy nộp ${submission.title || "hồ sơ"}`}
    >
      {cancellingSubmissionId === submission.id
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
      {cancellingSubmissionId === submission.id ? "Đang hủy..." : "Hủy nộp"}
    </button>
  );

  const getSubmissionState = (submission?: SubmissionDto) => {
    if (!submission) return "Chưa nộp";
    if (submission.status === "RevisionRequested") return "Cần bổ sung";
    if (submission.status === "Rejected") return "Không đạt yêu cầu";
    if (submission.status === "Approved") return "Đã duyệt";
    if (submission.status === "Submitted" || submission.status === "Reviewed") return "Chờ duyệt";
    return "Đã nộp";
  };

  const evidenceWindowMessage = evidenceDeadline
    ? Date.now() < new Date(evidenceDeadline.startDate).getTime()
      ? `Mở nhận từ ${new Date(evidenceDeadline.startDate).toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
        })}`
      : evidenceWindowOpen
      ? `Đang nhận đến ${new Date(evidenceDeadline.endDate).toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
        })}`
      : `Đã đóng từ ${new Date(evidenceDeadline.endDate).toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
        })}`
    : "Admin khoa chưa cấu hình thời hạn";

  const evidenceWindowStatus = !evidenceDeadline
    ? "Chưa cấu hình"
    : evidenceWindowOpen
    ? "Đang nhận"
    : Date.now() < new Date(evidenceDeadline.startDate).getTime()
    ? "Chưa mở"
    : "Đã đóng";

  const requirements = useMemo(
    () =>
      rawSubmissions
        .filter((s) => s.status === "RevisionRequested")
        .map((s) => {
          const publicFeedbacks = (s.feedbacks ?? []).filter((f) => f.isPublic);
          const fb =
            publicFeedbacks.length > 0
              ? publicFeedbacks[publicFeedbacks.length - 1]
              : undefined;
          return {
            id: s.id,
            title: s.title ?? "Yêu cầu chỉnh sửa sản phẩm",
            detail:
              fb?.comment ?? s.description ?? "Giảng viên yêu cầu chỉnh sửa bản nộp.",
            deadline: "—",
            priority: "Cao",
            status: "Chưa xong",
          };
        }),
    [rawSubmissions],
  );

  const openUploadFor = (category: "FinalReport" | "Product" | "Evidence") => {
    setUploadCategory(category);
    setUploadTitle(
      category === "FinalReport"
        ? "Báo cáo thực tập tốt nghiệp"
        : category === "Evidence"
        ? "Phiếu đánh giá doanh nghiệp"
        : "Sản phẩm thực tế",
    );
    setEmployerScore("");
    setUploadFiles([]);
    setUploadLinks([{ label: "", url: "" }]);
    setShowUploadModal(true);
  };

  const openRevisionUpload = (submission?: SubmissionDto) => {
    if (!submission) return;
    const item = mapStudentSubmissionToUpload(submission);
    setReplaceTarget(item);
    setUploadNotes(item.notes || "");
    setReplaceFile(null);
  };

  const handleAddUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const title =
      uploadTitle.trim() ||
      (uploadCategory === "FinalReport"
        ? "Báo cáo thực tập tốt nghiệp"
        : uploadCategory === "Evidence"
        ? "Minh chứng thực tập"
        : "Sản phẩm thực tế");

    if (!title) {
      onShowToast?.("Vui lòng nhập tên sản phẩm!", "error");
      return;
    }

    if (!internshipId) {
      onShowToast?.("Chưa có kỳ thực tập được gán. Vui lòng liên hệ phòng đào tạo.", "error");
      return;
    }
    if (uploadCategory === "Evidence" && !evidenceWindowOpen) {
      onShowToast?.("Minh chứng chỉ được nộp trong thời hạn do khoa cấu hình.", "error");
      return;
    }

    if (uploadCategory === "Evidence") {
      const score = Number(employerScore);
      if (
        !employerScore.trim() ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > 10
      ) {
        onShowToast?.("Vui lòng nhập điểm đánh giá doanh nghiệp từ 0 đến 10.", "error");
        return;
      }
      if (!uploadFiles.some((file) => /\.(png|jpe?g|webp|gif)$/i.test(file.name))) {
        onShowToast?.("Vui lòng đính kèm ảnh phiếu xác nhận của doanh nghiệp.", "error");
        return;
      }
    }
    if (uploadCategory === "FinalReport" && uploadFiles.length === 0) {
      onShowToast?.("Vui lòng đính kèm tệp báo cáo cuối kỳ.", "error");
      return;
    }
    const links = validUploadLinks;
    if (uploadFiles.length === 0 && links.length === 0) {
      onShowToast?.("Vui lòng chọn ít nhất một tệp hoặc thêm một liên kết!", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await submissionApiService.bundle({
        internshipId,
        type: uploadCategory,
        title,
        description: uploadNotes.trim() || undefined,
        employerScore:
          uploadCategory === "Evidence" ? Number(employerScore) : undefined,
        files: uploadFiles,
        links: links.map((link) => ({
          label: link.label.trim(),
          url: link.url.trim(),
        })),
      });
      setUploads((prev) => [
        ...mapSubmissionResources(created),
        ...prev.filter((item) => item.id !== created.id),
      ]);
      setRawSubmissions((prev) => [
        created,
        ...prev.filter((item) => item.id !== created.id),
      ]);
      setShowUploadModal(false);
      setUploadTitle("");
      setUploadNotes("");
      setEmployerScore("");
      setUploadFiles([]);
      setUploadLinks([{ label: "", url: "" }]);
      const refreshed = await loadSubmissions(false);
      onShowToast?.(
        refreshed
          ? uploadCategory === "Evidence"
            ? "Đã nộp điểm và ảnh phiếu đánh giá doanh nghiệp thành công."
            : uploadCategory === "FinalReport"
              ? "Đã nộp báo cáo cuối kỳ thành công."
              : `Đã nộp sản phẩm cùng ${uploadFiles.length + links.length} tài nguyên.`
          : "Đã nộp thành công nhưng chưa thể làm mới danh sách. Vui lòng thử tải lại.",
        refreshed ? "success" : "info",
      );
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplaceFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceTarget) return;

    if (!replaceFile) {
      onShowToast?.("Vui lòng chọn tệp thay thế!", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await submissionApiService.resubmitUpload(replaceTarget.id, {
        description: uploadNotes.trim() || replaceTarget.notes || undefined,
        file: replaceFile,
      });
      setUploads((prev) => [
        ...mapSubmissionResources(updated),
        ...prev.filter((item) => item.id !== replaceTarget.id),
      ]);
      setRawSubmissions((prev) =>
        prev.map((item) => (item.id === replaceTarget.id ? updated : item)),
      );
      onShowToast?.(`Đã nộp lại tệp: ${replaceTarget.title} thành công`, "success");
      setReplaceTarget(null);
      setUploadNotes("");
      setReplaceFile(null);
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadUpload = async (item: UploadItem) => {
    if (item.fileUrl && /^https?:\/\//i.test(item.fileUrl)) {
      window.open(item.fileUrl, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      await (item.assetId
        ? submissionApiService.downloadAsset(item.id, item.assetId, item.title)
        : submissionApiService.download(item.id, item.title));
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    }
  };

  const handleSendContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMsg.trim()) return;
    setShowContactModal(false);
    setContactMsg("");
    onShowToast?.("Đã gửi tin nhắn đến Giảng viên hướng dẫn thành công!", "success");
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Source Code":
        return <FileCode className="w-4 h-4 text-blue-600" />;
      case "Slide":
        return <Presentation className="w-4 h-4 text-amber-600" />;
      case "Video Demo":
        return <Video className="w-4 h-4 text-rose-600" />;
      case "User Manual":
        return <BookOpen className="w-4 h-4 text-blue-600" />;
      case "Database Backup":
        return <Database className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      {/* 1. TOP CARD BANNER (Chuẩn layout banner xanh #026aa7 + thông tin thực tế) */}
      <div className="space-y-3">
        <StudentSubPageHeader
          icon={Package}
          title="Hồ sơ & sản phẩm thực tập"
          subtitle="Quản lý hồ sơ và sản phẩm đã nộp trong kỳ thực tập."
          semesterName={selectedSemester?.name}
          onRefresh={() => void handleRefresh()}
          isRefreshing={isRefreshing}
        >
          <button
            type="button"
            onClick={() => openUploadFor("Product")}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Nộp sản phẩm mới</span>
          </button>
        </StudentSubPageHeader>


      </div>
      {/* 2. 4 THẺ THAO TÁC THEO DANH MỤC HỒ SƠ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* THẺ 1: BÁO CÁO TUẦN */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-blue-700">
              <CalendarDays className="h-4 w-4" />
              <h3 className="text-sm font-bold text-slate-900">Báo cáo tuần</h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Nộp nhật ký và báo cáo theo từng tuần thực tập, theo dõi phản hồi và rubric chấm điểm.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/student/weekly-reports")}
            className="w-full py-2 px-3 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold text-xs rounded-lg transition-colors border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" /> Mở trang Báo cáo tuần
          </button>
        </div>

        {/* THẺ 2: BÁO CÁO CUỐI KỲ */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#026aa7]">
                <FileCheck2 className="h-4 w-4" />
                <h3 className="text-sm font-bold text-slate-900">Báo cáo cuối kỳ</h3>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  finalReport
                    ? isRevisionRequested(finalReport) || finalReport.status === "Rejected"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : finalReport.status === "Approved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-sky-50 text-sky-700 border-sky-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {getSubmissionState(finalReport)}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Tệp báo cáo thực tập tốt nghiệp chính thức (.pdf / .docx). Đây là hồ sơ bắt buộc tốt nghiệp.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              isRevisionRequested(finalReport)
                ? openRevisionUpload(finalReport)
                : openUploadFor("FinalReport")
            }
            disabled={!internshipId || Boolean(finalReport && !isRevisionRequested(finalReport))}
            className="w-full py-2 px-3 bg-[#026aa7] hover:bg-[#025a8f] text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            {isRevisionRequested(finalReport)
              ? "Nộp bản chỉnh sửa"
              : finalReport
              ? "Đã hoàn thành nộp"
              : "Nộp báo cáo cuối kỳ"}
          </button>
          {canCancelSubmission(finalReport) && renderCancelButton(finalReport!)}
        </div>

        {/* THẺ 3: SẢN PHẨM THỰC TẾ */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-700">
                <Package className="h-4 w-4" />
                <h3 className="text-sm font-bold text-slate-900">Sản phẩm thực tế</h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                productSubmission?.status === "Approved"
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : productSubmission?.status === "Rejected"
                    ? "text-rose-700 bg-rose-50 border-rose-200"
                    : "text-slate-500 bg-slate-100 border-slate-200"
              }`}>
                {productSubmission ? getSubmissionState(productSubmission) : "Tùy chọn"}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Source code, slide, ảnh, video hoặc link GitHub/website. Tệp đính kèm không bắt buộc nếu đã có liên kết. Chỉ sản phẩm được duyệt mới được cộng 1 điểm.
            </p>
          </div>
          {pendingProductSubmissions.length > 0 && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
              <p className="text-[11px] font-semibold text-amber-900">
                {pendingProductSubmissions.length} sản phẩm đang chờ duyệt
              </p>
              {pendingProductSubmissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs text-slate-700">
                    {submission.title || "Sản phẩm thực tế"}
                  </span>
                  {renderCancelButton(submission)}
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => openUploadFor("Product")}
            disabled={!internshipId}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm sản phẩm
          </button>
        </div>

        {/* THẺ 4: ĐÁNH GIÁ DOANH NGHIỆP */}
        <div
          className={`rounded-xl border p-4 shadow-2xs flex flex-col justify-between space-y-3 ${
            evidenceWindowOpen
              ? "border-emerald-300 bg-white"
              : "border-slate-200/90 bg-white"
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-700">
                <ClipboardCheck className="h-4 w-4" />
                <h3 className="text-sm font-bold text-slate-900">Đánh giá DN</h3>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  employerEvidence
                    ? isRevisionRequested(employerEvidence)
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : evidenceWindowOpen
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {employerEvidence
                  ? getSubmissionState(employerEvidence)
                  : evidenceWindowStatus}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Nhập điểm đánh giá doanh nghiệp và tải ảnh phiếu xác nhận chính thức có mộc.
            </p>
            <p className="text-[10.5px] text-slate-400 font-medium truncate">
              {evidenceWindowMessage}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              isRevisionRequested(employerEvidence)
                ? openRevisionUpload(employerEvidence)
                : openUploadFor("Evidence")
            }
            disabled={
              !internshipId ||
              !evidenceWindowOpen ||
              Boolean(employerEvidence && !isRevisionRequested(employerEvidence))
            }
            className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            {isRevisionRequested(employerEvidence)
              ? "Bổ sung minh chứng"
              : employerEvidence
              ? "Đã nộp đánh giá"
              : "Nộp đánh giá doanh nghiệp"}
          </button>
          {canCancelSubmission(employerEvidence) && renderCancelButton(employerEvidence!)}
        </div>
      </div>

      {/* 4. MAIN WORKSPACE: BẢNG HỒ SƠ & CỘT GÓP Ý GIẢNG VIÊN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CỘT TRÁI (2/3): HỒ SƠ ĐÃ NỘP */}
        <div className="lg:col-span-2 space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#026aa7]" />
                <h3 className="text-sm font-bold text-slate-800">
                  Danh sách hồ sơ & sản phẩm đã nộp
                </h3>
              </div>
              <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200">
                {uploads.length} tài nguyên đã nộp
              </span>
            </div>
            {isLoading && uploads.length > 0 && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs text-slate-500"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#026aa7]" aria-hidden="true" />
                Đang cập nhật danh sách...
              </div>
            )}
            {loadError && uploads.length > 0 && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900"
              >
                <span>Không thể làm mới danh sách: {loadError}. Đang giữ dữ liệu đã tải trước đó.</span>
                <button
                  type="button"
                  onClick={() => void loadSubmissions()}
                  className="font-bold underline underline-offset-2"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Tên hồ sơ / Sản phẩm</th>
                    <th className="py-3 px-4 w-28">Loại hồ sơ</th>
                    <th className="py-3 px-4 w-28">Trạng thái</th>
                    <th className="py-3 px-4 text-right w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading && uploads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#026aa7] mb-2" />
                        Đang tải danh sách hồ sơ...
                      </td>
                    </tr>
                  ) : loadError && uploads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-rose-700">
                        <p role="alert">{loadError}</p>
                        <button
                          type="button"
                          onClick={() => void loadSubmissions()}
                          className="mt-2 font-bold text-[#026aa7] underline underline-offset-2"
                        >
                          Thử tải lại
                        </button>
                      </td>
                    </tr>
                  ) : uploads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        Chưa có tài nguyên nào được nộp.
                      </td>
                    </tr>
                  ) : (
                    uploads.map((item) => (
                      <tr key={`${item.id}:${item.assetId ?? "root"}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 shrink-0">
                              {getCategoryIcon(item.category)}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 line-clamp-1">
                                {item.title}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {item.version} • {item.fileType} • {item.size} •{" "}
                                {item.uploadDate}
                              </p>
                              {item.notes && (
                                <p className="text-[10.5px] text-slate-600 mt-1 italic line-clamp-1">
                                  "{item.notes}"
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                          {item.category}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 text-[10.5px] font-bold rounded-md border ${
                              item.status === "Đã duyệt"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : item.status === "Cần chỉnh sửa"
                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                : "bg-sky-50 text-sky-800 border-sky-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleDownloadUpload(item)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                              title={item.fileType === "Liên kết" ? "Mở liên kết" : "Tải về"}
                              aria-label={`${item.fileType === "Liên kết" ? "Mở liên kết" : "Tải về"}: ${item.title}`}
                            >
                              {item.fileType === "Liên kết"
                                ? <ExternalLink className="w-4 h-4" />
                                : <Download className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {isLoading && uploads.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-[#026aa7]" />
                  Đang tải danh sách hồ sơ...
                </p>
              ) : loadError && uploads.length === 0 ? (
                <div className="py-8 text-center text-xs text-rose-700">
                  <p role="alert">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => void loadSubmissions()}
                    className="mt-2 font-bold text-[#026aa7] underline underline-offset-2"
                  >
                    Thử tải lại
                  </button>
                </div>
              ) : uploads.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  Chưa có tài nguyên nào được nộp.
                </p>
              ) : (
                uploads.map((item) => (
                  <div key={`${item.id}:${item.assetId ?? "root"}`} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(item.category)}
                        <h4 className="font-bold text-xs text-slate-800">{item.title}</h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          item.status === "Đã duyệt"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : item.status === "Cần chỉnh sửa"
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-sky-50 text-sky-800 border-sky-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {item.category} • {item.size} • {item.uploadDate}
                    </p>
                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => void handleDownloadUpload(item)}
                        className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1"
                      >
                        {item.fileType === "Liên kết"
                          ? <ExternalLink className="w-3.5 h-3.5" />
                          : <Download className="w-3.5 h-3.5" />}
                        {item.fileType === "Liên kết" ? "Mở liên kết" : "Tải về"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (1/3): GÓP Ý CỦA GV & THÔNG TIN HƯỚNG DẪN */}
        <div className="lg:col-span-1 space-y-4">
          {/* GÓP Ý TỪ GIẢNG VIÊN */}
          <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" /> Góp ý từ Giảng viên
            </h3>

            <div className="space-y-2.5 text-xs">
              {requirements.length === 0 ? (
                <p className="text-slate-400 py-6 text-center text-xs">
                  Không có yêu cầu chỉnh sửa từ giảng viên
                </p>
              ) : (
                requirements.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{req.title}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                        {req.status}
                      </span>
                    </div>
                    <p className="text-slate-700 font-medium leading-relaxed italic">
                      "{req.detail}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* THÔNG TIN DOANH NGHIỆP & GVHD */}
          <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" /> Đơn vị & Người hướng dẫn
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Doanh nghiệp tiếp nhận
                </span>
                <p className="font-bold text-slate-900">
                  {profile.company && profile.company !== "—"
                    ? profile.company
                    : "Chưa phân công"}
                </p>
                <p className="text-[11px] text-slate-500">
                  Vị trí: {profile.position && profile.position !== "—" ? profile.position : "Thực tập sinh"}
                </p>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/70 space-y-1">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Giảng viên hướng dẫn
                </span>
                <p className="font-bold text-slate-900">
                  {profile.lecturerName && profile.lecturerName !== "—"
                    ? profile.lecturerName
                    : "Chưa phân công"}
                </p>
                <button
                  type="button"
                  onClick={() => setShowContactModal(true)}
                  className="mt-1 text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="w-3 h-3" /> Gửi tin nhắn trao đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddUpload}
            className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                {uploadCategory === "FinalReport"
                  ? "Nộp báo cáo cuối kỳ"
                  : uploadCategory === "Evidence"
                  ? "Nộp đánh giá doanh nghiệp"
                  : "Nộp sản phẩm thực tế"}
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <p className="text-xs font-bold text-slate-800">
                  {uploadCategory === "FinalReport"
                    ? "Báo cáo thực tập tốt nghiệp"
                    : uploadCategory === "Evidence"
                    ? "Phiếu đánh giá / xác nhận của doanh nghiệp"
                    : "Sản phẩm thực tế"}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  {uploadCategory === "FinalReport"
                    ? "Nộp file báo cáo tổng kết cuối kỳ của đợt thực tập."
                    : uploadCategory === "Evidence"
                    ? "Nhập điểm doanh nghiệp và tải ảnh chụp phiếu có mộc đỏ. Điểm chỉ để giảng viên tham khảo."
                    : "Tải tài liệu, slide, source code hoặc liên kết triển khai."}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên hồ sơ</label>
                <input
                  type="text"
                  placeholder={
                    uploadCategory === "Evidence"
                      ? "Phiếu đánh giá doanh nghiệp"
                      : uploadCategory === "Product"
                      ? "Tên sản phẩm thực tế"
                      : "Báo cáo thực tập tốt nghiệp"
                  }
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium focus:border-blue-500 focus:bg-white"
                />
              </div>

              {uploadCategory === "Evidence" && (
                <div className="space-y-3">
                  <div
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      evidenceWindowOpen
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {evidenceDeadline
                      ? `Thời hạn: ${new Date(evidenceDeadline.startDate).toLocaleString(
                          "vi-VN",
                        )} – ${new Date(evidenceDeadline.endDate).toLocaleString("vi-VN")}${
                          evidenceWindowOpen
                            ? " • Đang mở"
                            : " • Chưa mở hoặc đã kết thúc"
                        }`
                      : "Admin khoa chưa cấu hình deadline nộp minh chứng."}
                  </div>
                  <label className="block space-y-1 text-xs font-bold text-slate-700">
                    Điểm đánh giá của doanh nghiệp (thang điểm 0–10) *
                    <input
                      required
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={employerScore}
                      onChange={(event) => setEmployerScore(event.target.value)}
                      placeholder="Ví dụ: 9.5"
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                    />
                    <span className="block font-normal text-slate-500 text-[11px]">
                      Điểm này để giảng viên tham khảo, không cộng trực tiếp vào điểm tổng kết.
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {uploadCategory === "Product" ? "Tệp đính kèm (không bắt buộc)" : "Chọn tệp đính kèm"}
                </label>
                <label className="border-2 border-dashed border-slate-300 bg-slate-50/60 p-4 text-center rounded-xl hover:border-blue-400 transition-colors cursor-pointer space-y-1 block">
                  <input
                    type="file"
                    multiple
                    accept={
                      uploadCategory === "Evidence"
                        ? "image/jpeg,image/png,image/webp,image/gif"
                        : uploadCategory === "FinalReport"
                        ? ".pdf,.doc,.docx"
                        : undefined
                    }
                    className="hidden"
                    onChange={(e) => setUploadFiles(Array.from(e.target.files ?? []))}
                  />
                  <Upload className="w-5 h-5 text-blue-600 mx-auto" />
                  <p className="font-bold text-slate-800 text-xs">
                    {uploadFiles.length > 0
                      ? uploadFiles.map((file) => file.name).join(", ")
                      : uploadCategory === "Evidence"
                      ? "Chọn ảnh phiếu xác nhận (JPG, PNG...)"
                      : "Chọn tệp trên thiết bị"}
                  </p>
                  <p className="break-words text-[11px] font-medium text-slate-500">
                    {uploadCategory === "FinalReport"
                      ? "Tệp báo cáo PDF hoặc Word (bắt buộc)"
                      : uploadCategory === "Evidence"
                      ? "Ảnh phiếu đánh giá có chữ ký/mộc của doanh nghiệp (bắt buộc)"
                      : "Không bắt buộc nếu đã thêm liên kết; có thể chọn nhiều tệp"}
                  </p>
                </label>
              </div>

              {uploadCategory !== "Evidence" && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">
                      Liên kết sản phẩm (nếu có)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setUploadLinks((prev) => [...prev, { label: "", url: "" }])
                      }
                      className="text-blue-600 font-bold hover:text-blue-800 cursor-pointer"
                    >
                      + Thêm link
                    </button>
                  </div>
                  <div className="space-y-2">
                    {uploadLinks.map((link, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]"
                      >
                        <input
                          type="text"
                          placeholder="Nhãn (VD: GitHub, Web Demo)"
                          value={link.label}
                          onChange={(e) =>
                            setUploadLinks((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, label: e.target.value } : item,
                              ),
                            )
                          }
                          className="min-w-0 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium focus:border-blue-500 focus:bg-white"
                        />
                        <input
                          type="url"
                          placeholder="https://..."
                          value={link.url}
                          onChange={(e) =>
                            setUploadLinks((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, url: e.target.value } : item,
                              ),
                            )
                          }
                          className="min-w-0 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium focus:border-blue-500 focus:bg-white"
                        />
                        {uploadLinks.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setUploadLinks((prev) => prev.filter((_, i) => i !== index))
                            }
                            className="px-2 text-slate-400 hover:text-rose-600 cursor-pointer"
                            aria-label="Xóa liên kết"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú kèm theo
                </label>
                <textarea
                  rows={2}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Ghi chú tóm tắt nội dung hồ sơ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  (uploadCategory === "Evidence" &&
                    (!evidenceWindowOpen || !employerScoreValid || !hasEmployerImage)) ||
                  (uploadCategory === "FinalReport" && !hasRequiredUploadFile) ||
                  (uploadCategory === "Product" && !hasAnyResource)
                }
                className="px-4 py-2 bg-[#026aa7] hover:bg-[#025a8f] text-white font-bold text-xs rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting
                  ? "Đang nộp..."
                  : uploadCategory === "Evidence"
                  ? "Nộp điểm & ảnh phiếu"
                  : uploadCategory === "FinalReport"
                  ? "Nộp báo cáo cuối kỳ"
                  : "Nộp sản phẩm"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REPLACE FILE MODAL */}
      {replaceTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleReplaceFile}
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-600" /> Thay thế tệp sản phẩm
              </h3>
              <button
                type="button"
                onClick={() => setReplaceTarget(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-blue-50 text-blue-900 rounded-lg font-bold border border-blue-200">
                Đang thay thế: {replaceTarget.title} ({replaceTarget.version})
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn tệp mới
                </label>
                <label className="border-2 border-dashed border-amber-300 bg-amber-50/40 p-4 text-center rounded-xl hover:bg-amber-50 transition-colors cursor-pointer space-y-1 block">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
                  />
                  <Upload className="w-5 h-5 text-amber-600 mx-auto" />
                  <p className="font-bold text-amber-900 text-xs">
                    {replaceFile?.name || "Bấm để chọn tệp thay thế"}
                  </p>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú chỉnh sửa
                </label>
                <textarea
                  rows={2}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Mô tả điểm chỉnh sửa..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReplaceTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Đang nộp lại..." : "Lưu thay thế"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONTACT LECTURER MODAL */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSendContact}
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" /> Trao đổi với Giảng viên
              </h3>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800">
                Người nhận: {profile.lecturerName || "Giảng viên hướng dẫn"}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nội dung tin nhắn *
                </label>
                <textarea
                  rows={4}
                  required
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  placeholder="Nhập nội dung thắc mắc về hồ sơ, sản phẩm thực tập..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#026aa7] hover:bg-[#025a8f] text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Gửi tin nhắn
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export { SubmissionsView as StudentSubmissionsView };
