using InternLink.API.Authorization;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>SuperAdmin operations for a tenant's enterprise identity provider.</summary>
[ApiController]
[Route("api/v1/system/tenants/{tenantId:guid}/sso")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public sealed class SysTenantSsoController(ISystemTenantSsoService ssoService) : ControllerBase
{
    /// <summary>Gets tenant SSO metadata without revealing its client secret.</summary>
    [HttpGet]
    [RequirePermission(SystemPermissionCodes.SsoHubView)]
    public async Task<ActionResult<ApiResponse<TenantSsoConfigurationResponse>>> Get(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var result = await ssoService.GetConfigurationAsync(tenantId, cancellationToken);
        return result == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy đơn vị triển khai." }))
            : Ok(ApiResponse<TenantSsoConfigurationResponse>.Ok(result));
    }

    /// <summary>Creates or updates the tenant SSO configuration.</summary>
    [HttpPut]
    [RequirePermission(SystemPermissionCodes.SsoHubUpdate)]
    public async Task<ActionResult<ApiResponse<TenantSsoConfigurationResponse>>> Save(
        Guid tenantId,
        [FromBody] UpdateTenantSsoConfigurationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await ssoService.SaveConfigurationAsync(tenantId, request, cancellationToken);
            return result == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy đơn vị triển khai." }))
                : Ok(ApiResponse<TenantSsoConfigurationResponse>.Ok(result));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Tests a public OIDC discovery endpoint without saving configuration.</summary>
    [HttpPost("test-discovery")]
    [RequirePermission(SystemPermissionCodes.SsoHubTest)]
    public async Task<ActionResult<ApiResponse<TenantSsoDiscoveryTestResponse>>> TestDiscovery(
        Guid tenantId,
        [FromBody] TestTenantSsoDiscoveryRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await ssoService.TestDiscoveryAsync(tenantId, request, cancellationToken);
            return result == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy đơn vị triển khai." }))
                : Ok(ApiResponse<TenantSsoDiscoveryTestResponse>.Ok(result));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Disables and removes the tenant SSO secret to restore local sign-in.</summary>
    [HttpDelete]
    [RequirePermission(SystemPermissionCodes.SsoHubDelete)]
    public async Task<IActionResult> Delete(Guid tenantId, CancellationToken cancellationToken)
    {
        var principal = HttpContext?.User;
        var result = await ssoService.DeleteConfigurationAsync(
            tenantId,
            principal?.Identity?.Name ?? principal?.FindFirst("sub")?.Value ?? "system",
            cancellationToken);
        return result == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy đơn vị triển khai." }))
            : NoContent();
    }
}
