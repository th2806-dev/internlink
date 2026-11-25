namespace InternLink.Domain.Entities;

public class Feedback : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Guid? SubmissionId { get; set; }
    public Submission? Submission { get; set; }

    public Guid? WeeklyReportId { get; set; }
    public WeeklyReport? WeeklyReport { get; set; }

    public Guid? LecturerId { get; set; }
    public Lecturer? Lecturer { get; set; }

    public string Comment { get; set; } = null!;
    public bool IsPublic { get; set; } = true;
    public DateTime? StudentReadAt { get; set; }
    public DateTime? LecturerReadAt { get; set; }
}
