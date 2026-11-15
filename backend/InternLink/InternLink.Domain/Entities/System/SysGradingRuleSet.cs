namespace InternLink.Domain.Entities.Rbac;

public class SysGradingRuleSet : BaseEntity
{
    public Guid SemesterId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string RuleSetName { get; set; } = null!;
    public decimal ProcessScoreWeight { get; set; } = 0.40m;
    public decimal ExamScoreWeight { get; set; } = 0.60m;
    public decimal EmployerScoreWeight { get; set; } = 0.00m;
    public int RequiredWeeklyReportsCount { get; set; } = 6;
    public decimal StepPenaltyPerLateReport { get; set; } = 0.5m;
    public decimal StepPenaltyPerMissingReport { get; set; } = 2.0m;
    public bool RequireFinalReportForExamEligibility { get; set; } = true;
    public int WeeklyDeadlineDay { get; set; } = 5;
    public decimal LatePenaltyPointsPerDay { get; set; }
    public decimal MinimumPassingScore { get; set; } = 5.0m;
}
