using System.IdentityModel.Tokens.Jwt;
using FluentAssertions;
using InternLink.Infrastructure.Identity;
using Microsoft.Extensions.Options;
using Xunit;

namespace InternLink.Tests.Services;

public class JwtServiceTests
{
    private static JwtService CreateService()
    {
        var options = Options.Create(new JwtSettings
        {
            Issuer = "InternLinkTest",
            Audience = "InternLinkClientsTest",
            Secret = "InternLink_Dev_Secret_Key_At_Least_32_Characters_Long_2026!",
            ExpiresInMinutes = 60
        });

        return new JwtService(options);
    }

    [Fact]
    public void CreateToken_ValidUserId_ShouldReturnValidJwt()
    {
        var service = CreateService();
        var userId = Guid.NewGuid().ToString();
        var roles = new[] { "Student", "Lecturer" };

        var tokenString = service.CreateToken(userId, roles);

        tokenString.Should().NotBeNullOrWhiteSpace();

        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(tokenString);

        token.Issuer.Should().Be("InternLinkTest");
        token.Audiences.Should().Contain("InternLinkClientsTest");
        token.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Sub && c.Value == userId);
    }

    [Fact]
    public void CreateToken_WithTenantId_ShouldIncludeTenantClaim()
    {
        var service = CreateService();
        var tenantId = Guid.NewGuid();

        var token = new JwtSecurityTokenHandler().ReadJwtToken(
            service.CreateToken(Guid.NewGuid().ToString(), tenantId: tenantId));

        token.Claims.Should().Contain(c => c.Type == "tenant_id" && c.Value == tenantId.ToString());
    }

    [Fact]
    public void CreateTenantImpersonationToken_HasDepartmentAdminTenantAndSessionClaimsAnd30MinuteLifetime()
    {
        var service = CreateService();
        var userId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();
        var before = DateTime.UtcNow;

        var result = service.CreateTenantImpersonationToken(userId.ToString(), tenantId, sessionId);

        var token = new JwtSecurityTokenHandler().ReadJwtToken(result.Token);
        token.Claims.Should().Contain(c => c.Type == "tenant_id" && c.Value == tenantId.ToString());
        token.Claims.Should().Contain(c => c.Type == "is_impersonating" && c.Value == "true");
        token.Claims.Should().Contain(c => c.Type == "impersonation_session_id" && c.Value == sessionId.ToString());
        token.Claims.Should().Contain(c =>
            c.Type == System.Security.Claims.ClaimTypes.Role && c.Value == "DepartmentAdmin");
        result.ExpiresAt.Should().BeCloseTo(before.AddMinutes(30), TimeSpan.FromSeconds(2));
    }
}
