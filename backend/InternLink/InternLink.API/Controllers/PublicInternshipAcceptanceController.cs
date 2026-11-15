using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using InternLink.API.Helpers;
using InternLink.Application.DTOs;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/v1/public/internship-acceptance")]
[AllowAnonymous]
public sealed class PublicInternshipAcceptanceController : ControllerBase
{
    private const string DataProtectionPurpose = "InternLink.StudentInternshipAcceptance.v1";
    private readonly AppDbContext _db;
    private readonly IDataProtector _protector;

    public PublicInternshipAcceptanceController(
        AppDbContext db,
        IDataProtectionProvider dataProtectionProvider)
    {
        _db = db;
        _protector = dataProtectionProvider.CreateProtector(DataProtectionPurpose);
    }

    [HttpGet("verify")]
    [ProducesResponseType(typeof(InternshipAcceptancePreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Verify(
        [FromQuery] string token,
        CancellationToken cancellationToken)
    {
        if (!TryReadToken(token, out var payload))
            return InvalidLink();

        var internship = await _db.Internships.AsNoTracking()
            .Include(item => item.Student)
                .ThenInclude(student => student.DepartmentRef)
            .Include(item => item.Company)
            .Include(item => item.Semester)
            .FirstOrDefaultAsync(item =>
                item.PublicId == payload!.InternshipId
                && item.Student.PublicId == payload.StudentId
                && !item.IsDeleted
                && !item.Student.IsDeleted,
                cancellationToken);
        if (internship?.Company == null)
            return InvalidLink();

        var year = internship.StartDate?.Year ?? DateTime.UtcNow.Year;
        return Ok(new InternshipAcceptancePreviewResponse(
            PublicReferenceCodes.CreateAcceptance(internship.PublicId, year),
            internship.Student.FullName,
            internship.Student.StudentCode,
            internship.Student.Class,
            internship.Student.Major,
            internship.Student.DepartmentRef?.Name ?? internship.Student.Department,
            internship.Company.CompanyName,
            internship.Position,
            internship.Semester?.Name,
            internship.Status.ToString(),
            ToDateTimeOffset(internship.StartDate),
            ToDateTimeOffset(internship.EndDate),
            DateTimeOffset.FromUnixTimeSeconds(payload.ExpiresAtUnixSeconds)));
    }

    [HttpPost("confirm")]
    [ProducesResponseType(typeof(InternshipAcceptanceConfirmationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Confirm(
        [FromBody] ConfirmInternshipAcceptanceRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryReadToken(request.Token, out var payload))
            return InvalidLink();
        if (request.EndDate < request.StartDate)
            return BadRequest(new { message = "Ngày kết thúc dự kiến phải từ ngày bắt đầu trở đi." });

        var internship = await _db.Internships
            .Include(item => item.Student)
            .Include(item => item.Company)
            .FirstOrDefaultAsync(item =>
                item.PublicId == payload!.InternshipId
                && item.Student.PublicId == payload.StudentId
                && !item.IsDeleted
                && !item.Student.IsDeleted,
                cancellationToken);
        if (internship?.Company == null)
            return InvalidLink();
        if (internship.Status is not (InternshipStatus.NotStarted or InternshipStatus.InProgress))
            return Conflict(new { message = "Đợt thực tập này không còn ở trạng thái chờ tiếp nhận." });

        var now = DateTime.UtcNow;
        internship.SupervisorName = request.MentorName.Trim();
        internship.SupervisorPhone = request.MentorPhone.Trim();
        internship.SupervisorEmail = request.MentorEmail.Trim();
        internship.SupervisorDepartment = string.IsNullOrWhiteSpace(request.MentorDepartment)
            ? null
            : request.MentorDepartment.Trim();
        internship.StartDate = request.StartDate.UtcDateTime;
        internship.EndDate = request.EndDate.UtcDateTime;
        internship.Status = InternshipStatus.InProgress;
        internship.UpdatedAt = now;
        internship.UpdatedBy = "PUBLIC_EMPLOYER";
        internship.UpdatedByFunction = "PUBLIC_INTERNSHIP_ACCEPTANCE";
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new InternshipAcceptanceConfirmationResponse(
            internship.Student.FullName,
            internship.Student.StudentCode,
            internship.Company.CompanyName,
            internship.SupervisorName,
            internship.Status.ToString(),
            new DateTimeOffset(now, TimeSpan.Zero)));
    }

    private bool TryReadToken(string token, out StudentAcceptanceTokenPayload? payload)
    {
        payload = null;
        if (string.IsNullOrWhiteSpace(token) || token.Length > 2048)
            return false;

        try
        {
            var protectedToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(token));
            var json = _protector.Unprotect(protectedToken);
            payload = JsonSerializer.Deserialize<StudentAcceptanceTokenPayload>(json);
            return payload is not null
                && payload.InternshipId != Guid.Empty
                && payload.StudentId != Guid.Empty
                && !string.IsNullOrWhiteSpace(payload.Nonce)
                && payload.ExpiresAtUnixSeconds > DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        }
        catch (Exception exception) when (exception is CryptographicException or FormatException or JsonException or ArgumentException)
        {
            return false;
        }
    }

    private IActionResult InvalidLink() =>
        NotFound(new { message = "Liên kết tiếp nhận đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu sinh viên tạo mã mới." });

    private static DateTimeOffset? ToDateTimeOffset(DateTime? value) =>
        value.HasValue
            ? new DateTimeOffset(DateTime.SpecifyKind(value.Value, DateTimeKind.Utc))
            : null;
}
