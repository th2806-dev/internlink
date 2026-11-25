using System.Text.Json;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Entities.System;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Shared.Authorization;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class SystemSecurityService(AppDbContext context) : ISystemSecurityService
{
    public async Task<IReadOnlyList<AdministrativeSessionResponse>> GetActiveSessionsAsync(
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var sessions = await context.RefreshTokens
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(token => token.User)
            .Where(token =>
                !token.IsDeleted
                && !token.IsRevoked
                && !token.IsUsed
                && token.ExpiresAt > now
                && token.User != null
                && !token.User.IsDeleted
                && token.User.IsActive
                && (token.User.Role == Role.SuperAdmin || token.User.Role == Role.DepartmentAdmin))
            .OrderByDescending(token => token.CreatedAt)
            .ToListAsync(cancellationToken);

        var tenantIds = sessions.Select(token => token.User.TenantId).Distinct().ToArray();
        var tenantNames = tenantIds.Length == 0
            ? new Dictionary<Guid, string>()
            : await context.SysTenants
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(tenant => tenantIds.Contains(tenant.PublicId))
                .ToDictionaryAsync(tenant => tenant.PublicId, tenant => tenant.Name, cancellationToken);

        return sessions.Select(token => new AdministrativeSessionResponse(
            token.PublicId,
            token.User.PublicId,
            token.User.Username,
            token.User.Email ?? token.User.Username,
            token.User.Role.ToString(),
            token.User.TenantId,
            tenantNames.TryGetValue(token.User.TenantId, out var tenantName)
                ? tenantName
                : "Đơn vị không còn tồn tại",
            token.CreatedByIp,
            token.UserAgent,
            ToDateTimeOffset(token.CreatedAt),
            ToDateTimeOffset(token.ExpiresAt))).ToArray();
    }

    public async Task<bool> RevokeSessionAsync(
        Guid tokenId,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var token = await context.RefreshTokens
            .IgnoreQueryFilters()
            .Include(item => item.User)
            .FirstOrDefaultAsync(item =>
                item.PublicId == tokenId
                && !item.IsDeleted
                && !item.IsRevoked
                && !item.IsUsed
                && item.ExpiresAt > now
                && item.User != null
                && (item.User.Role == Role.SuperAdmin || item.User.Role == Role.DepartmentAdmin),
                cancellationToken);
        if (token == null)
            return false;

        token.IsRevoked = true;
        token.RevokedAt = now;
        token.RevokedByIp = ipAddress;
        var actorName = await context.Users
            .IgnoreQueryFilters()
            .Where(user => user.PublicId == actorId)
            .Select(user => user.Username)
            .FirstOrDefaultAsync(cancellationToken);
        context.SysAuditLogs.Add(new SysAuditLog
        {
            TenantId = token.TenantId,
            TableName = "RefreshTokens",
            ActionType = "FORCE_LOGOUT",
            RecordId = token.PublicId.ToString(),
            UserId = actorId,
            Username = actorName,
            FunctionCode = SystemPermissionCodes.SecuritySessionsRevoke,
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new
            {
                token.UserId,
                token.IsRevoked
            }),
            CreatedAt = now
        });

        await context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static DateTimeOffset ToDateTimeOffset(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
