using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.System;

public sealed class SysBillingPlan : BaseEntity
{
    public string PlanCode { get; set; } = string.Empty;
    public LicenseTier LicenseTier { get; set; }
    public int MaxStudentsQuota { get; set; }
    public int MaxLecturersQuota { get; set; }
    public long StorageQuotaBytes { get; set; }
    public bool IsActive { get; set; } = true;
}
