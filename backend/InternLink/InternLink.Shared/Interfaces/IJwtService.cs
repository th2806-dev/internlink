using System.Security.Claims;

namespace InternLink.Shared.Interfaces
{
    /// <summary>
    /// JWT helper service contract used across layers
    /// </summary>
    public interface IJwtService
    {
        string CreateToken(
            string userId,
            IEnumerable<string>? roles = null,
            Guid? departmentId = null,
            Guid? tenantId = null);
        (string Token, string JwtId, DateTime ExpiresAt) CreateTokenWithMetadata(
            string userId,
            IEnumerable<string>? roles = null,
            Guid? departmentId = null,
            Guid? tenantId = null);
        (string Token, DateTime ExpiresAt) CreateTenantImpersonationToken(
            string userId,
            Guid tenantId,
            Guid sessionId);
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
    }
}
