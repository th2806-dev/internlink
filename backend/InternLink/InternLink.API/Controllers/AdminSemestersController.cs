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
/// Admin semester management (terms, lifecycle, closing/archiving).
/// Semester lifecycle (create/update/start/close/delete) is DEPARTMENT business:
/// only DepartmentAdmin operates on their own department's terms.
/// SuperAdmin is read-only (system-wide oversight); they may view all terms
/// filtered by the header department selector.
/// </summary>
[ApiController]
[Route("api/Admin/semesters")]
[Route("api/Semesters")]
[Authorize(Policy = AdminPolicies.DepartmentAdmin)]
public class AdminSemestersController : ControllerBase
{
    private readonly ISemesterService _semesterService;
    private readonly IDepartmentScopeService _deptScope;

    public AdminSemestersController(ISemesterService semesterService, IDepartmentScopeService deptScope)
    {
        _semesterService = semesterService;
        _deptScope = deptScope;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? departmentId = null)
    {
        var departmentIdForQuery = _deptScope.GetCurrentDepartmentId(User);
        var semesters = await _semesterService.GetAllSemestersAsync(departmentId: departmentIdForQuery);
        return Ok(ApiResponse<IEnumerable<SemesterDto>>.Ok(semesters));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var semester = await _semesterService.GetSemesterByIdAsync(id);
        if (semester == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Semester not found" }));

        if (!_deptScope.HasAccess(User, semester.DepartmentId))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Semester not found" }));

        return Ok(ApiResponse<SemesterDto>.Ok(semester));
    }

    [HttpPost]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Create([FromBody] CreateSemesterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Name is required" }));

        if (string.IsNullOrWhiteSpace(dto.Term))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Term is required" }));

        if (string.IsNullOrWhiteSpace(dto.AcademicYear))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "AcademicYear is required" }));

        // Semesters are department-owned: always force the admin's own department.
        dto.DepartmentId = _deptScope.GetCurrentDepartmentId(User);

        var created = await _semesterService.CreateSemesterAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<SemesterDto>.Ok(created));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSemesterDto dto)
    {
        var existing = await _semesterService.GetSemesterByIdAsync(id);
        if (existing == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Semester not found" }));

        if (!_deptScope.HasAccess(User, existing.DepartmentId))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Semester not found" }));

        var updated = await _semesterService.UpdateSemesterAsync(id, dto);
        if (updated == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Semester not found" }));

        return Ok(ApiResponse<SemesterDto>.Ok(updated));
    }

    [HttpPost("{id:guid}/close")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Close(Guid id)
    {
        if (!await _deptCanAccessSemester(id))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Semester not found" }));

        var success = await _semesterService.CloseSemesterAsync(id);
        if (!success)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Semester not found" }));

        return Ok(ApiResponse<object>.Ok(new { message = "Semester closed and student accounts archived successfully" }));
    }

    [HttpPost("{id:guid}/start")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Start(Guid id)
    {
        if (!await _deptCanAccessSemester(id))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Semester not found" }));

        try
        {
            var started = await _semesterService.StartSemesterAsync(id);
            if (started == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Semester not found" }));

            return Ok(ApiResponse<SemesterDto>.Ok(started));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!await _deptCanAccessSemester(id))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Semester not found" }));

        var success = await _semesterService.DeleteSemesterAsync(id);
        if (!success)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Semester not found" }));

        return Ok(ApiResponse<object>.Ok(new { message = "Semester deleted successfully" }));
    }

    private async Task<bool> _deptCanAccessSemester(Guid id)
    {
        var semester = await _semesterService.GetSemesterByIdAsync(id);
        // DepartmentAdmin may only operate on their OWN department's terms —
        // shared legacy terms (DepartmentId = null) are read-only for them.
        return semester != null
            && semester.DepartmentId != null
            && _deptScope.HasAccess(User, semester.DepartmentId);
    }
}
