using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using FluentAssertions;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternLink.Tests.Services;

public class InternshipReportServiceTests
{
    private static AppDbContext GetDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<(AppDbContext db, Guid semesterId)> SeedAsync(
        string studentDepartment = "CNTT",
        string lecturerDepartment = "CNTT")
    {
        var db = GetDb();
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "HK 1 2025-2026",
            Term = "HK1",
            AcademicYear = "2025-2026",
            StartDate = new DateTime(2025, 9, 1),
            EndDate = new DateTime(2025, 12, 15),
        };
        var company = new Company
        {
            Id = Guid.NewGuid(),
            CompanyName = "FPT Software",
            IsActive = true,
        };
        var lecturer = new Lecturer
        {
            Id = Guid.NewGuid(),
            StaffCode = "GV001",
            FullName = "TS. Nguyễn Văn A",
            Department = lecturerDepartment,
        };
        var completedStudent = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "SV001",
            FullName = "Trần Văn B",
            Class = "C23A.TH1",
            Department = studentDepartment,
        };
        var incompleteStudent = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "SV002",
            FullName = "Lê Thị C",
            Class = "C23A.TH1",
            Department = studentDepartment,
        };
        var otherDeptStudent = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "SV003",
            FullName = "Phạm Văn D",
            Class = "QTKD01",
            Department = "QTKD",
        };

        var completedInternship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = completedStudent.Id,
            Student = completedStudent,
            CompanyId = company.Id,
            Company = company,
            LecturerId = lecturer.Id,
            Lecturer = lecturer,
            SemesterId = semester.Id,
            Status = InternshipStatus.Graded,
        };
        var incompleteInternship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = incompleteStudent.Id,
            Student = incompleteStudent,
            CompanyId = company.Id,
            Company = company,
            LecturerId = lecturer.Id,
            Lecturer = lecturer,
            SemesterId = semester.Id,
            Status = InternshipStatus.InProgress,
        };
        var otherDeptInternship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = otherDeptStudent.Id,
            Student = otherDeptStudent,
            CompanyId = company.Id,
            Company = company,
            LecturerId = lecturer.Id,
            Lecturer = lecturer,
            SemesterId = semester.Id,
            Status = InternshipStatus.InProgress,
        };

        await db.Semesters.AddAsync(semester);
        await db.Companies.AddAsync(company);
        await db.Lecturers.AddAsync(lecturer);
        await db.Students.AddRangeAsync(completedStudent, incompleteStudent, otherDeptStudent);
        await db.Internships.AddRangeAsync(completedInternship, incompleteInternship, otherDeptInternship);
        await db.Evaluations.AddAsync(new Evaluation
        {
            Id = Guid.NewGuid(),
            InternshipId = completedInternship.Id,
            TechnicalScore = 9,
            CommunicationScore = 9,
            TeamworkScore = 9,
            InitiativeScore = 9,
            FinalGrade = 9.2m,
            IsFinalized = true,
        });
        await db.SaveChangesAsync();
        return (db, semester.Id);
    }

    [Fact]
    public async Task ExportC22AWordReportAsync_ShouldPopulateStatisticsAndIncompleteTable()
    {
        var (db, semesterId) = await SeedAsync();
        var service = new InternshipReportService(db);

        var bytes = await service.ExportC22AWordReportAsync(semesterId);

        bytes.Should().NotBeNullOrEmpty();
        using var ms = new MemoryStream(bytes);
        using var doc = WordprocessingDocument.Open(ms, false);
        doc.MainDocumentPart.Should().NotBeNull();
        var text = doc.MainDocumentPart!.Document.Body!.InnerText;
        text.Should().Contain("SV002");
        text.Should().Contain("Lê Thị C");
    }

    [Fact]
    public async Task ExportC22AWordReportAsync_WithDepartmentFilter_ShouldFilterCorrectly()
    {
        var (db, semesterId) = await SeedAsync();
        var service = new InternshipReportService(db);

        var bytes = await service.ExportC22AWordReportAsync(semesterId, "CNTT");

        bytes.Should().NotBeNullOrEmpty();
        using var ms = new MemoryStream(bytes);
        using var doc = WordprocessingDocument.Open(ms, false);
        var text = doc.MainDocumentPart!.Document.Body!.InnerText;
        text.Should().Contain("SV002");
        text.Should().NotContain("SV003");
        text.Should().NotContain("Phạm Văn D");
    }
}
