using System;
using System.Collections.Generic;
using System.Threading.Tasks;
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

    public SemesterReportScheduleController(ISemesterService semesterService)
    {
        _semesterService = semesterService;
    }

    [HttpGet]
    [Authorize(Policy = "RequireLecturerOrAdmin")]
    public async Task<IActionResult> GetReportSchedules(Guid semesterId)
    {
        var schedules = await _semesterService.GetReportSchedulesAsync(semesterId);
        return Ok(ApiResponse<IEnumerable<SemesterReportScheduleDto>>.Ok(schedules));
    }

    [HttpPost("generate-defaults")]
    [Authorize(Policy = "RequireLecturerOrAdmin")]
    public async Task<IActionResult> GenerateDefaults(Guid semesterId)
    {
        try
        {
            var schedules = await _semesterService.GenerateDefaultSchedulesAsync(semesterId);
            return Ok(ApiResponse<IEnumerable<SemesterReportScheduleDto>>.Ok(schedules));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPut("{weekNumber:int}")]
    [Authorize(Policy = "RequireLecturerOrAdmin")]
    public async Task<IActionResult> UpdateSchedule(
        Guid semesterId,
        int weekNumber,
        [FromBody] UpdateReportScheduleRequest request)
    {
        try
        {
            var updated = await _semesterService.UpdateReportScheduleAsync(semesterId, weekNumber, request);
            return Ok(ApiResponse<SemesterReportScheduleDto>.Ok(updated));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }
}
