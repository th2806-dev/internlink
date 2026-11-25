using System.Text.Json;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public class SettingsService : ISettingsService
{
    private readonly AppDbContext _db;
    private AdminSettingsDto? _cache;
    private readonly object _lock = new();

    public SettingsService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<AdminSettingsDto> GetSettingsAsync()
    {
        lock (_lock)
        {
            if (_cache != null) return _cache;
        }

        var settings = new AdminSettingsDto();
        var rows = await _db.SystemSettings
            .IgnoreQueryFilters()
            .Where(s => !s.IsDeleted)
            .ToListAsync();

        foreach (var row in rows)
        {
            switch (row.Key)
            {
                case "AppName": settings.AppName = row.Value; break;
                case "AppShortName": settings.AppShortName = row.Value; break;
                case "BrowserTitle": settings.BrowserTitle = row.Value; break;
                case "CopyrightText": settings.CopyrightText = row.Value; break;
                case "AppUrl": settings.AppUrl = row.Value; break;
                case "AppLogoUrl": settings.AppLogoUrl = row.Value; break;
                case "AppFaviconUrl": settings.AppFaviconUrl = row.Value; break;
                case "AppPrimaryColor": settings.AppPrimaryColor = row.Value; break;
                case "DepartmentName": settings.DepartmentName = row.Value; break;
                case "SupportEmail": settings.SupportEmail = row.Value; break;
                case "Phone": settings.Phone = row.Value; break;
                case "Address": settings.Address = row.Value; break;
                case "CompanyName": settings.CompanyName = row.Value; break;
                case "CompanyTaxCode": settings.CompanyTaxCode = row.Value; break;
                case "CompanyAddress": settings.CompanyAddress = row.Value; break;
                case "CompanyHotline": settings.CompanyHotline = row.Value; break;
                case "BillingEmail": settings.BillingEmail = row.Value; break;
                case "EmailEnabled": settings.EmailEnabled = bool.TryParse(row.Value, out var enabled) && enabled; break;
                case "SmtpHost": settings.SmtpHost = row.Value; break;
                case "SmtpPort": settings.SmtpPort = int.TryParse(row.Value, out var smtpPort) && smtpPort > 0 ? smtpPort : 587; break;
                case "SmtpUseSsl": settings.SmtpUseSsl = bool.TryParse(row.Value, out var smtpSsl) && smtpSsl; break;
                case "SmtpUsername": settings.SmtpUsername = row.Value; break;
                case "EmailFromAddress": settings.EmailFromAddress = row.Value; break;
                case "EmailFromName": settings.EmailFromName = row.Value; break;
                case "PasswordResetPath": settings.PasswordResetPath = row.Value; break;
                case "PasswordResetTokenExpiryHours": settings.PasswordResetTokenExpiryHours = int.TryParse(row.Value, out var expiry) && expiry > 0 ? expiry : 24; break;
                case "MaxStudentsPerLecturer": int.TryParse(row.Value, out var mspl); settings.MaxStudentsPerLecturer = mspl > 0 ? mspl : 30; break;
                case "DefaultReportDeadlineDay": settings.DefaultReportDeadlineDay = row.Value; break;
                case "MaxFileSizeMb": int.TryParse(row.Value, out var mfs); settings.MaxFileSizeMb = mfs > 0 ? mfs : 25; break;
                case "AllowLateSubmission": settings.AllowLateSubmission = bool.TryParse(row.Value, out var als) && als; break;
                case "AutoLockSemesterEnd": settings.AutoLockSemesterEnd = bool.TryParse(row.Value, out var alse) && alse; break;
            }
            if (row.Key == "LastUpdatedAt" && DateTime.TryParse(row.Value, out var lu))
                settings.LastUpdatedAt = lu;
        }

        lock (_lock)
        {
            _cache = settings;
        }

        return settings;
    }

    public async Task<AdminSettingsDto> UpdateSettingsAsync(UpdateAdminSettingsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CompanyName))
            throw new InvalidOperationException("Tên công ty pháp nhân không được để trống");
        if (string.IsNullOrWhiteSpace(request.CompanyTaxCode))
            throw new InvalidOperationException("Mã số thuế không được để trống");
        if (string.IsNullOrWhiteSpace(request.CompanyAddress))
            throw new InvalidOperationException("Địa chỉ pháp nhân không được để trống");

        var now = DateTime.UtcNow;
        var entries = new (string Key, string Value, string? Description)[]
        {
            ("AppName", string.IsNullOrWhiteSpace(request.AppName) ? "InternLink" : request.AppName.Trim(), "Tên ứng dụng"),
            ("AppShortName", string.IsNullOrWhiteSpace(request.AppShortName) ? "InternLink" : request.AppShortName.Trim(), "Tên ngắn ứng dụng"),
            ("BrowserTitle", NormalizeBrandingText(
                request.BrowserTitle,
                "{appName} - Nền tảng quản lý thực tập",
                160,
                "Tiêu đề trình duyệt"), "Tiêu đề trình duyệt"),
            ("CopyrightText", NormalizeBrandingText(
                request.CopyrightText,
                "© {year} {appName} · {companyName}",
                250,
                "Nội dung bản quyền"), "Nội dung bản quyền/footer"),
            ("AppUrl", string.IsNullOrWhiteSpace(request.AppUrl) ? "http://localhost:3000" : request.AppUrl.Trim().TrimEnd('/'), "URL công khai của ứng dụng"),
            ("AppLogoUrl", string.IsNullOrWhiteSpace(request.AppLogoUrl) ? "/logo/logo_internlink-02.png" : request.AppLogoUrl.Trim(), "Đường dẫn logo ứng dụng"),
            ("AppFaviconUrl", string.IsNullOrWhiteSpace(request.AppFaviconUrl) ? "/logo/logo_internlink-02.png" : request.AppFaviconUrl.Trim(), "Đường dẫn favicon"),
            ("AppPrimaryColor", NormalizeHexColor(request.AppPrimaryColor, "#026aa7"), "Màu thương hiệu chính"),
            ("DepartmentName", request.DepartmentName.Trim(), "Tên khoa / đơn vị"),
            ("SupportEmail", request.SupportEmail.Trim(), "Email hỗ trợ"),
            ("Phone", request.Phone?.Trim() ?? string.Empty, "Số điện thoại"),
            ("Address", request.Address?.Trim() ?? string.Empty, "Địa chỉ"),
            ("CompanyName", string.IsNullOrWhiteSpace(request.CompanyName) ? "CÔNG TY CỔ PHẦN CÔNG NGHỆ INTERNLINK" : request.CompanyName.Trim().ToUpperInvariant(), "Tên pháp nhân xuất hóa đơn"),
            ("CompanyTaxCode", string.IsNullOrWhiteSpace(request.CompanyTaxCode) ? "0109887766" : request.CompanyTaxCode.Trim(), "Mã số thuế pháp nhân"),
            ("CompanyAddress", string.IsNullOrWhiteSpace(request.CompanyAddress) ? "Tầng 8, Tòa nhà Công nghệ, Cầu Giấy, Hà Nội" : request.CompanyAddress.Trim(), "Địa chỉ pháp nhân"),
            ("CompanyHotline", string.IsNullOrWhiteSpace(request.CompanyHotline) ? "1900 8899" : request.CompanyHotline.Trim(), "Hotline pháp nhân"),
            ("BillingEmail", string.IsNullOrWhiteSpace(request.BillingEmail) ? "billing@internlink.vn" : request.BillingEmail.Trim(), "Email hóa đơn"),
            ("EmailEnabled", request.EmailEnabled.ToString(), "Bật/tắt gửi email"),
            ("SmtpHost", request.SmtpHost?.Trim() ?? string.Empty, "Máy chủ SMTP"),
            ("SmtpPort", (request.SmtpPort > 0 ? request.SmtpPort : 587).ToString(), "Cổng SMTP"),
            ("SmtpUseSsl", request.SmtpUseSsl.ToString(), "Dùng STARTTLS/SSL SMTP"),
            ("SmtpUsername", request.SmtpUsername?.Trim() ?? string.Empty, "Tài khoản SMTP"),
            ("EmailFromAddress", request.EmailFromAddress?.Trim() ?? string.Empty, "Email người gửi"),
            ("EmailFromName", string.IsNullOrWhiteSpace(request.EmailFromName) ? "InternLink" : request.EmailFromName.Trim(), "Tên người gửi"),
            ("PasswordResetPath", string.IsNullOrWhiteSpace(request.PasswordResetPath) ? "/reset-password" : request.PasswordResetPath.Trim(), "Đường dẫn đặt lại mật khẩu"),
            ("PasswordResetTokenExpiryHours", (request.PasswordResetTokenExpiryHours > 0 ? request.PasswordResetTokenExpiryHours : 24).ToString(), "Thời hạn mã đặt lại mật khẩu"),
            ("MaxStudentsPerLecturer", (request.MaxStudentsPerLecturer > 0 ? request.MaxStudentsPerLecturer : 30).ToString(), "Số SV tối đa / GV"),
            ("DefaultReportDeadlineDay", string.IsNullOrWhiteSpace(request.DefaultReportDeadlineDay) ? "Chủ Nhật (23:59)" : request.DefaultReportDeadlineDay.Trim(), "Hạn nộp báo cáo"),
            ("MaxFileSizeMb", (request.MaxFileSizeMb > 0 ? request.MaxFileSizeMb : 25).ToString(), "Dung lượng file tối đa (MB)"),
            ("AllowLateSubmission", request.AllowLateSubmission.ToString(), "Cho phép nộp muộn"),
            ("AutoLockSemesterEnd", request.AutoLockSemesterEnd.ToString(), "Tự động khóa khi hết kỳ"),
            ("LastUpdatedAt", now.ToString("O"), "Thời gian cập nhật"),
        };

        var existingKeys = await _db.SystemSettings
            .IgnoreQueryFilters()
            .Where(s => !s.IsDeleted)
            .Select(s => s.Key)
            .ToListAsync();

        if (!string.IsNullOrEmpty(request.SmtpPassword))
        {
        entries = entries.Append(("SmtpPassword", request.SmtpPassword, "Mật khẩu SMTP")).ToArray();
        }

        foreach (var (key, value, desc) in entries)
        {
            var existing = await _db.SystemSettings
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.Key == key && !s.IsDeleted);
            if (existing != null)
            {
                existing.Value = value;
                existing.UpdatedAt = now;
            }
            else
            {
                _db.SystemSettings.Add(new SystemSetting
                {
                    Id = Guid.NewGuid(),
                    Key = key,
                    Value = value,
                    Category = "General",
                    Description = desc,
                    CreatedAt = now,
                });
            }
        }

        await _db.SaveChangesAsync();

        lock (_lock)
        {
            _cache = null;
        }

        return await GetSettingsAsync();
    }

    public async Task<AppBrandingResponse> GetBrandingAsync()
    {
        var settings = await GetSettingsAsync();
        return new AppBrandingResponse(
            settings.AppName,
            settings.AppShortName,
            settings.BrowserTitle,
            settings.CopyrightText,
            settings.AppUrl,
            settings.AppLogoUrl,
            settings.AppFaviconUrl,
            settings.AppPrimaryColor,
            settings.CompanyName,
            settings.CompanyTaxCode,
            settings.CompanyAddress,
            settings.CompanyHotline,
            settings.BillingEmail);
    }

    public async Task UpdateBrandingAssetAsync(string key, string url)
    {
        if (key is not ("AppLogoUrl" or "AppFaviconUrl"))
            throw new ArgumentException("Loại tài sản thương hiệu không hợp lệ.");

        var now = DateTime.UtcNow;
        var setting = await _db.SystemSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.Key == key && !item.IsDeleted);
        if (setting == null)
        {
            _db.SystemSettings.Add(new SystemSetting
            {
                Id = Guid.NewGuid(),
                TenantId = SysTenant.DefaultTenantId,
                Key = key,
                Value = url,
                Category = "Branding",
                Description = key == "AppLogoUrl" ? "Logo ứng dụng" : "Favicon ứng dụng",
                CreatedAt = now
            });
        }
        else
        {
            setting.Value = url;
            setting.TenantId = SysTenant.DefaultTenantId;
            setting.Category = "Branding";
            setting.UpdatedAt = now;
        }
        await _db.SaveChangesAsync();
        lock (_lock) _cache = null;
    }

    private static string NormalizeHexColor(string? value, string fallback)
    {
        var candidate = value?.Trim() ?? string.Empty;
        return System.Text.RegularExpressions.Regex.IsMatch(candidate, "^#[0-9A-Fa-f]{6}$")
            ? candidate.ToLowerInvariant()
            : fallback;
    }

    private static string NormalizeBrandingText(
        string? value,
        string fallback,
        int maxLength,
        string label)
    {
        if (string.IsNullOrWhiteSpace(value))
            return fallback;

        var normalized = value.Trim();
        if (normalized.Length > maxLength)
            throw new InvalidOperationException($"{label} không được vượt quá {maxLength} ký tự.");

        return normalized;
    }

    public async Task<AdminSettingsDto> ResetSettingsAsync()
    {
        var now = DateTime.UtcNow;
        var all = await _db.SystemSettings.Where(s => !s.IsDeleted).ToListAsync();
        foreach (var s in all)
        {
            s.IsDeleted = true;
            s.UpdatedAt = now;
        }
        await _db.SaveChangesAsync();

        lock (_lock)
        {
            _cache = null;
        }

        return await GetSettingsAsync();
    }
}
