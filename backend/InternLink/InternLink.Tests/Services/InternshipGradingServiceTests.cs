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
}