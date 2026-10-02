import { useEffect, useState } from "react";
import {
  FileCheck2,
  Check,
  RotateCcw,
  Download,
  Eye,
  X,
  Loader2,
  Star,
  Sparkles,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import { mapWeeklyReportStatusToUi } from "../../../lib/portalMappers";
import type { WeeklyReportDto } from "../../../types/api";
import { weeklyReportService } from "../../../services/weeklyReport.service";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { GR_QUALITY_RUBRIC_LEVELS } from "../../../lib/gradingRules";

type WeeklyReportsReviewPanelProps = {
  reports: WeeklyReportDto[];
  onReview: (
    id: string,
    uiStatus: string,
    comment?: string,
    qualityScore?: number,
  ) => void | Promise<void>;
  /** Toast của portal (bắt buộc để báo lỗi thay vì im lặng/alert). */
  onShowToast?: (msg: string, type?: "success" | "error" | "info") => void;
  /** Mutation duyệt đang chạy — khóa nút chống double-submit (Mutation Guard). */
  isReviewing?: boolean;
  /** Đang giữ dữ liệu trang trước khi trang mới về — không bấm hành động trên dữ liệu cũ. */
  isPlaceholderData?: boolean;
  isSemesterClosed?: boolean;
  closedWeekNumbers?: number[];
};

export function WeeklyReportsReviewPanel({
  reports,
  onReview,
  onShowToast,
  isReviewing = false,
  isPlaceholderData = false,
  isSemesterClosed = false,
  closedWeekNumbers = [],
}: WeeklyReportsReviewPanelProps) {
  const [commentById, setCommentById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; fileName: string } | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  // Modal hỏi giảng viên đánh giá mức độ chất lượng khi nhấn Duyệt
  const [evalModalReport, setEvalModalReport] = useState<WeeklyReportDto | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<number>(4.0);
  const [evalComment, setEvalComment] = useState<string>("");

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const pending = reports.filter((r) => r.status === "Submitted");

  if (reports.length === 0) {
    return (
      <Panel className="text-center">
        <p className="text-sm font-semibold text-slate-600">Không có báo cáo nào</p>
        <p className="text-xs text-slate-500 mt-1">
          Các báo cáo sẽ xuất hiện theo bộ lọc trạng thái tương ứng.
        </p>
      </Panel>
    );
  }

  const handleOpenApproveModal = (report: WeeklyReportDto) => {
    setEvalModalReport(report);
    setSelectedQuality(report.qualityScore ?? 4.0);
    setEvalComment(commentById[report.id] ?? report.lecturerComment ?? "");
  };

  const handleConfirmApprove = async () => {
    if (!evalModalReport) return;
    const reportId = evalModalReport.id;
    setBusyId(reportId);
    try {
      await onReview(reportId, "Đã duyệt", evalComment, selectedQuality);
      setCommentById((prev) => ({ ...prev, [reportId]: evalComment }));
      const levelObj = GR_QUALITY_RUBRIC_LEVELS.find((l) => l.value === selectedQuality);
      const levelLabel = levelObj ? `${selectedQuality.toFixed(1)}đ (${levelObj.label})` : `${selectedQuality.toFixed(1)}đ`;
      onShowToast?.(
        `Đã duyệt báo cáo tuần ${evalModalReport.weekNumber} và xếp loại chất lượng: ${levelLabel}.`,
        "success",
      );
      setEvalModalReport(null);
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleRequestRevision = async (id: string) => {
    setBusyId(id);
    try {
      await onReview(id, "Yêu cầu sửa", commentById[id]);
      onShowToast?.("Đã gửi yêu cầu chỉnh sửa báo cáo tuần.", "success");
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    } finally {
      setBusyId(null);
    }
  };

  const handlePreview = async (report: WeeklyReportDto) => {
    if (!report.fileName) return;
    setPreviewLoadingId(report.id);
    try {
      const { blob, filename } = await weeklyReportService.download(report.id, report.fileName);
      if (preview?.url) URL.revokeObjectURL(preview.url);
      setPreview({ url: URL.createObjectURL(blob), fileName: filename });
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const handleDownload = async (report: WeeklyReportDto) => {
    if (!report.fileName) return;
    try {
      const { blob, filename } = await weeklyReportService.download(report.id, report.fileName);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    }
  };

  return (
    <Panel className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-blue-600" />
          Danh sách báo cáo tuần
        </h2>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              {pending.length} bài chờ duyệt
            </span>
          )}
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            {reports.length} bài
          </span>
        </div>
      </div>

      <ul className="divide-y divide-slate-100">
        {reports.map((r) => {
          const isPendingItem = r.status === "Submitted";
          const isApprovedItem = r.status === "Approved";
          const isReadOnly = isSemesterClosed || closedWeekNumbers.includes(r.weekNumber);
          const qualityObj = r.qualityScore != null ? GR_QUALITY_RUBRIC_LEVELS.find((l) => l.value === r.qualityScore) : null;

          return (
            <li key={r.id} className="py-3 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">
                      Tuần {r.weekNumber} — {r.title}
                    </p>
                    {isReadOnly && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500"><Lock className="h-3 w-3" /> Chỉ xem</span>}
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                        isApprovedItem
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isPendingItem
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : r.status === "RevisionRequested"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {mapWeeklyReportStatusToUi(r.status)}
                    </span>
                    {qualityObj && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                        Xếp loại: {r.qualityScore?.toFixed(1)}đ ({qualityObj.label})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {r.fileName ?? r.content}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {r.fileName && (
                    <>
                      <button
                        type="button"
                        onClick={() => void handlePreview(r)}
                        disabled={previewLoadingId === r.id}
                        className="il-btn il-btn-secondary text-xs"
                        title="Xem trước file"
                      >
                        {previewLoadingId === r.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        Xem
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownload(r)}
                        className="il-btn il-btn-secondary text-xs"
                        title="Tải file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {isPendingItem && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === r.id || isReviewing || isPlaceholderData || isReadOnly}
                        onClick={() => void handleRequestRevision(r.id)}
                        className="il-btn il-btn-secondary text-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Yêu cầu sửa
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id || isReviewing || isPlaceholderData || isReadOnly}
                        onClick={() => handleOpenApproveModal(r)}
                        className="il-btn il-btn-primary text-xs flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Duyệt & Đánh giá
                      </button>
                    </>
                  )}

                  {isApprovedItem && (
                    <button
                      type="button"
                      disabled={busyId === r.id || isReviewing || isPlaceholderData || isReadOnly}
                      onClick={() => handleOpenApproveModal(r)}
                      className="il-btn il-btn-secondary text-xs flex items-center gap-1 text-blue-700 hover:text-blue-800"
                      title="Chỉnh sửa mức đánh giá chất lượng hoặc nhận xét"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      {r.qualityScore != null ? "Chấm lại" : "Đánh giá mức độ"}
                    </button>
                  )}
                </div>
              </div>

              {isPendingItem && (
                <textarea
                  rows={2}
                  placeholder="Nhận xét gửi sinh viên (tuỳ chọn)…"
                  value={commentById[r.id] ?? r.lecturerComment ?? ""}
                  readOnly={isReadOnly}
                  onChange={(e) =>
                    setCommentById((prev) => ({ ...prev, [r.id]: e.target.value }))
                  }
                  className="w-full text-sm border border-slate-200 rounded-md p-2.5 outline-none focus:border-blue-500"
                />
              )}

              {!isPendingItem && r.lecturerComment && (
                <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100">
                  <span className="font-semibold text-slate-700">Nhận xét giảng viên:</span> {r.lecturerComment}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Modal xem trước file */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl h-[85vh] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <p className="text-sm font-bold text-slate-900 truncate">{preview.fileName}</p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900"
                title="Đóng xem trước"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              title={`Xem trước ${preview.fileName}`}
              src={preview.url}
              className="flex-1 w-full"
            />
          </div>
        </div>
      )}

      {/* Modal hỏi giảng viên đánh giá mức độ chất lượng khi duyệt */}
      {evalModalReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border border-slate-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100/70 text-blue-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Duyệt báo cáo & Đánh giá chất lượng
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tuần {evalModalReport.weekNumber} — {evalModalReport.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEvalModalReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Đánh giá mức độ chất lượng báo cáo <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Chọn mức xếp loại theo Rubric chất lượng quy định (tối đa 5 điểm):
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {GR_QUALITY_RUBRIC_LEVELS.map((level) => {
                    const isSelected = selectedQuality === level.value;
                    return (
                      <button
                        type="button"
                        key={level.value}
                        onClick={() => setSelectedQuality(level.value)}
                        className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center justify-center w-12 py-1 rounded text-xs font-bold ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {level.value.toFixed(1)}đ
                          </span>
                          <div>
                            <p className="font-semibold text-sm leading-snug">{level.label}</p>
                            <p className="text-xs text-slate-500">
                              {level.value === 5.0 && "Nội dung xuất sắc, chi tiết, vượt mục tiêu"}
                              {level.value === 4.0 && "Nội dung rõ ràng, hoàn thành đầy đủ mục tiêu"}
                              {level.value === 3.5 && "Nội dung đạt yêu cầu, tiến độ tốt"}
                              {level.value === 2.0 && "Nội dung cơ bản, cần bổ sung cải thiện"}
                              {level.value === 1.0 && "Nội dung sơ sài, chưa đạt yêu cầu"}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nhận xét cho sinh viên (tuỳ chọn)
                </label>
                <textarea
                  rows={3}
                  value={evalComment}
                  onChange={(e) => setEvalComment(e.target.value)}
                  placeholder="Nhập nhận xét, hướng dẫn hoặc góp ý cho sinh viên…"
                  className="w-full text-sm border border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="rounded-lg bg-blue-50/70 p-3 border border-blue-100 text-xs text-blue-800 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  Kết quả đánh giá chất lượng này sẽ tự động được đồng bộ vào trang{" "}
                  <strong className="font-semibold">Đánh giá & Chấm điểm (/lecturer/evaluations)</strong>{" "}
                  để tính Điểm Quá trình (QT) cho sinh viên và không cần chọn lại.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setEvalModalReport(null)}
                disabled={busyId === evalModalReport.id}
                className="il-btn il-btn-secondary text-xs px-4 py-2"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmApprove()}
                disabled={busyId === evalModalReport.id || isReviewing}
                className="il-btn il-btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
              >
                {busyId === evalModalReport.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang lưu…
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    Xác nhận duyệt & Đánh giá
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
