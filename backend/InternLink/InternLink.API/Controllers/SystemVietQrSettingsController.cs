using InternLink.API.Authorization;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Infrastructure.Services;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>Reads and updates the platform VietQR beneficiary account.</summary>
[ApiController]
[Route("api/v1/system/billing/vietqr-settings")]
[Authorize(Roles = "SuperAdmin")]
public sealed class SystemVietQrSettingsController(ISystemBillingService billingService) : ControllerBase
{
    /// <summary>Gets the database-configured beneficiary account or appsettings fallback.</summary>
    [HttpGet]
    [RequirePermission(SystemPermissionCodes.BillingView)]
    public async Task<ActionResult<ApiResponse<VietQrSettingsResponse>>> Get(
        CancellationToken cancellationToken)
    {
        var settings = await billingService.GetVietQrSettingsAsync(cancellationToken);
        return Ok(ApiResponse<VietQrSettingsResponse>.Ok(settings));
    }

    /// <summary>Validates and persists the VietQR beneficiary account in SystemSettings.</summary>
    [HttpPut]
    [RequirePermission(SystemPermissionCodes.BillingConfigure)]
    public async Task<ActionResult<ApiResponse<VietQrSettingsResponse>>> Update(
        [FromBody] UpdateVietQrSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var actorId = User.GetUserId();
        if (!actorId.HasValue)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Không xác định được người dùng." }));

        try
        {
            var settings = await billingService.UpdateVietQrSettingsAsync(
                request,
                actorId.Value,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);
            return Ok(ApiResponse<VietQrSettingsResponse>.Ok(settings));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Generates a non-persisting VietQR preview for 10,000 VND using the submitted account details.</summary>
    [HttpPost("preview")]
    [RequirePermission(SystemPermissionCodes.BillingConfigure)]
    public ActionResult<ApiResponse<VietQrPaymentResponse>> Preview(
        [FromBody] UpdateVietQrSettingsRequest request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        try
        {
            return Ok(ApiResponse<VietQrPaymentResponse>.Ok(billingService.PreviewVietQr(request)));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
        catch (VietQrConfigurationException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }
}
