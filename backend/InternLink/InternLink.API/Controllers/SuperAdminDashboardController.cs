using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Infrastructure.Persistence;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Controllers;

[ApiController]
[Route(AdminApiRoutes.SuperAdminPrefix + "/dashboard")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public class SuperAdminDashboardController : ControllerBase
{
    private readonly IInternshipService _internshipService;
    private readonly IDepartmentScopeService _deptScope;
    private readonly AppDbContext _db;

    public SuperAdminDashboardController(
        IInternshipService internshipService,
        IDepartmentScopeService deptScope,
        AppDbContext db)
    {
        _internshipService = internshipService;
        _deptScope = deptScope;
        _db = db;
    }

    [HttpGet("internship-stats")]
    public async Task<IActionResult> GetInternshipStats([FromQuery] Guid? semesterId = null, [FromQuery] Guid? departmentId = null)
    {
        var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
        var stats = await _internshipService.GetInternshipStatsAsync(null, semesterId, deptId);
        return Ok(ApiResponse<InternshipStatsDto>.Ok(stats));
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview([FromQuery] Guid? semesterId = null, [FromQuery] Guid? departmentId = null)
    {
        var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
        var students = _db.Students.Where(s => !s.IsDeleted);
        var lecturers = _db.Lecturers.Where(l => !l.IsDeleted);
        var companies = _db.Companies.Where(c => !c.IsDeleted);

        if (deptId.HasValue)
        {
            students = students.Where(s => s.DepartmentId == deptId);
            lecturers = lecturers.Where(l => l.DepartmentId == deptId);
            var departmentCompanyIds = _db.SemesterCompanies
                .Where(sc => !sc.IsDeleted && sc.Semester.DepartmentId == deptId)
                .Select(sc => sc.CompanyId)
                .Union(_db.CompanyPositions
                    .Where(position => !position.IsDeleted && position.Semester != null && position.Semester.DepartmentId == deptId)
                    .Select(position => position.CompanyId))
                .Union(_db.Internships
                    .Where(internship => !internship.IsDeleted && internship.Semester != null && internship.Semester.DepartmentId == deptId && internship.CompanyId.HasValue)
                    .Select(internship => internship.CompanyId!.Value));
            companies = companies.Where(c => departmentCompanyIds.Contains(c.Id));
        }

        var internshipStats = await _internshipService.GetInternshipStatsAsync(null, semesterId, deptId);
        return Ok(ApiResponse<AdminOverviewDto>.Ok(new AdminOverviewDto
        {
            LecturerCount = await lecturers.CountAsync(),
            StudentCount = await students.CountAsync(),
            ActiveStudents = await students.CountAsync(s => s.UserId.HasValue),
            CompanyCount = await companies.CountAsync(),
            ActiveCompanies = await companies.CountAsync(c => c.IsActive),
            InternshipTotal = internshipStats.Total,
            InternshipStats = internshipStats,
        }));
    }
}
