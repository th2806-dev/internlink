using System.ComponentModel.DataAnnotations;
using InternLink.Domain.Entities.System;

namespace InternLink.Application.DTOs;

/// <summary>Filters and pages platform tenants.</summary>
public sealed record TenantDirectoryQuery(
    string? Search,
    TenantType? TenantType,
    TenantStatus? Status,
    int Page = 1,
    int PageSize = 25);

/// <summary>A tenant row and its current operational/license summary.</summary>
public sealed record TenantDirectoryItem(
    Guid Id,
    string TenantCode,
    string Name,
    string? LogoUrl,
    string Subdomain,
    TenantType TenantType,
    string? Domain,
    string ContactEmail,
    string ContactPhone,
    TenantStatus Status,
    int DepartmentCount,
    int ActiveStudentCount,
    int ActiveLecturerCount,
    LicenseTier? LicenseTier,
    int? MaxStudentsQuota,
    DateTimeOffset? LicenseValidTo);

/// <summary>A page of tenants matching the requested directory filters.</summary>
public sealed record TenantDirectoryPage(
    IReadOnlyList<TenantDirectoryItem> Items,
    int Page,
    int PageSize,
    int TotalCount);

/// <summary>Fields required to onboard a tenant and its initial license.</summary>
public sealed record CreateTenantRequest
{
    [Required, StringLength(20, MinimumLength = 2), RegularExpression(@"^[A-Za-z0-9][A-Za-z0-9_-]*$")]
    public required string TenantCode { get; init; }

    [Required, StringLength(200, MinimumLength = 2)]
    public required string Name { get; init; }

    [StringLength(250)]
    public string? LegalName { get; init; }

    [Required, StringLength(63, MinimumLength = 2), RegularExpression(@"^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$")]
    public required string Subdomain { get; init; }

    [Required]
    public required TenantType TenantType { get; init; }

    [EmailAddress, StringLength(200)]
    public string ContactEmail { get; init; } = string.Empty;

    [StringLength(50)]
    public string ContactPhone { get; init; } = string.Empty;

    [Required, RegularExpression("(?i)^(STANDARD|PRO|ENTERPRISE)$")]
    public required string PlanCode { get; init; }

    public DateTimeOffset ValidTo { get; init; }
}

/// <summary>Editable tenant identity and contact fields.</summary>
public sealed record UpdateTenantRequest
{
    [Required, StringLength(200, MinimumLength = 2)]
    public required string Name { get; init; }

    [Required, StringLength(250, MinimumLength = 2)]
    public required string LegalName { get; init; }

    [StringLength(253)]
    public string? Domain { get; init; }

    [EmailAddress, StringLength(200)]
    public required string ContactEmail { get; init; }

    [StringLength(50)]
    public required string ContactPhone { get; init; }
}

/// <summary>Changes the operational status of a tenant.</summary>
public sealed record UpdateTenantStatusRequest
{
    [Required]
    public required TenantStatus Status { get; init; }
}

/// <summary>Detailed tenant profile and aggregate counts.</summary>
public sealed record TenantDetailsResponse(
    TenantDirectoryItem Tenant,
    string LegalName,
    DateTimeOffset CreatedAt)
{
    public IReadOnlyList<string> DepartmentNames { get; init; } = Array.Empty<string>();
    public IReadOnlyList<TenantAdministratorContact> AdministratorContacts { get; init; } =
        Array.Empty<TenantAdministratorContact>();
}

/// <summary>Contact details for an active tenant DepartmentAdmin account.</summary>
public sealed record TenantAdministratorContact(string DisplayName, string Email);

/// <summary>One license term in the tenant's history.</summary>
public sealed record TenantLicenseHistoryItem(
    Guid Id,
    LicenseTier LicenseTier,
    int MaxStudentsQuota,
    int MaxLecturersQuota,
    long StorageQuotaBytes,
    DateTimeOffset ValidFrom,
    DateTimeOffset ValidTo,
    bool AutoRenew,
    bool IsActive);

/// <summary>Current license limits, actual active usage, and prior terms.</summary>
public sealed record TenantLicenseStudioResponse(
    Guid TenantId,
    string TenantName,
    Guid? LicenseId,
    LicenseTier? LicenseTier,
    int ActiveStudents,
    int MaxStudentsQuota,
    int ActiveLecturers,
    int MaxLecturersQuota,
    long CurrentStorageBytes,
    long StorageQuotaBytes,
    DateTimeOffset? ValidFrom,
    DateTimeOffset? ValidTo,
    bool AutoRenew,
    bool IsActive,
    IReadOnlyList<TenantLicenseHistoryItem> History);

/// <summary>Creates a new license term and closes the previous active term.</summary>
public sealed record UpdateTenantLicenseRequest
{
    [Required, RegularExpression("(?i)^(STANDARD|PRO|ENTERPRISE)$")]
    public required string PlanCode { get; init; }

    public DateTimeOffset ValidTo { get; init; }
    public bool AutoRenew { get; init; }
}
