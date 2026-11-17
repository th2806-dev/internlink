namespace InternLink.Domain.Entities.Rbac;

public class EmployerEvaluationToken : BaseEntity
{
    public string Token { get; set; } = null!;
    public Guid InternshipId { get; set; }
    public Internship Internship { get; set; } = null!;
    public string MentorEmail { get; set; } = null!;
    public string MentorName { get; set; } = null!;
    public string? RubricSnapshotJson { get; set; }
    public DateTime ExpiredAt { get; set; } = DateTime.UtcNow.AddDays(15);
    public bool IsUsed { get; set; }
    public DateTime? UsedAt { get; set; }
}
