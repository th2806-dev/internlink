using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface IPlatformAnnouncementService
{
    Task<IReadOnlyList<PlatformAnnouncementResponse>> GetAllAsync(
        string? type,
        CancellationToken cancellationToken);

    Task<PlatformAnnouncementResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken);

    Task<PlatformAnnouncementResponse> CreateAsync(
        CreatePlatformAnnouncementRequest request,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken);

    Task<PlatformAnnouncementResponse?> ToggleAsync(
        Guid id,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<PlatformAnnouncementBannerResponse>> GetActiveBannersAsync(
        Guid? tenantId,
        string role,
        CancellationToken cancellationToken);
}
