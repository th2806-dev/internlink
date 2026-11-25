using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.System;

public sealed class SysTenantSsoConfig : TenantScopedEntity
{
    public SysTenant? Tenant { get; set; }
    public string ProviderType { get; set; } = "AzureAD";
    public string ClientId { get; set; } = string.Empty;
    public string EncryptedClientSecret { get; set; } = string.Empty;
    public string DiscoveryUrl { get; set; } = string.Empty;
    public string AllowedEmailDomains { get; set; } = string.Empty;
    public bool IsEnforced { get; set; }
}
