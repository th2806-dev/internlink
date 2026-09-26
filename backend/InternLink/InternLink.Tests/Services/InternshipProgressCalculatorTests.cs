using FluentAssertions;
using InternLink.Application.Common;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using Xunit;

namespace InternLink.Tests.Services;

public class InternshipProgressCalculatorTests
{
    [Fact]
    public void Calculate_NewUserNotLoggedIn_ShouldHaveZeroProgress()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "2421160001",
            MustChangePassword = true,
            LastLoginAt = null
        };
        var student = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "2421160001",
            FullName = "Nguyen Van A"
        };

        // Act
        var result = InternshipProgressCalculator.Calculate(user, student, null, null, null, 6);

        // Assert
        result.TotalPercent.Should().Be(0);
        result.AccountPercent.Should().Be(0);
        result.ProfilePercent.Should().Be(0);
        result.CompanyPercent.Should().Be(0);
        result.ReportPercent.Should().Be(0);
        result.EvaluationPercent.Should().Be(0);
    }

    [Fact]
    public void Calculate_UserLoggedIn_ShouldNotAdvanceProgress()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "2421160001",
            MustChangePassword = false,
            LastLoginAt = DateTime.UtcNow
        };
        var student = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "2421160001",
            FullName = "Nguyen Van A"
        };

        // Act
        var result = InternshipProgressCalculator.Calculate(user, student, null, null, null, 6);

        // Assert
        result.AccountPercent.Should().Be(0);
        result.ProfilePercent.Should().Be(0);
        result.TotalPercent.Should().Be(0);
    }

    [Fact]
    public void Calculate_ProfileCompleted_ShouldNotAdvanceProgress()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            MustChangePassword = false,
            LastLoginAt = DateTime.UtcNow
        };
        var student = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "2421160001",
            FullName = "Nguyen Van A",
            Phone = "0901234567",
            DesiredPosition = "Backend Developer",
            Skills = "C#, .NET, SQL"
        };

        // Act
        var result = InternshipProgressCalculator.Calculate(user, student, null, null, null, 6);

        // Assert
        result.AccountPercent.Should().Be(0);
        result.ProfilePercent.Should().Be(0);
        result.CompanyPercent.Should().Be(0);
        result.TotalPercent.Should().Be(0);
    }

    [Fact]
    public void Calculate_AssignedCompany_ShouldNotAdvanceProgress()
    {
        // Arrange
        var user = new User { MustChangePassword = false, LastLoginAt = DateTime.UtcNow };
        var student = new Student
        {
            Id = Guid.NewGuid(),
            FullName = "Nguyen Van A",
            Phone = "0901234567",
            DesiredPosition = "Backend Developer"
        };
        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            CompanyId = Guid.NewGuid(),
            Status = InternshipStatus.InProgress
        };

        // Act
        var result = InternshipProgressCalculator.Calculate(user, student, internship, null, null, 6);

        // Assert
        result.AccountPercent.Should().Be(0);
        result.ProfilePercent.Should().Be(0);
        result.CompanyPercent.Should().Be(0);
        result.ReportPercent.Should().Be(0);
        result.TotalPercent.Should().Be(0);
    }

    [Fact]
    public void Calculate_DraftReportsOnly_ShouldNotCountDraftReports()
    {
        // Arrange
        var user = new User { MustChangePassword = false, LastLoginAt = DateTime.UtcNow };
        var student = new Student { Id = Guid.NewGuid(), FullName = "A", Phone = "0901", DesiredPosition = "Dev" };
        var internship = new Internship { Id = Guid.NewGuid(), StudentId = student.Id, CompanyId = Guid.NewGuid() };
        var reports = new List<WeeklyReport>
        {
            new() { Id = Guid.NewGuid(), InternshipId = internship.Id, WeekNumber = 1, Status = WeeklyReportStatus.Draft },
            new() { Id = Guid.NewGuid(), InternshipId = internship.Id, WeekNumber = 2, Status = WeeklyReportStatus.Draft }
        };

        // Act
        var result = InternshipProgressCalculator.Calculate(user, student, internship, reports, null, 6);

        // Assert
        result.ReportPercent.Should().Be(0);
        result.SubmittedReportsCount.Should().Be(0);
        result.TotalPercent.Should().Be(0);
    }

    [Fact]
    public void Calculate_SubmittedReports_ShouldCalculateProportionally()
    {
        // Arrange
        var user = new User { MustChangePassword = false, LastLoginAt = DateTime.UtcNow };
        var student = new Student { Id = Guid.NewGuid(), FullName = "A", Phone = "0901", DesiredPosition = "Dev" };
        var internship = new Internship { Id = Guid.NewGuid(), StudentId = student.Id, CompanyId = Guid.NewGuid() };
        // 3 out of 6 weeks submitted: 3/6 * 80 = 40%
        var reports = new List<WeeklyReport>
        {
            new() { Id = Guid.NewGuid(), InternshipId = internship.Id, WeekNumber = 1, Status = WeeklyReportStatus.Approved },
            new() { Id = Guid.NewGuid(), InternshipId = internship.Id, WeekNumber = 2, Status = WeeklyReportStatus.Submitted },
            new() { Id = Guid.NewGuid(), InternshipId = internship.Id, WeekNumber = 3, Status = WeeklyReportStatus.Reviewed },
            new() { Id = Guid.NewGuid(), InternshipId = internship.Id, WeekNumber = 4, Status = WeeklyReportStatus.Draft }
        };

        // Act
        var result = InternshipProgressCalculator.Calculate(user, student, internship, reports, null, 6);

        // Assert
        result.SubmittedReportsCount.Should().Be(3);
        result.RequiredWeeksCount.Should().Be(6);
        result.ReportPercent.Should().Be(40);
        result.TotalPercent.Should().Be(40);
    }

    [Fact]
    public void Calculate_AllWeeksSubmittedAndEvaluated_ShouldReach100Percent()
    {
        // Arrange
        var user = new User { MustChangePassword = false, LastLoginAt = DateTime.UtcNow };
        var student = new Student { Id = Guid.NewGuid(), FullName = "A", Phone = "0901", DesiredPosition = "Dev" };
        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            CompanyId = Guid.NewGuid(),
            Status = InternshipStatus.Graded
        };
        var reports = Enumerable.Range(1, 6).Select(w => new WeeklyReport
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            WeekNumber = w,
            Status = WeeklyReportStatus.Approved
        }).ToList();
        var eval = new Evaluation
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            FinalGrade = 8.5m,
            IsFinalized = true
        };

        // Act
        var result = InternshipProgressCalculator.Calculate(user, student, internship, reports, eval, 6);

        // Assert
        result.AccountPercent.Should().Be(0);
        result.ProfilePercent.Should().Be(0);
        result.CompanyPercent.Should().Be(0);
        result.ReportPercent.Should().Be(80);
        result.EvaluationPercent.Should().Be(20);
        result.TotalPercent.Should().Be(100);
    }

    [Fact]
    public void ResolveRequiredWeekNumbers_OnlyOpenWeeklySchedules_ExcludesClosedAndFinal()
    {
        var schedules = new List<SemesterReportSchedule>
        {
            new() { WeekNumber = 1, IsSubmissionOpen = true, Title = "T1" },
            new() { WeekNumber = 2, IsSubmissionOpen = true, Title = "T2" },
            new() { WeekNumber = 3, IsSubmissionOpen = true, Title = "T3" },
            new() { WeekNumber = 4, IsSubmissionOpen = true, Title = "T4" },
            new() { WeekNumber = 5, IsSubmissionOpen = true, Title = "T5" },
            new() { WeekNumber = 6, IsSubmissionOpen = false, Title = "T6 đóng — dành BC cuối kỳ" },
            new() { WeekNumber = 7, IsSubmissionOpen = true, Title = "Báo cáo cuối kỳ" },
        };

        var required = InternshipProgressCalculator.ResolveRequiredWeekNumbers(6, schedules);

        required.Should().Equal(1, 2, 3, 4, 5);
    }

    [Fact]
    public void Calculate_FiveOpenWeeksFullySubmittedAndEvaluated_ShouldReach100Percent()
    {
        // Kỳ 6 tuần nhưng GV chỉ bật deadline 5 tuần báo cáo tuần; tuần 6 = cuối kỳ/thi.
        var user = new User { MustChangePassword = false, LastLoginAt = DateTime.UtcNow };
        var student = new Student { Id = Guid.NewGuid(), FullName = "A", Phone = "0901", DesiredPosition = "Dev" };
        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            CompanyId = Guid.NewGuid(),
            Status = InternshipStatus.Graded
        };
        var reports = Enumerable.Range(1, 5).Select(w => new WeeklyReport
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            WeekNumber = w,
            Status = WeeklyReportStatus.Approved
        }).ToList();
        var eval = new Evaluation
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            FinalGrade = 8.5m,
            IsFinalized = true
        };
        var requiredWeeks = new[] { 1, 2, 3, 4, 5 };

        var result = InternshipProgressCalculator.Calculate(
            user, student, internship, reports, eval, 6, requiredWeeks);

        result.RequiredWeeksCount.Should().Be(5);
        result.SubmittedReportsCount.Should().Be(5);
        result.ReportPercent.Should().Be(80);
        result.EvaluationPercent.Should().Be(20);
        result.TotalPercent.Should().Be(100);
        result.SummaryText.Should().Be("Hoàn thành toàn bộ thực tập");
    }

    [Fact]
    public void Calculate_UsesOpenScheduleNotTotalWeeks_WhenPartial()
    {
        // 5/5 tuần mở đã nộp nhưng TotalWeeks=6 → không còn kẹt 87%.
        var user = new User { MustChangePassword = false, LastLoginAt = DateTime.UtcNow };
        var student = new Student { Id = Guid.NewGuid(), FullName = "A", Phone = "0901", DesiredPosition = "Dev" };
        var internship = new Internship { Id = Guid.NewGuid(), StudentId = student.Id, CompanyId = Guid.NewGuid() };
        var reports = Enumerable.Range(1, 5).Select(w => new WeeklyReport
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            WeekNumber = w,
            Status = WeeklyReportStatus.Approved
        }).ToList();
        var eval = new Evaluation { Id = Guid.NewGuid(), InternshipId = internship.Id, FinalGrade = 8m };

        var withSchedule = InternshipProgressCalculator.Calculate(
            user, student, internship, reports, eval, 6, new[] { 1, 2, 3, 4, 5 });
        var withTotalWeeksOnly = InternshipProgressCalculator.Calculate(
            user, student, internship, reports, eval, 6);

        withSchedule.TotalPercent.Should().Be(100);
        withTotalWeeksOnly.TotalPercent.Should().Be(87);
    }

    [Fact]
    public void IsInternshipFinished_WithOralExamScore_ShouldBeTrueEvenIfStatusInProgress()
    {
        var eval = new Evaluation { OralExamScore = 8.5m, FinalGrade = 8.0m };
        InternshipProgressCalculator.IsInternshipFinished(InternshipStatus.InProgress, eval)
            .Should().BeTrue();
        InternshipProgressCalculator.IsInternshipFinished(InternshipStatus.InProgress, null)
            .Should().BeFalse();
        InternshipProgressCalculator.IsInternshipFinished(InternshipStatus.Graded, null)
            .Should().BeTrue();
    }
}
