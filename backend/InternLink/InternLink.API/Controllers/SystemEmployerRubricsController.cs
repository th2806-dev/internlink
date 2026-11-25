using InternLink.API.Authorization;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Infrastructure.Persistence;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/v1/system/employer-rubrics")]
[Authorize(Policy = AdminPolicies.DepartmentAdmin)]
[RequirePermission(SystemPermissionCodes.ConfigurationUpdate)]
public sealed class SystemEmployerRubricsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IRubricService _rubricService;
    private readonly IDepartmentScopeService _departmentScope;

    public SystemEmployerRubricsController(
        AppDbContext db,
        IRubricService rubricService,
        IDepartmentScopeService departmentScope)
    {
        _db = db;
        _rubricService = rubricService;
        _departmentScope = departmentScope;
    }

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] Guid semesterId,
        [FromQuery] Guid? departmentId,
        CancellationToken cancellationToken)
    {
        if (semesterId == Guid.Empty)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Vui lòng chọn học kỳ." }));
        if (!TryResolveDepartmentScope(ref departmentId))
            return Forbid();
        if (!await IsValidScopeAsync(semesterId, departmentId, cancellationToken))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy học kỳ hoặc khoa trong phạm vi đã chọn." }));

        var config = await _rubricService.GetEmployerConfigAsync(semesterId, departmentId, cancellationToken);
        return Ok(ApiResponse<EmployerRubricConfigDto?>.Ok(config));
    }

    [HttpPut]
    public async Task<IActionResult> Save(
        [FromQuery] Guid semesterId,
        [FromQuery] Guid? departmentId,
        [FromBody] SaveEmployerRubricRequest request,
        CancellationToken cancellationToken)
    {
        if (semesterId == Guid.Empty)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Vui lòng chọn học kỳ." }));
        if (!TryResolveDepartmentScope(ref departmentId))
            return Forbid();
        if (!await IsValidScopeAsync(semesterId, departmentId, cancellationToken))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy học kỳ hoặc khoa trong phạm vi đã chọn." }));

        var userId = User.GetUserId();
        if (!userId.HasValue)
            return Unauthorized();

        try
        {
            var saved = await _rubricService.SaveEmployerConfigAsync(
                semesterId,
                departmentId,
                request,
                userId.Value,
                cancellationToken);
            return Ok(ApiResponse<EmployerRubricConfigDto>.Ok(saved));
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    private async Task<bool> IsValidScopeAsync(
        Guid semesterId,
        Guid? departmentId,
        CancellationToken cancellationToken)
    {
        var semester = await _db.Semesters
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == semesterId && !item.IsDeleted, cancellationToken);
        if (semester == null)
            return false;
        if (departmentId.HasValue)
        {
            if (semester.DepartmentId.HasValue && semester.DepartmentId != departmentId)
                return false;
            return await _db.Departments
                .AnyAsync(item => item.Id == departmentId.Value && !item.IsDeleted, cancellationToken);
        }
        return true;
    }

    private bool TryResolveDepartmentScope(ref Guid? departmentId)
    {
        var currentDepartmentId = _departmentScope.GetCurrentDepartmentId(User);
        if (currentDepartmentId.HasValue && departmentId.HasValue && departmentId != currentDepartmentId)
            return false;
        departmentId = _departmentScope.ResolveEffectiveDepartmentId(User, departmentId);
        return true;
    }
}
