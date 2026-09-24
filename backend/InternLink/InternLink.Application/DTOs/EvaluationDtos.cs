using InternLink.Domain.Enums;

namespace InternLink.Application.DTOs;

/// <summary>
/// DTO for creating an evaluation
/// </summary>
public class CreateEvaluationRequest
{
    public Guid InternshipId { get; set; }

    /// <summary>
    /// Technical Skills score (0-10)
    /// </summary>
    public int TechnicalScore { get; set; }

    /// <summary>
    /// Communication Skills score (0-10)
    /// </summary>
    public int CommunicationScore { get; set; }

    /// <summary>
    /// Teamwork/Collaboration score (0-10)
    /// </summary>
    public int TeamworkScore { get; set; }

    /// <summary>
    /// Initiative/Proactivity score (0-10)
    /// </summary>
    public int InitiativeScore { get; set; }

    /// <summary>
    /// Lecturer's comments on student performance
    /// </summary>
    public string? Comments { get; set; }

    /// <summary>
    /// Strengths demonstrated by the student
    /// </summary>
    public string? Strengths { get; set; }

    /// <summary>
    /// Areas for improvement
    /// </summary>
    public string? AreasForImprovement { get; set; }

    /// <summary>
    /// Flag to finalize the evaluation immediately
    /// </summary>
    public bool IsFinalized { get; set; } = false;
}

/// <summary>
/// DTO for updating an evaluation
/// </summary>
public class UpdateEvaluationRequest
{
    /// <summary>
    /// Technical Skills score (0-10)
    /// </summary>
    public int? TechnicalScore { get; set; }

    /// <summary>
    /// Communication Skills score (0-10)
    /// </summary>
    public int? CommunicationScore { get; set; }

    /// <summary>
    /// Teamwork/Collaboration score (0-10)
    /// </summary>
    public int? TeamworkScore { get; set; }

    /// <summary>
    /// Initiative/Proactivity score (0-10)
    /// </summary>
    public int? InitiativeScore { get; set; }

    /// <summary>
    /// Lecturer's comments on student performance
    /// </summary>
    public string? Comments { get; set; }

    /// <summary>
    /// Strengths demonstrated by the student
    /// </summary>
    public string? Strengths { get; set; }

    /// <summary>
    /// Areas for improvement
    /// </summary>
    public string? AreasForImprovement { get; set; }

    /// <summary>
    /// Flag to finalize the evaluation
    /// </summary>
    public bool? IsFinalized { get; set; }
}

/// <summary>
/// DTO for evaluation list item (summary)
/// </summary>
public class EvaluationListItemDto
{
    public Guid Id { get; set; }
    public Guid InternshipId { get; set; }
    public string? StudentName { get; set; }
    public string? CompanyName { get; set; }
    public decimal FinalGrade { get; set; }
    public DateTime EvaluatedAt { get; set; }
    public bool IsFinalized { get; set; }
    public UserSummaryDto? EvaluatedBy { get; set; }
}

/// <summary>
/// DTO for evaluation detail view
/// </summary>
public class EvaluationDetailDto
{
    public Guid Id { get; set; }
    public Guid InternshipId { get; set; }
    public int TechnicalScore { get; set; }
    public int CommunicationScore { get; set; }
    public int TeamworkScore { get; set; }
    public int InitiativeScore { get; set; }
    public decimal FinalGrade { get; set; }
    public decimal? QualityLevel { get; set; }
    public decimal? OralExamScore { get; set; }
    public bool HasCreativeProduct { get; set; }
    public Dictionary<int, decimal>? WeeklyQualityScores { get; set; }
    public string? Comments { get; set; }
    public string? Strengths { get; set; }
    public string? AreasForImprovement { get; set; }
    public DateTime EvaluatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsFinalized { get; set; }
    public DateTime? DefenseDate { get; set; }
    public DefenseStatus DefenseStatus { get; set; }
    public string? DefenseCouncilName { get; set; }
    public string? DefenseExaminerName { get; set; }
    public UserSummaryDto? EvaluatedBy { get; set; }
    public InternshipSummaryDto? Internship { get; set; }
}

public class UpdateDefenseRequest
{
    public DateTime? DefenseDate { get; set; }
    public DefenseStatus DefenseStatus { get; set; }
    public string? DefenseCouncilName { get; set; }
    public string? DefenseExaminerName { get; set; }
}

/// <summary>
/// DTO for evaluation criteria scores summary
/// </summary>
public class EvaluationScoresSummaryDto
{
    public int TechnicalScore { get; set; }
    public int CommunicationScore { get; set; }
    public int TeamworkScore { get; set; }
    public int InitiativeScore { get; set; }
    public decimal FinalGrade { get; set; }
}

/// <summary>
/// DTO for filtering evaluations
/// </summary>
public class EvaluationFilterRequest : PaginationRequest
{
    /// <summary>
    /// Filter by internship ID
    /// </summary>
    public Guid? InternshipId { get; set; }

    /// <summary>
    /// Filter by student ID
    /// </summary>
    public Guid? StudentId { get; set; }

    /// <summary>
    /// Filter by company ID
    /// </summary>
    public Guid? CompanyId { get; set; }

    /// <summary>
    /// Filter by finalized status only
    /// </summary>
    public bool? IsFinalized { get; set; }

    /// <summary>
    /// Filter evaluations with grade >= minGrade
    /// </summary>
    public decimal? MinGrade { get; set; }

    /// <summary>
    /// Filter evaluations with grade <= maxGrade
    /// </summary>
    public decimal? MaxGrade { get; set; }

    /// <summary>
    /// Search by student name or company name
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Filter by evaluation date range (from)
    /// </summary>
    public DateTime? EvaluatedFrom { get; set; }

    /// <summary>
    /// Filter by evaluation date range (to)
    /// </summary>
    public DateTime? EvaluatedTo { get; set; }

    /// <summary>
    /// Sort field (e.g., "FinalGrade", "EvaluatedAt", "StudentName")
    /// </summary>
    public string? SortBy { get; set; } = "EvaluatedAt";

    /// <summary>
    /// Sort order (asc or desc)
    /// </summary>
    public string? SortOrder { get; set; } = "desc";
}
