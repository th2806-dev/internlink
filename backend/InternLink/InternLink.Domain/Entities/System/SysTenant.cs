using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.System;

public enum TenantType
{
    University = 1,
    Enterprise = 2,
    Government = 3
}

public enum TenantStatus
{
    Active = 1,
    Trial = 2,
    Suspended = 3,
    Expired = 4
}

public sealed class SysTenant : BaseEntity
{
    public static readonly Guid DefaultTenantId = Guid.Parse("b8246f9d-4c85-4fc7-a13a-5ec77f940001");

    public string TenantCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string LegalName { get; set; } = string.Empty;
    public string? Domain { get; set; }
    public string Subdomain { get; set; } = string.Empty;
    public TenantType TenantType { get; set; } = TenantType.University;
    public string? LogoUrl { get; set; }
    public string ContactEmail { get; set; } = string.Empty;
    public string ContactPhone { get; set; } = string.Empty;
    public TenantStatus Status { get; set; } = TenantStatus.Active;

    public ICollection<SysTenantLicense> Licenses { get; set; } = new List<SysTenantLicense>();
    public ICollection<SysTenantSsoConfig> SsoConfigs { get; set; } = new List<SysTenantSsoConfig>();
    public ICollection<SysApiKey> ApiKeys { get; set; } = new List<SysApiKey>();
    public ICollection<SysTenantBillingInvoice> BillingInvoices { get; set; } = new List<SysTenantBillingInvoice>();
    public ICollection<SysTenantImpersonationSession> ImpersonationSessions { get; set; } = new List<SysTenantImpersonationSession>();
}
