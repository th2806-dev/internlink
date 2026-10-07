import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  Briefcase,
  Building2,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Key,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Save,
  ShieldCheck,
  Tags,
  User,
  X,
} from "lucide-react";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { PasswordStrengthMeter } from "../../../components/common/PasswordStrengthMeter";
import { useSemester } from "../../../contexts/SemesterContext";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { authService } from "../../../services/auth.service";
import { studentPortalService } from "../../../services/studentPortal.service";
import type { StudentPortalProfileDto } from "../../../types/api";
import type { StudentProfile } from "../../../types/common";
import { StudentSubPageHeader } from "../components/StudentSubPageHeader";

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
  onShowToast?: (msg: string) => void;
  onNavigate?: (tab: string) => void;
  onLogout?: () => void;
}) => {
  const { profile, portalData, refresh } = useStudentPortal();
  const { selectedSemester } = useSemester();

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>(() =>
    buildPersonalInfo(profile, portalData),
  );
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [tempPersonalInfo, setTempPersonalInfo] = useState<PersonalInfo>(() =>
    buildPersonalInfo(profile, portalData),
  );
  const [prefs, setPrefs] = useState<InternshipPrefs>(() =>
    buildPrefs(portalData),
  );
  const [tempPrefs, setTempPrefs] = useState<InternshipPrefs>(() =>
    buildPrefs(portalData),
  );

  // Đổi mật khẩu states
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      onShowToast?.("Đã làm mới thông tin tài khoản.");
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSavePersonalInfo = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
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
      onShowToast?.("Đã cập nhật thông tin tài khoản thành công!");
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelPersonalInfo = () => {
    setTempPersonalInfo({ ...personalInfo });
    setTempPrefs({ ...prefs });
    setIsEditingProfile(false);
    onShowToast?.("Đã hủy chỉnh sửa thông tin.");
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
      setPasswordError("Xác nhận mật khẩu mới không trùng khớp.");
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
      onShowToast?.("Đã thay đổi mật khẩu thành công!");
    } catch (err) {
      setPasswordError(getApiErrorMessage(err));
    } finally {
      setIsPasswordLoading(false);
    }
  };



  return (
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      {/* ═══════════════════════════════════════════════════════════════════
          1. TOP CARD BANNER (Chuẩn layout banner xanh #026aa7 + thông tin thực tế)
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <StudentSubPageHeader
          icon={User}
          title="Thông tin tài khoản & hồ sơ"
          subtitle="Cập nhật thông tin cá nhân và tùy chọn thực tập."
          semesterName={selectedSemester?.name}
          onRefresh={() => void handleRefresh()}
          isRefreshing={isRefreshing}
        >
          <button
            type="button"
            onClick={() => {
              if (onLogout) onLogout();
              else onShowToast?.("Đã đăng xuất tài khoản!");
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rose-200/70 bg-rose-500 px-3 text-xs font-semibold text-white transition-colors hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Đăng xuất</span>
          </button>
        </StudentSubPageHeader>


      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          2. MAIN CONTENT: 2 CỘT (HỒ SƠ CÁ NHÂN & BẢO MẬT/ĐỔI MẬT KHẨU)
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* CỘT TRÁI (2 CỘT): HỒ SƠ CHI TIẾT */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card thông tin hồ sơ & liên hệ */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
            {/* Top avatar summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-4">
                <InitialsAvatar
                  name={personalInfo.fullName}
                  seed={personalInfo.studentId}
                  size={58}
                  className="text-lg ring-4 ring-blue-50"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {personalInfo.fullName}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" />
                      {profile.statusBadge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {personalInfo.major} · Lớp {personalInfo.className}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {personalInfo.email}
                  </p>
                </div>
              </div>

              {!isEditingProfile ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(true);
                    setTempPersonalInfo({ ...personalInfo });
                    setTempPrefs({ ...prefs });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 hover:text-blue-700 self-start sm:self-center cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Chỉnh sửa hồ sơ</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 self-start sm:self-center">
                  <Edit3 className="w-3.5 h-3.5" /> Đang ở chế độ chỉnh sửa
                </span>
              )}
            </div>

            {/* 2 Card thông tin thực tập hiện tại */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100/70 text-blue-700">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Doanh nghiệp thực tập
                  </p>
                  <p className="font-bold text-slate-800 truncate mt-0.5">
                    {profile.company && profile.company !== "—"
                      ? profile.company
                      : "Chưa phân công"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100/70 text-emerald-700">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Giảng viên hướng dẫn
                  </p>
                  <p className="font-bold text-slate-800 truncate mt-0.5">
                    {profile.lecturerName && profile.lecturerName !== "—"
                      ? profile.lecturerName
                      : "Chưa phân công"}
                  </p>
                </div>
              </div>
            </div>

            {/* Form chi tiết thông tin */}
            <form onSubmit={handleSavePersonalInfo} className="space-y-5 pt-2">
              {/* PHẦN 1: THÔNG TIN LIÊN HỆ */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Thông tin liên hệ
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
                      className={`w-full px-3.5 py-2 rounded-lg border font-semibold outline-none transition-all ${
                        isEditingProfile
                          ? "bg-white border-blue-400 focus:border-blue-600 text-slate-900 shadow-xs"
                          : "bg-slate-50 border-slate-200/80 text-slate-800"
                      }`}
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
                      className={`w-full px-3.5 py-2 rounded-lg border font-semibold outline-none transition-all ${
                        isEditingProfile
                          ? "bg-white border-blue-400 focus:border-blue-600 text-slate-900 shadow-xs"
                          : "bg-slate-50 border-slate-200/80 text-slate-800"
                      }`}
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
                      placeholder="VD: 0912345678"
                      className={`w-full px-3.5 py-2 rounded-lg border font-semibold outline-none transition-all ${
                        isEditingProfile
                          ? "bg-white border-blue-400 focus:border-blue-600 text-slate-900 shadow-xs"
                          : "bg-slate-50 border-slate-200/80 text-slate-800"
                      }`}
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
                      className="w-full px-3.5 py-2 rounded-lg border font-medium outline-none bg-slate-50 border-slate-200/80 text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* PHẦN 2: THÔNG TIN HỌC TẬP (CỐ ĐỊNH TỪ HỆ THỐNG) */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Thông tin sinh viên (Cố định từ Nhà trường)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      MSSV
                    </p>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {personalInfo.studentId}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Lớp sinh hoạt
                    </p>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {personalInfo.className}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Ngành đào tạo
                    </p>
                    <p className="font-bold text-slate-900 mt-0.5 truncate">
                      {personalInfo.major}
                    </p>
                  </div>
                </div>
              </div>

              {/* PHẦN 3: NGUYỆN VỌNG THỰC TẬP & KỸ NĂNG */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-violet-700 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Nguyện vọng thực tập & Kỹ năng
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-400" /> Khoa / Viện
                    </label>
                    <input
                      type="text"
                      value={
                        isEditingProfile
                          ? tempPrefs.department
                          : prefs.department
                      }
                      onChange={(e) =>
                        setTempPrefs({
                          ...tempPrefs,
                          department: e.target.value,
                        })
                      }
                      disabled={!isEditingProfile}
                      placeholder="VD: Công nghệ thông tin"
                      className={`w-full px-3.5 py-2 rounded-lg border font-medium outline-none transition-all ${
                        isEditingProfile
                          ? "bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs"
                          : "bg-slate-50 border-slate-200/80 text-slate-700"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-blue-500" /> Vị trí mong muốn
                    </label>
                    <input
                      type="text"
                      value={
                        isEditingProfile
                          ? tempPrefs.desiredPosition
                          : prefs.desiredPosition
                      }
                      onChange={(e) =>
                        setTempPrefs({
                          ...tempPrefs,
                          desiredPosition: e.target.value,
                        })
                      }
                      disabled={!isEditingProfile}
                      placeholder="VD: Backend Developer, React Frontend"
                      className={`w-full px-3.5 py-2 rounded-lg border font-medium outline-none transition-all ${
                        isEditingProfile
                          ? "bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs"
                          : "bg-slate-50 border-slate-200/80 text-slate-700"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-amber-500" /> Vị trí thay thế
                    </label>
                    <input
                      type="text"
                      value={
                        isEditingProfile
                          ? tempPrefs.alternativePosition
                          : prefs.alternativePosition
                      }
                      onChange={(e) =>
                        setTempPrefs({
                          ...tempPrefs,
                          alternativePosition: e.target.value,
                        })
                      }
                      disabled={!isEditingProfile}
                      placeholder="VD: QA / Tester, Business Analyst"
                      className={`w-full px-3.5 py-2 rounded-lg border font-medium outline-none transition-all ${
                        isEditingProfile
                          ? "bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs"
                          : "bg-slate-50 border-slate-200/80 text-slate-700"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Tags className="w-3 h-3 text-emerald-500" /> Kỹ năng chuyên môn
                    </label>
                    <input
                      type="text"
                      value={isEditingProfile ? tempPrefs.skills : prefs.skills}
                      onChange={(e) =>
                        setTempPrefs({ ...tempPrefs, skills: e.target.value })
                      }
                      disabled={!isEditingProfile}
                      placeholder="VD: C#, .NET, SQL Server, React, Docker"
                      className={`w-full px-3.5 py-2 rounded-lg border font-medium outline-none transition-all ${
                        isEditingProfile
                          ? "bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs"
                          : "bg-slate-50 border-slate-200/80 text-slate-700"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-500" /> Địa điểm mong muốn
                    </label>
                    <input
                      type="text"
                      value={
                        isEditingProfile
                          ? tempPrefs.desiredLocation
                          : prefs.desiredLocation
                      }
                      onChange={(e) =>
                        setTempPrefs({
                          ...tempPrefs,
                          desiredLocation: e.target.value,
                        })
                      }
                      disabled={!isEditingProfile}
                      placeholder="VD: Hà Nội, TP.HCM, Đà Nẵng"
                      className={`w-full px-3.5 py-2 rounded-lg border font-medium outline-none transition-all ${
                        isEditingProfile
                          ? "bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs"
                          : "bg-slate-50 border-slate-200/80 text-slate-700"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Monitor className="w-3 h-3 text-indigo-500" /> Hình thức làm việc
                    </label>
                    {isEditingProfile ? (
                      <select
                        value={tempPrefs.workPreference}
                        onChange={(e) =>
                          setTempPrefs({
                            ...tempPrefs,
                            workPreference: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-lg border font-medium outline-none transition-all bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs"
                      >
                        <option value="">— Chọn hình thức —</option>
                        <option value="Onsite">Onsite (Tại văn phòng)</option>
                        <option value="Remote">Remote (Từ xa)</option>
                        <option value="Hybrid">Hybrid (Linh hoạt kết hợp)</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={prefs.workPreference || "Chưa chọn"}
                        disabled
                        className="w-full px-3.5 py-2 rounded-lg border font-medium outline-none bg-slate-50 border-slate-200/80 text-slate-700"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-cyan-600" /> Lĩnh vực quan tâm
                    </label>
                    <input
                      type="text"
                      value={
                        isEditingProfile
                          ? tempPrefs.preferredIndustry
                          : prefs.preferredIndustry
                      }
                      onChange={(e) =>
                        setTempPrefs({
                          ...tempPrefs,
                          preferredIndustry: e.target.value,
                        })
                      }
                      disabled={!isEditingProfile}
                      placeholder="VD: Fintech, E-Commerce, Logistics, EdTech"
                      className={`w-full px-3.5 py-2 rounded-lg border font-medium outline-none transition-all ${
                        isEditingProfile
                          ? "bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs"
                          : "bg-slate-50 border-slate-200/80 text-slate-700"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-orange-500" /> Link CV / Portfolio
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={
                          isEditingProfile
                            ? tempPrefs.resumeUrl
                            : prefs.resumeUrl
                        }
                        onChange={(e) =>
                          setTempPrefs({
                            ...tempPrefs,
                            resumeUrl: e.target.value,
                          })
                        }
                        disabled={!isEditingProfile}
                        placeholder="https://drive.google.com/..."
                        className={`flex-1 px-3.5 py-2 rounded-lg border font-medium outline-none transition-all ${
                          isEditingProfile
                            ? "bg-white border-violet-400 focus:border-violet-600 text-slate-900 shadow-xs"
                            : "bg-slate-50 border-slate-200/80 text-slate-700"
                        }`}
                      />
                      {(prefs.resumeUrl || tempPrefs.resumeUrl) && (
                        <a
                          href={isEditingProfile ? tempPrefs.resumeUrl : prefs.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-[#026aa7] rounded-lg border border-blue-200 transition-colors flex items-center"
                          title="Mở liên kết CV"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges preview kỹ năng khi ở chế độ xem */}
                {!isEditingProfile && prefs.skills && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">
                      Kỹ năng đã lưu:
                    </span>
                    {prefs.skills.split(/[,;]/).map((skill, i) => {
                      const s = skill.trim();
                      if (!s) return null;
                      return (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-full text-[10px] font-bold"
                        >
                          {s}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS: HỦY / LƯU */}
              {isEditingProfile && (
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCancelPersonalInfo}
                    disabled={isSavingProfile}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hủy chỉnh sửa</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#026aa7] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#025a8e] cursor-pointer disabled:opacity-60"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu thay đổi</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* CỘT PHẢI (1 CỘT): BẢO MẬT & ĐỔI MẬT KHẨU + PHIÊN LÀM VIỆC */}
        <div className="lg:col-span-1 space-y-5">
          {/* Card Đổi mật khẩu */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Bảo mật & Mật khẩu</span>
              </h3>
            </div>

            {passwordSaved && (
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Mật khẩu tài khoản đã được cập nhật thành công!</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            <form
              onSubmit={handleChangePasswordSubmit}
              className="space-y-3.5 text-xs"
            >
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
                    required
                    className="w-full pl-9 pr-9 py-2 bg-slate-50/70 border border-slate-200 rounded-lg font-medium outline-none focus:bg-white focus:border-[#026aa7]"
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
                    className="w-full pl-9 pr-9 py-2 bg-slate-50/70 border border-slate-200 rounded-lg font-medium outline-none focus:bg-white focus:border-[#026aa7]"
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
                    className="w-full pl-9 pr-9 py-2 bg-slate-50/70 border border-slate-200 rounded-lg font-medium outline-none focus:bg-white focus:border-[#026aa7]"
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

              {/* Đồng hồ đo độ mạnh mật khẩu */}
              <PasswordStrengthMeter
                password={newPassword}
                confirmPassword={confirmPassword}
              />

              <button
                type="submit"
                disabled={
                  isPasswordLoading ||
                  newPassword.length < 8 ||
                  newPassword !== confirmPassword
                }
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#026aa7] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#025a8e] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isPasswordLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5" />
                    <span>Cập nhật mật khẩu</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card Phiên đăng nhập & Đăng xuất */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Phiên làm việc</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Đăng xuất phiên làm việc hiện tại khỏi trình duyệt. Toàn bộ thông
              tin báo cáo và dữ liệu hồ sơ vẫn được lưu trữ bảo mật trên hệ thống.
            </p>
            <button
              type="button"
              onClick={() => {
                if (onLogout) onLogout();
                else onShowToast?.("Đã đăng xuất tài khoản!");
              }}
              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất khỏi hệ thống</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AccountView as StudentAccountView };
