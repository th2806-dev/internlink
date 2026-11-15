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
        classification.Should().Be("Chưa xếp loại");
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

    [Theory]
    [InlineData(6.4, "Trung bình")]
    [InlineData(6.5, "Trung bình khá")]
    [InlineData(6.9, "Trung bình khá")]
    [InlineData(7.0, "Khá")]
    [InlineData(7.9, "Khá")]
    public void Classify_UsesOfficialSevenTierBoundaries(double score, string expected) =>
        InternshipGradeCalculator.Classify((decimal)score).Should().Be(expected);

    [Fact]
    public void ComputeAverage_WithoutOralExamScore_RemainsUnclassified()
    {
        var (average, classification) = InternshipGradeCalculator.ComputeAverage(
            processScore: 10m,
            oralExamScore: null);

        average.Should().Be(4m);
        classification.Should().Be("Chưa xếp loại");
    }
}
