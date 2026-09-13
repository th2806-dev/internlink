import { useState, useEffect } from "react";
import {
  Download,
  Search,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Eye,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { mapDocumentListItemToStudentTemplate } from "../../../lib/documentMappers";
import { documentService } from "../../../services/document.service";

export const TemplatesView = ({ onShowToast }: { onShowToast: (msg: string) => void }) => {
  const { profile } = useStudentPortal();
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load templates from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const [templatesResult, docsResult] = await Promise.allSettled([
          documentService.getTemplates({ isPublishedOnly: true }),
          documentService.getAll(),
        ]);
        if (!cancelled) {
          const docMap = new Map<string, any>();
          if (templatesResult.status === "fulfilled") {
            templatesResult.value
              .filter((d: any) => d.isPublished !== false)
              .forEach((d) => docMap.set(d.id, d));
          }
          if (docsResult.status === "fulfilled") {
            docsResult.value
              .filter((d: any) => d.isPublished !== false)
              .forEach((d) => docMap.set(d.id, d));
          }
          setTemplates(Array.from(docMap.values()).map(mapDocumentListItemToStudentTemplate));
        }
      } catch (err) {
        if (!cancelled) onShowToast(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onShowToast]);

  const categoriesList = [
    "Tất cả",
    "Biểu mẫu",
    "Báo cáo",
    "Nhật ký",
    "Kế hoạch",
    "Hướng dẫn",
    "Văn bản khoa",
  ];

  const handleDownload = async (doc: any) => {
    try {
      await documentService.download(
        doc.id,
        doc.fileName || `${doc.name}.bin`,
      );
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === doc.id ? { ...t, downloadCount: (t.downloadCount || 0) + 1 } : t
        )
      );
      onShowToast(`Đã tải xuống: ${doc.name}`);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };

  const filteredTemplates = templates.filter((doc) => {
    const matchCat =
      selectedCategory === "Tất cả" || doc.category === selectedCategory;
    const matchFileType =
      selectedFileType === "Tất cả" || doc.fileType === selectedFileType;
    const matchSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchFileType && matchSearch;
  });

  const totalPages = Math.ceil(filteredTemplates.length / pageSize) || 1;
  const paginatedTemplates = filteredTemplates.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const getFileTypeBadge = (type: string) => {
    switch (type) {
      case "DOCX":
        return "bg-blue-600 text-white";
      case "PDF":
        return "bg-rose-600 text-white";
      case "PPTX":
        return "bg-amber-600 text-white";
      case "XLSX":
        return "bg-emerald-600 text-white";
      case "ZIP":
        return "bg-purple-600 text-white";
      default:
        return "bg-slate-700 text-white";
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 max-w-7xl mx-auto font-sans">
      <PageHeader
        icon={BookOpen}
        title="Biểu mẫu & Tài liệu thực tập"
        subtitle="Kho biểu mẫu Word, Slide và Quy định chính thức đang lưu hành do Giảng viên & Khoa ban hành. Tải về để thực hiện theo đợt thực tập."
        badge={`${templates.length} biểu mẫu đang lưu hành`}
        badgeColor="bg-emerald-100 text-emerald-800 border-emerald-200"
        actions={[
          {
            label: "Tải tất cả mẫu (.ZIP)",
            icon: Download,
            onClick: () =>
              onShowToast("Đang đóng gói và tải tất cả biểu mẫu đang lưu hành (.ZIP)..."),
            variant: "primary",
          },
        ]}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 font-semibold text-[10px] rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Đợt thực tập: {profile?.semester || "HK I - 2026"}
          </span>
          <span className="px-2 py-0.5 font-semibold text-[10px] rounded-md border bg-rose-100 text-rose-800 border-rose-200">
            {templates.filter((t) => t.isRequired).length} bắt buộc
          </span>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
        <div>
          <Panel className="space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" /> Kho tài liệu ({filteredTemplates.length})
              </h2>

              <div className="flex items-center gap-2">
                <div className="relative w-40 sm:w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm tên file, mã..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-md text-xs outline-none font-medium"
                  />
                </div>

                <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-md text-[11px] font-bold">
                  {["Tất cả", "DOCX", "PDF", "PPTX", "XLSX"].map((ft) => (
                    <button
                      key={ft}
                      onClick={() => setSelectedFileType(ft)}
                      className={`px-2 py-0.5 rounded-lg transition-all ${
                        selectedFileType === ft
                          ? "bg-white text-blue-700 shadow-2xs"
                          : "text-slate-600"
                      }`}
                    >
                      {ft}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold pb-1 scrollbar-none">
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Template Items List */}
            <div className="divide-y divide-slate-100 border-y border-slate-200/80">
              {isLoading ? (
                <div className="p-10 text-center text-xs text-slate-500 font-medium">
                  Đang tải tài liệu...
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-medium">
                  Không tìm thấy tài liệu phù hợp với bộ lọc.
                </div>
              ) : (
                paginatedTemplates.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${getFileTypeBadge(
                            doc.fileType,
                          )}`}
                        >
                          {doc.fileType}
                        </span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          {doc.code}
                        </span>
                        {doc.isRequired && (
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                            Bắt buộc nộp
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-semibold">Bản {doc.version}</span>
                      </div>

                      <h3
                        onClick={() => setSelectedDoc(doc)}
                        className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer leading-snug"
                      >
                        {doc.name}
                      </h3>

                      <p className="text-[11px] text-slate-500 line-clamp-1 font-medium">
                        {doc.description}
                      </p>

                      <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-medium flex-wrap">
                        <span>
                          Đăng bởi:{" "}
                          <strong className="text-slate-700">
                            {doc.uploaderName}
                          </strong>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                          Dung lượng:{" "}
                          <strong className="text-slate-700">
                            {doc.fileSize}
                          </strong>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                          Lượt tải:{" "}
                          <strong className="text-slate-700">
                            {doc.downloadCount}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-md transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" /> Chi tiết
                      </button>

                      <button
                        onClick={() => handleDownload(doc)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-md transition-colors flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Tải xuống
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 font-medium">
                Hiển thị {paginatedTemplates.length} / {filteredTemplates.length} mẫu
              </span>

              <div className="flex items-center gap-1.5 font-bold">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
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
        </div>

        <div className="space-y-5">
          {/* REQUIRED TEMPLATES BOX */}
          <Panel className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" /> Biểu mẫu bắt buộc phải nộp
            </h3>

            <div className="space-y-2 text-xs">
              {templates.filter((t) => t.isRequired).length === 0 ? (
                <p className="text-slate-400 text-xs italic">Không có biểu mẫu bắt buộc nào.</p>
              ) : (
                templates
                  .filter((t) => t.isRequired)
                  .map((reqDoc) => (
                    <div
                      key={reqDoc.id}
                      className="p-3 bg-rose-50/50 rounded-md border border-rose-200/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-rose-900 text-[11px]">
                          {reqDoc.code}
                        </span>
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">
                          {reqDoc.fileType}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900">{reqDoc.name}</p>
                      <button
                        onClick={() => handleDownload(reqDoc)}
                        className="w-full mt-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-md transition-colors flex items-center justify-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> Tải tệp này ({reqDoc.fileSize})
                      </button>
                    </div>
                  ))
              )}
            </div>
          </Panel>

          {/* USAGE GUIDE BOX */}
          <Panel className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Hướng dẫn làm theo mẫu
            </h3>

            <div className="space-y-2 text-xs text-slate-700 font-medium">
              <div className="flex items-start gap-2.5 p-1">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <span>Tải mẫu Word (.docx) hoặc Slide (.pptx) tương ứng về máy tính.</span>
              </div>
              <div className="flex items-start gap-2.5 p-1">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <span>Điền thông tin và thực hiện đúng cấu trúc do Khoa yêu cầu.</span>
              </div>
              <div className="flex items-start gap-2.5 p-1">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Xuất file thành dạng <strong>PDF (.pdf)</strong> trước khi nộp lên hệ thống.
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* MODAL: VIEW TEMPLATE DETAILS */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-md border border-slate-200 space-y-4 animate-in zoom-in-95 relative">
            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-sm"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
              <div
                className={`p-2.5 rounded-md text-white font-bold text-xs shrink-0 ${getFileTypeBadge(
                  selectedDoc.fileType,
                )}`}
              >
                {selectedDoc.fileType}
              </div>
              <div className="min-w-0 pr-6 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    {selectedDoc.code}
                  </span>
                  {selectedDoc.isRequired && (
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                      Bắt buộc
                    </span>
                  )}
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    Đang lưu hành
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {selectedDoc.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Đăng bởi: {selectedDoc.uploaderName} ({selectedDoc.uploaderRole})
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold">
                  Mô tả chi tiết:
                </p>
                <p className="text-slate-800 font-medium bg-slate-50 p-3 rounded-md border border-slate-200/80 leading-relaxed">
                  {selectedDoc.description}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold">
                  Hướng dẫn làm theo mẫu:
                </p>
                <p className="text-blue-900 font-medium bg-blue-50/80 p-3 rounded-md border border-blue-200/80 leading-relaxed">
                  {selectedDoc.usageInstructions}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200/80">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">
                    Phiên bản:
                  </p>
                  <p className="font-bold text-slate-900 text-xs">
                    {selectedDoc.version}
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200/80">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">
                    Dung lượng tệp:
                  </p>
                  <p className="font-bold text-slate-900 text-xs">
                    {selectedDoc.fileSize}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md"
              >
                Đóng
              </button>

              <button
                onClick={() => {
                  handleDownload(selectedDoc);
                  setSelectedDoc(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Tải mẫu về
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { TemplatesView as StudentTemplatesView };
