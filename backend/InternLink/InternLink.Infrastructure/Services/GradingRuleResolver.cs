using InternLink.Application.Common;
using InternLink.Domain.Entities.Rbac;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

internal static class GradingRuleResolver
{
    public static Task<List<SysGradingRuleSet>> LoadAllAsync(
        AppDbContext context,
        CancellationToken cancellationToken = default) =>
        context.SysGradingRuleSets
            .AsNoTracking()
            .ToListAsync(cancellationToken);

    public static Task<List<SysGradingRuleSet>> LoadForSemesterAsync(
        AppDbContext context,
        Guid semesterId,
        CancellationToken cancellationToken = default) =>
        context.SysGradingRuleSets
            .AsNoTracking()
            .Where(rule => rule.SemesterId == semesterId)
            .ToListAsync(cancellationToken);

    public static InternshipGradingRules Resolve(
        IEnumerable<SysGradingRuleSet> ruleSets,
        Guid? semesterId,
        Guid? departmentId)
    {
        var selected = semesterId.HasValue
            ? ruleSets
                .Where(rule => rule.SemesterId == semesterId.Value
                    && (rule.DepartmentId == departmentId || rule.DepartmentId == null))
                .OrderByDescending(rule => rule.DepartmentId.HasValue)
                .FirstOrDefault()
            : null;

        var result = selected == null
            ? new InternshipGradingRules()
            : new InternshipGradingRules(
                selected.ProcessScoreWeight,
                selected.ExamScoreWeight,
                selected.EmployerScoreWeight,
                selected.RequiredWeeklyReportsCount,
                selected.StepPenaltyPerLateReport,
                selected.StepPenaltyPerMissingReport,
                selected.RequireFinalReportForExamEligibility,
                selected.WeeklyDeadlineDay,
                selected.LatePenaltyPointsPerDay,
                selected.MinimumPassingScore);
        Validate(result);
        return result;
    }

    private static void Validate(InternshipGradingRules rules)
    {
        if (rules.ProcessScoreWeight < 0m
            || rules.ExamScoreWeight < 0m
            || rules.EmployerScoreWeight < 0m
            || rules.ProcessScoreWeight + rules.ExamScoreWeight + rules.EmployerScoreWeight != 1m)
            throw new InvalidOperationException("Trọng số quy chế điểm phải không âm và có tổng bằng 1.");
        if (rules.RequiredWeeklyReportsCount < 0
            || rules.StepPenaltyPerLateReport < 0m
            || rules.StepPenaltyPerMissingReport < 0m
            || rules.LatePenaltyPointsPerDay < 0m
            || rules.MinimumPassingScore is < 0m or > 10m
            || rules.WeeklyDeadlineDay is < 1 or > 7)
            throw new InvalidOperationException("Số báo cáo tuần và mức trừ điểm trong quy chế không được âm.");
    }
}
