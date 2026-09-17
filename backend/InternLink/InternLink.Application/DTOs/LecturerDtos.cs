namespace InternLink.Application.DTOs;



public sealed class StudentSummaryDto

{

    public Guid Id { get; set; }

    public string StudentCode { get; set; } = null!;

    public string FullName { get; set; } = null!;

    public string? Class { get; set; }

    public string? Major { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

}



public sealed class CompanySummaryDto

{

    public Guid Id { get; set; }

    public string CompanyName { get; set; } = null!;

    public string? Industry { get; set; }

    public string? ContactPerson { get; set; }

    public string? ContactEmail { get; set; }

    public string? ContactPhone { get; set; }

}



public sealed class FeedbackDto

{

    public Guid Id { get; set; }

    public Guid? SubmissionId { get; set; }
    public Guid? WeeklyReportId { get; set; }

    public Guid? LecturerId { get; set; }

    public string? LecturerName { get; set; }

    public string AuthorRole { get; set; } = "Student";

    public string Comment { get; set; } = null!;

    public bool IsPublic { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? StudentReadAt { get; set; }
    public DateTime? LecturerReadAt { get; set; }

}



public sealed class SubmissionDto

{

    public Guid Id { get; set; }

    public Guid InternshipId { get; set; }

    public string Type { get; set; } = null!;

    public string Status { get; set; } = null!;

    public int Version { get; set; }

    public string? Title { get; set; }

    public string? Description { get; set; }

    public string? FileName { get; set; }

    public string? FileUrl { get; set; }
    public string? GoogleDriveFileId { get; set; }

    public DateTime SubmittedAt { get; set; }

    public IEnumerable<SubmissionAssetDto> Assets { get; set; } = Array.Empty<SubmissionAssetDto>();

    public IEnumerable<FeedbackDto> Feedbacks { get; set; } = Array.Empty<FeedbackDto>();

}

public sealed class SubmissionAssetDto
{
    public Guid Id { get; set; }
    public string? Label { get; set; }
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
    public string? GoogleDriveFileId { get; set; }
    public string AssetType { get; set; } = "file";
    public long? FileSize { get; set; }
    public string? MimeType { get; set; }
    public DateTime UploadedAt { get; set; }
}



public class InternshipDto

{

    public Guid Id { get; set; }

    public Guid StudentId { get; set; }

    public Guid? CompanyId { get; set; } // Changed: nullable because company assigned later

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public string Status { get; set; } = null!;

    public string? Position { get; set; }

    public string? SupervisorName { get; set; }

    public string? Notes { get; set; }

    public StudentSummaryDto? Student { get; set; }

    public CompanySummaryDto? Company { get; set; }

}



public sealed class InternshipDetailDto : InternshipDto

{

    public IEnumerable<SubmissionDto> Submissions { get; set; } = Array.Empty<SubmissionDto>();

}



public sealed class CreateFeedbackRequest
{
    public string Comment { get; set; } = null!;
    public bool IsPublic { get; set; } = true;
    /// <summary>
    /// Optional submission status to apply after feedback (e.g. Reviewed, RevisionRequested, Approved).
    /// Defaults to RevisionRequested when omitted.
    /// </summary>
    public string? NewStatus { get; set; }
}

public sealed class UpdateStudentNotesRequest
{
    public string Notes { get; set; } = null!;
}

public sealed class NotifyStudentsRequest
{
    public string Title { get; set; } = null!;
    public string Message { get; set; } = null!;
}

public sealed class RemindStudentRequest
{
    public string? Title { get; set; }
    public string? Message { get; set; }
}

public sealed class LecturerStudentListItemDto
{
    public Guid StudentId { get; set; }
    public Guid InternshipId { get; set; }
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
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int WeeklyReportCount { get; set; }
    public int PendingReportCount { get; set; }
    public int SubmissionCount { get; set; }
    public string? Notes { get; set; }
    public decimal? FinalGrade { get; set; }
    public bool HasEvaluation { get; set; }
    public bool IsEvaluationFinalized { get; set; }
    public int ProgressPercent { get; set; }
    public ProgressBreakdownDto? ProgressBreakdown { get; set; }
}

public sealed class LecturerCompanySummaryDto
{
    public Guid Id { get; set; }
    public string CompanyName { get; set; } = null!;
    public string? Industry { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? Address { get; set; }
    public int AssignedStudentsCount { get; set; }
}

public sealed class LecturerDashboardStatsDto
{
    public int TotalStudents { get; set; }
    public int AssignedCompanyCount { get; set; }
    public int InterningCount { get; set; }
    public int AverageProgress { get; set; }
    public int PendingReviewsCount { get; set; }
    public int CompletedCount { get; set; }
    public int OverdueReportsCount { get; set; }
    public decimal AverageGrade { get; set; }
    public int EvaluatedCount { get; set; }
    public Dictionary<string, int> StatusDistribution { get; set; } = new();
}

/// <summary>
/// Weekly submission trend for analytics charts.
/// </summary>
public sealed class WeeklyTrendDto
{
    public int WeekNumber { get; set; }
    public string Label { get; set; } = null!;
    public int OnTimeCount { get; set; }
    public int LateCount { get; set; }
    public int MissingCount { get; set; }
    public int TotalStudents { get; set; }
    public decimal ComplianceRate { get; set; }
}

/// <summary>
/// Grade distribution for analytics charts.
/// </summary>
public sealed class GradeDistributionDto
{
    public int ExcellentCount { get; set; }  // 9.0 - 10.0
    public int GoodCount { get; set; }       // 8.0 - 8.9
    public int FairCount { get; set; }       // 7.0 - 7.9
    public int AverageCount { get; set; }    // 5.5 - 6.9
    public int FailCount { get; set; }       // < 5.5
    public int NotYetGradedCount { get; set; }
    public decimal OverallAverage { get; set; }
    public int TotalStudents { get; set; }
}

/// <summary>
/// Company statistics for analytics.
/// </summary>
public sealed class CompanyStatsDto
{
    public string CompanyName { get; set; } = null!;
    public int StudentCount { get; set; }
    public string Positions { get; set; } = null!;
    public decimal AverageGrade { get; set; }
    public string PartnershipLevel { get; set; } = null!;
}

/// <summary>
/// Lecturer activity statistics.
/// </summary>
public sealed class LecturerActivityStatsDto
{
    public int ReviewedReportsCount { get; set; }
    public int PendingReportsCount { get; set; }
    public int CompletedStudentsCount { get; set; }
    public int TotalStudentsCount { get; set; }
    public decimal AverageResponseDays { get; set; }
    public decimal ComplianceRate { get; set; }
}

/// <summary>
/// Detail DTO for a company in lecturer portal: includes internships + submissions/logs.
/// </summary>
public sealed class CompanyDetailDto
{
    public Guid Id { get; set; }
    public string CompanyName { get; set; } = null!;
    public string? Industry { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? Address { get; set; }
    public int AssignedStudentsCount { get; set; }
    public int TotalSubmissions { get; set; }
    public int TotalWeeklyReports { get; set; }
    public int PendingReviewsCount { get; set; }
    public IEnumerable<CompanyPositionDto> Positions { get; set; } = Array.Empty<CompanyPositionDto>();
    public IEnumerable<InternshipListItemDto> Internships { get; set; } = Array.Empty<InternshipListItemDto>();
}


