using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>
/// Admin department management (CRUD).
/// SuperAdmin may manage all departments; DepartmentAdmin may view only their own department.
/// </summary>
[ApiController]
[Route("api/Admin/departments")]
[Route(AdminApiRoutes.SuperAdminPrefix + "/departments")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public class AdminDepartmentsController : ControllerBase
{
    private readonly IDepartmentService _departmentService;
    private readonly IDepartmentScopeService _deptScope;

    public AdminDepartmentsController(IDepartmentService departmentService, IDepartmentScopeService deptScope)
    {
        _departmentService = departmentService;
        _deptScope = deptScope;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        if (skip < 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Skip must be greater than or equal to 0" }));
        if (take < 1 || take > 1000)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Take must be between 1 and 1000" }));

        var departments = await _departmentService.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<DepartmentDto>>.Ok(departments));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var department = await _departmentService.GetByIdAsync(id);
        if (department == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Department not found" }));

        return Ok(ApiResponse<DepartmentDto>.Ok(department));
    }

    [HttpPost]
    [Authorize(Policy = "RequireSuperAdmin")]
    public async Task<IActionResult> Create([FromBody] CreateDepartmentRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

            var department = await _departmentService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = department.Id }, ApiResponse<DepartmentDto>.Ok(department));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireSuperAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDepartmentRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

            var department = await _departmentService.UpdateAsync(id, request);
            if (department == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Department not found" }));

            return Ok(ApiResponse<DepartmentDto>.Ok(department));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "RequireSuperAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var ok = await _departmentService.DeleteAsync(id);
            if (!ok)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Department not found" }));

            return Ok(ApiResponse<object>.Ok(new { message = "Department deleted successfully" }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }
}
