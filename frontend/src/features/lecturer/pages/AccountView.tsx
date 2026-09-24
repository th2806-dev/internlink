import { FormEvent, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { PasswordStrengthMeter } from "../../../components/common/PasswordStrengthMeter";
import { apiRequest, getApiErrorMessage } from "../../../lib/apiClient";
import { authService } from "../../../services/auth.service";
import { useAuth } from "../../../hooks/useAuth";
import { useSemester } from "../../../contexts/SemesterContext";

type Profile = {
  fullName: string;
  lecturerCode: string;
  email: string;
  phone: string;
  department: string;
  office: string;
};

type LecturerOverview = {
  lecturer: {
    staffCode: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    department?: string | null;
  };
  totalInternships: number;
  statusCounts: Record<string, number>;
};

const emptyProfile: Profile = {
  fullName: "",
  lecturerCode: "",
  email: "",
  phone: "",
  department: "",
  office: "Chưa cập nhật",
};

export const AccountView = () => {
  const { user, logout } = useAuth();
  const { selectedSemester } = useSemester();
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [overview, setOverview] = useState({ totalInternships: 0, statusCounts: {} as Record<string, number> });
  const [draft, setDraft] = useState<Profile>(emptyProfile);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest<LecturerOverview>("/api/Lecturer/me")
      .then((data) => {
        if (cancelled) return;
        const loaded: Profile = {
          fullName: data.lecturer.fullName || user?.name || "",
          lecturerCode: data.lecturer.staffCode || "",
          email: data.lecturer.email || user?.email || "",
          phone: data.lecturer.phone || "",
          department: data.lecturer.department || "",
          office: "Chưa cập nhật",
        };
        setProfile(loaded);
        setDraft(loaded);
        setOverview({
          totalInternships: data.totalInternships ?? 0,
          statusCounts: data.statusCounts ?? {},
        });
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.fullName.trim()) {
      setError("Họ và tên không được để trống.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiRequest<Profile>("/api/Lecturer/me", {
        method: "PUT",
        body: {
          fullName: draft.fullName.trim(),
          email: draft.email.trim() || undefined,
          phone: draft.phone.trim() || undefined,
          department: draft.department.trim() || undefined,
        },
      });
      const next = { ...draft, ...updated, office: profile.office };
      setProfile(next);
      setDraft(next);
      setEditing(false);
      setMessage("Đã cập nhật thông tin hồ sơ.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!currentPassword || newPassword.length < 8 || newPassword !== confirmPassword) {
      setError("Vui lòng kiểm tra mật khẩu hiện tại, mật khẩu mới tối thiểu 8 ký tự và phần xác nhận.");
      return;
    }
    setChangingPassword(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Đã đổi mật khẩu thành công.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  const profileFields: [keyof Profile, string, typeof User][] = [
    ["fullName", "Họ và tên", User],
    ["email", "Email công vụ", Mail],
    ["phone", "Số điện thoại", Phone],
    ["office", "Văn phòng", MapPin],
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-in fade-in duration-200">
      <PageHeader
        icon={User}
        title="Thông tin Tài khoản"
        subtitle="Quản lý hồ sơ cá nhân, thông tin giảng viên và bảo mật mật khẩu tài khoản."
        badge={`Mã GV: ${profile.lecturerCode || "—"}`}
        badgeColor="bg-blue-100 text-blue-800 border-blue-200"
        actions={[{
          label: editing ? "Đang chỉnh sửa" : "Chỉnh sửa hồ sơ",
          icon: Edit3,
          onClick: () => { setEditing(true); setDraft({ ...profile }); },
          variant: "secondary",
          disabled: editing,
        }]}
      >
        <span className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
          <CheckCircle2 className="h-3 w-3" /> Tài khoản đang hoạt động
        </span>
        <button type="button" onClick={() => void logout()} className="flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100">
          <LogOut className="h-3.5 w-3.5" /> Đăng xuất
        </button>
      </PageHeader>

      {message && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">{message}</p>}
      {error && <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}

      {loading ? (
        <Panel className="py-12 text-center text-xs text-slate-500">Đang tải thông tin tài khoản...</Panel>
      ) : (
        <>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
        <Panel className="space-y-4">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <InitialsAvatar
                name={profile.fullName || "Giảng viên"}
                seed={profile.lecturerCode || profile.email || profile.fullName}
                size={56}
                className="border border-blue-700 text-lg"
              />
              <div>
                <h2 className="text-base font-bold text-slate-900">{profile.fullName || "Giảng viên"}</h2>
                <p className="text-xs font-medium text-slate-500">{profile.department || "Chưa cập nhật bộ môn"} · Mã GV {profile.lecturerCode || "—"}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400"><Mail className="h-3 w-3" /> {profile.email || "Chưa cập nhật email"}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">Hồ sơ giảng viên</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs"><User className="h-4 w-4 shrink-0 text-blue-600" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Sinh viên phụ trách</p><p className="font-bold text-slate-800">{overview.totalInternships} hồ sơ thực tập</p></div></div>
            <div className="flex items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs"><Building2 className="h-4 w-4 shrink-0 text-emerald-600" /><div><p className="text-[10px] font-bold uppercase text-slate-400">Học kỳ</p><p className="font-bold text-slate-800">{selectedSemester?.name ?? "Học kỳ hiện tại"}</p></div></div>
          </div>
        </Panel>

            <Panel className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <User className="h-5 w-5 text-blue-600" /> Hồ sơ cá nhân
                </h2>
                {!editing && (
                  <button type="button" onClick={() => { setEditing(true); setDraft({ ...profile }); }} className="flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100">
                    <Edit3 className="h-3.5 w-3.5" /> Chỉnh sửa
                  </button>
                )}
              </div>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="space-y-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600">
                    <Edit3 className="h-3.5 w-3.5" /> Thông tin liên hệ
                  </h3>
                <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                  {profileFields.map(([field, label, Icon]) => (
                    <label key={field} className="font-bold text-slate-700">
                      {label}{field !== "office" ? " *" : ""}
                      <span className="relative mt-1 block">
                        <Icon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type={field === "email" ? "email" : "text"}
                          disabled={!editing || field === "email" || field === "office"}
                          value={editing ? draft[field] : profile[field]}
                          onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))}
                          placeholder={field === "fullName" ? "Nhập họ và tên" : field === "email" ? "Nhập email công vụ" : field === "phone" ? "Nhập số điện thoại" : "Chưa cập nhật"}
                          title={field === "office" ? "Thông tin văn phòng do khoa quản lý" : undefined}
                          aria-disabled={field === "office" ? "true" : undefined}
                          className={field === "office"
                            ? "w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-100 py-2.5 pl-9 pr-3 font-medium text-slate-400 italic"
                            : "w-full rounded-md border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 font-medium outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"}
                        />
                      </span>
                    </label>
                  ))}
                </div>
                </div>
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Lock className="h-3.5 w-3.5 text-slate-400" /> Thông tin giảng viên (cố định)</h3>
                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Mã giảng viên</p><p className="mt-0.5 font-bold text-slate-900">{profile.lecturerCode || "—"}</p></div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Bộ môn</p><p className="mt-0.5 font-bold text-slate-900">{profile.department || "Chưa cập nhật"}</p></div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Vai trò</p><p className="mt-0.5 font-bold text-slate-900">Giảng viên hướng dẫn</p></div>
                  </div>
                </div>
                {editing && <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => { setDraft({ ...profile }); setEditing(false); }} className="flex items-center gap-1.5 rounded-md bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700"><X className="h-3.5 w-3.5" /> Hủy</button><button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {saving ? "Đang lưu..." : "Lưu thay đổi"}</button></div>}
              </form>
            </Panel>
        </div>

          <div className="space-y-5">
          <Panel className="h-fit space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><ShieldCheck className="h-4 w-4 text-emerald-600" /><h3 className="text-sm font-bold text-slate-900">Bảo mật</h3></div>
            <form onSubmit={changePassword} className="space-y-3 border-t border-slate-100 pt-4 text-xs">
              <p className="flex items-center gap-1.5 font-bold text-slate-800"><Key className="h-3.5 w-3.5 text-blue-600" /> Đổi mật khẩu</p>
              {([currentPassword, newPassword, confirmPassword] as const).map((value, index) => {
                const labels = ["Mật khẩu hiện tại", "Mật khẩu mới", "Xác nhận mật khẩu mới"];
                const placeholders = ["Nhập mật khẩu hiện tại", "Tối thiểu 8 ký tự", "Nhập lại mật khẩu mới"];
                return <label key={labels[index]} className="block font-bold text-slate-700">{labels[index]} *<span className="relative mt-1 block"><Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input type={showPasswords ? "text" : "password"} value={value} onChange={(event) => [setCurrentPassword, setNewPassword, setConfirmPassword][index](event.target.value)} autoComplete={index === 0 ? "current-password" : "new-password"} placeholder={placeholders[index]} className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 font-medium outline-none focus:border-blue-500 focus:bg-white" required minLength={index > 0 ? 8 : undefined} /><button type="button" onClick={() => setShowPasswords((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" title={showPasswords ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button></span></label>;
              })}
              <PasswordStrengthMeter password={newPassword} confirmPassword={confirmPassword} />
              <button type="submit" disabled={changingPassword || newPassword.length < 8 || newPassword !== confirmPassword} className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Key className="h-3.5 w-3.5" />{changingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</button>
            </form>
          </Panel>
          <Panel className="h-fit space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><LogOut className="h-4 w-4 text-rose-600" /><h3 className="text-sm font-bold text-slate-900">Đăng xuất hệ thống</h3></div>
            <p className="text-xs font-medium leading-relaxed text-slate-500">Đăng xuất phiên làm việc khỏi trình duyệt này. Dữ liệu hướng dẫn vẫn được lưu trên hệ thống.</p>
            <button type="button" onClick={() => void logout()} className="flex w-full items-center justify-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100"><LogOut className="h-3.5 w-3.5" /> Đăng xuất ngay</button>
          </Panel>
          </div>
        </div>
        </>
      )}
    </div>
  );
};
