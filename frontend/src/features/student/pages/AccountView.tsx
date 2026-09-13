import { useState, FormEvent, useEffect } from "react";
import {
  User,
  Mail,
  Lock,
  Save,
  Building2,
  GraduationCap,
  ShieldCheck,
  Edit3,
  Key,
  LogOut,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Briefcase,
  MapPin,
  Monitor,
  Tags,
  FileText,
  ExternalLink,
  Layers,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { PasswordStrengthMeter } from "../../../components/common/PasswordStrengthMeter";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { authService } from "../../../services/auth.service";
import { studentPortalService } from "../../../services/studentPortal.service";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import type { StudentProfile } from "../../../types/common";
import type { StudentPortalProfileDto } from "../../../types/api";

type PersonalInfo = {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  address: string;
  className: string;
  major: string;
};

type InternshipPrefs = {
  department: string;
  desiredPosition: string;
  alternativePosition: string;
  desiredLocation: string;
  workPreference: string;
  preferredIndustry: string;
  skills: string;
  resumeUrl: string;
};

const EMPTY_PREFS: InternshipPrefs = {
  department: "",
  desiredPosition: "",
  alternativePosition: "",
  desiredLocation: "",
  workPreference: "",
  preferredIndustry: "",
  skills: "",
  resumeUrl: "",
};

function buildPersonalInfo(
  profile: StudentProfile,
  portal?: StudentPortalProfileDto | null,
): PersonalInfo {
  const s = portal?.student;
  return {
    fullName: s?.fullName ?? profile.name ?? "—",
    studentId: s?.studentCode ?? profile.mssv ?? "—",
    email: s?.email ?? (profile.mssv ? `${profile.mssv}@student.edu.vn` : "—"),
    phone: s?.phone ?? "—",
    address: "Chưa cập nhật",
    className: s?.class ?? profile.class ?? "—",
    major: s?.major ?? profile.major ?? "—",
  };
}

function buildPrefs(portal?: StudentPortalProfileDto | null): InternshipPrefs {
  const s = portal?.student;
  return {
    department: s?.department ?? "",
    desiredPosition: s?.desiredPosition ?? "",
    alternativePosition: s?.alternativePosition ?? "",
    desiredLocation: s?.desiredLocation ?? "",
    workPreference: s?.workPreference ?? "",
    preferredIndustry: s?.preferredIndustry ?? "",
    skills: s?.skills ?? "",
    resumeUrl: s?.resumeUrl ?? "",
  };
}

export const AccountView = ({
  onShowToast,
  onLogout,
}: {
  onShowToast: (msg: string) => void;
  onNavigate?: (tab: string) => void;
  onLogout?: () => void;
}) => {
  const { profile, portalData, refresh } = useStudentPortal();
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>(() =>
    buildPersonalInfo(profile, portalData),
  );
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempPersonalInfo, setTempPersonalInfo] = useState<PersonalInfo>(() =>
    buildPersonalInfo(profile, portalData),
  );
  const [prefs, setPrefs] = useState<InternshipPrefs>(() => buildPrefs(portalData));
  const [tempPrefs, setTempPrefs] = useState<InternshipPrefs>(() => buildPrefs(portalData));
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    const base = buildPersonalInfo(profile, portalData);
    const p = buildPrefs(portalData);
    setPersonalInfo(base);
    setPrefs(p);
    if (!isEditingProfile) {
      setTempPersonalInfo(base);
      setTempPrefs(p);
    }
  }, [portalData, profile, isEditingProfile]);

  const handleSavePersonalInfo = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await studentPortalService.updateMe({
        fullName: tempPersonalInfo.fullName.trim(),
        email: tempPersonalInfo.email.trim() || undefined,
        phone: tempPersonalInfo.phone.trim() || undefined,
        department: tempPrefs.department.trim() || undefined,
        desiredPosition: tempPrefs.desiredPosition.trim() || undefined,
        alternativePosition: tempPrefs.alternativePosition.trim() || undefined,
        desiredLocation: tempPrefs.desiredLocation.trim() || undefined,
        workPreference: tempPrefs.workPreference.trim() || undefined,
        preferredIndustry: tempPrefs.preferredIndustry.trim() || undefined,
        skills: tempPrefs.skills.trim() || undefined,
        resumeUrl: tempPrefs.resumeUrl.trim() || undefined,
      });
      await refresh();
      setIsEditingProfile(false);
      onShowToast("Đã cập nhật thông tin tài khoản.");
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };
  const handleCancelPersonalInfo = () => {
    setTempPersonalInfo({ ...personalInfo });
    setIsEditingProfile(false);
    onShowToast("\u0110\xE3 h\u1EE7y ch\u1EC9nh s\u1EEDa th\xF4ng tin");
  };
  const handleChangePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (newPassword.length < 8) {
      setPasswordError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Xác nhận mật khẩu mới không khớp.");
      return;
    }

    setIsPasswordLoading(true);
    try {
      if (!currentPassword.trim()) {
        setPasswordError("Vui lòng nhập mật khẩu hiện tại.");
        return;
      }
      await authService.changePassword({
        currentPassword,
        newPassword,
      });
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onShowToast("Đã thay đổi mật khẩu thành công!");
    } catch (err) {
      setPasswordError(getApiErrorMessage(err));
    } finally {
      setIsPasswordLoading(false);
    }
  };
  return (
    <div className="space-y-5 animate-in fade-in duration-200 max-w-7xl mx-auto">
      <PageHeader
        icon={User}
        title="Thông tin Tài khoản"
        subtitle="Quản lý hồ sơ cá nhân, thông tin sinh viên và bảo mật mật khẩu tài khoản."
        badge={`MSSV: ${personalInfo.studentId}`}
        badgeColor="bg-blue-100 text-blue-800 border-blue-200"
        actions={[
          {
            label: "Chỉnh sửa hồ sơ",
            icon: Edit3,
            onClick: () => {
              setIsEditingProfile(true);
              setTempPersonalInfo({ ...personalInfo });
            },
            variant: "secondary",
          },
        ]}
      >
        <span className="px-2 py-0.5 font-semibold text-[10px] rounded-md border bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> {profile.statusBadge}
        </span>
        <button
          type="button"
          onClick={() => {
            if (onLogout) onLogout();
            else onShowToast("Đã đăng xuất tài khoản!");
          }}
          className="il-btn-press px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-md border border-rose-200 transition-all flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Đăng xuất</span>
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Panel className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-4">
                <InitialsAvatar
                  name={personalInfo.fullName}
                  seed={personalInfo.studentId}
                  size={56}
                  className="text-lg"
                />
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {personalInfo.fullName}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {personalInfo.major} · Lớp {personalInfo.className}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" /> {personalInfo.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(true);
                  setTempPersonalInfo({ ...personalInfo });
                }}
                className="il-btn il-btn-secondary text-xs self-start sm:self-center"
              >
                <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Doanh nghiệp
                  </p>
                  <p className="font-bold text-slate-800">
                    {profile.company}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Giảng viên HD
                  </p>
                  <p className="font-bold text-slate-800">
                    {profile.lecturerName}
                  </p>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" /> Hồ sơ cá nhân
              </h2>

              {!isEditingProfile ? (
                <button
                  onClick={() => {
                    setIsEditingProfile(true);
                    setTempPersonalInfo({ ...personalInfo });
                  }}
                  className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-md transition-colors flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
                </button>
              ) : (
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 font-bold text-[11px] rounded-lg border border-amber-200">
                  Đang chỉnh sửa
                </span>
              )}
            </div>

            <form onSubmit={handleSavePersonalInfo} className="space-y-4">
              {/* EDITABLE CONTACT FIELDS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" /> Thông tin liên hệ
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Họ và tên *
                    </label>
                    <input
                      type="text"
                      value={
                        isEditingProfile
                          ? tempPersonalInfo.fullName
                          : personalInfo.fullName
                      }
                      onChange={(e) =>
                        setTempPersonalInfo({
                          ...tempPersonalInfo,
                          fullName: e.target.value,
                        })
                      }
                      disabled={!isEditingProfile}
                      required
                      className={`w-full px-3.5 py-2 rounded-md border font-bold outline-none transition-all ${isEditingProfile ? "bg-white border-blue-400 focus:border-blue-600 text-slate-900 shadow-xs" : "bg-slate-50 border-slate-200/80 text-slate-900"}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Email sinh viên *
                    </label>
                    <input
                      type="email"
                      value={
                        isEditingProfile
                          ? tempPersonalInfo.email
                          : personalInfo.email
                      }
                      onChange={(e) =>
                        setTempPersonalInfo({
                          ...tempPersonalInfo,
                          email: e.target.value,
                        })
                      }
                      disabled={!isEditingProfile}
                      required
                      className={`w-full px-3.5 py-2 rounded-md border font-bold outline-none transition-all ${isEditingProfile ? "bg-white border-blue-400 focus:border-blue-600 text-slate-900 shadow-xs" : "bg-slate-50 border-slate-200/80 text-slate-900"}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Số điện thoại *
                    </label>
                    <input
                      type="text"
                      value={
                        isEditingProfile
                          ? tempPersonalInfo.phone
                          : personalInfo.phone
                      }
                      onChange={(e) =>
                        setTempPersonalInfo({
                          ...tempPersonalInfo,
                          phone: e.target.value,
                        })
                      }
                      disabled={!isEditingProfile}
                      required
                      className={`w-full px-3.5 py-2 rounded-md border font-bold outline-none transition-all ${isEditingProfile ? "bg-white border-blue-400 focus:border-blue-600 text-slate-900 shadow-xs" : "bg-slate-50 border-slate-200/80 text-slate-900"}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Địa chỉ liên hệ
                    </label>
                    <input
                      type="text"
                      value={personalInfo.address}
                      disabled
                      className="w-full px-3.5 py-2 rounded-md border font-medium outline-none bg-slate-50 border-slate-200/80 text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* READ-ONLY ACADEMIC FIELDS */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Thông tin sinh
                  viên (Cố định)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-md border border-slate-200/80">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      MSSV
                    </p>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {personalInfo.studentId}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-md border border-slate-200/80">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Lớp
                    </p>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {personalInfo.className}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-md border border-slate-200/80">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Ngành học
                    </p>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {personalInfo.major}
                    </p>
                  </div>

                </div>
              </div>

              {/* INTERNSHIP PREFERENCES */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-600 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Nguyện vọng thực tập & Kỹ năng
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-400" /> Khoa
                    </label>
                    <input
                      type="text"
                      value={isEditingProfile ? tempPrefs.department : prefs.department}
                      onChange={(e) => setTempPrefs({ ...tempPrefs, department: e.target.value })}
                      disabled={!isEditingProfile}
                      placeholder="VD: Công nghệ thông tin"
                      className={`w-full px-3.5 py-2 rounded-md border font-medium outline-none transition-all ${isEditingProfile ? "bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs" : "bg-slate-50 border-slate-200/80 text-slate-700"}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-blue-500" /> Vị trí mong muốn
                    </label>
                    <input
                      type="text"
                      value={isEditingProfile ? tempPrefs.desiredPosition : prefs.desiredPosition}
                      onChange={(e) => setTempPrefs({ ...tempPrefs, desiredPosition: e.target.value })}
                      disabled={!isEditingProfile}
                      placeholder="VD: Backend Developer, Data Analyst"
                      className={`w-full px-3.5 py-2 rounded-md border font-medium outline-none transition-all ${isEditingProfile ? "bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs" : "bg-slate-50 border-slate-200/80 text-slate-700"}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-amber-500" /> Vị trí thay thế
                    </label>
                    <input
                      type="text"
                      value={isEditingProfile ? tempPrefs.alternativePosition : prefs.alternativePosition}
                      onChange={(e) => setTempPrefs({ ...tempPrefs, alternativePosition: e.target.value })}
                      disabled={!isEditingProfile}
                      placeholder="VD: QA/Tester, DevOps"
                      className={`w-full px-3.5 py-2 rounded-md border font-medium outline-none transition-all ${isEditingProfile ? "bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs" : "bg-slate-50 border-slate-200/80 text-slate-700"}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Tags className="w-3 h-3 text-emerald-500" /> Kỹ năng chuyên môn
                    </label>
                    <input
                      type="text"
                      value={isEditingProfile ? tempPrefs.skills : prefs.skills}
                      onChange={(e) => setTempPrefs({ ...tempPrefs, skills: e.target.value })}
                      disabled={!isEditingProfile}
                      placeholder="VD: C#, .NET, SQL Server, React"
                      className={`w-full px-3.5 py-2 rounded-md border font-medium outline-none transition-all ${isEditingProfile ? "bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs" : "bg-slate-50 border-slate-200/80 text-slate-700"}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-500" /> Địa điểm mong muốn
                    </label>
                    <input
                      type="text"
                      value={isEditingProfile ? tempPrefs.desiredLocation : prefs.desiredLocation}
                      onChange={(e) => setTempPrefs({ ...tempPrefs, desiredLocation: e.target.value })}
                      disabled={!isEditingProfile}
                      placeholder="VD: Hà Nội, TP.HCM, Đà Nẵng"
                      className={`w-full px-3.5 py-2 rounded-md border font-medium outline-none transition-all ${isEditingProfile ? "bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs" : "bg-slate-50 border-slate-200/80 text-slate-700"}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Monitor className="w-3 h-3 text-indigo-500" /> Hình thức làm việc
                    </label>
                    {isEditingProfile ? (
                      <select
                        value={tempPrefs.workPreference}
                        onChange={(e) => setTempPrefs({ ...tempPrefs, workPreference: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-md border font-medium outline-none transition-all bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs"
                      >
                        <option value="">— Chọn —</option>
                        <option value="Onsite">Onsite</option>
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={prefs.workPreference || "Chưa chọn"}
                        disabled
                        className="w-full px-3.5 py-2 rounded-md border font-medium outline-none bg-slate-50 border-slate-200/80 text-slate-700"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-cyan-600" /> Lĩnh vực quan tâm
                    </label>
                    <input
                      type="text"
                      value={isEditingProfile ? tempPrefs.preferredIndustry : prefs.preferredIndustry}
                      onChange={(e) => setTempPrefs({ ...tempPrefs, preferredIndustry: e.target.value })}
                      disabled={!isEditingProfile}
                      placeholder="VD: Fintech, E-Commerce, AI"
                      className={`w-full px-3.5 py-2 rounded-md border font-medium outline-none transition-all ${isEditingProfile ? "bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs" : "bg-slate-50 border-slate-200/80 text-slate-700"}`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-orange-500" /> Link CV / Portfolio
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        value={isEditingProfile ? tempPrefs.resumeUrl : prefs.resumeUrl}
                        onChange={(e) => setTempPrefs({ ...tempPrefs, resumeUrl: e.target.value })}
                        disabled={!isEditingProfile}
                        placeholder="https://drive.google.com/..."
                        className={`flex-1 px-3.5 py-2 rounded-md border font-medium outline-none transition-all ${isEditingProfile ? "bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs" : "bg-slate-50 border-slate-200/80 text-slate-700"}`}
                      />
                      {(prefs.resumeUrl || tempPrefs.resumeUrl) && !isEditingProfile && (
                        <a
                          href={prefs.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md border border-blue-200 transition-colors flex items-center"
                          title="Mở CV"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Skill badges preview (read-only mode) */}
                {!isEditingProfile && prefs.skills && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {prefs.skills.split(/[,;]/).map((skill, i) => {
                      const s = skill.trim();
                      if (!s) return null;
                      return (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-full text-[10px] font-bold"
                        >
                          {s}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SAVE / CANCEL BUTTONS */}
              {isEditingProfile && (
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCancelPersonalInfo}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Hủy
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> Lưu thay đổi
                  </button>
                </div>
              )}
            </form>
          </Panel>
        </div>

        <div className="lg:col-span-1 space-y-5">
          <Panel className="space-y-4" id="change-password">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Bảo mật
            </h3>

            {passwordSaved && (
              <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Mật khẩu đã được cập nhật.
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3 text-xs border-t border-slate-100 pt-4">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-600" /> Đổi mật khẩu
              </p>

              {passwordError && (
                <div className="p-2.5 rounded-md border border-rose-200 bg-rose-50 text-rose-800 font-semibold flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                    Mật khẩu hiện tại *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mật khẩu mới *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Xác nhận mật khẩu mới *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <PasswordStrengthMeter
                password={newPassword}
                confirmPassword={confirmPassword}
              />

              <button
                type="submit"
                disabled={isPasswordLoading || newPassword.length < 8 || newPassword !== confirmPassword}
                className="il-btn il-btn-primary w-full justify-center py-2 disabled:opacity-60"
              >
                {isPasswordLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...
                  </>
                ) : (
                  "Cập nhật mật khẩu"
                )}
              </button>
            </form>
          </Panel>

          <Panel className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <LogOut className="w-4 h-4 text-rose-600" /> Đăng xuất hệ thống
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Đăng xuất phiên làm việc khỏi trình duyệt này. Tất cả dữ liệu báo
              cáo vẫn được lưu an toàn.
            </p>
            <button
              onClick={() => {
                if (onLogout) onLogout();
                else
                  onShowToast(
                    "\u0110\xE3 \u0111\u0103ng xu\u1EA5t t\xE0i kho\u1EA3n!",
                  );
              }}
              className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-md border border-rose-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Đăng xuất ngay
            </button>
          </Panel>
        </div>
      </div>

    </div>
  );
};

export { AccountView as StudentAccountView };
