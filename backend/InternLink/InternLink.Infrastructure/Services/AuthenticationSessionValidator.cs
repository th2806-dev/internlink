using InternLink.Application.Interfaces;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class AuthenticationSessionValidator(AppDbContext context) : IAuthenticationSessionValidator
{
    public Task<bool> IsTokenActiveAsync(
        string? jwtId,
        Guid? impersonationSessionId,
        Guid? tenantId,
        CancellationToken cancellationToken)
    {
        if (impersonationSessionId.HasValue)
        {
            if (!tenantId.HasValue)
                return Task.FromResult(false);

            var now = DateTime.UtcNow;
            return context.SysTenantImpersonationSessions
                .IgnoreQueryFilters()
                .AnyAsync(session =>
                    session.PublicId == impersonationSessionId.Value
                    && session.TenantId == tenantId.Value
                    && session.IsActive
                    && !session.IsDeleted
                    && session.ExpiresAt > now,
                    cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(jwtId))
            return Task.FromResult(false);

        var tokenNow = DateTime.UtcNow;
        return context.RefreshTokens
            .IgnoreQueryFilters()
            .AnyAsync(token =>
                token.JwtId == jwtId
                && !token.IsDeleted
                && !token.IsUsed
                && !token.IsRevoked
                && token.ExpiresAt > tokenNow,
                cancellationToken);
    }
}
