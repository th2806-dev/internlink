import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  Search,
  Download,
  FileSpreadsheet,
  FileUp,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Users,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Briefcase,
  Check,
  Eye,
} from "lucide-react";
import { adminAssignmentsService } from "../../../services/adminAssignments.service";
import { adminCompaniesService } from "../../../services/adminCompanies.service";
import { apiRequest, getApiErrorMessage } from "../../../lib/apiClient";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { ImportCompanyAllocationsModal } from "./modals/ImportCompanyAllocationsModal";
import type { CompanyAllocationItemDto, CompanyDto, CompanySuggestionDto } from "../../../types/api";

interface Props {
  selectedSemesterId?: string | null;
  onShowToast: (msg: string) => void;
}

export const CompanyAllocationsTab = ({
  selectedSemesterId,
  onShowToast,
}: Props) => {
  const { canMutateOps, isSuperAdmin } = useAdminCapabilities();
  const [allocations, setAllocations] = useState<CompanyAllocationItemDto[]>([]);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "assigned" | "unassigned">("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Quick Assign Modal
  const [assignTarget, setAssignTarget] = useState<CompanyAllocationItemDto | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [isSavingAssign, setIsSavingAssign] = useState(false);
  const [suggestions, setSuggestions] = useState<CompanySuggestionDto[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const effectiveSemesterId = selectedSemesterId === "all" || !selectedSemesterId ? undefined : selectedSemesterId;
      const [allocData, compData] = await Promise.all([
        adminAssignmentsService.getCompanyAllocations(effectiveSemesterId),
        adminCompaniesService.getAll().catch(() => []),
      ]);
      setAllocations(allocData);
      setCompanies(compData);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [selectedSemesterId, onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived lists for filters
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    allocations.forEach((a) => {
      if (a.class) set.add(a.class);
    });
    return Array.from(set).sort();
  }, [allocations]);

  const uniqueCompaniesInList = useMemo(() => {
    const set = new Set<string>();
    allocations.forEach((a) => {
      if (a.companyName) set.add(a.companyName);
    });
    return Array.from(set).sort();
  }, [allocations]);

  // Filtered allocations
  const filteredAllocations = useMemo(() => {
    return allocations.filter((item) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesCode = item.studentCode.toLowerCase().includes(q);
        const matchesName = item.studentName.toLowerCase().includes(q);
        const matchesComp = (item.companyName || "").toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesComp) return false;
      }
      // Company filter
      if (companyFilter !== "all" && item.companyName !== companyFilter) return false;
      // Class filter
      if (classFilter !== "all" && item.class !== classFilter) return false;
      // Status filter
      if (statusFilter === "assigned" && !item.companyId) return false;
      if (statusFilter === "unassigned" && item.companyId) return false;

      return true;
    });
  }, [allocations, searchTerm, companyFilter, classFilter, statusFilter]);

  // Statistics
  const totalStudents = allocations.length;
  const assignedCount = allocations.filter((a) => a.companyId).length;
  const unassignedCount = totalStudents - assignedCount;
  const allocationRate = totalStudents > 0 ? Math.round((assignedCount / totalStudents) * 100) : 0;

  // Pagination slice
  const totalPages = Math.ceil(filteredAllocations.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAllocations.slice(start, start + pageSize);
  }, [filteredAllocations, currentPage, pageSize]);

  // Handlers
  const handleDownloadTemplate = async () => {
    try {
      await adminAssignmentsService.downloadCompanyAllocationTemplate();
      onShowToast("Đã tải xuống file mẫu phân bổ doanh nghiệp (.xlsx)");
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const effectiveSemesterId = selectedSemesterId === "all" || !selectedSemesterId ? undefined : selectedSemesterId;
      await adminAssignmentsService.downloadCompanyAllocationExport(effectiveSemesterId);
      onShowToast("Đã xuất danh sách phân bổ doanh nghiệp (.xlsx)");
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenAssign = (item: CompanyAllocationItemDto) => {
    setAssignTarget(item);
    setSelectedCompanyId(item.companyId || "");
    setSuggestions([]);
    const semId = selectedSemesterId === "all" || !selectedSemesterId ? undefined : selectedSemesterId;
    if (semId) {
      setIsLoadingSuggestions(true);
      adminAssignmentsService
        .suggestCompanies({
          semesterId: semId,
          studentId: item.studentId,
          maxResults: 4,
        })
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setIsLoadingSuggestions(false));
    }
  };

  const handleSaveQuickAssign = async () => {
    if (!assignTarget) return;
    setIsSavingAssign(true);
    try {
      if (!selectedCompanyId) {
        onShowToast("Vui lòng chọn doanh nghiệp");
        return;
      }
      await apiRequest(`/api/Internship/${assignTarget.internshipId}/company`, {
        method: "PUT",
        body: { companyId: selectedCompanyId },
      });
      onShowToast(`Đã gán doanh nghiệp thành công cho ${assignTarget.studentName}!`);
      setAssignTarget(null);
      await loadData();
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsSavingAssign(false);
    }
  };

  return (
    <div className="space-y-4">
      {isSuperAdmin && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2.5">
          <Eye className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Chế độ chỉ xem nghiệp vụ khoa — Quản trị hệ thống không thể phân bổ hoặc import doanh nghiệp.
          </span>
        </div>
      )}

      {/* 1. TOP TOOLBAR & ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        {/* KPI Quick Stats */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Tổng SV:</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
              {totalStudents}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700">
            <span>Đã có DN:</span>
            <span className="font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              {assignedCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-700">
            <span>Chưa có DN:</span>
            <span className="font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
              {unassignedCount}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-blue-700">
            <span>Tỷ lệ:</span>
            <span className="font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              {allocationRate}%
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Tải mẫu Excel</span>
          </button>

          {canMutateOps && (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Import Phân Bổ DN</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || allocations.length === 0}
            className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isExporting ? "Đang xuất..." : "Xuất Excel"}</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTERS BAR */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs text-xs">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo Họ tên, MSSV, hoặc Tên Công ty..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-blue-500 font-medium"
          />
        </div>

        {/* Filter by Company */}
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={companyFilter}
            onChange={(e) => {
              setCompanyFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-medium cursor-pointer max-w-[180px] truncate"
          >
            <option value="all">Tất cả Doanh nghiệp</option>
            {uniqueCompaniesInList.map((comp) => (
              <option key={comp} value={comp}>
                {comp}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Class */}
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-medium cursor-pointer"
          >
            <option value="all">Tất cả Lớp</option>
            {uniqueClasses.map((cls) => (
              <option key={cls} value={cls}>
                Lớp {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Status */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-medium cursor-pointer"
          >
            <option value="all">Tất cả Trạng thái</option>
            <option value="assigned">Đã có Doanh nghiệp</option>
            <option value="unassigned">Chưa có Doanh nghiệp</option>
          </select>
        </div>
      </div>

      {/* 3. ALLOCATIONS DATA TABLE */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-3">MSSV</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-3">Lớp</th>
                <th className="py-3 px-4">Chuyên ngành</th>
                <th className="py-3 px-4">Doanh nghiệp Thực tập</th>
                <th className="py-3 px-4">Giảng viên Hướng dẫn</th>
                <th className="py-3 px-3 text-center">Trạng thái</th>
                <th className="py-3 px-3 text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Đang tải danh sách phân bổ doanh nghiệp...
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Không tìm thấy sinh viên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => {
                  const stt = (currentPage - 1) * pageSize + idx + 1;
                  const hasCompany = Boolean(item.companyId && item.companyName);

                  return (
                    <tr
                      key={item.internshipId}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {stt}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">
                        {item.studentCode}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.studentName}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.class || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {item.major || "-"}
                      </td>
                      <td className="py-3 px-4">
                        {hasCompany ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[11px]">
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>{item.companyName}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[10px]">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Chưa phân bổ</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {item.lecturerName ? (
                          <span className="font-semibold text-slate-800">
                            {item.lecturerName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa gán</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                          {item.status || "Chưa bắt đầu"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {canMutateOps ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAssign(item)}
                            className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs transition-colors"
                            title="Gán hoặc đổi doanh nghiệp"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Gán DN</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredAllocations.length > 0 && (
          <div className="flex items-center justify-between p-3.5 bg-slate-50/60 border-t border-slate-200 text-xs font-medium text-slate-500">
            <p>
              Hiển thị{" "}
              <strong className="text-slate-800">
                {Math.min((currentPage - 1) * pageSize + 1, filteredAllocations.length)}
              </strong>{" "}
              -{" "}
              <strong className="text-slate-800">
                {Math.min(currentPage * pageSize, filteredAllocations.length)}
              </strong>{" "}
              trong tổng số{" "}
              <strong className="text-slate-800">{filteredAllocations.length}</strong>{" "}
              sinh viên
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. MODALS */}
      <ImportCompanyAllocationsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onShowToast={onShowToast}
        onSuccess={() => {
          setShowImportModal(false);
          loadData();
        }}
        currentSemesterId={selectedSemesterId === "all" ? undefined : selectedSemesterId}
      />

      {/* QUICK ASSIGN MODAL */}
      {assignTarget && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Gán / Đổi Doanh nghiệp Thực tập</span>
              </h3>
              <button
                onClick={() => setAssignTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-md border border-slate-200/80 space-y-1">
              <p>
                Sinh viên:{" "}
                <strong className="text-slate-900 font-bold">
                  {assignTarget.studentName}
                </strong>{" "}
                ({assignTarget.studentCode})
              </p>
              <p className="text-slate-500">
                Lớp: <strong>{assignTarget.class || "-"}</strong> • Ngành:{" "}
                <strong>{assignTarget.major || "-"}</strong>
              </p>
              <p className="text-slate-500">
                Hiện tại:{" "}
                <strong className="text-blue-700">
                  {assignTarget.companyName || "Chưa phân bổ"}
                </strong>
              </p>
            </div>

            {/* AI Company Suggestions */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Gợi ý doanh nghiệp phù hợp:</span>
                </label>
                {isLoadingSuggestions && (
                  <span className="text-[10px] text-slate-400 animate-pulse">Đang tính điểm match...</span>
                )}
              </div>

              {isLoadingSuggestions ? (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-center text-slate-400 text-[11px] animate-pulse">
                  Đang phân tích chuyên ngành &amp; vị trí tuyển dụng phù hợp...
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {suggestions.map((s) => {
                    const isSelected = selectedCompanyId === s.companyId;
                    return (
                      <div
                        key={s.companyId}
                        onClick={() => setSelectedCompanyId(s.companyId)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {s.companyName}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                  s.matchScore >= 70
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {s.matchScore}% phù hợp
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                              {s.matchReason}
                            </p>
                            {s.openPositions.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {s.openPositions.slice(0, 2).map((pos) => (
                                  <span
                                    key={pos.id}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-medium"
                                  >
                                    <Briefcase className="w-2.5 h-2.5 text-slate-400" />
                                    {pos.title} ({pos.slots} chỉ tiêu)
                                  </span>
                                ))}
                                {s.openPositions.length > 2 && (
                                  <span className="text-[9px] text-slate-400">
                                    +{s.openPositions.length - 2} vị trí
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-2 bg-slate-50 rounded-md border border-dashed border-slate-200 text-center text-[10px] text-slate-400">
                  Chưa có gợi ý phù hợp hoặc chưa chọn kỳ học. Chọn thủ công bên dưới:
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Hoặc chọn Doanh nghiệp từ danh sách:
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md outline-none font-medium cursor-pointer text-xs"
              >
                <option value="">— Chọn doanh nghiệp trong danh mục —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} {c.address ? `(${c.address})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveQuickAssign}
                disabled={isSavingAssign || !selectedCompanyId}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-xs disabled:opacity-50"
              >
                {isSavingAssign ? "Đang lưu..." : "Xác nhận gán"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
