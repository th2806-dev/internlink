import { useEffect, useState } from "react";
import { Pencil, X, Save } from "lucide-react";

export interface LecturerRowForEdit {
  id: string;
  userId?: string | null;
  employeeId: string;
  fullName: string;
  department: string;
  email: string;
  phone: string;
  accountStatus: string;
  /** Số SV đang hướng dẫn (đếm server-side theo trang). */
  currentCount?: number;
}

export interface EditLecturerFormPayload {
  fullName: string;
  email?: string;
  phone?: string;
  department?: string;
}

interface EditLecturerModalProps {
  isOpen: boolean;
  lecturer: LecturerRowForEdit | null;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onSave?: (id: string, payload: EditLecturerFormPayload) => void | Promise<void>;
}

function emptyFromLecturer(lecturer: LecturerRowForEdit | null): EditLecturerFormPayload {
  if (!lecturer) {
    return { fullName: "", email: "", phone: "", department: "" };
  }
  return {
    fullName: lecturer.fullName,
    email: lecturer.email !== "—" ? lecturer.email : "",
    phone: lecturer.phone !== "—" ? lecturer.phone : "",
    department: lecturer.department !== "—" ? lecturer.department : "",
  };
}

export const EditLecturerModal = ({
  isOpen,
  lecturer,
  onClose,
  onShowToast,
  onSave,
}: EditLecturerModalProps) => {
  const [form, setForm] = useState<EditLecturerFormPayload>(emptyFromLecturer(lecturer));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && lecturer) setForm(emptyFromLecturer(lecturer));
  }, [isOpen, lecturer]);

  if (!isOpen || !lecturer) return null;

  const setField = (key: keyof EditLecturerFormPayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = form.fullName.trim();
    if (!fullName) {
      onShowToast("Vui lòng nhập họ và tên giảng viên!");
      return;
    }

    const payload: EditLecturerFormPayload = {
      fullName,
      email: form.email?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      department: form.department?.trim() || undefined,
    };

    setIsSaving(true);
    try {
      if (onSave) await onSave(lecturer.id, payload);
      onShowToast(`Đã cập nhật giảng viên ${fullName}`);
      onClose();
    } catch {
      /* parent shows API error */
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-md max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-md border border-amber-100">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Sửa giảng viên</h3>
              <p className="text-[11px] text-slate-500 font-mono">{lecturer.employeeId}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">MaGV</label>
            <input
              type="text"
              value={lecturer.employeeId}
              disabled
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md font-mono font-bold text-slate-500"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Họ tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold outline-none focus:bg-white focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">SDT</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Bộ môn</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => setField("department", e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md">
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-md flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
