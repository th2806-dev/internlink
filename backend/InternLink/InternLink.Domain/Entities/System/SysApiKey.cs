using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.System;

public sealed class SysApiKey : TenantScopedEntity
{
    public SysTenant? Tenant { get; set; }
    public string Name { get; set; } = string.Empty;
    public string KeyPrefix { get; set; } = string.Empty;
    public string KeyHash { get; set; } = string.Empty;
    public string ScopesJson { get; set; } = "[\"students.read\",\"evaluations.write\"]";
    public int RateLimitPerMinute { get; set; } = 120;
    public DateTime? ExpiresAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public bool IsActive { get; set; } = true;
}
