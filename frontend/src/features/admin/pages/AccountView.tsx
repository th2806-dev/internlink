import { useState, useEffect, FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ProfileAuditPanel,
  ProfileCompletionCard,
  ProfileStudioHeader,
  type ProfileTabItem,
  type ProfileStudioTab,
} from "../../../components/common/ProfileStudio";
import { CompactToggleSwitch } from "../../../components/common/CompactToggleSwitch";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { formatDateTimeVi } from "../../../lib/formatDateTimeVi";
import { authService } from "../../../services/auth.service";
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
  Eye,
  EyeOff,
  Layers,
  Users,
  Building,
  GraduationCap,
  Image,
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
  bannerUrl?: string;
}

const DEFAULT_ADMIN_PROFILE: AdminProfileData = {
  fullName: "",
  adminCode: "",
  roleTitle: "",
  department: "",
  faculty: "",
  email: "",
  phone: "",
  office: "",
  address: "",
  bio: "",
  avatarUrl: "",
  bannerUrl: "",
};

const STORAGE_KEY = "internlink_admin_profile_standard";
const PREFERENCES_KEY = "internlink_admin_notification_preferences";

function NotificationToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-2.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-800">{title}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
      </div>
      <CompactToggleSwitch label={title} checked={checked} onChange={onChange} />
    </div>
  );
}

import type { ToastType } from "../../../contexts/ToastContext";
export const AccountView = ({
  onShowToast,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
}) => {
  const { user } = useAuth();
  const { isSuperAdmin, roleDisplayLabel } = useAdminCapabilities();
  const { selectedSemesterId, selectedDepartmentId } = useSemester();
  const {
    stats: navStats,
    isLoading: isNavStatsLoading,
  } = useAdminNavStats(true, selectedSemesterId, selectedDepartmentId);
  const hasLoadedNavStats = !isNavStatsLoading && !isSuperAdmin;

  const [activeTab, setActiveTab] = useState<ProfileStudioTab>("overview");

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
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [newBannerInput, setNewBannerInput] = useState(profile.bannerUrl || "");

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

  const accountUserId = user?.id ?? user?.username;
  const accountQuery = useQuery({
    queryKey: ["auth", "current-user", accountUserId],
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
    queryFn: () => authService.getMe(),
  });
  const adminTabs: ProfileTabItem<ProfileStudioTab>[] = [
    { id: "overview", label: "Tổng quan hồ sơ", icon: User },
    { id: "login-history", label: "Nhật ký đăng nhập & Thiết bị", icon: Laptop },
  ];

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
  }, [user, isEditing, isSuperAdmin]);

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

  const handleSaveBanner = () => {
    const bannerUrl = newBannerInput.trim();
    if (bannerUrl) {
      try {
        const parsedUrl = new URL(bannerUrl);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          throw new Error("Unsupported image URL protocol");
        }
      } catch {
        onShowToast("URL ảnh bìa không hợp lệ. Hãy dùng đường dẫn HTTP hoặc HTTPS.");
        return;
      }
    }

    const updated = { ...profile, bannerUrl };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      onShowToast("Không thể lưu ảnh bìa trên thiết bị này.");
      return;
    }
    setProfile(updated);
    setTempProfile(updated);
    setShowBannerModal(false);
    onShowToast(updated.bannerUrl ? "Đã cập nhật ảnh bìa hồ sơ." : "Đã khôi phục banner xanh mặc định.");
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
        return { label: "Khá mạnh", score: 3, color: "bg-[#026aa7]", text: "text-[#026aa7]" };
      case 4:
      default:
        return { label: "Rất mạnh", score: 4, color: "bg-[#7bc043]", text: "text-[#548a28]" };
    }
  };

  const passStrength = getPasswordStrength(newPassword);
  const notificationPreferences = [
    {
      title: "Email sự kiện quan trọng",
      description: "Thông báo sự kiện hệ thống và cảnh báo tiến độ.",
      checked: prefEmailNotif,
      onChange: (emailNotif: boolean) => {
        setPrefEmailNotif(emailNotif);
        savePreferences({ emailNotif, accountRequests: prefAccountRequests, reportDeadlines: prefReportDeadlines, weeklyDigest: prefWeeklyDigest });
      },
    },
    {
      title: "Cảnh báo cấp tài khoản mới",
      description: "Yêu cầu tài khoản từ Sinh viên hoặc Giảng viên.",
      checked: prefAccountRequests,
      onChange: (accountRequests: boolean) => {
        setPrefAccountRequests(accountRequests);
        savePreferences({ emailNotif: prefEmailNotif, accountRequests, reportDeadlines: prefReportDeadlines, weeklyDigest: prefWeeklyDigest });
      },
    },
    {
      title: "Nhắc hạn nộp báo cáo",
      description: "Nhắc trước hạn nộp và các mốc chốt điểm.",
      checked: prefReportDeadlines,
      onChange: (reportDeadlines: boolean) => {
        setPrefReportDeadlines(reportDeadlines);
        savePreferences({ emailNotif: prefEmailNotif, accountRequests: prefAccountRequests, reportDeadlines, weeklyDigest: prefWeeklyDigest });
      },
    },
    {
      title: "Thống kê tuần",
      description: "Tóm tắt tiến độ báo cáo và hoạt động giảng viên.",
      checked: prefWeeklyDigest,
      onChange: (weeklyDigest: boolean) => {
        setPrefWeeklyDigest(weeklyDigest);
        savePreferences({ emailNotif: prefEmailNotif, accountRequests: prefAccountRequests, reportDeadlines: prefReportDeadlines, weeklyDigest });
      },
    },
  ];

  return (
    <div className="w-full min-w-0 space-y-2 pb-12 font-sans">
      <ProfileStudioHeader
        name={profile.fullName || user?.name || roleDisplayLabel}
        identifier={profile.adminCode}
        role={profile.roleTitle || roleDisplayLabel}
        department={profile.department || profile.faculty}
        email={profile.email}
        bannerUrl={profile.bannerUrl}
        fullBleed
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={adminTabs}
        avatarAction={
          <button
            type="button"
            onClick={() => {
              setNewAvatarInput(profile.avatarUrl || "");
              setShowAvatarModal(true);
            }}
            className="absolute bottom-0 right-0 rounded-[4px] border-2 border-white bg-[#026aa7] p-2 text-white shadow-sm transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            title="Đổi ảnh đại diện"
            aria-label="Đổi ảnh đại diện"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
          </button>
        }
        bannerAction={
          <button
            type="button"
            onClick={() => {
              setNewBannerInput(profile.bannerUrl || "");
              setShowBannerModal(true);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-white/40 bg-slate-950/25 px-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-950/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Thay ảnh bìa hồ sơ"
          >
            <Image className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Đổi ảnh bìa</span>
          </button>
        }
      />
      {activeTab === "overview" ? (
      <div
        id="profile-panel-overview"
        role="tabpanel"
        aria-labelledby="profile-tab-overview"
        className="relative z-10 -mt-5 grid grid-cols-1 gap-3 lg:grid-cols-12"
      >
        {/* MAIN COLUMN (8 COLS) */}
        <div className="space-y-3 lg:col-span-8">
          {/* TAB 1: PROFILE TAB */}
          {activeTab === "overview" && (
            <section className="space-y-3 rounded-md border border-slate-200 bg-white p-3 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <User className="w-4 h-4 text-[#026aa7]" />
                    Thông tin Tài khoản &amp; Đơn vị Công tác
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
                    className="h-8 rounded-[4px] border border-[#026aa7]/20 bg-[#026aa7]/5 px-2.5 text-xs font-semibold text-[#026aa7] transition-colors hover:bg-[#026aa7]/10"
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
                    className="h-8 rounded-[4px] bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Hủy bỏ
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                        className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#026aa7]"
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
                        className="h-8 w-full cursor-not-allowed rounded-[4px] border border-slate-200 bg-slate-100 px-2.5 font-mono text-xs font-semibold text-[#026aa7]"
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
                        className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#026aa7]"
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
                        className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#026aa7]"
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
                        className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#026aa7]"
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
                        className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#026aa7]"
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
                        className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#026aa7]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Văn phòng làm việc
                      </label>
                      <input
                        type="text"
                        value={tempProfile.office}
                        onChange={(e) =>
                          setTempProfile({ ...tempProfile, office: e.target.value })
                        }
                        className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#026aa7]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                        Địa chỉ làm việc
                      </label>
                      <input
                        type="text"
                        value={tempProfile.address}
                        onChange={(e) =>
                          setTempProfile({ ...tempProfile, address: e.target.value })
                        }
                        className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#026aa7]"
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
                        className="w-full resize-y rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#026aa7]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="h-8 rounded-[4px] bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white shadow-xs hover:bg-[#025a8e]"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu thông tin hồ sơ</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <span className="block text-[11px] font-semibold text-slate-500">
                        Họ và tên
                      </span>
                      <p className="text-xs font-semibold text-slate-900">{profile.fullName || "Chưa cập nhật"}</p>
                    </div>

                    <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <span className="block text-[11px] font-semibold text-slate-500">
                        Tên đăng nhập / Mã AD
                      </span>
                      <p className="font-mono text-xs font-semibold text-[#026aa7]">{user?.username || "—"} / {profile.adminCode || "—"}</p>
                    </div>

                    <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <span className="block text-[11px] font-semibold text-slate-500">
                        Chức danh / Vai trò
                      </span>
                      <p className="text-xs font-medium text-slate-800">{profile.roleTitle || roleDisplayLabel}</p>
                    </div>

                    <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <span className="block text-[11px] font-semibold text-slate-500">
                        Khoa / Viện chủ quản
                      </span>
                      <p className="text-xs font-medium text-slate-800">{profile.faculty || "Chưa cập nhật"}</p>
                    </div>

                    <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <span className="block text-[11px] font-semibold text-slate-500">
                        Email công vụ
                      </span>
                      <p className="break-all text-xs font-medium text-slate-800">{profile.email || "Chưa cập nhật"}</p>
                    </div>

                    <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <span className="block text-[11px] font-semibold text-slate-500">
                        Số điện thoại liên hệ
                      </span>
                      <p className="text-xs font-medium text-slate-800">{profile.phone || "Chưa cập nhật"}</p>
                    </div>

                    <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <span className="block text-[11px] font-semibold text-slate-500">
                        Đơn vị / Ban chuyên trách
                      </span>
                      <p className="text-xs font-medium text-slate-800">{profile.department || "Chưa cập nhật"}</p>
                    </div>

                    <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <span className="block text-[11px] font-semibold text-slate-500">
                        Văn phòng làm việc
                      </span>
                      <p className="text-xs font-medium text-slate-800">{profile.office || "Chưa cập nhật"}</p>
                    </div>
                    <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <span className="block text-[11px] font-semibold text-slate-500">Địa chỉ làm việc</span>
                      <p className="text-xs font-medium text-slate-800">{profile.address || "Chưa cập nhật"}</p>
                    </div>
                    <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <span className="block text-[11px] font-semibold text-slate-500">Trạng thái</span>
                      <p className={`mt-0.5 inline-flex items-center gap-1.5 rounded-[3px] px-1.5 py-0.5 text-xs font-semibold ${accountQuery.data?.isActive ? "bg-[#7bc043]/15 text-[#385d1b]" : "bg-slate-100 text-slate-600"}`}>
                        <span className={`h-2 w-2 rounded-[2px] ${accountQuery.data?.isActive ? "bg-[#7bc043]" : "bg-slate-400"}`} aria-hidden="true" />
                        {accountQuery.isPending ? "Đang tải…" : accountQuery.error ? "Không thể tải trạng thái" : accountQuery.data?.isActive ? "Hoạt động" : "Đã khóa"}
                      </p>
                    </div>
                    <div className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <span className="block text-[11px] font-semibold text-slate-500">Ngày tạo tài khoản</span>
                      <p className="text-xs font-medium text-slate-800">
                        {accountQuery.data?.createdAt ? formatDateTimeVi(accountQuery.data.createdAt) : accountQuery.error ? "Không thể tải ngày tạo" : "Chưa có dữ liệu"}
                      </p>
                    </div>
                  </div>

                  {profile.bio && (
                    <div className="rounded-md border border-[#026aa7]/15 bg-[#026aa7]/5 p-2.5">
                      <span className="mb-1 block text-[11px] font-semibold text-[#005082]">
                        Ghi chú phạm vi phụ trách:
                      </span>
                      <p className="text-slate-700 font-medium leading-relaxed">
                        {profile.bio}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* TAB 2: SECURITY & PASSWORD TAB */}
          {activeTab === "overview" && (
            <div className="space-y-3">
              {/* Change Password Card */}
              <section className="space-y-3 rounded-md border border-slate-200 bg-white p-3 shadow-md">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <KeyRound className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
                  <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Bảo mật &amp; Đổi mật khẩu
                    </h2>
                  <p className="text-[11px] text-slate-500">
                    Dùng mật khẩu mạnh và không chia sẻ thông tin đăng nhập.
                    </p>
                  </div>
                </div>

              <form onSubmit={handleChangePassword} className="grid max-w-3xl grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
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
                        className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 pr-9 text-xs outline-none focus:bg-white focus:border-[#026aa7]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        aria-label={`${showCurrentPassword ? "Ẩn" : "Hiện"} mật khẩu hiện tại`}
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
                        className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 pr-9 text-xs outline-none focus:bg-white focus:border-[#026aa7]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={`${showNewPassword ? "Ẩn" : "Hiện"} mật khẩu mới`}
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
                        <div className="h-1.5 w-full overflow-hidden rounded-[2px] bg-slate-100" role="meter" aria-label="Độ mạnh mật khẩu" aria-valuemin={0} aria-valuemax={4} aria-valuenow={passStrength.score}>
                          <div
                            className={`h-full rounded-[2px] transition-[width] motion-reduce:transition-none ${passStrength.color}`}
                            style={{ width: `${passStrength.score * 25}%` }}
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
                        className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 pr-9 text-xs outline-none focus:bg-white focus:border-[#026aa7]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={`${showConfirmPassword ? "Ẩn" : "Hiện"} xác nhận mật khẩu mới`}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1 sm:col-span-2">
                    <button
                      type="submit"
                      disabled={isChangingPass}
                      className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#025a8e] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{isChangingPass ? "Đang cập nhật…" : "Cập nhật mật khẩu"}</span>
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}

        </div>

        <aside className="space-y-3 lg:col-span-4">
          <ProfileCompletionCard
            title="Mức độ hoàn thiện hồ sơ"
            items={[
              { label: "Đã cập nhật họ tên", complete: Boolean(profile.fullName.trim()) },
              { label: "Đã có email công vụ", complete: Boolean(profile.email.trim()) },
              { label: "Đã có số điện thoại", complete: Boolean(profile.phone.trim()) },
              { label: "Đã xác định đơn vị quản lý", complete: Boolean(profile.department.trim() || profile.faculty.trim()) },
            ]}
          />

          <section className="space-y-2 rounded-md border border-slate-200 bg-white p-3 shadow-md">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Bell className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
              Tùy chỉnh Nhận thông báo
            </h2>
            {notificationPreferences.map((preference) => (
              <NotificationToggle key={preference.title} {...preference} />
            ))}
          </section>

          <section className="space-y-2 rounded-md border border-slate-200 bg-white p-3 text-xs shadow-md">
            <h2 className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
              <Layers className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
              Phạm vi &amp; Quyền hạn Quản trị
            </h2>

            {!isSuperAdmin && <div className="space-y-1.5">
              <div className="flex items-center justify-between rounded-[4px] border border-[#7bc043]/30 bg-[#7bc043]/10 px-2.5 py-1.5">
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="h-4 w-4 text-[#548a28]" aria-hidden="true" />
                  <span className="font-medium text-slate-700">Tổng sinh viên quản lý</span>
                </div>
                <span className="font-bold text-slate-900">
                  {!isSuperAdmin && hasLoadedNavStats ? `${navStats.studentCount.toLocaleString("vi-VN")} SV` : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-[4px] border border-[#026aa7]/20 bg-[#026aa7]/5 px-2.5 py-1.5">
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
                  <span className="font-medium text-slate-700">Giảng viên hướng dẫn</span>
                </div>
                <span className="font-bold text-[#026aa7]">
                  {!isSuperAdmin && hasLoadedNavStats ? `${navStats.lecturerCount} Giảng viên` : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-[4px] border border-amber-100 bg-amber-50/60 px-2.5 py-1.5">
                <div className="flex items-center gap-2.5">
                  <Building className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  <span className="font-medium text-slate-700">Doanh nghiệp liên kết</span>
                </div>
                <span className="font-bold text-amber-900">
                  {!isSuperAdmin && hasLoadedNavStats ? `${navStats.companyCount} Đối tác` : "—"}
                </span>
              </div>
            </div>}

            {isSuperAdmin ? (
              <ul className="space-y-1.5 pt-1 text-[11px] font-medium text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7bc043]" />
                  <span>Quản trị toàn bộ hệ thống &amp; cấu hình danh mục các Khoa</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7bc043]" />
                  <span>Quản lý &amp; phân quyền tài khoản Quản trị khoa</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7bc043]" />
                  <span>Xem tổng quan dữ liệu và tiến độ thực tập toàn trường (Chế độ chỉ xem)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7bc043]" />
                  <span>Cấu hình tham số hệ thống &amp; tiếp nhận yêu cầu cấp tài khoản</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7bc043]" />
                  <span>Xuất dữ liệu thống kê tổng hợp toàn trường</span>
                </li>
              </ul>
            ) : (
              <ul className="space-y-1.5 pt-1 text-[11px] font-medium text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7bc043]" />
                  <span>Toàn quyền tạo, cấu hình &amp; chốt đợt thực tập của Khoa</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7bc043]" />
                  <span>Phân công Giảng viên phụ trách nhóm sinh viên trong Khoa</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7bc043]" />
                  <span>Quản lý danh sách sinh viên, giảng viên và doanh nghiệp liên kết</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7bc043]" />
                  <span>Cấp và quản lý tài khoản sinh viên / giảng viên trong Khoa</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7bc043]" />
                  <span>Xuất bảng điểm tổng kết và lưu trữ hồ sơ Khoa</span>
                </li>
              </ul>
            )}
          </section>
        </aside>
      </div>
      ) : (
        <ProfileAuditPanel tab={activeTab} userId={accountUserId} />
      )}

      {/* AVATAR MODAL */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md space-y-4 rounded-md border border-slate-200 bg-white p-6 text-xs shadow-xl">
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
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-[#026aa7]"
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
                className="px-4 py-2 bg-[#026aa7] hover:bg-[#025a8e] text-white font-bold rounded-md shadow-xs"
              >
                Lưu ảnh đại diện
              </button>
            </div>
          </div>
        </div>
      )}

      {showBannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-banner-dialog-title"
            className="w-full max-w-lg space-y-4 rounded-md border border-slate-200 bg-white p-5 text-xs shadow-xl"
          >
            <div>
              <h2 id="profile-banner-dialog-title" className="text-sm font-bold text-slate-900">
                Thay ảnh bìa hồ sơ
              </h2>
              <p className="mt-1 text-slate-600">
                Dán đường dẫn ảnh để cá nhân hóa banner. Để trống để dùng nền xanh TKS mặc định.
              </p>
            </div>
            <div className="relative h-28 overflow-hidden rounded-md bg-gradient-to-r from-[#026aa7] via-[#0277b5] to-[#025a8e]">
              {newBannerInput.trim() && (
                <img
                  key={newBannerInput.trim()}
                  src={newBannerInput.trim()}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.hidden = true;
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 to-transparent" />
              <p className="relative z-10 p-3 font-semibold text-white">Xem trước banner</p>
            </div>
            <div>
              <label htmlFor="profile-banner-url" className="mb-1 block font-semibold text-slate-700">
                URL ảnh bìa
              </label>
              <input
                id="profile-banner-url"
                type="url"
                value={newBannerInput}
                onChange={(event) => setNewBannerInput(event.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="h-9 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none focus:border-[#026aa7] focus:bg-white"
              />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setNewBannerInput("")}
                className="h-8 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Dùng nền xanh
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBannerModal(false)}
                  className="h-8 rounded-[4px] bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveBanner}
                  className="h-8 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e]"
                >
                  Lưu ảnh bìa
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

    </div>
  );
};

export default AccountView;
export { AccountView as AdminAccountView };
