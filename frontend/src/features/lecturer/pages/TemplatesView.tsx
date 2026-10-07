import { useState, useMemo, useEffect, useCallback } from "react";
import { Toast } from "../../../components/common/Toast";
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
  RefreshCw,
  X,
} from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import { UploadDocumentWorkspace } from "../components/UploadDocumentWorkspace";
import { DocumentDetailWorkspace } from "../components/DocumentDetailWorkspace";
import { StudentDocumentLibrary } from "../components/StudentDocumentLibrary";
import { LecturerSubPageHeader } from "../components/LecturerSubPageHeader";
import { useSemester } from "../../../contexts/SemesterContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { mapDocumentListItemToUi } from "../../../lib/documentMappers";
import { documentService } from "../../../services/document.service";
import { lecturerInternshipsService } from "../../../services/lecturerInternships.service";
import type { DocumentItem } from "../../../types/document";

export const TemplatesView = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [internships, setInternships] = useState<
    Awaited<ReturnType<typeof lecturerInternshipsService.getAll>>
  >([]);
  const [selectedInternshipId, setSelectedInternshipId] = useState<string | null>(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [isLoadingInternship, setIsLoadingInternship] = useState(true);
  const [internshipError, setInternshipError] = useState<string | null>(null);
  const [subView, setSubView] = useState<"list" | "upload" | "detail" | "student_library">("list");
  const [activeTab, setActiveTab] = useState<"ALL" | "CIRCULATING" | "ARCHIVED">("CIRCULATING");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const { semesters, selectedSemester } = useSemester();
  const [semesterFilter, setSemesterFilter] = useState("Tất cả");
  const [departmentFilter, setDepartmentFilter] = useState("Tất cả");
  const [fileTypeFilter, setFileTypeFilter] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
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

  const loadDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    setDocumentsError(null);
    try {
      const [documentsResult, templatesResult] = await Promise.all([
        documentService.getAll(),
        documentService.getTemplates(),
      ]);
      const documentMap = new Map(
        [...templatesResult, ...documentsResult].map((document) => [
          document.id,
          document,
        ]),
      );
      setDocuments(
        Array.from(documentMap.values()).map(mapDocumentListItemToUi),
      );
    } catch (err) {
      setDocumentsError(getApiErrorMessage(err));
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    setSemesterFilter(
      selectedSemester?.id && selectedSemester.id !== "all"
        ? selectedSemester.id
        : "Tất cả",
    );
  }, [selectedSemester?.id]);

  // Gắn tài liệu vào internship của kỳ ĐANG CHỌN (không phải internship đầu tiên trả về)
  useEffect(() => {
    let cancelled = false;
    setIsLoadingInternship(true);
    setInternships([]);
    setSelectedInternshipId(null);
    const semesterId = selectedSemester?.id && selectedSemester.id !== "all" ? selectedSemester.id : undefined;
    lecturerInternshipsService
      .getAll(semesterId)
      .then((rows) => {
        if (cancelled) return;
        setInternshipError(null);
        setInternships(rows);
        setSelectedInternshipId(rows.length === 1 ? rows[0].id : null);
      }).catch((err: unknown) => {
        if (cancelled) return;
        setInternships([]);
        setSelectedInternshipId(null);
        setInternshipError(getApiErrorMessage(err));
      }).finally(() => {
        if (!cancelled) setIsLoadingInternship(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSemester?.id]);

  const selectedDocId = selectedDoc?.id;
  useEffect(() => {
    if (subView !== "detail" || !selectedDocId) return;
    let cancelled = false;
    setIsLoadingVersions(true);
    documentService
      .getVersions(selectedDocId)
      .then((versions) => {
        if (cancelled) return;
        setSelectedDoc((current) =>
          current?.id === selectedDocId
            ? {
                ...current,
                versionHistory: versions.map((version) => ({
                  version: `v${version.versionNumber}`,
                  date: new Date(version.uploadedAt).toLocaleDateString("vi-VN"),
                  author: version.uploadedById || "Chưa cập nhật",
                  note: version.changeNote || "Chưa có ghi chú phiên bản.",
                })),
              }
            : current,
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) showToast(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingVersions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDocId, subView]);

  const categories = useMemo(
    () => [...new Set(documents.map((document) => document.category))].sort((a, b) => a.localeCompare(b, "vi")),
    [documents],
  );
  const departments = useMemo(
    () => [...new Set(documents.map((document) => document.department))].sort((a, b) => a.localeCompare(b, "vi")),
    [documents],
  );
  const fileTypes = useMemo(
    () => [...new Set(documents.map((document) => document.fileType))].sort(),
    [documents],
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
      !doc.semesterId ||
      doc.semesterId === semesterFilter;

    const matchesDepartment =
      departmentFilter === "Tất cả" ||
      doc.department === departmentFilter;

    const matchesType =
      fileTypeFilter === "Tất cả" || doc.fileType === fileTypeFilter;

    let matchesTab = true;
    if (activeTab === "CIRCULATING") {
      matchesTab = doc.status === "Đang lưu hành";
    } else if (activeTab === "ARCHIVED") {
      matchesTab = doc.status === "Ngưng lưu hành";
    }

    return (
      matchesSearch &&
      matchesCat &&
      matchesSem &&
      matchesDepartment &&
      matchesType &&
      matchesTab
    );
  });

  const handleRefresh = async () => {
    await loadDocuments();
  };

  const handleDownload = async (doc: DocumentItem): Promise<boolean> => {
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
      return true;
    } catch (err) {
      showToast(getApiErrorMessage(err));
      return false;
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
      const mapped = mapDocumentListItemToUi(updated);
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
      const mapped = mapDocumentListItemToUi(updated);
      setDocuments((prev) => prev.map((d) => d.id === mapped.id ? mapped : d));
      setSelectedDoc((prev) => prev?.id === mapped.id ? mapped : prev);
      showToast(`Đã mở lưu hành lại cho biểu mẫu "${doc.title}".`);
    } catch (err) { showToast(getApiErrorMessage(err)); }
  };

  const handleSaveDocument = async (payload: {
    title?: string;
    description?: string;
    category?: string;
    rawFiles?: File[];
  }) => {
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
              ? mapDocumentListItemToUi(updated)
              : d,
          ),
        );
        showToast(`Đã cập nhật tài liệu "${payload.title}"`);
      } else {
        if (!payload.rawFiles || payload.rawFiles.length === 0) {
          showToast("Vui lòng chọn file trước khi tải lên");
          return;
        }
        if (!selectedInternshipId) {
          showToast("Vui lòng chọn sinh viên/đợt thực tập để gắn tài liệu");
          return;
        }
        const result = await documentService.uploadSimple({
          internshipId: selectedInternshipId,
          files: payload.rawFiles,
        });
        const newDocs = result.documents.map(mapDocumentListItemToUi);
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

  if (subView === "student_library") {
    return (
      <div className="mx-auto max-w-[1300px] space-y-4 pb-12 font-sans">
        <StudentDocumentLibrary
          documents={documents.filter(
            (d) => d.status === "Đang lưu hành",
          )}
          onSelectDoc={(doc) => {
            setSelectedDoc(doc);
            setSubView("detail");
          }}
          onDownloadDoc={handleDownload}
          onSwitchToLecturerView={() => setSubView("list")}
        />
      </div>
    );
  }

  if (subView === "detail" && selectedDoc) {
    return (
      <div className="mx-auto max-w-[1300px] space-y-4 pb-12 font-sans">
        <DocumentDetailWorkspace
          document={selectedDoc}
          isLoadingVersions={isLoadingVersions}
          onBack={() => setSubView("list")}
          onDownload={handleDownload}
          onArchiveToggle={
            selectedDoc.isOfficial
              ? undefined
              : (doc) => {
                  if (doc.status === "Đang lưu hành") {
                    setArchivingDoc(doc);
                  } else {
                    handleReactivateCirculation(doc);
                  }
                }
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 pb-12 font-sans">
      {/* Toast Alert */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />


      <LecturerSubPageHeader
        icon={FolderOpen}
        title="Kho biểu mẫu & tài liệu thực tập"
        subtitle="Quản lý tài liệu dành cho sinh viên theo đợt thực tập."
      >
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isLoadingDocs}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingDocs ? "animate-spin" : ""}`} aria-hidden="true" />
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 text-xs font-semibold text-[#025a8e] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#026aa7] sm:flex-none"
          >
            <CloudUpload className="h-4 w-4" aria-hidden="true" />
            Tải tài liệu cho sinh viên
          </button>
      </LecturerSubPageHeader>

      {/* TAB SELECTOR & FILTERS */}
      <Panel className="space-y-4 rounded-xl border border-slate-200/90 shadow-2xs">
        {/* TOP ROW: TABS & ACTION BUTTONS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Main Circulation Status Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab("CIRCULATING")}
              className={`min-h-11 rounded-full px-4 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "CIRCULATING"
                ? "bg-[#026aa7] text-white shadow-2xs"
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
                {documents.filter((d) => d.status === "Đang lưu hành").length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ARCHIVED")}
              className={`min-h-11 rounded-full px-4 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "ARCHIVED"
                ? "bg-amber-600 text-white shadow-2xs"
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
                {documents.filter((d) => d.status === "Ngưng lưu hành").length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ALL")}
              className={`min-h-11 rounded-full px-4 text-xs font-semibold transition-colors ${
                activeTab === "ALL"
                ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Tất cả ({documents.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            {Boolean(
              selectedCategory !== "Tất cả" ||
              semesterFilter !== "Tất cả" ||
              departmentFilter !== "Tất cả" ||
              fileTypeFilter !== "Tất cả" ||
              searchQuery,
            ) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("Tất cả");
                  // Reset về "Tất cả" — không gán tên kỳ đang chọn (gây latch bộ lọc).
                  setSemesterFilter("Tất cả");
                  setDepartmentFilter("Tất cả");
                  setFileTypeFilter("Tất cả");
                }}
                className="min-h-11 rounded-full px-3 text-xs font-semibold text-[#026aa7] hover:bg-[#026aa7]/5 hover:text-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30"
              >
                Xóa bộ lọc
              </button>
            )}

            {/* Toggle View Mode */}
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1 shrink-0">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "table" ? "bg-white text-[#026aa7] shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Chế độ Bảng"
                aria-label="Chế độ bảng"
                aria-pressed={viewMode === "table"}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "cards" ? "bg-white text-[#026aa7] shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Chế độ Thẻ"
                aria-label="Chế độ thẻ"
                aria-pressed={viewMode === "cards"}
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
              aria-label="Tìm tài liệu"
              className="min-h-11 w-full rounded-full border border-slate-300 bg-white pl-10 pr-4 text-base font-medium text-slate-800 outline-none transition-colors placeholder:font-normal placeholder:text-slate-500 hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 sm:text-xs"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Lọc theo danh mục"
              className="min-h-11 w-full rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="Tất cả">Tất cả Danh mục</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              aria-label="Lọc theo đợt thực tập"
              className="min-h-11 w-full rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="Tất cả">Tất cả Đợt thực tập</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              aria-label="Lọc theo đơn vị"
              className="min-h-11 w-full rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="Tất cả">Tất cả đơn vị</option>
              {departments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              aria-label="Lọc theo định dạng tệp"
              className="min-h-11 w-full rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="Tất cả">Tất cả Định dạng</option>
              {fileTypes.map((fileType) => (
                <option key={fileType} value={fileType}>{fileType}</option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      {/* DOCUMENT LIST / TABLE */}
      {documentsError ? (
        <Panel role="alert" className="space-y-3 rounded-xl border border-rose-200 p-6 text-center shadow-2xs">
          <p className="text-sm font-semibold text-rose-800">
            Không thể tải danh sách tài liệu: {documentsError}
          </p>
          <button
            type="button"
            onClick={() => void loadDocuments()}
            className="min-h-11 rounded-full bg-[#026aa7] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
          >
            Thử tải lại
          </button>
        </Panel>
      ) : viewMode === "table" ? (
        <Panel padding="none" className="overflow-hidden rounded-xl border border-slate-200/90 shadow-2xs">
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
                      <FolderOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" aria-hidden="true" />
                      Không có tài liệu phù hợp. Hãy đổi bộ lọc hoặc đăng tài liệu mới.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => {
                    const isCirc = doc.status === "Đang lưu hành";
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
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDoc(doc);
                                setSubView("detail");
                              }}
                              className="block max-w-full truncate text-left font-bold text-slate-900 transition-colors hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30"
                            >
                              {doc.title}
                            </button>
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
                          <span className="font-bold text-slate-800 text-xs">
                            {doc.semester}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {doc.department}
                          </span>
                        </td>

                        {/* Version */}
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 bg-[#026aa7]/5 text-[#025a8e] font-bold text-[10px] rounded border border-[#026aa7]/20">
                            {doc.version}
                          </span>
                        </td>

                        {/* Circulation Status */}
                        <td className="py-3.5 px-3">
                          {isCirc ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#7bc043]/10 text-[#446d20] font-bold text-[10px] rounded-md border border-[#7bc043]/40">
                              <CheckCircle2 className="w-3 h-3" />
                              Đang lưu hành (Public)
                            </span>
                          ) : doc.status === "Bản nháp" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#026aa7]/5 text-[#025a8e] font-bold text-[10px] rounded-md border border-[#026aa7]/20">
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
                        <td className="py-3.5 px-3 text-center font-bold text-slate-800">
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
                              className="min-h-10 min-w-10 rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30"
                              title="Xem chi tiết"
                              aria-label={`Xem chi tiết: ${doc.title}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {!doc.isOfficial && (
                              <button
                                onClick={() => handleDeleteClick(doc)}
                                className="min-h-10 min-w-10 rounded-full text-slate-600 transition-colors hover:bg-rose-100 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                                title="Xóa biểu mẫu"
                                aria-label={`Xóa biểu mẫu: ${doc.title}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDownload(doc)}
                              className="min-h-10 min-w-10 rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30"
                              title="Tải xuống"
                              aria-label={`Tải xuống: ${doc.title}`}
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Archive / Reactivate Button */}
                            {!doc.isOfficial && (
                              isCirc ? (
                                <button
                                  onClick={() => setArchivingDoc(doc)}
                                  className="min-h-10 min-w-10 rounded-full text-slate-600 transition-colors hover:bg-amber-100 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                                  title="Ngưng lưu hành & Chuyển vào Log"
                                  aria-label={`Ngưng lưu hành: ${doc.title}`}
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivateCirculation(doc)}
                                  className="min-h-10 min-w-10 rounded-full text-slate-600 transition-colors hover:bg-[#7bc043]/10 hover:text-[#446d20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7bc043]/40"
                                  title="Mở lưu hành lại cho SV"
                                  aria-label={`Mở lưu hành lại: ${doc.title}`}
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
        </Panel>
      ) : (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoadingDocs ? (
            <div className="col-span-full py-10 text-center text-slate-400 font-medium text-xs">
              Đang tải danh sách tài liệu...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="col-span-full flex flex-col items-center gap-2 rounded-xl border border-slate-200/90 bg-white py-10 text-center shadow-2xs">
              <FolderOpen className="h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-700">
                Không có tài liệu phù hợp.
              </p>
              <p className="text-xs text-slate-500">
                Hãy đổi bộ lọc hoặc đăng tài liệu mới.
              </p>
            </div>
          ) : null}
          {!isLoadingDocs && filteredDocuments.map((doc) => {
            const isCirc = doc.status === "Đang lưu hành";
            return (
              <div
                key={doc.id}
                className={`flex flex-col justify-between space-y-3 rounded-xl border p-4 shadow-2xs transition-colors ${
                  isCirc ? "border-slate-200/90 bg-white" : "border-amber-200/80 bg-amber-50/20"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                      {doc.category}
                    </span>

                    {isCirc ? (
                      <span className="flex items-center gap-1 rounded border border-[#7bc043]/40 bg-[#7bc043]/10 px-2 py-0.5 text-[10px] font-bold text-[#446d20]">
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

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDoc(doc);
                      setSubView("detail");
                    }}
                    className="min-h-11 line-clamp-2 text-left text-sm font-bold text-slate-900 transition-colors hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30"
                  >
                    {doc.title}
                  </button>

                  <p className="text-xs text-slate-500 font-medium line-clamp-2">
                    {doc.description || "Chưa có mô tả."}
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
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        setSelectedDoc(doc);
                        setSubView("detail");
                      }}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Chi tiết</span>
                    </button>
                    {!doc.isOfficial && (
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
                        className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full bg-[#026aa7] py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải về</span>
                      </button>

                      {!doc.isOfficial && (
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
                            className="min-h-10 min-w-10 rounded-full border border-[#7bc043]/40 bg-[#7bc043]/10 text-[#446d20] transition-colors hover:bg-[#7bc043]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7bc043]/40"
                            title="Mở lưu hành lại"
                            aria-label={`Mở lưu hành lại: ${doc.title}`}
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
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#026aa7]/10 text-[#026aa7] flex items-center justify-center">
                  <CloudUpload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tải tài liệu thực tập lên
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Tệp sẽ được đính kèm vào sinh viên và đợt thực tập đã chọn.
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
                aria-label="Đóng tải tài liệu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông tin đợt thực tập */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <p className="font-bold">Đợt thực tập:</p>
              <p className="text-slate-600">
                {isLoadingInternship
                  ? "Đang tải đợt thực tập..."
                  : internshipError
                    ? `Không thể tải đợt thực tập: ${internshipError}`
                    : internships.length === 0
                      ? "Chưa có đợt thực tập nào trong học kỳ đang chọn."
                      : selectedInternshipId
                        ? `Tài liệu sẽ được gắn vào: ${
                            internships.find((internship) => internship.id === selectedInternshipId)?.student?.fullName ||
                            "Chưa cập nhật"
                          } (${
                            internships.find((internship) => internship.id === selectedInternshipId)?.student?.studentCode ||
                            "—"
                          }).`
                        : "Chọn sinh viên nhận tài liệu. Tệp sẽ được gắn vào internship đã chọn."}
              </p>
              {!isLoadingInternship && internships.length > 0 && (
                <select
                  aria-label="Chọn sinh viên và đợt thực tập nhận tài liệu"
                  value={selectedInternshipId ?? ""}
                  onChange={(event) =>
                    setSelectedInternshipId(event.target.value || null)
                  }
                  className="mt-2 min-h-11 w-full rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                >
                  <option value="">Chọn sinh viên / đợt thực tập</option>
                  {internships.map((internship) => (
                    <option key={internship.id} value={internship.id}>
                      {internship.student?.studentCode || "—"} ·{" "}
                      {internship.student?.fullName || "Chưa cập nhật"} ·{" "}
                      {internship.company?.companyName || "Chưa cập nhật"}
                    </option>
                  ))}
                </select>
              )}
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
