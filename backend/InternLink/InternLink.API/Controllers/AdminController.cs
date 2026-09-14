using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Infrastructure.Persistence;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Controllers;

/// <summary>
/// Admin module endpoints (SuperAdmin only). Extended in later phases.
/// </summary>
[ApiController]
[Route("api/Admin")]
[Authorize(Policy = "RequireAdmin")]
public class AdminController : ControllerBase
{
    private readonly IEmailService _emailService;
    private readonly IInternshipService _internshipService;
    private readonly IDepartmentScopeService _deptScope;
    private readonly AppDbContext _db;

    public AdminController(
        IEmailService emailService,
        IInternshipService internshipService,
        IDepartmentScopeService deptScope,
        AppDbContext db)
    {
        _emailService = emailService;
        _internshipService = internshipService;
        _deptScope = deptScope;
        _db = db;
    }

    /// <summary>
    /// Internship status counts for admin dashboard KPIs and charts.
    /// </summary>
    [HttpGet("internship-stats")]
    public async Task<IActionResult> GetInternshipStats([FromQuery] Guid? semesterId = null, [FromQuery] Guid? departmentId = null)
    {
        try
        {
            var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
            var stats = await _internshipService.GetInternshipStatsAsync(null, semesterId, deptId);
            return Ok(ApiResponse<InternshipStatsDto>.Ok(stats));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = "Internal server error", Detail = ex.Message }));
        }
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
        var studentCount = await students.CountAsync();
        var lecturerCount = await lecturers.CountAsync();
        var companyCount = await companies.CountAsync();
        var activeStudents = await students.CountAsync(s => s.UserId.HasValue);
        var activeCompanies = await companies.CountAsync(c => c.IsActive);

        return Ok(ApiResponse<AdminOverviewDto>.Ok(new AdminOverviewDto
        {
            LecturerCount = lecturerCount,
            StudentCount = studentCount,
            ActiveStudents = activeStudents,
            CompanyCount = companyCount,
            ActiveCompanies = activeCompanies,
            InternshipTotal = internshipStats.Total,
            InternshipStats = internshipStats,
        }));
    }

    /// <summary>
    /// Send a sample invitation email (for SMTP / LoggingEmailService verification) and persist audit log.
    /// </summary>
    [HttpPost("email/test")]
    [Authorize(Policy = "RequireSuperAdmin")]
    public async Task<IActionResult> TestEmail([FromBody] TestEmailRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

        var invitation = new InvitationEmailRequest
        {
            ToEmail = request.ToEmail.Trim(),
            FullName = string.IsNullOrWhiteSpace(request.FullName) ? "Người nhận thử" : request.FullName.Trim(),
            Role = request.Role,
            Username = "demo.user",
            TemporaryPassword = "TempPass123!"
        };

        var result = await _emailService.SendInvitationAsync(invitation, cancellationToken);
        if (!result.Success)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = result.Message ?? "Failed to send email" }));

        // Persist email notification in database
        var targetUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == invitation.ToEmail && !u.IsDeleted, cancellationToken);
        if (targetUser != null)
        {
            await _db.Notifications.AddAsync(new Notification
            {
                Id = Guid.NewGuid(),
                UserId = targetUser.Id,
                Title = "Kiểm tra gửi email thông báo hệ thống",
                Content = $"Đã gửi thử nghiệm thư mời / thông báo tới email: {invitation.ToEmail} thành công.",
                Link = "/admin-settings",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            }, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
        }

        return Ok(ApiResponse<SendEmailResult>.Ok(result));
    }
}
