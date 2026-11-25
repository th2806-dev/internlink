using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>Starts and ends audited SuperAdmin support sessions in a tenant.</summary>
[ApiController]
[Route("api/v1/system")]
public sealed class TenantImpersonationController(ITenantImpersonationService impersonationService) : ControllerBase
{
    /// <summary>Starts a 30-minute DepartmentAdmin support session in the specified tenant.</summary>
    [HttpPost("tenants/{tenantId:guid}/impersonate")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<ApiResponse<TenantImpersonationResponse>>> Start(
        Guid tenantId,
        [FromBody] StartTenantImpersonationRequest request,
        CancellationToken cancellationToken)
    {
        var actorId = User.GetUserId();
        if (!actorId.HasValue)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Không xác định được người dùng." }));

        try
        {
            var result = await impersonationService.StartAsync(
                tenantId,
                actorId.Value,
                request.Reason,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);
            return result == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy đơn vị." }))
                : Ok(ApiResponse<TenantImpersonationResponse>.Ok(result));
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Revokes the active support session identified by the current token.</summary>
    [HttpPost("impersonate/exit")]
    [Authorize(Roles = "DepartmentAdmin")]
    public async Task<ActionResult<ApiResponse<EndTenantImpersonationResponse>>> End(
        CancellationToken cancellationToken)
    {
        if (!User.HasClaim("is_impersonating", "true")
            || !Guid.TryParse(User.FindFirstValue("impersonation_session_id"), out var sessionId))
            return Forbid();

        var actorId = User.GetUserId();
        if (!actorId.HasValue)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Không xác định được người dùng." }));

        try
        {
            var result = await impersonationService.EndAsync(
                sessionId,
                actorId.Value,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);
            return result == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy phiên hỗ trợ." }))
                : Ok(ApiResponse<EndTenantImpersonationResponse>.Ok(result));
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }
}
