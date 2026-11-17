namespace InternLink.Application.DTOs;

public sealed class StudentPortalProfileDto
{
    public StudentDto Student { get; set; } = null!;
    public InternshipDto? Internship { get; set; }
    public string? LecturerName { get; set; }
    public string? LecturerEmail { get; set; }
    public string? LecturerPhone { get; set; }
    public int ProgressPercent { get; set; }
    public ProgressBreakdownDto? ProgressBreakdown { get; set; }
    public bool IsArchiveReadOnly { get; set; }
}

/// <summary>Progress and semester configuration used by the student dashboard.</summary>
public sealed record StudentDashboardProgressResponse(
    StudentPortalProfileDto Profile,
    Guid? SemesterId,
    string? SemesterName,
    string? SemesterStatus,
    int TotalWeeks,
    int? RequiredWeeklyReportsCount,
    int? WeeklyDeadlineDay,
    decimal? LatePenaltyPointsPerDay,
    IReadOnlyList<StudentDashboardWeekResponse> Weeks);

/// <summary>A configured weekly report deadline visible to the student.</summary>
public sealed record StudentDashboardWeekResponse(
    int WeekNumber,
    string Title,
    bool IsSubmissionOpen,
    bool AllowLateSubmission,
    bool IsFinalReport,
    DateTimeOffset? StartDate,
    DateTimeOffset DueDate);

/// <summary>Official student and internship details with a protected acceptance link.</summary>
public sealed record StudentIntroductionLetterResponse(
    string ReferenceCode,
    string Token,
    DateTimeOffset ExpiresAt,
    string StudentName,
    string StudentCode,
    string? ClassName,
    string? Major,
    string? DepartmentName,
    string? CompanyName,
    string? Position,
    string? LecturerName,
    string? SemesterName,
    DateTimeOffset? InternshipStartDate,
    DateTimeOffset? InternshipEndDate);

/// <summary>Protected payload used by the future public internship acceptance flow.</summary>
public sealed record StudentAcceptanceTokenPayload(
    Guid InternshipId,
    Guid StudentId,
    long ExpiresAtUnixSeconds,
    string Nonce);
