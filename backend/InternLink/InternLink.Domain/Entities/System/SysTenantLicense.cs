using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.System;

public enum LicenseTier
{
    Standard = 1,
    Professional = 2,
    Enterprise = 3
}

public sealed class SysTenantLicense : TenantScopedEntity
{
    public SysTenant? Tenant { get; set; }
    public LicenseTier LicenseTier { get; set; } = LicenseTier.Standard;
    public int MaxStudentsQuota { get; set; } = 5000;
    public int MaxLecturersQuota { get; set; } = 200;
    public long StorageQuotaBytes { get; set; } = 107374182400;
    public long CurrentStorageBytes { get; set; }
    public DateTime? StorageUsageInitializedAt { get; set; }
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public bool AutoRenew { get; set; }
    public bool IsActive { get; set; } = true;
}
