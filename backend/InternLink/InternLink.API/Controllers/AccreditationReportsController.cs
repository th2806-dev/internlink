using InternLink.API.Extensions;
using InternLink.API.Authorization;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/v1/reports")]
[Authorize(Policy = "RequireLecturerOrAdmin")]
public sealed class AccreditationReportsController : ControllerBase
{
    private readonly IInternshipReportService _reportService;
    private readonly IExcelExportService _excelExportService;
    private readonly ILecturerAccessService _lecturerAccess;
    private readonly IDepartmentScopeService _departmentScope;
    private readonly ILogger<AccreditationReportsController> _logger;

    public AccreditationReportsController(
        IInternshipReportService reportService,
        IExcelExportService excelExportService,
        ILecturerAccessService lecturerAccess,
        IDepartmentScopeService departmentScope,
        ILogger<AccreditationReportsController> logger)
    {
        _reportService = reportService;
        _excelExportService = excelExportService;
        _lecturerAccess = lecturerAccess;
        _departmentScope = departmentScope;
        _logger = logger;
    }

    [HttpGet("c22/export-batch")]
    [RequirePermission(SystemPermissionCodes.LecturerExport)]
    public async Task<IActionResult> ExportC22Batch(
        [FromQuery] Guid semesterId,
        [FromQuery] Guid? departmentId,
        CancellationToken cancellationToken)
    {
        if (semesterId == Guid.Empty)
            return BadRequest(new { message = "Vui lòng chọn học kỳ." });
        var effectiveDepartmentId = _departmentScope.ResolveEffectiveDepartmentId(User, departmentId);
        Guid? lecturerId = null;
        if (User.IsInRole("Lecturer"))
        {
            var userId = User.GetUserId();
            lecturerId = userId.HasValue
                ? await _lecturerAccess.ResolveLecturerIdAsync(userId.Value)
                : null;
            if (lecturerId == null)
                return Forbid();
        }

        try
        {
            var bytes = await _reportService.ExportC22BatchZipAsync(
                semesterId,
                effectiveDepartmentId,
                lecturerId,
                cancellationToken);
            return File(bytes, "application/zip", $"C22_PhieuDanhGia_{DateTime.UtcNow:yyyyMMdd_HHmmss}.zip");
        }
        catch (InvalidOperationException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Failed to generate C22 batch for semester {SemesterId}", semesterId);
            return StatusCode(StatusCodes.Status500InternalServerError, ApiResponse<object>.Fail(new ApiError
            {
                Title = ErrorMessage.InternalServerError
            }));
        }
    }

    [HttpGet("c23/export-excel")]
    [RequirePermission(SystemPermissionCodes.LecturerExport)]
    public async Task<IActionResult> ExportC23Excel(
        [FromQuery] Guid semesterId,
        [FromQuery] Guid? departmentId,
        CancellationToken cancellationToken)
    {
        if (semesterId == Guid.Empty)
            return BadRequest(new { message = "Vui lòng chọn học kỳ." });
        var effectiveDepartmentId = _departmentScope.ResolveEffectiveDepartmentId(User, departmentId);
        Guid? lecturerId = null;
        if (User.IsInRole("Lecturer"))
        {
            var userId = User.GetUserId();
            lecturerId = userId.HasValue
                ? await _lecturerAccess.ResolveLecturerIdAsync(userId.Value)
                : null;
            if (lecturerId == null)
                return Forbid();
        }
        try
        {
            var bytes = await _excelExportService.GenerateC23AccreditationExcelAsync(
                semesterId,
                effectiveDepartmentId,
                lecturerId,
                cancellationToken);
            return File(
                bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"C23_TongHopThucTap_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx");
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Failed to generate C23 report for semester {SemesterId}", semesterId);
            return StatusCode(StatusCodes.Status500InternalServerError, ApiResponse<object>.Fail(new ApiError
            {
                Title = ErrorMessage.InternalServerError
            }));
        }
    }
}
