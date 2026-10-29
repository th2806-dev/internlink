using System.IO.Compression;
using System.Text;
using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace InternLink.Tests.Services;

public class WeeklyReportArchiveServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetStudentsAsync_ReturnsOnlyStudentsInDepartmentAndSemester()
    {
        await using var db = CreateDb();
        var departmentId = Guid.NewGuid();
        var otherDepartmentId = Guid.NewGuid();
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            DepartmentId = departmentId,
            Name = "HK1",
            Term = "HK1",
            AcademicYear = "2026-2027",
        };
        var ownStudent = new Student { Id = Guid.NewGuid(), DepartmentId = departmentId, StudentCode = "SV001", FullName = "Student A" };
        var otherStudent = new Student { Id = Guid.NewGuid(), DepartmentId = otherDepartmentId, StudentCode = "SV999", FullName = "Student B" };
        var ownInternship = new Internship { Id = Guid.NewGuid(), SemesterId = semester.Id, StudentId = ownStudent.Id };
        var otherInternship = new Internship { Id = Guid.NewGuid(), SemesterId = semester.Id, StudentId = otherStudent.Id };
        db.Semesters.Add(semester);
        db.Students.AddRange(ownStudent, otherStudent);
        db.Internships.AddRange(ownInternship, otherInternship);
        db.WeeklyReports.AddRange(
            new WeeklyReport { Id = Guid.NewGuid(), InternshipId = ownInternship.Id, WeekNumber = 1, Title = "Week 1", Content = "Report A", Status = WeeklyReportStatus.Approved },
            new WeeklyReport { Id = Guid.NewGuid(), InternshipId = otherInternship.Id, WeekNumber = 1, Title = "Week 1", Content = "Report B", Status = WeeklyReportStatus.Approved });
        await db.SaveChangesAsync();

        var service = new WeeklyReportArchiveService(
            db,
            Mock.Of<IWeeklyReportService>(),
            Mock.Of<ISubmissionService>());
        var students = await service.GetStudentsAsync(semester.Id, departmentId);

        students.Should().ContainSingle();
        students![0].StudentCode.Should().Be("SV001");
        students[0].ReportCount.Should().Be(1);
    }

    [Fact]
    public async Task CreateZipAsync_ContainsOnlyDepartmentReportsInStudentFolders()
    {
        await using var db = CreateDb();
        var departmentId = Guid.NewGuid();
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            DepartmentId = departmentId,
            Name = "HK1 2026",
            Term = "HK1",
            AcademicYear = "2026-2027",
        };
        var ownStudent = new Student { Id = Guid.NewGuid(), DepartmentId = departmentId, StudentCode = "SV001", FullName = "Student A" };
        var otherStudent = new Student { Id = Guid.NewGuid(), DepartmentId = Guid.NewGuid(), StudentCode = "SV999", FullName = "Student B" };
        var ownInternship = new Internship { Id = Guid.NewGuid(), SemesterId = semester.Id, StudentId = ownStudent.Id };
        var otherInternship = new Internship { Id = Guid.NewGuid(), SemesterId = semester.Id, StudentId = otherStudent.Id };
        db.Semesters.Add(semester);
        db.Students.AddRange(ownStudent, otherStudent);
        db.Internships.AddRange(ownInternship, otherInternship);
        db.WeeklyReports.AddRange(
            new WeeklyReport { Id = Guid.NewGuid(), InternshipId = ownInternship.Id, WeekNumber = 2, Version = 1, Title = "Week 2", Content = "own report" },
            new WeeklyReport { Id = Guid.NewGuid(), InternshipId = otherInternship.Id, WeekNumber = 2, Version = 1, Title = "Week 2", Content = "other report" });
        await db.SaveChangesAsync();

        var service = new WeeklyReportArchiveService(
            db,
            Mock.Of<IWeeklyReportService>(),
            Mock.Of<ISubmissionService>());
        var zip = await service.CreateZipAsync(semester.Id, departmentId, Guid.NewGuid());

        zip.Should().NotBeNull();
        using var input = new MemoryStream(zip!.Content);
        using var archive = new ZipArchive(input, ZipArchiveMode.Read);
        archive.Entries.Should().ContainSingle();
        archive.Entries[0].FullName.Should().StartWith("SV001_Student A/BaoCaoTuan/Tuan02_V01_");
        using var reader = new StreamReader(archive.Entries[0].Open(), Encoding.UTF8);
        (await reader.ReadToEndAsync()).Should().Be("own report");

        var studentZip = await service.CreateZipAsync(semester.Id, departmentId, Guid.NewGuid(), ownStudent.Id);
        studentZip.Should().NotBeNull();
        studentZip!.FileName.Should().StartWith("SV001_ho-so_");
        using var studentInput = new MemoryStream(studentZip.Content);
        using var studentArchive = new ZipArchive(studentInput, ZipArchiveMode.Read);
        studentArchive.Entries.Should().ContainSingle();
        studentArchive.Entries[0].FullName.Should().StartWith("SV001_Student A/");
    }

    [Fact]
    public async Task GetStudentsAsync_ReturnsNullForSemesterOutsideDepartmentScope()
    {
        await using var db = CreateDb();
        db.Semesters.Add(new Semester
        {
            Id = Guid.NewGuid(),
            DepartmentId = Guid.NewGuid(),
            Name = "Other faculty semester",
            Term = "HK1",
            AcademicYear = "2026-2027",
        });
        await db.SaveChangesAsync();

        var service = new WeeklyReportArchiveService(
            db,
            Mock.Of<IWeeklyReportService>(),
            Mock.Of<ISubmissionService>());
        var result = await service.GetStudentsAsync(db.Semesters.Single().Id, Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetStudentsAsync_IncludesSubmissionFilesAndArchiveSummary()
    {
        await using var db = CreateDb();
        var departmentId = Guid.NewGuid();
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            DepartmentId = departmentId,
            Name = "HK1",
            Term = "HK1",
            AcademicYear = "2026-2027",
        };
        var student = new Student
        {
            Id = Guid.NewGuid(),
            DepartmentId = departmentId,
            StudentCode = "SV001",
            FullName = "Student A",
        };
        var internship = new Internship { Id = Guid.NewGuid(), SemesterId = semester.Id, StudentId = student.Id };
        var finalReport = new Submission
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            Type = SubmissionType.FinalReport,
            Status = SubmissionStatus.Approved,
            Title = "Báo cáo cuối kỳ",
        };
        finalReport.Assets.Add(new SubmissionAsset
        {
            Id = Guid.NewGuid(),
            SubmissionId = finalReport.Id,
            AssetType = "file",
            FileName = "final.pdf",
            FileUrl = "uploads/final.pdf",
            FileSize = 512,
        });
        db.Semesters.Add(semester);
        db.Students.Add(student);
        db.Internships.Add(internship);
        db.Submissions.Add(finalReport);
        db.WeeklyReports.Add(new WeeklyReport
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            WeekNumber = 3,
            Title = "Tuần 3",
            Content = "Nội dung",
            Status = WeeklyReportStatus.Approved,
            SubmittedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var service = new WeeklyReportArchiveService(
            db,
            Mock.Of<IWeeklyReportService>(),
            Mock.Of<ISubmissionService>());
        var students = await service.GetStudentsAsync(semester.Id, departmentId);

        students.Should().ContainSingle();
        students![0].InternshipId.Should().Be(internship.Id);
        students[0].WeeklyReportCount.Should().Be(1);
        students[0].HasFinalReport.Should().BeTrue();
        students[0].TotalFilesCount.Should().Be(2);
        students[0].Documents.Should().Contain(document =>
            document.DocumentType == "FinalReport" && document.FileName == "final.pdf"
            && document.SubmissionId == finalReport.Id && document.AssetId == finalReport.Assets.Single().Id);
    }

    [Fact]
    public async Task CreateZipAsync_FiltersByDocumentTypeAndIncludesSubmissionAssets()
    {
        await using var db = CreateDb();
        var departmentId = Guid.NewGuid();
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            DepartmentId = departmentId,
            Name = "HK1",
            Term = "HK1",
            AcademicYear = "2026-2027",
        };
        var student = new Student
        {
            Id = Guid.NewGuid(),
            DepartmentId = departmentId,
            StudentCode = "SV001",
            FullName = "Student A",
        };
        var internship = new Internship { Id = Guid.NewGuid(), SemesterId = semester.Id, StudentId = student.Id };
        var finalReport = new Submission
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            Type = SubmissionType.FinalReport,
            FileName = "final.pdf",
            FileUrl = "uploads/final.pdf",
        };
        db.Semesters.Add(semester);
        db.Students.Add(student);
        db.Internships.Add(internship);
        db.Submissions.Add(finalReport);
        db.WeeklyReports.Add(new WeeklyReport
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            WeekNumber = 1,
            Title = "Tuần 1",
            Content = "Nội dung",
        });
        await db.SaveChangesAsync();

        var submissionService = new Mock<ISubmissionService>();
        submissionService
            .Setup(service => service.DownloadFileAsync(finalReport.Id, It.IsAny<Guid>(), true))
            .ReturnsAsync(new SubmissionFileDownloadDto
            {
                FileContent = Encoding.UTF8.GetBytes("final"),
                FileName = "final.pdf",
            });
        var service = new WeeklyReportArchiveService(db, Mock.Of<IWeeklyReportService>(), submissionService.Object);

        var zip = await service.CreateZipAsync(semester.Id, departmentId, Guid.NewGuid(), documentType: "final");

        zip.Should().NotBeNull();
        using var input = new MemoryStream(zip!.Content);
        using var archive = new ZipArchive(input, ZipArchiveMode.Read);
        archive.Entries.Should().ContainSingle();
        archive.Entries[0].FullName.Should().Contain("BaoCaoCuoiKy/V01_final.pdf");
    }
}