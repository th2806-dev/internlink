using InternLink.API.Authorization;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>SuperAdmin operations for tenant API credentials.</summary>
[ApiController]
[Route("api/v1/system/tenants/{tenantId:guid}/api-keys")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public sealed class SysApiKeysController(ISystemApiGatewayService gatewayService) : ControllerBase
{
    /// <summary>Lists API key metadata without returning any key secret or hash.</summary>
    [HttpGet]
    [RequirePermission(SystemPermissionCodes.ApiGatewayView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ApiKeyResponse>>>> GetAll(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var result = await gatewayService.GetApiKeysAsync(tenantId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ApiKeyResponse>>.Ok(result));
    }

    /// <summary>Gets API key metadata without returning the secret or hash.</summary>
    [HttpGet("{id:guid}")]
    [RequirePermission(SystemPermissionCodes.ApiGatewayView)]
    public async Task<ActionResult<ApiResponse<ApiKeyResponse>>> GetById(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await gatewayService.GetApiKeyAsync(tenantId, id, cancellationToken);
        return result == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy API key." }))
            : Ok(ApiResponse<ApiKeyResponse>.Ok(result));
    }

    /// <summary>Creates an API key and returns its secret exactly once.</summary>
    [HttpPost]
    [RequirePermission(SystemPermissionCodes.ApiGatewayCreate)]
    public async Task<ActionResult<ApiResponse<ApiKeySecretResponse>>> Create(
        Guid tenantId,
        [FromBody] CreateApiKeyRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await gatewayService.CreateApiKeyAsync(tenantId, request, cancellationToken);
            return result == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy đơn vị triển khai." }))
                : CreatedAtAction(nameof(GetById), new { tenantId, id = result.ApiKey.Id },
                    ApiResponse<ApiKeySecretResponse>.Ok(result));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Updates API key metadata without changing its secret.</summary>
    [HttpPut("{id:guid}")]
    [RequirePermission(SystemPermissionCodes.ApiGatewayUpdate)]
    public async Task<ActionResult<ApiResponse<ApiKeyResponse>>> Update(
        Guid tenantId,
        Guid id,
        [FromBody] UpdateApiKeyRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await gatewayService.UpdateApiKeyAsync(tenantId, id, request, cancellationToken);
            return result == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy API key." }))
                : Ok(ApiResponse<ApiKeyResponse>.Ok(result));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Rotates an API key and returns its new secret exactly once.</summary>
    [HttpPost("{id:guid}/rotate-secret")]
    [RequirePermission(SystemPermissionCodes.ApiGatewayLock)]
    public async Task<ActionResult<ApiResponse<ApiKeySecretResponse>>> RotateSecret(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await gatewayService.RotateApiKeyAsync(tenantId, id, cancellationToken);
        return result == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy API key." }))
            : Ok(ApiResponse<ApiKeySecretResponse>.Ok(result));
    }

    /// <summary>Revokes an API key and removes it from the active key list.</summary>
    [HttpDelete("{id:guid}")]
    [RequirePermission(SystemPermissionCodes.ApiGatewayDelete)]
    public async Task<IActionResult> Delete(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        return await gatewayService.DeleteApiKeyAsync(tenantId, id, cancellationToken)
            ? NoContent()
            : NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy API key." }));
    }
}
