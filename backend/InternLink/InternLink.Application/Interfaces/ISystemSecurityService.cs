using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISystemSecurityService
{
    Task<IReadOnlyList<AdministrativeSessionResponse>> GetActiveSessionsAsync(
        CancellationToken cancellationToken);

    Task<bool> RevokeSessionAsync(
        Guid tokenId,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken);
}
