using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class SystemTenantService(
    AppDbContext context,
    ITenantStorageQuotaService storageQuota) : ISystemTenantService
{
    public async Task<TenantDirectoryPage> GetTenantsAsync(
        TenantDirectoryQuery query,
        CancellationToken cancellationToken)
    {
        var tenantsQuery = context.SysTenants.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => !item.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            tenantsQuery = tenantsQuery.Where(item =>
                item.Name.ToLower().Contains(search)
                || item.TenantCode.ToLower().Contains(search)
                || item.Subdomain.ToLower().Contains(search));
        }

        if (query.TenantType.HasValue)
            tenantsQuery = tenantsQuery.Where(item => item.TenantType == query.TenantType.Value);
        if (query.Status.HasValue)
            tenantsQuery = tenantsQuery.Where(item => item.Status == query.Status.Value);

        var totalCount = await tenantsQuery.CountAsync(cancellationToken);
        var tenants = await tenantsQuery
            .OrderBy(item => item.Name)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        var ids = tenants.Select(item => item.PublicId).ToArray();
        if (ids.Length == 0)
            return new TenantDirectoryPage([], query.Page, query.PageSize, totalCount);

        var departmentCounts = await context.Departments.IgnoreQueryFilters()
            .Where(item => ids.Contains(item.TenantId) && !item.IsDeleted)
            .GroupBy(item => item.TenantId)
            .Select(group => new { TenantId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.TenantId, item => item.Count, cancellationToken);

        var studentCounts = await context.Students.IgnoreQueryFilters()
            .Where(item => ids.Contains(item.TenantId) && !item.IsDeleted
                && (item.UserId == null || item.User != null && item.User.IsActive && !item.User.IsDeleted))
            .GroupBy(item => item.TenantId)
            .Select(group => new { TenantId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.TenantId, item => item.Count, cancellationToken);
        var lecturerCounts = await context.Lecturers.IgnoreQueryFilters()
            .Where(item => ids.Contains(item.TenantId) && !item.IsDeleted
                && (item.UserId == null || item.User != null && item.User.IsActive && !item.User.IsDeleted))
            .GroupBy(item => item.TenantId)
            .Select(group => new { TenantId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.TenantId, item => item.Count, cancellationToken);

        var licenses = await context.SysTenantLicenses.IgnoreQueryFilters()
            .Where(item => ids.Contains(item.TenantId) && !item.IsDeleted)
            .OrderByDescending(item => item.IsActive)
            .ThenByDescending(item => item.ValidFrom)
            .ThenByDescending(item => item.CreatedAt)
            .ToListAsync(cancellationToken);
        var latestLicenses = licenses
            .GroupBy(item => item.TenantId)
            .ToDictionary(group => group.Key, group => group.First());

        var rows = tenants.Select(tenant =>
        {
            var license = latestLicenses.GetValueOrDefault(tenant.PublicId);
            return new TenantDirectoryItem(
                tenant.PublicId,
                tenant.TenantCode,
                tenant.Name,
                tenant.LogoUrl,
                tenant.Subdomain,
                tenant.TenantType,
                tenant.Domain,
                tenant.ContactEmail,
                tenant.ContactPhone,
                tenant.Status,
                departmentCounts.GetValueOrDefault(tenant.PublicId),
                studentCounts.GetValueOrDefault(tenant.PublicId),
                lecturerCounts.GetValueOrDefault(tenant.PublicId),
                license?.LicenseTier,
                license?.MaxStudentsQuota,
                license == null ? null : ToOffset(license.ValidTo));
        }).ToArray();

        return new TenantDirectoryPage(rows, query.Page, query.PageSize, totalCount);
    }

    public async Task<TenantDetailsResponse?> GetTenantAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var tenant = await FindTenantAsync(id, cancellationToken);
        return tenant == null ? null : await ToDetailsAsync(tenant, cancellationToken);
    }

    public async Task<TenantDetailsResponse?> CreateTenantAsync(
        CreateTenantRequest request,
        CancellationToken cancellationToken)
    {
        var planCode = request.PlanCode.Trim().ToUpperInvariant();
        var plan = await GetActiveBillingPlanAsync(planCode, cancellationToken);
        if (plan == null)
            throw new ArgumentException("Gói bản quyền chưa được cấu hình.");

        var code = request.TenantCode.Trim().ToUpperInvariant();
        var subdomain = NormalizeSubdomain(request.Subdomain);
        var conflict = await context.SysTenants.IgnoreQueryFilters().AnyAsync(item =>
            !item.IsDeleted
            && (item.TenantCode.ToLower() == code.ToLower()
                || item.Subdomain.ToLower() == subdomain), cancellationToken);
        if (conflict)
            throw new TenantConflictException("Mã đơn vị hoặc subdomain đã được sử dụng.");

        var now = DateTime.UtcNow;
        var tenant = new SysTenant
        {
            TenantCode = code,
            Name = request.Name.Trim(),
            LegalName = string.IsNullOrWhiteSpace(request.LegalName)
                ? request.Name.Trim()
                : request.LegalName.Trim(),
            Subdomain = subdomain,
            TenantType = request.TenantType,
            ContactEmail = request.ContactEmail.Trim(),
            ContactPhone = request.ContactPhone.Trim(),
            Status = TenantStatus.Trial,
            CreatedAt = now
        };
        var license = new SysTenantLicense
        {
            TenantId = tenant.PublicId,
            LicenseTier = plan.LicenseTier,
            MaxStudentsQuota = plan.MaxStudentsQuota,
            MaxLecturersQuota = plan.MaxLecturersQuota,
            StorageQuotaBytes = plan.StorageQuotaBytes,
            ValidFrom = now,
            ValidTo = request.ValidTo.UtcDateTime,
            IsActive = true
        };

        context.SysTenants.Add(tenant);
        context.SysTenantLicenses.Add(license);
        await context.SaveChangesAsync(cancellationToken);
        return await ToDetailsAsync(tenant, cancellationToken);
    }

    public async Task<TenantDetailsResponse?> UpdateTenantAsync(
        Guid id,
        UpdateTenantRequest request,
        CancellationToken cancellationToken)
    {
        var tenant = await FindTenantAsync(id, cancellationToken);
        if (tenant == null)
            return null;

        var domain = string.IsNullOrWhiteSpace(request.Domain)
            ? null
            : request.Domain.Trim().TrimEnd('.').ToLowerInvariant();
        if (domain != null && await context.SysTenants.IgnoreQueryFilters().AnyAsync(item =>
                !item.IsDeleted && item.PublicId != id && item.Domain != null
                && item.Domain.ToLower() == domain, cancellationToken))
            throw new TenantConflictException("Domain đã được gán cho một đơn vị khác.");

        tenant.Name = request.Name.Trim();
        tenant.LegalName = request.LegalName.Trim();
        tenant.Domain = domain;
        tenant.ContactEmail = request.ContactEmail.Trim();
        tenant.ContactPhone = request.ContactPhone.Trim();
        await context.SaveChangesAsync(cancellationToken);
        return await ToDetailsAsync(tenant, cancellationToken);
    }

    public async Task<TenantDetailsResponse?> UpdateStatusAsync(
        Guid id,
        TenantStatus status,
        CancellationToken cancellationToken)
    {
        var tenant = await FindTenantAsync(id, cancellationToken);
        if (tenant == null)
            return null;

        tenant.Status = status;
        await context.SaveChangesAsync(cancellationToken);
        return await ToDetailsAsync(tenant, cancellationToken);
    }

    public async Task<TenantLicenseStudioResponse?> GetLicenseAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var tenant = await FindTenantAsync(tenantId, cancellationToken);
        if (tenant == null)
            return null;

        await storageQuota.ReconcileUsageIfNeededAsync(tenantId, cancellationToken);
        return await BuildLicenseResponseAsync(tenant, cancellationToken);
    }

    public async Task<TenantLicenseStudioResponse?> UpdateLicenseAsync(
        Guid tenantId,
        UpdateTenantLicenseRequest request,
        CancellationToken cancellationToken)
    {
        var tenant = await FindTenantAsync(tenantId, cancellationToken);
        if (tenant == null)
            return null;

        var planCode = request.PlanCode.Trim().ToUpperInvariant();
        var plan = await GetActiveBillingPlanAsync(planCode, cancellationToken);
        if (plan == null)
            throw new ArgumentException("Gói bản quyền chưa được cấu hình.");

        var licenses = await context.SysTenantLicenses.IgnoreQueryFilters()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted)
            .OrderByDescending(item => item.ValidFrom)
            .ToListAsync(cancellationToken);
        var currentLicense = licenses.FirstOrDefault(item => item.IsActive) ?? licenses.FirstOrDefault();
        foreach (var license in licenses.Where(item => item.IsActive))
            license.IsActive = false;

        var newLicense = new SysTenantLicense
        {
            TenantId = tenantId,
            LicenseTier = plan.LicenseTier,
            MaxStudentsQuota = plan.MaxStudentsQuota,
            MaxLecturersQuota = plan.MaxLecturersQuota,
            StorageQuotaBytes = plan.StorageQuotaBytes,
            CurrentStorageBytes = currentLicense?.CurrentStorageBytes ?? 0,
            StorageUsageInitializedAt = currentLicense?.StorageUsageInitializedAt,
            ValidFrom = DateTime.UtcNow,
            ValidTo = request.ValidTo.UtcDateTime,
            AutoRenew = request.AutoRenew,
            IsActive = true
        };
        context.SysTenantLicenses.Add(newLicense);
        await context.SaveChangesAsync(cancellationToken);
        await storageQuota.ReconcileUsageIfNeededAsync(tenantId, cancellationToken);
        return await BuildLicenseResponseAsync(tenant, cancellationToken);
    }

    private async Task<SysBillingPlan?> GetActiveBillingPlanAsync(
        string planCode,
        CancellationToken cancellationToken) =>
        await context.SysBillingPlans
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.PlanCode == planCode && item.IsActive && !item.IsDeleted, cancellationToken);

    private async Task<SysTenant?> FindTenantAsync(Guid id, CancellationToken cancellationToken) =>
        await context.SysTenants.IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.PublicId == id && !item.IsDeleted, cancellationToken);

    private async Task<TenantDetailsResponse> ToDetailsAsync(
        SysTenant tenant,
        CancellationToken cancellationToken)
    {
        var counts = await GetUsageCountsAsync(tenant.PublicId, cancellationToken);
        var departments = await context.Departments.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => item.TenantId == tenant.PublicId && !item.IsDeleted)
            .OrderBy(item => item.Name)
            .Select(item => new { item.Code, item.Name })
            .ToListAsync(cancellationToken);
        var administratorContacts = await context.SysUsers.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(user => user.TenantId == tenant.PublicId
                && user.IsActive
                && !user.IsDeleted
                && user.LegacyUser.IsActive
                && !user.LegacyUser.IsDeleted
                && user.LegacyUser.Email != null
                && user.LegacyUser.Email != string.Empty
                && user.Roles.Any(userRole => !userRole.IsDeleted
                    && userRole.Role.Code == "DepartmentAdmin"
                    && userRole.Role.IsActive
                    && !userRole.Role.IsDeleted))
            .Select(user => new TenantAdministratorContact(
                user.DisplayName ?? user.UserName,
                user.LegacyUser.Email!))
            .OrderBy(item => item.DisplayName)
            .ToListAsync(cancellationToken);
        var license = await GetLatestLicenseAsync(tenant.PublicId, cancellationToken);
        var row = new TenantDirectoryItem(
            tenant.PublicId,
            tenant.TenantCode,
            tenant.Name,
            tenant.LogoUrl,
            tenant.Subdomain,
            tenant.TenantType,
            tenant.Domain,
            tenant.ContactEmail,
            tenant.ContactPhone,
            tenant.Status,
            departments.Count,
            counts.StudentCount,
            counts.LecturerCount,
            license?.LicenseTier,
            license?.MaxStudentsQuota,
            license == null ? null : ToOffset(license.ValidTo));
        return new TenantDetailsResponse(row, tenant.LegalName, ToOffset(tenant.CreatedAt))
        {
            DepartmentNames = departments.Select(item => $"{item.Code} — {item.Name}").ToArray(),
            AdministratorContacts = administratorContacts
        };
    }

    private async Task<TenantLicenseStudioResponse> BuildLicenseResponseAsync(
        SysTenant tenant,
        CancellationToken cancellationToken)
    {
        var counts = await GetUsageCountsAsync(tenant.PublicId, cancellationToken);
        var licenses = await context.SysTenantLicenses.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => item.TenantId == tenant.PublicId && !item.IsDeleted)
            .OrderByDescending(item => item.ValidFrom)
            .ThenByDescending(item => item.CreatedAt)
            .ToListAsync(cancellationToken);
        var current = licenses.FirstOrDefault(item => item.IsActive) ?? licenses.FirstOrDefault();
        var history = licenses.Select(item => new TenantLicenseHistoryItem(
            item.PublicId,
            item.LicenseTier,
            item.MaxStudentsQuota,
            item.MaxLecturersQuota,
            item.StorageQuotaBytes,
            ToOffset(item.ValidFrom),
            ToOffset(item.ValidTo),
            item.AutoRenew,
            item.IsActive)).ToArray();

        return new TenantLicenseStudioResponse(
            tenant.PublicId,
            tenant.Name,
            current?.PublicId,
            current?.LicenseTier,
            counts.StudentCount,
            current?.MaxStudentsQuota ?? 0,
            counts.LecturerCount,
            current?.MaxLecturersQuota ?? 0,
            current?.CurrentStorageBytes ?? 0,
            current?.StorageQuotaBytes ?? 0,
            current == null ? null : ToOffset(current.ValidFrom),
            current == null ? null : ToOffset(current.ValidTo),
            current?.AutoRenew ?? false,
            current?.IsActive ?? false,
            history);
    }

    private async Task<SysTenantLicense?> GetLatestLicenseAsync(
        Guid tenantId,
        CancellationToken cancellationToken) =>
        await context.SysTenantLicenses.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted)
            .OrderByDescending(item => item.IsActive)
            .ThenByDescending(item => item.ValidFrom)
            .ThenByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

    private async Task<(int StudentCount, int LecturerCount)> GetUsageCountsAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var studentCount = await context.Students.IgnoreQueryFilters()
            .CountAsync(item => item.TenantId == tenantId && !item.IsDeleted
                && (item.UserId == null || item.User != null && item.User.IsActive && !item.User.IsDeleted),
                cancellationToken);
        var lecturerCount = await context.Lecturers.IgnoreQueryFilters()
            .CountAsync(item => item.TenantId == tenantId && !item.IsDeleted
                && (item.UserId == null || item.User != null && item.User.IsActive && !item.User.IsDeleted),
                cancellationToken);
        return (
            studentCount,
            lecturerCount);
    }

    private static DateTimeOffset ToOffset(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));

    private static string NormalizeSubdomain(string value) =>
        value.Trim().Trim('.').ToLowerInvariant();
}

public sealed class TenantConflictException(string message) : Exception(message)
{
}
