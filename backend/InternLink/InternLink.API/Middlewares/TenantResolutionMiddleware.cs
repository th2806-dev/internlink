using System.Security.Claims;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Middlewares;

public sealed class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantResolutionMiddleware> _logger;
    private readonly string _baseDomain;

    public TenantResolutionMiddleware(
        RequestDelegate next,
        IConfiguration configuration,
        ILogger<TenantResolutionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
        _baseDomain = configuration["Tenancy:BaseDomain"]?.Trim().Trim('.').ToLowerInvariant()
            ?? "internlink.vn";
    }

    public async Task InvokeAsync(
        HttpContext context,
        AppDbContext db,
        IScopedTenantContext tenantContext,
        ITenantImpersonationService impersonationService)
    {
        if (context.User.HasClaim("is_impersonating", "true"))
        {
            if (!Guid.TryParse(context.User.FindFirstValue("impersonation_session_id"), out var sessionId)
                || !Guid.TryParse(context.User.FindFirstValue("tenant_id"), out var impersonatedTenantId)
                || !await impersonationService.IsSessionActiveAsync(
                    sessionId,
                    impersonatedTenantId,
                    context.RequestAborted))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }
        }

        var hostResolution = await ResolveFromHostAsync(db, context.Request.Host.Host);
        SysTenant? tenant = hostResolution.Tenant;
        var explicitHostTenant = hostResolution.IsTenantHost;

        if (explicitHostTenant && tenant == null)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        if (tenant == null && !string.IsNullOrWhiteSpace(context.Request.Headers["X-Tenant-Id"]))
        {
            if (context.User.Identity?.IsAuthenticated != true)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }

            tenant = await ResolveTenantIdentifierAsync(db, context.Request.Headers["X-Tenant-Id"].ToString());
            if (tenant == null)
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }
        }

        if (tenant == null)
        {
            var claimTenantId = context.User.FindFirstValue("tenant_id");
            if (!string.IsNullOrWhiteSpace(claimTenantId))
            {
                if (!Guid.TryParse(claimTenantId, out var tenantId))
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return;
                }

                tenant = await ResolveTenantByIdAsync(db, tenantId);
                if (tenant == null)
                {
                    context.Response.StatusCode = StatusCodes.Status404NotFound;
                    return;
                }
            }
        }

        if (tenant == null)
            tenant = await ResolveTenantByIdAsync(db, SysTenant.DefaultTenantId);

        if (tenant == null)
        {
            _logger.LogError("Default tenant {TenantId} is missing; tenant resolution cannot continue.", SysTenant.DefaultTenantId);
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            return;
        }

        if (tenant.Status is not (TenantStatus.Active or TenantStatus.Trial))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }

        if (context.User.Identity?.IsAuthenticated == true && !context.User.IsInRole("SuperAdmin"))
        {
            var callerTenantId = context.User.FindFirstValue("tenant_id")
                ?? context.User.FindFirstValue("api_key_tenant_id");
            var isLegacyDefaultTenantUser = callerTenantId == null
                && tenant.PublicId == SysTenant.DefaultTenantId
                && !explicitHostTenant
                && string.IsNullOrWhiteSpace(context.Request.Headers["X-Tenant-Id"]);

            if (!isLegacyDefaultTenantUser
                && (!Guid.TryParse(callerTenantId, out var callerTenantGuid)
                    || callerTenantGuid != tenant.PublicId))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }
        }

        tenantContext.SetTenantId(tenant.PublicId);
        tenantContext.SetPlatformAdmin(context.User.IsInRole("SuperAdmin"));
        await _next(context);
    }

    private async Task<(SysTenant? Tenant, bool IsTenantHost)> ResolveFromHostAsync(
        AppDbContext db,
        string host)
    {
        var normalizedHost = host.TrimEnd('.').ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalizedHost))
            return (null, false);

        var tenant = await db.SysTenants.AsNoTracking()
            .FirstOrDefaultAsync(item =>
                !item.IsDeleted
                && item.Domain != null
                && item.Domain.ToLower() == normalizedHost);
        if (tenant != null)
            return (tenant, true);

        var suffix = $".{_baseDomain}";
        if (!normalizedHost.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            return (null, false);

        var subdomain = normalizedHost[..^suffix.Length];
        if (string.IsNullOrWhiteSpace(subdomain) || subdomain.Contains('.'))
            return (null, false);

        if (subdomain is "www" or "api" or "app" or "admin" or "portal")
            return (null, false);

        tenant = await db.SysTenants.AsNoTracking()
            .FirstOrDefaultAsync(item =>
                !item.IsDeleted
                && item.Subdomain != null
                && item.Subdomain.ToLower() == subdomain);
        return (tenant, true);
    }

    private static async Task<SysTenant?> ResolveTenantIdentifierAsync(AppDbContext db, string identifier)
    {
        var normalized = identifier.Trim();
        if (Guid.TryParse(normalized, out var tenantId))
            return await ResolveTenantByIdAsync(db, tenantId);

        return await db.SysTenants.AsNoTracking()
            .FirstOrDefaultAsync(item =>
                !item.IsDeleted
                && item.TenantCode.ToLower() == normalized.ToLower());
    }

    private static Task<SysTenant?> ResolveTenantByIdAsync(AppDbContext db, Guid tenantId) =>
        db.SysTenants.AsNoTracking()
            .FirstOrDefaultAsync(item => !item.IsDeleted && item.PublicId == tenantId);
}
