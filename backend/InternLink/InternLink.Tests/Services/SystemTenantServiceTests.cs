using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.System;
using InternLink.Domain.Entities;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Moq;
using System.Text.Json;

namespace InternLink.Tests.Services;

public sealed class SystemTenantServiceTests
{
    [Fact]
    public async Task UpdateStatusAsync_WritesTenantUpdateAuditRecord()
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
            TenantCode = "HCMUT",
            Name = "Đại học Bách Khoa",
            LegalName = "Trường Đại học Bách Khoa",
            Subdomain = "hcmut",
            ContactEmail = string.Empty,
            ContactPhone = string.Empty,
            Status = TenantStatus.Active
        };
        db.SysTenants.Add(tenant);
        await db.SaveChangesAsync();

        var service = new SystemTenantService(db, CreateStorageQuotaService(db));
        var updated = await service.UpdateStatusAsync(
            tenant.PublicId,
            TenantStatus.Suspended,
            CancellationToken.None);

        Assert.NotNull(updated);
        Assert.Equal(TenantStatus.Suspended, updated.Tenant.Status);
        var statusAudits = await db.SysAuditLogs.IgnoreQueryFilters()
            .Where(item => item.TenantId == tenant.PublicId
                && item.TableName == "Sys_Tenants"
                && item.ActionType == "UPDATE")
            .ToListAsync();
        Assert.Single(statusAudits);
        using var newValues = JsonDocument.Parse(statusAudits[0].NewValuesJson!);
        Assert.Equal((int)TenantStatus.Suspended, newValues.RootElement.GetProperty("Status").GetInt32());
    }

    [Fact]
    public async Task CreateTenantAsync_CreatesTenantAndInitialLicenseTogether()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var tenantContext = new ScopedTenantContext();
        tenantContext.SetTenantId(SysTenant.DefaultTenantId);
        tenantContext.SetPlatformAdmin(true);
        await using var db = new AppDbContext(options, tenantContext);
        await db.Database.EnsureCreatedAsync();
        var service = new SystemTenantService(db, CreateStorageQuotaService(db));

        var result = await service.CreateTenantAsync(new InternLink.Application.DTOs.CreateTenantRequest
        {
            TenantCode = "hcmut",
            Name = "Đại học Bách Khoa",
            Subdomain = "HCMUT",
            TenantType = TenantType.University,
            PlanCode = "PRO",
            ValidTo = DateTimeOffset.UtcNow.AddYears(1)
        }, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("HCMUT", result.Tenant.TenantCode);
        var license = await db.SysTenantLicenses.IgnoreQueryFilters()
            .SingleAsync(item => item.TenantId == result.Tenant.Id);
        Assert.Equal(LicenseTier.Professional, license.LicenseTier);
        Assert.Equal(2000, license.MaxStudentsQuota);
        Assert.True(license.IsActive);
        var storageUsageInitializedAt = DateTime.UtcNow.AddMinutes(-1);
        license.CurrentStorageBytes = 987654;
        license.StorageUsageInitializedAt = storageUsageInitializedAt;
        await db.SaveChangesAsync();

        var renewed = await service.UpdateLicenseAsync(
            result.Tenant.Id,
            new InternLink.Application.DTOs.UpdateTenantLicenseRequest
            {
                PlanCode = "ENTERPRISE",
                ValidTo = DateTimeOffset.UtcNow.AddYears(2),
                AutoRenew = true
            },
            CancellationToken.None);
        Assert.NotNull(renewed);
        Assert.Equal(10000, renewed.MaxStudentsQuota);
        Assert.Equal(500, renewed.MaxLecturersQuota);
        Assert.Equal(500L * 1024 * 1024 * 1024, renewed.StorageQuotaBytes);
        var renewedLicense = await db.SysTenantLicenses.IgnoreQueryFilters()
            .OrderByDescending(item => item.ValidFrom)
            .FirstAsync(item => item.TenantId == result.Tenant.Id);
        Assert.Equal(987654L, renewedLicense.CurrentStorageBytes);
        Assert.Equal(storageUsageInitializedAt, renewedLicense.StorageUsageInitializedAt);
        Assert.Equal(2, renewed.History.Count);
        Assert.Contains(renewed.History, item => item.MaxStudentsQuota == 2000);
        Assert.Contains(renewed.History, item => item.MaxStudentsQuota == 10000);

        db.Students.Add(new Student
        {
            TenantId = result.Tenant.Id,
            StudentCode = "SV001",
            FullName = "Sinh viên kiểm thử"
        });
        db.Lecturers.Add(new Lecturer
        {
            TenantId = result.Tenant.Id,
            StaffCode = "GV001",
            FullName = "Giảng viên kiểm thử"
        });
        await db.SaveChangesAsync();

        var studio = await service.GetLicenseAsync(result.Tenant.Id, CancellationToken.None);
        Assert.NotNull(studio);
        Assert.Equal(1, studio.ActiveStudents);
        Assert.Equal(1, studio.ActiveLecturers);
    }

    private static ITenantStorageQuotaService CreateStorageQuotaService(AppDbContext db)
    {
        var environment = new Mock<IWebHostEnvironment>();
        environment.Setup(item => item.ContentRootPath).Returns(Directory.GetCurrentDirectory());
        environment.Setup(item => item.WebRootPath).Returns(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"));
        return new TenantStorageQuotaService(db, environment.Object);
    }
}
