import React, { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Download,
  Trash2,
  Edit2,
  Archive,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  FileType,
  Check,
  AlertCircle,
  X,
  Upload,
} from "lucide-react";
import { documentService } from "../../../services/document.service";
import { adminSemestersService, type BackendSemesterDto } from "../../../services/adminSemesters.service";
import type { DocumentListItemDto, TemplateStatsDto } from "../../../types/api";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";

import type { ToastType } from "../../../contexts/ToastContext";

interface TemplatesViewProps {
  onShowToast?: (message: string, type?: ToastType) => void;
}

const CATEGORIES = [
  { value: "", label: "Tất cả danh mục" },
  { value: "FinalReport", label: "Báo cáo tổng kết / Khóa luận" },
  { value: "WeeklyReport", label: "Báo cáo tuần & Đề cương" },
  { value: "CompanyEvaluation", label: "Đánh giá Doanh nghiệp" },
  { value: "LecturerEvaluation", label: "Phiếu chấm Giảng viên" },
  { value: "GuidanceSchedule", label: "Lịch hướng dẫn thực tập" },
  { value: "Other", label: "Biểu mẫu khác" },
];

const DEPARTMENTS = [
  { value: "", label: "Tất cả Khoa / Bộ môn" },
  { value: "CNTT", label: "Công nghệ thông tin (CNTT)" },
  { value: "QTKD", label: "Quản trị kinh doanh (QTKD)" },
  { value: "Du lịch", label: "Du lịch & Khách sạn" },
  { value: "Ngoại ngữ", label: "Ngoại ngữ" },
];

export const TemplatesView: React.FC<TemplatesViewProps> = ({ onShowToast }) => {
  const { canMutateOps, isSuperAdmin } = useAdminCapabilities();
  const [templates, setTemplates] = useState<DocumentListItemDto[]>([]);
  const [stats, setStats] = useState<TemplateStatsDto | null>(null);
  const [semesters, setSemesters] = useState<BackendSemesterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "published" | "archived">("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentListItemDto | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<DocumentListItemDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    title: "",
    department: "",
    semesterId: "",
    category: "FinalReport",
    version: "1.0",
    description: "",
    isRequired: false,
    isPublished: true,
  });
  const [createFile, setCreateFile] = useState<File | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: "",
    department: "",
    semesterId: "",
    category: "",
    version: "",
    description: "",
    isRequired: false,
    isPublished: true,
    archiveReason: "",
  });
  const [editFile, setEditFile] = useState<File | null>(null);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [tpls, st, sems] = await Promise.all([
        documentService.getTemplates(),
        documentService.getTemplateStats().catch(() => null),
        adminSemestersService.getAll().catch(() => []),
      ]);
      setTemplates(tpls);
      setStats(st);
      setSemesters(sems);
    } catch (err: any) {
      onShowToast?.(err?.message || "Không thể tải danh sách biểu mẫu", "danger");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSeedDefaults = async () => {
    if (!window.confirm("Hệ thống sẽ nạp các biểu mẫu chuẩn mặc định của trường vào thư viện. Bạn có muốn tiếp tục?")) {
      return;
    }
    try {
      setIsSubmitting(true);
      await documentService.seedTemplates();
      onShowToast?.("Đã nạp biểu mẫu chuẩn mặc định thành công!", "success");
      await loadData();
    } catch (err: any) {
      onShowToast?.(err?.message || "Khởi tạo biểu mẫu thất bại", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFile) {
      onShowToast?.("Vui lòng chọn tệp đính kèm biểu mẫu", "warning");
      return;
    }
    if (!createForm.title.trim()) {
      onShowToast?.("Vui lòng nhập tên biểu mẫu", "warning");
      return;
    }

    try {
      setIsSubmitting(true);
      await documentService.createTemplate({
        title: createForm.title.trim(),
        department: createForm.department || undefined,
        semesterId: createForm.semesterId || undefined,
        category: createForm.category || undefined,
        version: createForm.version || "1.0",
        description: createForm.description || undefined,
        isRequired: createForm.isRequired,
        isPublished: createForm.isPublished,
        file: createFile,
      });

      onShowToast?.("Tải lên và ban hành biểu mẫu mới thành công!", "success");
      setShowCreateModal(false);
      setCreateFile(null);
      setCreateForm({
        title: "",
        department: "",
        semesterId: "",
        category: "FinalReport",
        version: "1.0",
        description: "",
        isRequired: false,
        isPublished: true,
      });
      await loadData();
    } catch (err: any) {
      onShowToast?.(err?.message || "Thêm biểu mẫu thất bại", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (tpl: DocumentListItemDto) => {
    setEditingTemplate(tpl);
    setEditForm({
      title: tpl.title,
      department: tpl.department || "",
      semesterId: tpl.semesterId || "",
      category: tpl.category || "Other",
      version: tpl.version || "1.0",
      description: tpl.description || "",
      isRequired: tpl.isRequired,
      isPublished: tpl.isPublished,
      archiveReason: tpl.archiveReason || "",
    });
    setEditFile(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    try {
      setIsSubmitting(true);
      await documentService.updateTemplate(editingTemplate.id, {
        title: editForm.title.trim(),
        department: editForm.department || undefined,
        semesterId: editForm.semesterId || undefined,
        category: editForm.category || undefined,
        version: editForm.version || undefined,
        description: editForm.description || undefined,
        isRequired: editForm.isRequired,
        isPublished: editForm.isPublished,
        archiveReason: !editForm.isPublished ? editForm.archiveReason : undefined,
        file: editFile || undefined,
      });

      onShowToast?.("Cập nhật thông tin biểu mẫu thành công!", "success");
      setEditingTemplate(null);
      await loadData();
    } catch (err: any) {
      onShowToast?.(err?.message || "Cập nhật biểu mẫu thất bại", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async (tpl: DocumentListItemDto) => {
    const nextPublished = !tpl.isPublished;
    const confirmMsg = nextPublished
      ? `Ban hành lại biểu mẫu "${tpl.title}" cho sinh viên và giảng viên sử dụng?`
      : `Thu hồi / Tạm ẩn biểu mẫu "${tpl.title}"? Sinh viên sẽ không thể tải biểu mẫu này.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await documentService.updateTemplate(tpl.id, {
        isPublished: nextPublished,
        archiveReason: !nextPublished ? "Ban quản lý khoa thu hồi lưu hành" : undefined,
      });
      onShowToast?.(
        nextPublished ? "Đã ban hành biểu mẫu thành công!" : "Đã thu hồi biểu mẫu vào kho lưu trữ!",
        "success"
      );
      await loadData();
    } catch (err: any) {
      onShowToast?.(err?.message || "Không thể thay đổi trạng thái biểu mẫu", "danger");
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    try {
      setIsSubmitting(true);
      await documentService.deleteTemplate(deletingTemplate.id);
      onShowToast?.("Đã xóa biểu mẫu thành công!", "success");
      setDeletingTemplate(null);
      await loadData();
    } catch (err: any) {
      onShowToast?.(err?.message || "Không thể xóa biểu mẫu", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (tpl: DocumentListItemDto) => {
    try {
      await documentService.download(tpl.id, tpl.fileName);
      // Update local download count
      setTemplates((prev) =>
        prev.map((t) => (t.id === tpl.id ? { ...t, downloadCount: t.downloadCount + 1 } : t))
      );
      if (stats) {
        setStats({ ...stats, totalDownloads: stats.totalDownloads + 1 });
      }
    } catch (err: any) {
      onShowToast?.("Tải xuống biểu mẫu thất bại", "danger");
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls") {
      return <FileSpreadsheet className="w-8 h-8 text-emerald-600 flex-shrink-0" />;
    }
    if (ext === "docx" || ext === "doc") {
      return <FileType className="w-8 h-8 text-blue-600 flex-shrink-0" />;
    }
    if (ext === "pdf") {
      return <FileText className="w-8 h-8 text-rose-600 flex-shrink-0" />;
    }
    return <FileText className="w-8 h-8 text-slate-500 flex-shrink-0" />;
  };

  const getCategoryLabel = (category?: string | null) => {
    const found = CATEGORIES.find((c) => c.value === category);
    return found ? found.label : category || "Chung";
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = tpl.title.toLowerCase().includes(term);
        const matchFileName = tpl.fileName.toLowerCase().includes(term);
        const matchDesc = tpl.description?.toLowerCase().includes(term) ?? false;
        if (!matchTitle && !matchFileName && !matchDesc) return false;
      }
      // Semester
      if (selectedSemester && tpl.semesterId !== selectedSemester) {
        return false;
      }
      // Dept
      if (selectedDept && tpl.department !== selectedDept && tpl.department !== null) {
        return false;
      }
      // Category
      if (selectedCategory && tpl.category !== selectedCategory) {
        return false;
      }
      // Status
      if (selectedStatus === "published" && !tpl.isPublished) return false;
      if (selectedStatus === "archived" && tpl.isPublished) return false;

      return true;
    });
  }, [templates, searchTerm, selectedSemester, selectedDept, selectedCategory, selectedStatus]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FileText className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-800">Biểu mẫu & Tài liệu chính thức</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý, ban hành và đồng bộ các biểu mẫu chuẩn thực tập theo từng Khoa và Học kỳ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canMutateOps && (
            <button
              onClick={handleSeedDefaults}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100/70 font-medium text-sm transition flex items-center gap-1.5 shadow-sm"
              title="Nạp nhanh các biểu mẫu chuẩn thực tế"
            >
              <Sparkles className="w-4 h-4" />
              <span>Nạp mẫu chuẩn</span>
            </button>
          )}

          <button
            onClick={() => loadData()}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {canMutateOps && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition flex items-center gap-1.5 shadow-sm shadow-blue-200"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm biểu mẫu mới</span>
            </button>
          )}
        </div>
      </div>

      {isSuperAdmin && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>
            <strong>Chế độ chỉ xem nghiệp vụ khoa:</strong> Bạn đang đăng nhập tài khoản Super Admin. Toàn bộ tính năng nạp, tạo, sửa, lưu hành và xóa biểu mẫu thuộc thẩm quyền quản trị của Admin khoa. Bạn vẫn có thể tra cứu, lọc và tải xuống biểu mẫu.
          </span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tổng số biểu mẫu</div>
            <div className="text-2xl font-bold text-slate-800">{stats?.totalTemplates ?? templates.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Đang ban hành</div>
            <div className="text-2xl font-bold text-emerald-600">
              {stats?.publishedCount ?? templates.filter((t) => t.isPublished).length}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Đã lưu trữ / Tạm ẩn</div>
            <div className="text-2xl font-bold text-amber-600">
              {stats?.archivedCount ?? templates.filter((t) => !t.isPublished).length}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Lượt tải xuống</div>
            <div className="text-2xl font-bold text-purple-600">
              {stats?.totalDownloads ?? templates.reduce((acc, cur) => acc + cur.downloadCount, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm biểu mẫu theo tên, nội dung hoặc tệp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full md:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          {/* Semester Filter */}
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="w-full md:w-52 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Tất cả học kỳ</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.academicYear})
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Status Segmented Control */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            <button
              onClick={() => setSelectedStatus("all")}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedStatus === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Tất cả ({templates.length})
            </button>
            <button
              onClick={() => setSelectedStatus("published")}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedStatus === "published"
                  ? "bg-white text-emerald-600 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Lưu hành
            </button>
            <button
              onClick={() => setSelectedStatus("archived")}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedStatus === "archived"
                  ? "bg-white text-amber-600 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Lưu trữ
            </button>
          </div>
        </div>
      </div>

      {/* Templates List Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm">Đang tải danh sách biểu mẫu...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <AlertCircle className="w-12 h-12 text-slate-300 stroke-1" />
            <div className="text-base font-medium text-slate-600">Không tìm thấy biểu mẫu nào</div>
            <p className="text-xs text-slate-400 max-w-md">
              Chưa có biểu mẫu phù hợp với tiêu chí lọc hoặc chưa có biểu mẫu nào được tạo. Hãy bấm "Thêm biểu mẫu mới" hoặc "Nạp mẫu chuẩn" để bắt đầu.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tên biểu mẫu & Tệp</th>
                  <th className="py-3.5 px-4">Khoa & Học kỳ</th>
                  <th className="py-3.5 px-4">Danh mục</th>
                  <th className="py-3.5 px-4 text-center">Phiên bản</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-center">Lượt tải</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTemplates.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-slate-50/60 transition group">
                    {/* Title & File Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-3">
                        {getFileIcon(tpl.fileName)}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800 hover:text-blue-600 transition cursor-pointer" onClick={() => handleDownload(tpl)}>
                              {tpl.title}
                            </span>
                            {tpl.isRequired && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                                Bắt buộc nộp
                              </span>
                            )}
                          </div>
                          {tpl.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{tpl.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span>{tpl.fileName}</span>
                            <span>•</span>
                            <span>{formatFileSize(tpl.fileSize)}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department & Semester */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1 text-xs">
                        <div className="font-medium text-slate-700">
                          {tpl.department ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                              Khoa: {tpl.department}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                              Toàn trường
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400">
                          {tpl.semesterName ? (
                            <span>Kỳ: {tpl.semesterName}</span>
                          ) : (
                            <span className="italic">Áp dụng chung mọi kỳ</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                        {getCategoryLabel(tpl.category)}
                      </span>
                    </td>

                    {/* Version */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                        v{tpl.version || "1.0"}
                      </span>
                    </td>

                    {/* Published Status */}
                    <td className="py-3.5 px-4 text-center">
                      {tpl.isPublished ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Lưu hành</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100" title={tpl.archiveReason || "Đã tạm ẩn / lưu trữ"}>
                          <Archive className="w-3 h-3 text-amber-600" />
                          <span>Lưu trữ</span>
                        </span>
                      )}
                    </td>

                    {/* Download Count */}
                    <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                      <div className="flex items-center justify-center gap-1">
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tpl.downloadCount}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownload(tpl)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Tải biểu mẫu về máy"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {canMutateOps && (
                          <>
                            <button
                              onClick={() => openEditModal(tpl)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                              title="Chỉnh sửa thông tin / cập nhật tệp"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleTogglePublish(tpl)}
                              className={`p-1.5 rounded-lg transition ${
                                tpl.isPublished
                                  ? "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                  : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={tpl.isPublished ? "Thu hồi / Lưu trữ biểu mẫu" : "Ban hành lại biểu mẫu"}
                            >
                              {tpl.isPublished ? <Archive className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setDeletingTemplate(tpl)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Xóa biểu mẫu"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Template */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Upload className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-bold text-slate-800">Thêm biểu mẫu chính thức mới</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              {/* File Upload Zone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tệp biểu mẫu (.docx, .xlsx, .pdf) <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 text-center cursor-pointer transition bg-slate-50/50 relative">
                  <input
                    type="file"
                    required
                    accept=".docx,.doc,.xlsx,.xls,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCreateFile(file);
                        if (!createForm.title) {
                          setCreateForm((prev) => ({
                            ...prev,
                            title: file.name.replace(/\.[^/.]+$/, ""),
                          }));
                        }
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {createFile ? (
                    <div className="flex items-center justify-center gap-3">
                      {getFileIcon(createFile.name)}
                      <div className="text-left">
                        <div className="text-sm font-semibold text-slate-800">{createFile.name}</div>
                        <div className="text-xs text-slate-400">{formatFileSize(createFile.size)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-7 h-7 text-slate-400 mx-auto" />
                      <div className="text-xs text-slate-600">
                        Kéo thả tệp vào đây hoặc <span className="text-blue-600 font-semibold">chọn từ máy tính</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Hỗ trợ Microsoft Word, Excel, PDF</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên biểu mẫu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Báo cáo tổng kết công tác thực tập tốt nghiệp"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Grid: Department & Semester */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Khoa áp dụng
                  </label>
                  <select
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Học kỳ áp dụng
                  </label>
                  <select
                    value={createForm.semesterId}
                    onChange={(e) => setCreateForm({ ...createForm, semesterId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Áp dụng chung mọi kỳ</option>
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.academicYear})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid: Category & Version */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Danh mục biểu mẫu
                  </label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {CATEGORIES.filter((c) => c.value !== "").map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phiên bản (Version)
                  </label>
                  <input
                    type="text"
                    placeholder="1.0"
                    value={createForm.version}
                    onChange={(e) => setCreateForm({ ...createForm, version: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả / Hướng dẫn sử dụng
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú đối tượng cần sử dụng hoặc thời hạn nộp biểu mẫu..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Checkboxes: Required & Published */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.isRequired}
                    onChange={(e) => setCreateForm({ ...createForm, isRequired: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-700">Bắt buộc sinh viên phải nộp</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.isPublished}
                    onChange={(e) => setCreateForm({ ...createForm, isPublished: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-700">Ban hành ngay vào thư viện</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Đang lưu..." : "Thêm & Ban hành"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Template */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Edit2 className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-bold text-slate-800">Chỉnh sửa biểu mẫu</h2>
              </div>
              <button
                onClick={() => setEditingTemplate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên biểu mẫu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Replace File (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Thay thế tệp biểu mẫu (Không bắt buộc)
                </label>
                <div className="border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getFileIcon(editFile ? editFile.name : editingTemplate.fileName)}
                    <span className="text-xs font-medium text-slate-700">
                      {editFile ? editFile.name : editingTemplate.fileName}
                    </span>
                  </div>
                  <label className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer transition">
                    <span>Chọn tệp mới</span>
                    <input
                      type="file"
                      accept=".docx,.doc,.xlsx,.xls,.pdf"
                      onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Department & Semester */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Khoa áp dụng
                  </label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Học kỳ áp dụng
                  </label>
                  <select
                    value={editForm.semesterId}
                    onChange={(e) => setEditForm({ ...editForm, semesterId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Áp dụng chung mọi kỳ</option>
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.academicYear})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category & Version */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Danh mục biểu mẫu
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {CATEGORIES.filter((c) => c.value !== "").map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phiên bản
                  </label>
                  <input
                    type="text"
                    value={editForm.version}
                    onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả / Hướng dẫn sử dụng
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Required & Published */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isRequired}
                      onChange={(e) => setEditForm({ ...editForm, isRequired: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="text-xs font-medium text-slate-700">Bắt buộc nộp</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isPublished}
                      onChange={(e) => setEditForm({ ...editForm, isPublished: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="text-xs font-medium text-slate-700">Đang lưu hành</span>
                  </label>
                </div>

                {!editForm.isPublished && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                    <label className="block text-xs font-semibold text-amber-800">
                      Lý do thu hồi / lưu trữ biểu mẫu:
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Đã ban hành biểu mẫu phiên bản mới hơn..."
                      value={editForm.archiveReason}
                      onChange={(e) => setEditForm({ ...editForm, archiveReason: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Đang lưu..." : "Cập nhật thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <span className="p-2 rounded-xl bg-rose-50">
                <AlertCircle className="w-6 h-6" />
              </span>
              <h3 className="text-lg font-bold text-slate-800">Xác nhận xóa biểu mẫu</h3>
            </div>
            <p className="text-sm text-slate-600">
              Bạn có chắc chắn muốn xóa vĩnh viễn biểu mẫu{" "}
              <strong className="text-slate-800">"{deletingTemplate.title}"</strong> không?
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Thao tác này sẽ xóa tệp biểu mẫu khỏi thư viện chung của toàn trường.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeletingTemplate(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {isSubmitting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
