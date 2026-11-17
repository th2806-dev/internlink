using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using InternLink.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>Provides the consolidated weekly timeline for an assigned student.</summary>
[ApiController]
[Route("api/v1/lecturer")]
[Authorize(Policy = "RequireLecturerOrAdmin")]
public sealed class LecturerTimelineController(ILecturerService lecturerService) : ControllerBase
{
    /// <summary>Returns a filtered page of the signed-in lecturer's assigned students.</summary>
    [HttpGet("students")]
    [ProducesResponseType(typeof(ApiResponse<PaginatedResponse<LecturerStudentListItemDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetStudents(
        [FromQuery] Guid? semesterId,
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? className,
        [FromQuery] string? companyName,
        [FromQuery] bool unassignedCompany = false,
        [FromQuery] string? sortBy = null,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError
            {
                Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized
            }));

        if (skip < 0 || take is < 1 or > 100)
            return BadRequest(ApiResponse<object>.Fail(new ApiError
            {
                Title = "Tham số phân trang không hợp lệ."
            }));

        if (!string.IsNullOrWhiteSpace(status)
            && !Enum.TryParse<InternshipStatus>(status, true, out _))
            return BadRequest(ApiResponse<object>.Fail(new ApiError
            {
                Title = "Trạng thái thực tập không hợp lệ."
            }));

        var page = await lecturerService.GetAssignedStudentsPageAsync(
            userId.Value,
            new LecturerStudentFilterRequest
            {
                SemesterId = semesterId,
                SearchTerm = search,
                Status = status,
                ClassName = className,
                CompanyName = companyName,
                UnassignedCompany = unassignedCompany,
                SortBy = sortBy,
                Skip = skip,
                Take = take
            },
            cancellationToken);

        return Ok(ApiResponse<PaginatedResponse<LecturerStudentListItemDto>>.Ok(page));
    }

    /// <summary>Returns report deadlines, submissions, feedback, and scores for each internship week.</summary>
    [HttpGet("students/{studentId:guid}/timeline")]
    [ProducesResponseType(typeof(ApiResponse<StudentWeeklyTimelineDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStudentTimeline(
        Guid studentId,
        [FromQuery] Guid? semesterId,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError
            {
                Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized
            }));

        var timeline = await lecturerService.GetStudentWeeklyTimelineAsync(
            userId.Value,
            studentId,
            semesterId,
            cancellationToken);
        if (timeline is null)
            return NotFound(ApiResponse<object>.Fail(new ApiError
            {
                Title = "Không tìm thấy sinh viên thuộc nhóm hướng dẫn trong học kỳ này."
            }));

        return Ok(ApiResponse<StudentWeeklyTimelineDto>.Ok(timeline));
    }
}
