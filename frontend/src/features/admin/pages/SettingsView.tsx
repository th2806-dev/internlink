import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { adminEmailService } from "../../../services/adminEmail.service";
import {
  adminSettingsService,
  type AdminFacultySettings,
} from "../../../services/adminSettings.service";
import { queryKeys } from "../../../lib/queryKeys";
import { useAuth } from "../../../hooks/useAuth";

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const settingsKey = queryKeys.admin.settings.data({
    backendRole: user?.backendRole ?? "",
    userId: user?.id ?? user?.username ?? "anonymous",
  });
  const settingsQuery = useQuery({
    queryKey: settingsKey,
    queryFn: adminSettingsService.getSettings,
  });
  const [settings, setSettings] = useState<FacultySettings>(EMPTY_FACULTY_SETTINGS);

  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedSettings, setSavedSettings] = useState<FacultySettings>(EMPTY_FACULTY_SETTINGS);
  const isLoadingSettings = settingsQuery.isPending;
  const settingsLoadError = settingsQuery.isError;
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
      setSavedSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

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
      queryClient.setQueryData(settingsKey, updated);
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
        queryClient.setQueryData(settingsKey, res);
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
    <div className="w-full min-w-0 space-y-1.5 pb-12 font-sans">
      <CompactActionBar
        icon={Sliders}
        title="Cài đặt hệ thống"
        actions={[
          {
            label: "Đặt lại mặc định",
            icon: RotateCcw,
            onClick: () => setShowResetConfirm(true),
            disabled: isSaving || isLoadingSettings || settingsLoadError,
          },
          {
            label: isSaving ? "Đang lưu…" : "Lưu cài đặt",
            icon: Save,
            variant: "primary",
            onClick: () => void handleSave(),
            disabled: isSaving || isLoadingSettings || settingsLoadError || !hasUnsavedChanges,
            loading: isSaving,
          },
        ]}
      />

      {settingsLoadError && (
        <div role="alert" className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
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
            onClick={() => void settingsQuery.refetch()}
            disabled={settingsQuery.isFetching}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${settingsQuery.isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
            Thử tải lại
          </button>
        </div>
      )}

      {isLoadingSettings && (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          Đang tải cài đặt hiện tại…
        </div>
      )}

      {!isLoadingSettings && !settingsLoadError && <form onSubmit={handleSave} className="space-y-1.5">
        <fieldset disabled={isLoadingSettings || isSaving} className="space-y-1.5 disabled:opacity-70">
        {/* SECTION 1: FACULTY CONTACT INFORMATION */}
        <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="rounded-md bg-[#026aa7]/5 p-2 text-[#026aa7]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                1. Thông tin Liên hệ Khoa &amp; Ban Giám hiệu
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Thông tin xuất hiện trên các văn bản, thông báo và hỗ trợ sinh viên liên hệ.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
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
                  className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 pl-9 pr-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
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
                  className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 pl-9 pr-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
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
                    className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 pl-9 pr-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={isTestingEmail}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-slate-200 bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
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
                  className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 pl-9 pr-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: INTERNSHIP RULES & PARAMETERS */}
        <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="rounded-md bg-[#026aa7]/5 p-2 text-[#026aa7]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                2. Quy tắc Thực tập &amp; Hạn nộp Báo cáo
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Thiết lập hạn mức phân công giảng viên, thời hạn nộp bài và dung lượng tệp cho phép.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
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
                  className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 pl-9 pr-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
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
                className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
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
                  className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 pl-9 pr-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Giới hạn dung lượng mỗi tệp (MB).
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200/60 bg-slate-50 p-3 transition-colors hover:bg-slate-100/60">
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

            <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200/60 bg-slate-50 p-3 transition-colors hover:bg-slate-100/60">
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3">
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
