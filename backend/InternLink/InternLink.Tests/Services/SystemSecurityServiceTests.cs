using InternLink.Domain.Entities;
using InternLink.Domain.Entities.System;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Tests.Services;

public sealed class SystemSecurityServiceTests
{
    [Fact]
    public async Task GetActiveSessions_ReturnsOnlyCurrentAdminRefreshSessions()
    {
        await using var context = CreateContext();
        var tenant = CreateTenant(Guid.NewGuid(), "Target Campus");
        var admin = CreateUser(Role.DepartmentAdmin, tenant.PublicId, "dept-admin");
        var student = CreateUser(Role.Student, tenant.PublicId, "student");
        context.SysTenants.Add(tenant);
        context.Users.AddRange(admin, student);
        var activeAdminToken = CreateRefreshToken(admin, "active-jti");
        var studentToken = CreateRefreshToken(student, "student-jti");
        var revokedToken = CreateRefreshToken(admin, "revoked-jti", isRevoked: true);
        var usedToken = CreateRefreshToken(admin, "used-jti", isUsed: true);
        var expiredToken = CreateRefreshToken(admin, "expired-jti", expiresAt: DateTime.UtcNow.AddMinutes(-1));
        context.RefreshTokens.AddRange(activeAdminToken, studentToken, revokedToken, usedToken, expiredToken);
        await context.SaveChangesAsync();

        var sessions = await new SystemSecurityService(context).GetActiveSessionsAsync(CancellationToken.None);

        var session = Assert.Single(sessions);
        Assert.Equal(activeAdminToken.PublicId, session.TokenId);
        Assert.Equal(admin.PublicId, session.UserId);
        Assert.Equal("Target Campus", session.TenantName);
        Assert.Equal("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/131.0", session.UserAgent);
        Assert.DoesNotContain("refresh-secret", session.UserAgent ?? string.Empty);
    }

    [Fact]
    public async Task RevokeSession_ImmediatelyInvalidatesAssociatedAccessToken()
    {
        await using var context = CreateContext();
        var tenant = CreateTenant(Guid.NewGuid(), "Target Campus");
        var admin = CreateUser(Role.DepartmentAdmin, tenant.PublicId, "dept-admin");
        var actor = CreateUser(Role.SuperAdmin, tenant.PublicId, "platform-admin");
        context.SysTenants.Add(tenant);
        context.Users.AddRange(admin, actor);
        var token = CreateRefreshToken(admin, "access-jwt-id");
        context.RefreshTokens.Add(token);
        await context.SaveChangesAsync();
        var securityService = new SystemSecurityService(context);
        var validator = new AuthenticationSessionValidator(context);

        Assert.True(await validator.IsTokenActiveAsync(token.JwtId, null, null, CancellationToken.None));
        Assert.True(await securityService.RevokeSessionAsync(
            token.PublicId,
            actor.PublicId,
            "127.0.0.1",
            CancellationToken.None));
        Assert.False(await validator.IsTokenActiveAsync(token.JwtId, null, null, CancellationToken.None));
        Assert.True(token.IsRevoked);
        Assert.Equal("127.0.0.1", token.RevokedByIp);
    }

    [Fact]
    public async Task RevokeSession_DoesNotRevokeNonAdministrativeToken()
    {
        await using var context = CreateContext();
        var tenantId = Guid.NewGuid();
        var student = CreateUser(Role.Student, tenantId, "student");
        context.Users.Add(student);
        var token = CreateRefreshToken(student, "student-jti");
        context.RefreshTokens.Add(token);
        await context.SaveChangesAsync();

        var revoked = await new SystemSecurityService(context).RevokeSessionAsync(
            token.PublicId,
            Guid.NewGuid(),
            null,
            CancellationToken.None);

        Assert.False(revoked);
        Assert.False(token.IsRevoked);
    }

    [Fact]
    public async Task Validator_ChecksImpersonationSessionStateAndTenant()
    {
        await using var context = CreateContext();
        var session = new SysTenantImpersonationSession
        {
            TenantId = Guid.NewGuid(),
            StartedAt = DateTime.UtcNow.AddMinutes(-1),
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            IsActive = true
        };
        context.SysTenantImpersonationSessions.Add(session);
        await context.SaveChangesAsync();
        var validator = new AuthenticationSessionValidator(context);

        Assert.True(await validator.IsTokenActiveAsync(
            null,
            session.PublicId,
            session.TenantId,
            CancellationToken.None));
        Assert.False(await validator.IsTokenActiveAsync(
            null,
            session.PublicId,
            Guid.NewGuid(),
            CancellationToken.None));
        session.IsActive = false;
        await context.SaveChangesAsync();
        Assert.False(await validator.IsTokenActiveAsync(
            null,
            session.PublicId,
            session.TenantId,
            CancellationToken.None));
    }

    private static RefreshToken CreateRefreshToken(
        User user,
        string jwtId,
        bool isRevoked = false,
        bool isUsed = false,
        DateTime? expiresAt = null) => new()
    {
        Id = Guid.NewGuid(),
        TenantId = user.TenantId,
        UserId = user.PublicId,
        User = user,
        Token = $"refresh-secret-{Guid.NewGuid():N}",
        JwtId = jwtId,
        IsRevoked = isRevoked,
        IsUsed = isUsed,
        ExpiresAt = expiresAt ?? DateTime.UtcNow.AddDays(1),
        CreatedByIp = "192.0.2.10",
        UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/131.0",
        CreatedAt = DateTime.UtcNow
    };

    private static User CreateUser(Role role, Guid tenantId, string username) => new()
    {
        Id = Guid.NewGuid(),
        TenantId = tenantId,
        Username = username,
        Email = $"{username}@example.test",
        PasswordHash = "not-a-real-password-hash",
        Role = role,
        IsActive = true
    };

    private static SysTenant CreateTenant(Guid id, string name) => new()
    {
        PublicId = id,
        TenantCode = $"T{id:N}"[..20],
        Name = name,
        LegalName = name,
        Subdomain = $"t{id:N}"[..20],
        ContactEmail = string.Empty,
        ContactPhone = string.Empty
    };

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }
}
