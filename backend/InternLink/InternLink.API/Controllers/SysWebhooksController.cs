using InternLink.API.Authorization;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>SuperAdmin operations for tenant webhooks and failed deliveries.</summary>
[ApiController]
[Route("api/v1/system/tenants/{tenantId:guid}/webhooks")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public sealed class SysWebhooksController(ISystemApiGatewayService gatewayService) : ControllerBase
{
    /// <summary>Lists webhook metadata without returning signing secrets.</summary>
    [HttpGet]
    [RequirePermission(SystemPermissionCodes.ApiGatewayView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WebhookResponse>>>> GetAll(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var result = await gatewayService.GetWebhooksAsync(tenantId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WebhookResponse>>.Ok(result));
    }

    /// <summary>Gets webhook metadata without returning its signing secret.</summary>
    [HttpGet("{id:guid}")]
    [RequirePermission(SystemPermissionCodes.ApiGatewayView)]
    public async Task<ActionResult<ApiResponse<WebhookResponse>>> GetById(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await gatewayService.GetWebhookAsync(tenantId, id, cancellationToken);
        return result == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy webhook." }))
            : Ok(ApiResponse<WebhookResponse>.Ok(result));
    }

    /// <summary>Creates a webhook and returns its signing secret exactly once.</summary>
    [HttpPost]
    [RequirePermission(SystemPermissionCodes.ApiGatewayCreate)]
    public async Task<ActionResult<ApiResponse<CreateWebhookResponse>>> Create(
        Guid tenantId,
        [FromBody] CreateWebhookRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await gatewayService.CreateWebhookAsync(tenantId, request, cancellationToken);
            return result == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy đơn vị triển khai." }))
                : CreatedAtAction(nameof(GetById), new { tenantId, id = result.Webhook.Id },
                    ApiResponse<CreateWebhookResponse>.Ok(result));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Updates a webhook endpoint, event type, or active state.</summary>
    [HttpPut("{id:guid}")]
    [RequirePermission(SystemPermissionCodes.ApiGatewayUpdate)]
    public async Task<ActionResult<ApiResponse<WebhookResponse>>> Update(
        Guid tenantId,
        Guid id,
        [FromBody] UpdateWebhookRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await gatewayService.UpdateWebhookAsync(tenantId, id, request, cancellationToken);
            return result == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy webhook." }))
                : Ok(ApiResponse<WebhookResponse>.Ok(result));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Soft-deletes a webhook subscription.</summary>
    [HttpDelete("{id:guid}")]
    [RequirePermission(SystemPermissionCodes.ApiGatewayDelete)]
    public async Task<IActionResult> Delete(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        return await gatewayService.DeleteWebhookAsync(tenantId, id, cancellationToken)
            ? NoContent()
            : NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy webhook." }));
    }

    /// <summary>Sends a signed test event and records the delivery result.</summary>
    [HttpPost("{id:guid}/test")]
    [RequirePermission(SystemPermissionCodes.ApiGatewayApprove)]
    public async Task<ActionResult<ApiResponse<WebhookDeliveryResponse>>> Test(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await gatewayService.TestWebhookAsync(tenantId, id, cancellationToken);
            return result == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy webhook." }))
                : Ok(ApiResponse<WebhookDeliveryResponse>.Ok(result));
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

    /// <summary>Lists the latest failed attempt for each webhook delivery.</summary>
    [HttpGet("~/api/v1/system/tenants/{tenantId:guid}/webhook-deliveries/dead-letter-queue")]
    [RequirePermission(SystemPermissionCodes.ApiGatewayView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WebhookDeliveryResponse>>>> GetDeadLetters(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var result = await gatewayService.GetDeadLettersAsync(tenantId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WebhookDeliveryResponse>>.Ok(result));
    }

    /// <summary>Retries the latest failed attempt for a delivery.</summary>
    [HttpPost("~/api/v1/system/tenants/{tenantId:guid}/webhook-deliveries/{id:guid}/retry")]
    [RequirePermission(SystemPermissionCodes.ApiGatewayApprove)]
    public async Task<ActionResult<ApiResponse<WebhookDeliveryResponse>>> Retry(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await gatewayService.RetryDeliveryAsync(tenantId, id, cancellationToken);
            return result == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy delivery." }))
                : Ok(ApiResponse<WebhookDeliveryResponse>.Ok(result));
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }
}
