using InternLink.API.Authorization;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>SuperAdmin operations for tenant licenses and quota usage.</summary>
[ApiController]
[Route("api/v1/system/tenants/{tenantId:guid}/license")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public sealed class SysLicensesController(ISystemTenantService tenantService) : ControllerBase
{
    /// <summary>Gets a tenant's license, actual quota usage, and term history.</summary>
    [HttpGet]
    [RequirePermission(SystemPermissionCodes.LicensesView)]
    public async Task<ActionResult<ApiResponse<TenantLicenseStudioResponse>>> Get(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var license = await tenantService.GetLicenseAsync(tenantId, cancellationToken);
        return license == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy đơn vị triển khai." }))
            : Ok(ApiResponse<TenantLicenseStudioResponse>.Ok(license));
    }

    /// <summary>Creates a new license term and closes the previous active term.</summary>
    [HttpPut]
    [RequirePermission(SystemPermissionCodes.LicensesUpdate)]
    public async Task<ActionResult<ApiResponse<TenantLicenseStudioResponse>>> Update(
        Guid tenantId,
        [FromBody] UpdateTenantLicenseRequest request,
        CancellationToken cancellationToken)
    {
        if (request.ValidTo <= DateTimeOffset.UtcNow)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Ngày hết hạn bản quyền phải ở tương lai." }));
        try
        {
            var license = await tenantService.UpdateLicenseAsync(tenantId, request, cancellationToken);
            return license == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy đơn vị triển khai." }))
                : Ok(ApiResponse<TenantLicenseStudioResponse>.Ok(license));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }
}
