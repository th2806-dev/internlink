using InternLink.Domain.Entities;
using InternLink.Domain.Entities.System;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using InternLink.Shared.Interfaces;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace InternLink.Tests.Services;

public sealed class TenantImpersonationServiceTests
{
    [Fact]
    public async Task StartAndEnd_UsesAuditedTimeLimitedSessionAndRevokesIt()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var tenantContext = new ScopedTenantContext();
        tenantContext.SetTenantId(SysTenant.DefaultTenantId);
        tenantContext.SetPlatformAdmin(true);
        await using var db = new AppDbContext(options, tenantContext);
        var tenant = new SysTenant
        {
            TenantCode = "SUPPORT1",
            Name = "Support Test Tenant",
            LegalName = "Support Test Tenant Ltd.",
            Subdomain = "support-test",
            ContactEmail = string.Empty,
            ContactPhone = string.Empty,
            Status = TenantStatus.Active
        };
        var actor = new User
        {
            TenantId = SysTenant.DefaultTenantId,
            Username = "platform-owner",
            PasswordHash = "hashed-password",
            Role = Role.SuperAdmin,
            IsActive = true
        };
        db.SysTenants.Add(tenant);
        db.Users.Add(actor);
        await db.SaveChangesAsync();

        var jwt = new Mock<IJwtService>();
        jwt.Setup(service => service.CreateTenantImpersonationToken(
                actor.PublicId.ToString(),
                tenant.PublicId,
                It.IsAny<Guid>()))
            .Returns(("temporary.jwt.token", DateTime.UtcNow.AddMinutes(30)));
        var service = new TenantImpersonationService(db, jwt.Object);

        var started = await service.StartAsync(
            tenant.PublicId,
            actor.PublicId,
            "Investigate tenant login issue",
            "127.0.0.1",
            CancellationToken.None);

        Assert.NotNull(started);
        Assert.Equal(tenant.PublicId, started.TenantId);
        Assert.Equal("temporary.jwt.token", started.Token);
        Assert.True(await service.IsSessionActiveAsync(
            started.SessionId,
            tenant.PublicId,
            CancellationToken.None));

        var ended = await service.EndAsync(
            started.SessionId,
            actor.PublicId,
            "127.0.0.1",
            CancellationToken.None);

        Assert.NotNull(ended);
        Assert.False(await service.IsSessionActiveAsync(
            started.SessionId,
            tenant.PublicId,
            CancellationToken.None));
        var supportAuditActions = await db.SysAuditLogs.IgnoreQueryFilters()
            .Where(log => log.ActionType == "TENANT_IMPERSONATION_STARTED"
                || log.ActionType == "TENANT_IMPERSONATION_ENDED")
            .Select(log => log.ActionType)
            .ToListAsync();
        Assert.Equal(
            new[] { "TENANT_IMPERSONATION_ENDED", "TENANT_IMPERSONATION_STARTED" },
            supportAuditActions.OrderBy(action => action, StringComparer.Ordinal).ToArray());
    }

    [Fact]
    public async Task Start_RejectsSuspendedTenant()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var tenantContext = new ScopedTenantContext();
        tenantContext.SetTenantId(SysTenant.DefaultTenantId);
        tenantContext.SetPlatformAdmin(true);
        await using var db = new AppDbContext(options, tenantContext);
        var tenant = new SysTenant
        {
            TenantCode = "SUPPORT2",
            Name = "Suspended Tenant",
            LegalName = "Suspended Tenant Ltd.",
            Subdomain = "support-suspended",
            ContactEmail = string.Empty,
            ContactPhone = string.Empty,
            Status = TenantStatus.Suspended
        };
        db.SysTenants.Add(tenant);
        await db.SaveChangesAsync();

        var service = new TenantImpersonationService(db, Mock.Of<IJwtService>());

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.StartAsync(
            tenant.PublicId,
            Guid.NewGuid(),
            "Suspended tenant test",
            null,
            CancellationToken.None));
    }
}
