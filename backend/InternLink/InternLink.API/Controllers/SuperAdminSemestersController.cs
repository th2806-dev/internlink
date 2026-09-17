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
public class SuperAdminSemestersController : ControllerBase
{
    private readonly ISemesterService _semesterService;

    public SuperAdminSemestersController(ISemesterService semesterService)
    {
        _semesterService = semesterService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? departmentId = null)
    {
        var semesters = await _semesterService.GetAllSemestersAsync(departmentId);
        return Ok(ApiResponse<IEnumerable<SemesterDto>>.Ok(semesters));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var semester = await _semesterService.GetSemesterByIdAsync(id);
        if (semester == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Semester not found" }));

        return Ok(ApiResponse<SemesterDto>.Ok(semester));
    }
}
