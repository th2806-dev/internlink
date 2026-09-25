using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/Semesters")]
[Authorize]
public class SemesterPortalController : ControllerBase
{
    private readonly ISemesterService _semesterService;
    private readonly IDepartmentScopeService _deptScope;
    private readonly AppDbContext _db;

    public SemesterPortalController(
        ISemesterService semesterService,
        IDepartmentScopeService deptScope,
        AppDbContext db)
    {
        _semesterService = semesterService;
        _deptScope = deptScope;
        _db = db;
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent()
    {
        // Scope theo khoa của người dùng (audit mục 4.1): ưu tiên kỳ riêng của khoa,
        // fallback kỳ dùng chung. GET thuần đọc — không còn side-effect ghi DB.
        var deptId = _deptScope.GetCurrentDepartmentId(User);
        var semester = await _semesterService.GetActiveSemesterAsync(deptId);
        if (semester == null)
        {
            // Keep student portal usable during setup before an admin starts the first semester.
            semester = await _db.Semesters
                .Where(s => !s.IsDeleted && s.Status != SemesterStatus.Completed)
                .OrderBy(s => s.Status == SemesterStatus.Upcoming ? 0 : 1)
                .ThenByDescending(s => s.UpdatedAt ?? s.CreatedAt)
                .Select(s => new SemesterDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Term = s.Term,
                    AcademicYear = s.AcademicYear,
                    StartDate = s.StartDate,
                    EndDate = s.EndDate,
                    Status = s.Status,
                    Description = s.Description,
                    MaxStudentsPerLecturer = s.MaxStudentsPerLecturer,
                    TotalWeeks = s.TotalWeeks
                })
                .FirstOrDefaultAsync();
        }

        return semester == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "No active semester" }))
            : Ok(ApiResponse<SemesterDto>.Ok(semester));
    }
}