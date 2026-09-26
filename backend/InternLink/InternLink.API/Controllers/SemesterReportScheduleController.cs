using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/Semesters/{semesterId:guid}/report-schedules")]
public class SemesterReportScheduleController : ControllerBase
{
    private readonly ISemesterService _semesterService;
    private readonly ILecturerAccessService _lecturerAccessService;

    public SemesterReportScheduleController(ISemesterService semesterService, ILecturerAccessService lecturerAccessService)
    {
        _semesterService = semesterService;
        _lecturerAccessService = lecturerAccessService;
    }

    /// <summary>
    /// DepartmentAdmin có DepartmentId claim; Lecturer/SuperAdmin đi qua kiểm tra phân công theo kỳ.
    /// </summary>
    private async Task EnsureSemesterWriteAccessAsync(Guid semesterId)
    {
        if (User.IsInRole("DepartmentAdmin"))
            return;

        var userId = User.GetUserId();
        if (userId == null)
            throw new UnauthorizedAccessException("Unauthorized");

        await _lecturerAccessService.EnsureCanManageSemesterAsync(semesterId, userId.Value);
    }

    [HttpGet]
    // Mọi user đã đăng nhập (gồm Sinh viên) đều đọc được lịch deadline —
    // portal SV cần hiển thị hạn nộp GV đã cấu hình. Việc SỬA vẫn giới hạn ở GV/admin.
    [Authorize]
    public async Task<IActionResult> GetReportSchedules(Guid semesterId)
    {
        var schedules = await _semesterService.GetReportSchedulesAsync(semesterId);
        return Ok(ApiResponse<IEnumerable<SemesterReportScheduleDto>>.Ok(schedules));
    }

    [HttpPost("generate-defaults")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> GenerateDefaults(Guid semesterId)
    {
        try
        {
            await EnsureSemesterWriteAccessAsync(semesterId);
            var schedules = await _semesterService.GenerateDefaultSchedulesAsync(semesterId);
            return Ok(ApiResponse<IEnumerable<SemesterReportScheduleDto>>.Ok(schedules));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPut("{weekNumber:int}")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> UpdateSchedule(
        Guid semesterId,
        int weekNumber,
        [FromBody] UpdateReportScheduleRequest request)
    {
        try
        {
            await EnsureSemesterWriteAccessAsync(semesterId);
            var updated = await _semesterService.UpdateReportScheduleAsync(semesterId, weekNumber, request);
            return Ok(ApiResponse<SemesterReportScheduleDto>.Ok(updated));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }
}
