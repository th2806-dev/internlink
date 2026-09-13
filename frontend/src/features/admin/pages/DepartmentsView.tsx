import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, AlertTriangle } from 'lucide-react';
import { adminDepartmentsService, type DepartmentDto, type CreateDepartmentRequest, type UpdateDepartmentRequest } from '../../../services/adminDepartments.service';
import { useToast } from '../../../hooks/useToast';
import type { ToastType } from '../../../contexts/ToastContext';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '-';
  }
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
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${department.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
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
          <button type="button" onClick={() => onEdit(department)} className="text-slate-600 hover:text-blue-600 p-1 rounded hover:bg-slate-100" title="Sửa khoa">
            <Edit2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onDelete(department)} className="text-slate-600 hover:text-rose-600 p-1 rounded hover:bg-slate-100" title="Xóa khoa">
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
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Khoa Công nghệ Thông tin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="Mô tả ngắn về khoa..."
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-slate-700">Khoa đang hoạt động</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Hủy</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
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
  const [modalDepartment, setModalDepartment] = useState<DepartmentDto | null>(null);
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminDepartmentsService.getAll();
      setDepartments(data);
    } catch (err) {
      onShowToast?.('Không tải được danh sách khoa.', 'danger');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Quản lý Khoa</h1>
          <p className="text-sm text-slate-500 mt-0.5">Duy trì danh sách khoa trong hệ thống. Chỉ Super Admin mới thể thêm/sửa/xóa.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsCreatingDepartment(true);
            setModalDepartment(null);
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" /> Thêm khoa
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
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
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Đang tải...
                    </div>
                  </td>
                </tr>
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
      </div>

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
