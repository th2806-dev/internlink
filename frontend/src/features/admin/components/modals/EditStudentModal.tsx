import { useEffect, useState } from "react";
import { Pencil, X, Save } from "lucide-react";
import type { AdminStudentRow } from "../../../../hooks/useAdminStudentsPage";

export interface EditStudentFormPayload {
  fullName: string;
  class?: string;
  major?: string;
  email?: string;
  phone?: string;
  department?: string;
  desiredPosition?: string;
  alternativePosition?: string;
  desiredLocation?: string;
  workPreference?: string;
  preferredIndustry?: string;
  skills?: string;
  resumeUrl?: string;
}

interface EditStudentModalProps {
  isOpen: boolean;
  student: AdminStudentRow | null;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onSave?: (id: string, payload: EditStudentFormPayload) => void | Promise<void>;
}

function emptyFromStudent(student: AdminStudentRow | null): EditStudentFormPayload {
  if (!student) {
    return { fullName: "", class: "", major: "", email: "", phone: "" };
  }
  return {
    fullName: student.fullName,
    class: student.classCode !== "—" ? student.classCode : "",
    major: student.major !== "—" ? student.major : "",
    email: student.email !== "—" ? student.email : "",
    phone: student.phone !== "—" ? student.phone : "",
    department: student.department !== "—" ? student.department : "",
    desiredPosition: student.desiredPosition || "",
    alternativePosition: student.alternativePosition || "",
    desiredLocation: student.desiredLocation || "",
    workPreference: student.workPreference || "",
    preferredIndustry: student.preferredIndustry || "",
    skills: student.skills || "",
    resumeUrl: student.resumeUrl || "",
  };
}

export const EditStudentModal = ({
  isOpen,
  student,
  onClose,
  onShowToast,
  onSave,
}: EditStudentModalProps) => {
  const [form, setForm] = useState<EditStudentFormPayload>(emptyFromStudent(student));
  const [ho, setHo] = useState("");
  const [ten, setTen] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && student) {
      setForm(emptyFromStudent(student));
      setHo(student.ho || "");
      setTen(student.ten || "");
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const setField = (key: keyof EditStudentFormPayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = [ho.trim(), ten.trim()].filter(Boolean).join(" ");
    if (!ten.trim()) {
      onShowToast("Vui lòng nhập Tên sinh viên!");
      return;
    }
    if (!fullName) {
      onShowToast("Vui lòng nhập họ và tên sinh viên!");
      return;
    }

    const payload: EditStudentFormPayload = {
      fullName,
      class: form.class?.trim() || undefined,
      major: form.major?.trim() || undefined,
      email: form.email?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      department: form.department?.trim() || undefined,
      desiredPosition: form.desiredPosition?.trim() || undefined,
      alternativePosition: form.alternativePosition?.trim() || undefined,
      desiredLocation: form.desiredLocation?.trim() || undefined,
      workPreference: form.workPreference?.trim() || undefined,
      preferredIndustry: form.preferredIndustry?.trim() || undefined,
      skills: form.skills?.trim() || undefined,
      resumeUrl: form.resumeUrl?.trim() || undefined,
    };

    setIsSaving(true);
    try {
      if (onSave) await onSave(student.id, payload);
      onShowToast(`Đã cập nhật sinh viên ${fullName}`);
      onClose();
    } catch {
      /* parent shows API error */
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-lg border border-slate-200 shadow-md w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-md border border-amber-100">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sửa sinh viên</h2>
              <p className="text-[11px] text-slate-500 font-mono">{student.mssv}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">MSSV</label>
            <input
              type="text"
              value={student.mssv}
              disabled
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md font-mono font-bold text-slate-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Họ & tên đệm
              </label>
              <input
                type="text"
                value={ho}
                onChange={(e) => setHo(e.target.value)}
                placeholder="Nguyễn Văn"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-semibold outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={ten}
                onChange={(e) => setTen(e.target.value)}
                placeholder="An"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Lớp</label>
              <input
                type="text"
                value={form.class}
                onChange={(e) => setField("class", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ngành</label>
              <input
                type="text"
                value={form.major}
                onChange={(e) => setField("major", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
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

          {/* INTERNSHIP PREFERENCES SECTION */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-violet-600">Nguyện vọng thực tập</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Khoa</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setField("department", e.target.value)}
                  placeholder="Công nghệ thông tin"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Vị trí mong muốn</label>
                <input
                  type="text"
                  value={form.desiredPosition}
                  onChange={(e) => setField("desiredPosition", e.target.value)}
                  placeholder="Backend Developer"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-violet-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Vị trí thay thế</label>
                <input
                  type="text"
                  value={form.alternativePosition}
                  onChange={(e) => setField("alternativePosition", e.target.value)}
                  placeholder="QA/Tester"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kỹ năng</label>
                <input
                  type="text"
                  value={form.skills}
                  onChange={(e) => setField("skills", e.target.value)}
                  placeholder="C#, .NET, React"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-violet-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Địa điểm</label>
                <input
                  type="text"
                  value={form.desiredLocation}
                  onChange={(e) => setField("desiredLocation", e.target.value)}
                  placeholder="Hà Nội, TP.HCM"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hình thức</label>
                <select
                  value={form.workPreference}
                  onChange={(e) => setField("workPreference", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-violet-500"
                >
                  <option value="">— Chọn —</option>
                  <option value="Onsite">Onsite</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lĩnh vực</label>
                <input
                  type="text"
                  value={form.preferredIndustry}
                  onChange={(e) => setField("preferredIndustry", e.target.value)}
                  placeholder="Fintech, AI"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Link CV</label>
                <input
                  type="url"
                  value={form.resumeUrl}
                  onChange={(e) => setField("resumeUrl", e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-violet-500"
                />
              </div>
            </div>
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
