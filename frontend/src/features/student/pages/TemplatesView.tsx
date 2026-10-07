import React, { useState, useEffect, useCallback } from "react";
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
  RefreshCw,
} from "lucide-react";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { useSemester } from "../../../contexts/SemesterContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { mapDocumentListItemToStudentTemplate } from "../../../lib/documentMappers";
import { documentService } from "../../../services/document.service";
import { StudentSubPageHeader } from "../components/StudentSubPageHeader";

export const TemplatesView: React.FC<{
  onShowToast?: (msg: string, type?: "success" | "error" | "info" | string) => void;
}> = ({ onShowToast }) => {
  const { refresh: refreshProfile } = useStudentPortal();
  const { selectedSemester } = useSemester();

  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("Tất cả");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load templates from API
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const [templatesResult, docsResult] = await Promise.allSettled([
        documentService.getTemplates({ isPublishedOnly: true }),
        documentService.getAll(),
      ]);
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
      setTemplates(
        Array.from(docMap.values()).map(mapDocumentListItemToStudentTemplate),
      );
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
      await loadTemplates();
      onShowToast?.("Đã làm mới danh mục biểu mẫu & tài liệu thành công", "success");
    } finally {
      setIsRefreshing(false);
    }
  };

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
      await documentService.download(doc.id, doc.fileName || `${doc.name}.bin`);
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === doc.id
            ? { ...t, downloadCount: (t.downloadCount || 0) + 1 }
            : t,
        ),
      );
      onShowToast?.(`Đã tải xuống biểu mẫu: ${doc.name}`, "success");
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
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
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      {/* 1. TOP CARD BANNER (Chuẩn layout banner xanh #026aa7 + thông tin thực tế) */}
      <div className="space-y-3">
        <StudentSubPageHeader
          icon={BookOpen}
          title="Biểu mẫu & tài liệu thực tập"
          subtitle="Tìm kiếm và tải xuống biểu mẫu, tài liệu dành cho kỳ thực tập."
          semesterName={selectedSemester?.name}
          onRefresh={() => void handleRefresh()}
          isRefreshing={isRefreshing || isLoading}
        />


      </div>
      {/* 2. MAIN WORKSPACE: DANH SÁCH BIỂU MẪU & CỘT HƯỚNG DẪN */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
        {/* CỘT TRÁI: KHO TÀI LIỆU VÀ BỘ LỌC */}
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          {/* Header & Controls */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#026aa7]" />
                <h3 className="text-sm font-bold text-slate-800">
                  Kho biểu mẫu & tài liệu ({filteredTemplates.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Search Box */}
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm tên, mã biểu mẫu..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-xs outline-none font-medium"
                  />
                </div>

                {/* File Type Filter */}
                <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px] font-bold">
                  {["Tất cả", "DOCX", "PDF", "PPTX", "XLSX"].map((ft) => (
                    <button
                      key={ft}
                      onClick={() => {
                        setSelectedFileType(ft);
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        selectedFileType === ft
                          ? "bg-white text-blue-700 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
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
                  className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-[#026aa7] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Template Items List */}
          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-500 font-medium space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#026aa7] mx-auto" />
                <p>Đang tải danh mục biểu mẫu...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 font-medium">
                Không tìm thấy biểu mẫu hoặc tài liệu phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              paginatedTemplates.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
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
                        <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                          Bắt buộc nộp
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Bản {doc.version}
                      </span>
                    </div>

                    <h4 className="break-words font-bold text-xs leading-snug text-slate-900 sm:text-sm">
                      {doc.name}
                    </h4>

                    {doc.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 font-medium">
                        {doc.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2.5 text-[10.5px] text-slate-400 font-medium flex-wrap">
                      <span>
                        Đăng bởi:{" "}
                        <strong className="text-slate-700 font-semibold">
                          {doc.uploaderName}
                        </strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        Dung lượng:{" "}
                        <strong className="text-slate-700 font-semibold">
                          {doc.fileSize}
                        </strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        Lượt tải:{" "}
                        <strong className="text-slate-700 font-semibold">
                          {doc.downloadCount}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setSelectedDoc(doc)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-slate-200"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" /> Chi tiết
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      className="px-3 py-1.5 bg-[#026aa7] hover:bg-[#025a8f] text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Tải xuống
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="p-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Hiển thị {paginatedTemplates.length} / {filteredTemplates.length} mẫu
            </span>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 font-medium text-slate-600">
                <span>Số dòng:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  aria-label="Số mẫu mỗi trang"
                >
                  <option value={6}>6 dòng</option>
                  <option value={12}>12 dòng</option>
                  <option value={24}>24 dòng</option>
                </select>
              </label>

              <div className="flex items-center gap-1 font-bold">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-[11px]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: BIỂU MẪU BẮT BUỘC & HƯỚNG DẪN */}
        <div className="space-y-4">
          {/* CARD 1: BIỂU MẪU BẮT BUỘC */}
          <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" /> Biểu mẫu bắt buộc phải nộp
            </h3>

            <div className="space-y-2 text-xs">
              {templates.filter((t) => t.isRequired).length === 0 ? (
                <p className="text-slate-400 text-xs italic py-2 text-center">
                  Không có biểu mẫu bắt buộc nào.
                </p>
              ) : (
                templates
                  .filter((t) => t.isRequired)
                  .map((reqDoc) => (
                    <div
                      key={reqDoc.id}
                      className="p-3 bg-rose-50/50 rounded-xl border border-rose-200/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-rose-900 text-[11px]">
                          {reqDoc.code}
                        </span>
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">
                          {reqDoc.fileType}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 leading-snug">{reqDoc.name}</p>
                      <button
                        type="button"
                        onClick={() => handleDownload(reqDoc)}
                        className="w-full mt-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" /> Tải về ({reqDoc.fileSize})
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* CARD 2: HƯỚNG DẪN LÀM THEO MẪU */}
          <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Hướng dẫn làm theo mẫu
            </h3>

            <div className="space-y-2.5 text-xs text-slate-700 font-medium">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 bg-[#026aa7] text-white rounded-full flex items-center justify-center font-bold text-[10.5px] shrink-0 mt-0.5">
                  1
                </span>
                <span>Tải mẫu Word (.docx) hoặc Slide (.pptx) tương ứng về máy tính.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 bg-[#026aa7] text-white rounded-full flex items-center justify-center font-bold text-[10.5px] shrink-0 mt-0.5">
                  2
                </span>
                <span>Điền thông tin và thực hiện đúng cấu trúc do Khoa yêu cầu.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 bg-[#026aa7] text-white rounded-full flex items-center justify-center font-bold text-[10.5px] shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Xuất file thành định dạng <strong>PDF (.pdf)</strong> trước khi nộp lên hệ thống.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: XEM CHI TIẾT BIỂU MẪU */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 relative">
            <button
              type="button"
              onClick={() => setSelectedDoc(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
              <div
                className={`p-2.5 rounded-lg text-white font-bold text-xs shrink-0 ${getFileTypeBadge(
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
                <p className="text-slate-800 font-medium bg-slate-50 p-3 rounded-lg border border-slate-200/80 leading-relaxed">
                  {selectedDoc.description}
                </p>
              </div>

              {selectedDoc.usageInstructions && (
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">
                    Hướng dẫn làm theo mẫu:
                  </p>
                  <p className="text-blue-900 font-medium bg-blue-50/80 p-3 rounded-lg border border-blue-200/80 leading-relaxed">
                    {selectedDoc.usageInstructions}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">
                    Phiên bản:
                  </p>
                  <p className="font-bold text-slate-900 text-xs">
                    {selectedDoc.version}
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
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
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDownload(selectedDoc);
                  setSelectedDoc(null);
                }}
                className="px-4 py-2 bg-[#026aa7] hover:bg-[#025a8f] text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Tải mẫu về máy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { TemplatesView as StudentTemplatesView };
