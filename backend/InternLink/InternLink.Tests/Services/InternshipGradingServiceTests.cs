using FluentAssertions;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace InternLink.Tests.Services;

public sealed class InternshipGradingServiceTests
{
    [Fact]
    public async Task GetSummaryAsync_ReturnsEmployerScoreAndProofWithoutChangingProcessScore()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        await using var db = new AppDbContext(options);

        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Kỳ kiểm thử",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            TotalWeeks = 1,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(30),
            CreatedAt = DateTime.UtcNow,
        };
        var student = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "P4-001",
            FullName = "Sinh viên kiểm thử",
            CreatedAt = DateTime.UtcNow,
        };
        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            Semester = semester,
            StudentId = student.Id,
            Student = student,
            Status = InternshipStatus.InProgress,
            CreatedAt = DateTime.UtcNow,
        };
        var evidence = new Submission
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            Internship = internship,
            Type = SubmissionType.Evidence,
            Status = SubmissionStatus.Submitted,
            EmployerScore = 8.5m,
            SubmittedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
        };
        var proof = new SubmissionAsset
        {
            Id = Guid.NewGuid(),
            SubmissionId = evidence.Id,
            Submission = evidence,
            FileName = "Phieu-danh-gia.jpg",
            FileUrl = "uploads/submissions/p4/proof.jpg",
            AssetType = "file",
            UploadedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
        };

        db.Semesters.Add(semester);
        db.Students.Add(student);
        db.Internships.Add(internship);
        db.SemesterReportSchedules.Add(new SemesterReportSchedule
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            WeekNumber = 1,
            Title = "Báo cáo tuần 1",
            StartDate = DateTime.UtcNow.Date,
            DueDate = DateTime.UtcNow.AddDays(7),
            IsSubmissionOpen = true,
            CreatedAt = DateTime.UtcNow,
        });
        db.Submissions.Add(evidence);
        db.SubmissionAssets.Add(proof);
        await db.SaveChangesAsync();

        var service = new InternshipGradingService(
            db,
            NullLogger<InternshipGradingService>.Instance,
            new SemesterService(db));

        var result = await service.GetSummaryAsync(semester.Id, lecturerId: null, departmentId: null);
        var grade = result.Students.Should().ContainSingle().Subject;

        grade.EmployerScore.Should().Be(8.5m);
        grade.EmployerEvidenceSubmissionId.Should().Be(evidence.Id);
        grade.EmployerEvidenceAssetId.Should().Be(proof.Id);
        grade.EmployerEvidenceFileName.Should().Be("Phieu-danh-gia.jpg");
        grade.ProcessScore.Should().Be(0m);
    }

    [Fact]
    public async Task GetSummaryAsync_UsesOnlyTheStudentsAttendanceRecords()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        await using var db = new AppDbContext(options);

        var now = DateTime.UtcNow;
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Kỳ kiểm thử điểm danh",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            TotalWeeks = 4,
            StartDate = now.Date,
            EndDate = now.Date.AddDays(30),
            CreatedAt = now,
        };
        var student = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "P4-002",
            FullName = "Sinh viên kiểm thử điểm danh",
            CreatedAt = now,
        };
        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            Semester = semester,
            StudentId = student.Id,
            Student = student,
            Status = InternshipStatus.InProgress,
            CreatedAt = now,
        };
        var absentSession = new AttendanceSession
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            Semester = semester,
            LecturerId = Guid.NewGuid(),
            WeekNumber = 1,
            Title = "Buổi tuần 1",
            MeetingDate = now,
            Status = AttendanceSessionStatus.Completed,
            CreatedAt = now,
        };
        var sessionWithoutStudentRecord = new AttendanceSession
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            Semester = semester,
            LecturerId = Guid.NewGuid(),
            WeekNumber = 2,
            Title = "Buổi tuần 2",
            MeetingDate = now.AddDays(7),
            Status = AttendanceSessionStatus.Completed,
            CreatedAt = now,
        };
        var generalSession = new AttendanceSession
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            Semester = semester,
            LecturerId = Guid.NewGuid(),
            WeekNumber = 2,
            Title = "Buổi hướng dẫn chung tuần 2",
            MeetingDate = now.AddDays(7),
            Status = AttendanceSessionStatus.Completed,
            IsGeneralSession = true,
            CreatedAt = now,
        };
        generalSession.Records.Add(new AttendanceRecord
        {
            Id = Guid.NewGuid(),
            AttendanceSessionId = generalSession.Id,
            AttendanceSession = generalSession,
            StudentId = student.Id,
            Student = student,
            InternshipId = internship.Id,
            Internship = internship,
            Status = AttendanceStatus.Present,
            MarkedAt = now,
            CreatedAt = now,
        });
        var unmarkedSession = new AttendanceSession
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            Semester = semester,
            LecturerId = Guid.NewGuid(),
            WeekNumber = 4,
            Title = "Buổi chưa điểm danh",
            MeetingDate = now.AddDays(14),
            Status = AttendanceSessionStatus.Scheduled,
            CreatedAt = now,
        };
        absentSession.Records.Add(new AttendanceRecord
        {
            Id = Guid.NewGuid(),
            AttendanceSessionId = absentSession.Id,
            AttendanceSession = absentSession,
            StudentId = student.Id,
            Student = student,
            InternshipId = internship.Id,
            Internship = internship,
            Status = AttendanceStatus.Absent,
            MarkedAt = now,
            CreatedAt = now,
        });
        unmarkedSession.Records.Add(new AttendanceRecord
        {
            Id = Guid.NewGuid(),
            AttendanceSessionId = unmarkedSession.Id,
            AttendanceSession = unmarkedSession,
            StudentId = student.Id,
            Student = student,
            InternshipId = internship.Id,
            Internship = internship,
            Status = AttendanceStatus.Present,
            CreatedAt = now,
        });

        db.Semesters.Add(semester);
        db.Students.Add(student);
        db.Internships.Add(internship);
        db.AttendanceSessions.AddRange(absentSession, sessionWithoutStudentRecord, generalSession, unmarkedSession);
        for (var week = 1; week <= 4; week++)
        {
            db.SemesterReportSchedules.Add(new SemesterReportSchedule
            {
                Id = Guid.NewGuid(),
                SemesterId = semester.Id,
                WeekNumber = week,
                Title = $"Báo cáo tuần {week}",
                StartDate = now.Date.AddDays((week - 1) * 7),
                DueDate = now.AddDays(week * 7),
                IsSubmissionOpen = week != 2,
                CreatedAt = now,
            });
        }
        await db.SaveChangesAsync();

        var service = new InternshipGradingService(
            db,
            NullLogger<InternshipGradingService>.Instance,
            new SemesterService(db));

        var result = await service.GetSummaryAsync(semester.Id, lecturerId: null, departmentId: null);
        var grade = result.Students.Should().ContainSingle().Subject;

        grade.Weeks.Select(week => week.AttendanceStatus).Should().Equal("absent", "present", "no_session", "no_session");
        grade.Weeks[1].IsSubmissionOpen.Should().BeFalse();
        grade.Weeks[1].IsAttendanceAbsent.Should().BeFalse();
        grade.AbsentCount.Should().Be(1);
    }
}