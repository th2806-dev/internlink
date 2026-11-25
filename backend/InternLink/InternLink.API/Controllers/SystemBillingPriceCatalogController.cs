using InternLink.API.Authorization;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>SuperAdmin operations for effective-dated license prices.</summary>
[ApiController]
[Route("api/v1/system/billing/price-catalog")]
[Authorize(Roles = "SuperAdmin")]
public sealed class SystemBillingPriceCatalogController(ISystemBillingService billingService) : ControllerBase
{
    /// <summary>Gets price versions and the plan and cycle options.</summary>
    [HttpGet]
    [RequirePermission(SystemPermissionCodes.BillingView)]
    public async Task<ActionResult<ApiResponse<BillingPriceCatalogResponse>>> GetAll(
        [FromQuery] bool currentOnly = false,
        CancellationToken cancellationToken = default)
    {
        var catalog = await billingService.GetBillingPriceCatalogAsync(currentOnly, cancellationToken);
        return Ok(ApiResponse<BillingPriceCatalogResponse>.Ok(catalog));
    }

    /// <summary>Gets one price version by public ID.</summary>
    [HttpGet("{id:guid}")]
    [RequirePermission(SystemPermissionCodes.BillingView)]
    public async Task<ActionResult<ApiResponse<BillingPriceCatalogItemResponse>>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var price = await billingService.GetBillingPriceCatalogItemAsync(id, cancellationToken);
        return price == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy phiên bản giá." }))
            : Ok(ApiResponse<BillingPriceCatalogItemResponse>.Ok(price));
    }

    /// <summary>Updates the standard quotas for new invoices and license terms.</summary>
    [HttpPut("plans/{planCode}")]
    [RequirePermission(SystemPermissionCodes.BillingConfigure)]
    public async Task<ActionResult<ApiResponse<BillingPlanOptionResponse>>> UpdatePlan(
        string planCode,
        [FromBody] UpdateBillingPlanRequest request,
        CancellationToken cancellationToken)
    {
        var actorId = User.GetUserId();
        if (!actorId.HasValue)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Không xác định được người dùng." }));

        try
        {
            var plan = await billingService.UpdateBillingPlanAsync(
                planCode,
                request,
                actorId.Value,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);
            return plan == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy gói bản quyền." }))
                : Ok(ApiResponse<BillingPlanOptionResponse>.Ok(plan));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Creates a new price version with an explicit effective period and VAT rate.</summary>
    [HttpPost]
    [RequirePermission(SystemPermissionCodes.BillingConfigure)]
    public async Task<ActionResult<ApiResponse<BillingPriceCatalogItemResponse>>> Create(
        [FromBody] CreateBillingPriceCatalogRequest request,
        CancellationToken cancellationToken)
    {
        var actorId = User.GetUserId();
        if (!actorId.HasValue)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Không xác định được người dùng." }));

        try
        {
            var price = await billingService.CreateBillingPriceCatalogItemAsync(
                request,
                actorId.Value,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);
            return CreatedAtAction(
                nameof(GetById),
                new { id = price.Id },
                ApiResponse<BillingPriceCatalogItemResponse>.Ok(price));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Updates a price version while preserving values already snapshotted by invoices.</summary>
    [HttpPut("{id:guid}")]
    [RequirePermission(SystemPermissionCodes.BillingConfigure)]
    public async Task<ActionResult<ApiResponse<BillingPriceCatalogItemResponse>>> Update(
        Guid id,
        [FromBody] UpdateBillingPriceCatalogRequest request,
        CancellationToken cancellationToken)
    {
        var actorId = User.GetUserId();
        if (!actorId.HasValue)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Không xác định được người dùng." }));

        try
        {
            var price = await billingService.UpdateBillingPriceCatalogItemAsync(
                id,
                request,
                actorId.Value,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);
            return price == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy phiên bản giá." }))
                : Ok(ApiResponse<BillingPriceCatalogItemResponse>.Ok(price));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }
}
