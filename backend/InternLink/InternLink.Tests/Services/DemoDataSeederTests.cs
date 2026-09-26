using FluentAssertions;
using InternLink.Domain.Entities;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternLink.Tests.Services;

public class DemoDataSeederTests
{
    private static AppDbContext GetDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task SeedAsync_ShouldCreateLecturerLoginAccounts()
    {
        using var db = GetDb();
        await SeedAsync(db);

        var lecturerUsers = db.Users.Where(u => u.Role == Domain.Enums.Role.Lecturer).ToList();
        lecturerUsers.Should().NotBeEmpty("demo lecturers must be able to log in");
        lecturerUsers.Should().OnlyContain(u => !u.MustChangePassword, "demo accounts must not force password change");
        lecturerUsers.Should().OnlyContain(u => !string.IsNullOrEmpty(u.PasswordHash));

        var lecturerUserIds = lecturerUsers.Select(u => u.Id).ToList();
        var lecturerProfiles = db.Lecturers.Where(l => l.UserId != null && lecturerUserIds.Contains(l.UserId.Value)).ToList();
        lecturerProfiles.Should().HaveCount(lecturerUsers.Count, "each lecturer user links to a Lecturer profile");
    }

    [Fact]
    public async Task SeedAsync_ShouldSeedWeeklyReportsAndGradedEvaluation()
    {
        using var db = GetDb();
        await SeedAsync(db);

        var internships = db.Internships.Where(i => !i.IsDeleted).ToList();
        internships.Should().NotBeEmpty();

        var weeklyReports = db.WeeklyReports.Where(r => !r.IsDeleted).ToList();
        // SV đầu nộp đủ 5 tuần (approved); SV khác nộp 2 tuần (T2 chờ duyệt để GV demo duyệt live).
        weeklyReports.Should().HaveCount(5 + (internships.Count - 1) * 2);
        weeklyReports.Should().Contain(r => r.Status == Domain.Enums.WeeklyReportStatus.Approved);
        weeklyReports.Should().Contain(r => r.Status == Domain.Enums.WeeklyReportStatus.Submitted);
        weeklyReports.Where(r => r.Status == Domain.Enums.WeeklyReportStatus.Submitted)
            .Should().OnlyContain(r => r.LecturerComment == null, "reports awaiting review must not have lecturer comments");

        var evaluations = db.Evaluations.Where(e => !e.IsDeleted).ToList();
        evaluations.Should().HaveCount(1, "one graded demo evaluation");
        evaluations[0].IsFinalized.Should().BeTrue();
        evaluations[0].OralExamScore.Should().NotBeNull();
        evaluations[0].EvaluatedById.Should().NotBeNull();

        var gradedInternship = internships.Single(i => i.Id == evaluations[0].InternshipId);
        gradedInternship.Status.Should().Be(Domain.Enums.InternshipStatus.Graded);
    }

    [Fact]
    public async Task SeedAsync_ShouldSeedReportSchedule_ScenarioT1ToT5Open_T6Closed_T7Final()
    {
        using var db = GetDb();
        await SeedAsync(db);

        var semester = db.Semesters.First(s => s.Status == Domain.Enums.SemesterStatus.Active);
        semester.TotalWeeks.Should().BeGreaterThan(0);

        var schedules = db.SemesterReportSchedules
            .Where(s => s.SemesterId == semester.Id && !s.IsDeleted)
            .OrderBy(s => s.WeekNumber)
            .ToList();
        schedules.Should().HaveCount(semester.TotalWeeks + 1, "T1..TotalWeeks + final report week");
        schedules.Last().WeekNumber.Should().Be(semester.TotalWeeks + 1);
        schedules.Last().Title.Should().Contain("cuối kỳ");

        var openWeekly = schedules.Where(s => s.WeekNumber >= 1 && s.WeekNumber <= semester.TotalWeeks && s.IsSubmissionOpen).ToList();
        openWeekly.Should().HaveCount(semester.TotalWeeks - 1, "T6 (bảo vệ/thi) phải tắt, còn lại mở");

        // Deadline phải ở tương lai để demo nộp bài live không báo trễ.
        schedules.Where(s => s.IsSubmissionOpen)
            .Should().OnlyContain(s => s.DueDate > DateTime.UtcNow);
    }

    [Fact]
    public async Task SeedAsync_ShouldBeIdempotent()
    {
        using var db = GetDb();
        await SeedAsync(db);
        var usersBefore = db.Users.Count();
        var reportsBefore = db.WeeklyReports.Count();

        await SeedAsync(db);

        db.Users.Count().Should().Be(usersBefore);
        db.WeeklyReports.Count().Should().Be(reportsBefore);
    }

    private static async Task SeedAsync(AppDbContext db)
    {
        // Departments + active semester are prerequisites for the demo seeder.
        var dept = new Department { Id = Guid.NewGuid(), Code = "CNTT", Name = "Công nghệ thông tin", IsActive = true };
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Thực tập Tốt nghiệp CNTT",
            Term = "HK1",
            AcademicYear = "2026-2027",
            StartDate = DateTime.UtcNow.AddMonths(-2),
            EndDate = DateTime.UtcNow.AddMonths(2),
            Status = Domain.Enums.SemesterStatus.Active,
            DepartmentId = dept.Id,
        };
        db.Departments.Add(dept);
        db.Semesters.Add(semester);
        await db.SaveChangesAsync();

        var hasher = new PasswordHasher<User>();
        await DemoDataSeeder.SeedAsync(db, hasher);
    }
}
