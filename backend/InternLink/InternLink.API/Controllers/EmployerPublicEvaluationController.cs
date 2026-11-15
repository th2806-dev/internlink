using System.Security.Cryptography;
using System.Text;
using InternLink.API.Extensions;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class EmployerPublicEvaluationController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    private readonly ILecturerAccessService _lecturerAccess;
    private readonly IDepartmentScopeService _departmentScope;
    private readonly IConfiguration _configuration;

    public EmployerPublicEvaluationController(
        AppDbContext db,
        IEmailService emailService,
        ILecturerAccessService lecturerAccess,
        IDepartmentScopeService departmentScope,
        IConfiguration configuration)
    {
        _db = db;
        _emailService = emailService;
        _lecturerAccess = lecturerAccess;
        _departmentScope = departmentScope;
        _configuration = configuration;
    }

    [AllowAnonymous]
    [HttpGet("public/employer-evaluations/verify")]
    [HttpGet("public/evaluations/verify")]
    public async Task<IActionResult> Verify([FromQuery] string token, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 128)
            return BadRequest(new { message = "Liên kết đánh giá không hợp lệ." });

        var tokenHash = HashToken(token);
        var record = await _db.EmployerEvaluationTokens
            .Include(item => item.Internship)
                .ThenInclude(internship => internship.Student)
                    .ThenInclude(student => student.DepartmentRef)
            .Include(item => item.Internship)
                .ThenInclude(internship => internship.Company)
            .Include(item => item.Internship)
                .ThenInclude(internship => internship.Semester)
            .AsNoTracking()
            .Where(item => item.Token == tokenHash && !item.IsUsed && item.ExpiredAt > DateTime.UtcNow)
            .Select(item => new
            {
                item.PublicId,
                item.MentorName,
                Internship = item.Internship,
                item.Internship.Student,
                item.Internship.Company,
                item.Internship.SemesterId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (record == null)
            return NotFound(new { message = "Liên kết đã hết hạn, đã được sử dụng hoặc không tồn tại." });

        var gradingRules = record.SemesterId.HasValue
            ? await _db.SysGradingRuleSets
                .AsNoTracking()
                .Where(rule => rule.SemesterId == record.SemesterId.Value
                    && (rule.DepartmentId == record.Student.DepartmentId || rule.DepartmentId == null))
                .OrderByDescending(rule => rule.DepartmentId.HasValue)
                .Select(rule => new
                {
                    rule.RuleSetName,
                    rule.EmployerScoreWeight,
                    rule.MinimumPassingScore,
                    rule.RequiredWeeklyReportsCount
                })
                .FirstOrDefaultAsync(cancellationToken)
            : null;

        var rubric = record.SemesterId.HasValue
            ? await _db.EvaluationRubrics
                .AsNoTracking()
                .Where(item => item.SemesterId == record.SemesterId.Value
                    && (item.Status == RubricStatus.Approved || item.Status == RubricStatus.Locked))
                .SelectMany(item => item.Criteria.OrderBy(criterion => criterion.OrderIndex))
                .Select(item => new { item.Name, item.Description, item.MaxScore, item.Weight })
                .ToListAsync(cancellationToken)
            : [];

        return Ok(new
        {
            studentName = record.Student.FullName,
            studentCode = record.Student.StudentCode,
            department = record.Student.DepartmentRef != null
                ? record.Student.DepartmentRef.Name
                : record.Student.Department,
            semester = record.Internship.Semester != null ? record.Internship.Semester.Name : null,
            company = record.Internship.Company != null ? record.Internship.Company.CompanyName : null,
            position = record.Internship.Position,
            mentorName = record.MentorName,
            gradingRules,
            rubric
        });
    }

    [AllowAnonymous]
    [HttpPost("public/employer-evaluations/submit")]
    [HttpPost("public/evaluations/submit")]
    public async Task<IActionResult> Submit(
        [FromBody] SubmitEmployerEvaluationRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || request.Token.Length > 128)
            return BadRequest(new { message = "Liên kết đánh giá không hợp lệ." });
        if (!IsScore(request.AttendanceScore) || !IsScore(request.SkillsScore) || !IsScore(request.AttitudeScore))
            return BadRequest(new { message = "Điểm của từng tiêu chí phải nằm trong khoảng 0 đến 10." });
        if (!request.Confirmed || string.IsNullOrWhiteSpace(request.ConfirmedMentorName))
            return BadRequest(new { message = "Vui lòng xác nhận thông tin người đánh giá trước khi gửi." });
        if (request.ConfirmedMentorName.Trim().Length > 200
            || request.Strengths?.Length > 2000
            || request.AreasForImprovement?.Length > 2000
            || request.Comments?.Length > 3000)
            return BadRequest(new { message = "Một hoặc nhiều nội dung vượt quá giới hạn cho phép." });

        var tokenHash = HashToken(request.Token);
        var token = await _db.EmployerEvaluationTokens
            .FirstOrDefaultAsync(item => item.Token == tokenHash, cancellationToken);
        if (token == null || token.IsUsed || token.ExpiredAt <= DateTime.UtcNow)
            return NotFound(new { message = "Liên kết đã hết hạn, đã được sử dụng hoặc không tồn tại." });
        if (!string.Equals(token.MentorName.Trim(), request.ConfirmedMentorName.Trim(), StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Tên xác nhận phải khớp với người hướng dẫn được mời." });
        if (await _db.EmployerEvaluations.AnyAsync(item => item.InternshipId == token.InternshipId, cancellationToken))
            return Conflict(new { message = "Thực tập này đã có đánh giá từ doanh nghiệp." });

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        var now = DateTime.UtcNow;
        var claimed = await _db.EmployerEvaluationTokens
            .Where(item => item.PublicId == token.PublicId && !item.IsUsed && item.ExpiredAt > now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(item => item.IsUsed, true)
                .SetProperty(item => item.UsedAt, now)
                .SetProperty(item => item.UpdatedAt, now), cancellationToken);

        if (claimed != 1)
            return Conflict(new { message = "Đánh giá đã được gửi từ một phiên khác." });

        var evaluation = new EmployerEvaluation
        {
            InternshipId = token.InternshipId,
            TokenId = token.PublicId,
            AttendanceScore = request.AttendanceScore,
            SkillsScore = request.SkillsScore,
            AttitudeScore = request.AttitudeScore,
            FinalScore = Math.Round((request.AttendanceScore + request.SkillsScore + request.AttitudeScore) / 3m, 2),
            Strengths = NullIfWhiteSpace(request.Strengths),
            AreasForImprovement = NullIfWhiteSpace(request.AreasForImprovement),
            Comments = NullIfWhiteSpace(request.Comments),
            ConfirmedMentorName = request.ConfirmedMentorName.Trim(),
            ConfirmedAt = now,
            RubricScoresJson = System.Text.Json.JsonSerializer.Serialize(new[]
            {
                new { criterion = "Chuyên cần", score = request.AttendanceScore },
                new { criterion = "Kỹ năng", score = request.SkillsScore },
                new { criterion = "Thái độ", score = request.AttitudeScore }
            }),
            CreatedAt = now,
            CreatedBy = token.MentorEmail,
            CreatedByFunction = "PUBLIC_EMPLOYER_EVALUATION"
        };

        _db.EmployerEvaluations.Add(evaluation);
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Ok(new
        {
            evaluationId = evaluation.PublicId,
            evaluation.FinalScore,
            evaluation.ConfirmedMentorName,
            evaluation.ConfirmedAt
        });
    }

    [Authorize(Policy = "RequireLecturerOrAdmin")]
    [HttpPost("admin/internships/{id:guid}/generate-evaluation-token")]
    public async Task<IActionResult> GenerateToken(
        Guid id,
        [FromBody] GenerateEmployerEvaluationTokenRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.MentorName) || request.MentorName.Trim().Length > 200
            || string.IsNullOrWhiteSpace(request.MentorEmail) || request.MentorEmail.Trim().Length > 200
            || !System.Net.Mail.MailAddress.TryCreate(request.MentorEmail, out _))
            return BadRequest(new { message = "Vui lòng nhập tên và email người hướng dẫn hợp lệ." });

        var internship = await _db.Internships
            .Include(item => item.Student)
            .Include(item => item.Company)
            .FirstOrDefaultAsync(item => item.PublicId == id, cancellationToken);
        if (internship == null)
            return NotFound();

        if (User.IsInRole("Lecturer"))
        {
            var userId = User.GetUserId();
            var lecturerId = userId.HasValue
                ? await _lecturerAccess.ResolveLecturerIdAsync(userId.Value)
                : null;
            if (lecturerId == null || internship.LecturerId != lecturerId)
                return NotFound();
        }
        else if (!_departmentScope.HasAccess(User, internship.Student.DepartmentId))
        {
            return NotFound();
        }

        if (await _db.EmployerEvaluations.AnyAsync(item => item.InternshipId == internship.PublicId, cancellationToken))
            return Conflict(new { message = "Thực tập này đã có đánh giá từ doanh nghiệp." });

        var now = DateTime.UtcNow;
        var plaintextToken = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(
            RandomNumberGenerator.GetBytes(32));
        var previousTokens = await _db.EmployerEvaluationTokens
            .Where(item => item.InternshipId == internship.PublicId && !item.IsUsed)
            .ToListAsync(cancellationToken);
        foreach (var previousToken in previousTokens)
        {
            previousToken.IsDeleted = true;
            previousToken.DeletedAt = now;
            previousToken.DeletedBy = User.Identity?.Name;
        }

        var entity = new EmployerEvaluationToken
        {
            Token = HashToken(plaintextToken),
            InternshipId = internship.PublicId,
            MentorEmail = request.MentorEmail.Trim(),
            MentorName = request.MentorName.Trim(),
            ExpiredAt = now.AddDays(15),
            CreatedAt = now,
            CreatedBy = User.Identity?.Name,
            CreatedByFunction = "GENERATE_EMPLOYER_EVALUATION_TOKEN"
        };
        _db.EmployerEvaluationTokens.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        var portalUrl = (_configuration["Email:PortalUrl"] ?? $"{Request.Scheme}://{Request.Host}").TrimEnd('/');
        var link = $"{portalUrl}/evaluate/{Uri.EscapeDataString(plaintextToken)}";
        var emailSent = false;
        string? emailError = null;
        if (request.SendEmail)
        {
            var safeLink = System.Net.WebUtility.HtmlEncode(link);
            var safeName = System.Net.WebUtility.HtmlEncode(entity.MentorName);
            var result = await _emailService.SendAsync(
                entity.MentorEmail,
                "Mời đánh giá sinh viên thực tập",
                $"<p>Xin chào {safeName},</p><p>Vui lòng hoàn thành đánh giá thực tập tại liên kết bảo mật sau (hết hạn sau 15 ngày):</p><p><a href=\"{safeLink}\">Mở biểu mẫu đánh giá</a></p>",
                $"Mở liên kết để đánh giá sinh viên: {link}",
                cancellationToken);
            emailSent = result.Success;
            emailError = result.Success ? null : result.Message ?? "Không gửi được email.";
        }

        return Ok(new { link, expiresAt = entity.ExpiredAt, emailSent, emailError });
    }

    private static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static bool IsScore(int score) => score is >= 0 and <= 10;

    private static string? NullIfWhiteSpace(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class SubmitEmployerEvaluationRequest
{
    public string Token { get; set; } = null!;
    public int AttendanceScore { get; set; }
    public int SkillsScore { get; set; }
    public int AttitudeScore { get; set; }
    public string? Strengths { get; set; }
    public string? AreasForImprovement { get; set; }
    public string? Comments { get; set; }
    public string ConfirmedMentorName { get; set; } = null!;
    public bool Confirmed { get; set; }
}

public sealed class GenerateEmployerEvaluationTokenRequest
{
    public string MentorEmail { get; set; } = null!;
    public string MentorName { get; set; } = null!;
    public bool SendEmail { get; set; }
}
