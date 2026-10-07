import { useState, useEffect, useCallback } from "react";
import {
  Sliders,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  HardDrive,
  Save,
  RotateCcw,
  Send,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { adminEmailService } from "../../../services/adminEmail.service";
import {
  adminSettingsService,
  type AdminFacultySettings,
} from "../../../services/adminSettings.service";

type FacultySettings = AdminFacultySettings;

const EMPTY_FACULTY_SETTINGS: FacultySettings = {
  departmentName: "",
  supportEmail: "",
  phone: "",
  address: "",
  maxStudentsPerLecturer: 0,
  defaultReportDeadlineDay: "",
  maxFileSizeMb: 0,
  allowLateSubmission: false,
  autoLockSemesterEnd: false,
};

import type { ToastType } from "../../../contexts/ToastContext";
export const SettingsView = ({
  onShowToast,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
  onNavigateTab?: (tab: string) => void;
}) => {
  const [settings, setSettings] = useState<FacultySettings>(EMPTY_FACULTY_SETTINGS);

  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [settingsLoadError, setSettingsLoadError] = useState(false);
  const [savedSettings, setSavedSettings] = useState<FacultySettings>(EMPTY_FACULTY_SETTINGS);
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const loadSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    setSettingsLoadError(false);
    try {
      const data = await adminSettingsService.getSettings();
      setSettings(data);
      setSavedSettings(data);
    } catch {
      setSettingsLoadError(true);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings.departmentName.trim()) {
      onShowToast("Vui lòng nhập Tên Khoa / Đơn vị quản lý.");
      return;
    }
    if (!settings.supportEmail.trim()) {
      onShowToast("Vui lòng nhập Email hỗ trợ.");
      return;
    }
    if (settings.maxStudentsPerLecturer < 5 || settings.maxStudentsPerLecturer > 100) {
      onShowToast("Số sinh viên tối đa mỗi giảng viên phải từ 5 đến 100.");
      return;
    }
    if (settings.maxFileSizeMb < 5 || settings.maxFileSizeMb > 100) {
      onShowToast("Dung lượng tệp phải từ 5 đến 100 MB.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...settings,
        departmentName: settings.departmentName.trim(),
        supportEmail: settings.supportEmail.trim(),
        phone: settings.phone.trim(),
        address: settings.address.trim(),
      };
      const updated = await adminSettingsService.updateSettings(payload);
      setSettings(updated);
      setSavedSettings(updated);
      onShowToast("Đã lưu các thiết lập cài đặt thành công!");
    } catch (err) {
      onShowToast(`Không thể lưu cài đặt lên hệ thống. ${getApiErrorMessage(err)}`, "danger");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setIsSaving(true);
    try {
      
        const res = await adminSettingsService.resetSettings();
        setSettings(res);
        setSavedSettings(res);
      onShowToast("Đã khôi phục tất cả cài đặt về giá trị mặc định của Khoa.");
    } catch (err) {
      onShowToast(`Không thể khôi phục cài đặt mặc định. ${getApiErrorMessage(err)}`, "danger");
    } finally {
      setIsSaving(false);
      setShowResetConfirm(false);
    }
  };

  const handleTestEmail = async () => {
    const toEmail = settings.supportEmail.trim();
    if (!toEmail) {
      onShowToast("Vui lòng nhập email hỗ trợ trước khi gửi thử.");
      return;
    }
    
    setIsTestingEmail(true);
    try {
      await adminEmailService.testEmail({
        toEmail,
        fullName: "Quản trị khoa",
        role: "Lecturer",
      });
      onShowToast(`Đã gửi email kiểm tra kết nối tới ${toEmail}`);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1300px] min-w-0 space-y-4 pb-12 font-sans">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#026aa7] px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <Sliders className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-wide">Cài đặt hệ thống</h1>
              <p className="mt-0.5 text-xs text-white/80">
                Quản lý thông tin liên hệ và các tham số dùng chung cho nghiệp vụ thực tập
              </p>
            </div>
          </div>
        </div>
      </section>

      {settingsLoadError && (
        <div role="alert" className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
            <div>
              <p className="font-bold">Không thể tải cài đặt từ máy chủ</p>
              <p className="mt-0.5 text-rose-800">
                Dữ liệu cấu hình chưa được tải. Thử tải lại để xem và chỉnh sửa giá trị hiện tại.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadSettings()}
            disabled={isLoadingSettings}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-rose-300 bg-white px-3 font-semibold text-rose-800 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isLoadingSettings ? "animate-spin" : ""}`} aria-hidden="true" />
            Thử tải lại
          </button>
        </div>
      )}

      {isLoadingSettings && (
        <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-xs text-slate-500 shadow-2xs">
          Đang tải cài đặt hiện tại…
        </div>
      )}

      {!isLoadingSettings && !settingsLoadError && <form onSubmit={handleSave} className="space-y-4">
        <fieldset disabled={isLoadingSettings || isSaving} className="space-y-4 disabled:opacity-70">
        {/* SECTION 1: FACULTY CONTACT INFORMATION */}
        <div className="space-y-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs md:p-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="rounded-md bg-[#026aa7]/5 p-2 text-[#026aa7]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                1. Thông tin Liên hệ Khoa &amp; Ban Giám hiệu
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Thông tin xuất hiện trên các văn bản, thông báo và hỗ trợ sinh viên liên hệ.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tên Khoa / Đơn vị chủ quản <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={settings.departmentName}
                  onChange={(e) =>
                    setSettings({ ...settings, departmentName: e.target.value })
                  }
                  placeholder="Ví dụ: Khoa Công nghệ Thông tin"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 font-medium text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Số điện thoại / Hotline văn phòng Khoa
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) =>
                    setSettings({ ...settings, phone: e.target.value })
                  }
                  placeholder="Ví dụ: 0906891704"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 font-medium text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Email liên hệ hỗ trợ thực tập <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={settings.supportEmail}
                    onChange={(e) =>
                      setSettings({ ...settings, supportEmail: e.target.value })
                    }
                    placeholder="internlink.cntt@gmail.com"
                    className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 font-medium text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={isTestingEmail}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md border border-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                  title="Gửi email kiểm tra"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTestingEmail ? "Đang gửi..." : "Gửi thử"}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Địa chỉ văn phòng Khoa
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) =>
                    setSettings({ ...settings, address: e.target.value })
                  }
                  placeholder="Ví dụ: Tòa nhà A, 227 Nguyễn Văn Cừ, Q.5, TP.HCM"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 font-medium text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: INTERNSHIP RULES & PARAMETERS */}
        <div className="space-y-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs md:p-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="rounded-md bg-[#026aa7]/5 p-2 text-[#026aa7]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                2. Quy tắc Thực tập &amp; Hạn nộp Báo cáo
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Thiết lập hạn mức phân công giảng viên, thời hạn nộp bài và dung lượng tệp cho phép.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Số sinh viên tối đa / 1 Giảng viên
              </label>
              <div className="relative">
                <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={settings.maxStudentsPerLecturer}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxStudentsPerLecturer: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 font-bold text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Cảnh báo khi phân công vượt định mức.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Hạn nộp báo cáo tuần mặc định
              </label>
              <select
                value={settings.defaultReportDeadlineDay}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultReportDeadlineDay: e.target.value,
                  })
                }
                className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 font-medium text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
              >
                <option value="Chủ Nhật (23:59)">Chủ Nhật (23:59 hàng tuần)</option>
                <option value="Thứ Bảy (23:59)">Thứ Bảy (23:59 hàng tuần)</option>
                <option value="Thứ Sáu (17:00)">Thứ Sáu (17:00 hàng tuần)</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Mốc tính trễ hạn nộp báo cáo tuần.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Dung lượng tệp đính kèm tối đa
              </label>
              <div className="relative">
                <HardDrive className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={settings.maxFileSizeMb}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxFileSizeMb: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 font-bold text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Giới hạn dung lượng mỗi tệp (MB).
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-md border border-slate-200/60 cursor-pointer hover:bg-slate-100/60 transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Cho phép sinh viên nộp trễ báo cáo tuần
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Báo cáo nộp sau hạn chót vẫn được ghi nhận nhưng hiển thị nhãn &quot;Nộp trễ&quot; để GVHD theo dõi.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowLateSubmission}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    allowLateSubmission: e.target.checked,
                  })
                }
                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#026aa7] focus:ring-[#026aa7]"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-md border border-slate-200/60 cursor-pointer hover:bg-slate-100/60 transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Tự động khóa chỉnh sửa điểm khi học kỳ kết thúc
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Ngăn chặn việc sửa đổi bảng điểm và báo cáo sau khi kỳ thực tập chính thức đóng.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoLockSemesterEnd}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    autoLockSemesterEnd: e.target.checked,
                  })
                }
                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#026aa7] focus:ring-[#026aa7]"
              />
            </label>
          </div>
        </div>

        {/* BOTTOM SAVE BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            {hasUnsavedChanges ? (
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-[#548a28]" />
            )}
            <span>
              {hasUnsavedChanges
                ? "Bạn còn thay đổi chưa lưu."
                : "Cài đặt đã được đồng bộ."}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex min-h-10 items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
            >
              Đặt lại mặc định
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-[#026aa7] px-5 py-2 text-xs font-bold text-white shadow-2xs transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Đang lưu..." : "Lưu cài đặt"}</span>
            </button>
          </div>
        </div>
        </fieldset>
      </form>}

      {/* CONFIRM RESET DIALOG */}
      <ConfirmDialog
        open={showResetConfirm}
        title="Khôi phục cài đặt mặc định"
        description="Bạn có chắc chắn muốn đặt lại toàn bộ thông tin Khoa và các tham số quy định thực tập về giá trị mặc định ban đầu?"
        confirmLabel="Khôi phục mặc định"
        variant="danger"
        onConfirm={handleResetDefaults}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};

export default SettingsView;
export { SettingsView as AdminSettingsView };
