using System.Text.Json;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Entities.System;
using InternLink.Domain.Enums;
using InternLink.Shared.Authorization;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class PlatformAnnouncementService(AppDbContext context) : IPlatformAnnouncementService
{
    public async Task<IReadOnlyList<PlatformAnnouncementResponse>> GetAllAsync(
        string? type,
        CancellationToken cancellationToken)
    {
        var query = context.SysPlatformAnnouncements
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => item.TenantId == SysTenant.DefaultTenantId && !item.IsDeleted);

        if (!string.IsNullOrWhiteSpace(type))
        {
            if (!Enum.TryParse<AnnouncementType>(type, ignoreCase: false, out var parsedType)
                || !Enum.IsDefined(parsedType))
                throw new ArgumentException("Loại thông báo không hợp lệ.");
            query = query.Where(item => item.Type == parsedType);
        }

        var announcements = await query
            .OrderByDescending(item => item.CreatedAt)
            .ToListAsync(cancellationToken);
        return await MapResponsesAsync(announcements, cancellationToken);
    }

    public async Task<PlatformAnnouncementResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var announcement = await context.SysPlatformAnnouncements
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.PublicId == id
                    && item.TenantId == SysTenant.DefaultTenantId
                    && !item.IsDeleted,
                cancellationToken);
        if (announcement == null)
            return null;

        return (await MapResponsesAsync([announcement], cancellationToken)).Single();
    }

    public async Task<PlatformAnnouncementResponse> CreateAsync(
        CreatePlatformAnnouncementRequest request,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
            throw new ArgumentException("Tiêu đề và nội dung thông báo không được để trống.");
        if (!Enum.TryParse<AnnouncementType>(request.Type, ignoreCase: false, out var type)
            || !Enum.IsDefined(type))
            throw new ArgumentException("Loại thông báo không hợp lệ.");
        if (!Enum.TryParse<AnnouncementAudience>(request.TargetAudience, ignoreCase: false, out var audience)
            || !Enum.IsDefined(audience))
            throw new ArgumentException("Đối tượng nhận thông báo không hợp lệ.");

        var startsAt = request.StartsAt.UtcDateTime;
        var endsAt = request.EndsAt.UtcDateTime;
        if (startsAt >= endsAt || endsAt <= DateTime.UtcNow)
            throw new ArgumentException("Thời gian kết thúc phải sau thời gian bắt đầu và chưa hết hạn.");

        if (request.TargetTenantId.HasValue
            && !await context.SysTenants.IgnoreQueryFilters()
                .AnyAsync(
                    tenant => tenant.PublicId == request.TargetTenantId.Value && !tenant.IsDeleted,
                    cancellationToken))
            throw new KeyNotFoundException("Không tìm thấy đơn vị nhận thông báo.");

        var announcement = new SysPlatformAnnouncement
        {
            TenantId = SysTenant.DefaultTenantId,
            Title = request.Title.Trim(),
            Content = request.Content.Trim(),
            Type = type,
            TargetAudience = audience,
            TargetTenantId = request.TargetTenantId,
            StartsAt = startsAt,
            EndsAt = endsAt,
            IsActive = true,
            ShowBanner = request.ShowBanner
        };
        context.SysPlatformAnnouncements.Add(announcement);
        await AddAuditAsync(
            announcement.PublicId,
            "CREATE",
            actorId,
            ipAddress,
            JsonSerializer.Serialize(new { announcement.Title, announcement.Type, announcement.TargetAudience, announcement.TargetTenantId }),
            SystemPermissionCodes.AnnouncementsCreate,
            cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        return (await MapResponsesAsync([announcement], cancellationToken)).Single();
    }

    public async Task<PlatformAnnouncementResponse?> ToggleAsync(
        Guid id,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var announcement = await context.SysPlatformAnnouncements
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                item => item.PublicId == id
                    && item.TenantId == SysTenant.DefaultTenantId
                    && !item.IsDeleted,
                cancellationToken);
        if (announcement == null)
            return null;

        announcement.IsActive = !announcement.IsActive;
        await AddAuditAsync(
            announcement.PublicId,
            "TOGGLE",
            actorId,
            ipAddress,
            JsonSerializer.Serialize(new { announcement.IsActive }),
            SystemPermissionCodes.AnnouncementsUpdate,
            cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        return (await MapResponsesAsync([announcement], cancellationToken)).Single();
    }

    public async Task<IReadOnlyList<PlatformAnnouncementBannerResponse>> GetActiveBannersAsync(
        Guid? tenantId,
        string role,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var isTenantAdmin = role is nameof(Role.SuperAdmin) or nameof(Role.DepartmentAdmin);
        var announcements = await context.SysPlatformAnnouncements
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item =>
                item.TenantId == SysTenant.DefaultTenantId
                && !item.IsDeleted
                && item.IsActive
                && item.ShowBanner
                && item.StartsAt <= now
                && item.EndsAt > now
                && item.Type != AnnouncementType.ReleaseNote
                && item.Type != AnnouncementType.General
                && (item.TargetTenantId == null || (tenantId.HasValue && item.TargetTenantId == tenantId.Value))
                && (item.TargetAudience == AnnouncementAudience.AllUsers
                    || (isTenantAdmin && item.TargetAudience == AnnouncementAudience.TenantAdminsOnly)))
            .OrderBy(item => item.Type == AnnouncementType.SecurityAlert ? 0 : 1)
            .ThenBy(item => item.StartsAt)
            .ToListAsync(cancellationToken);

        return announcements.Select(item => new PlatformAnnouncementBannerResponse(
            item.PublicId,
            item.Title,
            item.Content,
            item.Type.ToString(),
            ToDateTimeOffset(item.EndsAt))).ToArray();
    }

    private async Task<IReadOnlyList<PlatformAnnouncementResponse>> MapResponsesAsync(
        IReadOnlyList<SysPlatformAnnouncement> announcements,
        CancellationToken cancellationToken)
    {
        var tenantIds = announcements
            .Where(item => item.TargetTenantId.HasValue)
            .Select(item => item.TargetTenantId!.Value)
            .Distinct()
            .ToArray();
        var tenantNames = tenantIds.Length == 0
            ? new Dictionary<Guid, string>()
            : await context.SysTenants
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(tenant => tenantIds.Contains(tenant.PublicId) && !tenant.IsDeleted)
                .ToDictionaryAsync(tenant => tenant.PublicId, tenant => tenant.Name, cancellationToken);

        return announcements.Select(item => new PlatformAnnouncementResponse(
            item.PublicId,
            item.Title,
            item.Content,
            item.Type.ToString(),
            item.TargetAudience.ToString(),
            item.TargetTenantId,
            item.TargetTenantId.HasValue && tenantNames.TryGetValue(item.TargetTenantId.Value, out var name)
                ? name
                : null,
            ToDateTimeOffset(item.StartsAt),
            ToDateTimeOffset(item.EndsAt),
            item.IsActive,
            item.ShowBanner,
            ToDateTimeOffset(item.CreatedAt))).ToArray();
    }

    private async Task AddAuditAsync(
        Guid recordId,
        string action,
        Guid actorId,
        string? ipAddress,
        string newValuesJson,
        string functionCode,
        CancellationToken cancellationToken)
    {
        var actorName = await context.Users
            .IgnoreQueryFilters()
            .Where(user => user.PublicId == actorId)
            .Select(user => user.Username)
            .FirstOrDefaultAsync(cancellationToken);
        context.SysAuditLogs.Add(new SysAuditLog
        {
            TenantId = SysTenant.DefaultTenantId,
            TableName = "Sys_PlatformAnnouncements",
            ActionType = action,
            RecordId = recordId.ToString(),
            UserId = actorId,
            Username = actorName,
            FunctionCode = functionCode,
            IpAddress = ipAddress,
            NewValuesJson = newValuesJson,
            CreatedAt = DateTime.UtcNow
        });
    }

    private static DateTimeOffset ToDateTimeOffset(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
