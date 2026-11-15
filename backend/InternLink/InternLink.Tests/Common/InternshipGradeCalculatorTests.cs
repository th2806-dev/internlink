using FluentAssertions;
using InternLink.Application.Common;
using Xunit;

namespace InternLink.Tests.Common;

public sealed class InternshipGradeCalculatorTests
{
    [Theory]
    [InlineData(8.5, 4.0, "A")]
    [InlineData(7.0, 3.0, "B")]
    [InlineData(5.5, 2.0, "C")]
    [InlineData(4.0, 1.0, "D")]
    [InlineData(3.9, 0.0, "F")]
    public void ConvertToFourPointScale_UsesConfiguredGradeBoundaries(
        decimal score,
        decimal score4,
        string letterGrade)
    {
        var result = InternshipGradeCalculator.ConvertToFourPointScale(score);

        result.Score4.Should().Be(score4);
        result.LetterGrade.Should().Be(letterGrade);
    }

    [Fact]
    public void ComputeProcessScore_DividesRubricByEveryOpenDeadline()
    {
        var processScore = InternshipGradeCalculator.ComputeProcessScore(
            missingCount: 4,
            lateCount: 0,
            submittedCount: 1,
            weeklyQualityLevels: new decimal?[] { 5m },
            hasCreativeProduct: false,
            totalOpenWeeks: 5);

        processScore.Should().Be(3m);
    }

    [Fact]
    public void EvaluateEligibility_WithoutFinalReport_BlocksExamButKeepsAccumulatedAverage()
    {
        var (isEligible, reasons) = InternshipGradeCalculator.EvaluateEligibility(
            finalReportSubmitted: false,
            absentSessionCount: 0);
        var (average, classification) = InternshipGradeCalculator.ComputeAverage(10m, null);

        isEligible.Should().BeFalse();
        reasons.Should().Contain(InternshipGradeCalculator.ReasonNoFinalReport);
        average.Should().Be(4m);
        classification.Should().Be("Không đạt");
    }

    [Fact]
    public void EvaluateEligibility_TwoAbsences_AreIneligibleEvenDuringActiveSemester()
    {
        var (isEligible, reasons) = InternshipGradeCalculator.EvaluateEligibility(
            finalReportSubmitted: true,
            absentSessionCount: 2);
        var (average, classification) = InternshipGradeCalculator.ComputeAverage(
            10m,
            null,
            isDisqualifiedByAbsence: true);

        isEligible.Should().BeFalse();
        reasons.Should().Contain(InternshipGradeCalculator.ReasonAbsence);
        average.Should().Be(0m);
        classification.Should().Be(InternshipGradeCalculator.IneligibleClassification);
    }

    [Fact]
    public void ComputeAverage_WithProcessAndOralScores_UsesFortySixtyWeights()
    {
        var (average, classification) = InternshipGradeCalculator.ComputeAverage(
            processScore: 9m,
            oralExamScore: 8.5m);

        average.Should().Be(8.7m);
        classification.Should().Be("Xuất sắc");
    }

    [Fact]
    public void ComputeProcessScore_UsesConfiguredReportPenalties()
    {
        var processScore = InternshipGradeCalculator.ComputeProcessScore(
            missingCount: 1,
            lateCount: 1,
            submittedCount: 1,
            weeklyQualityLevels: Array.Empty<decimal?>(),
            hasCreativeProduct: false,
            totalOpenWeeks: 1,
            missingReportPenalty: 1m,
            lateReportPenalty: 1m);

        processScore.Should().Be(2m);
    }

    [Fact]
    public void ComputeProcessScore_AppliesCumulativeDailyPenaltyWhenConfigured()
    {
        var processScore = InternshipGradeCalculator.ComputeProcessScore(
            missingCount: 0,
            lateCount: 1,
            submittedCount: 1,
            weeklyQualityLevels: Array.Empty<decimal?>(),
            hasCreativeProduct: false,
            latePenaltyDays: 3,
            latePenaltyPointsPerDay: 0.5m);

        processScore.Should().Be(2.5m);
    }

    [Fact]
    public void ComputeAverage_UsesConfiguredMinimumPassingScore()
    {
        var (_, belowConfiguredMinimum) = InternshipGradeCalculator.ComputeAverage(
            processScore: 5.2m,
            oralExamScore: 5.2m,
            minimumPassingScore: 5.5m);
        var (_, lowerMinimum) = InternshipGradeCalculator.ComputeAverage(
            processScore: 4.5m,
            oralExamScore: 4.5m,
            minimumPassingScore: 4m);

        belowConfiguredMinimum.Should().Be("Không đạt");
        lowerMinimum.Should().Be("Trung bình");
    }

    [Fact]
    public void ComputeAverage_UsesConfiguredProcessExamAndEmployerWeights()
    {
        var (average, _) = InternshipGradeCalculator.ComputeAverage(
            processScore: 9m,
            oralExamScore: 8m,
            processWeight: 0.2m,
            oralWeight: 0.3m,
            employerScore: 7m,
            employerWeight: 0.5m);

        average.Should().Be(7.7m);
    }

    [Fact]
    public void EvaluateEligibility_AllowsMissingFinalReportWhenRuleDoesNotRequireIt()
    {
        var (isEligible, reasons) = InternshipGradeCalculator.EvaluateEligibility(
            finalReportSubmitted: false,
            absentSessionCount: 0,
            requireFinalReport: false);

        isEligible.Should().BeTrue();
        reasons.Should().BeEmpty();
    }
}
