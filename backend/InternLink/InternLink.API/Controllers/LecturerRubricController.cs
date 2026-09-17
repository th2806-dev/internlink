using System.Text.Json;
using InternLink.API.Extensions;
using InternLink.Application.Common;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Controllers;

/// <summary>
/// Lecturer controller for viewing approved rubrics and submitting evaluation scores per criterion.
/// </summary>
[ApiController]
[Route("api/Lecturer")]
[Authorize(Policy = "RequireLecturerOrAdmin")]
public class LecturerRubricController : ControllerBase
{
    private readonly IRubricService _rubricService;
    private readonly AppDbContext _context;
    private readonly ILecturerAccessService _lecturerAccessService;
    private readonly ILogger<LecturerRubricController> _logger;

    public LecturerRubricController(
        IRubricService rubricService,
        AppDbContext context,
        ILecturerAccessService lecturerAccessService,
        ILogger<LecturerRubricController> logger)
    {
        _rubricService = rubricService;
        _context = context;
        _lecturerAccessService = lecturerAccessService;
        _logger = logger;
    }

    /// <summary>
    /// Get approved rubric for a semester (used by lecturer to know which criteria to score)
    /// </summary>
    [HttpGet("rubric")]
    [ProducesResponseType(typeof(RubricDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RubricDto?>> GetApprovedRubric([FromQuery] Guid semesterId)
    {
        try
        {
            var rubric = await _rubricService.GetApprovedRubricAsync(semesterId);
            if (rubric == null)
                return Ok((RubricDto?)null);

            return Ok(rubric);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving approved rubric for semester {SemesterId}", semesterId);
            return StatusCode(500, new { message = "Lỗi khi lấy rubric." });
        }
    }

    /// <summary>
    /// Ensure a draft evaluation exists for an internship, then save rubric-based scores.
    /// This is the recommended endpoint for rubric grading: it creates an evaluation
    /// automatically when needed, so the UI does not have to guess legacy scores.
    /// </summary>
    [HttpPost("evaluation/scores")]
    [ProducesResponseType(typeof(EvaluationScoresResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<EvaluationScoresResponse>> SaveRubricScores(
        [FromBody] SaveRubricScoresRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(new { message = "User ID not found in token." });

            if (!request.InternshipId.HasValue)
                return BadRequest(new { message = "Không tìm thấy thực tập." });

            if (request.CriteriaScores == null || request.CriteriaScores.Count == 0)
                return BadRequest(new { message = "Không có tiêu chí điểm." });

            // Validate total weight
            var totalWeight = request.CriteriaScores.Sum(c => c.Weight);
            if (Math.Abs(totalWeight - 100) > 0.01m)
                return BadRequest(new { message = $"Tổng trọng số phải bằng 100%. Hiện tại: {totalWeight}%" });

            // Validate individual scores
            foreach (var score in request.CriteriaScores)
            {
                if (score.Score < 0 || score.Score > score.MaxScore)
                    return BadRequest(new { message = $"Điểm '{score.CriterionName}' phải từ 0 đến {score.MaxScore}." });
            }

            var internship = await _context.Internships
                .Include(i => i.Lecturer)
                .FirstOrDefaultAsync(i => i.Id == request.InternshipId.Value && !i.IsDeleted);

            if (internship == null)
                return NotFound(new { message = "Không tìm thấy thực tập." });

            var canGradeInternship = internship.Lecturer?.UserId == userId
                || await _context.Users.AnyAsync(u => u.Id == userId && u.Role == Domain.Enums.Role.SuperAdmin && !u.IsDeleted);
            if (!canGradeInternship)
                return Forbid();

            Evaluation evaluation;
            var existing = await _context.Evaluations
                .FirstOrDefaultAsync(e => e.InternshipId == request.InternshipId.Value && !e.IsDeleted);

            if (existing != null)
            {
                if (existing.IsFinalized)
                    return BadRequest(new { message = "Đánh giá đã chốt, không thể chỉnh sửa." });

                evaluation = existing;
            }
            else
            {
                evaluation = new Evaluation
                {
                    Id = Guid.NewGuid(),
                    InternshipId = request.InternshipId.Value,
                    EvaluatedById = userId,
                    EvaluatedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    IsFinalized = request.Finalize ?? false
                };

                _context.Evaluations.Add(evaluation);
            }

            var scoresJson = JsonSerializer.Serialize(request.CriteriaScores);
            evaluation.CriteriaScoresJson = scoresJson;
            evaluation.Comments = request.Comments;
            evaluation.CalculateFinalGradeFromCriteria();
            evaluation.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var response = new EvaluationScoresResponse
            {
                EvaluationId = evaluation.Id,
                CriteriaScores = request.CriteriaScores.Select(c => new CriterionScoreDto
                {
                    CriterionId = c.CriterionId,
                    CriterionName = c.CriterionName,
                    Weight = c.Weight,
                    MaxScore = c.MaxScore,
                    Score = c.Score,
                    Comment = c.Comment,
                    OrderIndex = 0
                }).ToList(),
                FinalGrade = evaluation.FinalGrade,
                IsFinalized = evaluation.IsFinalized
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving rubric scores");
            return StatusCode(500, new { message = "Lỗi khi lưu điểm." });
        }
    }

    /// <summary>
    /// Save evaluation scores for a student (creates or updates, with dynamic criteria)
    /// </summary>
    [HttpPut("evaluation/{evaluationId}/scores")]
    [ProducesResponseType(typeof(EvaluationScoresResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<EvaluationScoresResponse>> SaveEvaluationScores(
        Guid evaluationId,
        [FromBody] EvaluationScoresRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(new { message = "User ID not found in token." });

            var evaluation = await _context.Evaluations
                .Include(e => e.Internship)
                    .ThenInclude(i => i.Lecturer)
                .FirstOrDefaultAsync(e => e.Id == evaluationId && !e.IsDeleted);

            if (evaluation == null)
                return NotFound(new { message = "Không tìm thấy đánh giá." });

            var canGradeEvaluation = evaluation.Internship?.Lecturer?.UserId == userId
                || await _context.Users.AnyAsync(u => u.Id == userId && u.Role == Domain.Enums.Role.SuperAdmin && !u.IsDeleted);
            if (!canGradeEvaluation)
                return Forbid();

            if (evaluation.IsFinalized)
                return BadRequest(new { message = "Đánh giá đã chốt, không thể chỉnh sửa." });

            // Serialize criteria scores
            var scoresJson = JsonSerializer.Serialize(request.CriteriaScores);

            // Validate total weight
            var totalWeight = request.CriteriaScores.Sum(c => c.Weight);
            if (Math.Abs(totalWeight - 100) > 0.01m)
                return BadRequest(new { message = $"Tổng trọng số phải bằng 100%. Hiện tại: {totalWeight}%" });

            // Validate individual scores
            foreach (var score in request.CriteriaScores)
            {
                if (score.Score < 0 || score.Score > score.MaxScore)
                    return BadRequest(new { message = $"Điểm '{score.CriterionName}' phải từ 0 đến {score.MaxScore}." });
            }

            evaluation.CriteriaScoresJson = scoresJson;
            evaluation.Comments = request.Comments;
            evaluation.CalculateFinalGradeFromCriteria();
            evaluation.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var response = new EvaluationScoresResponse
            {
                EvaluationId = evaluation.Id,
                CriteriaScores = request.CriteriaScores.Select(c => new CriterionScoreDto
                {
                    CriterionId = c.CriterionId,
                    CriterionName = c.CriterionName,
                    Weight = c.Weight,
                    MaxScore = c.MaxScore,
                    Score = c.Score,
                    Comment = c.Comment,
                    OrderIndex = 0
                }).ToList(),
                FinalGrade = evaluation.FinalGrade,
                IsFinalized = evaluation.IsFinalized
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving evaluation scores for {EvaluationId}", evaluationId);
            return StatusCode(500, new { message = "Lỗi khi lưu điểm." });
        }
    }

    /// <summary>
    /// Get evaluation detail with criteria scores
    /// </summary>
    [HttpGet("evaluation/{evaluationId}/scores")]
    [ProducesResponseType(typeof(EvaluationScoresResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<EvaluationScoresResponse>> GetEvaluationScores(Guid evaluationId)
    {
        try
        {
            var evaluation = await _context.Evaluations
                .FirstOrDefaultAsync(e => e.Id == evaluationId && !e.IsDeleted);

            if (evaluation == null)
                return NotFound(new { message = "Không tìm thấy đánh giá." });

            var criteriaScores = new List<CriterionScoreDto>();
            if (!string.IsNullOrWhiteSpace(evaluation.CriteriaScoresJson))
            {
                criteriaScores = JsonSerializer.Deserialize<List<CriterionScoreDto>>(evaluation.CriteriaScoresJson)
                    ?? new List<CriterionScoreDto>();
            }

            return Ok(new EvaluationScoresResponse
            {
                EvaluationId = evaluation.Id,
                CriteriaScores = criteriaScores,
                FinalGrade = evaluation.FinalGrade,
                IsFinalized = evaluation.IsFinalized
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving evaluation scores for {EvaluationId}", evaluationId);
            return StatusCode(500, new { message = "Lỗi khi lấy điểm." });
        }
    }

    /// <summary>
    /// Get all students assigned to the current lecturer for a semester,
    /// with their evaluation status (graded/ungraded/draft).
    /// </summary>
    [HttpGet("evaluation-students")]
    [ProducesResponseType(typeof(IEnumerable<LecturerEvaluationStudentDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<LecturerEvaluationStudentDto>>> GetLecturerStudents(
        [FromQuery] Guid? semesterId)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(new { message = "User ID not found in token." });

            var lecturerId = await _lecturerAccessService.ResolveLecturerIdAsync(userId.Value);
            if (lecturerId == null)
                return Ok(Array.Empty<LecturerEvaluationStudentDto>());

            var query = _context.Internships
                .Where(i => i.LecturerId == lecturerId.Value && !i.IsDeleted)
                .Include(i => i.Student)
                .Include(i => i.Company)
                .Include(i => i.Semester)
                .Include(i => i.WeeklyReports.Where(wr => !wr.IsDeleted))
                .Include(i => i.Submissions.Where(s => !s.IsDeleted))
                .AsQueryable();

            if (semesterId.HasValue)
                query = query.Where(i => i.SemesterId == semesterId.Value);

            var internships = await query.ToListAsync();

            // Get all internship IDs to batch-fetch evaluations
            var internshipIds = internships.Select(i => i.Id).ToList();
            var evaluations = await _context.Evaluations
                .Where(e => internshipIds.Contains(e.InternshipId) && !e.IsDeleted)
                .ToDictionaryAsync(e => e.InternshipId);

            var result = internships.Select(i =>
            {
                evaluations.TryGetValue(i.Id, out var ev);
                var breakdown = i.Student != null
                    ? InternshipProgressCalculator.Calculate(
                        i.Student.User, i.Student, i, i.WeeklyReports, ev, i.Semester?.TotalWeeks)
                    : null;
                return new LecturerEvaluationStudentDto
                {
                    StudentId = i.StudentId,
                    InternshipId = i.Id,
                    SemesterId = i.SemesterId,
                    StudentCode = i.Student?.StudentCode ?? "—",
                    FullName = i.Student?.FullName ?? "—",
                    Email = i.Student?.Email,
                    Phone = i.Student?.Phone,
                    Class = i.Student?.Class,
                    Major = i.Student?.Major,
                    CompanyId = i.CompanyId,
                    CompanyName = i.Company?.CompanyName,
                    Position = i.Position,
                    InternshipStatus = (i.Status == InternLink.Domain.Enums.InternshipStatus.NotStarted &&
                        (i.CompanyId.HasValue || i.Submissions.Any() || i.WeeklyReports.Any())
                        ? InternLink.Domain.Enums.InternshipStatus.InProgress
                        : i.Status).ToString(),
                    StartDate = i.StartDate?.ToString("yyyy-MM-dd"),
                    EndDate = i.EndDate?.ToString("yyyy-MM-dd"),
                    WeeklyReportCount = i.WeeklyReports.Count,
                    PendingReportCount = i.WeeklyReports.Count(wr => wr.Status == InternLink.Domain.Enums.WeeklyReportStatus.Submitted),
                    SubmissionCount = i.Submissions.Count,
                    FinalReportSubmitted = i.Submissions.Any(s => s.Type == SubmissionType.FinalReport),
                    PracticalProductSubmitted = i.Submissions.Any(s => s.Type == SubmissionType.Product),
                    EvaluationId = ev?.Id,
                    FinalGrade = ev?.FinalGrade,
                    EvaluatedAt = ev?.EvaluatedAt,
                    HasEvaluation = ev != null,
                    IsEvaluationFinalized = ev?.IsFinalized ?? false,
                    ProgressBreakdown = breakdown,
                    ProgressPercent = breakdown?.TotalPercent ?? 0
                };
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving lecturer students");
            return StatusCode(500, new { message = "Lỗi khi lấy danh sách sinh viên." });
        }
    }


}

/// <summary>
/// DTO for lecturer student list (evaluation context)
/// </summary>
public class LecturerEvaluationStudentDto
{
    public Guid StudentId { get; set; }
    public Guid InternshipId { get; set; }
    public Guid? SemesterId { get; set; }
    public string StudentCode { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Class { get; set; }
    public string? Major { get; set; }
    public Guid? CompanyId { get; set; }
    public string? CompanyName { get; set; }
    public string? Position { get; set; }
    public string InternshipStatus { get; set; } = null!;
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public int WeeklyReportCount { get; set; }
    public int PendingReportCount { get; set; }
    public int SubmissionCount { get; set; }
    public bool FinalReportSubmitted { get; set; }
    public bool PracticalProductSubmitted { get; set; }
    public Guid? EvaluationId { get; set; }
    public decimal? FinalGrade { get; set; }
    public DateTime? EvaluatedAt { get; set; }
    public bool HasEvaluation { get; set; }
    public bool IsEvaluationFinalized { get; set; }
    public int ProgressPercent { get; set; }
    public ProgressBreakdownDto? ProgressBreakdown { get; set; }
}
