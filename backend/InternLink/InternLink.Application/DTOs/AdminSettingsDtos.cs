namespace InternLink.Application.DTOs;

public class AdminSettingsDto
{
    public string AppName { get; set; } = "InternLink";
    public string AppShortName { get; set; } = "InternLink";
    public string BrowserTitle { get; set; } = "{appName} - Nền tảng quản lý thực tập";
    public string CopyrightText { get; set; } = "© {year} {appName} · {companyName}";
    public string AppUrl { get; set; } = "http://localhost:3000";
    public string AppLogoUrl { get; set; } = "/logo/logo_internlink-02.png";
    public string AppFaviconUrl { get; set; } = "/logo/logo_internlink-02.png";
    public string AppPrimaryColor { get; set; } = "#026aa7";
    public string DepartmentName { get; set; } = "Khoa Công nghệ Thông tin";
    public string SupportEmail { get; set; } = "internlink.cntt@gmail.com";
    public string Phone { get; set; } = "0906891704";
    public string Address { get; set; } = "Tòa nhà A, 227 Nguyễn Văn Cừ, Q.5, TP.HCM";
    public string CompanyName { get; set; } = "CÔNG TY CỔ PHẦN CÔNG NGHỆ INTERNLINK";
    public string CompanyTaxCode { get; set; } = "0109887766";
    public string CompanyAddress { get; set; } = "Tầng 8, Tòa nhà Công nghệ, Cầu Giấy, Hà Nội";
    public string CompanyHotline { get; set; } = "1900 8899";
    public string BillingEmail { get; set; } = "billing@internlink.vn";
    public bool EmailEnabled { get; set; } = true;
    public string SmtpHost { get; set; } = "smtp.gmail.com";
    public int SmtpPort { get; set; } = 587;
    public bool SmtpUseSsl { get; set; } = true;
    public string SmtpUsername { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public string EmailFromAddress { get; set; } = "internlink.cntt@gmail.com";
    public string EmailFromName { get; set; } = "InternLink";
    public string PasswordResetPath { get; set; } = "/reset-password";
    public int PasswordResetTokenExpiryHours { get; set; } = 24;
    public int MaxStudentsPerLecturer { get; set; } = 30;
    public string DefaultReportDeadlineDay { get; set; } = "Chủ Nhật (23:59)";
    public int MaxFileSizeMb { get; set; } = 25;
    public bool AllowLateSubmission { get; set; } = true;
    public bool AutoLockSemesterEnd { get; set; } = true;
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}

public class UpdateAdminSettingsRequest
{
    public string AppName { get; set; } = "InternLink";
    public string AppShortName { get; set; } = "InternLink";
    public string BrowserTitle { get; set; } = "{appName} - Nền tảng quản lý thực tập";
    public string CopyrightText { get; set; } = "© {year} {appName} · {companyName}";
    public string AppUrl { get; set; } = "http://localhost:3000";
    public string AppLogoUrl { get; set; } = "/logo/logo_internlink-02.png";
    public string AppFaviconUrl { get; set; } = "/logo/logo_internlink-02.png";
    public string AppPrimaryColor { get; set; } = "#026aa7";
    public string DepartmentName { get; set; } = string.Empty;
    public string SupportEmail { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string CompanyName { get; set; } = "CÔNG TY CỔ PHẦN CÔNG NGHỆ INTERNLINK";
    public string CompanyTaxCode { get; set; } = "0109887766";
    public string CompanyAddress { get; set; } = "Tầng 8, Tòa nhà Công nghệ, Cầu Giấy, Hà Nội";
    public string CompanyHotline { get; set; } = "1900 8899";
    public string BillingEmail { get; set; } = "billing@internlink.vn";
    public bool EmailEnabled { get; set; } = true;
    public string SmtpHost { get; set; } = "smtp.gmail.com";
    public int SmtpPort { get; set; } = 587;
    public bool SmtpUseSsl { get; set; } = true;
    public string SmtpUsername { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public string EmailFromAddress { get; set; } = "internlink.cntt@gmail.com";
    public string EmailFromName { get; set; } = "InternLink";
    public string PasswordResetPath { get; set; } = "/reset-password";
    public int PasswordResetTokenExpiryHours { get; set; } = 24;
    public int MaxStudentsPerLecturer { get; set; } = 30;
    public string DefaultReportDeadlineDay { get; set; } = "Chủ Nhật (23:59)";
    public int MaxFileSizeMb { get; set; } = 25;
    public bool AllowLateSubmission { get; set; } = true;
    public bool AutoLockSemesterEnd { get; set; } = true;
}
