using System.ComponentModel.DataAnnotations;

namespace InternLink.Application.DTOs;

/// <summary>Tenant SSO configuration with the secret represented only by a mask.</summary>
public sealed record TenantSsoConfigurationResponse(
    Guid TenantId,
    bool IsConfigured,
    string ProviderType,
    string ClientId,
    string MaskedClientSecret,
    bool HasClientSecret,
    string DiscoveryUrl,
    IReadOnlyList<string> AllowedEmailDomains,
    bool IsEnforced,
    DateTimeOffset? UpdatedAt);

/// <summary>Fields used to create or update a tenant SSO connection.</summary>
public sealed record UpdateTenantSsoConfigurationRequest
{
    [Required, MaxLength(50)]
    public required string ProviderType { get; init; }

    [Required, MaxLength(200)]
    public required string ClientId { get; init; }

    [MaxLength(1024)]
    public string? ClientSecret { get; init; }

    [Required, MaxLength(2048), Url]
    public required string DiscoveryUrl { get; init; }

    [Required, MinLength(1), MaxLength(20)]
    public required string[] AllowedEmailDomains { get; init; }

    public bool IsEnforced { get; init; }
}

/// <summary>Input for testing an OIDC discovery endpoint before saving it.</summary>
public sealed record TestTenantSsoDiscoveryRequest
{
    [Required, MaxLength(50)]
    public required string ProviderType { get; init; }

    [Required, MaxLength(2048), Url]
    public required string DiscoveryUrl { get; init; }
}

/// <summary>Safe result of checking an identity provider's OIDC discovery document.</summary>
public sealed record TenantSsoDiscoveryTestResponse(
    bool IsSuccess,
    string Message,
    string? Issuer);
