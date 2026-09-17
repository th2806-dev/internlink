using InternLink.Application.Interfaces;
using InternLink.API.Extensions;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>
/// Dedicated controller for exporting production Excel and summary reports.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireLecturerOrAdmin")]
public class ExportController : ControllerBase
{
    private readonly IExcelExportService _excelExportService;
    private readonly IInternshipReportService _reportService;
    private readonly ILogger<ExportController> _logger;
    private readonly ILecturerAccessService _lecturerAccessService;
    private readonly IDepartmentScopeService _deptScope;

    public ExportController(
        IExcelExportService excelExportService,
        IInternshipReportService reportService,
        ILogger<ExportController> logger,
        ILecturerAccessService lecturerAccessService,
        IDepartmentScopeService deptScope)
    {
        _excelExportService = excelExportService;
        _reportService = reportService;
        _logger = logger;
        _lecturerAccessService = lecturerAccessService;
        _deptScope = deptScope;
    }

    /// <summary>
    /// Exports the full multi-sheet internship Excel report based on the institutional C23 template
    /// (Sheets: DANH SÁCH THỰC TẬP, DANH SÁCH DOANH NGHIỆP, DANH SÁCH GIẢNG VIÊN PHÂN CÔNG).
    /// </summary>
    [HttpGet("internship-excel")]
    public async Task<IActionResult> ExportInternshipExcel(
        [FromQuery] Guid? semesterId = null,
        [FromQuery] Guid? lecturerId = null,
        [FromQuery] string? department = null,
        [FromQuery] Guid? departmentId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
            _logger.LogInformation("Admin/Lecturer initiated Excel export for semester: {SemesterId}, Lecturer: {LecturerId}, Department: {Department}, DepartmentId: {DepartmentId}", semesterId, lecturerId, department, deptId);
            var fileBytes = await _excelExportService.GenerateInternshipExportExcelAsync(semesterId, lecturerId, department, deptId, cancellationToken);
            var fileName = $"DanhSachThucTap_{DateTime.Now:yyyy-MM-dd}.xlsx";

            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate Excel export");
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError
            {
                Title = "Lỗi khi xuất file Excel",
                Detail = ex.Message
            }));
        }
    }

    [HttpGet("lecturer-internship-excel")]
    public async Task<IActionResult> ExportLecturerInternshipExcel([FromQuery] Guid? semesterId = null, CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized();

        var lecturerId = await _lecturerAccessService.ResolveLecturerIdAsync(userId.Value);
        if (lecturerId == null)
            return Forbid();

        var fileBytes = await _excelExportService.GenerateInternshipExportExcelAsync(semesterId, lecturerId.Value, null, null, cancellationToken);
        return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"DanhSachThucTap_{DateTime.Now:yyyy-MM-dd}.xlsx");
    }

    /// <summary>
    /// Exports the official academic summary report (C22A template) for the faculty.
    /// </summary>
    [HttpGet("summary-report")]
    public async Task<IActionResult> ExportSummaryReport(
        [FromQuery] Guid? semesterId = null,
        [FromQuery] string? department = null,
        [FromQuery] Guid? departmentId = null)
    {
        try
        {
            var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
            _logger.LogInformation("Admin initiated summary report export for semester: {SemesterId}, Department: {Department}, DepartmentId: {DepartmentId}", semesterId, department, deptId);
            var fileBytes = await _reportService.ExportC22ASummaryReportAsync(semesterId, department, deptId);
            var fileName = $"Bao-cao-tong-ket-thuc-tap-{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";

            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate summary report");
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError
            {
                Title = "Lỗi khi xuất báo cáo tổng kết",
                Detail = ex.Message
            }));
        }
    }

    /// <summary>
    /// Exports the official academic summary report as a Word (.docx) file
    /// based on the C22A template with dynamic data from the database.
    /// </summary>
    [HttpGet("summary-report/word")]
    public async Task<IActionResult> ExportSummaryReportWord(
        [FromQuery] Guid? semesterId = null,
        [FromQuery] string? department = null,
        [FromQuery] Guid? departmentId = null)
    {
        try
        {
            var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
            _logger.LogInformation("Admin initiated Word summary report export for semester: {SemesterId}, Department: {Department}, DepartmentId: {DepartmentId}", semesterId, department, deptId);
            Guid? lecturerId = null;
            if (User.IsInRole("Lecturer"))
            {
                var userId = User.GetUserId();
                if (userId == null) return Unauthorized();
                lecturerId = await _lecturerAccessService.ResolveLecturerIdAsync(userId.Value);
            }
            var fileBytes = await _reportService.ExportC22AWordReportAsync(semesterId, department, deptId, lecturerId);
            var fileName = $"Bao-cao-tong-ket-thuc-tap-{DateTime.Now:yyyyMMdd_HHmmss}.docx";

            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                fileName);
        }
        catch (FileNotFoundException ex)
        {
            _logger.LogError(ex, "Word template not found");
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError
            {
                Title = "Không tìm thấy mẫu Word",
                Detail = ex.Message
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate Word summary report");
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError
            {
                Title = "Lỗi khi xuất báo cáo tổng kết Word",
                Detail = ex.Message
            }));
        }
    }

    /// <summary>
    /// Exports the institutional Guidance Schedule Excel (.xlsx) based on Lich huong dan TTTN-C23-Cuong.xlsx
    /// for the specified lecturer and semester.
    /// </summary>
    [HttpGet("guidance-schedule")]
    public async Task<IActionResult> ExportGuidanceSchedule(
        [FromQuery] Guid semesterId,
        [FromQuery] Guid? lecturerId = null,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized();

        Guid targetLecturerId;
        var isLecturer = User.IsInRole("Lecturer");
        var isAdmin = User.IsInRole("SuperAdmin");

        if (isLecturer && !isAdmin)
        {
            var resolvedLecturerId = await _lecturerAccessService.ResolveLecturerIdAsync(userId.Value);
            if (resolvedLecturerId == null)
                return Forbid();
            targetLecturerId = resolvedLecturerId.Value;
        }
        else if (lecturerId.HasValue)
        {
            targetLecturerId = lecturerId.Value;
        }
        else
        {
            var resolvedLecturerId = await _lecturerAccessService.ResolveLecturerIdAsync(userId.Value);
            if (resolvedLecturerId != null)
                targetLecturerId = resolvedLecturerId.Value;
            else
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Cần chỉ định mã giảng viên (lecturerId)" }));
        }

        try
        {
            var fileBytes = await _excelExportService.GenerateGuidanceScheduleExcelAsync(semesterId, targetLecturerId, cancellationToken);
            var fileName = $"LichHuongDanTTTN_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";

            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate guidance schedule Excel");
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError
            {
                Title = "Lỗi khi xuất lịch hướng dẫn thực tập",
                Detail = ex.Message
            }));
        }
    }
}
