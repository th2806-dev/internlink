using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly IAttendanceService _attendanceService;
    private readonly ILecturerAccessService _lecturerAccessService;
    private readonly IStudentService _studentService;
    private readonly IDepartmentScopeService _deptScope;
    private readonly ILogger<AttendanceController> _logger;

    public AttendanceController(
        IAttendanceService attendanceService,
        ILecturerAccessService lecturerAccessService,
        IStudentService studentService,
        IDepartmentScopeService deptScope,
        ILogger<AttendanceController> logger)
    {
        _attendanceService = attendanceService;
        _lecturerAccessService = lecturerAccessService;
        _studentService = studentService;
        _deptScope = deptScope;
        _logger = logger;
    }

    private async Task<Guid?> ResolveCurrentLecturerIdAsync()
    {
        var userId = User.GetUserId();
        if (userId == null) return null;
        return await _lecturerAccessService.ResolveLecturerIdAsync(userId.Value);
    }

    // =========================================================================
    // LECTURER SESSIONS & ATTENDANCE
    // =========================================================================

    /// <summary>
    /// Lấy danh sách buổi gặp trong học kỳ.
    /// Lecturer: buổi của mình. Admin: theo lecturerId nếu có, hoặc tất cả buổi trong khoa của mình.
    /// </summary>
    [HttpGet("sessions")]
    [Authorize(Policy = "RequireLecturerOrAdmin")]
    public async Task<IActionResult> GetLecturerSessions([FromQuery] Guid semesterId, [FromQuery] Guid? lecturerId = null)
    {
        List<AttendanceSessionDto> sessions;
        if (User.IsLecturer())
        {
            var resolvedId = await ResolveCurrentLecturerIdAsync();
            if (!resolvedId.HasValue)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy hồ sơ giảng viên." }));
            sessions = await _attendanceService.GetLecturerSessionsAsync(resolvedId.Value, semesterId);
        }
        else if (lecturerId.HasValue)
        {
            sessions = await _attendanceService.GetLecturerSessionsAsync(lecturerId.Value, semesterId);
        }
        else
        {
            // Admin không chỉ định giảng viên: trả buổi của toàn khoa (SuperAdmin → tất cả khoa).
            var deptId = _deptScope.GetCurrentDepartmentId(User);
            sessions = await _attendanceService.GetSessionsBySemesterAsync(semesterId, deptId);
        }

        return Ok(ApiResponse<List<AttendanceSessionDto>>.Ok(sessions));
    }

    /// <summary>
    /// Tổng số buổi vắng theo sinh viên trong 1 kỳ (dùng cho cảnh báo vắng >= 2 buổi).
    /// Lecturer: chỉ sinh viên của mình. Admin: toàn bộ hoặc theo lecturerId.
    /// </summary>
    [HttpGet("absence-summary")]
    [Authorize(Policy = "RequireLecturerOrAdmin")]
    public async Task<IActionResult> GetAbsenceSummary([FromQuery] Guid semesterId, [FromQuery] Guid? lecturerId = null)
    {
        Guid targetLecturerId;
        if (User.IsLecturer())
        {
            var resolvedId = await ResolveCurrentLecturerIdAsync();
            if (!resolvedId.HasValue)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy hồ sơ giảng viên." }));
            targetLecturerId = resolvedId.Value;
        }
        else if (lecturerId.HasValue)
        {
            targetLecturerId = lecturerId.Value;
        }
        else
        {
            targetLecturerId = Guid.Empty; // admin: tất cả
        }

        var summary = await _attendanceService.GetStudentAbsenceSummaryAsync(targetLecturerId, semesterId);
        return Ok(ApiResponse<Dictionary<string, int>>.Ok(summary));
    }

    /// <summary>
    /// Lấy chi tiết buổi gặp và danh sách điểm danh
    /// </summary>
    [HttpGet("sessions/{id:guid}")]
    [Authorize(Policy = "RequireLecturerOrAdmin")]
    public async Task<IActionResult> GetSessionDetail(Guid id)
    {
        Guid? lecturerId = null;
        if (User.IsLecturer())
        {
            lecturerId = await ResolveCurrentLecturerIdAsync();
        }

        var session = await _attendanceService.GetSessionDetailAsync(id, lecturerId);
        if (session == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy buổi gặp." }));

        return Ok(ApiResponse<AttendanceSessionDetailDto>.Ok(session));
    }

    /// <summary>
    /// Giảng viên tạo buổi gặp mới
    /// </summary>
    [HttpPost("sessions")]
    [Authorize(Policy = "RequireLecturer")]
    public async Task<IActionResult> CreateSession([FromBody] CreateAttendanceSessionDto dto)
    {
        var lecturerId = await ResolveCurrentLecturerIdAsync();
        if (!lecturerId.HasValue)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy giảng viên tương ứng." }));

        try
        {
            var session = await _attendanceService.CreateSessionAsync(lecturerId.Value, dto);
            return Ok(ApiResponse<AttendanceSessionDetailDto>.Ok(session));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>
    /// Giảng viên cập nhật thông tin buổi gặp
    /// </summary>
    [HttpPut("sessions/{id:guid}")]
    [Authorize(Policy = "RequireLecturer")]
    public async Task<IActionResult> UpdateSession(Guid id, [FromBody] UpdateAttendanceSessionDto dto)
    {
        var lecturerId = await ResolveCurrentLecturerIdAsync();
        if (!lecturerId.HasValue)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy giảng viên tương ứng." }));

        try
        {
            var updated = await _attendanceService.UpdateSessionAsync(id, lecturerId.Value, dto);
            return Ok(ApiResponse<AttendanceSessionDetailDto>.Ok(updated));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>
    /// Giảng viên xóa buổi gặp
    /// </summary>
    [HttpDelete("sessions/{id:guid}")]
    [Authorize(Policy = "RequireLecturer")]
    public async Task<IActionResult> DeleteSession(Guid id)
    {
        var lecturerId = await ResolveCurrentLecturerIdAsync();
        if (!lecturerId.HasValue)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy giảng viên tương ứng." }));

        var ok = await _attendanceService.DeleteSessionAsync(id, lecturerId.Value);
        if (!ok)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy buổi gặp hoặc bạn không có quyền xóa." }));

        return Ok(ApiResponse<bool>.Ok(true));
    }

    /// <summary>
    /// Giảng viên điểm danh sinh viên trong buổi gặp
    /// </summary>
    [HttpPost("sessions/{id:guid}/mark")]
    [Authorize(Policy = "RequireLecturer")]
    public async Task<IActionResult> MarkAttendance(Guid id, [FromBody] MarkAttendanceDto dto)
    {
        var lecturerId = await ResolveCurrentLecturerIdAsync();
        if (!lecturerId.HasValue)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy giảng viên tương ứng." }));

        try
        {
            var result = await _attendanceService.MarkAttendanceAsync(id, lecturerId.Value, dto);
            return Ok(ApiResponse<AttendanceSessionDetailDto>.Ok(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>
    /// Giảng viên xem chi tiết lịch sử điểm danh của 1 sinh viên trong workspace
    /// </summary>
    [HttpGet("lecturer/students/{studentId:guid}")]
    [Authorize(Policy = "RequireLecturerOrAdmin")]
    public async Task<IActionResult> GetStudentAttendanceForLecturer(Guid studentId, [FromQuery] Guid semesterId)
    {
        var lecturerId = await ResolveCurrentLecturerIdAsync();
        if (!lecturerId.HasValue)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy giảng viên tương ứng." }));

        var records = await _attendanceService.GetStudentAttendanceForLecturerAsync(lecturerId.Value, studentId, semesterId);
        return Ok(ApiResponse<List<AttendanceRecordDto>>.Ok(records));
    }

    // =========================================================================
    // STUDENT PORTAL
    // =========================================================================

    /// <summary>
    /// Sinh viên xem lịch sử điểm danh và các buổi gặp của mình trong học kỳ
    /// </summary>
    [HttpGet("student/me")]
    [Authorize(Policy = "RequireStudent")]
    public async Task<IActionResult> GetStudentAttendance([FromQuery] Guid semesterId)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var student = await _studentService.GetStudentByUserIdAsync(userId.Value);
        if (student == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy hồ sơ sinh viên." }));

        var result = await _attendanceService.GetStudentAttendanceAsync(student.Id, semesterId);
        return Ok(ApiResponse<StudentAttendanceOverviewDto>.Ok(result));
    }

    // =========================================================================
    // ADMIN REPORTS
    // =========================================================================

    /// <summary>
    /// Admin xem báo cáo chuyên cần toàn diện trong học kỳ
    /// </summary>
    [HttpGet("admin/report")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> GetAdminAttendanceReport([FromQuery] Guid semesterId)
    {
        var deptId = _deptScope.GetCurrentDepartmentId(User);
        var report = await _attendanceService.GetAdminAttendanceReportAsync(semesterId, deptId);
        return Ok(ApiResponse<AdminAttendanceReportDto>.Ok(report));
    }
}
