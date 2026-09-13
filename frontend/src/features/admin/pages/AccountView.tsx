import { useState, useEffect, FormEvent } from "react";
import { PageHeader } from "../../../components/common/PageHeader";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { formatDateTimeVi } from "../../../lib/formatDateTimeVi";
import { authService } from "../../../services/auth.service";
import type { AuthActivityDto, AuthSessionDto } from "../../../types/api";
import { useAuth } from "../../../hooks/useAuth";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { useAdminNavStats } from "../../../hooks/useAdminNavStats";
import { useSemester } from "../../../contexts/SemesterContext";
import {
  User,
  Building2,
  ShieldCheck,
  Lock,
  KeyRound,
  Bell,
  Laptop,
  CheckCircle2,
  Camera,
  Save,
  Mail,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  Layers,
  History,
  Users,
  Building,
  GraduationCap,
  Calendar,
} from "lucide-react";

interface AdminProfileData {
  fullName: string;
  adminCode: string;
  roleTitle: string;
  department: string;
  faculty: string;
  email: string;
  phone: string;
  office: string;
  address: string;
  bio: string;
  avatarUrl?: string;
}

const DEFAULT_ADMIN_PROFILE: AdminProfileData = {
  fullName: "",
  adminCode: "",
  roleTitle: "Quản trị khoa",
  department: "",
  faculty: "Khoa Công nghệ Thông tin",
  email: "",
  phone: "",
  office: "",
  address: "",
  bio: "",
  avatarUrl: "",
};

const STORAGE_KEY = "internlink_admin_profile_standard";
const PREFERENCES_KEY = "internlink_admin_notification_preferences";

import type { ToastType } from "../../../contexts/ToastContext";
export const AccountView = ({
  onShowToast,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
}) => {
  const { user } = useAuth();
  const { isSuperAdmin, roleDisplayLabel } = useAdminCapabilities();
  const { selectedSemesterId, selectedDepartmentId } = useSemester();
  const { stats: navStats } = useAdminNavStats(true, selectedSemesterId, selectedDepartmentId);

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "preferences" | "activity">("profile");

  // Profile State
  const [profile, setProfile] = useState<AdminProfileData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_ADMIN_PROFILE, ...JSON.parse(saved) };
      const legacySaved = localStorage.getItem("internlink_admin_profile");
      if (legacySaved) {
        const parsed = JSON.parse(legacySaved);
        return {
          ...DEFAULT_ADMIN_PROFILE,
          fullName: parsed.fullName || DEFAULT_ADMIN_PROFILE.fullName,
          email: parsed.email || DEFAULT_ADMIN_PROFILE.email,
          phone: parsed.phone || DEFAULT_ADMIN_PROFILE.phone,
          department: parsed.department || DEFAULT_ADMIN_PROFILE.department,
          office: parsed.address || DEFAULT_ADMIN_PROFILE.office,
        };
      }
    } catch {
      /* fallback */
    }
    return DEFAULT_ADMIN_PROFILE;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [tempProfile, setTempProfile] = useState<AdminProfileData>(profile);

  // Avatar Modal
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [newAvatarInput, setNewAvatarInput] = useState(profile.avatarUrl || "");

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Notification Preferences State
  const [prefEmailNotif, setPrefEmailNotif] = useState(true);
  const [prefAccountRequests, setPrefAccountRequests] = useState(true);
  const [prefReportDeadlines, setPrefReportDeadlines] = useState(true);
  const [prefWeeklyDigest, setPrefWeeklyDigest] = useState(false);

  const [activeSessions, setActiveSessions] = useState<AuthSessionDto[]>([]);
  const [activityLogs, setActivityLogs] = useState<AuthActivityDto[]>([]);

  // Sync with user auth if available
  useEffect(() => {
    if (!user) return;
    const nextProfile = (prev: AdminProfileData): AdminProfileData => ({
      ...prev,
      fullName: user.name || prev.fullName,
      email: user.email || prev.email,
      roleTitle: isSuperAdmin ? "Quản trị hệ thống" : "Quản trị khoa",
      adminCode: user.id ? `AD-${user.id.slice(0, 6).toUpperCase()}` : prev.adminCode,
    });
    setProfile(nextProfile);
    if (!isEditing) setTempProfile(nextProfile);
  }, [user, isEditing]);

  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem(PREFERENCES_KEY);
      if (!savedPreferences) return;
      const preferences = JSON.parse(savedPreferences) as Partial<{
        emailNotif: boolean;
        accountRequests: boolean;
        reportDeadlines: boolean;
        weeklyDigest: boolean;
      }>;
      if (typeof preferences.emailNotif === "boolean") setPrefEmailNotif(preferences.emailNotif);
      if (typeof preferences.accountRequests === "boolean") setPrefAccountRequests(preferences.accountRequests);
      if (typeof preferences.reportDeadlines === "boolean") setPrefReportDeadlines(preferences.reportDeadlines);
      if (typeof preferences.weeklyDigest === "boolean") setPrefWeeklyDigest(preferences.weeklyDigest);
    } catch {
      localStorage.removeItem(PREFERENCES_KEY);
    }
  }, []);

  const savePreferences = (next: {
    emailNotif: boolean;
    accountRequests: boolean;
    reportDeadlines: boolean;
    weeklyDigest: boolean;
  }) => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
    onShowToast("Đã lưu tùy chọn thông báo trên thiết bị này.");
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([authService.getSessions(), authService.getActivity(30)])
      .then(([sessions, activity]) => {
        if (cancelled) return;
        setActiveSessions(sessions);
        setActivityLogs(activity);
      })
      .catch(() => {
        if (!cancelled) {
          setActiveSessions([]);
          setActivityLogs([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Save Profile Handler
  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    if (!tempProfile.fullName.trim()) {
      onShowToast("Họ và tên không được để trống.");
      return;
    }
    if (!tempProfile.email.trim()) {
      onShowToast("Email công vụ không được để trống.");
      return;
    }

    setProfile(tempProfile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tempProfile));
      localStorage.setItem("internlink_admin_profile", JSON.stringify(tempProfile));
    } catch {
      /* ignore */
    }
    setIsEditing(false);
    onShowToast(`Đã lưu cập nhật thông tin hồ sơ ${roleDisplayLabel} thành công!`);
  };

  // Avatar update
  const handleSaveAvatar = () => {
    const updated = { ...profile, avatarUrl: newAvatarInput.trim() };
    setProfile(updated);
    setTempProfile(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
    setShowAvatarModal(false);
    onShowToast(`Đã cập nhật ảnh đại diện ${roleDisplayLabel.toLowerCase()}.`);
  };

  // Password Change Handler
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      onShowToast("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (newPassword.length < 8) {
      onShowToast("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      onShowToast("Mật khẩu xác nhận không khớp với mật khẩu mới.");
      return;
    }

    setIsChangingPass(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onShowToast("Đổi mật khẩu tài khoản Quản trị thành công!");
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsChangingPass(false);
    }
  };

  // Helper for password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { label: "Chưa nhập", score: 0, color: "bg-slate-200", text: "text-slate-400" };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { label: "Yếu", score: 1, color: "bg-rose-500", text: "text-rose-600" };
      case 2:
        return { label: "Trung bình", score: 2, color: "bg-amber-500", text: "text-amber-600" };
      case 3:
        return { label: "Khá mạnh", score: 3, color: "bg-blue-500", text: "text-blue-600" };
      case 4:
      default:
        return { label: "Rất mạnh", score: 4, color: "bg-emerald-500", text: "text-emerald-600" };
    }
  };

  const passStrength = getPasswordStrength(newPassword);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto min-w-0 font-sans pb-12 animate-in fade-in">
      {/* 1. PAGE HEADER */}
      <PageHeader
        icon={User}
        title={
          isSuperAdmin
            ? "Quản lý Tài khoản & Hồ sơ Quản trị hệ thống"
            : "Quản lý Tài khoản & Hồ sơ Quản trị khoa"
        }
        subtitle={
          isSuperAdmin
            ? "Quản lý thông tin quản trị hệ thống, cập nhật bảo mật tài khoản và theo dõi lịch sử hoạt động toàn hệ thống."
            : "Quản lý thông tin quản trị khoa, cập nhật bảo mật tài khoản và theo dõi lịch sử hoạt động của khoa."
        }
      />

      {/* 2. ADMIN PROFILE HERO CARD */}
      <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar Container */}
          <div className="relative group shrink-0">
            <InitialsAvatar
              name={profile.fullName || roleDisplayLabel}
              seed={profile.email || profile.fullName}
              size={112}
              className="text-2xl sm:text-3xl ring-4 ring-blue-50"
            />
            <button
              type="button"
              onClick={() => {
                setNewAvatarInput(profile.avatarUrl || "");
                setShowAvatarModal(true);
              }}
              className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xs border-2 border-white transition-colors"
              title="Đổi ảnh đại diện"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Meta Info */}
          <div className="space-y-2 text-center md:text-left flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {profile.fullName}
              </h1>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 text-xs font-bold rounded-md border border-blue-200 font-mono">
                {profile.adminCode}
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-md border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {profile.roleTitle}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-y-1 gap-x-4 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1 text-slate-800 font-bold">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                {profile.faculty}
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="flex items-center gap-1 text-slate-600">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                {profile.department}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-600 pt-1 font-medium">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                {profile.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                {profile.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                {profile.office}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "profile"
              ? "border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-md"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Hồ sơ &amp; Thông tin Quản trị</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "security"
              ? "border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-md"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Tài khoản &amp; Đổi Mật khẩu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preferences")}
          className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "preferences"
              ? "border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-md"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Tùy chỉnh &amp; Thông báo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "activity"
              ? "border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-md"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Nhật ký Hoạt động (Audit Logs)</span>
        </button>
      </div>

      {/* 4. TAB CONTENTS & SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MAIN COLUMN (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          {/* TAB 1: PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Chi tiết Hồ sơ {roleDisplayLabel}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Thông tin hiển thị khi ban hành thông báo, phân công và trao đổi với Giảng viên / Sinh viên.
                  </p>
                </div>

                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTempProfile(profile);
                      setIsEditing(true);
                    }}
                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-md border border-blue-200 transition-colors"
                  >
                    Chỉnh sửa hồ sơ
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTempProfile(profile);
                      setIsEditing(false);
                    }}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors"
                  >
                    Hủy bỏ
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Họ và tên {roleDisplayLabel} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={tempProfile.fullName}
                        onChange={(e) =>
                          setTempProfile({ ...tempProfile, fullName: e.target.value })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Mã {roleDisplayLabel}
                      </label>
                      <input
                        type="text"
                        disabled
                        value={tempProfile.adminCode}
                        className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-md font-mono font-bold text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Chức vụ / Vai trò
                      </label>
                      <input
                        type="text"
                        value={tempProfile.roleTitle}
                        onChange={(e) =>
                          setTempProfile({ ...tempProfile, roleTitle: e.target.value })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Khoa / Viện chủ quản
                      </label>
                      <input
                        type="text"
                        value={tempProfile.faculty}
                        onChange={(e) =>
                          setTempProfile({ ...tempProfile, faculty: e.target.value })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Email công vụ liên hệ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={tempProfile.email}
                        onChange={(e) =>
                          setTempProfile({ ...tempProfile, email: e.target.value })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Số điện thoại liên hệ
                      </label>
                      <input
                        type="text"
                        value={tempProfile.phone}
                        onChange={(e) =>
                          setTempProfile({ ...tempProfile, phone: e.target.value })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Đơn vị / Ban chuyên trách
                      </label>
                      <input
                        type="text"
                        value={tempProfile.department}
                        onChange={(e) =>
                          setTempProfile({ ...tempProfile, department: e.target.value })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Văn phòng / Địa chỉ làm việc
                      </label>
                      <input
                        type="text"
                        value={tempProfile.office}
                        onChange={(e) =>
                          setTempProfile({ ...tempProfile, office: e.target.value })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Ghi chú nhiệm vụ &amp; Phạm vi phụ trách
                      </label>
                      <textarea
                        rows={3}
                        value={tempProfile.bio}
                        onChange={(e) =>
                          setTempProfile({ ...tempProfile, bio: e.target.value })
                        }
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500 resize-y leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-xs flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu thông tin hồ sơ</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Họ và tên
                      </span>
                      <p className="font-bold text-slate-900">{profile.fullName}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Mã {roleDisplayLabel}
                      </span>
                      <p className="font-mono font-bold text-blue-700">{profile.adminCode}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Chức danh / Vai trò
                      </span>
                      <p className="font-bold text-slate-900">{profile.roleTitle}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Khoa / Viện chủ quản
                      </span>
                      <p className="font-bold text-slate-900">{profile.faculty}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Email công vụ
                      </span>
                      <p className="font-medium text-slate-900">{profile.email}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Số điện thoại liên hệ
                      </span>
                      <p className="font-medium text-slate-900">{profile.phone}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100 sm:col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Đơn vị / Ban chuyên trách
                      </span>
                      <p className="font-medium text-slate-900">{profile.department}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-md border border-slate-100 sm:col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Văn phòng làm việc
                      </span>
                      <p className="font-medium text-slate-900">{profile.office}</p>
                    </div>
                  </div>

                  {profile.bio && (
                    <div className="p-3.5 bg-blue-50/50 rounded-md border border-blue-100">
                      <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block mb-1">
                        Ghi chú phạm vi phụ trách:
                      </span>
                      <p className="text-slate-700 font-medium leading-relaxed">
                        {profile.bio}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SECURITY & PASSWORD TAB */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Change Password Card */}
              <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Đổi Mật khẩu Tài khoản Quản trị
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Để đảm bảo an toàn hệ thống, vui lòng sử dụng mật khẩu mạnh có chữ hoa, số và ký tự đặc biệt.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4 text-xs max-w-lg">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Mật khẩu hiện tại <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Nhập mật khẩu hiện đang sử dụng..."
                        className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Mật khẩu mới <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 8 ký tự..."
                        className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password strength indicator */}
                    {newPassword && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Độ mạnh mật khẩu:</span>
                          <span className={`font-bold ${passStrength.text}`}>
                            {passStrength.label}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              passStrength.score >= 1 ? passStrength.color : "bg-transparent"
                            } ${
                              passStrength.score === 1
                                ? "w-1/4"
                                : passStrength.score === 2
                                ? "w-2/4"
                                : passStrength.score === 3
                                ? "w-3/4"
                                : "w-full"
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới..."
                        className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isChangingPass}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{isChangingPass ? "Đang cập nhật..." : "Cập nhật mật khẩu mới"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Sessions Card */}
              <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Phiên Đăng nhập &amp; Thiết bị Hoạt động
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Danh sách các thiết bị đang duy trì phiên đăng nhập vào tài khoản quản trị.
                      </p>
                    </div>
                  </div>

                </div>

                <div className="space-y-2.5 text-xs max-h-80 overflow-y-auto pr-1">
                  {activeSessions.length === 0 ? (
                    <div className="py-6 text-center border border-dashed border-slate-200 rounded-md text-slate-500">
                      <Laptop className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                      <p className="font-semibold">Chưa có dữ liệu phiên đăng nhập.</p>
                      <p className="text-[11px] mt-1">Tính năng quản lý phiên sẽ khả dụng khi hệ thống cung cấp dữ liệu thiết bị.</p>
                    </div>
                  ) : activeSessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3 bg-slate-50 rounded-md border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Laptop className="w-4 h-4 text-slate-600" />
                          <span className="font-bold text-slate-900">{sess.device}</span>
                          {sess.isCurrent && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">
                              Phiên hiện tại
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {sess.browser} • Địa chỉ IP: <span className="font-mono font-bold text-slate-700">{sess.ip}</span> • {sess.location}
                        </p>
                      </div>

                      <span className="text-[11px] text-slate-500 font-medium">
                        {formatDateTimeVi(sess.lastActive)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES TAB */}
          {activeTab === "preferences" && (
            <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-md">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Tùy chỉnh Thông báo Quản trị
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Chọn các kênh và sự kiện hệ thống bạn muốn nhận thông báo.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-md border border-slate-200/60 cursor-pointer hover:bg-slate-100/60 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900">
                      Thông báo qua Email khi có sự kiện quan trọng
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Nhận email thông báo khi phát hành thông báo toàn hệ thống hoặc có cảnh báo tiến độ.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefEmailNotif}
                    onChange={(e) => {
                      const emailNotif = e.target.checked;
                      setPrefEmailNotif(emailNotif);
                      savePreferences({ emailNotif, accountRequests: prefAccountRequests, reportDeadlines: prefReportDeadlines, weeklyDigest: prefWeeklyDigest });
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-md border border-slate-200/60 cursor-pointer hover:bg-slate-100/60 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900">
                      Yêu cầu Cấp tài khoản mới từ Sinh viên / Giảng viên
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Hiển thị cảnh báo trực quan khi có hồ sơ đăng ký tài khoản mới chờ phê duyệt.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefAccountRequests}
                    onChange={(e) => {
                      const accountRequests = e.target.checked;
                      setPrefAccountRequests(accountRequests);
                      savePreferences({ emailNotif: prefEmailNotif, accountRequests, reportDeadlines: prefReportDeadlines, weeklyDigest: prefWeeklyDigest });
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-md border border-slate-200/60 cursor-pointer hover:bg-slate-100/60 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900">
                      Nhắc hạn nộp Báo cáo &amp; Chốt điểm học kỳ
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Nhận thông báo nhắc nhở 48h trước các mốc hạn nộp báo cáo thực tập tuần hoặc chấm điểm hội đồng.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefReportDeadlines}
                    onChange={(e) => {
                      const reportDeadlines = e.target.checked;
                      setPrefReportDeadlines(reportDeadlines);
                      savePreferences({ emailNotif: prefEmailNotif, accountRequests: prefAccountRequests, reportDeadlines, weeklyDigest: prefWeeklyDigest });
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-md border border-slate-200/60 cursor-pointer hover:bg-slate-100/60 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900">
                      Tổng hợp Báo cáo Thống kê Hàng tuần
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Gửi email tóm tắt số liệu tiến độ nộp báo cáo của sinh viên và hoạt động của giảng viên mỗi sáng Thứ Hai.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefWeeklyDigest}
                    onChange={(e) => {
                      const weeklyDigest = e.target.checked;
                      setPrefWeeklyDigest(weeklyDigest);
                      savePreferences({ emailNotif: prefEmailNotif, accountRequests: prefAccountRequests, reportDeadlines: prefReportDeadlines, weeklyDigest });
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVITY LOGS TAB */}
          {activeTab === "activity" && (
            <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-md">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Nhật ký Hoạt động Quản trị (Audit Logs)
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Ghi nhận các thao tác quan trọng được thực hiện bởi tài khoản này trong 30 ngày qua.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs max-h-80 overflow-y-auto pr-1">
                  {activityLogs.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-slate-200 rounded-md text-slate-500">
                      <History className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                      <p className="font-semibold">Chưa có nhật ký hoạt động.</p>
                      <p className="text-[11px] mt-1">Audit log sẽ hiển thị khi backend cung cấp dữ liệu cho tài khoản này.</p>
                    </div>
                  ) : activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-slate-50 rounded-md border border-slate-100 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-100"
                        >
                          {log.module}
                        </span>
                        <p className="font-bold text-slate-900">{log.action}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Địa chỉ IP: <span className="font-mono">{log.ip || "Không xác định"}</span>
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium shrink-0">
                      {formatDateTimeVi(log.time)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR COLUMN (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          {/* SCOPE OF MANAGEMENT CARD */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Layers className="w-4 h-4 text-blue-600" />
              Tổng quan Phạm vi Quản lý
            </h3>

            <div className="space-y-2.5">
              <div className="p-3 bg-blue-50/60 rounded-md border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-slate-700">Đợt thực tập hiện hành</span>
                </div>
                <span className="font-bold text-blue-900">1 đợt chính</span>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-md border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-slate-700">Tổng sinh viên quản lý</span>
                </div>
                <span className="font-bold text-emerald-900">
                  {navStats?.studentCount?.toLocaleString("vi-VN") || "0"} SV
                </span>
              </div>

              <div className="p-3 bg-purple-50/60 rounded-md border border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-slate-700">Giảng viên hướng dẫn</span>
                </div>
                <span className="font-bold text-purple-900">
                  {navStats?.lecturerCount || 0} Giảng viên
                </span>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-md border border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-slate-700">Doanh nghiệp liên kết</span>
                </div>
                <span className="font-bold text-amber-900">
                  {navStats?.companyCount || 0} Đối tác
                </span>
              </div>
            </div>
          </div>

          {/* ADMIN PRIVILEGES CARD */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs p-5 space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Quyền hạn {roleDisplayLabel} (Privileges)
            </h3>

            {isSuperAdmin ? (
              <ul className="space-y-2 text-slate-600 font-medium">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Quản trị toàn bộ hệ thống &amp; cấu hình danh mục các Khoa</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Quản lý &amp; phân quyền tài khoản Quản trị khoa</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Xem tổng quan dữ liệu và tiến độ thực tập toàn trường (Chế độ chỉ xem)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Cấu hình tham số hệ thống &amp; tiếp nhận yêu cầu cấp tài khoản</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Xuất dữ liệu thống kê tổng hợp toàn trường</span>
                </li>
              </ul>
            ) : (
              <ul className="space-y-2 text-slate-600 font-medium">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Toàn quyền tạo, cấu hình &amp; chốt đợt thực tập của Khoa</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Phân công Giảng viên phụ trách nhóm sinh viên trong Khoa</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Quản lý danh sách sinh viên, giảng viên và doanh nghiệp liên kết</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Cấp và quản lý tài khoản sinh viên / giảng viên trong Khoa</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Xuất bảng điểm tổng kết và lưu trữ hồ sơ Khoa</span>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* AVATAR MODAL */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs">
            <h3 className="text-base font-bold text-slate-900">
              Cập nhật Ảnh đại diện {roleDisplayLabel}
            </h3>
            <p className="text-slate-500 font-medium">
              Nhập liên kết (URL) hình ảnh đại diện của bạn:
            </p>
            <input
              type="url"
              value={newAvatarInput}
              onChange={(e) => setNewAvatarInput(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAvatar}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-xs"
              >
                Lưu ảnh đại diện
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AccountView;
export { AccountView as AdminAccountView };
