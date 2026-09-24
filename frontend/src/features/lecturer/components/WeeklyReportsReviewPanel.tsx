import { useEffect, useState } from "react";
import { FileCheck2, Check, RotateCcw, Download, Eye, X, Loader2, AlertCircle } from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import {
  mapWeeklyReportStatusToUi,
} from "../../../lib/portalMappers";
import type { WeeklyReportDto } from "../../../types/api";
import { weeklyReportService } from "../../../services/weeklyReport.service";
import { getApiErrorMessage } from "../../../lib/apiClient";

type WeeklyReportsReviewPanelProps = {
  reports: WeeklyReportDto[];
  onReview: (
    id: string,
    uiStatus: string,
    comment?: string,
  ) => void | Promise<void>;
  /** Toast của portal (bắt buộc để báo lỗi thay vì im lặng/alert). */
  onShowToast?: (msg: string, type?: "success" | "error" | "info") => void;
};

export function WeeklyReportsReviewPanel({
  reports,
  onReview,
  onShowToast,
}: WeeklyReportsReviewPanelProps) {
  const [commentById, setCommentById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; fileName: string } | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const pending = reports.filter((r) => r.status === "Submitted");

  if (pending.length === 0) return null;

  const handleReview = async (id: string, uiStatus: string) => {
    setBusyId(id);
    try {
      await onReview(id, uiStatus, commentById[id]);
      onShowToast?.(
        uiStatus === "Đã duyệt" ? "Đã duyệt báo cáo tuần." : "Đã gửi yêu cầu chỉnh sửa báo cáo tuần.",
        "success",
      );
    } catch (err) {
      // try/finally trước đây nuốt lỗi → duyệt/yêu cầu sửa thất bại im lặng.
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
          Báo cáo tuần chờ duyệt
        </h2>
        <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
          {pending.length} bài
        </span>
      </div>

      <ul className="divide-y divide-slate-100">
        {pending.map((r) => (
          <li key={r.id} className="py-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Tuần {r.weekNumber} — {r.title}
                </p>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                  {r.fileName ?? r.content}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Trạng thái: {mapWeeklyReportStatusToUi(r.status)}
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
                      {previewLoadingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
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
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => handleReview(r.id, "Yêu cầu sửa")}
                  className="il-btn il-btn-secondary text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Yêu cầu sửa
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => handleReview(r.id, "Đã duyệt")}
                  className="il-btn il-btn-primary text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  Duyệt
                </button>
              </div>
            </div>
            <textarea
              rows={2}
              placeholder="Nhận xét gửi sinh viên (tuỳ chọn)…"
              value={commentById[r.id] ?? ""}
              onChange={(e) =>
                setCommentById((prev) => ({ ...prev, [r.id]: e.target.value }))
              }
              className="w-full text-sm border border-slate-200 rounded-md p-2.5 outline-none focus:border-blue-500"
            />
          </li>
        ))}
      </ul>

      {preview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl h-[85vh] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <p className="text-sm font-bold text-slate-900 truncate">{preview.fileName}</p>
              <button type="button" onClick={() => setPreview(null)} className="p-1.5 text-slate-500 hover:text-slate-900" title="Đóng xem trước">
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe title={`Xem trước ${preview.fileName}`} src={preview.url} className="flex-1 w-full" />
          </div>
        </div>
      )}
    </Panel>
  );
}
