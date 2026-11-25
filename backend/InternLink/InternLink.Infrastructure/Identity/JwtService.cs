using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using InternLink.Shared.Interfaces;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace InternLink.Infrastructure.Identity;

public class JwtService : IJwtService
{
    private readonly JwtSettings _settings;

    public JwtService(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;
    }

    public string CreateToken(
        string userId,
        IEnumerable<string>? roles = null,
        Guid? departmentId = null,
        Guid? tenantId = null)
    {
        return CreateTokenWithMetadata(userId, roles, departmentId, tenantId).Token;
    }

    public (string Token, string JwtId, DateTime ExpiresAt) CreateTokenWithMetadata(
        string userId,
        IEnumerable<string>? roles = null,
        Guid? departmentId = null,
        Guid? tenantId = null)
    {
        var jwtId = Guid.NewGuid().ToString();
        var expiresAt = DateTime.UtcNow.AddMinutes(_settings.ExpiresInMinutes > 0 ? _settings.ExpiresInMinutes : 60);
        var claims = CreateBaseClaims(userId, jwtId, roles, departmentId, tenantId);
        return (CreateSignedToken(claims, expiresAt), jwtId, expiresAt);
    }

    public (string Token, DateTime ExpiresAt) CreateTenantImpersonationToken(
        string userId,
        Guid tenantId,
        Guid sessionId)
    {
        var jwtId = Guid.NewGuid().ToString();
        var expiresAt = DateTime.UtcNow.AddMinutes(30);
        var claims = CreateBaseClaims(
            userId,
            jwtId,
            new[] { "DepartmentAdmin" },
            departmentId: null,
            tenantId);
        claims.Add(new Claim("is_impersonating", "true"));
        claims.Add(new Claim("impersonation_session_id", sessionId.ToString()));
        return (CreateSignedToken(claims, expiresAt), expiresAt);
    }

    private List<Claim> CreateBaseClaims(
        string userId,
        string jwtId,
        IEnumerable<string>? roles,
        Guid? departmentId,
        Guid? tenantId)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.Jti, jwtId),
            new(ClaimTypes.NameIdentifier, userId)
        };

        if (roles != null)
            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        if (departmentId.HasValue)
            claims.Add(new Claim("DepartmentId", departmentId.Value.ToString()));

        if (tenantId.HasValue)
            claims.Add(new Claim("tenant_id", tenantId.Value.ToString()));

        return claims;
    }

    private string CreateSignedToken(IEnumerable<Claim> claims, DateTime expiresAt)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret ?? string.Empty));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
    {
        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = _settings.Issuer,
            ValidAudience = _settings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret ?? string.Empty)),
            ValidateLifetime = false // Critical: We want to extract claims from expired access token
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        try
        {
            var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out var securityToken);
            if (securityToken is not JwtSecurityToken jwtSecurityToken ||
                !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
            {
                return null;
            }

            return principal;
        }
        catch
        {
            return null;
        }
    }
}
