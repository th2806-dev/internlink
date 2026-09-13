import { useState, useMemo, useEffect } from "react";
import { Toast } from "../../../components/common/Toast";
import { PageHeader } from "../../../components/common/PageHeader";
import { KpiCard, KpiGrid } from "../../../components/common/KpiCard";
import {
  Download,
  Eye,
  Search,
  FolderOpen,
  CloudUpload,
  LayoutGrid,
  List,
  Archive,
  Trash2,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  X,
} from "lucide-react";
import { UploadDocumentWorkspace } from "../components/UploadDocumentWorkspace";
import { DocumentDetailWorkspace } from "../components/DocumentDetailWorkspace";
import { StudentDocumentLibrary } from "../components/StudentDocumentLibrary";
import { useSemester } from "../../../contexts/SemesterContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { mapDocumentListItemToUi } from "../../../lib/documentMappers";
import { documentService } from "../../../services/document.service";
import { lecturerInternshipsService } from "../../../services/lecturerInternships.service";
import type { DocumentItem } from "../../../types/document";

export const TemplatesView = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [defaultInternshipId, setDefaultInternshipId] = useState<string | null>(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [subView, setSubView] = useState<"list" | "upload" | "detail" | "student_library">("list");
  const [activeTab, setActiveTab] = useState<"ALL" | "CIRCULATING" | "ARCHIVED">("CIRCULATING");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const { semesters, selectedSemester, selectSemester } = useSemester();
  const [semesterFilter, setSemesterFilter] = useState("Tất cả");
  const [majorFilter, setMajorFilter] = useState("Tất cả");
  const [fileTypeFilter, setFileTypeFilter] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [archivingDoc, setArchivingDoc] = useState<DocumentItem | null>(null);
  const [archiveReasonInput, setArchiveReasonInput] = useState("Thay thế bằng mẫu mới chuẩn hóa");
  const [archiveCustomNote, setArchiveCustomNote] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingDocs(true);
      try {
        const [internshipsResult, documentsResult, templatesResult] = await Promise.allSettled([
          lecturerInternshipsService.getAll(),
          documentService.getAll(),
          documentService.getTemplates(),
        ]);
        if (cancelled) return;

        if (internshipsResult.status === "fulfilled" && internshipsResult.value[0]?.id) {
          setDefaultInternshipId(internshipsResult.value[0].id);
        }

        const docMap = new Map<string, any>();
        if (templatesResult.status === "fulfilled") {
          templatesResult.value.forEach((d) => docMap.set(d.id, d));
        }
        if (documentsResult.status === "fulfilled") {
          documentsResult.value.forEach((d) => docMap.set(d.id, d));
        }

        const mapped = Array.from(docMap.values()).map(mapDocumentListItemToUi) as unknown as DocumentItem[];
        setDocuments(mapped);
      } catch (err) {
        showToast(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoadingDocs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalDocs = documents.length;
  const circulatingCount = documents.filter(
    (d) => d.status === "Đang lưu hành" || (d as any).status === "Đang áp dụng",
  ).length;
  const archivedCount = documents.filter(
    (d) => d.status === "Ngưng lưu hành" || (d as any).status === "Lưu trữ",
  ).length;
  const totalDownloadsThisWeek = documents.reduce(
    (acc, curr) => acc + (curr.downloads || 0),
    0,
  );

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.uploader.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat =
      selectedCategory === "Tất cả" || doc.category === selectedCategory;

    const matchesSem =
      semesterFilter === "Tất cả" ||
      doc.semester === "Tất cả học kỳ" ||
      doc.semester === semesterFilter;

    const matchesMajor =
      majorFilter === "Tất cả" ||
      doc.major === "Tất cả ngành" ||
      doc.major === majorFilter;

    const matchesType =
      fileTypeFilter === "Tất cả" || doc.fileType === fileTypeFilter;

    let matchesTab = true;
    if (activeTab === "CIRCULATING") {
      matchesTab = doc.status === "Đang lưu hành" || (doc as any).status === "Đang áp dụng";
    } else if (activeTab === "ARCHIVED") {
      matchesTab = doc.status === "Ngưng lưu hành" || (doc as any).status === "Lưu trữ";
    }

    return (
      matchesSearch &&
      matchesCat &&
      matchesSem &&
      matchesMajor &&
      matchesType &&
      matchesTab
    );
  });

  const handleDownload = async (doc: DocumentItem) => {
    try {
      const { blob, filename } = await documentService.download(
        doc.id,
        doc.fileName || `${doc.title}.bin`,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Đã tải xuống: ${doc.title}`);
    } catch (err) {
      showToast(getApiErrorMessage(err));
    }
  };

  // Archive (Ngưng lưu hành & Ghi log)
  // Modal state cho xóa
  const [deletingDoc, setDeletingDoc] = useState<DocumentItem | null>(null);

  const handleDeleteClick = (doc: DocumentItem) => {
    setDeletingDoc(doc);
  };

  const handleConfirmDeleteClick = () => {
    if (!deletingDoc) return;
    const doc = deletingDoc;
    setDeletingDoc(null);
    handleConfirmDelete(doc);
  };

  const handleConfirmArchive = async () => {
    if (!archivingDoc) return;
    const finalReason = `${archiveReasonInput}${archiveCustomNote ? ` - ${archiveCustomNote}` : ""}`;
    try {
      const updated = await documentService.update(archivingDoc.id, { isPublished: false, archiveReason: finalReason });
      const mapped = mapDocumentListItemToUi(updated) as unknown as DocumentItem;
      setDocuments((prev) => prev.map((d) => d.id === mapped.id ? mapped : d));
      setSelectedDoc((prev) => prev?.id === mapped.id ? mapped : prev);
      showToast(`Đã ngưng lưu hành biểu mẫu "${archivingDoc.title}".`);
      setArchivingDoc(null);
      setArchiveCustomNote("");
    } catch (err) { showToast(getApiErrorMessage(err)); }
  };

  // Re-activate / Circulate (Mở lưu hành lại cho SV)
  // Xóa tài liệu hoàn toàn (xóa bản ghi + xóa file upload)
  const handleConfirmDelete = async (doc: DocumentItem) => {
    if (!doc) return;
    try {
      await documentService.delete(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (selectedDoc && selectedDoc.id === doc.id) {
        setSelectedDoc(null);
        setSubView("list");
      }
      showToast(`Đã xóa biểu mẫu "${doc.title}"`);
    } catch (err) {
      showToast(getApiErrorMessage(err));
    }
  };

  const handleReactivateCirculation = async (doc: DocumentItem) => {
    try {
      const updated = await documentService.update(doc.id, { isPublished: true });
      const mapped = mapDocumentListItemToUi(updated) as unknown as DocumentItem;
      setDocuments((prev) => prev.map((d) => d.id === mapped.id ? mapped : d));
      setSelectedDoc((prev) => prev?.id === mapped.id ? mapped : prev);
      showToast(`Đã mở lưu hành lại cho biểu mẫu "${doc.title}".`);
    } catch (err) { showToast(getApiErrorMessage(err)); }
  };

  const handleSaveDocument = async (payload: any) => {
    try {
      if (editingDoc) {
        const updated = await documentService.update(editingDoc.id, {
          title: payload.title,
          description: payload.description,
          category: payload.category,
        });
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === editingDoc.id
              ? ({ ...d, ...(mapDocumentListItemToUi(updated) as any) } as DocumentItem)
              : d,
          ),
        );
        showToast(`Đã cập nhật tài liệu "${payload.title}"`);
      } else {
        if (!payload.rawFiles || payload.rawFiles.length === 0) {
          showToast("Vui lòng chọn file trước khi tải lên");
          return;
        }
        if (!defaultInternshipId) {
          showToast("Không tìm thấy đợt thực tập để gắn tài liệu");
          return;
        }
        const result = await documentService.uploadSimple({
          internshipId: defaultInternshipId,
          files: payload.rawFiles,
        });
        const newDocs = result.documents.map((d) => mapDocumentListItemToUi(d) as any);
        setDocuments((prev) => [...newDocs, ...prev]);
        showToast(`Đã tải lên ${result.count} tệp${result.count > 1 ? "s" : ""}: ${result.documents.map((d) => d.title).join(", ")}`);
      }
      setEditingDoc(null);
      setUploadModalOpen(false);
      setSubView("list");
    } catch (err) {
      showToast(getApiErrorMessage(err));
    }
  };

  if (subView === "detail" && selectedDoc) {
    return (
      <DocumentDetailWorkspace
        document={selectedDoc}
        onBack={() => setSubView("list")}
        onDownload={handleDownload}
        onArchiveToggle={(doc) => {
          if (doc.status === "Đang lưu hành" || (doc as any).status === "Đang áp dụng") {
            setArchivingDoc(doc);
          } else {
            handleReactivateCirculation(doc);
          }
        }}
      />
    );
  }

  if (subView === "student_library") {
    return (
      <StudentDocumentLibrary
        documents={documents.filter(
          (d) => d.status === "Đang lưu hành" || (d as any).status === "Đang áp dụng",
        )}
        onSelectDoc={(doc) => {
          setSelectedDoc(doc);
          setSubView("detail");
        }}
        onDownloadDoc={handleDownload}
        onSwitchToLecturerView={() => setSubView("list")}
      />
    );
  }

  if (subView === "detail" && selectedDoc) {
    return (
      <DocumentDetailWorkspace
        document={selectedDoc}
        onBack={() => setSubView("list")}
        onDownload={handleDownload}
        onArchiveToggle={(doc) => {
          if (doc.status === "Đang lưu hành" || (doc as any).status === "Đang áp dụng") {
            setArchivingDoc(doc);
          } else {
            handleReactivateCirculation(doc);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto animate-in fade-in duration-200 pb-16 font-sans">
      {/* Toast Alert */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* PAGE HEADER */}
      <PageHeader
        icon={FolderOpen}
        title="Kho biểu mẫu & Tài liệu thực tập"
        subtitle="Đăng tải và quản lý biểu mẫu để sinh viên xem, tải xuống theo từng đợt thực tập."
        actions={[
          {
            label: "+ Đăng biểu mẫu mới",
            icon: CloudUpload,
            onClick: () => setUploadModalOpen(true),
            variant: "primary",
          },
        ]}
      />

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng biểu mẫu & tài liệu</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{documents.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Bao gồm cả tài liệu đang lưu trữ log</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đang lưu hành (Public SV)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{documents.filter((d) => d.status === "Đang lưu hành" || (d as any).status === "Đang áp dụng").length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Sinh viên đợt thực tập có thể thấy & tải</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ngưng lưu hành & Đã lưu Log</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{documents.filter((d) => d.status === "Ngưng lưu hành" || (d as any).status === "Lưu trữ").length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Đã ẩn khỏi sinh viên, lưu nhật ký</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng lượt tải của SV</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{documents.reduce((acc, curr) => acc + (curr.downloads || 0), 0).toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">Theo dõi mức độ sử dụng biểu mẫu</p>
        </div>
      </div>

      {/* TAB SELECTOR & FILTERS */}
      <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs space-y-3">
        {/* TOP ROW: TABS & ACTION BUTTONS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Main Circulation Status Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab("CIRCULATING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "CIRCULATING"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đang lưu hành (Public SV)</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "CIRCULATING" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
                }`}
              >
                {documents.filter((d) => d.status === "Đang lưu hành" || (d as any).status === "Đang áp dụng").length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ARCHIVED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "ARCHIVED"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Ngưng lưu hành</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "ARCHIVED" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
                }`}
              >
                {documents.filter((d) => d.status === "Ngưng lưu hành" || (d as any).status === "Lưu trữ").length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ALL"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Tất cả ({documents.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            {(selectedCategory !== "Tất cả" ||
              semesterFilter !== (selectedSemester?.name || "") ||
              majorFilter !== "Tất cả" ||
              fileTypeFilter !== "Tất cả" ||
              searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("Tất cả");
                  setSemesterFilter(selectedSemester?.name || "");
                  setMajorFilter("Tất cả");
                  setFileTypeFilter("Tất cả");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold"
              >
                Xóa bộ lọc
              </button>
            )}

            {/* Toggle View Mode */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200 shrink-0">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "table" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Chế độ Bảng"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "cards" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Chế độ Thẻ"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: FILTER INPUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          {/* Search input */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên tài liệu, người đăng, nội dung..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-900 font-medium"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-semibold text-slate-800 text-[11px]"
            >
              <option value="Tất cả">Tất cả Danh mục</option>
              <option value="Biểu mẫu">Biểu mẫu</option>
              <option value="Báo cáo">Báo cáo</option>
              <option value="Nhật ký">Nhật ký</option>
              <option value="Kế hoạch">Kế hoạch</option>
              <option value="Hướng dẫn">Hướng dẫn</option>
              <option value="Văn bản khoa">Văn bản khoa</option>
            </select>
          </div>

          <div>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-semibold text-slate-800 text-[11px]"
            >
              <option value="Tất cả">Tất cả Đợt thực tập</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.name}>{s.name} ({s.status === "active" ? "Đang diễn ra" : s.status === "upcoming" ? "Sắp tới" : "Đã đóng"})</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={majorFilter}
              onChange={(e) => setMajorFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-semibold text-slate-800 text-[11px]"
            >
              <option value="Tất cả">Tất cả Chuyên ngành</option>
              <option value="Kỹ thuật Phần mềm">Kỹ thuật Phần mềm</option>
              <option value="Khoa học Dữ liệu">Khoa học Dữ liệu</option>
              <option value="An toàn Thông tin">An toàn Thông tin</option>
            </select>
          </div>

          <div>
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-semibold text-slate-800 text-[11px]"
            >
              <option value="Tất cả">Tất cả Định dạng</option>
              <option value="DOCX">Mẫu DOCX (Word)</option>
              <option value="PDF">Văn bản PDF</option>
              <option value="XLSX">Bảng tính XLSX</option>
              <option value="PPTX">Slide PPTX</option>
            </select>
          </div>
        </div>
      </div>

      {/* DOCUMENT LIST / TABLE */}
      {viewMode === "table" ? (
        <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tên tài liệu / Biểu mẫu</th>
                  <th className="py-3.5 px-3">Danh mục</th>
                  <th className="py-3.5 px-3">Đợt áp dụng</th>
                  <th className="py-3.5 px-3">Phiên bản</th>
                  <th className="py-3.5 px-3">Trạng thái lưu hành</th>
                  <th className="py-3.5 px-3 text-center">Lượt tải SV</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                {isLoadingDocs ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                      Đang tải danh sách tài liệu...
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                      Không có biểu mẫu nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => {
                    const isCirc =
                      doc.status === "Đang lưu hành" || (doc as any).status === "Đang áp dụng";
                    return (
                      <tr
                        key={doc.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !isCirc ? "bg-slate-50/40 opacity-90" : ""
                        }`}
                      >
                        {/* Title */}
                        <td className="py-3.5 px-4 max-w-[320px]">
                          <div>
                            <span
                              onClick={() => {
                                setSelectedDoc(doc);
                                setSubView("detail");
                              }}
                              className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer block line-clamp-1"
                            >
                              {doc.title}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>
                                {doc.fileType} • {doc.fileSize}
                              </span>
                              <span>•</span>
                              <span>Đăng bởi: {doc.uploader}</span>
                            </div>
                            {!isCirc && doc.archiveReason && (
                              <p className="text-[10px] text-amber-700 font-semibold mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 line-clamp-1">
                                Lý do ngưng: {doc.archiveReason}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded border border-slate-200">
                            {doc.category}
                          </span>
                        </td>

                        {/* Semester */}
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-blue-700 text-xs">
                            {doc.semester}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {doc.major}
                          </span>
                        </td>

                        {/* Version */}
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded border border-blue-200">
                            {doc.version}
                          </span>
                        </td>

                        {/* Circulation Status */}
                        <td className="py-3.5 px-3">
                          {isCirc ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Đang lưu hành (Public)
                            </span>
                          ) : doc.status === "Bản nháp" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-md border border-blue-200">
                              Bản nháp
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 font-bold text-[10px] rounded-md border border-amber-300">
                              <Archive className="w-3 h-3 text-amber-600" />
                              Ngưng lưu hành (Đã ẩn)
                            </span>
                          )}
                        </td>

                        {/* Downloads */}
                        <td className="py-3.5 px-3 text-center font-bold text-blue-600">
                          {doc.downloads.toLocaleString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setSubView("detail");
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {!(doc as any).isOfficial && (
                              <button
                                onClick={() => handleDeleteClick(doc)}
                                className="p-1.5 hover:bg-rose-100 rounded-lg text-slate-600 hover:text-rose-700"
                                title="Xóa biểu mẫu"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-emerald-600"
                              title="Tải xuống"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Archive / Reactivate Button */}
                            {!(doc as any).isOfficial && (
                              isCirc ? (
                                <button
                                  onClick={() => setArchivingDoc(doc)}
                                  className="p-1.5 hover:bg-amber-100 rounded-lg text-slate-600 hover:text-amber-700"
                                  title="Ngưng lưu hành & Chuyển vào Log"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivateCirculation(doc)}
                                  className="p-1.5 hover:bg-emerald-100 rounded-lg text-slate-600 hover:text-emerald-700"
                                  title="Mở lưu hành lại cho SV"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const isCirc =
              doc.status === "Đang lưu hành" || (doc as any).status === "Đang áp dụng";
            return (
              <div
                key={doc.id}
                className={`bg-white rounded-lg p-4 border shadow-xs transition-colors flex flex-col justify-between space-y-3 ${
                  isCirc ? "border-slate-200/80" : "border-amber-200/80 bg-amber-50/20"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                      {doc.category}
                    </span>

                    {isCirc ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Đang lưu hành
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-300 flex items-center gap-1">
                        <Archive className="w-3 h-3" />
                        Ngưng lưu hành (Ẩn)
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => {
                      setSelectedDoc(doc);
                      setSubView("detail");
                    }}
                    className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer line-clamp-2"
                  >
                    {doc.title}
                  </h3>

                  <p className="text-xs text-slate-500 font-medium line-clamp-2">
                    {doc.description ||
                      "Biểu mẫu chuẩn ban hành theo quy định của Khoa CNTT."}
                  </p>

                  {!isCirc && doc.archiveReason && (
                    <div className="p-2 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-900 space-y-0.5">
                      <span className="font-bold text-[10px] text-amber-700 uppercase">
                        Lý do ngưng lưu hành:
                      </span>
                      <p className="line-clamp-2">{doc.archiveReason}</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>
                      {doc.fileType} • {doc.fileSize} • {doc.semester}
                    </span>
                    <span>{doc.downloads.toLocaleString()} lượt tải</span>
                  </div>                    <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        setSelectedDoc(doc);
                        setSubView("detail");
                      }}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Chi tiết</span>
                    </button>                      {!(doc as any).isOfficial && (
                        <button
                          onClick={() => handleDeleteClick(doc)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md border border-rose-200"
                          title="Xóa biểu mẫu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDownload(doc)}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải về</span>
                      </button>

                      {!(doc as any).isOfficial && (
                        isCirc ? (
                          <button
                            onClick={() => setArchivingDoc(doc)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-md border border-amber-200"
                            title="Ngưng lưu hành"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivateCirculation(doc)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200"
                            title="Mở lưu hành lại"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL UPLOAD TÀI LIỆU */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <CloudUpload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tải tài liệu lên kho biểu mẫu
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Tải file PDF/Word/Excel/Slide đính kèm cho đợt thực tập đang chọn.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  setEditingDoc(null);
                  setSubView("list");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông tin đợt thực tập */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
              <p className="font-bold">Đợt thực tập:</p>
              <p className="text-slate-600">
                {defaultInternshipId
                  ? `Gắn vào đợt thực tập đang chọn`                    : "Chưa có đợt thực tập nào. Vui lòng chọn trước."}
              </p>
            </div>

            <UploadDocumentWorkspace
              initialData={null}
              onBack={() => {
                setUploadModalOpen(false);
              }}
              onSave={handleSaveDocument}
            />
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Xóa biểu mẫu / tài liệu
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    File cũng sẽ bị xóa khỏi thư mục upload
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeletingDoc(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200/80 text-xs text-rose-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Biểu mẫu: {deletingDoc.title}</span>
              </div>
              <p className="text-rose-800/90 text-[11px] leading-relaxed">
                Hành động này sẽ <strong>xóa vĩnh viễn biểu mẫu và file đính kèm</strong> khỏi hệ thống. Không thể hoàn tác.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteClick}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CONFIRM ARCHIVE (NGƯNG LƯU HÀNH & GHI LOG) */}
      {archivingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ngưng lưu hành biểu mẫu &amp; Chuyển vào Log
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Ẩn khỏi sinh viên và lưu vết vào Nhật ký kiểm toán
                  </p>
                </div>
              </div>
              <button
                onClick={() => setArchivingDoc(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/80 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Biểu mẫu: {archivingDoc.title}</span>
              </div>
              <p className="text-amber-800/90 text-[11px] leading-relaxed">
                Khi ngưng lưu hành, sinh viên trong đợt thực tập sẽ <strong>không còn thấy và không thể tải về</strong> biểu mẫu này nữa. Mọi thông tin và tệp sẽ được lưu trữ an toàn trong kho dữ liệu Log.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Lý do ngưng lưu hành: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={archiveReasonInput}
                  onChange={(e) => setArchiveReasonInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-semibold text-slate-900 focus:border-amber-500 focus:bg-white"
                >
                  <option value="Thay thế bằng mẫu mới chuẩn hóa">
                    🔄 Đã có mẫu mới thay thế (Cập nhật quy định mới)
                  </option>
                  <option value="Hết thời hạn nộp của đợt thực tập">
                    ⏳ Hết thời hạn áp dụng / Kết thúc đợt thực tập
                  </option>
                  <option value="Điều chỉnh theo quy chế mới của Khoa">
                    📜 Điều chỉnh theo quyết định / quy chế của Khoa
                  </option>
                  <option value="Ngưng áp dụng theo yêu cầu Bộ môn">
                    🏢 Ngưng áp dụng theo yêu cầu Bộ môn chuyên môn
                  </option>
                  <option value="Lý do khác">
                    ✏️ Lý do khác (Nhập chi tiết bên dưới)
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Ghi chú chi tiết thêm:
                </label>
                <textarea
                  rows={2}
                  value={archiveCustomNote}
                  onChange={(e) => setArchiveCustomNote(e.target.value)}
                  placeholder="Ghi chú thêm về văn bản thay thế hoặc hướng dẫn đối soát nếu có..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-medium text-slate-800 focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setArchivingDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleConfirmArchive}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center gap-1.5"
              >
                <Archive className="w-4 h-4" />
                <span>Xác nhận Ngưng lưu hành &amp; Lưu Log</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
