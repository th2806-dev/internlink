using System.Security.Claims;
using InternLink.API.Authorization;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>Manages platform announcements and serves audience-scoped active banners.</summary>
[ApiController]
[Route("api/v1/system/announcements")]
[Authorize]
public sealed class SystemAnnouncementsController(IPlatformAnnouncementService announcementService) : ControllerBase
{
    /// <summary>Lists all platform announcements for SuperAdmin management.</summary>
    [HttpGet]
    [Authorize(Policy = AdminPolicies.SuperAdmin)]
    [RequirePermission(SystemPermissionCodes.AnnouncementsView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PlatformAnnouncementResponse>>>> GetAll(
        [FromQuery] string? type,
        CancellationToken cancellationToken)
    {
        try
        {
            var announcements = await announcementService.GetAllAsync(type, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<PlatformAnnouncementResponse>>.Ok(announcements));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Returns one announcement to support resource links after creation.</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = AdminPolicies.SuperAdmin)]
    [RequirePermission(SystemPermissionCodes.AnnouncementsView)]
    public async Task<ActionResult<ApiResponse<PlatformAnnouncementResponse>>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var announcement = await announcementService.GetByIdAsync(id, cancellationToken);
        return announcement == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy thông báo." }))
            : Ok(ApiResponse<PlatformAnnouncementResponse>.Ok(announcement));
    }

    /// <summary>Creates a scheduled platform announcement.</summary>
    [HttpPost]
    [Authorize(Policy = AdminPolicies.SuperAdmin)]
    [RequirePermission(SystemPermissionCodes.AnnouncementsCreate)]
    public async Task<ActionResult<ApiResponse<PlatformAnnouncementResponse>>> Create(
        [FromBody] CreatePlatformAnnouncementRequest request,
        CancellationToken cancellationToken)
    {
        var actorId = User.GetUserId();
        if (!actorId.HasValue)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Không xác định được người dùng." }));

        try
        {
            var announcement = await announcementService.CreateAsync(
                request,
                actorId.Value,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);
            return CreatedAtAction(
                nameof(GetById),
                new { id = announcement.Id },
                ApiResponse<PlatformAnnouncementResponse>.Ok(announcement));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Toggles whether an announcement is active.</summary>
    [HttpPut("{id:guid}/toggle")]
    [Authorize(Policy = AdminPolicies.SuperAdmin)]
    [RequirePermission(SystemPermissionCodes.AnnouncementsUpdate)]
    public async Task<ActionResult<ApiResponse<PlatformAnnouncementResponse>>> Toggle(
        Guid id,
        CancellationToken cancellationToken)
    {
        var actorId = User.GetUserId();
        if (!actorId.HasValue)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Không xác định được người dùng." }));

        var announcement = await announcementService.ToggleAsync(
            id,
            actorId.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return announcement == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy thông báo." }))
            : Ok(ApiResponse<PlatformAnnouncementResponse>.Ok(announcement));
    }

    /// <summary>Returns active maintenance and security banners for the authenticated user's audience.</summary>
    [HttpGet("active-banner")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PlatformAnnouncementBannerResponse>>>> GetActiveBanner(
        CancellationToken cancellationToken)
    {
        var tenantId = Guid.TryParse(User.FindFirst("tenant_id")?.Value, out var parsedTenantId)
            ? parsedTenantId
            : (Guid?)null;
        var role = User.IsInRole("SuperAdmin")
            ? "SuperAdmin"
            : User.IsInRole("DepartmentAdmin")
                ? "DepartmentAdmin"
                : User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        var banners = await announcementService.GetActiveBannersAsync(tenantId, role, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PlatformAnnouncementBannerResponse>>.Ok(banners));
    }
}
