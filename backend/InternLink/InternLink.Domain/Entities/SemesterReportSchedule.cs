using InternLink.Domain.Enums;

namespace InternLink.Domain.Entities;

public class SemesterReportSchedule : BaseEntity
{
    public Guid SemesterId { get; set; }
    public Semester Semester { get; set; } = null!;

    public int WeekNumber { get; set; }
    public string Title { get; set; } = null!;
    public DateTime DueDate { get; set; }
    public bool AllowLateSubmission { get; set; } = true;
    public string? Description { get; set; }
}
