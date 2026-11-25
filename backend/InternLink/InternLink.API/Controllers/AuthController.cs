using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using InternLink.Application.Interfaces;
using InternLink.Application.DTOs;
using InternLink.Application.Exceptions;
using InternLink.API.Extensions;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.StaticFiles;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly AppDbContext _db;
    private readonly ITenantStorageQuotaService _storageQuota;

    public AuthController(
        IAuthService auth,
        AppDbContext db,
        ITenantStorageQuotaService storageQuota)
    {
        _auth = auth;
        _db = db;
        _storageQuota = storageQuota;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
            var token = await _auth.LoginAsync(request, ipAddress, userAgent);
            return Ok(ApiResponse<LoginResponse>.Ok(token));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.Fail(new ApiError
            {
                Title = ex.Message,
                Status = StatusCodes.Status401Unauthorized
            }));
        }
    }

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccessToken) || string.IsNullOrWhiteSpace(request.RefreshToken))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.AccessTokenAndRefreshTokenRequired }));

        try
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
            var response = await _auth.RefreshTokenAsync(request, ipAddress, userAgent);
            return Ok(ApiResponse<LoginResponse>.Ok(response));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPost("revoke-token")]
    [Authorize]
    public async Task<IActionResult> RevokeToken([FromBody] RevokeTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.RefreshTokenRequired }));

        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _auth.RevokeTokenAsync(request.RefreshToken, userId.Value, ipAddress);
        if (!result)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.TokenNotFoundOrRevoked }));

        return Ok(ApiResponse<object>.Ok(new { message = "Token successfully revoked" }));
    }

    [HttpPost("revoke-all")]
    [Authorize]
    public async Task<IActionResult> RevokeAll()
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _auth.RevokeAllTokensForUserAsync(userId.Value, ipAddress);
        return Ok(ApiResponse<object>.Ok(new { message = "All active sessions revoked" }));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));
        await _auth.LogoutAsync(userId.Value);
        return Ok(ApiResponse<object>.Ok(null));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));
        var user = await _auth.GetCurrentUserAsync(userId.Value);
        if (user == null) return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.UserNotFound }));
        if (User.HasClaim("is_impersonating", "true"))
        {
            if (!User.IsInRole("DepartmentAdmin")
                || !Guid.TryParse(User.FindFirst("tenant_id")?.Value, out var tenantId))
                return Forbid();

            user.Role = "DepartmentAdmin";
            user.TenantId = tenantId;
            user.IsImpersonating = true;
            var expiresAt = User.FindFirst("exp")?.Value;
            if (long.TryParse(expiresAt, out var expiresAtUnix))
                user.ImpersonationExpiresAt = DateTimeOffset.FromUnixTimeSeconds(expiresAtUnix);
        }
        return Ok(ApiResponse<CurrentUserResponse>.Ok(user));
    }

    [HttpGet("sessions")]
    [Authorize]
    public async Task<IActionResult> Sessions()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var tokens = await _db.RefreshTokens
            .AsNoTracking()
            .Where(t => t.UserId == userId.Value && !t.IsDeleted && !t.IsRevoked && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
        var currentId = tokens.FirstOrDefault()?.Id;
        var sessions = tokens.Select(token =>
        {
            var (device, browser) = ParseUserAgent(token.UserAgent);
            return new AuthSessionDto
            {
                Id = token.Id.ToString(),
                Device = device,
                Browser = browser,
                Ip = token.CreatedByIp,
                LastActive = token.UpdatedAt ?? token.CreatedAt,
                CreatedAt = token.CreatedAt,
                IsCurrent = token.Id == currentId,
            };
        }).ToList();

        return Ok(ApiResponse<IReadOnlyList<AuthSessionDto>>.Ok(sessions));
    }

    [HttpGet("activity")]
    [Authorize]
    public async Task<IActionResult> Activity([FromQuery] int limit = 30)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var username = await _db.Users
            .AsNoTracking()
            .Where(user => user.Id == userId.Value)
            .Select(user => user.Username)
            .SingleOrDefaultAsync();
        if (username == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.UserNotFound }));

        var activity = await _db.SysLoginLogs
            .AsNoTracking()
            .Where(log => log.Username == username && !log.IsDeleted)
            .OrderByDescending(log => log.LoginAt)
            .Take(Math.Clamp(limit, 1, 100))
            .Select(log => new AuthActivityDto
            {
                Id = log.Id.ToString(),
                Action = log.Status == "SUCCESS" ? "Đăng nhập thành công" : "Đăng nhập thất bại",
                Ip = log.IpAddress,
                Time = log.LoginAt,
            })
            .ToListAsync();

        return Ok(ApiResponse<IReadOnlyList<AuthActivityDto>>.Ok(activity));
    }

    private static (string Device, string Browser) ParseUserAgent(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
            return ("Thiết bị cũ", "Không xác định");

        var device = userAgent.Contains("iPad", StringComparison.OrdinalIgnoreCase)
            ? "iPad"
            : userAgent.Contains("iPhone", StringComparison.OrdinalIgnoreCase)
                ? "iPhone"
                : userAgent.Contains("Android", StringComparison.OrdinalIgnoreCase)
                    ? "Android"
                    : userAgent.Contains("Windows", StringComparison.OrdinalIgnoreCase)
                        ? "Windows"
                        : userAgent.Contains("Mac OS X", StringComparison.OrdinalIgnoreCase)
                            ? "macOS"
                            : userAgent.Contains("Linux", StringComparison.OrdinalIgnoreCase)
                                ? "Linux"
                                : "Thiết bị không xác định";

        var browser = userAgent.Contains("Edg/", StringComparison.OrdinalIgnoreCase)
            ? "Microsoft Edge"
            : userAgent.Contains("OPR/", StringComparison.OrdinalIgnoreCase)
                ? "Opera"
                : userAgent.Contains("Firefox/", StringComparison.OrdinalIgnoreCase)
                    ? "Mozilla Firefox"
                    : userAgent.Contains("Chrome/", StringComparison.OrdinalIgnoreCase)
                        ? "Google Chrome"
                        : userAgent.Contains("Safari/", StringComparison.OrdinalIgnoreCase)
                            ? "Safari"
                            : "Trình duyệt không xác định";

        return (device, browser);
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));
        await _auth.ChangePasswordAsync(userId.Value, request);
        return Ok(ApiResponse<object>.Ok(null));
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.InvalidInput }));

        try
        {
            await _auth.ForgotPasswordAsync(request.Email);
            return Ok(ApiResponse<string>.Ok("Đã gửi liên kết đặt lại mật khẩu đến email của bạn. Vui lòng kiểm tra hộp thư."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
        catch (StudentArchiveReadOnlyException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(502, ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.InvalidInput }));

        try
        {
            await _auth.ResetPasswordAsync(request.Token, request.NewPassword);
            return Ok(ApiResponse<object>.Ok(null));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
        catch (StudentArchiveReadOnlyException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPost("avatar")]
    [Authorize]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.ImageFileRequired }));

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp"))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.OnlyImageSupported }));

        var quotaManaged = !User.IsInRole("SuperAdmin");
        var tenantId = _db.CurrentTenantId;
        if (quotaManaged && tenantId == Guid.Empty)
            throw new InvalidOperationException("Không xác định được tenant để kiểm tra hạn mức lưu trữ.");

        var previousAvatarUrl = await _db.Users
            .Where(user => user.Id == userId.Value && !user.IsDeleted)
            .Select(user => user.AvatarUrl)
            .FirstOrDefaultAsync();

        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "avatars");
        var fileName = $"{userId}_{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);
        var reservedBytes = file.Length;
        var reservationMade = false;
        var databaseCommitted = false;
        try
        {
            if (quotaManaged)
            {
                await _storageQuota.ReserveAsync(tenantId, reservedBytes);
                reservationMade = true;
            }

            Directory.CreateDirectory(uploadsDir);
            await using (var stream = new FileStream(filePath, FileMode.CreateNew))
            {
                await file.CopyToAsync(stream);
                if (quotaManaged && stream.Length > reservedBytes)
                {
                    await _storageQuota.ReserveAsync(tenantId, stream.Length - reservedBytes);
                    reservedBytes = stream.Length;
                }
                else if (quotaManaged && stream.Length < reservedBytes)
                {
                    await _storageQuota.ReleaseAsync(tenantId, reservedBytes - stream.Length);
                    reservedBytes = stream.Length;
                }
            }

            var avatarUrl = $"/uploads/avatars/{fileName}";
            await _auth.UpdateAvatarAsync(userId.Value, avatarUrl);
            databaseCommitted = true;

            var previousFilePath = ResolveAvatarPath(previousAvatarUrl, uploadsDir);
            if (previousFilePath != null && System.IO.File.Exists(previousFilePath))
            {
                var previousSize = new FileInfo(previousFilePath).Length;
                System.IO.File.Delete(previousFilePath);
                if (quotaManaged)
                    await _storageQuota.ReleaseAsync(tenantId, previousSize);
            }

            return Ok(ApiResponse<object>.Ok(new { avatarUrl }));
        }
        catch (TenantStorageQuotaExceededException ex)
        {
            if (!databaseCommitted)
            {
                if (System.IO.File.Exists(filePath))
                    System.IO.File.Delete(filePath);
                if (reservationMade)
                    await _storageQuota.ReleaseAsync(tenantId, reservedBytes);
            }

            return StatusCode(StatusCodes.Status413PayloadTooLarge, ApiResponse<object>.Fail(new ApiError
            {
                Title = ex.Message,
                Status = StatusCodes.Status413PayloadTooLarge
            }));
        }
        catch
        {
            if (!databaseCommitted)
            {
                if (System.IO.File.Exists(filePath))
                    System.IO.File.Delete(filePath);
                if (reservationMade)
                    await _storageQuota.ReleaseAsync(tenantId, reservedBytes);
            }

            throw;
        }
    }

    private static string? ResolveAvatarPath(string? avatarUrl, string uploadsDir)
    {
        if (string.IsNullOrWhiteSpace(avatarUrl) ||
            Uri.TryCreate(avatarUrl, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            return null;
        }

        var normalizedUrl = avatarUrl.Replace('\\', '/').TrimStart('/');
        if (!normalizedUrl.StartsWith("uploads/avatars/", StringComparison.OrdinalIgnoreCase))
            return null;

        var fullDirectory = Path.GetFullPath(uploadsDir);
        var fullPath = Path.GetFullPath(Path.Combine(
            Directory.GetCurrentDirectory(),
            "wwwroot",
            normalizedUrl.Replace('/', Path.DirectorySeparatorChar)));
        return fullPath.StartsWith(fullDirectory + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
            ? fullPath
            : null;
    }
}
