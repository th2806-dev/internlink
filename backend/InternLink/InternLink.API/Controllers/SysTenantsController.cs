using InternLink.API.Authorization;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Services;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>SuperAdmin operations for the platform tenant directory.</summary>
[ApiController]
[Route("api/v1/system/tenants")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public sealed class SysTenantsController(
    ISystemTenantService tenantService,
    ISystemTenantExportService exportService) : ControllerBase
{
    /// <summary>Gets a filtered and paginated tenant directory.</summary>
    [HttpGet]
    [RequirePermission(SystemPermissionCodes.TenantsView)]
    public async Task<ActionResult<ApiResponse<TenantDirectoryPage>>> GetAll(
        [FromQuery] TenantDirectoryQuery query,
        CancellationToken cancellationToken)
    {
        if (query.Page < 1 || query.PageSize is < 1 or > 100)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Page phải từ 1 và PageSize từ 1 đến 100." }));

        var result = await tenantService.GetTenantsAsync(query, cancellationToken);
        return Ok(ApiResponse<TenantDirectoryPage>.Ok(result));
    }

    /// <summary>Creates a tenant and its initial license term.</summary>
    [HttpPost]
    [RequirePermission(SystemPermissionCodes.TenantsCreate)]
    public async Task<ActionResult<ApiResponse<TenantDetailsResponse>>> Create(
        [FromBody] CreateTenantRequest request,
        CancellationToken cancellationToken)
    {
        if (request.ValidTo <= DateTimeOffset.UtcNow)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Ngày hết hạn bản quyền phải ở tương lai." }));
        if (!Enum.IsDefined(request.TenantType))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Loại hình đơn vị không hợp lệ." }));

        try
        {
            var tenant = await tenantService.CreateTenantAsync(request, cancellationToken);
            if (tenant == null)
                return StatusCode(StatusCodes.Status500InternalServerError,
                    ApiResponse<object>.Fail(new ApiError { Title = "Không thể tạo đơn vị triển khai." }));

            return CreatedAtAction(nameof(GetById), new { id = tenant.Tenant.Id },
                ApiResponse<TenantDetailsResponse>.Ok(tenant));
        }
        catch (TenantConflictException exception)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Gets a tenant and its current operational counts.</summary>
    [HttpGet("{id:guid}")]
    [RequirePermission(SystemPermissionCodes.TenantsView)]
    public async Task<ActionResult<ApiResponse<TenantDetailsResponse>>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var tenant = await tenantService.GetTenantAsync(id, cancellationToken);
        return tenant == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy đơn vị triển khai." }))
            : Ok(ApiResponse<TenantDetailsResponse>.Ok(tenant));
    }

    /// <summary>Exports one tenant's academic data and locally managed evidence files.</summary>
    [HttpGet("{id:guid}/export")]
    [RequirePermission(SystemPermissionCodes.TenantsExport)]
    [Produces("application/zip")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Export(
        Guid id,
        CancellationToken cancellationToken)
    {
        var actorId = User.GetUserId();
        if (!actorId.HasValue)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Không xác định được người dùng." }));

        var archive = await exportService.ExportAsync(
            id,
            actorId.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);
        return archive == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy đơn vị triển khai." }))
            : File(archive.Content, "application/zip", archive.FileName);
    }

    /// <summary>Updates the tenant's legal name, domain, and contact details.</summary>
    [HttpPut("{id:guid}")]
    [RequirePermission(SystemPermissionCodes.TenantsUpdate)]
    public async Task<ActionResult<ApiResponse<TenantDetailsResponse>>> Update(
        Guid id,
        [FromBody] UpdateTenantRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var tenant = await tenantService.UpdateTenantAsync(id, request, cancellationToken);
            return tenant == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy đơn vị triển khai." }))
                : Ok(ApiResponse<TenantDetailsResponse>.Ok(tenant));
        }
        catch (TenantConflictException exception)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Changes tenant status; the change is recorded by the audit log.</summary>
    [HttpPatch("{id:guid}/status")]
    [RequirePermission(SystemPermissionCodes.TenantsLock)]
    public async Task<ActionResult<ApiResponse<TenantDetailsResponse>>> UpdateStatus(
        Guid id,
        [FromBody] UpdateTenantStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(request.Status))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Trạng thái đơn vị không hợp lệ." }));

        var tenant = await tenantService.UpdateStatusAsync(id, request.Status, cancellationToken);
        return tenant == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy đơn vị triển khai." }))
            : Ok(ApiResponse<TenantDetailsResponse>.Ok(tenant));
    }
}
