using InternLink.API.Authorization;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>SuperAdmin controls and execution history for system background jobs.</summary>
[ApiController]
[Route("api/v1/system/jobs")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public sealed class SysJobsController(ISystemJobsService jobsService) : ControllerBase
{
    /// <summary>Lists registered jobs and recent execution history.</summary>
    [HttpGet]
    [RequirePermission(SystemPermissionCodes.ObservabilityView)]
    public async Task<ActionResult<ApiResponse<SystemJobsDashboardResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var result = await jobsService.GetJobsAsync(cancellationToken);
        return Ok(ApiResponse<SystemJobsDashboardResponse>.Ok(result));
    }

    /// <summary>Runs a registered job now and records its result.</summary>
    [HttpPost("{jobCode}/run")]
    [RequirePermission(SystemPermissionCodes.ObservabilityApprove)]
    public async Task<ActionResult<ApiResponse<JobExecutionResponse>>> RunNow(
        string jobCode,
        CancellationToken cancellationToken)
    {
        var username = User.Identity?.Name ?? User.FindFirst("sub")?.Value ?? "system";
        var result = await jobsService.TriggerAsync(jobCode, username, cancellationToken);
        return result == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy job hoặc job đang tắt." }))
            : Ok(ApiResponse<JobExecutionResponse>.Ok(result));
    }

    /// <summary>Enables or disables a registered background job.</summary>
    [HttpPatch("{jobCode}/enabled")]
    [RequirePermission(SystemPermissionCodes.ObservabilityUpdate)]
    public async Task<ActionResult<ApiResponse<SystemJobResponse>>> SetEnabled(
        string jobCode,
        [FromBody] SetSystemJobEnabledRequest request,
        CancellationToken cancellationToken)
    {
        var result = await jobsService.SetEnabledAsync(jobCode, request.IsEnabled, cancellationToken);
        return result == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy job." }))
            : Ok(ApiResponse<SystemJobResponse>.Ok(result));
    }

    /// <summary>Updates the recurring schedule for automated database backups.</summary>
    [HttpPut("{jobCode}/schedule")]
    [RequirePermission(SystemPermissionCodes.ObservabilityUpdate)]
    public async Task<ActionResult<ApiResponse<SystemJobResponse>>> SetSchedule(
        string jobCode,
        [FromBody] SetSystemJobScheduleRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await jobsService.SetScheduleAsync(jobCode, request.CronExpression, cancellationToken);
            return result == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy job." }))
                : Ok(ApiResponse<SystemJobResponse>.Ok(result));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }
}
