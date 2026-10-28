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
        var unassignedStudent = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "SV004",
            FullName = "Nguyễn Văn E",
            Class = "C23A.TH1",
            Department = studentDepartment,
        };
        var unregisteredStudent = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "SV005",
            FullName = "Võ Thị F",
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
        var unassignedInternship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = unassignedStudent.Id,
            Student = unassignedStudent,
            CompanyId = null,
            LecturerId = lecturer.Id,
            Lecturer = lecturer,
            SemesterId = semester.Id,
            Status = InternshipStatus.NotStarted,
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
        await db.Students.AddRangeAsync(completedStudent, incompleteStudent, unassignedStudent, unregisteredStudent, otherDeptStudent);
        await db.Internships.AddRangeAsync(completedInternship, incompleteInternship, unassignedInternship, otherDeptInternship);
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

        // Placeholder mẫu {KEY} được điền
        text.Should().Contain("01/09/2025");
        text.Should().Contain("15/12/2025");
        text.Should().NotContain("{SO_DOANH_NGHIEP}");
        text.Should().NotContain("{SO_SV_DANG_KY}");
        text.Should().NotContain("{SL_XUAT_SAC}");
        text.Should().Contain("4 sinh viên"); // SO_SV_DANG_KY
        text.Should().Contain("1 đơn vị"); // SO_DOANH_NGHIEP
        text.Should().Contain("Không hoàn thành");
        text.Should().Contain("Chưa xếp loại");
        text.Should().Contain("Không thực tập");

        var statsTable = doc.MainDocumentPart.Document.Body!.Descendants<Table>()
            .First(table => table.InnerText.Contains("Xuất sắc") && table.InnerText.Contains("TỔNG"));
        var statusCounts = statsTable.Descendants<TableRow>()
            .Select(row => row.Descendants<TableCell>().Select(cell => cell.InnerText).ToList())
            .Where(cells => cells.Count >= 3)
            .ToDictionary(cells => cells[0].Trim(), cells => cells[1].Trim());
        statusCounts["Không hoàn thành"].Should().Be("2");
        statusCounts["Chưa xếp loại"].Should().Be("1");
        statusCounts["Không thực tập"].Should().Be("2");
        statusCounts["TỔNG"].Should().Be("5");

        // Bảng SV không hoàn thành dùng một cột họ tên đầy đủ.
        text.Should().Contain("SV002");
        text.Should().Contain("Lê Thị C");
        text.Should().Contain("C23A.TH1");
        text.Should().NotContain("{#ds_khong_hoan_thanh}");
        text.Should().NotContain("{stt}");
        text.Should().NotContain("{mssv}");

        var incompleteTable = doc.MainDocumentPart.Document.Body!.Descendants<Table>()
            .First(table => table.InnerText.Contains("SV002"));
        incompleteTable.Descendants<TableRow>().First().InnerText.Should().Contain("Họ và tên");
        var studentRow = incompleteTable.Descendants<TableRow>()
            .First(row => row.InnerText.Contains("SV002"));
        studentRow.Elements<TableCell>().Should().HaveCount(5);
        studentRow.Elements<TableCell>().ElementAt(2).InnerText.Should().Contain("Lê Thị C");
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
        text.Should().Contain("Lê Thị");
        text.Should().NotContain("SV003");
        text.Should().NotContain("Phạm Văn");
        text.Should().NotContain("QTKD01");
    }

    [Fact]
    public async Task ExportC22AWordReportAsync_ShouldUseCustomSectionTitlesAndAdditionalSections()
    {
        var (db, semesterId) = await SeedAsync();
        const string prefix = "__INTERNLINK_REPORT_SECTIONS_V1__";
        var sections = """
            [
              { "id": "section-1", "title": "I. KẾT QUẢ TRIỂN KHAI", "content": "Nội dung kết quả." },
              { "id": "section-2", "title": "II. KHÓ KHĂN VÀ KIẾN NGHỊ", "content": "Nội dung kiến nghị." },
              { "id": "section-3", "title": "III. ĐỊNH HƯỚNG KỲ TỚI", "content": "Nội dung định hướng." }
            ]
            """;
        await db.Set<SemesterFacultySummary>().AddAsync(new SemesterFacultySummary
        {
            Id = Guid.NewGuid(),
            SemesterId = semesterId,
            Results = prefix + sections,
        });
        await db.SaveChangesAsync();

        var service = new InternshipReportService(db);
        var bytes = await service.ExportC22AWordReportAsync(semesterId);

        using var ms = new MemoryStream(bytes);
        using var doc = WordprocessingDocument.Open(ms, false);
        var paragraphs = doc.MainDocumentPart!.Document.Body!.Descendants<Paragraph>()
            .Select(paragraph => paragraph.InnerText)
            .ToList();
        paragraphs.Should().Contain("I. KẾT QUẢ TRIỂN KHAI");
        paragraphs.Should().Contain("II. KHÓ KHĂN VÀ KIẾN NGHỊ");
        paragraphs.Should().Contain(paragraph => paragraph.Contains("III. ĐỊNH HƯỚNG KỲ TỚI")
            && paragraph.Contains("Nội dung định hướng."));
        paragraphs.Should().Contain(paragraph => paragraph.Contains("Nội dung kết quả."));
        paragraphs.Should().Contain(paragraph => paragraph.Contains("Nội dung kiến nghị."));
    }
}
