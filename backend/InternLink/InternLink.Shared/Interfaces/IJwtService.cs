using System.Security.Claims;

namespace InternLink.Shared.Interfaces
{
    /// <summary>
    /// JWT helper service contract used across layers
    /// </summary>
    public interface IJwtService
    {
        string CreateToken(string userId, IEnumerable<string>? roles = null, Guid? departmentId = null);
        (string Token, string JwtId, DateTime ExpiresAt) CreateTokenWithMetadata(string userId, IEnumerable<string>? roles = null, Guid? departmentId = null);
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
    }
}
