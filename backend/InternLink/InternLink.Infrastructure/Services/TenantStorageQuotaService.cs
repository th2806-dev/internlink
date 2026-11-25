using InternLink.Application.Exceptions;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class TenantStorageQuotaService : ITenantStorageQuotaService
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _environment;

    public TenantStorageQuotaService(AppDbContext db, IWebHostEnvironment environment)
    {
        _db = db;
        _environment = environment;
    }

    public async Task ReconcileUsageIfNeededAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var license = await GetCurrentLicenseAsync(tenantId, cancellationToken);
        if (license != null)
            await InitializeUsageIfNeededAsync(license, cancellationToken);
    }

    public async Task ReserveAsync(Guid tenantId, long bytes, CancellationToken cancellationToken = default)
    {
        if (bytes < 0)
            throw new ArgumentOutOfRangeException(nameof(bytes));
        if (bytes == 0)
            return;

        var now = DateTime.UtcNow;
        var license = await GetUsableLicenseAsync(tenantId, now, cancellationToken);
        if (license == null)
            throw new InvalidOperationException("Tenant không có gói bản quyền đang hoạt động để lưu tệp.");

        await InitializeUsageIfNeededAsync(license, cancellationToken);

        if (_db.Database.IsRelational())
        {
            var affected = await GetUsableLicenseQuery(tenantId, now)
                .Where(item => item.PublicId == license.PublicId)
                .Where(item =>
                    item.StorageUsageInitializedAt != null &&
                    item.CurrentStorageBytes <= item.StorageQuotaBytes - bytes)
                .ExecuteUpdateAsync(
                    updates => updates.SetProperty(
                        item => item.CurrentStorageBytes,
                        item => item.CurrentStorageBytes + bytes),
                    cancellationToken);
            if (affected > 0)
                return;
        }
        else
        {
            license = await GetUsableLicenseAsync(tenantId, now, cancellationToken);
            if (license != null &&
                license.StorageUsageInitializedAt != null &&
                license.CurrentStorageBytes <= license.StorageQuotaBytes - bytes)
            {
                license.CurrentStorageBytes += bytes;
                await _db.SaveChangesAsync(cancellationToken);
                return;
            }
        }

        license = await GetUsableLicenseQuery(tenantId, now)
            .AsNoTracking()
            .OrderByDescending(item => item.ValidFrom)
            .ThenByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (license == null)
            throw new InvalidOperationException("Tenant không có gói bản quyền đang hoạt động để lưu tệp.");

        throw new TenantStorageQuotaExceededException(
            license.CurrentStorageBytes,
            license.StorageQuotaBytes,
            bytes);
    }

    public async Task ReleaseAsync(Guid tenantId, long bytes, CancellationToken cancellationToken = default)
    {
        if (bytes < 0)
            throw new ArgumentOutOfRangeException(nameof(bytes));
        if (bytes == 0)
            return;

        var license = await GetCurrentLicenseAsync(tenantId, cancellationToken);
        if (license == null)
            throw new InvalidOperationException("Không tìm thấy giấy phép tenant để cập nhật dung lượng đã giải phóng.");

        if (_db.Database.IsRelational())
        {
            await _db.SysTenantLicenses
                .IgnoreQueryFilters()
                .Where(item =>
                    item.PublicId == license.PublicId &&
                    item.TenantId == tenantId &&
                    !item.IsDeleted)
                .ExecuteUpdateAsync(
                    updates => updates.SetProperty(
                        item => item.CurrentStorageBytes,
                        item => item.CurrentStorageBytes >= bytes
                            ? item.CurrentStorageBytes - bytes
                            : 0L),
                    cancellationToken);
            return;
        }

        license.CurrentStorageBytes = Math.Max(0, license.CurrentStorageBytes - bytes);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task InitializeUsageIfNeededAsync(
        SysTenantLicense license,
        CancellationToken cancellationToken)
    {
        if (license.StorageUsageInitializedAt != null)
            return;

        var usage = await CalculateExistingUsageAsync(license.TenantId, cancellationToken);
        var initializedAt = DateTime.UtcNow;

        if (_db.Database.IsRelational())
        {
            await _db.SysTenantLicenses
                .IgnoreQueryFilters()
                .Where(item =>
                    item.TenantId == license.TenantId &&
                    item.PublicId == license.PublicId &&
                    item.StorageUsageInitializedAt == null)
                .ExecuteUpdateAsync(
                    updates => updates
                        .SetProperty(item => item.CurrentStorageBytes, usage)
                        .SetProperty(item => item.StorageUsageInitializedAt, initializedAt),
                    cancellationToken);
            return;
        }

        license.CurrentStorageBytes = usage;
        license.StorageUsageInitializedAt = initializedAt;
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<long> CalculateExistingUsageAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var paths = new List<string?>();
        paths.AddRange(await _db.Documents.IgnoreQueryFilters()
            .Where(item => item.TenantId == tenantId)
            .Select(item => item.FilePath)
            .ToListAsync(cancellationToken));
        paths.AddRange(await _db.DocumentVersions.IgnoreQueryFilters()
            .Where(item => item.TenantId == tenantId)
            .Select(item => item.FilePath)
            .ToListAsync(cancellationToken));
        paths.AddRange(await _db.WeeklyReports.IgnoreQueryFilters()
            .Where(item => item.TenantId == tenantId)
            .Select(item => item.FileUrl)
            .ToListAsync(cancellationToken));
        paths.AddRange(await _db.WeeklyReportVersions.IgnoreQueryFilters()
            .Where(item => item.TenantId == tenantId)
            .Select(item => item.FileUrl)
            .ToListAsync(cancellationToken));
        paths.AddRange(await _db.Submissions.IgnoreQueryFilters()
            .Where(item => item.TenantId == tenantId)
            .Select(item => item.FileUrl)
            .ToListAsync(cancellationToken));
        paths.AddRange(await _db.SubmissionAssets.IgnoreQueryFilters()
            .Where(item => item.TenantId == tenantId && item.AssetType == "file")
            .Select(item => item.FileUrl)
            .ToListAsync(cancellationToken));
        paths.AddRange(await _db.Users.IgnoreQueryFilters()
            .Where(item =>
                item.TenantId == tenantId &&
                item.Role != InternLink.Domain.Enums.Role.SuperAdmin)
            .Select(item => item.AvatarUrl)
            .ToListAsync(cancellationToken));

        var uniqueFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        long totalBytes = 0;
        foreach (var path in paths)
        {
            var fullPath = TenantManagedFilePathResolver.Resolve(
                path,
                _environment.WebRootPath,
                _environment.ContentRootPath);
            if (fullPath == null || !uniqueFiles.Add(fullPath) || !File.Exists(fullPath))
                continue;

            totalBytes = checked(totalBytes + new FileInfo(fullPath).Length);
        }

        return totalBytes;
    }

    private Task<SysTenantLicense?> GetUsableLicenseAsync(
        Guid tenantId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var query = GetUsableLicenseQuery(tenantId, now);
        if (_db.Database.IsRelational())
            query = query.AsNoTracking();

        return query
            .OrderByDescending(item => item.ValidFrom)
            .ThenByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private IQueryable<SysTenantLicense> GetUsableLicenseQuery(Guid tenantId, DateTime now) =>
        _db.SysTenantLicenses
            .IgnoreQueryFilters()
            .Where(item =>
                item.TenantId == tenantId &&
                !item.IsDeleted &&
                item.IsActive &&
                item.ValidFrom <= now &&
                item.ValidTo > now);

    private Task<SysTenantLicense?> GetCurrentLicenseAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var query = GetCurrentLicenseQuery(tenantId);
        if (_db.Database.IsRelational())
            query = query.AsNoTracking();

        return query
            .OrderByDescending(item => item.ValidFrom)
            .ThenByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private IQueryable<SysTenantLicense> GetCurrentLicenseQuery(Guid tenantId) =>
        _db.SysTenantLicenses
            .IgnoreQueryFilters()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted && item.IsActive)
            .OrderByDescending(item => item.ValidFrom)
            .ThenByDescending(item => item.CreatedAt)
            .Take(1);
}
