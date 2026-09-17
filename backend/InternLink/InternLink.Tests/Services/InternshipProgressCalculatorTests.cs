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
}
