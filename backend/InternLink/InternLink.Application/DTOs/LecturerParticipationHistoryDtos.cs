namespace InternLink.Application.DTOs;

public sealed class LecturerParticipationHistoryDto
{
    public Guid SemesterId { get; set; }
    public string SemesterName { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public List<LecturerHistoryStudentDto> Students { get; set; } = new();
    public List<LecturerHistoryActivityDto> Activities { get; set; } = new();
}

public sealed class LecturerHistoryStudentDto
{
    public Guid InternshipId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public string? CompanyName { get; set; }
    public int ReviewedReportCount { get; set; }
    public decimal? FinalGrade { get; set; }
    public bool IsFinalized { get; set; }
}

public sealed class LecturerHistoryActivityDto
{
    public Guid Id { get; set; }
    public Guid? StudentId { get; set; }
    public string? StudentName { get; set; }
    public string? CompanyName { get; set; }
    public string ActivityType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public int? WeekNumber { get; set; }
    public DateTime OccurredAt { get; set; }
}