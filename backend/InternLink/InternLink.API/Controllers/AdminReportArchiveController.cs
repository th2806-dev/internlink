using InternLink.API.Extensions;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/Admin/report-archive")]
[Route(AdminApiRoutes.DepartmentAdminPrefix + "/report-archive")]
[Authorize(Policy = AdminPolicies.DepartmentAdmin)]
public sealed class AdminReportArchiveController : ControllerBase
{
    private readonly IWeeklyReportArchiveService _archiveService;
    private readonly IDepartmentScopeService _departmentScope;

    public AdminReportArchiveController(
        IWeeklyReportArchiveService archiveService,
        IDepartmentScopeService departmentScope)
    {
        _archiveService = archiveService;
        _departmentScope = departmentScope;
    }

    [HttpGet("{semesterId:guid}/students")]
    public async Task<IActionResult> GetStudents(Guid semesterId)
    {
        var departmentId = _departmentScope.GetCurrentDepartmentId(User);
        if (!departmentId.HasValue)
            return Forbid();

        var students = await _archiveService.GetStudentsAsync(semesterId, departmentId.Value);
        if (students == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy học kỳ trong phạm vi khoa." }));

        return Ok(ApiResponse<IReadOnlyList<InternLink.Application.DTOs.WeeklyReportArchiveStudentDto>>.Ok(students));
    }

    [HttpGet("{semesterId:guid}/download")]
    public async Task<IActionResult> Download(Guid semesterId, [FromQuery] Guid? studentId = null)
    {
        var departmentId = _departmentScope.GetCurrentDepartmentId(User);
        var userId = User.GetUserId();
        if (!departmentId.HasValue)
            return Forbid();
        if (!userId.HasValue)
            return Unauthorized();

        try
        {
            var zip = await _archiveService.CreateZipAsync(semesterId, departmentId.Value, userId.Value, studentId);
            if (zip == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không có báo cáo tuần để tải trong phạm vi đã chọn." }));
            return File(zip.Content, "application/zip", zip.FileName);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}