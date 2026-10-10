using FluentAssertions;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Tests.Services;

public class LecturerParticipationHistoryServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetSemesterHistoryAsync_ReturnsOnlyScopedEventsAndStoredResults()
    {
        await using var db = CreateDb();
        var lecturerId = Guid.NewGuid();
        var semester = new Semester { Id = Guid.NewGuid(), Name = "HK1", Term = "HK1", AcademicYear = "2026-2027" };
        var otherSemester = new Semester { Id = Guid.NewGuid(), Name = "HK2", Term = "HK2", AcademicYear = "2026-2027" };
        var student = new Student { Id = Guid.NewGuid(), StudentCode = "SV001", FullName = "Nguyen Van A", Class = "CTK45" };
        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            SemesterId = semester.Id,
            LecturerId = lecturerId,
        };
        var report = new WeeklyReport
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            WeekNumber = 1,
            Title = "Tuần 1",
            Content = "Đã hoàn thành",
            Status = WeeklyReportStatus.Reviewed,
            SubmittedAt = DateTime.UtcNow.AddDays(-3),
        };
        var feedback = new Feedback
        {
            Id = Guid.NewGuid(),
            WeeklyReportId = report.Id,
            LecturerId = lecturerId,
            Comment = "Tiến độ tốt",
            CreatedAt = DateTime.UtcNow.AddDays(-2),
        };
        var reviewedWithoutComment = new WeeklyReport
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            WeekNumber = 2,
            Title = "Tuần 2",
            Content = "Đã hoàn thành",
            Status = WeeklyReportStatus.Approved,
            SubmittedAt = DateTime.UtcNow.AddDays(-1),
        };
        db.Semesters.AddRange(semester, otherSemester);
        db.Students.Add(student);
        db.Internships.Add(internship);
        db.WeeklyReports.AddRange(report, reviewedWithoutComment);
        db.Feedbacks.Add(feedback);
        db.Evaluations.Add(new Evaluation
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            FinalGrade = 8.5m,
            IsFinalized = true,
        });
        db.LecturerActivityLogs.AddRange(
            new LecturerActivityLog
            {
                Id = Guid.NewGuid(),
                LecturerId = lecturerId,
                SemesterId = semester.Id,
                InternshipId = internship.Id,
                StudentId = student.Id,
                StudentName = student.FullName,
                ActivityType = "attendance-marked",
                Title = "Điểm danh tuần 1",
                OccurredAt = DateTime.UtcNow.AddDays(-1),
            },
            new LecturerActivityLog
            {
                Id = Guid.NewGuid(),
                LecturerId = lecturerId,
                SemesterId = semester.Id,
                InternshipId = internship.Id,
                RelatedEntityId = reviewedWithoutComment.Id,
                StudentId = student.Id,
                StudentName = student.FullName,
                ActivityType = "weekly-report-review",
                Title = "Phản hồi báo cáo tuần 2",
                OccurredAt = DateTime.UtcNow.AddHours(-12),
            },
            new LecturerActivityLog
            {
                Id = Guid.NewGuid(),
                LecturerId = lecturerId,
                SemesterId = otherSemester.Id,
                ActivityType = "attendance-marked",
                Title = "Không thuộc kỳ đang xem",
                OccurredAt = DateTime.UtcNow,
            });
        await db.SaveChangesAsync();

        var history = await new LecturerParticipationHistoryService(db)
            .GetSemesterHistoryAsync(lecturerId, semester.Id);

        history.Should().NotBeNull();
        history!.Students.Should().ContainSingle();
        history.Students[0].StudentCode.Should().Be("SV001");
        history.Students[0].ReviewedReportCount.Should().Be(2);
        history.Students[0].FinalGrade.Should().Be(8.5m);
        history.Students[0].IsFinalized.Should().BeTrue();
        history.Activities.Should().HaveCount(5);
        history.Activities.Should().Contain(item => item.ActivityType == "attendance-marked");
        history.Activities.Should().Contain(item => item.ActivityType == "weekly-report-submitted");
        history.Activities.Should().Contain(item => item.ActivityType == "weekly-report-review" && item.Title == "Phản hồi báo cáo tuần 2");
        history.Activities.Should().Contain(item => item.ActivityType == "weekly-report-feedback" && item.Detail == "Tiến độ tốt");
        history.Activities.Should().NotContain(item => item.Title == "Không thuộc kỳ đang xem");
    }

    [Fact]
    public async Task GetSemesterHistoryAsync_ReturnsNullWhenLecturerDidNotParticipate()
    {
        await using var db = CreateDb();
        var semester = new Semester { Id = Guid.NewGuid(), Name = "HK1", Term = "HK1", AcademicYear = "2026-2027" };
        db.Semesters.Add(semester);
        await db.SaveChangesAsync();

        var history = await new LecturerParticipationHistoryService(db)
            .GetSemesterHistoryAsync(Guid.NewGuid(), semester.Id);

        history.Should().BeNull();
    }

    [Fact]
    public async Task GetSemesterHistoryAsync_DoesNotListStudentsOutsideLecturerAssignmentEvenWhenActivityWasLogged()
    {
        await using var db = CreateDb();
        var lecturerId = Guid.NewGuid();
        var otherLecturerId = Guid.NewGuid();
        var semester = new Semester { Id = Guid.NewGuid(), Name = "HK1", Term = "HK1", AcademicYear = "2026-2027" };
        var assignedStudent = new Student { Id = Guid.NewGuid(), StudentCode = "SV001", FullName = "Sinh viên được phân công" };
        var otherStudent = new Student { Id = Guid.NewGuid(), StudentCode = "SV002", FullName = "Sinh viên của giảng viên khác" };
        var assignedInternship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = assignedStudent.Id,
            SemesterId = semester.Id,
            LecturerId = lecturerId,
        };
        var otherInternship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = otherStudent.Id,
            SemesterId = semester.Id,
            LecturerId = otherLecturerId,
        };
        db.Semesters.Add(semester);
        db.Students.AddRange(assignedStudent, otherStudent);
        db.Internships.AddRange(assignedInternship, otherInternship);
        db.LecturerActivityLogs.Add(new LecturerActivityLog
        {
            Id = Guid.NewGuid(),
            LecturerId = lecturerId,
            SemesterId = semester.Id,
            InternshipId = otherInternship.Id,
            StudentId = otherStudent.Id,
            StudentName = otherStudent.FullName,
            ActivityType = "weekly-report-review",
            Title = "Log cũ của sinh viên",
            OccurredAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var history = await new LecturerParticipationHistoryService(db)
            .GetSemesterHistoryAsync(lecturerId, semester.Id);

        history.Should().NotBeNull();
        history!.Students.Should().ContainSingle()
            .Which.StudentId.Should().Be(assignedStudent.Id);
        history.Activities.Should().ContainSingle()
            .Which.Title.Should().Be("Log cũ của sinh viên");
    }

    [Fact]
    public async Task GetSemesterHistoryAsync_UsesStoredLogToRetainHistoricalParticipation()
    {
        await using var db = CreateDb();
        var lecturerId = Guid.NewGuid();
        var semester = new Semester { Id = Guid.NewGuid(), Name = "HK cũ", Term = "HK1", AcademicYear = "2025-2026" };
        db.Semesters.Add(semester);
        db.LecturerActivityLogs.Add(new LecturerActivityLog
        {
            Id = Guid.NewGuid(),
            LecturerId = lecturerId,
            SemesterId = semester.Id,
            ActivityType = "guidance-session-scheduled",
            Title = "Buổi hướng dẫn đã lưu",
            OccurredAt = DateTime.UtcNow.AddYears(-1),
        });
        await db.SaveChangesAsync();

        var history = await new LecturerParticipationHistoryService(db)
            .GetSemesterHistoryAsync(lecturerId, semester.Id);

        history.Should().NotBeNull();
        history!.Students.Should().BeEmpty();
        history.Activities.Should().ContainSingle()
            .Which.Title.Should().Be("Buổi hướng dẫn đã lưu");
    }
}