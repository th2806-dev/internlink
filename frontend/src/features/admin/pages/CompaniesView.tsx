import { useMemo, useState, useEffect } from "react";
import type { ToastType } from "../../../contexts/ToastContext";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Plus,
  Search,
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
import { PageHeader } from "../../../components/common/PageHeader";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { Panel } from "../../../components/common/Panel";
import { Toolbar } from "../../../components/common/Toolbar";
import { CompanyAvatar } from "../../../components/common/CompanyAvatar";
import type { Enterprise } from "../../../types/enterprise";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { mapCompanyDtoToEnterprise } from "../../../lib/adminMappers";
import { adminCompaniesService } from "../../../services/adminCompanies.service";
import { useSemester, toApiSemesterId, toApiDepartmentId } from "../../../contexts/SemesterContext";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { ImportCompaniesModal } from "../components/modals/ImportCompaniesModal";

const emptyForm = {
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
  const { canMutateOps, isSuperAdmin } = useAdminCapabilities();
  const [companies, setCompanies] = useState<Enterprise[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<Enterprise | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Enterprise | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState<Enterprise | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const reloadCompanies = async () => {
    setIsLoadingApi(true);
    try {
      const rows = await adminCompaniesService.getAll(
        0,
        500,
        toApiSemesterId(selectedSemester?.id),
        toApiDepartmentId(selectedDepartmentId),
      );
      setCompanies(rows.map(mapCompanyDtoToEnterprise));
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsLoadingApi(false);
    }
  };

  // Load companies for the currently selected term/department; refetch on change
  useEffect(() => {
    void reloadCompanies();
  }, [selectedSemester?.id, selectedDepartmentId, onShowToast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      const matchQ =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.shortCode.toLowerCase().includes(q) ||
        c.field.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all" || c.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [companies, search, statusFilter]);

  const statuses = useMemo(
    () => Array.from(new Set(companies.map((c) => c.status))),
    [companies],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedCompanies = useMemo(() => {
    const start = (visiblePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, visiblePage]);

  const updateSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const updateStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (c: Enterprise) => {
    setEditing(c);
    setForm({
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
        await adminCompaniesService.update(editing.id, {
          ...body,
          isActive,
        });
        await reloadCompanies();
        onShowToast(`Đã cập nhật doanh nghiệp ${form.name}`);
      } else {
        await adminCompaniesService.create(body);
        await reloadCompanies();
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
      await adminCompaniesService.setSemesterLink(c.id, semesterId, isLinked);
      await reloadCompanies();
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
      await adminCompaniesService.delete(c.id);
      await reloadCompanies();
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

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      <PageHeader
        icon={Building2}
        title="Doanh nghiệp"
        subtitle="Danh mục đối tác thực tập — đồng bộ API"
        actions={[
          {
            label: "Xuất Excel",
            icon: Download,
            onClick: () => void handleExport(),
            variant: "secondary",
          },
          ...(canMutateOps
            ? [
                {
                  label: "Import Excel",
                  icon: FileUp,
                  onClick: () => setIsImportModalOpen(true),
                  variant: "secondary" as const,
                },
                {
                  label: "Thêm doanh nghiệp",
                  icon: Plus,
                  onClick: openCreate,
                  variant: "primary" as const,
                },
              ]
            : []),
        ]}
      />

      {isSuperAdmin && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2.5">
          <Eye className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Chế độ chỉ xem nghiệp vụ khoa — Quản trị hệ thống không thể tạo/sửa/xóa doanh nghiệp. Xuất dữ liệu vẫn khả dụng.
          </span>
        </div>
      )}

      <Toolbar
        left={
          <p className="text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800">{companies.length}</span>{" "}
            doanh nghiệp ·{" "}
            <span className="font-bold text-slate-800">{filtered.length}</span>{" "}
            đang lọc
            {isLoadingApi && (
              <span className="ml-2 text-blue-600 font-semibold">
                · Đang tải API…
              </span>
            )}
          </p>
        }
      />

      <Panel className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Danh sách Doanh nghiệp
              </h2>
              {selectedSemester?.id && selectedSemester.id !== "all" && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-md border border-blue-200/60">
                  Học kỳ: {selectedSemester.name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {canLink
                ? "Doanh nghiệp liên kết mặc định với mọi học kỳ — dùng 'Ngưng liên kết' để ẩn khỏi phân bổ mới của kỳ này."
                : "Chọn một học kỳ cụ thể để quản lý liên kết doanh nghiệp của kỳ đó."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => updateSearch(e.target.value)}
                placeholder="Tìm tên, mã, lĩnh vực…"
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:border-blue-500 outline-none w-56"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => updateStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 font-medium outline-none cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="py-2.5 pr-3">Doanh nghiệp</th>
                <th className="py-2.5 pr-3">Lĩnh vực</th>
                <th className="py-2.5 pr-3">Liên hệ</th>
                <th className="py-2.5 pr-3">Vị trí tuyển dụng</th>
                <th className="py-2.5 pr-3">SV / Sức chứa</th>
                <th className="py-2.5 pr-3">Trạng thái</th>
                <th className="py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedCompanies.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/80 cursor-pointer"
                  onClick={() => navigate(`/admin/companies/${c.id}`)}
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <CompanyAvatar name={c.name} size={40} />
                      <div>
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {c.shortCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-slate-600 max-w-[180px]">
                    {c.field}
                  </td>
                  <td className="py-3 pr-3 text-slate-600">
                    <div>{c.contactPerson}</div>
                    <div className="text-[10px] text-slate-400">{c.contactEmail}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        (c.openPositionCount ?? 0) > 0
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-slate-50 text-slate-500 border border-slate-200"
                      }`}
                    >
                      <Briefcase className="w-3 h-3" />
                      {c.openPositionCount ?? 0} vị trí
                    </span>
                  </td>
                  <td className="py-3 pr-3 font-semibold text-slate-800">
                    {c.studentCount} / {c.capacity}
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                        c.status === "Ngưng liên kết"
                          ? "bg-slate-100 text-slate-500 border-slate-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                      }`}
                    >
                      {c.status}
                    </span>
                    {c.status === "Ngưng liên kết" && (
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Ẩn khỏi phân bổ mới · SV đang TT vẫn hiển thị
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/companies/${c.id}`)}
                        className="p-1.5 rounded-md text-slate-500 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {canMutateOps && canLink && (
                        <button
                          type="button"
                          onClick={() => setLinkTarget(c)}
                          disabled={isLinking}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer disabled:opacity-50 transition-colors ${
                            c.status === "Ngưng liên kết"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                          }`}
                          title={
                            c.status === "Ngưng liên kết"
                              ? "Liên kết lại với học kỳ này"
                              : "Ngưng liên kết với học kỳ này"
                          }
                        >
                          {c.status === "Ngưng liên kết"
                            ? "Liên kết lại"
                            : "Ngưng liên kết"}
                        </button>
                      )}
                      {canMutateOps && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                            title="Sửa"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(c)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                            title="Xóa khỏi hệ thống"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-slate-400 font-medium"
                  >
                    Không có doanh nghiệp khớp bộ lọc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
              className="px-2 py-1 border border-slate-200 rounded-md bg-white font-medium text-slate-700 outline-none"
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
              className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
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
              className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Panel>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-md w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editing ? "Sửa doanh nghiệp" : "Thêm doanh nghiệp"}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
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
                      className={`w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:border-blue-500 outline-none ${
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
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-50 outline-none cursor-pointer"
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
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="px-3 py-1.5 text-xs font-bold rounded-md bg-[#1d4ed8] text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
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
        onSuccess={() => void reloadCompanies()}
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
