using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace InternLink.Infrastructure.Services;

public sealed class TenantLicenseMonitoringJobs(
    IServiceScopeFactory scopeFactory,
    ILogger<TenantLicenseMonitoringJobs> logger)
{
    private static readonly TimeSpan ExpiryWarningWindow = TimeSpan.FromDays(30);

    public async Task ScanExpiringLicensesAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTime.UtcNow;
        var limit = now.Add(ExpiryWarningWindow);
        var expiringLicenses = await context.SysTenantLicenses
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(license => license.IsActive
                && !license.IsDeleted
                && license.ValidTo > now
                && license.ValidTo <= limit
                && license.Tenant != null
                && !license.Tenant.IsDeleted
                && (license.Tenant.Status == TenantStatus.Active || license.Tenant.Status == TenantStatus.Trial))
            .Select(license => new
            {
                license.TenantId,
                TenantName = license.Tenant!.Name,
                LicenseId = license.PublicId,
                license.ValidTo
            })
            .ToListAsync(cancellationToken);

        foreach (var license in expiringLicenses)
        {
            var daysLeft = (license.ValidTo.Date - now.Date).Days;
            if (daysLeft is not (15 or 7 or 1))
                continue;

            await NotifyTenantAdminsAsync(
                license.TenantId,
                $"license-expiry-{license.LicenseId:N}-{daysLeft}",
                "Bản quyền sắp hết hạn",
                $"Bản quyền của {license.TenantName} sẽ hết hạn sau {daysLeft} ngày ({license.ValidTo:dd/MM/yyyy}). Vui lòng liên hệ quản trị nền tảng để gia hạn.",
                sendEmail: true,
                cancellationToken);
        }

        logger.LogInformation(
            "License expiry scan found {Count} licenses due in 15, 7, or 1 day.",
            expiringLicenses.Count(license => (license.ValidTo.Date - now.Date).Days is 15 or 7 or 1));
    }

    public async Task ScanQuotaUsageAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var licenses = await context.SysTenantLicenses
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(license => license.IsActive
                && !license.IsDeleted
                && license.Tenant != null
                && !license.Tenant.IsDeleted
                && (license.Tenant.Status == TenantStatus.Active || license.Tenant.Status == TenantStatus.Trial))
            .Select(license => new
            {
                license.TenantId,
                TenantName = license.Tenant!.Name,
                LicenseId = license.PublicId,
                license.MaxStudentsQuota,
                license.MaxLecturersQuota,
                license.StorageQuotaBytes,
                license.CurrentStorageBytes
            })
            .ToListAsync(cancellationToken);

        var tenantIds = licenses.Select(license => license.TenantId).Distinct().ToArray();
        var studentCounts = await context.Students
            .IgnoreQueryFilters()
            .Where(student => tenantIds.Contains(student.TenantId)
                && !student.IsDeleted
                && (student.UserId == null || student.User != null && student.User.IsActive && !student.User.IsDeleted))
            .GroupBy(student => student.TenantId)
            .Select(group => new { TenantId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.TenantId, item => item.Count, cancellationToken);
        var lecturerCounts = await context.Lecturers
            .IgnoreQueryFilters()
            .Where(lecturer => tenantIds.Contains(lecturer.TenantId)
                && !lecturer.IsDeleted
                && (lecturer.UserId == null || lecturer.User != null && lecturer.User.IsActive && !lecturer.User.IsDeleted))
            .GroupBy(lecturer => lecturer.TenantId)
            .Select(group => new { TenantId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.TenantId, item => item.Count, cancellationToken);

        foreach (var license in licenses)
        {
            var studentCount = studentCounts.GetValueOrDefault(license.TenantId);
            await NotifyQuotaIfNeededAsync(
                license.TenantId,
                license.TenantName,
                license.LicenseId,
                "students",
                "sinh viên",
                studentCount,
                license.MaxStudentsQuota,
                cancellationToken);

            var lecturerCount = lecturerCounts.GetValueOrDefault(license.TenantId);
            await NotifyQuotaIfNeededAsync(
                license.TenantId,
                license.TenantName,
                license.LicenseId,
                "lecturers",
                "giảng viên",
                lecturerCount,
                license.MaxLecturersQuota,
                cancellationToken);

            await NotifyQuotaIfNeededAsync(
                license.TenantId,
                license.TenantName,
                license.LicenseId,
                "storage",
                "dung lượng lưu trữ",
                license.CurrentStorageBytes,
                license.StorageQuotaBytes,
                cancellationToken);
        }

        logger.LogInformation("License quota scan checked {Count} active tenant licenses.", licenses.Count);
    }

    private async Task NotifyQuotaIfNeededAsync(
        Guid tenantId,
        string tenantName,
        Guid licenseId,
        string metricCode,
        string metricName,
        long current,
        long limit,
        CancellationToken cancellationToken)
    {
        if (limit <= 0 || current < limit * 0.8m)
            return;

        var threshold = current >= limit * 0.9m ? 90 : 80;
        var currentLabel = metricCode == "storage"
            ? $"{current / (1024d * 1024d * 1024d):N1} GB"
            : current.ToString("N0");
        var limitLabel = metricCode == "storage"
            ? $"{limit / (1024d * 1024d * 1024d):N1} GB"
            : limit.ToString("N0");

        await NotifyTenantAdminsAsync(
            tenantId,
            $"license-quota-{licenseId:N}-{metricCode}-{threshold}",
            $"Hạn mức {metricName} đạt {threshold}%",
            $"{tenantName} đang sử dụng {currentLabel}/{limitLabel} {metricName}. Vui lòng kiểm tra và điều chỉnh gói bản quyền nếu cần.",
            sendEmail: threshold == 90,
            cancellationToken);
    }

    private async Task NotifyTenantAdminsAsync(
        Guid tenantId,
        string alertCode,
        string title,
        string content,
        bool sendEmail,
        CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<IScopedTenantContext>();
        tenantContext.SetTenantId(tenantId);

        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var recipients = await context.SysUsers
            .IgnoreQueryFilters()
            .Where(user => user.TenantId == tenantId
                && user.IsActive
                && !user.IsDeleted
                && user.LegacyUser.IsActive
                && !user.LegacyUser.IsDeleted
                && user.Roles.Any(userRole => !userRole.IsDeleted
                    && userRole.Role.Code == "DepartmentAdmin"
                    && userRole.Role.IsActive
                    && !userRole.Role.IsDeleted))
            .Select(user => user.LegacyUser.Id)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (recipients.Count == 0)
            logger.LogWarning("No active DepartmentAdmin recipients found for tenant alert {AlertCode} on tenant {TenantId}.", alertCode, tenantId);

        var link = $"/admin/licenses?tenantId={tenantId:D}&alert={Uri.EscapeDataString(alertCode)}";
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
        var createdNotification = false;
        foreach (var userId in recipients)
        {
            var alreadyNotified = await context.Notifications
                .AnyAsync(notification => notification.UserId == userId
                    && notification.Link == link
                    && !notification.IsDeleted,
                    cancellationToken);
            if (alreadyNotified)
                continue;

            await notificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = userId,
                Title = title,
                Content = content,
                Link = link
            });
            createdNotification = true;
        }

        if (sendEmail && (createdNotification || recipients.Count == 0))
            await scope.ServiceProvider.GetRequiredService<ITenantBillingNotificationService>()
                .SendTenantAlertAsync(tenantId, title, content, cancellationToken);
    }
}
