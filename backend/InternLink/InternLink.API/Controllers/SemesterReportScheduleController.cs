using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Infrastructure.Persistence;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/Semesters/{semesterId:guid}/report-schedules")]
public class SemesterReportScheduleController : ControllerBase
{
    private readonly ISemesterService _semesterService;
    private readonly ILecturerAccessService _lecturerAccessService;
    private readonly IDepartmentScopeService _departmentScope;
    private readonly AppDbContext _db;

    public SemesterReportScheduleController(
        ISemesterService semesterService,
        ILecturerAccessService lecturerAccessService,
        IDepartmentScopeService departmentScope,
        AppDbContext db)
    {
        _semesterService = semesterService;
        _lecturerAccessService = lecturerAccessService;
        _departmentScope = departmentScope;
        _db = db;
    }

    /// <summary>
    /// DepartmentAdmin có DepartmentId claim; Lecturer/SuperAdmin đi qua kiểm tra phân công theo kỳ.
    /// </summary>
    private async Task EnsureSemesterWriteAccessAsync(Guid semesterId)
    {
        if (User.IsInRole("DepartmentAdmin"))
        {
            var departmentId = await _db.Semesters
                .AsNoTracking()
                .Where(semester => semester.Id == semesterId && !semester.IsDeleted)
                .Select(semester => semester.DepartmentId)
                .SingleOrDefaultAsync();

            if (!_departmentScope.GetCurrentDepartmentId(User).HasValue
                || !departmentId.HasValue
                || !_departmentScope.HasAccess(User, departmentId))
            {
                throw new UnauthorizedAccessException("Không có quyền thao tác kỳ thực tập của khoa khác hoặc kỳ dùng chung.");
            }
            return;
        }

        var userId = User.GetUserId();
        if (userId == null)
            throw new UnauthorizedAccessException("Unauthorized");

        await _lecturerAccessService.EnsureCanManageSemesterAsync(semesterId, userId.Value);
    }

    [HttpGet]
    // Mọi user đã đăng nhập (gồm Sinh viên) đều đọc được lịch deadline —
    // SemesterReportSchedules có cột LecturerId: lịch riêng theo GV (override) và lịch chung kỳ
    // (LecturerId = null). Lecturer nhận lịch override riêng của mình (fallback lịch chung),
    // role khác nhận lịch chung kỳ.
    [Authorize]
    public async Task<IActionResult> GetReportSchedules(Guid semesterId)
    {
        var schedules = await ReadSchedulesForCurrentUserAsync(semesterId);
        return Ok(ApiResponse<IEnumerable<SemesterReportScheduleDto>>.Ok(schedules));
    }

    /// <summary>
    /// Lấy lịch báo cáo theo ngữ cảnh người dùng: Lecturer → lịch override riêng của GV đó
    /// (fallback lịch chung); Sinh viên → lịch riêng của GV đang hướng dẫn (fallback lịch
    /// chung); role khác (admin) → lịch chung kỳ (lecturerId = null).
    /// </summary>
    private async Task<IEnumerable<SemesterReportScheduleDto>> ReadSchedulesForCurrentUserAsync(Guid semesterId)
    {
        var userId = User.GetUserId();

        if (User.IsInRole("Lecturer") && userId != null)
        {
            var ownLecturerId = await _lecturerAccessService.ResolveLecturerIdAsync(userId.Value);
            return await _semesterService.GetReportSchedulesAsync(semesterId, ownLecturerId);
        }

        if (User.IsInRole("Student") && userId != null)
        {
            var supervisorLecturerId = await _lecturerAccessService.ResolveStudentSupervisorLecturerIdAsync(userId.Value, semesterId);
            return await _semesterService.GetReportSchedulesAsync(semesterId, supervisorLecturerId);
        }
        // ReadModel per-week merge lives in GetReportSchedulesAsync; pass lecturerId = null for admin/others.
        return await _semesterService.GetReportSchedulesAsync(semesterId, null);
    }

    /// <summary>
    /// Lecturer → LecturerId profile của người dùng hiện tại; role khác → null (lịch chung kỳ).
    /// Ghi của admin khoa luôn tác động lên lịch chung — cấp khoa đặt deadline toàn kỳ.
    /// </summary>
    private async Task<Guid?> ResolveCurrentLecturerIdAsync()
    {
        var userId = User.GetUserId();
        if (User.IsInRole("Lecturer") && userId != null)
        {
            var lecturerId = await _lecturerAccessService.ResolveLecturerIdAsync(userId.Value);
            if (lecturerId == null)
            {
                throw new InvalidOperationException("Tài khoản giảng viên chưa được liên kết với hồ sơ giảng viên.");
            }
            return lecturerId;
        }
        return null;
    }

    [HttpPost("generate-defaults")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> GenerateDefaults(Guid semesterId)
    {
        try
        {
            await EnsureSemesterWriteAccessAsync(semesterId);
            var lecturerId = await ResolveCurrentLecturerIdAsync();
            var schedules = await _semesterService.GenerateDefaultSchedulesAsync(semesterId, lecturerId);
            return Ok(ApiResponse<IEnumerable<SemesterReportScheduleDto>>.Ok(schedules));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 400 }));
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
            var lecturerId = await ResolveCurrentLecturerIdAsync();
            var updated = await _semesterService.UpdateReportScheduleAsync(semesterId, weekNumber, request, lecturerId);
            return Ok(ApiResponse<SemesterReportScheduleDto>.Ok(updated));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 400 }));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>Reads the optional evidence-upload window for the semester.</summary>
    [HttpGet("evidence-deadline")]
    [Authorize]
    public async Task<IActionResult> GetEvidenceDeadline(Guid semesterId)
    {
        var setting = await _db.SystemSettings.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Key == EvidenceDeadlineKey(semesterId) && !item.IsDeleted);
        var deadline = setting == null
            ? null
            : JsonSerializer.Deserialize<SupplementalDeadlineDto>(setting.Value);
        return Ok(ApiResponse<SupplementalDeadlineDto?>.Ok(deadline));
    }

    /// <summary>Creates or updates the evidence-upload window for a semester.</summary>
    [HttpPut("evidence-deadline")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> SaveEvidenceDeadline(Guid semesterId, [FromBody] SupplementalDeadlineDto request)
    {
        try
        {
            await EnsureSemesterWriteAccessAsync(semesterId);
            if (request.StartDate > request.EndDate)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Ngày bắt đầu phải trước hoặc trùng ngày kết thúc." }));

            var setting = await _db.SystemSettings
                .FirstOrDefaultAsync(item => item.Key == EvidenceDeadlineKey(semesterId) && !item.IsDeleted);
            if (setting == null)
            {
                setting = new InternLink.Domain.Entities.SystemSetting
                {
                    Id = Guid.NewGuid(),
                    Key = EvidenceDeadlineKey(semesterId),
                    Category = "Deadlines",
                    Description = "Khoảng thời gian nộp minh chứng cho học kỳ",
                    CreatedAt = DateTime.UtcNow
                };
                _db.SystemSettings.Add(setting);
            }

            setting.Value = JsonSerializer.Serialize(new SupplementalDeadlineDto
            {
                StartDate = request.StartDate,
                EndDate = request.EndDate
            });
            setting.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(ApiResponse<SupplementalDeadlineDto>.Ok(request));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    private static string EvidenceDeadlineKey(Guid semesterId) => $"EvidenceUploadDeadline:{semesterId:N}";
}
