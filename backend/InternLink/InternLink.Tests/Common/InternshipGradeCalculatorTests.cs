using FluentAssertions;
using InternLink.Application.Common;
using Xunit;

namespace InternLink.Tests.Common;

public sealed class InternshipGradeCalculatorTests
{
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
}
