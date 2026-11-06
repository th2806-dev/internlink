import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  RefreshCw,
  AlertTriangle,
  X,
} from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { submissionApiService } from "../../../services/submissionApi.service";
import { weeklyReportService } from "../../../services/weeklyReport.service";
import {
  mapWeeklyReportStatusToUi,
  mapSubmissionStatusToUi,
  mapSubmissionTypeToUi,
} from "../../../lib/portalMappers";
import type { WeeklyReportDto, SubmissionDto } from "../../../types/api";
import { PdfViewer } from "./PdfViewer";

interface StudentReportsTabProps {
  internshipId: string;
  studentName: string;
  studentCode: string;
  weeklyReports: WeeklyReportDto[];
  submissions: SubmissionDto[];
  isLoading: boolean;
  onRefresh?: () => Promise<void>;
  onShowToast?: (msg: string) => void;
  errors?: { reports?: string | null; submissions?: string | null };
}

export function StudentReportsTab({
  internshipId,
  studentName,
  studentCode,
  weeklyReports,
  submissions,
  isLoading,
  onRefresh,
  onShowToast,
  errors,
}: StudentReportsTabProps) {
  const [view, setView] = useState<"weekly" | "submissions">("weekly");
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [submissionTypeFilter, setSubmissionTypeFilter] = useState("all");
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState("all");
  const [preview, setPreview] = useState<{ url: string; fileName: string } | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPages, setPreviewPages] = useState(1);
  const [revisionTargetId, setRevisionTargetId] = useState<string | null>(null);
  const [revisionComment, setRevisionComment] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  // Sort trên BẢN SAO — không mutate array props của parent (React strict-mode & memo-safe).
  const sortedWeeklyReports = useMemo(
    () => [...weeklyReports].sort((a, b) => a.weekNumber - b.weekNumber),
    [weeklyReports],
  );
  const filteredSubmissions = useMemo(
    () => submissions.filter((submission) =>
      (submissionTypeFilter === "all" || submission.type.toLowerCase() === submissionTypeFilter.toLowerCase())
      && (submissionStatusFilter === "all" || submission.status === submissionStatusFilter),
    ),
    [submissions, submissionTypeFilter, submissionStatusFilter],
  );

  const weeklyStatusClass = (status: string) => {
    if (status === "Approved") return "bg-[#7bc043]/10 text-[#426f20] border-[#7bc043]/40";
    if (status === "RevisionRequested") return "bg-rose-50 text-rose-700 border-rose-200";
    if (status === "Submitted") return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const submissionStatusClass = (status: string) => {
    if (status === "Approved") return "bg-[#7bc043]/10 text-[#426f20] border-[#7bc043]/40";
    if (status === "RevisionRequested") return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const downloadFile = async (key: string, action: () => Promise<unknown>) => {
    setDownloadingKey(key);
    try {
      await action();
    } catch (error) {
      onShowToast?.(getApiErrorMessage(error));
    } finally {
      setDownloadingKey(null);
    }
  };

  const previewArchiveReport = async (submission: SubmissionDto) => {
    setDownloadingKey(`preview-${submission.id}`);
    try {
      const fileAsset = submission.assets?.find(
        (asset) => asset.assetType === "file" && asset.fileName,
      );
      const result = fileAsset
        ? await submissionApiService.downloadAsset(
            submission.id,
            fileAsset.id,
            fileAsset.fileName ?? submission.title ?? "BaoCaoLuuKhoa.pdf",
            false,
          )
        : await submissionApiService.download(
            submission.id,
            submission.fileName ?? submission.title ?? "BaoCaoLuuKhoa.pdf",
            false,
          );
      if (!result.blob.type.toLowerCase().includes("pdf")) {
        throw new Error("Tệp báo cáo lưu khoa không phải PDF hợp lệ.");
      }
      if (preview?.url) URL.revokeObjectURL(preview.url);
      setPreview({ url: URL.createObjectURL(result.blob), fileName: result.filename });
      setPreviewPage(1);
    } catch (error) {
      onShowToast?.(getApiErrorMessage(error));
    } finally {
      setDownloadingKey(null);
    }
  };

  const reviewArchiveReport = async (
    submission: SubmissionDto,
    status: "Đã duyệt" | "Yêu cầu sửa" | "Từ chối",
  ) => {
    if (status === "Yêu cầu sửa" && !revisionComment.trim()) {
      onShowToast?.("Vui lòng nhập lý do cần chỉnh sửa.");
      return;
    }
    setReviewingId(submission.id);
    try {
      await submissionApiService.review(
        submission.id,
        status,
        status === "Yêu cầu sửa" ? revisionComment : undefined,
      );
      setRevisionTargetId(null);
      setRevisionComment("");
      onShowToast?.(
        status === "Đã duyệt"
          ? "Đã duyệt báo cáo lưu khoa."
          : status === "Yêu cầu sửa"
            ? "Đã gửi yêu cầu chỉnh sửa báo cáo lưu khoa."
            : "Đã từ chối báo cáo lưu khoa.",
      );
      await onRefresh?.();
    } catch (error) {
      onShowToast?.(getApiErrorMessage(error));
    } finally {
      setReviewingId(null);
    }
  };

  if (isLoading) {
    return (
      <Panel className="flex flex-col items-center justify-center py-16 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <p className="text-xs text-slate-500">Đang tải báo cáo...</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <Panel>
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setView("weekly")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                view === "weekly"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              Báo cáo tuần ({weeklyReports.length})
            </button>
            <button
              onClick={() => setView("submissions")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                view === "submissions"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Download className="w-3.5 h-3.5 inline mr-1" />
              Sản phẩm ({submissions.length})
            </button>
          </div>
          {view === "submissions" && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select
                aria-label="Lọc hồ sơ theo loại"
                value={submissionTypeFilter}
                onChange={(event) => setSubmissionTypeFilter(event.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
              >
                <option value="all">Tất cả loại</option>
                <option value="FinalReport">Báo cáo cuối kỳ</option>
                <option value="Product">Sản phẩm thực tế</option>
                <option value="Evidence">Đánh giá doanh nghiệp</option>
                <option value="ArchiveReport">Báo cáo chỉnh sửa lưu khoa</option>
              </select>
              <select
                aria-label="Lọc hồ sơ theo trạng thái"
                value={submissionStatusFilter}
                onChange={(event) => setSubmissionStatusFilter(event.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Submitted">Đã nộp</option>
                <option value="RevisionRequested">Cần bổ sung</option>
                <option value="Approved">Đã duyệt</option>
                <option value="Rejected">Từ chối</option>
              </select>
            </div>
          )}
        </div>

        {view === "weekly" && (
          <div className="space-y-2">
            {errors?.reports && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">Không thể tải báo cáo: {errors.reports} <button type="button" onClick={() => void onRefresh?.()} className="ml-2 font-bold underline">Thử lại</button></p>}
            {sortedWeeklyReports.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-500">Chưa có báo cáo tuần nào</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-md">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Tuần</th>
                      <th className="py-2.5 px-3">Tiêu đề</th>
                      <th className="py-2.5 px-3">Tệp nộp</th>
                      <th className="py-2.5 px-3">Ngày nộp</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                      <th className="py-2.5 px-3">Nhận xét</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedWeeklyReports
                      .map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-blue-700">
                            Tuần {r.weekNumber}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {r.title}
                          </td>
                          <td className="py-3 px-3">
                            {r.fileName ? (
                              <button
                                type="button"
                                onClick={() => void downloadFile(`weekly-${r.id}`, () => weeklyReportService.download(r.id, r.fileName!))}
                                disabled={downloadingKey === `weekly-${r.id}`}
                                className="inline-flex max-w-56 items-center gap-1.5 truncate font-medium text-blue-700 hover:text-blue-900 disabled:opacity-50"
                                title={`Tải ${r.fileName}`}
                              >
                                <Download className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{downloadingKey === `weekly-${r.id}` ? "Đang tải…" : r.fileName}</span>
                              </button>
                            ) : <span className="text-slate-400">Không có tệp</span>}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {r.submittedAt
                              ? new Date(r.submittedAt).toLocaleDateString("vi-VN")
                              : "—"}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border inline-flex items-center ${weeklyStatusClass(r.status)}`}
                            >
                              {mapWeeklyReportStatusToUi(r.status)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-600 max-w-[200px] truncate">
                            {r.lecturerComment ?? "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === "submissions" && (
          <div className="space-y-2">
            {errors?.submissions && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">Không thể tải bài nộp: {errors.submissions} <button type="button" onClick={() => void onRefresh?.()} className="ml-2 font-bold underline">Thử lại</button></p>}
            {filteredSubmissions.length === 0 ? (
              <div className="py-12 text-center">
                <Download className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-500">Không có hồ sơ phù hợp với bộ lọc</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-md">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Loại</th>
                      <th className="py-2.5 px-3">Tiêu đề</th>
                      <th className="py-2.5 px-3">Góp ý GV</th>
                      <th className="py-2.5 px-3">Ngày nộp</th>
                      <th className="py-2.5 px-3">Phiên bản</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((s) => {
                      const latestFeedback = [...(s.feedbacks ?? [])]
                        .filter((feedback) => feedback.isPublic)
                        .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())[0];
                      return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-700">
                          {mapSubmissionTypeToUi(s.type)}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {s.title ?? "—"}
                          {s.type === "ArchiveReport" && (
                            <span className="ml-2 inline-flex rounded-full border border-[#026aa7]/20 bg-[#026aa7]/5 px-2 py-0.5 text-[10px] font-semibold text-[#025a8e]">
                              Lưu khoa (PDF)
                            </span>
                          )}
                          {s.type.toLowerCase() === "evidence" && s.employerScore != null && (
                            <span className="mt-1 block text-[11px] font-semibold text-blue-700">
                              Điểm doanh nghiệp: {s.employerScore.toFixed(1)}/10 · tham khảo
                            </span>
                          )}
                          <span className="block text-[10px] font-medium text-slate-500">
                            {s.assets?.length ?? 0} tài nguyên đính kèm
                          </span>
                          {s.fileName && (
                            <button
                              type="button"
                              onClick={() => void downloadFile(`submission-${s.id}`, () => submissionApiService.download(s.id, s.fileName!))}
                              disabled={downloadingKey === `submission-${s.id}`}
                              className="mt-1 inline-flex max-w-56 items-center gap-1.5 truncate text-[11px] font-medium text-blue-700 hover:text-blue-900 disabled:opacity-50"
                              title={`Tải ${s.fileName}`}
                            >
                              <Download className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{downloadingKey === `submission-${s.id}` ? "Đang tải…" : s.fileName}</span>
                            </button>
                          )}
                          {s.assets?.filter((asset) => asset.assetType === "file" && asset.fileName).map((asset) => {
                            const key = `asset-${asset.id}`;
                            return (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() => void downloadFile(key, () => submissionApiService.downloadAsset(s.id, asset.id, asset.fileName ?? asset.label ?? s.title ?? "minh-chung"))}
                                disabled={downloadingKey === key}
                                className="mt-1 flex max-w-56 items-center gap-1.5 truncate text-[11px] font-medium text-blue-700 hover:text-blue-900 disabled:opacity-50"
                                title={`Tải ${asset.fileName}`}
                              >
                                <Download className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{downloadingKey === key ? "Đang tải…" : asset.fileName}</span>
                              </button>
                            );
                          })}
                        </td>
                        <td className="max-w-56 px-3 py-3 text-slate-600">
                          {latestFeedback ? (
                            <p className="line-clamp-2" title={latestFeedback.comment}>{latestFeedback.comment}</p>
                          ) : <span className="text-slate-400">Chưa có góp ý</span>}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {s.submittedAt
                            ? new Date(s.submittedAt).toLocaleDateString("vi-VN")
                            : "—"}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono">
                          v{s.version}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border inline-flex items-center ${submissionStatusClass(s.status)}`}
                          >
                            {mapSubmissionStatusToUi(s.status)}
                          </span>
                          {s.type === "ArchiveReport" && (
                            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void previewArchiveReport(s)}
                                disabled={downloadingKey === `preview-${s.id}`}
                                className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                <Eye className="h-3 w-3" aria-hidden="true" />
                                {downloadingKey === `preview-${s.id}` ? "Đang mở…" : "Xem PDF"}
                              </button>
                              {(s.status === "Submitted" || s.status === "Reviewed") && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void reviewArchiveReport(s, "Đã duyệt")}
                                    disabled={reviewingId !== null}
                                    className="inline-flex min-h-8 items-center gap-1 rounded-md bg-[#7bc043]/10 px-2 text-[10px] font-semibold text-[#426f20] hover:bg-[#7bc043]/20 disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                    Duyệt đạt
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRevisionTargetId(revisionTargetId === s.id ? null : s.id);
                                      setRevisionComment("");
                                    }}
                                    disabled={reviewingId !== null}
                                    className="inline-flex min-h-8 items-center gap-1 rounded-md border border-rose-200 px-2 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                  >
                                    Yêu cầu chỉnh sửa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void reviewArchiveReport(s, "Từ chối")}
                                    disabled={reviewingId !== null}
                                    className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    Từ chối
                                  </button>
                                </>
                              )}
                              {revisionTargetId === s.id && (
                                <div className="mt-1 w-full space-y-1.5 text-left">
                                  <label className="sr-only" htmlFor={`archive-feedback-${s.id}`}>
                                    Lý do cần chỉnh sửa
                                  </label>
                                  <textarea
                                    id={`archive-feedback-${s.id}`}
                                    rows={2}
                                    value={revisionComment}
                                    onChange={(event) => setRevisionComment(event.target.value)}
                                    placeholder="Nhập lý do cần chỉnh sửa (bắt buộc)"
                                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30"
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setRevisionTargetId(null)}
                                      className="inline-flex min-h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-[10px] font-semibold text-slate-600"
                                    >
                                      Hủy
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void reviewArchiveReport(s, "Yêu cầu sửa")}
                                      disabled={!revisionComment.trim() || reviewingId !== null}
                                      className="inline-flex min-h-8 items-center gap-1 rounded-md bg-[#026aa7] px-2 text-[10px] font-semibold text-white hover:bg-[#025a8e] disabled:opacity-50"
                                    >
                                      {reviewingId === s.id ? "Đang gửi…" : "Gửi yêu cầu"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Panel>
      {preview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Xem trước ${preview.fileName}`}
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <p className="truncate text-sm font-semibold text-slate-800">{preview.fileName}</p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Đóng xem trước PDF"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
              <PdfViewer
                file={{ url: preview.url }}
                pageNumber={previewPage}
                scale={1}
                onLoadSuccess={setPreviewPages}
                onLoadError={(message) => onShowToast?.(message)}
              />
            </div>
            <div className="flex items-center justify-center gap-3 border-t border-slate-200 px-4 py-2 text-xs">
              <button
                type="button"
                onClick={() => setPreviewPage((page) => Math.max(1, page - 1))}
                disabled={previewPage <= 1}
                className="min-h-9 rounded-md border border-slate-200 px-3 font-semibold disabled:opacity-50"
              >
                Trang trước
              </button>
              <span className="text-slate-600">Trang {previewPage} / {previewPages}</span>
              <button
                type="button"
                onClick={() => setPreviewPage((page) => Math.min(previewPages, page + 1))}
                disabled={previewPage >= previewPages}
                className="min-h-9 rounded-md border border-slate-200 px-3 font-semibold disabled:opacity-50"
              >
                Trang sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
