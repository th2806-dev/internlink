using InternLink.API.Extensions;
using InternLink.API.Helpers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireStudent")]
public class StudentPortalController : ControllerBase
{
    private readonly IStudentService _studentService;
    private readonly IPdfExportService _pdfExportService;
    private readonly IDataProtector _acceptanceTokenProtector;

    public StudentPortalController(
        IStudentService studentService,
        IPdfExportService pdfExportService,
        IDataProtectionProvider dataProtectionProvider)
    {
        _studentService = studentService;
        _pdfExportService = pdfExportService;
        _acceptanceTokenProtector = dataProtectionProvider.CreateProtector(
            "InternLink.StudentInternshipAcceptance.v1");
    }

    /// <summary>
    /// Current student's profile and active internship.
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var profile = await _studentService.GetPortalProfileByUserIdAsync(userId.Value, cancellationToken);
        if (profile == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.StudentProfileNotFound }));

        return Ok(ApiResponse<StudentPortalProfileDto>.Ok(profile));
    }

    /// <summary>Returns semester-configured progress and weekly deadlines for the current student.</summary>
    [HttpGet("/api/v1/student/dashboard-progress")]
    [ProducesResponseType(typeof(ApiResponse<StudentDashboardProgressResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDashboardProgress(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var result = await _studentService.GetDashboardProgressByUserIdAsync(userId.Value, cancellationToken);
        if (result == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.StudentProfileNotFound }));

        return Ok(ApiResponse<StudentDashboardProgressResponse>.Ok(result));
    }

    /// <summary>Issues a time-limited, protected magic link for the student's internship introduction.</summary>
    [HttpGet("/api/v1/student/introduction-letter")]
    [ProducesResponseType(typeof(ApiResponse<StudentIntroductionLetterResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetIntroductionLetter(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var profile = await _studentService.GetPortalProfileByUserIdAsync(userId.Value, cancellationToken);
        if (profile == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.StudentProfileNotFound }));
        if (profile.Internship == null)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Bạn chưa được phân công đợt thực tập." }));
        if (profile.Internship.CompanyId == null)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Bạn cần được phân công doanh nghiệp trước khi tạo giấy giới thiệu." }));

        var expiresAt = DateTimeOffset.UtcNow.AddDays(15);
        var payload = new StudentAcceptanceTokenPayload(
            profile.Internship.Id,
            profile.Student.Id,
            expiresAt.ToUnixTimeSeconds(),
            WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(16)));
        var protectedToken = _acceptanceTokenProtector.Protect(JsonSerializer.Serialize(payload));
        var token = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(protectedToken));
        var year = profile.Internship.StartDate?.Year ?? DateTime.UtcNow.Year;
        var referenceCode = PublicReferenceCodes.CreateAcceptance(profile.Internship.Id, year);

        return Ok(ApiResponse<StudentIntroductionLetterResponse>.Ok(new StudentIntroductionLetterResponse(
            referenceCode,
            token,
            expiresAt,
            profile.Student.FullName,
            profile.Student.StudentCode,
            profile.Student.Class,
            profile.Student.Major,
            profile.Student.Department,
            profile.Internship.Company?.CompanyName,
            profile.Internship.Position,
            profile.LecturerName,
            profile.Internship.SemesterName,
            profile.Internship.StartDate.HasValue ? AsUtcOffset(profile.Internship.StartDate.Value) : null,
            profile.Internship.EndDate.HasValue ? AsUtcOffset(profile.Internship.EndDate.Value) : null)));
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateStudentProfileRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));
        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Họ tên không được để trống" }));

        var current = await _studentService.GetStudentByUserIdAsync(userId.Value);
        if (current == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.StudentProfileNotFound }));

        try
        {
            var updated = await _studentService.UpdateStudentAsync(current.Id, new UpdateStudentRequest
            {
                FullName = request.FullName,
                Email = request.Email,
                Phone = request.Phone,
                Department = request.Department ?? current.Department,
                Class = current.Class,
                Major = current.Major,
                DesiredPosition = request.DesiredPosition,
                AlternativePosition = request.AlternativePosition,
                DesiredLocation = request.DesiredLocation,
                WorkPreference = request.WorkPreference,
                PreferredIndustry = request.PreferredIndustry,
                Skills = request.Skills,
                ResumeUrl = request.ResumeUrl,
            });
            return Ok(ApiResponse<StudentDto>.Ok(updated!));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>
    /// Download internship certificate/evaluation sheet as PDF.
    /// </summary>
    [HttpGet("internship-certificate")]
    public async Task<IActionResult> DownloadCertificate()
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var profile = await _studentService.GetPortalProfileByUserIdAsync(userId.Value);
        if (profile?.Internship == null)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.StudentInternshipMissing }));
        if (profile.Internship.CompanyId == null)
            return BadRequest(ApiResponse<object>.Fail(new ApiError
            {
                Title = "Sinh viên chưa được phân công đơn vị thực tập, không thể xuất phiếu đánh giá."
            }));

        try
        {
            var pdfBytes = await _pdfExportService.GenerateStudentEvaluationPdfAsync(
                profile.Internship.Id, userId.Value);
            var fileName = $"Phieu-Thuc-Tap-{profile.Student.StudentCode}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    private static DateTimeOffset AsUtcOffset(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
