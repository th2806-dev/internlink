using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>
/// Read-only semester oversight for SuperAdmin.
/// DepartmentAdmin owns semester lifecycle mutations in the separate controller.
/// </summary>
[ApiController]
[Route(AdminApiRoutes.SuperAdminPrefix + "/semesters")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
[Obsolete("SuperAdmin platform owner does not operate directly on tenant semesters.")]
public class SuperAdminSemestersController : ControllerBase
{
    private readonly ISemesterService _semesterService;

    public SuperAdminSemestersController(ISemesterService semesterService)
    {
        _semesterService = semesterService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? tenantId = null,
        [FromQuery] Guid? departmentId = null,
        CancellationToken cancellationToken = default)
    {
        if (!tenantId.HasValue || tenantId.Value == Guid.Empty)
            return Ok(ApiResponse<IEnumerable<SemesterDto>>.Ok(Array.Empty<SemesterDto>()));

        var semesters = await _semesterService.GetAllSemestersAsync(
            departmentId,
            tenantId,
            cancellationToken);
        return Ok(ApiResponse<IEnumerable<SemesterDto>>.Ok(semesters));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(
        Guid id,
        [FromQuery] Guid? tenantId = null,
        CancellationToken cancellationToken = default)
    {
        if (!tenantId.HasValue || tenantId == Guid.Empty)
            return NotFound(ApiResponse<object>.Fail(new ApiError
            {
                Title = InternLink.Shared.Responses.ErrorMessage.SemesterNotFound
            }));

        var semester = await _semesterService.GetSemesterByIdAsync(id, tenantId, cancellationToken);
        if (semester == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.SemesterNotFound }));

        return Ok(ApiResponse<SemesterDto>.Ok(semester));
    }
}
