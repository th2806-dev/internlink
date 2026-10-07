import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Building2, AlertTriangle, RefreshCw } from 'lucide-react';
import { adminDepartmentsService, type DepartmentDto, type CreateDepartmentRequest, type UpdateDepartmentRequest } from '../../../services/adminDepartments.service';
import { Panel } from "../../../components/common/Panel";
import type { ToastType } from '../../../contexts/ToastContext';

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function DepartmentRow({ department, onEdit, onDelete }: { department: DepartmentDto; onEdit: (d: DepartmentDto) => void; onDelete: (d: DepartmentDto) => void }) {
  return (
    <tr className="border-b border-slate-200 last:border-0">
      <td className="px-4 py-3 text-sm align-middle whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded">{department.code}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm align-middle font-medium text-slate-800">{department.name}</td>
      <td className="px-4 py-3 text-sm align-middle text-slate-600 max-w-[220px] truncate">{department.description ?? '-'}</td>
      <td className="px-4 py-3 text-sm align-middle">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${department.isActive ? 'border border-[#7bc043]/40 bg-[#7bc043]/10 text-slate-800' : 'bg-slate-100 text-slate-600'}`}>
          {department.isActive ? 'Hoạt động' : 'Tạm ngưng'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm align-middle text-slate-600 whitespace-nowrap">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{formatDate(department.createdAt)}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm align-middle text-slate-600 whitespace-nowrap">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500">SV: {department.studentCount}</span>
          <span className="text-slate-500">GV: {department.lecturerCount}</span>
          <span className="text-slate-500">User: {department.userCount}</span>
          <span className="text-slate-500">Kỳ: {department.semesterCount}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm align-middle whitespace-nowrap">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onEdit(department)} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-[#026aa7]/5 hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]" title="Sửa khoa" aria-label={`Sửa khoa ${department.name}`}>
            <Edit2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onDelete(department)} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600" title="Xóa khoa" aria-label={`Xóa khoa ${department.name}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function DepartmentModal({ department, onClose, onSave }: { department?: DepartmentDto | null; onClose: () => void; onSave: (req: CreateDepartmentRequest | UpdateDepartmentRequest, isUpdate: boolean) => void }) {
  const isEdit = department != null;
  const [code, setCode] = useState(department?.code ?? '');
  const [name, setName] = useState(department?.name ?? '');
  const [description, setDescription] = useState(department?.description ?? '');
  const [isActive, setIsActive] = useState(department?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (department) {
      setCode(department.code);
      setName(department.name);
      setDescription(department.description ?? '');
      setIsActive(department.isActive);
    } else {
      setCode('');
      setName('');
      setDescription('');
      setIsActive(true);
    }
    setError(null);
  }, [department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('Mã và tên khoa là bắt buộc.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body: CreateDepartmentRequest | UpdateDepartmentRequest = isEdit
        ? { code: code.trim().toUpperCase(), name: name.trim(), description: description.trim() || undefined, isActive }
        : { code: code.trim().toUpperCase(), name: name.trim(), description: description.trim() || undefined, isActive };
      await onSave(body, isEdit);
      onClose();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Không thể lưu khoa.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="department-modal-title" className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white rounded-lg shadow-xl w-full max-w-md p-5">
        <h3 id="department-modal-title" className="text-lg font-semibold text-slate-800 mb-4">
          {isEdit ? 'Sửa thông tin khoa' : 'Thêm khoa mới'}
        </h3>
        {error && (
          <div className="mb-4 flex items-start gap-2 text-sm bg-rose-50 text-rose-700 border border-rose-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mã khoa <span className="text-rose-600">*</span></label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-1"
              placeholder="CNTT"
              disabled={isEdit}
            />
            <p className="text-xs text-slate-500 mt-1">Mã viết hoa, ví dụ: CNTT, QTKD. Khóa khi sửa.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên khoa <span className="text-rose-600">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-1"
              placeholder="Khoa Công nghệ Thông tin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-1"
              rows={2}
              placeholder="Mô tả ngắn về khoa..."
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#026aa7] focus:ring-[#026aa7]" />
              <span className="text-sm text-slate-700">Khoa đang hoạt động</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Hủy</button>
            <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-1 rounded-md bg-[#026aa7] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? 'Lưu...' : isEdit ? 'Cập nhật' : 'Thêm khoa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DepartmentsView({ onShowToast }: { onShowToast?: (msg: string, type?: ToastType) => void }) {
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalDepartment, setModalDepartment] = useState<DepartmentDto | null>(null);
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminDepartmentsService.getAll();
      setDepartments(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách khoa.');
      onShowToast?.('Không tải được danh sách khoa.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (body: CreateDepartmentRequest) => {
    await adminDepartmentsService.create(body);
    onShowToast?.('Đã thêm khoa mới.', 'success');
    load();
  };

  const handleCreateFromUnion = async (body: CreateDepartmentRequest | UpdateDepartmentRequest) => {
    await handleCreate(body as CreateDepartmentRequest);
  };

  const handleUpdate = async (id: string, body: UpdateDepartmentRequest) => {
    await adminDepartmentsService.update(id, body);
    onShowToast?.('Đã cập nhật khoa.', 'success');
    load();
  };

  const handleDelete = async (department: DepartmentDto) => {
    if (department.userCount > 0 || department.studentCount > 0 || department.lecturerCount > 0 || department.semesterCount > 0) {
      onShowToast?.('Không thể xóa khoa đang có người dùng / sinh viên / giảng viên / kỳ thực tập.', 'danger');
      return;
    }
    if (!confirm(`Xóa khoa "${department.name}"? Hành động không thể khôi phục.`)) return;
    try {
      setDeleting(department.id);
      await adminDepartmentsService.delete(department.id);
      onShowToast?.('Đã xóa khoa.', 'success');
      load();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Không thể xóa khoa.';
      onShowToast?.(message, 'danger');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 pb-12">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#026aa7] px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <Building2 className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-wide">Quản lý khoa</h1>
              <p className="mt-0.5 text-xs text-white/80">
                Danh sách đơn vị, trạng thái hoạt động và quy mô dữ liệu theo khoa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCreatingDepartment(true);
              setModalDepartment(null);
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-bold text-[#026aa7] transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Thêm khoa
          </button>
        </div>
      </section>

      <Panel padding="none" className="overflow-hidden rounded-xl border-slate-200/90 shadow-2xs">
        {loadError && (
          <div role="alert" className="flex flex-col gap-3 border-b border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{loadError}</span>
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 self-start rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 disabled:opacity-50 sm:self-auto">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Thử tải lại
            </button>
          </div>
        )}
        <div className="divide-y divide-slate-100 md:hidden">
          {loading ? (
            <p className="p-6 text-center text-sm text-slate-500">Đang tải danh sách khoa…</p>
          ) : loadError ? null : departments.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">Hiện chưa có khoa nào.</p>
          ) : departments.map((department) => (
            <article key={department.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-900">{department.name}</h2>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">{department.code}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${department.isActive ? 'border-[#7bc043]/40 bg-[#7bc043]/10 text-slate-800' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                  {department.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                </span>
              </div>
              <p className="text-xs text-slate-600">{department.description || "Chưa có mô tả."}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-slate-50 p-3 text-xs sm:grid-cols-4">
                <div><dt className="text-slate-500">Sinh viên</dt><dd className="font-semibold text-slate-800">{department.studentCount}</dd></div>
                <div><dt className="text-slate-500">Giảng viên</dt><dd className="font-semibold text-slate-800">{department.lecturerCount}</dd></div>
                <div><dt className="text-slate-500">Tài khoản</dt><dd className="font-semibold text-slate-800">{department.userCount}</dd></div>
                <div><dt className="text-slate-500">Học kỳ</dt><dd className="font-semibold text-slate-800">{department.semesterCount}</dd></div>
              </dl>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">Tạo ngày {formatDate(department.createdAt)}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => { setIsCreatingDepartment(false); setModalDepartment(department); }} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-[#026aa7]/5 hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]" aria-label={`Sửa khoa ${department.name}`}>
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => void handleDelete(department)} className="rounded-md p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-700" aria-label={`Xóa khoa ${department.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Khoa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tên khoa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Mô tả</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Ngày tạo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Số lượng</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={7}>
                    <div className="inline-flex items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#026aa7] border-t-transparent" />
                      Đang tải...
                    </div>
                  </td>
                </tr>
              ) : loadError ? (
                <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={7}>Không thể hiển thị dữ liệu khi tải danh sách khoa thất bại.</td></tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={7}>
                    Hiện chưa có khoa nào.
                  </td>
                </tr>
              ) : (
                departments.map((d) => (
                  <DepartmentRow
                    key={d.id}
                    department={d}
                    onEdit={(dep) => {
                      setIsCreatingDepartment(false);
                      setModalDepartment(dep);
                    }}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {(modalDepartment !== null || isCreatingDepartment) && (
        <DepartmentModal
          department={modalDepartment}
          onClose={() => {
            setModalDepartment(null);
            setIsCreatingDepartment(false);
          }}
          onSave={(body, isUpdate) => {
            if (isUpdate && modalDepartment) {
              handleUpdate(modalDepartment.id, body as UpdateDepartmentRequest);
            } else {
              handleCreateFromUnion(body);
            }
          }}
        />
      )}

      {deleting !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl p-4 max-w-sm w-full mx-4">
            <div className="flex items-center gap-2 text-slate-800 font-medium">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
              Đang xóa...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
