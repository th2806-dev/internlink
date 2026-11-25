using FluentAssertions;
using InternLink.API.Middlewares;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace InternLink.Tests.Middlewares;

public class TenantResolutionMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_UnknownTenantSubdomain_ShouldFailClosed()
    {
        await using var db = CreateDb();
        var nextInvoked = false;
        var middleware = CreateMiddleware(_ =>
        {
            nextInvoked = true;
            return Task.CompletedTask;
        });
        var context = new DefaultHttpContext();
        context.Request.Host = new HostString("unknown.internlink.vn");

        await middleware.InvokeAsync(context, db, new TestTenantContext(), Mock.Of<ITenantImpersonationService>());

        context.Response.StatusCode.Should().Be(StatusCodes.Status404NotFound);
        nextInvoked.Should().BeFalse();
    }

    [Fact]
    public async Task InvokeAsync_UnauthenticatedTenantHeader_ShouldRejectRequest()
    {
        await using var db = CreateDb();
        var middleware = CreateMiddleware(_ => Task.CompletedTask);
        var context = new DefaultHttpContext();
        context.Request.Host = new HostString("localhost");
        context.Request.Headers["X-Tenant-Id"] = Guid.NewGuid().ToString();

        await middleware.InvokeAsync(context, db, new TestTenantContext(), Mock.Of<ITenantImpersonationService>());

        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public async Task InvokeAsync_TenantSubdomain_ShouldTakePrecedenceOverHeader()
    {
        await using var db = CreateDb();
        var hostTenantId = Guid.NewGuid();
        var headerTenantId = Guid.NewGuid();
        db.SysTenants.AddRange(
            CreateTenant(hostTenantId, "campus"),
            CreateTenant(headerTenantId, "other"));
        await db.SaveChangesAsync();

        var middleware = CreateMiddleware(_ => Task.CompletedTask);
        var context = new DefaultHttpContext();
        context.Request.Host = new HostString("campus.internlink.vn");
        context.Request.Headers["X-Tenant-Id"] = "OTHER";
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.Role, "SuperAdmin") },
            "test"));
        var tenantContext = new TestTenantContext();

        await middleware.InvokeAsync(context, db, tenantContext, Mock.Of<ITenantImpersonationService>());

        tenantContext.TenantId.Should().Be(hostTenantId);
        tenantContext.IsPlatformAdmin.Should().BeTrue();
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static TenantResolutionMiddleware CreateMiddleware(RequestDelegate next)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Tenancy:BaseDomain"] = "internlink.vn"
            })
            .Build();
        return new TenantResolutionMiddleware(
            next,
            configuration,
            NullLogger<TenantResolutionMiddleware>.Instance);
    }

    private static SysTenant CreateTenant(Guid id, string subdomain) => new()
    {
        PublicId = id,
        TenantCode = subdomain.ToUpperInvariant(),
        Name = subdomain,
        LegalName = subdomain,
        Subdomain = subdomain,
        ContactEmail = string.Empty,
        ContactPhone = string.Empty,
        Status = TenantStatus.Active
    };

    private sealed class TestTenantContext : InternLink.Application.Interfaces.IScopedTenantContext
    {
        public Guid TenantId { get; private set; }
        public bool IsResolved => TenantId != Guid.Empty;
        public bool IsPlatformAdmin { get; private set; }

        public void SetTenantId(Guid tenantId) => TenantId = tenantId;
        public void SetPlatformAdmin(bool isPlatformAdmin) => IsPlatformAdmin = isPlatformAdmin;
    }
}
