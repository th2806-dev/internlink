using System.ComponentModel.DataAnnotations;

namespace InternLink.Application.DTOs;

/// <summary>Student and internship information shown before an employer confirms acceptance.</summary>
public sealed record InternshipAcceptancePreviewResponse(
    string ReferenceCode,
    string StudentName,
    string StudentCode,
    string? ClassName,
    string? Major,
    string? DepartmentName,
    string? CompanyName,
    string? Position,
    string? SemesterName,
    string Status,
    DateTimeOffset? StartDate,
    DateTimeOffset? EndDate,
    DateTimeOffset ExpiresAt);

/// <summary>Mentor contact details and expected dates for accepting an internship.</summary>
public sealed record ConfirmInternshipAcceptanceRequest
{
    [Required, MaxLength(2048)]
    public required string Token { get; init; }

    [Required, MaxLength(200)]
    public required string MentorName { get; init; }

    [Required, Phone, MaxLength(50)]
    public required string MentorPhone { get; init; }

    [Required, EmailAddress, MaxLength(200)]
    public required string MentorEmail { get; init; }

    [MaxLength(200)]
    public string? MentorDepartment { get; init; }

    public required DateTimeOffset StartDate { get; init; }
    public required DateTimeOffset EndDate { get; init; }
}

/// <summary>Confirmation returned after an employer accepts a student.</summary>
public sealed record InternshipAcceptanceConfirmationResponse(
    string StudentName,
    string StudentCode,
    string CompanyName,
    string MentorName,
    string Status,
    DateTimeOffset ConfirmedAt);

/// <summary>One criterion configured for the semester evaluation rubric.</summary>
public sealed record PublicEvaluationCriterionResponse(
    string Name,
    string? Description,
    int MaxScore,
    decimal Weight);

/// <summary>Semester grading settings relevant to the employer evaluation.</summary>
public sealed record PublicEmployerGradingRulesResponse(
    string RuleSetName,
    decimal EmployerScoreWeight,
    decimal MinimumPassingScore,
    int RequiredWeeklyReportsCount);

/// <summary>Public, privacy-limited confirmation that an internship record is authentic.</summary>
public sealed record PublicVerificationResponse(
    string ReferenceCode,
    string VerificationType,
    bool IsAuthentic,
    string InstitutionName,
    DateTimeOffset VerifiedAt,
    string StudentName,
    string StudentCode,
    string? ClassName,
    string? Major,
    string? DepartmentName,
    string? SemesterName,
    string? CompanyName,
    string InternshipStatus,
    string? ResultSummary,
    string? FollowUpVerificationCode);
