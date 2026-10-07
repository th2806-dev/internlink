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
import { adminDepartmentsService, type DepartmentDto } from "../../../services/adminDepartments.service";
import { useAuth } from "../../../contexts/AuthContext";
import type { DocumentListItemDto } from "../../../types/api";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { EmptyState } from "../../../components/common/EmptyState";
import { Panel } from "../../../components/common/Panel";
import { Toolbar } from "../../../components/common/Toolbar";
import { RequestErrorState } from "../../../components/common/RequestErrorState";

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

export const TemplatesView: React.FC<TemplatesViewProps> = ({ onShowToast }) => {
  const { canMutateOps } = useAdminCapabilities();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DocumentListItemDto[]>([]);
  const [semesters, setSemesters] = useState<BackendSemesterDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

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
      if (templates.length === 0) setLoading(true);
      setLoadError("");
      const [tpls, sems, depts] = await Promise.all([
        documentService.getTemplates(),
        adminSemestersService.getAll().catch(() => []),
        adminDepartmentsService.getAll(user?.backendRole).catch(() => []),
      ]);
      setTemplates(tpls);
      setSemesters(sems);
      setDepartments(depts.filter((department) => department.isActive));
    } catch (err: any) {
      const message = err?.message || "Không thể tải danh sách biểu mẫu.";
      setLoadError(message);
      onShowToast?.(message, "danger");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const departmentOptions = [
    { value: "", label: "Tất cả Khoa / Bộ môn" },
    ...departments.map((department) => ({
      value: department.code,
      label: `${department.name} (${department.code})`,
    })),
  ];

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
      onShowToast?.(
        err?.message || "Không thể thêm biểu mẫu. Vui lòng thử lại.",
        "danger",
      );
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
        archiveReason: !nextPublished ? "Quản trị khoa thu hồi lưu hành" : undefined,
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
      await loadData();
    } catch {
      onShowToast?.("Tải xuống biểu mẫu thất bại", "danger");
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls") {
      return <FileSpreadsheet className="w-8 h-8 text-[#026aa7] flex-shrink-0" />;
    }
    if (ext === "docx" || ext === "doc") {
      return <FileType className="w-8 h-8 text-[#026aa7] flex-shrink-0" />;
    }
    if (ext === "pdf") {
      return <FileText className="w-8 h-8 text-rose-600 flex-shrink-0" />;
    }
    return <FileText className="w-8 h-8 text-slate-500 flex-shrink-0" />;
  };

  const getCategoryLabel = (category?: string | null) => {
    const found = CATEGORIES.find((c) => c.value === category);
    return found ? found.label : category || "Chưa phân loại";
  };

  const normalizeFilterValue = (value?: string | null) =>
    (value || "").trim().toLocaleLowerCase("vi-VN");

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
      // Semester: filter by the DTO id used by the option value.
      if (selectedSemester && tpl.semesterId !== selectedSemester) {
        return false;
      }
      // Department: match the raw code shown in the table; global templates do not
      // appear as department-specific results.
      if (
        selectedDept &&
        !normalizeFilterValue(tpl.department).includes(normalizeFilterValue(selectedDept))
      ) {
        return false;
      }
      // Category: compare raw enum values; "Other" also catches legacy values.
      if (selectedCategory) {
        const knownCategories = CATEGORIES
          .map((category) => category.value)
          .filter(Boolean)
          .map(normalizeFilterValue);
        const normalizedCategory = normalizeFilterValue(tpl.category);
        const categoryMatches = selectedCategory === "Other"
          ? !knownCategories.includes(normalizedCategory)
          : normalizedCategory === normalizeFilterValue(selectedCategory);
        if (!categoryMatches) return false;
      }
      // Status
      if (selectedStatus === "published" && !tpl.isPublished) return false;
      if (selectedStatus === "archived" && tpl.isPublished) return false;

      return true;
    });
  }, [templates, searchTerm, selectedSemester, selectedDept, selectedCategory, selectedStatus]);

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 pb-12">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#026aa7] px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-wide">Thư viện biểu mẫu</h1>
              <p className="mt-0.5 text-xs text-white/80">
                Quản lý biểu mẫu sử dụng trong các kỳ thực tập
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={refreshing}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              Làm mới
            </button>
            {canMutateOps && (
              <>
                <button
                  type="button"
                  onClick={handleSeedDefaults}
                  disabled={isSubmitting}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Nạp mẫu mặc định
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-bold text-[#026aa7] transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Thêm biểu mẫu
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <Toolbar
        left={(
          <p className="text-xs font-medium text-slate-500">
            {refreshing ? "Đang cập nhật danh sách biểu mẫu…" : "Danh sách biểu mẫu"}
          </p>
        )}
      />

      <Panel className="space-y-4 rounded-xl border-slate-200/90 shadow-2xs">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">Danh sách biểu mẫu</h2>
            <p className="mt-0.5 text-xs text-slate-500">Tìm kiếm và lọc theo phạm vi áp dụng, học kỳ, danh mục hoặc trạng thái.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                aria-label="Tìm biểu mẫu"
                placeholder="Tìm tên, mô tả hoặc tên tệp…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs outline-none focus-visible:border-[#026aa7] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 inline-flex min-h-8 min-w-8 -translate-y-1/2 items-center justify-center rounded text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              aria-label="Lọc theo khoa"
              className="min-h-9 min-w-44 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus-visible:border-[#026aa7] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              {departmentOptions.map((department) => (
                <option key={department.value} value={department.value}>{department.label}</option>
              ))}
            </select>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              aria-label="Lọc theo học kỳ"
              className="min-h-9 min-w-44 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus-visible:border-[#026aa7] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="">Tất cả học kỳ</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>{semester.name} · {semester.academicYear}</option>
              ))}
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Lọc theo danh mục"
              className="min-h-9 min-w-44 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus-visible:border-[#026aa7] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
              aria-label="Lọc theo trạng thái ban hành"
              className="min-h-9 min-w-36 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus-visible:border-[#026aa7] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="published">Đang lưu hành</option>
              <option value="archived">Đã lưu trữ</option>
            </select>
          </div>
        </div>

        {loadError && templates.length === 0 ? (
          <RequestErrorState
            title="Không thể tải thư viện biểu mẫu"
            message={loadError}
            onRetry={() => void loadData()}
            retrying={refreshing}
          />
        ) : (
          <>
        {loadError && (
          <RequestErrorState
            title="Không thể cập nhật thư viện biểu mẫu"
            message={loadError}
            onRetry={() => void loadData()}
            retrying={refreshing}
            className="p-4 sm:p-5"
          />
        )}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin text-[#026aa7]" aria-hidden="true" />
            <span>Đang tải biểu mẫu…</span>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div>
            <EmptyState
              icon={FileText}
              title={templates.length === 0 ? "Chưa có biểu mẫu" : "Không tìm thấy biểu mẫu phù hợp"}
              description={templates.length === 0
                ? "Thư viện chưa có biểu mẫu nào."
                : "Không có biểu mẫu phù hợp với tiêu chí tìm kiếm và bộ lọc hiện tại."}
              action={templates.length === 0 && canMutateOps ? {
                label: "Thêm biểu mẫu mới",
                onClick: () => setShowCreateModal(true),
              } : undefined}
              secondaryAction={templates.length > 0 ? {
                label: "Xóa bộ lọc tìm kiếm",
                onClick: () => {
                  setSearchTerm("");
                  setSelectedSemester("");
                  setSelectedDept("");
                  setSelectedCategory("");
                  setSelectedStatus("all");
                },
              } : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200/80">
            <table className="w-full min-w-[900px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5">Biểu mẫu</th>
                  <th className="px-3 py-2.5">Phạm vi</th>
                  <th className="px-3 py-2.5">Danh mục</th>
                  <th className="px-3 py-2.5 text-center">Phiên bản</th>
                  <th className="px-3 py-2.5 text-center">Trạng thái</th>
                  <th className="px-3 py-2.5 text-center">Lượt tải</th>
                  <th className="px-3 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTemplates.map((tpl) => (
                  <tr key={tpl.id} className="group transition-colors hover:bg-slate-50/80">
                    {/* Title & File Info */}
                    <td className="px-3 py-3">
                      <div className="flex items-start gap-3">
                        {getFileIcon(tpl.fileName)}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              className="text-left font-semibold text-slate-800 transition hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                              onClick={() => handleDownload(tpl)}
                            >
                              {tpl.title}
                            </button>
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
                    <td className="px-3 py-3">
                      <div className="space-y-1 text-xs">
                        <div className="font-medium text-slate-700">
                          {tpl.department ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                              Khoa: {tpl.department}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-[#026aa7]/5 text-[#026aa7] font-medium">
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
                    <td className="px-3 py-3">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                        {getCategoryLabel(tpl.category)}
                      </span>
                    </td>

                    {/* Version */}
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#026aa7]/5 text-[#026aa7] border border-[#026aa7]/14">
                        v{tpl.version || "1.0"}
                      </span>
                    </td>

                    {/* Published Status */}
                    <td className="px-3 py-3 text-center">
                      {tpl.isPublished ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f2f8eb] text-[#4f7d1b] border border-[#dcebc9]">
                          <Check className="w-3 h-3 text-[#4f7d1b]" aria-hidden="true" />
                          <span>Lưu hành</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100" title={tpl.archiveReason || "Đã tạm ẩn / lưu trữ"}>
                          <Archive className="w-3 h-3 text-amber-600" aria-hidden="true" />
                          <span>Lưu trữ</span>
                        </span>
                      )}
                    </td>

                    {/* Download Count */}
                    <td className="px-3 py-3 text-center font-medium text-slate-600">
                      <div className="flex items-center justify-center gap-1">
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tpl.downloadCount}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleDownload(tpl)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-[#025a8e]/5 hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                          title="Tải biểu mẫu về máy"
                          aria-label={`Tải biểu mẫu ${tpl.title} về máy`}
                        >
                          <Download className="w-4 h-4" aria-hidden="true" />
                        </button>
                        {canMutateOps && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(tpl)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-amber-50 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                              title="Chỉnh sửa thông tin / cập nhật tệp"
                              aria-label={`Chỉnh sửa biểu mẫu ${tpl.title}`}
                            >
                              <Edit2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(tpl)}
                              className={`p-1.5 rounded-lg transition ${
                                tpl.isPublished
                                  ? "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                  : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={tpl.isPublished ? "Thu hồi / Lưu trữ biểu mẫu" : "Ban hành lại biểu mẫu"}
                              aria-label={`${tpl.isPublished ? "Lưu trữ" : "Ban hành lại"} biểu mẫu ${tpl.title}`}
                            >
                              {tpl.isPublished ? <Archive className="w-4 h-4" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTemplate(tpl)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                              title="Xóa biểu mẫu"
                              aria-label={`Xóa biểu mẫu ${tpl.title}`}
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
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
          </>
        )}
      </Panel>

      {/* Modal: Create Template */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#026aa7]/5 text-[#026aa7]">
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
                <div className="border-2 border-dashed border-slate-200 hover:border-[#026aa7]/48 rounded-xl p-4 text-center cursor-pointer transition bg-slate-50/50 relative">
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
                        Kéo thả tệp vào đây hoặc <span className="text-[#026aa7] font-semibold">chọn từ máy tính</span>
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
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#026aa7]/20 focus:border-[#026aa7]"
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
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#026aa7]/20 focus:border-[#026aa7]"
                  >
                    {departmentOptions.filter((d) => d.value).map((d) => (
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
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#026aa7]/20 focus:border-[#026aa7]"
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
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#026aa7]/20 focus:border-[#026aa7]"
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
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#026aa7]/20 focus:border-[#026aa7]"
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
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#026aa7]/20 focus:border-[#026aa7] resize-none"
                />
              </div>

              {/* Checkboxes: Required & Published */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.isRequired}
                    onChange={(e) => setCreateForm({ ...createForm, isRequired: e.target.checked })}
                    className="w-4 h-4 rounded text-[#026aa7] focus:ring-[#026aa7] border-slate-300"
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
                  className="px-5 py-2 text-sm font-semibold bg-[#026aa7] hover:bg-[#025a8e] text-white rounded-xl shadow-sm transition disabled:opacity-50"
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
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#026aa7]/20 focus:border-[#026aa7]"
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
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#026aa7]/20 focus:border-[#026aa7]"
                  >
                    {departmentOptions.filter((d) => d.value).map((d) => (
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
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#026aa7]/20 focus:border-[#026aa7]"
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
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#026aa7]/20 focus:border-[#026aa7]"
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
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#026aa7]/20 focus:border-[#026aa7]"
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
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#026aa7]/20 focus:border-[#026aa7] resize-none"
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
                      className="w-4 h-4 rounded text-[#026aa7] focus:ring-[#026aa7] border-slate-300"
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
                  className="px-5 py-2 text-sm font-semibold bg-[#026aa7] hover:bg-[#025a8e] text-white rounded-xl shadow-sm transition disabled:opacity-50"
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
