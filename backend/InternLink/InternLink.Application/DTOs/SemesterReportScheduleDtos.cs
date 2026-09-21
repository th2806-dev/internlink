namespace InternLink.Application.DTOs;

public class SemesterReportScheduleDto
{
    public Guid Id { get; set; }
    public Guid SemesterId { get; set; }
    public int WeekNumber { get; set; }
    public string Title { get; set; } = null!;
    public DateTime? StartDate { get; set; }
    public DateTime DueDate { get; set; }
    public bool IsSubmissionOpen { get; set; } = true;
    public bool AllowLateSubmission { get; set; } = true;
    public string? Description { get; set; }
    /// <summary>true khi WeekNumber > totalWeeks (quy ước: báo cáo cuối kỳ)</summary>
    public bool IsFinalReport { get; set; }
}

public class CreateReportScheduleRequest
{
    public int WeekNumber { get; set; }
    public string Title { get; set; } = null!;
    public DateTime? StartDate { get; set; }
    public DateTime DueDate { get; set; }
    public bool IsSubmissionOpen { get; set; } = true;
    public bool AllowLateSubmission { get; set; } = true;
    public string? Description { get; set; }
    public bool IsFinalReport { get; set; }
}

public class UpdateReportScheduleRequest
{
    public string? Title { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
    public bool? IsSubmissionOpen { get; set; }
    public bool? AllowLateSubmission { get; set; }
    public string? Description { get; set; }
}
