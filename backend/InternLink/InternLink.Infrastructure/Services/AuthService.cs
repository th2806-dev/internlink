using System.Security.Claims;
using System.Security.Cryptography;
using AutoMapper;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Infrastructure.Persistence;
using InternLink.Domain.Entities;
using InternLink.Shared.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using InternLink.Infrastructure.Identity;
using InternLink.Infrastructure.Email;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IJwtService _jwt;
    private readonly IMapper _mapper;
    private readonly PasswordHasher<User> _hasher;
    private readonly IEmailService _emailService;
    private readonly EmailSettings _emailSettings;
    private readonly ILogger<AuthService> _logger;
    private readonly JwtSettings _jwtSettings;

    public AuthService(
        AppDbContext db,
        IJwtService jwt,
        IMapper mapper,
        PasswordHasher<User> hasher,
        IEmailService emailService,
        IOptions<EmailSettings> emailOptions,
        ILogger<AuthService> logger,
        IOptions<JwtSettings> jwtOptions)
    {
        _db = db;
        _jwt = jwt;
        _mapper = mapper;
        _hasher = hasher;
        _emailService = emailService;
        _emailSettings = emailOptions.Value;
        _logger = logger;
        _jwtSettings = jwtOptions.Value;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, string? ipAddress = null)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == request.Username && !u.IsDeleted);
        if (user == null || !user.IsActive)
        {
            _logger.LogWarning("Failed login attempt for user {Username}", request.Username);
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        var verification = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            _logger.LogWarning("Failed login attempt for user {Username} - wrong password", request.Username);
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        user.LastLoginAt = DateTime.UtcNow;

        var (token, jwtId, expires) = _jwt.CreateTokenWithMetadata(user.Id.ToString(), new[] { user.Role.ToString() }, user.DepartmentId);
        var refreshTokenString = GenerateRefreshTokenString();
        var refreshTokenExpiry = DateTime.UtcNow.AddDays(7);

        var refreshTokenEntity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = refreshTokenString,
            JwtId = jwtId,
            IsUsed = false,
            IsRevoked = false,
            ExpiresAt = refreshTokenExpiry,
            CreatedByIp = ipAddress,
            CreatedAt = DateTime.UtcNow
        };

        _db.RefreshTokens.Add(refreshTokenEntity);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {Username} logged in successfully with RefreshToken", request.Username);

        return new LoginResponse
        {
            Token = token,
            ExpiresAt = expires,
            RefreshToken = refreshTokenString,
            RefreshTokenExpiresAt = refreshTokenExpiry,
            Role = user.Role.ToString(),
            MustChangePassword = user.MustChangePassword,
            DepartmentId = user.DepartmentId
        };
    }

    public async Task<LoginResponse> RefreshTokenAsync(RefreshTokenRequest request, string? ipAddress = null)
    {
        if (string.IsNullOrWhiteSpace(request.AccessToken) || string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            throw new UnauthorizedAccessException("Access token and refresh token are required");
        }

        var principal = _jwt.GetPrincipalFromExpiredToken(request.AccessToken);
        if (principal == null)
        {
            throw new UnauthorizedAccessException("Invalid access token format or signature");
        }

        var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? principal.FindFirst("sub")?.Value;

        var jwtIdClaim = principal.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid user identity in token");
        }

        var storedToken = await _db.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == request.RefreshToken && !r.IsDeleted);

        if (storedToken == null || storedToken.UserId != userId)
        {
            throw new UnauthorizedAccessException("Invalid refresh token");
        }

        // Anti-theft: If a used or revoked refresh token is presented, suspect token theft and revoke all user tokens!
        if (storedToken.IsUsed || storedToken.IsRevoked)
        {
            _logger.LogWarning("Security Alert: Compromised refresh token attempt for user {UserId}. Revoking all sessions.", userId);
            var allUserTokens = await _db.RefreshTokens
                .Where(r => r.UserId == userId && !r.IsRevoked)
                .ToListAsync();

            foreach (var t in allUserTokens)
            {
                t.IsRevoked = true;
                t.RevokedAt = DateTime.UtcNow;
                t.RevokedByIp = ipAddress;
            }

            await _db.SaveChangesAsync();
            throw new UnauthorizedAccessException("Session has been terminated due to security violation. Please log in again.");
        }

        if (DateTime.UtcNow >= storedToken.ExpiresAt)
        {
            storedToken.IsRevoked = true;
            storedToken.RevokedAt = DateTime.UtcNow;
            storedToken.RevokedByIp = ipAddress;
            await _db.SaveChangesAsync();
            throw new UnauthorizedAccessException("Refresh token has expired");
        }

        if (!string.IsNullOrEmpty(jwtIdClaim) && storedToken.JwtId != jwtIdClaim)
        {
            _logger.LogWarning("JWT ID mismatch on refresh token attempt for user {UserId}", userId);
            throw new UnauthorizedAccessException("Token identifier mismatch");
        }

        var user = storedToken.User;
        if (user == null || !user.IsActive || user.IsDeleted)
        {
            throw new UnauthorizedAccessException("User is inactive or deleted");
        }

        // Token Rotation: Invalidate current token and replace with new one
        var newRefreshTokenString = GenerateRefreshTokenString();
        storedToken.IsUsed = true;
        storedToken.RevokedAt = DateTime.UtcNow;
        storedToken.RevokedByIp = ipAddress;
        storedToken.ReplacedByToken = newRefreshTokenString;

        var (newToken, newJwtId, newExpires) = _jwt.CreateTokenWithMetadata(user.Id.ToString(), new[] { user.Role.ToString() }, user.DepartmentId);
        var newRefreshTokenExpiry = DateTime.UtcNow.AddDays(7);

        var newRefreshTokenEntity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = newRefreshTokenString,
            JwtId = newJwtId,
            IsUsed = false,
            IsRevoked = false,
            ExpiresAt = newRefreshTokenExpiry,
            CreatedByIp = ipAddress,
            CreatedAt = DateTime.UtcNow
        };

        _db.RefreshTokens.Add(newRefreshTokenEntity);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Rotated refresh token for user {UserId}", userId);

        return new LoginResponse
        {
            Token = newToken,
            ExpiresAt = newExpires,
            RefreshToken = newRefreshTokenString,
            RefreshTokenExpiresAt = newRefreshTokenExpiry,
            Role = user.Role.ToString(),
            MustChangePassword = user.MustChangePassword,
            DepartmentId = user.DepartmentId
        };
    }

    public async Task<bool> RevokeTokenAsync(string token, Guid userId, string? ipAddress = null)
    {
        var storedToken = await _db.RefreshTokens.FirstOrDefaultAsync(r =>
            r.Token == token && r.UserId == userId && !r.IsDeleted && !r.IsRevoked);
        if (storedToken == null)
            return false;

        storedToken.IsRevoked = true;
        storedToken.RevokedAt = DateTime.UtcNow;
        storedToken.RevokedByIp = ipAddress;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Revoked refresh token for user {UserId}", storedToken.UserId);
        return true;
    }

    public async Task<bool> RevokeAllTokensForUserAsync(Guid userId, string? ipAddress = null)
    {
        var activeTokens = await _db.RefreshTokens
            .Where(r => r.UserId == userId && !r.IsRevoked && !r.IsDeleted)
            .ToListAsync();

        if (activeTokens.Count == 0)
            return false;

        var now = DateTime.UtcNow;
        foreach (var token in activeTokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = now;
            token.RevokedByIp = ipAddress;
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Revoked all active refresh tokens ({Count}) for user {UserId}", activeTokens.Count, userId);
        return true;
    }

    public async Task LogoutAsync(Guid userId)
    {
        await RevokeAllTokensForUserAsync(userId);
        _logger.LogInformation("User {UserId} logged out and all active sessions revoked", userId);
    }

    private static string GenerateRefreshTokenString()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    public async Task<CurrentUserResponse?> GetCurrentUserAsync(Guid userId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        if (user == null) return null;
        return _mapper.Map<CurrentUserResponse>(user);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        if (user == null) throw new KeyNotFoundException("User not found");

        var verification = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
        if (verification == PasswordVerificationResult.Failed)
        {
            _logger.LogWarning("User {UserId} attempted password change with invalid current password", userId);
            throw new UnauthorizedAccessException("Current password is invalid");
        }

        user.PasswordHash = _hasher.HashPassword(user, request.NewPassword);
        user.MustChangePassword = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} changed password", userId);
    }

    public async Task ForgotPasswordAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return;

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.Email != null &&
            u.Email.ToLower() == normalizedEmail &&
            !u.IsDeleted &&
            u.IsActive);

        if (user == null)
        {
            _logger.LogInformation("ForgotPassword requested for unknown or inactive email {Email}", email);
            return;
        }

        var rawToken = ResetTokenGenerator.GenerateToken();
        var tokenHash = ResetTokenGenerator.HashToken(rawToken);
        var expiresAt = DateTime.UtcNow.AddHours(_emailSettings.PasswordResetTokenExpiryHours);

        var activeTokens = await _db.PasswordResetTokens
            .Where(t => t.UserId == user.Id && t.UsedAt == null && !t.IsDeleted)
            .ToListAsync();

        foreach (var existing in activeTokens)
        {
            existing.IsDeleted = true;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.PasswordResetTokens.AddAsync(new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow
        });

        // Record in-app notification in database
        var forgotNotif = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Title = "Yêu cầu khôi phục mật khẩu InternLink",
            Content = $"Yêu cầu đặt lại mật khẩu đã được gửi tới email {user.Email}. Vui lòng kiểm tra hộp thư để nhận đường dẫn đặt lại.",
            Link = "/login",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        await _db.Notifications.AddAsync(forgotNotif);

        await _db.SaveChangesAsync();

        var resetLink = BuildResetLink(rawToken);
        var emailResult = await _emailService.SendForgotPasswordAsync(new ForgotPasswordEmailRequest
        {
            ToEmail = user.Email!,
            FullName = user.FullName ?? user.Username,
            ResetLink = resetLink
        });

        if (!emailResult.Success)
            _logger.LogWarning("ForgotPassword email failed for {Email}: {Message}", user.Email, emailResult.Message);
        else
            _logger.LogInformation("ForgotPassword email sent for user {UserId}", user.Id);
    }

    public async Task ResetPasswordAsync(string token, string newPassword)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new UnauthorizedAccessException("Invalid or expired reset token");

        var tokenHash = ResetTokenGenerator.HashToken(token);
        var resetToken = await _db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t =>
                t.TokenHash == tokenHash &&
                !t.IsDeleted &&
                t.UsedAt == null &&
                t.ExpiresAt > DateTime.UtcNow);

        if (resetToken?.User == null || resetToken.User.IsDeleted || !resetToken.User.IsActive)
            throw new UnauthorizedAccessException("Invalid or expired reset token");

        var user = resetToken.User;
        user.PasswordHash = _hasher.HashPassword(user, newPassword);
        user.MustChangePassword = false;
        user.UpdatedAt = DateTime.UtcNow;

        resetToken.UsedAt = DateTime.UtcNow;
        resetToken.UpdatedAt = DateTime.UtcNow;

        var otherTokens = await _db.PasswordResetTokens
            .Where(t => t.UserId == user.Id && t.Id != resetToken.Id && t.UsedAt == null && !t.IsDeleted)
            .ToListAsync();

        foreach (var other in otherTokens)
        {
            other.IsDeleted = true;
            other.UpdatedAt = DateTime.UtcNow;
        }

        // Record in-app notification in database
        var changedNotif = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Title = "Mật khẩu đã được thay đổi thành công",
            Content = "Mật khẩu tài khoản InternLink của bạn đã được cập nhật thành công qua liên kết xác thực email.",
            Link = "/login",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        await _db.Notifications.AddAsync(changedNotif);

        await _db.SaveChangesAsync();
        _logger.LogInformation("User {UserId} reset password via email token", user.Id);
    }

    private string BuildResetLink(string rawToken)
    {
        var baseUrl = _emailSettings.PortalUrl.TrimEnd('/');
        var path = _emailSettings.PasswordResetPath.TrimStart('/');
        return $"{baseUrl}/{path}?token={Uri.EscapeDataString(rawToken)}";
    }

    public async Task UpdateAvatarAsync(Guid userId, string avatarUrl)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);
        if (user == null) throw new KeyNotFoundException("User not found");
        user.AvatarUrl = avatarUrl;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        _logger.LogInformation("User {UserId} updated avatar", userId);
    }
}
