using InternLink.API.Authorization;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/v1/system/field-policies")]
[Authorize]
public sealed class SysFieldPoliciesController : ControllerBase
{
    private readonly ISysFieldPolicyService _service;

    public SysFieldPoliciesController(ISysFieldPolicyService service) => _service = service;

    [HttpGet("{formCode}")]
    [Authorize(Roles = "SuperAdmin,DepartmentAdmin,Lecturer,Student")]
    public async Task<IActionResult> GetByForm(
        string formCode,
        [FromQuery] long? roleId,
        [FromQuery] bool currentUserRole,
        CancellationToken cancellationToken)
    {
        try
        {
            var policies = currentUserRole
                ? await _service.GetByFormForRoleAsync(
                    formCode,
                    User.FindFirst(ClaimTypes.Role)?.Value
                        ?? throw new InvalidOperationException("Không xác định được vai trò tài khoản."),
                    cancellationToken)
                : await _service.GetByFormAsync(formCode, roleId, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<SysFieldPolicyDto>>.Ok(policies));
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    [HttpPut("{formCode}")]
    [Authorize(Roles = "SuperAdmin")]
    [RequirePermission(SystemPermissionCodes.ConfigurationUpdate)]
    public async Task<IActionResult> Upsert(
        string formCode,
        [FromQuery] long? roleId,
        [FromBody] UpsertSysFieldPoliciesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var policies = await _service.UpsertAsync(formCode, roleId, request, cancellationToken);
            return Ok(ApiResponse<IReadOnlyList<SysFieldPolicyDto>>.Ok(policies));
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }
}
