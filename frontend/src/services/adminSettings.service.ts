import { apiRequest } from "../lib/apiClient";

export interface AppBrandingSettings {
  appName: string;
  appShortName: string;
  browserTitle: string;
  copyrightText: string;
  appUrl: string;
  appLogoUrl: string;
  appFaviconUrl: string;
  appPrimaryColor: string;
  companyName: string;
  companyTaxCode: string;
  companyAddress: string;
  companyHotline: string;
  billingEmail: string;
}

export interface AdminFacultySettings {
  appName: string;
  appShortName: string;
  browserTitle: string;
  copyrightText: string;
  appUrl: string;
  appLogoUrl: string;
  appFaviconUrl: string;
  appPrimaryColor: string;
  departmentName: string;
  supportEmail: string;
  phone: string;
  address: string;
  companyName: string;
  companyTaxCode: string;
  companyAddress: string;
  companyHotline: string;
  billingEmail: string;
  emailEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUseSsl: boolean;
  smtpUsername: string;
  smtpPassword: string;
  emailFromAddress: string;
  emailFromName: string;
  passwordResetPath: string;
  passwordResetTokenExpiryHours: number;
  maxStudentsPerLecturer: number;
  defaultReportDeadlineDay: string;
  maxFileSizeMb: number;
  allowLateSubmission: boolean;
  autoLockSemesterEnd: boolean;
  lastUpdatedAt?: string;
}

export const adminSettingsService = {
  getSettings(): Promise<AdminFacultySettings> {
    return apiRequest<AdminFacultySettings>("/api/SuperAdmin/settings");
  },

  updateSettings(body: AdminFacultySettings): Promise<AdminFacultySettings> {
    return apiRequest<AdminFacultySettings>("/api/SuperAdmin/settings", {
      method: "PUT",
      body,
    });
  },

  resetSettings(): Promise<AdminFacultySettings> {
    return apiRequest<AdminFacultySettings>("/api/SuperAdmin/settings/reset", {
      method: "POST",
    });
  },
  getBranding(): Promise<AppBrandingSettings> {
    return apiRequest<AppBrandingSettings>("/api/SuperAdmin/settings/branding", { auth: false });
  },
  uploadBrandingAsset(file: File, type: "logo" | "favicon"): Promise<AppBrandingSettings> {
    const form = new FormData();
    form.set("file", file);
    form.set("type", type);
    return apiRequest<AppBrandingSettings>("/api/SuperAdmin/settings/branding/upload", {
      method: "POST",
      body: form,
    });
  },
};
