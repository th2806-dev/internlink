using FluentAssertions;
using InternLink.Application.Exceptions;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternLink.Tests.Services;

public class TenantStorageQuotaServiceTests
{
    [Fact]
    public async Task ReserveAsync_ReconcilesLegacyFilesDeduplicatesVersionsAndEnforcesBoundary()
    {
        var tenantId = Guid.NewGuid();
        var root = Path.Combine(Path.GetTempPath(), $"internlink-storage-{Guid.NewGuid():N}");
        var relativePath = "uploads/documents/legacy.pdf";
        var filePath = Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
        await File.WriteAllBytesAsync(filePath, new byte[] { 1, 2, 3, 4 });

        try
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            await using var db = new AppDbContext(options);
            var documentId = Guid.NewGuid();
            db.Documents.Add(new Document
            {
                Id = documentId,
                TenantId = tenantId,
                FilePath = relativePath,
                FileName = "legacy.pdf",
                Title = "Legacy document",
                MimeType = "application/pdf",
                CreatedAt = DateTime.UtcNow
            });
            db.DocumentVersions.Add(new DocumentVersion
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                DocumentId = documentId,
                VersionNumber = 1,
                FilePath = relativePath,
                FileName = "legacy.pdf",
                FileSize = 4,
                MimeType = "application/pdf",
                UploadedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            });
            db.SysTenantLicenses.Add(new SysTenantLicense
            {
                TenantId = tenantId,
                StorageQuotaBytes = 5,
                CurrentStorageBytes = 0,
                ValidFrom = DateTime.UtcNow.AddDays(-1),
                ValidTo = DateTime.UtcNow.AddDays(1),
                IsActive = true
            });
            await db.SaveChangesAsync();

            var environment = new Mock<IWebHostEnvironment>();
            environment.Setup(item => item.ContentRootPath).Returns(root);
            environment.Setup(item => item.WebRootPath).Returns(Path.Combine(root, "wwwroot"));
            var service = new TenantStorageQuotaService(db, environment.Object);

            await service.ReserveAsync(tenantId, 1);

            var license = await db.SysTenantLicenses.IgnoreQueryFilters()
                .SingleAsync(item => item.TenantId == tenantId);
            license.CurrentStorageBytes.Should().Be(5);
            license.StorageUsageInitializedAt.Should().NotBeNull();

            var exception = await Assert.ThrowsAsync<TenantStorageQuotaExceededException>(
                () => service.ReserveAsync(tenantId, 1));
            exception.CurrentBytes.Should().Be(5);
            exception.QuotaBytes.Should().Be(5);
        }
        finally
        {
            if (Directory.Exists(root))
                Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task ReserveAsync_RejectsNegativeByteCount()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var db = new AppDbContext(options);
        var service = new TenantStorageQuotaService(db, Mock.Of<IWebHostEnvironment>());

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(
            () => service.ReserveAsync(Guid.NewGuid(), -1));
    }

    [Fact]
    public async Task ReserveAsync_UpdatesOnlyTheRequestedTenant()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var db = new AppDbContext(options);
        var now = DateTime.UtcNow;
        db.SysTenantLicenses.AddRange(
            new SysTenantLicense
            {
                TenantId = tenantA,
                StorageQuotaBytes = 10,
                StorageUsageInitializedAt = now,
                ValidFrom = now.AddDays(-1),
                ValidTo = now.AddDays(1),
                IsActive = true
            },
            new SysTenantLicense
            {
                TenantId = tenantB,
                StorageQuotaBytes = 10,
                StorageUsageInitializedAt = now,
                ValidFrom = now.AddDays(-1),
                ValidTo = now.AddDays(1),
                IsActive = true
            });
        await db.SaveChangesAsync();

        var environment = new Mock<IWebHostEnvironment>();
        environment.Setup(item => item.ContentRootPath).Returns(Path.GetTempPath());
        var service = new TenantStorageQuotaService(db, environment.Object);

        await service.ReserveAsync(tenantA, 4);

        var licenses = await db.SysTenantLicenses.IgnoreQueryFilters().ToListAsync();
        licenses.Single(item => item.TenantId == tenantA).CurrentStorageBytes.Should().Be(4);
        licenses.Single(item => item.TenantId == tenantB).CurrentStorageBytes.Should().Be(0);
    }
}
