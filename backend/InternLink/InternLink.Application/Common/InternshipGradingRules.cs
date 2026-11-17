namespace InternLink.Application.Common;

public sealed record InternshipGradingRules(
    decimal ProcessScoreWeight = 0.40m,
    decimal ExamScoreWeight = 0.60m,
    decimal EmployerScoreWeight = 0.00m,
    int RequiredWeeklyReportsCount = 6,
    decimal StepPenaltyPerLateReport = 0.5m,
    decimal StepPenaltyPerMissingReport = 2.0m,
    bool RequireFinalReportForExamEligibility = true,
    int WeeklyDeadlineDay = 5,
    decimal LatePenaltyPointsPerDay = 0m,
    decimal MinimumPassingScore = 5.0m);
