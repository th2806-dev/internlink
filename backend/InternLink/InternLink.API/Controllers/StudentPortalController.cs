using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireStudent")]
public class StudentPortalController : ControllerBase
{
    private readonly IStudentService _studentService;
    private readonly IPdfExportService _pdfExportService;

    public StudentPortalController(IStudentService studentService, IPdfExportService pdfExportService)
    {
        _studentService = studentService;
        _pdfExportService = pdfExportService;
    }

    /// <summary>
    /// Current student's profile and active internship.
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

        var profile = await _studentService.GetPortalProfileByUserIdAsync(userId.Value);
        if (profile == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Student profile not found" }));

        return Ok(ApiResponse<StudentPortalProfileDto>.Ok(profile));
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateStudentProfileRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));
        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Họ tên không được để trống" }));

        var current = await _studentService.GetStudentByUserIdAsync(userId.Value);
        if (current == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Student profile not found" }));

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
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

        var profile = await _studentService.GetPortalProfileByUserIdAsync(userId.Value);
        if (profile?.Internship == null)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Ch\u00F4ng c\xF3 th\xF4ng tin th\u1EF1c t\u1EADp." }));

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
}
