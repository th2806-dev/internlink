using FluentAssertions;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Tests.Services;

public class AppDbContextTenantTests
{
    [Fact]
    public async Task TenantQueryFilter_ShouldOnlyReturnCurrentTenantData()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        await using (var seedContext = new AppDbContext(options))
        {
            seedContext.Departments.AddRange(
                new Department { TenantId = tenantA, Code = "A", Name = "Tenant A" },
                new Department { TenantId = tenantB, Code = "B", Name = "Tenant B" });
            await seedContext.SaveChangesAsync();
        }

        var tenantContext = new ScopedTenantContext();
        tenantContext.SetTenantId(tenantA);
        await using var tenantDb = new AppDbContext(options, tenantContext);

        var departments = await tenantDb.Departments.ToListAsync();

        departments.Should().ContainSingle().Which.Code.Should().Be("A");
    }

    [Fact]
    public async Task TenantQueryFilter_ShouldPreserveWebhookSoftDeleteFilter()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var tenantId = Guid.NewGuid();

        await using (var seedContext = new AppDbContext(options))
        {
            seedContext.SysWebhooks.AddRange(
                new SysWebhook
                {
                    TenantId = tenantId,
                    WebhookUrl = "https://example.test/active",
                    EventType = "test",
                    SecretKey = "active"
                },
                new SysWebhook
                {
                    TenantId = tenantId,
                    WebhookUrl = "https://example.test/deleted",
                    EventType = "test",
                    SecretKey = "deleted",
                    IsDeleted = true
                });
            await seedContext.SaveChangesAsync();
        }

        var tenantContext = new ScopedTenantContext();
        tenantContext.SetTenantId(tenantId);
        await using var tenantDb = new AppDbContext(options, tenantContext);

        var webhooks = await tenantDb.SysWebhooks.ToListAsync();

        webhooks.Should().ContainSingle().Which.WebhookUrl.Should().EndWith("/active");
    }

    [Fact]
    public async Task SaveChanges_ShouldRejectWritesForAnotherTenant()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var tenantContext = new ScopedTenantContext();
        tenantContext.SetTenantId(Guid.NewGuid());
        await using var db = new AppDbContext(options, tenantContext);
        db.Departments.Add(new Department
        {
            TenantId = Guid.NewGuid(),
            Code = "OTHER",
            Name = "Other tenant"
        });

        var save = () => db.SaveChangesAsync();

        await save.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task SeedTenantAsync_ShouldCreateDefaultTenantAndLicenseOnce()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var tenantContext = new ScopedTenantContext();
        await using var db = new AppDbContext(options, tenantContext);

        await SystemRbacSeeder.SeedTenantAsync(db, tenantContext);
        await SystemRbacSeeder.SeedTenantAsync(db, tenantContext);

        var tenant = await db.SysTenants.SingleAsync();
        var license = await db.SysTenantLicenses.SingleAsync();
        tenant.PublicId.Should().Be(SysTenant.DefaultTenantId);
        tenant.TenantCode.Should().Be("DEFAULT-CAMPUS");
        license.TenantId.Should().Be(SysTenant.DefaultTenantId);
        license.MaxStudentsQuota.Should().Be(5000);
        license.ValidTo.Should().BeAfter(license.ValidFrom);
    }
}
