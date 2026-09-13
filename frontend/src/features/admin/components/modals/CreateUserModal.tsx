import { useEffect, useState, useMemo } from "react";
import { UserPlus, X, Save } from "lucide-react";
import { adminDepartmentsService } from "../../../../services/adminDepartments.service";
import { useAdminCapabilities } from "../../../../hooks/useAdminCapabilities";

export type CreateUserRole = "Student" | "Lecturer" | "DepartmentAdmin";

export interface CreateUserFormPayload {
  username: string;
  fullName: string;
  email?: string;
  role: CreateUserRole;
  departmentId?: string;
  studentCode?: string;
  staffCode?: string;
}

const ALL_ROLES: CreateUserRole[] = ["Student", "Lecturer", "DepartmentAdmin"];

const ROLE_LABEL: Record<CreateUserRole, string> = {
  Student: "Sinh viên",
  Lecturer: "Giảng viên",
  DepartmentAdmin: "Quản trị khoa",
};

const emptyFormForRole = (role: CreateUserRole) => ({
  username: "",
  fullName: "",
  email: "",
  role,
  departmentId: "",
  linkCode: "",
});

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onCreateUser?: (payload: CreateUserFormPayload) => void | Promise<void>;
  allowedRoles?: CreateUserRole[];
}

export const CreateUserModal = ({
  isOpen,
  onClose,
  onShowToast,
  onCreateUser,
  allowedRoles = ALL_ROLES,
}: CreateUserModalProps) => {
  const { isSuperAdmin } = useAdminCapabilities();
  const roles = useMemo(() => {
    const raw = allowedRoles.length > 0 ? allowedRoles : ALL_ROLES;
    if (!isSuperAdmin) {
      return raw.filter((r) => r !== "DepartmentAdmin");
    }
    return raw;
  }, [allowedRoles, isSuperAdmin]);
  const defaultRole = roles[0] || "Student";
  const [form, setForm] = useState(() => emptyFormForRole(defaultRole));
  const [isSaving, setIsSaving] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setForm(emptyFormForRole(defaultRole));
  }, [isOpen, defaultRole]);

  useEffect(() => {
    if (!isOpen) return;

    if (form.role !== "DepartmentAdmin") {
      setForm((prev) => ({ ...prev, departmentId: "" }));
      return;
    }

    adminDepartmentsService
      .getAll()
      .then((data) => setDepartments(data.map((d) => ({ id: d.id, name: d.name }))))
      .catch(() => setDepartments([]));
  }, [isOpen, form.role]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = form.username.trim();
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const linkCode = form.linkCode.trim();

    if (!username) {
      onShowToast("Vui lòng nhập tên đăng nhập (MSSV / Mã GV).");
      return;
    }
    if (!fullName) {
      onShowToast("Vui lòng nhập họ và tên.");
      return;
    }

    if (form.role === "DepartmentAdmin" && !form.departmentId) {
      onShowToast("Vui lòng chọn khoa cho Admin khoa.");
      return;
    }

    const payload: CreateUserFormPayload = {
      username,
      fullName,
      role: form.role,
      email: email || undefined,
      departmentId: form.role === "DepartmentAdmin" ? form.departmentId : undefined,
      studentCode: form.role === "Student" && linkCode ? linkCode : undefined,
      staffCode: form.role === "Lecturer" && linkCode ? linkCode : undefined,
    };

    setIsSaving(true);
    try {
      if (onCreateUser) await onCreateUser(payload);
      setForm(emptyFormForRole(roles[0]));
      onClose();
    } catch {
      /* parent shows API error */
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-lg border border-slate-200 shadow-md max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Tạo tài khoản mới
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Mật khẩu tạm 8 ký tự — gửi email nếu có SMTP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Vai trò *
            </label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  role: e.target.value as CreateUserRole,
                  departmentId: e.target.value === "DepartmentAdmin" ? prev.departmentId : "",
                  linkCode: "",
                }))
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </div>

          {form.role === "DepartmentAdmin" && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Khoa *
              </label>
              <select
                value={form.departmentId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, departmentId: e.target.value }))
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="">-- Chọn khoa --</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Tên đăng nhập (MSSV / Mã GV) *
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, username: e.target.value }))
              }
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              placeholder="20110201 hoặc GV001"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Họ và tên *
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, fullName: e.target.value }))
              }
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Email (tùy chọn)
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              placeholder="user@hcmute.edu.vn"
            />
          </div>

          {form.role !== "DepartmentAdmin" && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {form.role === "Student"
                  ? "Liên kết MSSV hồ sơ (tùy chọn)"
                  : "Liên kết Mã GV hồ sơ (tùy chọn)"}
              </label>
              <input
                type="text"
                value={form.linkCode}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, linkCode: e.target.value }))
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                placeholder={form.role === "Student" ? "20110201" : "GV001"}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <span>Đang tạo…</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Tạo tài khoản</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
