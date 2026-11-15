using System.Text.RegularExpressions;
using InternLink.API.Helpers;
using InternLink.Application.DTOs;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/v1/public/verifications")]
[AllowAnonymous]
public sealed class PublicVerificationController : ControllerBase
{
    private static readonly Regex ReferenceCodePattern = new(
        @"\AIL-(ACC|VERIFY)-(?<year>\d{4})-(?<serial>\d{5})\z",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;

    public PublicVerificationController(AppDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    [HttpGet("{referenceCode}")]
    [ProducesResponseType(typeof(PublicVerificationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Verify(
        string referenceCode,
        CancellationToken cancellationToken)
    {
        var match = ReferenceCodePattern.Match(referenceCode ?? string.Empty);
        if (!match.Success || !int.TryParse(match.Groups["year"].Value, out var year))
            return InvalidReference();

        var isCompletionVerification = match.Groups[1].Value.Equals(
            "VERIFY",
            StringComparison.OrdinalIgnoreCase);
        var currentYear = DateTime.UtcNow.Year;
        var candidates = await _db.Internships.AsNoTracking()
            .Include(item => item.Student)
                .ThenInclude(student => student.DepartmentRef)
            .Include(item => item.Company)
            .Include(item => item.Semester)
            .Where(item => !item.IsDeleted
                && ((item.StartDate.HasValue && item.StartDate.Value.Year == year)
                    || (!item.StartDate.HasValue && year == currentYear)))
            .ToListAsync(cancellationToken);

        var verified = candidates
            .Where(item =>
            {
                var referenceYear = item.StartDate?.Year ?? currentYear;
                var expectedCode = isCompletionVerification
                    ? PublicReferenceCodes.CreateVerification(item.PublicId, referenceYear)
                    : PublicReferenceCodes.CreateAcceptance(item.PublicId, referenceYear);
                return expectedCode.Equals(referenceCode, StringComparison.OrdinalIgnoreCase);
            })
            .Take(2)
            .ToList();
        if (verified.Count != 1)
            return InvalidReference();

        var internship = verified[0];
        string? resultSummary = null;
        string? followUpCode = null;
        if (isCompletionVerification)
        {
            if (internship.Status is not (InternshipStatus.Completed or InternshipStatus.Graded))
                return InvalidReference();

            var evaluation = await _db.Evaluations.AsNoTracking()
                .FirstOrDefaultAsync(item =>
                    item.InternshipId == internship.PublicId
                    && item.IsFinalized
                    && !item.IsDeleted,
                    cancellationToken);
            if (evaluation == null)
                return InvalidReference();

            var minimumPassingScore = internship.SemesterId.HasValue
                ? await _db.SysGradingRuleSets.AsNoTracking()
                    .Where(rule => rule.SemesterId == internship.SemesterId.Value
                        && (rule.DepartmentId == internship.Student.DepartmentId || rule.DepartmentId == null))
                    .OrderByDescending(rule => rule.DepartmentId.HasValue)
                    .Select(rule => (decimal?)rule.MinimumPassingScore)
                    .FirstOrDefaultAsync(cancellationToken)
                : null;
            resultSummary = evaluation.FinalGrade >= (minimumPassingScore ?? 5m)
                ? "Đạt yêu cầu"
                : "Chưa đạt yêu cầu";
        }
        else if (internship.Status is InternshipStatus.Completed or InternshipStatus.Graded)
        {
            var verificationYear = internship.StartDate?.Year ?? currentYear;
            followUpCode = PublicReferenceCodes.CreateVerification(internship.PublicId, verificationYear);
        }

        return Ok(new PublicVerificationResponse(
            referenceCode.ToUpperInvariant(),
            isCompletionVerification ? "Hoàn thành thực tập" : "Giấy giới thiệu",
            true,
            _configuration["Email:InstitutionName"] ?? "InternLink",
            DateTimeOffset.UtcNow,
            internship.Student.FullName,
            internship.Student.StudentCode,
            internship.Student.Class,
            internship.Student.Major,
            internship.Student.DepartmentRef?.Name ?? internship.Student.Department,
            internship.Semester?.Name,
            internship.Company?.CompanyName,
            internship.Status.ToString(),
            resultSummary,
            followUpCode));
    }

    private IActionResult InvalidReference() =>
        NotFound(new { message = "Không tìm thấy hồ sơ hợp lệ với mã tra cứu này." });
}
