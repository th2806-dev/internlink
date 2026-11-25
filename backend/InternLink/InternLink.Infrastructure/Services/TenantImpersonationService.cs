using System.Text.Json;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Identity;
using InternLink.Infrastructure.Persistence;
using InternLink.Shared.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class TenantImpersonationService(
    AppDbContext context,
    IJwtService jwtService) : ITenantImpersonationService
{
    public async Task<TenantImpersonationResponse?> StartAsync(
        Guid tenantId,
        Guid actorId,
        string reason,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var tenant = await context.SysTenants.IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.PublicId == tenantId && !item.IsDeleted, cancellationToken);
        if (tenant == null)
            return null;
        if (tenant.Status is not (TenantStatus.Active or TenantStatus.Trial))
            throw new InvalidOperationException("Chỉ có thể mở phiên hỗ trợ với đơn vị đang hoạt động hoặc dùng thử.");

        var now = DateTime.UtcNow;
        var session = new SysTenantImpersonationSession
        {
            TenantId = tenant.PublicId,
            ImpersonatedByUserId = actorId,
            StartedAt = now,
            ExpiresAt = now.AddMinutes(30),
            IsActive = true,
            Reason = reason.Trim(),
            CreatedAt = now
        };
        context.SysTenantImpersonationSessions.Add(session);

        var actorName = await GetActorNameAsync(actorId, cancellationToken);
        context.SysAuditLogs.Add(new SysAuditLog
        {
            TenantId = tenant.PublicId,
            TableName = "Sys_TenantImpersonationSessions",
            ActionType = "TENANT_IMPERSONATION_STARTED",
            RecordId = session.PublicId.ToString(),
            UserId = actorId,
            Username = actorName,
            FunctionCode = "TENANT_IMPERSONATION",
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new
            {
                session.TenantId,
                session.ImpersonatedByUserId,
                session.StartedAt,
                session.ExpiresAt,
                session.Reason
            }),
            CreatedAt = now
        });
        await context.SaveChangesAsync(cancellationToken);

        var token = jwtService.CreateTenantImpersonationToken(
            actorId.ToString(),
            tenant.PublicId,
            session.PublicId);
        return new TenantImpersonationResponse(
            session.PublicId,
            token.Token,
            new DateTimeOffset(DateTime.SpecifyKind(token.ExpiresAt, DateTimeKind.Utc)),
            tenant.PublicId,
            tenant.Name,
            tenant.TenantCode);
    }

    public async Task<EndTenantImpersonationResponse?> EndAsync(
        Guid sessionId,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var session = await context.SysTenantImpersonationSessions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.PublicId == sessionId, cancellationToken);
        if (session == null || session.ImpersonatedByUserId != actorId)
            return null;
        if (!session.IsActive || session.ExpiresAt <= DateTime.UtcNow)
            throw new InvalidOperationException("Phiên hỗ trợ đã kết thúc hoặc hết hạn.");

        var now = DateTime.UtcNow;
        session.IsActive = false;
        var actorName = await GetActorNameAsync(actorId, cancellationToken);
        context.SysAuditLogs.Add(new SysAuditLog
        {
            TenantId = session.TenantId,
            TableName = "Sys_TenantImpersonationSessions",
            ActionType = "TENANT_IMPERSONATION_ENDED",
            RecordId = session.PublicId.ToString(),
            UserId = actorId,
            Username = actorName,
            FunctionCode = "TENANT_IMPERSONATION",
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new
            {
                session.TenantId,
                session.ImpersonatedByUserId,
                EndedAt = now
            }),
            CreatedAt = now
        });
        await context.SaveChangesAsync(cancellationToken);
        return new EndTenantImpersonationResponse(
            session.PublicId,
            new DateTimeOffset(DateTime.SpecifyKind(now, DateTimeKind.Utc)));
    }

    public Task<bool> IsSessionActiveAsync(
        Guid sessionId,
        Guid tenantId,
        CancellationToken cancellationToken) =>
        context.SysTenantImpersonationSessions
            .IgnoreQueryFilters()
            .AnyAsync(session => session.PublicId == sessionId
                && session.TenantId == tenantId
                && session.IsActive
                && session.ExpiresAt > DateTime.UtcNow
                && !session.IsDeleted,
                cancellationToken);

    private async Task<string?> GetActorNameAsync(Guid actorId, CancellationToken cancellationToken) =>
        await context.Users.IgnoreQueryFilters()
            .Where(user => user.PublicId == actorId)
            .Select(user => user.Username)
            .FirstOrDefaultAsync(cancellationToken);
}
