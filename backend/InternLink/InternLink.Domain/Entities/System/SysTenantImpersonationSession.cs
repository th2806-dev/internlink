using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.System;

public sealed class SysTenantImpersonationSession : TenantScopedEntity
{
    public SysTenant? Tenant { get; set; }
    public Guid ImpersonatedByUserId { get; set; }
    public User? ImpersonatedByUser { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Reason { get; set; }
}
