import { useState } from "react";
import type { ToastType } from "../../../contexts/ToastContext";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Plus,
  FileUp,
  Pencil,
  Trash2,
  X,
  MapPin,
  Mail,
  Phone,
  Globe,
  Download,
  Eye,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { Panel } from "../../../components/common/Panel";
import { CompanyAvatar } from "../../../components/common/CompanyAvatar";
import type { Enterprise } from "../../../types/enterprise";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { adminCompaniesService } from "../../../services/adminCompanies.service";
import { useSemester, toApiSemesterId } from "../../../contexts/SemesterContext";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { ImportCompaniesModal } from "../components/modals/ImportCompaniesModal";
import { EmptyState } from "../../../components/common/EmptyState";
import { TableSkeleton } from "../../../components/common/SkeletonLoader";
import { RequestErrorState } from "../../../components/common/RequestErrorState";
import { useAdminCompaniesQuery } from "../../../hooks/useAdminCompaniesQuery";
import { DynamicDataGrid } from "../components/DynamicDataGrid";
import { CompactActionBar } from "../../../components/common/CompactActionBar";

const emptyForm = {
  companyCode: "",
  name: "",
  field: "",
  location: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  capacity: 10,
  status: "Đang hợp tác",
};

export const CompaniesView = ({
  onShowToast,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
}) => {
  const navigate = useNavigate();
  const { selectedSemester, selectedDepartmentId } = useSemester();
  const { canMutateOps } = useAdminCapabilities();
  const {
    items: paginatedCompanies,
    filteredItems: filtered,
    totalPages,
    page: visiblePage,
    pageSize,
    setPageSize,
    goToPage: setCurrentPage,
    searchTerm: search,
    setSearchTerm: updateSearch,
    statusFilter,
    setStatusFilter: updateStatusFilter,
    statuses,
    isLoading: isLoadingApi,
    isFetching,
    isError,
    error,
    refetch,
    createCompany,
    updateCompany,
    deleteCompany,
    setSemesterLink,
  } = useAdminCompaniesQuery({
    semesterId: selectedSemester?.id,
    departmentId: selectedDepartmentId,
  });

  const [editing, setEditing] = useState<Enterprise | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Enterprise | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState<Enterprise | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (c: Enterprise) => {
    setEditing(c);
    setForm({
      companyCode: c.shortCode || "",
      name: c.name,
      field: c.field,
      location: c.location,
      contactPerson: c.contactPerson,
      contactEmail: c.contactEmail,
      contactPhone: c.contactPhone,
      website: c.website,
      capacity: c.capacity,
      status: c.status,
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      onShowToast("Vui lòng nhập tên doanh nghiệp");
      return;
    }

    const isActive = form.status === "Đang hợp tác";
    const body = {
      companyCode: form.companyCode ? form.companyCode.trim() : undefined,
      companyName: form.name.trim(),
      address: form.location || undefined,
      website: form.website || undefined,
      industry: form.field || undefined,
      contactPerson: form.contactPerson || undefined,
      contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined,
      capacity: Number(form.capacity) || 0,
    };

    setIsSaving(true);
    try {
      if (editing) {
        await updateCompany({
          id: editing.id,
          body: {
            ...body,
            isActive,
          },
        });
        onShowToast(`Đã cập nhật doanh nghiệp ${form.name}`);
      } else {
        await createCompany(body);
        onShowToast(`Đã thêm doanh nghiệp ${form.name.trim()}`);
      }
      setIsFormOpen(false);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const semesterId = toApiSemesterId(selectedSemester?.id);
  const canLink = Boolean(semesterId);

  const handleSetSemesterLink = async (c: Enterprise, isLinked: boolean) => {
    if (!semesterId) return;
    setIsLinking(true);
    try {
      await setSemesterLink({ id: c.id, semId: semesterId, isLinked });
      onShowToast(
        isLinked
          ? `Đã liên kết ${c.name} với học kỳ ${selectedSemester?.name}`
          : `Đã ngưng liên kết ${c.name} với học kỳ ${selectedSemester?.name}. Sinh viên đang thực tập vẫn được giữ nguyên.`,
      );
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsLinking(false);
      setLinkTarget(null);
    }
  };

  const handleDelete = async (c: Enterprise) => {
    try {
      await deleteCompany(c.id);
      onShowToast(`Đã xóa ${c.name}`);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await handleDelete(deleteTarget);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };



  const handleExport = async () => {
    try {
      await adminCompaniesService.downloadExport();
      onShowToast("Đã tải xuống danh sách doanh nghiệp (.xlsx)");
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "all";

  return (
    <div className="w-full space-y-4 pb-12">
      <CompactActionBar
        icon={Building2}
        title="Doanh nghiệp"
        total={isLoadingApi
          ? "Đang tải danh sách…"
          : `Tổng cộng: ${filtered.length.toLocaleString("vi-VN")} doanh nghiệp`}
        subtitle={isFetching && !isLoadingApi
          ? "Đang cập nhật…"
          : canLink
            ? "Liên kết doanh nghiệp theo học kỳ đang chọn"
            : "Chọn một học kỳ để quản lý liên kết"}
        search={{
          value: search,
          onChange: updateSearch,
          placeholder: "Tìm tên, mã, lĩnh vực...",
          ariaLabel: "Tìm doanh nghiệp theo tên, mã hoặc lĩnh vực",
        }}
        filters={
          <>
            <select
              value={statusFilter}
              onChange={(event) => updateStatusFilter(event.target.value)}
              aria-label="Lọc doanh nghiệp theo trạng thái"
              className="h-8 max-w-40 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-700"
            >
              <option value="all">Tất cả trạng thái</option>
              {statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  updateSearch("");
                  updateStatusFilter("all");
                }}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Xóa lọc
              </button>
            )}
          </>
        }
        actions={[
          {
            label: "Xuất Excel",
            icon: Download,
            onClick: () => void handleExport(),
          },
          ...(canMutateOps
            ? [
                {
                  label: "Nhập Excel",
                  icon: FileUp,
                  onClick: () => setIsImportModalOpen(true),
                },
                {
                  label: "Thêm",
                  icon: Plus,
                  onClick: openCreate,
                  variant: "primary" as const,
                },
              ]
            : []),
        ]}
      />

      <Panel className="space-y-4 rounded-xl border border-slate-200/90 shadow-2xs">
        {isError && paginatedCompanies.length > 0 && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"
          >
            <span>
              {error instanceof Error ? error.message : "Không thể cập nhật danh sách doanh nghiệp."}
              {" "}Dữ liệu đang hiển thị có thể chưa mới nhất.
            </span>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="min-h-8 rounded-md border border-rose-300 bg-white px-3 font-bold text-rose-800 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isFetching ? "Đang tải…" : "Thử tải lại"}
            </button>
          </div>
        )}
        {isLoadingApi && paginatedCompanies.length === 0 ? (
          <div className="p-4" data-testid="companies-loading">
            <TableSkeleton rows={5} columns={7} />
          </div>
        ) : isError && paginatedCompanies.length === 0 ? (
          <div className="p-4">
            <RequestErrorState
              title="Không thể tải danh sách doanh nghiệp"
              message={
                error instanceof Error
                  ? error.message
                  : "Lỗi kết nối tới máy chủ"
              }
              onRetry={() => void refetch()}
              retrying={isFetching}
            />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={
              hasActiveFilters
                ? "Không tìm thấy doanh nghiệp phù hợp"
                : "Chưa có doanh nghiệp để hiển thị"
            }
            description={
              hasActiveFilters
                ? "Thử thay đổi từ khóa hoặc trạng thái để tìm doanh nghiệp."
                : "API không trả về doanh nghiệp nào cho phạm vi đang chọn."
            }
            action={
              hasActiveFilters
                ? {
                    label: "Xóa bộ lọc",
                    onClick: () => {
                      updateSearch("");
                      updateStatusFilter("all");
                    },
                  }
                : canMutateOps
                  ? { label: "Thêm doanh nghiệp", onClick: openCreate }
                  : undefined
            }
          />
        ) : (
          <div
            className={`overflow-x-auto transition-opacity duration-150 ${
              isFetching ? "opacity-60" : ""
            }`}
          >
            <DynamicDataGrid
              featureCode="COMPANIES"
              rows={paginatedCompanies}
              getRowKey={(company) => company.id}
              isLoading={isLoadingApi && paginatedCompanies.length === 0}
              loadingMessage={"Đang tải danh sách doanh nghiệp..."}
              emptyMessage={hasActiveFilters ? "Không tìm thấy doanh nghiệp phù hợp." : "Chưa có doanh nghiệp trong phạm vi đang chọn."}
              onRowClick={(company) => navigate("/admin/companies/" + company.id)}
              renderCell={(company, fieldCode) => {
                switch (fieldCode) {
                  case "name":
                    return <div className="flex items-center gap-3"><CompanyAvatar name={company.name} size={40} /><div><p className="font-bold text-slate-900">{company.name}</p><p className="mt-0.5 font-mono text-[10px] text-slate-400">{company.shortCode}</p></div></div>;
                  case "industry":
                    return <span className="text-slate-600">{company.field}</span>;
                  case "contact":
                    return <div className="text-slate-600"><p>{company.contactPerson}</p><p className="text-[10px] text-slate-400">{company.contactEmail}</p></div>;
                  case "openPositions":
                    return <span className={company.openPositionCount ? "inline-flex rounded-md border border-[#026aa7]/20 bg-[#026aa7]/5 px-2 py-0.5 text-[11px] font-medium text-[#025a8e]" : "inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500"}>{company.openPositionCount ?? 0}{" vị trí"}</span>;
                  case "capacity":
                    return <span className="font-semibold text-slate-800">{company.studentCount} / {company.capacity}</span>;
                  case "status":
                    return <span className={company.status === "Ngưng liên kết" ? "inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500" : "inline-flex rounded-md border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"}>{company.status}</span>;
                  case "actions":
                    return <div className="inline-flex items-center gap-1">
                      <button type="button" onClick={(event) => { event.stopPropagation(); navigate("/admin/companies/" + company.id); }} className="rounded-md p-1.5 text-slate-500 hover:bg-[#026aa7]/5 hover:text-[#025a8e]" title={"Xem chi tiết"} aria-label={"Xem chi tiết " + company.name}><Eye className="h-3.5 w-3.5" /></button>
                      {canMutateOps && canLink && <button type="button" onClick={(event) => { event.stopPropagation(); setLinkTarget(company); }} disabled={isLinking} className="rounded-md border px-2 py-1 text-[10px] font-bold disabled:opacity-50" title={company.status === "Ngưng liên kết" ? "Liên kết lại với học kỳ này" : "Ngưng liên kết với học kỳ này"}>{company.status === "Ngưng liên kết" ? "Liên kết lại" : "Ngưng liên kết"}</button>}
                      {canMutateOps && <>
                        <button type="button" onClick={(event) => { event.stopPropagation(); openEdit(company); }} className="rounded-md p-1.5 text-slate-500 hover:bg-[#026aa7]/5 hover:text-[#025a8e]" title="Sửa" aria-label={"Sửa " + company.name}><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); setDeleteTarget(company); }} className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700" title={"Xóa khỏi hệ thống"} aria-label={"Xóa " + company.name}><Trash2 className="h-3.5 w-3.5" /></button>
                      </>}
                    </div>;
                  default:
                    return undefined;
                }
              }}
            />
        </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Hiển thị {filtered.length === 0 ? 0 : (visiblePage - 1) * pageSize + 1}
              –{Math.min(visiblePage * pageSize, filtered.length)} / {filtered.length} doanh nghiệp
            </span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setCurrentPage(1);
              }}
              className="cursor-pointer rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
              aria-label="Số doanh nghiệp mỗi trang"
            >
              <option value={10}>10 / trang</option>
              <option value={25}>25 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={visiblePage === 1}
              className="min-h-9 min-w-9 rounded-md border border-slate-200 p-1.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30 disabled:pointer-events-none disabled:opacity-40"
              aria-label="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="min-w-16 text-center font-semibold text-slate-700">
              {visiblePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={visiblePage === totalPages}
              className="min-h-9 min-w-9 rounded-md border border-slate-200 p-1.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30 disabled:pointer-events-none disabled:opacity-40"
              aria-label="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Panel>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editing ? "Sửa doanh nghiệp" : "Thêm doanh nghiệp"}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30"
                aria-label="Đóng biểu mẫu doanh nghiệp"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mã doanh nghiệp (nếu có)
                </label>
                <input
                  type="text"
                  placeholder="VD: FPT, VNG, VNPT..."
                  value={form.companyCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, companyCode: e.target.value }))
                  }
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                />
              </div>
              {(
                [
                  ["name", "Tên doanh nghiệp", "text"],
                  ["field", "Lĩnh vực", "text"],
                  ["location", "Địa chỉ", "text"],
                  ["contactPerson", "Người liên hệ", "text"],
                  ["contactEmail", "Email liên hệ", "email"],
                  ["contactPhone", "Điện thoại", "text"],
                  ["website", "Website", "text"],
                  ["capacity", "Sức chứa thực tập", "number"],
                ] as const
              ).map(([key, label, type]) => (
                <div key={key}>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {label}
                  </label>
                  <div className="relative">
                    {key === "location" && (
                      <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    )}
                    {key === "contactEmail" && (
                      <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    )}
                    {key === "contactPhone" && (
                      <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    )}
                    {key === "website" && (
                      <Globe className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    )}
                    <input
                      type={type}
                      value={String(form[key] ?? "")}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          [key]:
                            type === "number"
                              ? Number(e.target.value)
                              : e.target.value,
                        }))
                      }
                      className={`w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 ${
                        ["location", "contactEmail", "contactPhone", "website"].includes(
                          key,
                        )
                          ? "pl-8"
                          : ""
                      }`}
                    />
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Trạng thái
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="w-full cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                >
                  <option>Đang hợp tác</option>
                  <option>Đối tác ưu tiên</option>
                  <option>Tạm ngưng</option>
                  <option>Chờ duyệt</option>
                </select>
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="min-h-9 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="min-h-9 rounded-md bg-[#026aa7] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#025a8e] active:bg-[#005082] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT COMPANIES MODAL */}
      <ImportCompaniesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onShowToast={onShowToast}
        onSuccess={() => void refetch()}
      />

      <ConfirmDialog
        open={Boolean(linkTarget)}
        title={
          linkTarget?.status === "Ngưng liên kết"
            ? "Liên kết lại doanh nghiệp"
            : "Ngưng liên kết doanh nghiệp"
        }
        description={
          linkTarget ? (
            linkTarget.status === "Ngưng liên kết" ? (
              <>
                Liên kết lại{" "}
                <strong className="text-slate-900">{linkTarget.name}</strong>{" "}
                với học kỳ{" "}
                <strong className="text-slate-900">
                  {selectedSemester?.name}
                </strong>
                ? Doanh nghiệp sẽ xuất hiện lại trong danh sách phân bổ của
                học kỳ này.
              </>
            ) : (
              <>
                Ngưng liên kết{" "}
                <strong className="text-slate-900">{linkTarget.name}</strong>{" "}
                với học kỳ{" "}
                <strong className="text-slate-900">
                  {selectedSemester?.name}
                </strong>
                ? Doanh nghiệp sẽ bị ẩn khỏi các phân bổ mới, nhưng sinh viên
                đang thực tập tại đây vẫn được giữ nguyên.
              </>
            )
          ) : null
        }
        confirmLabel={
          linkTarget?.status === "Ngưng liên kết"
            ? "Liên kết lại"
            : "Ngưng liên kết"
        }
        loading={isLinking}
        onConfirm={() =>
          void handleSetSemesterLink(
            linkTarget!,
            linkTarget?.status === "Ngưng liên kết",
          )
        }
        onCancel={() => setLinkTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa doanh nghiệp"
        description={
          deleteTarget ? (
            <>
              Xóa doanh nghiệp{" "}
              <strong className="text-slate-900">{deleteTarget.name}</strong>?
              Hành động không thể hoàn tác.
            </>
          ) : null
        }
        confirmLabel="Xóa doanh nghiệp"
        variant="danger"
        loading={isDeleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export { CompaniesView as AdminCompaniesView };
