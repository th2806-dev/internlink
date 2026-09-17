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
/// Read-only department data available to a DepartmentAdmin.
/// </summary>
[ApiController]
[Route(AdminApiRoutes.DepartmentAdminPrefix + "/departments")]
[Authorize(Policy = AdminPolicies.DepartmentAdmin)]
public class DepartmentAdminDepartmentsController : ControllerBase
{
    private readonly IDepartmentService _departmentService;
    private readonly IDepartmentScopeService _deptScope;

    public DepartmentAdminDepartmentsController(
        IDepartmentService departmentService,
        IDepartmentScopeService deptScope)
    {
        _departmentService = departmentService;
        _deptScope = deptScope;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var departmentId = _deptScope.GetCurrentDepartmentId(User);
        var departments = await _departmentService.GetAllAsync(departmentId);
        return Ok(ApiResponse<IEnumerable<DepartmentDto>>.Ok(departments));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var departmentId = _deptScope.GetCurrentDepartmentId(User);
        var department = await _departmentService.GetByIdAsync(id, departmentId);
        if (department == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Department not found" }));

        return Ok(ApiResponse<DepartmentDto>.Ok(department));
    }
}
