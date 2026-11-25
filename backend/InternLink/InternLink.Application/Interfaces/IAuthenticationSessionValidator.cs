namespace InternLink.Application.Interfaces;

public interface IAuthenticationSessionValidator
{
    Task<bool> IsTokenActiveAsync(
        string? jwtId,
        Guid? impersonationSessionId,
        Guid? tenantId,
        CancellationToken cancellationToken);
}
