namespace InternLink.Domain.Entities.Rbac;

public class EmployerEvaluation : BaseEntity
{
    public Guid InternshipId { get; set; }
    public Internship Internship { get; set; } = null!;
    public Guid TokenId { get; set; }
    public EmployerEvaluationToken Token { get; set; } = null!;
    public int AttendanceScore { get; set; }
    public int SkillsScore { get; set; }
    public int AttitudeScore { get; set; }
    public decimal FinalScore { get; set; }
    public string? RubricScoresJson { get; set; }
    public string? Strengths { get; set; }
    public string? AreasForImprovement { get; set; }
    public string? Comments { get; set; }
    public string ConfirmedMentorName { get; set; } = null!;
    public DateTime ConfirmedAt { get; set; }
}
