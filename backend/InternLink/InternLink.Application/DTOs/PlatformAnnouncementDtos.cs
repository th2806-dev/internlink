using System.ComponentModel.DataAnnotations;

namespace InternLink.Application.DTOs;

/// <summary>Payload for scheduling a platform announcement.</summary>
public sealed record CreatePlatformAnnouncementRequest
{
    [Required, MaxLength(200)]
    public required string Title { get; init; }

    [Required, MaxLength(5000)]
    public required string Content { get; init; }

    [Required, RegularExpression("^(Maintenance|ReleaseNote|SecurityAlert|General)$")]
    public required string Type { get; init; }

    [Required, RegularExpression("^(AllUsers|TenantAdminsOnly)$")]
    public required string TargetAudience { get; init; }

    public Guid? TargetTenantId { get; init; }

    public required DateTimeOffset StartsAt { get; init; }

    public required DateTimeOffset EndsAt { get; init; }

    public bool ShowBanner { get; init; }
}

/// <summary>Announcement details returned to platform administrators.</summary>
public sealed record PlatformAnnouncementResponse(
    Guid Id,
    string Title,
    string Content,
    string Type,
    string TargetAudience,
    Guid? TargetTenantId,
    string? TargetTenantName,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    bool IsActive,
    bool ShowBanner,
    DateTimeOffset CreatedAt);

/// <summary>Announcement data safe to render as a banner for the current user.</summary>
public sealed record PlatformAnnouncementBannerResponse(
    Guid Id,
    string Title,
    string Content,
    string Type,
    DateTimeOffset EndsAt);

/// <summary>Administrative refresh-token session metadata; token secrets are never returned.</summary>
public sealed record AdministrativeSessionResponse(
    Guid TokenId,
    Guid UserId,
    string UserName,
    string Email,
    string Role,
    Guid TenantId,
    string TenantName,
    string? IpAddress,
    string? UserAgent,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt);

/// <summary>Result of revoking an administrative login session.</summary>
public sealed record RevokeAdministrativeSessionResponse(
    Guid TokenId,
    bool IsRevoked);
