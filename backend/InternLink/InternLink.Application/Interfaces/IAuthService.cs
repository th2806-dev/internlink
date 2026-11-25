using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, string? ipAddress = null, string? userAgent = null);
    Task<LoginResponse> RefreshTokenAsync(RefreshTokenRequest request, string? ipAddress = null, string? userAgent = null);
    Task<bool> RevokeTokenAsync(string token, Guid userId, string? ipAddress = null);
    Task<bool> RevokeAllTokensForUserAsync(Guid userId, string? ipAddress = null);
    Task LogoutAsync(Guid userId);
    Task<CurrentUserResponse?> GetCurrentUserAsync(Guid userId);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request);
    Task ForgotPasswordAsync(string email);
    Task ResetPasswordAsync(string token, string newPassword);
    Task UpdateAvatarAsync(Guid userId, string avatarUrl);
}
