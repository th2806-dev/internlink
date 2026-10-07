import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { getStoredToken, resolveApiUrl } from "../../../lib/apiClient";
import { Toast } from "../../../components/common/Toast";
import {
  ArrowLeft,
  Download,
  Copy,
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Archive,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
} from "lucide-react";
import type { DocumentItem } from "../../../types/document";
import { LecturerSubPageHeader } from "./LecturerSubPageHeader";

// pdfjs-dist (~1 MB) is loaded on demand, only when a PDF preview is opened.
const PdfViewer = lazy(() => import("./PdfViewer"));

interface DocumentDetailWorkspaceProps {
  document: DocumentItem;
  isLoadingVersions?: boolean;
  onBack: () => void;
  onDownload: (doc: DocumentItem) => void;
  onArchiveToggle?: (doc: DocumentItem) => void;
}

export const DocumentDetailWorkspace = ({
  document,
  isLoadingVersions = false,
  onBack,
  onDownload,
  onArchiveToggle,
}: DocumentDetailWorkspaceProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"info">("info");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isPdfFile =
    document.fileType?.toLowerCase() === "pdf" ||
    document.fileName?.toLowerCase().endsWith(".pdf");

  // Stream the real file from the API with the JWT attached (same endpoint as download).
  const pdfFile = useMemo(
    () => {
      const token = getStoredToken();
      return {
        url: resolveApiUrl(`/api/Document/${document.id}/download`),
        httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
      };
    },
    [document.id],
  );

  // Reset the viewer state when switching to a different document.
  useEffect(() => {
    setCurrentPage(1);
    setNumPages(null);
    setPdfLoading(true);
    setPdfError(null);
  }, [document.id]);

  useEffect(() => {
    if (numPages && currentPage > numPages) setCurrentPage(numPages);
  }, [numPages, currentPage]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    triggerToast("Đã sao chép liên kết tài liệu vào bộ nhớ tạm!");
  };

  const isCirculating = document.status === "Đang lưu hành";

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16 font-sans">
      {/* Toast Alert */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      <LecturerSubPageHeader
        icon={FileText}
        title={document.title}
        subtitle={`Đăng bởi ${document.uploader} (${document.uploaderRole}) · Cập nhật ngày ${document.updatedAt} · Đợt thực tập: ${document.semester}`}
      >
        <button
          type="button"
          onClick={onBack}
          title="Quay lại danh sách"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Quay lại
        </button>
        <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
          {document.category}
        </span>
        <span className="rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white">
          Phiên bản {document.version}
        </span>
        {isCirculating ? (
          <span className="flex items-center gap-1 rounded-full border border-[#7bc043]/50 bg-[#7bc043]/20 px-2.5 py-1 text-[10px] font-bold text-white">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Đang lưu hành (Public SV tải về)
          </span>
        ) : document.status === "Bản nháp" ? (
          <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900">
            <FileText className="h-3 w-3" aria-hidden="true" />
            Bản nháp (Chưa công khai)
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white">
            <Archive className="h-3 w-3" aria-hidden="true" />
            Ngưng lưu hành (Đã ẩn & Lưu vào log)
          </span>
        )}
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          <span>Sao chép liên kết</span>
        </button>
        {onArchiveToggle && (
          <button
            type="button"
            onClick={() => onArchiveToggle(document)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              isCirculating
                ? "border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-200"
                : "border-[#7bc043]/50 bg-[#7bc043]/20 text-white hover:bg-[#7bc043]/30"
            }`}
          >
            <Archive className="h-4 w-4" aria-hidden="true" />
            <span>
              {isCirculating
                ? "Ngưng lưu hành & Chuyển vào Log"
                : "Mở lưu hành lại cho SV"}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onDownload(document)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-semibold text-[#025a8e] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#026aa7]"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>Tải xuống ({document.fileSize})</span>
        </button>
      </LecturerSubPageHeader>

      {/* CIRCULATION STATUS BANNER */}
      {!isCirculating && (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-900 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm text-amber-900">
              Tài liệu này hiện KHÔNG còn lưu hành và đã bị ẩn khỏi sinh viên
            </p>
            <p className="text-amber-800 font-medium">
              Lý do ngưng lưu hành:{" "}
              <strong>
                {document.archiveReason || "Chưa cập nhật"}
              </strong>
            </p>
            {document.archivedAt && (
              <p className="text-[11px] text-amber-700">
                Thời gian thực hiện: {document.archivedAt}{" "}
                {document.archivedBy ? `bởi ${document.archivedBy}` : ""}
              </p>
            )}
          </div>
        </div>
      )}

      {isCirculating && (
        <div className="flex items-center justify-between rounded-xl border border-[#7bc043]/30 bg-[#7bc043]/10 p-3 text-xs text-[#446d20]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#7bc043]" />
            <span>
              Tài liệu đang được <strong>lưu hành công khai</strong> cho sinh viên thuộc đợt thực
              tập <strong>{document.semester}</strong> ({document.major}).
            </span>
          </div>
          <span className="rounded-full border border-[#7bc043]/30 bg-[#7bc043]/10 px-2 py-0.5 text-[11px] font-bold text-[#446d20]">
            Public Active
          </span>
        </div>
      )}

      {/* MAIN LAYOUT: PREVIEWER (8 cols) vs RIGHT SIDEBAR (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* INTERACTIVE DOCUMENT PREVIEWER (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 rounded-lg border border-slate-800 shadow-md overflow-hidden flex flex-col min-h-[600px]">
          {/* Toolbar */}
          <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">
                {document.fileType} Viewer
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 font-medium">
                Trang {currentPage} / {numPages ?? (pdfLoading ? "…" : "—")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                className="p-1 hover:bg-slate-700 rounded text-slate-300"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-slate-400">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
                className="p-1 hover:bg-slate-700 rounded text-slate-300"
                title="Phóng to"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-slate-700 mx-1" />

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-300"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(numPages ?? p, p + 1))
                }
                disabled={!numPages || currentPage >= numPages}
                className="p-1 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-300"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Document Content Canvas View */}
          <div className="flex-1 p-4 sm:p-8 bg-slate-950/80 overflow-auto flex items-start sm:items-center justify-center min-h-[520px]">
            {isPdfFile ? (
              <div className="w-full max-w-3xl">
                <Suspense
                  fallback={
                    <div className="text-center py-20 text-slate-400 text-xs font-medium">
                      Đang tải trình xem PDF…
                    </div>
                  }
                >
                  <PdfViewer
                    file={pdfFile}
                    pageNumber={currentPage}
                    scale={zoomLevel / 100}
                    onLoadStart={() => setPdfLoading(true)}
                    onLoadSuccess={(pages) => {
                      setNumPages(pages);
                      setPdfError(null);
                      setPdfLoading(false);
                    }}
                    onLoadError={(message) => {
                      setPdfError(message);
                      setPdfLoading(false);
                    }}
                  />
                </Suspense>
              </div>
            ) : pdfError ? (
              <div className="bg-white text-slate-900 p-10 rounded-md shadow-md max-w-xl w-full text-center border border-slate-200 space-y-3">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-slate-800">
                  Không thể xem trước tài liệu
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">{pdfError}</p>
              </div>
            ) : (
              <div className="bg-white text-slate-900 p-10 rounded-md shadow-md max-w-xl w-full text-center border border-slate-200 space-y-4">
                <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-800">
                  Không thể xem trước file {document.fileType || "này"} trong trình duyệt
                </p>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Định dạng này chưa được hỗ trợ xem trực tuyến. Hãy tải xuống để mở trên máy của
                  bạn.
                </p>
                <button
                  onClick={() => onDownload(document)}
                  className="mx-auto inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#026aa7] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải xuống ({document.fileSize})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Tabs for Sidebar */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveSidebarTab("info")}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeSidebarTab === "info"
                  ? "bg-white text-[#026aa7] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Thông tin tài liệu</span>
            </button>
          </div>

          {activeSidebarTab === "info" ? (
            <div className="space-y-4">
              {/* Document Information Card */}
              <div className="space-y-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-[#026aa7]" />
                  <span>Chi tiết văn bản</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Trạng thái lưu hành:</span>
                    <span
                      className={`px-2 py-0.5 font-bold text-[10px] rounded-md border ${
                        isCirculating
                          ? "bg-[#7bc043]/10 text-[#446d20] border-[#7bc043]/40"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {document.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Đợt thực tập áp dụng:</span>
                    <strong className="font-bold text-[#026aa7]">{document.semester}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Kích thước file:</span>
                    <strong className="text-slate-900">{document.fileSize}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Định dạng file:</span>
                    <span className="rounded-full border border-[#026aa7]/20 bg-[#026aa7]/5 px-2 py-0.5 text-[10px] font-bold text-[#025a8e]">
                      {document.fileType}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Tổng lượt tải của SV:</span>
                    <strong className="font-bold text-[#026aa7]">
                      {document.downloads.toLocaleString()} lượt
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Phiên bản hiện tại:</span>
                    <strong className="font-bold text-[#446d20]">
                      {document.version} {document.isLatest ? "(Mới nhất)" : ""}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Ngành áp dụng:</span>
                    <strong className="text-slate-900">{document.major}</strong>
                  </div>

                  {document.description && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Mô tả &amp; Hướng dẫn:
                      </span>
                      <p className="text-slate-700 font-medium bg-slate-50 p-2.5 rounded-md border border-slate-200/80 leading-relaxed">
                        {document.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Version History */}
              <div className="space-y-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-[#026aa7]" />
                  <span>Lịch sử các phiên bản tệp</span>
                </h3>

                <div className="space-y-2.5 max-h-52 overflow-y-auto">
                  {isLoadingVersions ? (
                    <p role="status" className="p-4 text-center text-xs text-slate-500">
                      Đang tải lịch sử phiên bản...
                    </p>
                  ) : document.versionHistory?.length ? document.versionHistory.map((vh, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-md border border-slate-100 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#026aa7]">{vh.version}</span>
                        <span className="text-[10px] text-slate-400">{vh.date}</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">{vh.note}</p>
                      <p className="text-[10px] text-slate-400">Bởi: {vh.author}</p>
                    </div>
                  )) : (
                    <p className="p-4 text-center text-xs text-slate-500">
                      Hệ thống chưa có lịch sử phiên bản cho tài liệu này.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ARCHIVE LOGS & AUDIT TRAIL TAB */
            <div className="space-y-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#7bc043]" />
                  <span>Nhật ký lưu hành &amp; Log kiểm toán</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Audit Trail</span>
              </div>

              <p className="text-xs text-slate-500 font-medium">
                Lý do và thời điểm ngưng lưu hành được hiển thị trong thông tin tài liệu khi backend có cung cấp.
              </p>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {document.archiveLogs && document.archiveLogs.length > 0 ? (
                  document.archiveLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                        log.action === "ARCHIVED"
                          ? "bg-amber-50/80 border-amber-200"
                          : log.action === "CIRCULATING"
                          ? "bg-[#7bc043]/10 border-[#7bc043]/30"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            log.action === "ARCHIVED"
                              ? "bg-amber-100 text-amber-800"
                              : log.action === "CIRCULATING"
                              ? "bg-[#7bc043]/15 text-[#446d20]"
                              : "bg-slate-200 text-slate-800"
                          }`}
                        >
                          {log.actionLabel}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {log.date}
                        </span>
                      </div>

                      {log.reason && (
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Lý do:</p>
                          <p className="text-slate-800 font-medium leading-relaxed bg-white/70 p-2 rounded border border-slate-200/60">
                            {log.reason}
                          </p>
                        </div>
                      )}

                      {log.note && (
                        <p className="text-[11px] text-slate-600 italic">
                          Ghi chú: {log.note}
                        </p>
                      )}

                      <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          Thực hiện: <strong className="text-slate-700">{log.performedBy}</strong>
                        </span>
                        <span>{log.performedRole}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">
                    API hiện chưa trả nhật ký thay đổi trạng thái cho tài liệu này.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
