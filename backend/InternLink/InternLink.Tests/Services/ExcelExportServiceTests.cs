using ClosedXML.Excel;
using FluentAssertions;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace InternLink.Tests.Services;

public class ExcelExportServiceTests
{
    private static AppDbContext GetDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static ExcelExportService CreateService(AppDbContext db)
    {
        var logger = Mock.Of<ILogger<ExcelExportService>>();
        return new ExcelExportService(db, logger);
    }

    [Fact]
    public async Task GetExportDataAsync_ZeroRecords_ShouldReturnEmptyDatasets()
    {
        var db = GetDb();
        var service = CreateService(db);

        var data = await service.GetExportDataAsync();

        data.Should().NotBeNull();
        data.Students.Should().BeEmpty();
        data.Companies.Should().BeEmpty();
        data.LecturerAssignments.Should().BeEmpty();
    }

    [Fact]
    public async Task GetExportDataAsync_WithRelationalData_ShouldCorrectlyJoinTables()
    {
        var db = GetDb();

        var semester = new Semester { Id = Guid.NewGuid(), Name = "HK 1 2026", Term = "HK1", AcademicYear = "2025-2026" };
        var company = new Company { Id = Guid.NewGuid(), CompanyName = "Công ty ABC", Address = "123 Đường XYZ", ContactPerson = "Anh A", ContactPhone = "0901234567", IsActive = true };
        var lecturer = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GV001", FullName = "TS. Nguyễn Văn B", Department = "CNTT" };
        var student = new Student { Id = Guid.NewGuid(), StudentCode = "SV001", FullName = "Trần Thị C", Class = "C23A.TH1" };

        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            Student = student,
            CompanyId = company.Id,
            Company = company,
            LecturerId = lecturer.Id,
            Lecturer = lecturer,
            SemesterId = semester.Id,
            Semester = semester,
            Status = InternshipStatus.InProgress,
            Notes = "Đang thực tập tốt"
        };

        var evaluation = new Evaluation
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            TechnicalScore = 9,
            CommunicationScore = 8,
            TeamworkScore = 8,
            InitiativeScore = 9,
            FinalGrade = 8.5m,
            IsFinalized = true
        };

        var report1 = new WeeklyReport
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            WeekNumber = 1,
            Title = "Báo cáo tuần 1",
            Content = "Nội dung tuần 1",
            Status = WeeklyReportStatus.Approved
        };

        await db.Semesters.AddAsync(semester);
        await db.Companies.AddAsync(company);
        await db.Lecturers.AddAsync(lecturer);
        await db.Students.AddAsync(student);
        await db.Internships.AddAsync(internship);
        await db.Evaluations.AddAsync(evaluation);
        await db.WeeklyReports.AddAsync(report1);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var data = await service.GetExportDataAsync(semester.Id);

        data.Students.Should().HaveCount(1);
        var s = data.Students[0];
        s.StudentCode.Should().Be("SV001");
        s.Ho.Should().Be("Trần Thị");
        s.Ten.Should().Be("C");
        s.Lop.Should().Be("C23A.TH1");
        s.PhuTrachCongTy.Should().Be("Công ty ABC");
        s.GvHuongDan.Should().Be("TS. Nguyễn Văn B");
        s.DiemThamGia.Should().Be(9);
        s.Thi.Should().Be(8.5m);
        s.Tuan1.Should().Be("✓");

        data.Companies.Should().HaveCount(1);
        data.Companies[0].CompanyName.Should().Be("Công ty ABC");
        data.Companies[0].StudentCount.Should().Be(1);

        data.LecturerAssignments.Should().HaveCount(1);
        data.LecturerAssignments[0].StudentFullName.Should().Be("Trần Thị C");
        data.LecturerAssignments[0].LecturerName.Should().Be("TS. Nguyễn Văn B");
    }

    [Fact]
    public void GenerateFromData_ZeroRecords_ShouldGenerateValidWorkbook()
    {
        var db = GetDb();
        var service = CreateService(db);

        var data = new Application.DTOs.Export.InternshipExportDataDto();
        var bytes = service.GenerateFromData(data);

        bytes.Should().NotBeNull();
        bytes.Length.Should().BeGreaterThan(0);

        using var ms = new MemoryStream(bytes);
        using var wb = new XLWorkbook(ms);
        wb.Worksheets.Count.Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public void GenerateFromData_WithFewRecords_ShouldPopulateAndClearUnused()
    {
        var db = GetDb();
        var service = CreateService(db);

        var data = new Application.DTOs.Export.InternshipExportDataDto
        {
            Students = new List<Application.DTOs.Export.InternshipStudentExportDto>
            {
                new()
                {
                    Stt = 1,
                    StudentCode = "SV01",
                    Ho = "Nguyễn Văn",
                    Ten = "An",
                    Lop = "C23A.TH1",
                    PhuTrachCongTy = "FPT",
                    GvHuongDan = "Thầy B",
                    DiemThamGia = 8,
                    DiemQT = 8,
                    Thi = 8.5m,
                    Tuan1 = "✓",
                    NopBc = "Đã nộp"
                }
            }
        };

        var bytes = service.GenerateFromData(data);
        bytes.Should().NotBeNull();

        using var ms = new MemoryStream(bytes);
        using var wb = new XLWorkbook(ms);
        var ws = wb.Worksheet(1);

        ws.Cell(3, 1).GetValue<int>().Should().Be(1);
        ws.Cell(3, 2).GetString().Should().Be("Nguyễn Văn");
        ws.Cell(3, 3).GetString().Should().Be("An");
        ws.Cell(3, 11).HasFormula.Should().BeTrue();
        ws.Cell(3, 12).HasFormula.Should().BeTrue();
    }

    [Fact]
    public void GenerateFromData_WithMoreThanCapacityRecords_ShouldInsertRowsCorrectly()
    {
        var db = GetDb();
        var service = CreateService(db);

        var students = new List<Application.DTOs.Export.InternshipStudentExportDto>();
        for (int i = 1; i <= 60; i++)
        {
            students.Add(new Application.DTOs.Export.InternshipStudentExportDto
            {
                Stt = i,
                StudentCode = $"SV{i:D3}",
                Ho = "Họ",
                Ten = $"Tên {i}",
                Lop = "C23A.TH1",
                PhuTrachCongTy = "Công ty X",
                GvHuongDan = "GV Y",
                DiemQT = 8,
                Thi = 8,
                NopBc = "Đã nộp"
            });
        }

        var data = new Application.DTOs.Export.InternshipExportDataDto { Students = students };
        var bytes = service.GenerateFromData(data);

        using var ms = new MemoryStream(bytes);
        using var wb = new XLWorkbook(ms);
        var ws = wb.Worksheet(1);

        // Row 62 (which is student 60, since data starts at 3)
        ws.Cell(62, 1).GetValue<int>().Should().Be(60);
        ws.Cell(62, 3).GetString().Should().Be("Tên 60");
        ws.Cell(62, 11).HasFormula.Should().BeTrue();
        ws.Cell(62, 12).HasFormula.Should().BeTrue();
    }

    [Fact]
    public void GenerateFromData_ShouldPopulateAllThreeSheets()
    {
        var db = GetDb();
        var service = CreateService(db);

        var data = new Application.DTOs.Export.InternshipExportDataDto
        {
            Students =
            [
                new()
                {
                    Stt = 1,
                    StudentCode = "SV01",
                    Ho = "Nguyễn Văn",
                    Ten = "An",
                    Lop = "C23A.TH1",
                    PhuTrachCongTy = "FPT",
                    GvHuongDan = "Thầy B",
                    DiemQT = 8,
                    Thi = 8.5m,
                    NopBc = "Đã nộp",
                }
            ],
            Companies =
            [
                new()
                {
                    Stt = 1,
                    CompanyName = "FPT Software",
                    Address = "Q9",
                    StudentCount = 1,
                    ContactInfo = "Anh A - 0901",
                }
            ],
            LecturerAssignments =
            [
                new()
                {
                    Stt = 1,
                    StudentFullName = "Nguyễn Văn An",
                    StudentClass = "C23A.TH1",
                    CompanyName = "FPT Software",
                    LecturerName = "TS. Nguyễn Văn B",
                    LecturerDepartment = "CNTT",
                }
            ]
        };

        var bytes = service.GenerateFromData(data);
        using var ms = new MemoryStream(bytes);
        using var wb = new XLWorkbook(ms);

        wb.Worksheets.Count.Should().BeGreaterThanOrEqualTo(3);

        var studentsSheet = wb.Worksheets.First(w =>
            w.Name.Contains("DANH SÁCH", StringComparison.OrdinalIgnoreCase));
        studentsSheet.Cell(3, 2).GetString().Should().Be("Nguyễn Văn");
        studentsSheet.Cell(3, 3).GetString().Should().Be("An");

        var companySheet = wb.Worksheets.First(w =>
            w.Name.Contains("CÔNG TY", StringComparison.OrdinalIgnoreCase)
            || w.Name.Contains("DOANH NGHIỆP", StringComparison.OrdinalIgnoreCase));
        companySheet.Cell(2, 2).GetString().Should().Be("FPT Software");

        var assignmentSheet = wb.Worksheets.First(w =>
            w.Name.Contains("DATABASE", StringComparison.OrdinalIgnoreCase)
            || w.Name.Contains("GIẢNG VIÊN", StringComparison.OrdinalIgnoreCase));
        assignmentSheet.Cell(3, 2).GetString().Should().Be("Nguyễn Văn An");
        assignmentSheet.Cell(3, 4).GetString().Should().Be("FPT Software");
        assignmentSheet.Cell(3, 5).GetString().Should().Be("TS. Nguyễn Văn B");
        assignmentSheet.Cell(3, 6).GetString().Should().Be("CNTT");
    }

    [Fact]
    public async Task GenerateGuidanceScheduleExcelAsync_ShouldPopulateLecturerAndStudentDetails()
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
        var lecturer = new Lecturer
        {
            Id = Guid.NewGuid(),
            StaffCode = "GV099",
            FullName = "TS. Lê Văn Hướng Dẫn",
            Department = "CNTT",
        };
        var company = new Company
        {
            Id = Guid.NewGuid(),
            CompanyName = "VNG",
            Address = "TP.HCM",
            ContactPerson = "Mentor X",
            IsActive = true,
        };
        var student = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "SV100",
            FullName = "Hoàng Minh Tuấn",
            Class = "C23A.TH2",
        };
        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            Student = student,
            CompanyId = company.Id,
            Company = company,
            LecturerId = lecturer.Id,
            Lecturer = lecturer,
            SemesterId = semester.Id,
            Status = InternshipStatus.InProgress,
        };
        var schedule = new SemesterReportSchedule
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            WeekNumber = 1,
            Title = "Báo cáo tuần 1",
            DueDate = new DateTime(2025, 9, 8),
        };

        await db.Semesters.AddAsync(semester);
        await db.Lecturers.AddAsync(lecturer);
        await db.Companies.AddAsync(company);
        await db.Students.AddAsync(student);
        await db.Internships.AddAsync(internship);
        await db.SemesterReportSchedules.AddAsync(schedule);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var bytes = await service.GenerateGuidanceScheduleExcelAsync(semester.Id, lecturer.Id);

        bytes.Should().NotBeNullOrEmpty();
        using var ms = new MemoryStream(bytes);
        using var wb = new XLWorkbook(ms);
        wb.Worksheets.Count.Should().BeGreaterThanOrEqualTo(2);

        var sheet1Text = string.Join(" ",
            wb.Worksheet(1).CellsUsed().Select(c => c.GetFormattedString()));
        sheet1Text.Should().Contain("TS. Lê Văn Hướng Dẫn");
        sheet1Text.Should().Contain("01"); // student count padded

        var studentSheet = wb.Worksheets.First(w =>
            w.Name.Contains("SINH VIÊN", StringComparison.OrdinalIgnoreCase));
        studentSheet.Cell(5, 2).GetString().Should().Be("SV100");
        studentSheet.Cell(5, 3).GetString().Should().Be("Hoàng Minh Tuấn");
        studentSheet.Cell(5, 5).GetString().Should().Be("VNG");
    }
}
