import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Package,
  FileCode,
  Database,
  FileText,
  Video,
  Presentation,
  Upload,
  Download,
  RefreshCw,
  Send,
  Plus,
  ShieldAlert,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { useSemester } from "../../../contexts/SemesterContext";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { CompanyAvatar } from "../../../components/common/CompanyAvatar";
import { Toolbar } from "../../../components/common/Toolbar";
import { EmptyState } from "../../../components/common/EmptyState";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { mapStudentSubmissionToUpload } from "../../../lib/portalMappers";
import { submissionApiService } from "../../../services/submissionApi.service";
import { semesterReportScheduleService, type SupplementalDeadline } from "../../../services/semesterReportSchedule.service";
import type { SubmissionDto } from "../../../types/api";

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

export const SubmissionsView = ({ onShowToast }) => {
  const navigate = useNavigate();
  const { profile, internshipId } = useStudentPortal();
  const { selectedSemesterId } = useSemester();
  const [evidenceDeadline, setEvidenceDeadline] = useState<SupplementalDeadline | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [rawSubmissions, setRawSubmissions] = useState<SubmissionDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await submissionApiService.getMine();
        if (!cancelled) {
          setRawSubmissions(rows);
          setUploads(rows.map(mapStudentSubmissionToUpload));
        }
      } catch (err) {
        if (!cancelled) onShowToast?.(getApiErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onShowToast]);

  const requirements = useMemo(
    () =>
      rawSubmissions
        .filter((s) => s.status === "RevisionRequested")
        .map((s) => {
          const publicFeedbacks = (s.feedbacks ?? []).filter((f) => f.isPublic);
          const fb = publicFeedbacks.length > 0 ? publicFeedbacks[publicFeedbacks.length - 1] : undefined;
          return {
            id: s.id,
            title: s.title ?? "Yêu cầu chỉnh sửa sản phẩm",
            detail: fb?.comment ?? s.description ?? "Giảng viên yêu cầu chỉnh sửa bản nộp.",
            deadline: "—",
            priority: "Cao",
            status: "Chưa xong",
          };
        }),
    [rawSubmissions],
  );
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<UploadItem | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("FinalReport");
  const [uploadNotes, setUploadNotes] = useState("");
  const [employerScore, setEmployerScore] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadLinks, setUploadLinks] = useState<SubmissionLink[]>([
    { label: "", url: "" },
  ]);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactMsg, setContactMsg] = useState("");
  useEffect(() => {
    if (!selectedSemesterId || selectedSemesterId === "all") {
      setEvidenceDeadline(null);
      return;
    }
    void semesterReportScheduleService.getEvidenceDeadline(selectedSemesterId)
      .then(setEvidenceDeadline)
      .catch(() => setEvidenceDeadline(null));
  }, [selectedSemesterId]);

  const evidenceWindowOpen = Boolean(
    evidenceDeadline
      && Date.now() >= new Date(evidenceDeadline.startDate).getTime()
      && Date.now() <= new Date(evidenceDeadline.endDate).getTime(),
  );
  const employerScoreValue = Number(employerScore);
  const employerScoreValid = employerScore.trim() !== "" && Number.isFinite(employerScoreValue) && employerScoreValue >= 0 && employerScoreValue <= 10;
  const hasEmployerImage = uploadFiles.some((file) => /\.(png|jpe?g|webp|gif)$/i.test(file.name));
  const hasRequiredUploadFile = uploadCategory === "FinalReport"
    ? uploadFiles.length > 0
    : uploadCategory !== "Evidence" || hasEmployerImage;
  const latestSubmissionOfType = (type: string) => rawSubmissions
    .filter((submission) => submission.type.toLowerCase() === type.toLowerCase())
    .sort((first, second) => new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime())[0];
  const finalReport = latestSubmissionOfType("FinalReport");
  const productSubmission = latestSubmissionOfType("Product");
  const employerEvidence = latestSubmissionOfType("Evidence");
  const isRevisionRequested = (submission?: SubmissionDto) => submission?.status === "RevisionRequested";
  const getSubmissionState = (submission?: SubmissionDto) => {
    if (!submission) return "Chưa nộp";
    if (submission.status === "RevisionRequested") return "Cần bổ sung";
    if (submission.status === "Rejected") return "Bị từ chối";
    return "Đã nộp";
  };
  const evidenceWindowMessage = evidenceDeadline
    ? Date.now() < new Date(evidenceDeadline.startDate).getTime()
      ? `Mở nhận từ ${new Date(evidenceDeadline.startDate).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
      : evidenceWindowOpen
        ? `Đang nhận đến ${new Date(evidenceDeadline.endDate).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
        : `Đã đóng từ ${new Date(evidenceDeadline.endDate).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
    : "Admin khoa chưa cấu hình thời hạn";
  const evidenceWindowStatus = !evidenceDeadline
    ? "Chưa cấu hình"
    : evidenceWindowOpen
      ? "Đang nhận"
      : Date.now() < new Date(evidenceDeadline.startDate).getTime()
        ? "Chưa mở"
        : "Đã đóng";

  const openUploadFor = (category: "FinalReport" | "Product" | "Evidence") => {
    setUploadCategory(category);
    setUploadTitle(category === "FinalReport"
      ? "Báo cáo thực tập tốt nghiệp"
      : category === "Evidence" ? "Phiếu đánh giá doanh nghiệp" : "Sản phẩm thực tế");
    setEmployerScore("");
    setUploadFiles([]);
    setUploadLinks([{ label: "", url: "" }]);
    setShowUploadModal(true);
  };
  const openRevisionUpload = (submission?: SubmissionDto) => {
    if (!submission) return;
    const item = uploads.find((upload) => upload.id === submission.id);
    if (!item) return;
    setReplaceTarget(item);
    setUploadNotes(item.notes || "");
    setReplaceFile(null);
  };

  const handleAddUpload = async (e) => {
    e.preventDefault();
    const title = uploadTitle.trim() || (uploadCategory === "FinalReport"
      ? "Báo cáo thực tập tốt nghiệp"
      : uploadCategory === "Evidence" ? "Minh chứng thực tập" : "Sản phẩm thực tế");
    if (!title) {
      onShowToast("Vui lòng nhập tên sản phẩm!");
      return;
    }

    if (!internshipId) {
      onShowToast("Chưa có kỳ thực tập được gán. Vui lòng liên hệ phòng đào tạo.");
      return;
    }
    if (uploadCategory === "Evidence" && !evidenceWindowOpen) {
      onShowToast("Minh chứng chỉ được nộp trong thời hạn do giảng viên cấu hình.");
      return;
    }

    if (uploadCategory === "Evidence") {
      const score = Number(employerScore);
      if (!employerScore.trim() || !Number.isFinite(score) || score < 0 || score > 10) {
        onShowToast("Vui lòng nhập điểm đánh giá doanh nghiệp từ 0 đến 10.");
        return;
      }
      if (!uploadFiles.some((file) => /\.(png|jpe?g|webp|gif)$/i.test(file.name))) {
        onShowToast("Vui lòng đính kèm ảnh phiếu xác nhận của doanh nghiệp.");
        return;
      }
    }
    if (uploadCategory === "FinalReport" && uploadFiles.length === 0) {
      onShowToast("Vui lòng đính kèm tệp báo cáo cuối kỳ.");
      return;
    }
    const links = uploadLinks.filter((link) => link.url.trim());
    if (uploadFiles.length === 0 && links.length === 0) {
      onShowToast("Vui lòng chọn ít nhất một tệp hoặc thêm một liên kết!");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = [await submissionApiService.bundle({
        internshipId,
        type: uploadCategory,
        title,
        description: uploadNotes.trim() || undefined,
            employerScore: uploadCategory === "Evidence" ? Number(employerScore) : undefined,
        files: uploadFiles,
        links: links.map((link) => ({ label: link.label.trim(), url: link.url.trim() })),
      })];
      setUploads((prev) => [
        ...created.map(mapStudentSubmissionToUpload),
        ...prev,
      ]);
      setRawSubmissions((prev) => [...created, ...prev]);
      setShowUploadModal(false);
      onShowToast(uploadCategory === "Evidence"
        ? "Đã nộp điểm và ảnh phiếu đánh giá doanh nghiệp."
        : uploadCategory === "FinalReport"
          ? "Đã nộp báo cáo cuối kỳ."
          : `Đã nộp sản phẩm cùng ${uploadFiles.length + links.length} tài nguyên.`);
      setUploadTitle("");
      setUploadNotes("");
      setEmployerScore("");
      setUploadFiles([]);
      setUploadLinks([{ label: "", url: "" }]);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleReplaceFile = async (e) => {
    e.preventDefault();
    if (!replaceTarget) return;

    if (!replaceFile) {
      onShowToast("Vui lòng chọn tệp thay thế!");
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await submissionApiService.resubmitUpload(replaceTarget.id, {
        description: uploadNotes.trim() || replaceTarget.notes || undefined,
        file: replaceFile,
      });
      const mapped = mapStudentSubmissionToUpload(updated);
      setUploads((prev) =>
        prev.map((item) => (item.id === replaceTarget.id ? mapped : item)),
      );
      setRawSubmissions((prev) =>
        prev.map((item) => (item.id === replaceTarget.id ? updated : item)),
      );
      onShowToast(`Đã nộp lại tệp: ${replaceTarget.title}`);
      setReplaceTarget(null);
      setUploadNotes("");
      setReplaceFile(null);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
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
      onShowToast(getApiErrorMessage(err));
    }
  };
  const handleSendContact = (e) => {
    e.preventDefault();
    if (!contactMsg.trim()) return;
    setShowContactModal(false);
    setContactMsg("");
    onShowToast(
      "\u0110\xE3 g\u1EEDi tin nh\u1EAFn \u0111\u1EBFn Gi\u1EA3ng vi\xEAn h\u01B0\u1EDBng d\u1EABn!",
    );
  };
  const getCategoryIcon = (category) => {
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
    <div className="space-y-5 animate-in fade-in duration-200 max-w-7xl mx-auto">
      <PageHeader
        icon={Package}
        title="Hồ sơ & sản phẩm thực tập"
        subtitle="Chọn đúng loại hồ sơ bên dưới. Báo cáo tuần được nộp ở mục Báo cáo tuần."
        badge={`${uploads.length} hồ sơ đã nộp`}
        badgeColor="bg-blue-100 text-blue-800 border-blue-200"
      >
        <span className="px-2 py-0.5 font-semibold text-[10px] rounded-md border bg-emerald-100 text-emerald-800 border-emerald-200">
          {uploads.length} tài nguyên
        </span>
      </PageHeader>

      <Toolbar
        left={
          <span className="text-xs font-semibold text-slate-600">
            <span className="text-slate-900 font-bold">{uploads.length}</span>{" "}
            hồ sơ đã nộp
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Panel className="flex flex-col gap-3 border-blue-200">
          <div className="flex items-center gap-2 text-blue-800">
            <CalendarDays className="h-4 w-4" />
            <h2 className="text-sm font-bold">Báo cáo tuần</h2>
          </div>
          <p className="flex-1 text-xs leading-5 text-slate-600">Nộp nhật ký/báo cáo theo tuần và xem hạn từng tuần.</p>
          <button type="button" onClick={() => navigate("/student/weekly-reports")} className="il-btn il-btn-secondary inline-flex items-center justify-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Mở báo cáo tuần
          </button>
        </Panel>

        <Panel className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-800">
              <FileCheck2 className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-bold">Báo cáo cuối kỳ</h2>
            </div>
            <span className={`text-[10px] font-bold ${finalReport ? "text-emerald-700" : "text-rose-700"}`}>{getSubmissionState(finalReport)}</span>
          </div>
          <p className="flex-1 text-xs leading-5 text-slate-600">Tệp báo cáo thực tập tốt nghiệp. Đây là hồ sơ bắt buộc.</p>
          <button type="button" onClick={() => isRevisionRequested(finalReport) ? openRevisionUpload(finalReport) : openUploadFor("FinalReport")} disabled={!internshipId || Boolean(finalReport && !isRevisionRequested(finalReport))} className="il-btn il-btn-primary inline-flex items-center justify-center gap-1.5 text-xs disabled:opacity-50">
            <Upload className="h-3.5 w-3.5" /> {isRevisionRequested(finalReport) ? "Nộp bản chỉnh sửa" : finalReport ? "Đã nộp" : "Nộp báo cáo cuối kỳ"}
          </button>
        </Panel>

        <Panel className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-800">
              <Package className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-bold">Sản phẩm thực tế</h2>
            </div>
            <span className={`text-[10px] font-bold ${productSubmission ? "text-emerald-700" : "text-slate-500"}`}>{productSubmission ? getSubmissionState(productSubmission) : "Tùy chọn"}</span>
          </div>
          <p className="flex-1 text-xs leading-5 text-slate-600">Source code, slide, video demo hoặc link triển khai. Có thể nộp nhiều tệp/liên kết.</p>
          <button type="button" onClick={() => openUploadFor("Product")} disabled={!internshipId} className="il-btn il-btn-secondary inline-flex items-center justify-center gap-1.5 text-xs disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Thêm sản phẩm
          </button>
        </Panel>

        <Panel className={`flex flex-col gap-3 ${evidenceWindowOpen ? "border-emerald-200" : "border-amber-200"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-800">
              <ClipboardCheck className="h-4 w-4 text-amber-700" />
              <h2 className="text-sm font-bold">Đánh giá doanh nghiệp</h2>
            </div>
            <span className={`text-[10px] font-bold ${employerEvidence ? (isRevisionRequested(employerEvidence) ? "text-rose-700" : "text-emerald-700") : evidenceWindowOpen ? "text-emerald-700" : "text-amber-800"}`}>
              {employerEvidence ? getSubmissionState(employerEvidence) : evidenceWindowStatus}
            </span>
          </div>
          <p className="flex-1 text-xs leading-5 text-slate-600">Nhập điểm doanh nghiệp và chụp/scan ảnh phiếu xác nhận. Điểm chỉ để GV tham khảo.</p>
          <p className="text-[10px] text-slate-500">{evidenceWindowMessage}</p>
          <button type="button" onClick={() => isRevisionRequested(employerEvidence) ? openRevisionUpload(employerEvidence) : openUploadFor("Evidence")} disabled={!internshipId || !evidenceWindowOpen || Boolean(employerEvidence && !isRevisionRequested(employerEvidence))} className="il-btn il-btn-secondary inline-flex items-center justify-center gap-1.5 text-xs disabled:opacity-50">
            <Upload className="h-3.5 w-3.5" /> {isRevisionRequested(employerEvidence) ? "Bổ sung minh chứng" : employerEvidence ? "Đã nộp đánh giá" : "Nộp đánh giá doanh nghiệp"}
          </button>
        </Panel>
      </div>

      <Panel className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <CompanyAvatar
              name={profile.company !== "—" ? profile.company : "Sản phẩm"}
              size={40}
            />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Thông tin sản phẩm
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Vị trí: {profile.position !== "—" ? profile.position : "Chưa cập nhật"} • Doanh nghiệp:{" "}
                {profile.company !== "—" ? profile.company : "Chưa cập nhật"}
              </p>
            </div>
          </div>

        </div>

        {/* Project Meta Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50/80 rounded-md border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Giảng viên hướng dẫn
            </span>
            <p className="font-bold text-slate-800 mt-0.5">
              {profile.lecturerName}
            </p>
          </div>
          <div className="p-3 bg-slate-50/80 rounded-md border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Mentor Doanh nghiệp
            </span>
            <p className="font-bold text-slate-800 mt-0.5">
              {profile.supervisorName}
            </p>
          </div>
          <div className="p-3 bg-slate-50/80 rounded-md border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Tài nguyên đính kèm
            </span>
            <p className="font-bold text-slate-800 mt-0.5">
              {uploads.reduce((total, item) => total + (item.fileType.endsWith("tài nguyên") ? Number.parseInt(item.fileType, 10) || 0 : 0), 0)} tài nguyên
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Panel className="space-y-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-0">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" /> Hồ sơ đã nộp
              </h2>
            </div>

            <div className="overflow-x-auto -mx-4 md:-mx-5 px-4 md:px-5">
              <table className="w-full text-left border-collapse text-xs mt-3">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2 pr-3">Sản phẩm</th>
                    <th className="py-2 pr-3 w-24">Loại</th>
                    <th className="py-2 pr-3 w-20">Trạng thái</th>
                    <th className="py-2 text-right w-36">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {uploads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4">
                        <EmptyState
                          title="Chưa có hồ sơ nào được nộp"
                          description="Dùng các mục bên trên để nộp báo cáo cuối kỳ, sản phẩm tùy chọn hoặc phiếu đánh giá doanh nghiệp."
                          action={{
                            label: "Nộp báo cáo cuối kỳ",
                            onClick: () => openUploadFor("FinalReport"),
                          }}
                        />
                      </td>
                    </tr>
                  ) : (
                    uploads.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 pr-3">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0">
                            {getCategoryIcon(item.category)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 line-clamp-1">
                              {item.title}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {item.version} · {item.fileType} · {item.size} ·{" "}
                              {item.uploadDate}
                            </p>
                            {item.notes && (
                              <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-slate-600 font-medium">
                        {item.category}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${item.status === "Đã hoàn thành" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : item.status === "Cần chỉnh sửa" ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDownloadUpload(item)}
                            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600"
                            title="Tải về"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {rawSubmissions.some((submission) => submission.id === item.id && submission.status === "RevisionRequested") && (
                            <button
                              type="button"
                              onClick={() => openRevisionUpload(rawSubmissions.find((submission) => submission.id === item.id))}
                              className="p-1.5 hover:bg-amber-50 rounded-md text-amber-700"
                              aria-label={`Nộp bản chỉnh sửa ${item.title}`}
                              title="Nộp bản chỉnh sửa theo góp ý"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-1 space-y-5">
          {/* LECTURER FEEDBACK & REQUIREMENTS */}
          <Panel className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" /> Góp ý từ Giảng
              viên
            </h3>

            <div className="space-y-2.5 text-xs">
              {requirements.length === 0 ? (
                <p className="text-slate-500 py-3 text-center">
                  Không có yêu cầu chỉnh sửa từ giảng viên
                </p>
              ) : (
                requirements.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {req.title}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${req.status === "\u0110\xE3 c\u1EADp nh\u1EADt" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed">
                      {req.detail}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Hạn chót: {req.deadline}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Panel>

        </div>
      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddUpload}
            className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 shadow-md border border-slate-200 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                {uploadCategory === "FinalReport" ? "Nộp báo cáo cuối kỳ" : uploadCategory === "Evidence" ? "Nộp đánh giá doanh nghiệp" : "Nộp sản phẩm thực tế"}
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-bold text-slate-800">
                  {uploadCategory === "FinalReport" ? "Báo cáo thực tập tốt nghiệp" : uploadCategory === "Evidence" ? "Phiếu đánh giá/xác nhận của doanh nghiệp" : "Sản phẩm thực tế"}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-slate-600">
                  {uploadCategory === "FinalReport" ? "Nộp báo cáo cuối kỳ của đợt thực tập." : uploadCategory === "Evidence" ? "Nhập điểm doanh nghiệp và tải ảnh phiếu. Điểm chỉ để giảng viên tham khảo." : "Tải tài liệu sản phẩm hoặc thêm link triển khai."}
                </p>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên hồ sơ</label>
                <input
                  type="text"
                  placeholder={uploadCategory === "Evidence" ? "Phiếu đánh giá doanh nghiệp" : uploadCategory === "Product" ? "Tên sản phẩm thực tế" : "Báo cáo thực tập tốt nghiệp"}
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md outline-none font-medium focus:border-blue-500 focus:bg-white"
                />
              </div>

              {uploadCategory === "Evidence" && (
                <div className="space-y-3">
                  <div className={`rounded-md border px-3 py-2 text-xs ${evidenceWindowOpen ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                    {evidenceDeadline
                      ? `Thời hạn: ${new Date(evidenceDeadline.startDate).toLocaleString("vi-VN")} – ${new Date(evidenceDeadline.endDate).toLocaleString("vi-VN")}${evidenceWindowOpen ? " · Đang mở" : " · Chưa mở hoặc đã kết thúc"}`
                      : "Admin khoa chưa cấu hình deadline nộp minh chứng."}
                  </div>
                  <label className="block space-y-1 text-xs font-bold text-slate-700">
                    Điểm đánh giá của doanh nghiệp (0–10) *
                    <input
                      required
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={employerScore}
                      onChange={(event) => setEmployerScore(event.target.value)}
                      className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
                    />
                    <span className="block font-normal text-slate-500">Điểm này để giảng viên tham khảo, không cộng trực tiếp vào điểm tổng kết.</span>
                  </label>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn tệp đính kèm
                </label>
                <label className="border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 text-center rounded-md hover:border-blue-400 transition-colors cursor-pointer space-y-1 block">
                  <input
                    type="file"
                    multiple
                    accept={uploadCategory === "Evidence" ? "image/jpeg,image/png,image/webp,image/gif" : uploadCategory === "FinalReport" ? ".pdf,.doc,.docx" : undefined}
                    className="hidden"
                    onChange={(e) => setUploadFiles(Array.from(e.target.files ?? []))}
                  />
                  <Upload className="w-5 h-5 text-blue-600 mx-auto" />
                  <p className="font-bold text-slate-800 text-xs">
                    {uploadFiles.length > 0
                      ? uploadFiles.map((file) => file.name).join(", ")
                      : uploadCategory === "Evidence" ? "Chọn ảnh phiếu xác nhận" : "Chọn tệp trên thiết bị"}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {uploadCategory === "Evidence" ? "Ảnh phiếu đánh giá/xác nhận của doanh nghiệp (bắt buộc)" : "PDF, ZIP, DOCX, PPTX, MP4, ảnh hoặc tài liệu liên quan (tùy chọn)"}
                                      {uploadCategory === "FinalReport" ? "Tệp báo cáo PDF hoặc Word (bắt buộc)" : uploadCategory === "Evidence" ? "Ảnh phiếu đánh giá/xác nhận của doanh nghiệp (bắt buộc)" : "PDF, ZIP, DOCX, PPTX, MP4, ảnh hoặc tài liệu liên quan (tùy chọn)"}
                  </p>
                </label>
              </div>

              {uploadCategory !== "Evidence" && <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Liên kết sản phẩm (nếu có)
                  </label>
                  <button
                    type="button"
                    onClick={() => setUploadLinks((prev) => [...prev, { label: "", url: "" }])}
                    className="text-blue-600 font-bold hover:text-blue-800"
                  >
                    + Thêm link
                  </button>
                </div>
                <div className="space-y-2">
                  {uploadLinks.map((link, index) => (
                    <div key={index} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] gap-2">
                      <input
                        type="text"
                        placeholder="GitHub / Website / Docker"
                        value={link.label}
                        onChange={(e) => setUploadLinks((prev) => prev.map((item, i) => i === index ? { ...item, label: e.target.value } : item))}
                        className="min-w-0 px-2.5 py-2 bg-slate-100 border border-slate-200 rounded-md outline-none font-medium focus:border-blue-500 focus:bg-white"
                      />
                      <input
                        type="url"
                        placeholder="https://..."
                        value={link.url}
                        onChange={(e) => setUploadLinks((prev) => prev.map((item, i) => i === index ? { ...item, url: e.target.value } : item))}
                        className="min-w-0 px-2.5 py-2 bg-slate-100 border border-slate-200 rounded-md outline-none font-medium focus:border-blue-500 focus:bg-white"
                      />
                      {uploadLinks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setUploadLinks((prev) => prev.filter((_, i) => i !== index))}
                          className="px-2 text-slate-400 hover:text-rose-600"
                          aria-label="Xóa liên kết"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ghi chú kèm theo
                </label>
                <textarea
                  rows={2}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Ghi chú tóm tắt nội dung tệp..."
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md outline-none font-medium"
                />
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
                disabled={isSubmitting || (uploadCategory === "Evidence" && (!evidenceWindowOpen || !employerScoreValid || !hasEmployerImage)) || (uploadCategory === "FinalReport" && !hasRequiredUploadFile)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? "Đang nộp..." : uploadCategory === "Evidence" ? "Nộp điểm & ảnh phiếu" : uploadCategory === "FinalReport" ? "Nộp báo cáo cuối kỳ" : "Nộp sản phẩm"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REPLACE FILE MODAL */}
      {replaceTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleReplaceFile}
            className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-md border border-slate-200 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-600" /> Thay thế tệp
                sản phẩm
              </h3>
              <button
                type="button"
                onClick={() => setReplaceTarget(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-blue-50 text-blue-900 rounded-md font-bold border border-blue-100">
                Đang thay thế: {replaceTarget.title} ({replaceTarget.version})
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn tệp mới
                </label>
                <label className="border-2 border-dashed border-amber-200 bg-amber-50/40 p-4 text-center rounded-md hover:bg-amber-50 transition-colors cursor-pointer space-y-1 block">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) =>
                      setReplaceFile(e.target.files?.[0] ?? null)
                    }
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
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md outline-none font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReplaceTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-md shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? "Đang nộp lại..." : "Lưu thay thế"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONTACT LECTURER MODAL */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSendContact}
            className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-md border border-slate-200 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" /> Trao đổi với
                Giảng viên
              </h3>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800">
                Người nhận: {profile.lecturerName} (Giảng viên hướng
                dẫn)
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
                  placeholder="Nhập nội dung thắc mắc về sản phẩm thực tập..."
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md outline-none font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Gửi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export { SubmissionsView as StudentSubmissionsView };
