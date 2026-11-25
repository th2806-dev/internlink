using InternLink.API.Authorization;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>SuperAdmin operations for monitoring and revoking administrative sessions.</summary>
[ApiController]
[Route("api/v1/system/security")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public sealed class SystemSecurityController(ISystemSecurityService securityService) : ControllerBase
{
    /// <summary>Lists active SuperAdmin and DepartmentAdmin login sessions without exposing token secrets.</summary>
    [HttpGet("active-sessions")]
    [RequirePermission(SystemPermissionCodes.SecuritySessionsView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AdministrativeSessionResponse>>>> GetActiveSessions(
        CancellationToken cancellationToken)
    {
        var sessions = await securityService.GetActiveSessionsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AdministrativeSessionResponse>>.Ok(sessions));
    }

    /// <summary>Revokes an active administrative refresh token and its associated access token.</summary>
    [HttpPost("sessions/{tokenId:guid}/revoke")]
    [RequirePermission(SystemPermissionCodes.SecuritySessionsRevoke)]
    public async Task<ActionResult<ApiResponse<RevokeAdministrativeSessionResponse>>> Revoke(
        Guid tokenId,
        CancellationToken cancellationToken)
    {
        var actorId = User.GetUserId();
        if (!actorId.HasValue)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Không xác định được người dùng." }));

        var revoked = await securityService.RevokeSessionAsync(
            tokenId,
            actorId.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return revoked
            ? Ok(ApiResponse<RevokeAdministrativeSessionResponse>.Ok(
                new RevokeAdministrativeSessionResponse(tokenId, IsRevoked: true)))
            : NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy phiên quản trị đang hoạt động." }));
    }
}
