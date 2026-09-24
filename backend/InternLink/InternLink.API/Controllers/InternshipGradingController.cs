using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.API.Extensions;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>
/// Module đánh giá thực tập: tổng hợp điểm quá trình / thi / xếp loại & điều kiện dự thi.
/// </summary>
[ApiController]
[Route("api/InternshipGrading")]
[Authorize(Policy = "RequireLecturerOrAdmin")]
public class InternshipGradingController : ControllerBase
{
    private readonly IInternshipGradingService _gradingService;
    private readonly ILecturerAccessService _lecturerAccessService;
    private readonly IDepartmentScopeService _deptScope;

    public InternshipGradingController(
        IInternshipGradingService gradingService,
        ILecturerAccessService lecturerAccessService,
        IDepartmentScopeService deptScope)
    {
        _gradingService = gradingService;
        _lecturerAccessService = lecturerAccessService;
        _deptScope = deptScope;
    }

    /// <summary>
    /// Bảng tổng hợp điểm: trạng thái nộp T1-T6, NỘP BC, điểm QT/TB, xếp loại, điều kiện dự thi.
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<InternshipSummaryResponseDto>>> GetSummary(
        [FromQuery] Guid semesterId,
        [FromQuery] Guid? lecturerId = null,
        [FromQuery] Guid? departmentId = null,
        [FromQuery] string? className = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            Guid? resolvedLecturerId = null;
            if (User.IsInRole("Lecturer"))
            {
                var userId = User.GetUserId();
                if (userId == null) return Unauthorized();
                resolvedLecturerId = await _lecturerAccessService.ResolveLecturerIdAsync(userId.Value);
            }

            var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
            var summary = await _gradingService.GetSummaryAsync(semesterId, resolvedLecturerId, deptId, className);
            return Ok(ApiResponse<InternshipSummaryResponseDto>.Ok(summary));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<InternshipSummaryResponseDto>.Fail(ApiError.From(ex.Message, status: 404)));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<InternshipSummaryResponseDto>.Fail(ApiError.From("Lỗi tổng hợp điểm thực tập", ex.Message, 500)));
        }
    }

    /// <summary>
    /// Lưu điểm cho 1 sinh viên: rubric chất lượng (5 mức), thưởng sáng tạo, điểm thi vấn đáp, ghi chú.
    /// </summary>
    [HttpPost("save")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<ActionResult<ApiResponse<InternshipStudentGradeDto>>> SaveGrade(
        [FromQuery] Guid semesterId,
        [FromBody] SaveInternshipGradeRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null) return Unauthorized();

            Guid? lecturerId = null;
            if (User.IsInRole("Lecturer"))
                lecturerId = await _lecturerAccessService.ResolveLecturerIdAsync(userId.Value);

            var saved = await _gradingService.SaveGradeAsync(semesterId, dto, userId.Value, lecturerId);
            if (saved == null)
                return NotFound(ApiResponse<InternshipStudentGradeDto>.Fail(ApiError.From("Không tìm thấy sinh viên trong kỳ thực tập này (hoặc không có quyền chấm).", status: 404)));

            return Ok(ApiResponse<InternshipStudentGradeDto>.Ok(saved));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<InternshipStudentGradeDto>.Fail(ApiError.From(ex.Message, status: 400)));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<InternshipStudentGradeDto>.Fail(ApiError.From("Lỗi lưu điểm", ex.Message, 500)));
        }
    }
}
