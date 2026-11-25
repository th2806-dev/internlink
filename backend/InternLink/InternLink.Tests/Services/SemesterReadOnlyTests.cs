using FluentAssertions;
using InternLink.Application.Common;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Tests.Services;

public class SemesterReadOnlyTests
{
    [Fact]
    public async Task SaveChangesAsync_ShouldRejectInternshipUpdatesInClosedSemester()
    {
        var fixture = await CreateClosedSemesterAsync();
        await using var db = fixture.Db;
        var internship = await db.Internships.SingleAsync();
        internship.Position = "Updated position";

        var save = () => db.SaveChangesAsync();

        await save.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage(SemesterWritePolicy.LockedMessage);
    }

    [Fact]
    public async Task SaveChangesAsync_ShouldRejectWeeklyReportsInClosedSemester()
    {
        var fixture = await CreateClosedSemesterAsync();
        await using var db = fixture.Db;
        db.WeeklyReports.Add(new WeeklyReport
        {
            InternshipId = fixture.InternshipId,
            Title = "Báo cáo tuần",
            Content = "Nội dung"
        });

        var save = () => db.SaveChangesAsync();

        await save.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage(SemesterWritePolicy.LockedMessage);
    }

    [Fact]
    public async Task SaveChangesAsync_ShouldRejectSubmissionsInClosedSemester()
    {
        var fixture = await CreateClosedSemesterAsync();
        await using var db = fixture.Db;
        db.Submissions.Add(new Submission { InternshipId = fixture.InternshipId });

        var save = () => db.SaveChangesAsync();

        await save.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage(SemesterWritePolicy.LockedMessage);
    }

    [Fact]
    public async Task SaveChangesAsync_ShouldRejectScheduleChangesInClosedSemester()
    {
        var fixture = await CreateClosedSemesterAsync();
        await using var db = fixture.Db;
        db.SemesterReportSchedules.Add(new SemesterReportSchedule
        {
            SemesterId = fixture.SemesterId,
            WeekNumber = 1,
            Title = "Báo cáo tuần 1",
            DueDate = DateTime.UtcNow.AddDays(7)
        });

        var save = () => db.SaveChangesAsync();

        await save.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage(SemesterWritePolicy.LockedMessage);
    }

    [Fact]
    public async Task SaveChangesAsync_ShouldRejectAttendanceChangesInClosedSemester()
    {
        var fixture = await CreateClosedSemesterAsync();
        await using var db = fixture.Db;
        db.AttendanceSessions.Add(new AttendanceSession
        {
            SemesterId = fixture.SemesterId,
            LecturerId = Guid.NewGuid(),
            WeekNumber = 1,
            Title = "Buổi hướng dẫn",
            MeetingDate = DateTime.UtcNow
        });

        var save = () => db.SaveChangesAsync();

        await save.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage(SemesterWritePolicy.LockedMessage);
    }

    [Fact]
    public async Task SaveChangesAsync_ShouldRejectRubricChangesInClosedSemester()
    {
        var fixture = await CreateClosedSemesterAsync();
        await using var db = fixture.Db;
        var rubric = await db.EvaluationRubrics.SingleAsync();
        rubric.Name = "Rubric đã sửa";

        var save = () => db.SaveChangesAsync();

        await save.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage(SemesterWritePolicy.LockedMessage);
    }

    [Fact]
    public async Task SaveChangesAsync_ShouldRejectRubricCriterionChangesInClosedSemester()
    {
        var fixture = await CreateClosedSemesterAsync();
        await using var db = fixture.Db;
        db.EvaluationRubricCriteria.Add(new EvaluationRubricCriterion
        {
            RubricId = fixture.RubricId,
            Name = "Tiêu chí",
            Weight = 100
        });

        var save = () => db.SaveChangesAsync();

        await save.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage(SemesterWritePolicy.LockedMessage);
    }

    private static async Task<ClosedSemesterFixture> CreateClosedSemesterAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new AppDbContext(options);
        var semester = new Semester
        {
            Name = "Học kỳ kiểm thử",
            Term = "Học kỳ I",
            AcademicYear = "2025 - 2026",
            Status = SemesterStatus.Active
        };
        var student = new Student { StudentCode = "SV001", FullName = "Sinh viên kiểm thử" };
        var internship = new Internship
        {
            StudentId = student.PublicId,
            Student = student,
            SemesterId = semester.PublicId
        };
        var rubric = new EvaluationRubric
        {
            SemesterId = semester.PublicId,
            Name = "Rubric kiểm thử"
        };
        db.AddRange(semester, student, internship, rubric);
        await db.SaveChangesAsync();

        semester.Status = SemesterStatus.Completed;
        await db.SaveChangesAsync();

        return new ClosedSemesterFixture(db, semester.PublicId, internship.PublicId, rubric.PublicId);
    }

    private sealed record ClosedSemesterFixture(
        AppDbContext Db,
        Guid SemesterId,
        Guid InternshipId,
        Guid RubricId);
}
