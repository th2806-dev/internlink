import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { getStoredToken, resolveApiUrl } from "../../../lib/apiClient";
import { Toast } from "../../../components/common/Toast";
import {
  ArrowLeft,
  Download,
  Copy,
  History,
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

// pdfjs-dist (~1 MB) is loaded on demand, only when a PDF preview is opened.
const PdfViewer = lazy(() => import("./PdfViewer"));

interface DocumentDetailWorkspaceProps {
  document: DocumentItem;
  onBack: () => void;
  onDownload: (doc: DocumentItem) => void;
  onArchiveToggle?: (doc: DocumentItem) => void;
}

export const DocumentDetailWorkspace = ({
  document,
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

  const isCirculating =
    document.status === "Đang lưu hành" || (document as any).status === "Đang áp dụng";

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16 font-sans">
      {/* Toast Alert */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* HEADER */}
      <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors border border-slate-200"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md uppercase">
                {document.category}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                Phiên bản {document.version}
              </span>
              {/* Circulation Status Badge */}
              {isCirculating ? (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Đang lưu hành (Public SV tải về)
                </span>
              ) : document.status === "Bản nháp" ? (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Bản nháp (Chưa công khai)
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-300 rounded-md flex items-center gap-1">
                  <Archive className="w-3 h-3 text-slate-500" />
                  Ngưng lưu hành (Đã ẩn & Lưu vào log)
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
              {document.title}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Đăng bởi <strong className="text-slate-800">{document.uploader}</strong> (
              {document.uploaderRole}) • Cập nhật ngày {document.updatedAt} • Đợt thực tập:{" "}
              <strong className="text-blue-700">{document.semester}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={handleCopyLink}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors border border-slate-200 flex items-center gap-1.5"
          >
            <Copy className="w-4 h-4" />
            <span>Sao chép liên kết</span>
          </button>

          {onArchiveToggle && (
            <button
              onClick={() => onArchiveToggle(document)}
              className={`px-3 py-2 font-bold text-xs rounded-md transition-colors border flex items-center gap-1.5 ${
                isCirculating
                  ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>
                {isCirculating
                  ? "Ngưng lưu hành & Chuyển vào Log"
                  : "Mở lưu hành lại cho SV"}
              </span>
            </button>
          )}

          <button
            onClick={() => onDownload(document)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Tải xuống ({document.fileSize})</span>
          </button>
        </div>
      </div>

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
                {document.archiveReason ||
                  "Hết thời hạn áp dụng theo đợt thực tập / Đã chuyển sang biểu mẫu mới."}
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
        <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-lg flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Tài liệu đang được <strong>lưu hành công khai</strong> cho sinh viên thuộc đợt thực
              tập <strong>{document.semester}</strong> ({document.major}).
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200">
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-md shadow-blue-500/20 transition-all mx-auto"
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
                  ? "bg-white text-blue-700 shadow-xs"
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
              <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Chi tiết văn bản</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Trạng thái lưu hành:</span>
                    <span
                      className={`px-2 py-0.5 font-bold text-[10px] rounded-md border ${
                        isCirculating
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {document.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Đợt thực tập áp dụng:</span>
                    <strong className="text-blue-700 font-bold">{document.semester}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Kích thước file:</span>
                    <strong className="text-slate-900">{document.fileSize}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Định dạng file:</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded border border-blue-200">
                      {document.fileType}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Tổng lượt tải của SV:</span>
                    <strong className="text-blue-600 font-bold">
                      {document.downloads.toLocaleString()} lượt
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Phiên bản hiện tại:</span>
                    <strong className="text-emerald-600 font-bold">
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
              <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <span>Lịch sử các phiên bản tệp</span>
                </h3>

                <div className="space-y-2.5 max-h-52 overflow-y-auto">
                  {document.versionHistory?.map((vh, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-md border border-slate-100 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-blue-700">{vh.version}</span>
                        <span className="text-[10px] text-slate-400">{vh.date}</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">{vh.note}</p>
                      <p className="text-[10px] text-slate-400">Bởi: {vh.author}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ARCHIVE LOGS & AUDIT TRAIL TAB */
            <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Nhật ký lưu hành &amp; Log kiểm toán</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Audit Trail</span>
              </div>

              <p className="text-xs text-slate-500 font-medium">
                Ghi nhận chi tiết toàn bộ các mốc phát hành, chuyển trạng thái lưu hành và lý do
                ngưng áp dụng văn bản.
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
                          ? "bg-emerald-50/80 border-emerald-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            log.action === "ARCHIVED"
                              ? "bg-amber-100 text-amber-800"
                              : log.action === "CIRCULATING"
                              ? "bg-emerald-100 text-emerald-800"
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
                    Chưa có nhật ký thay đổi trạng thái nào cho tài liệu này.
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
