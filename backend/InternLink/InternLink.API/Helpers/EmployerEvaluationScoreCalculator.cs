using InternLink.API.Controllers;

namespace InternLink.API.Helpers;

/// <summary>Calculates a weighted employer score from the rubric snapshot and submitted ratings.</summary>
public static class EmployerEvaluationScoreCalculator
{
    /// <summary>Excludes not-applicable criteria from both the score and weight denominator.</summary>
    public static decimal CalculateFinalScore(
        IReadOnlyCollection<EmployerEvaluationRubricCriterionSnapshot> criteria,
        IReadOnlyDictionary<Guid, int?> scores)
    {
        if (criteria.Count != scores.Count || criteria.Any(criterion => !scores.ContainsKey(criterion.Id)))
            throw new ArgumentException("Scores must contain exactly one entry for each rubric criterion.", nameof(scores));

        var ratedCriteria = criteria
            .Where(criterion => scores[criterion.Id].HasValue)
            .ToArray();
        var applicableWeight = ratedCriteria.Sum(criterion => criterion.Weight);
        if (applicableWeight <= 0)
            throw new InvalidOperationException("At least one rubric criterion must be rated.");

        var weightedScore = ratedCriteria.Sum(criterion =>
            scores[criterion.Id]!.Value / 4m * criterion.Weight);

        return Math.Round(weightedScore / applicableWeight * 10m, 2);
    }
}
