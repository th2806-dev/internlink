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

public class AssignmentServiceTests
{
    private static async Task<(AppDbContext Db, Semester Semester)> GetDbWithSemesterAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new AppDbContext(options);
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Học kỳ 1 2026",
            Term = "Học kỳ I",
            AcademicYear = "2025 - 2026",
            StartDate = DateTime.UtcNow.AddMonths(-1),
            EndDate = DateTime.UtcNow.AddMonths(4),
            Status = SemesterStatus.Active,
            CreatedAt = DateTime.UtcNow
        };
        await db.Semesters.AddAsync(semester);
        await db.SaveChangesAsync();
        return (db, semester);
    }

    private static IAssignmentService CreateService(AppDbContext db) =>
        new AssignmentService(db, Mock.Of<INotificationService>());

    [Fact]
    public async Task BulkAssignAsync_ShouldCreateStubsForNewStudents()
    {
        var (db, semester) = await GetDbWithSemesterAsync();
        var lecturer = new Lecturer
        {
            Id = Guid.NewGuid(),
            StaffCode = "GV001",
            FullName = "Lecturer A",
            CreatedAt = DateTime.UtcNow
        };
        var students = Enumerable.Range(1, 5).Select(i => new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = $"SV00{i}",
            FullName = $"Student {i}",
            CreatedAt = DateTime.UtcNow
        }).ToList();

        await db.Lecturers.AddAsync(lecturer);
        await db.Students.AddRangeAsync(students);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.BulkAssignAsync(new BulkAssignRequest
        {
            LecturerId = lecturer.Id,
            SemesterId = semester.Id,
            StudentIds = students.Select(s => s.Id).ToList()
        });

        result.AssignedCount.Should().Be(5);
        result.CreatedCount.Should().Be(5);
        result.UpdatedCount.Should().Be(0);
        result.FailedCount.Should().Be(0);

        var internships = await db.Internships.Where(i => i.LecturerId == lecturer.Id).ToListAsync();
        internships.Should().HaveCount(5);
        internships.Should().OnlyContain(i => i.Status == InternshipStatus.InProgress);
        internships.Should().OnlyContain(i => i.CompanyId == null);
    }

    [Fact]
    public async Task BulkAssignAsync_ShouldReassignExistingInternship()
    {
        var (db, semester) = await GetDbWithSemesterAsync();
        var lecturerA = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GVA", FullName = "A", CreatedAt = DateTime.UtcNow };
        var lecturerB = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GVB", FullName = "B", CreatedAt = DateTime.UtcNow };
        var company = new Company { Id = Guid.NewGuid(), CompanyName = "FPT", CreatedAt = DateTime.UtcNow };
        var student = new Student { Id = Guid.NewGuid(), StudentCode = "SV001", FullName = "Student 1", CreatedAt = DateTime.UtcNow };
        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            CompanyId = company.Id,
            LecturerId = lecturerA.Id,
            SemesterId = semester.Id,
            Status = InternshipStatus.InProgress,
            CreatedAt = DateTime.UtcNow
        };

        await db.Lecturers.AddRangeAsync(lecturerA, lecturerB);
        await db.Companies.AddAsync(company);
        await db.Students.AddAsync(student);
        await db.Internships.AddAsync(internship);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.BulkAssignAsync(new BulkAssignRequest
        {
            LecturerId = lecturerB.Id,
            SemesterId = semester.Id,
            StudentIds = [student.Id]
        });

        result.AssignedCount.Should().Be(1);
        result.UpdatedCount.Should().Be(1);
        result.CreatedCount.Should().Be(0);

        var updated = await db.Internships.FindAsync(internship.Id);
        updated!.LecturerId.Should().Be(lecturerB.Id);
    }

    [Fact]
    public async Task GetByLecturerAsync_ShouldReturnAssignedStudents()
    {
        var (db, semester) = await GetDbWithSemesterAsync();
        var lecturer = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GV001", FullName = "Lecturer", CreatedAt = DateTime.UtcNow };
        var company = new Company { Id = Guid.NewGuid(), CompanyName = "Viettel", CreatedAt = DateTime.UtcNow };
        var student = new Student { Id = Guid.NewGuid(), StudentCode = "SV001", FullName = "Student 1", Class = "K15", CreatedAt = DateTime.UtcNow };
        await db.Lecturers.AddAsync(lecturer);
        await db.Companies.AddAsync(company);
        await db.Students.AddAsync(student);
        await db.Internships.AddAsync(new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            CompanyId = company.Id,
            LecturerId = lecturer.Id,
            SemesterId = semester.Id,
            Status = InternshipStatus.NotStarted,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var items = await service.GetByLecturerAsync(lecturer.Id);

        items.Should().ContainSingle();
        items[0].StudentCode.Should().Be("SV001");
        items[0].CompanyAssigned.Should().BeTrue();
    }

    [Fact]
    public async Task UnassignAsync_ShouldClearLecturerId()
    {
        var (db, semester) = await GetDbWithSemesterAsync();
        var lecturer = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GV001", FullName = "Lecturer", CreatedAt = DateTime.UtcNow };
        var company = new Company { Id = Guid.NewGuid(), CompanyName = "FPT", CreatedAt = DateTime.UtcNow };
        var student = new Student { Id = Guid.NewGuid(), StudentCode = "SV001", FullName = "Student 1", CreatedAt = DateTime.UtcNow };
        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            CompanyId = company.Id,
            LecturerId = lecturer.Id,
            SemesterId = semester.Id,
            Status = InternshipStatus.NotStarted,
            CreatedAt = DateTime.UtcNow
        };

        await db.Lecturers.AddRangeAsync(lecturer);
        await db.Companies.AddAsync(company);
        await db.Students.AddAsync(student);
        await db.Internships.AddAsync(internship);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var ok = await service.UnassignAsync(new UnassignRequest
        {
            LecturerId = lecturer.Id,
            StudentId = student.Id
        });

        ok.Should().BeTrue();
        var updated = await db.Internships.FindAsync(internship.Id);
        updated!.LecturerId.Should().BeNull();
    }

    [Fact]
    public async Task BulkAssignAsync_UnknownStudent_ShouldRecordError()
    {
        var (db, semester) = await GetDbWithSemesterAsync();
        var lecturer = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GV001", FullName = "Lecturer", CreatedAt = DateTime.UtcNow };
        await db.Lecturers.AddAsync(lecturer);
        await db.SaveChangesAsync();

        var missingId = Guid.NewGuid();
        var service = CreateService(db);
        var result = await service.BulkAssignAsync(new BulkAssignRequest
        {
            LecturerId = lecturer.Id,
            SemesterId = semester.Id,
            StudentIds = [missingId]
        });

        result.AssignedCount.Should().Be(0);
        result.FailedCount.Should().Be(1);
        result.Errors.Should().ContainSingle(e => e.StudentId == missingId);
    }

    [Fact]
    public async Task AutoAssignAsync_EvenStrategy_ShouldDistributeUnassignedStudents()
    {
        var (db, semester) = await GetDbWithSemesterAsync();
        var lecturerA = new Lecturer
        {
            Id = Guid.NewGuid(),
            StaffCode = "GVA",
            FullName = "Lecturer A",
            CreatedAt = DateTime.UtcNow,
        };
        var lecturerB = new Lecturer
        {
            Id = Guid.NewGuid(),
            StaffCode = "GVB",
            FullName = "Lecturer B",
            CreatedAt = DateTime.UtcNow,
        };
        var students = Enumerable.Range(1, 4).Select(i => new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = $"SV00{i}",
            FullName = $"Student {i}",
            CreatedAt = DateTime.UtcNow,
        }).ToList();

        await db.Lecturers.AddRangeAsync(lecturerA, lecturerB);
        await db.Students.AddRangeAsync(students);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.AutoAssignAsync(new AutoAssignRequest { Strategy = "even" });

        result.TotalAssigned.Should().Be(4);
        result.LecturersUsed.Should().BeGreaterThan(0);

        var assigned = await db.Internships.Where(i => i.LecturerId != null).CountAsync();
        assigned.Should().Be(4);
    }

    [Fact]
    public async Task AutoAssignAsync_ShouldRespectSemesterMaxStudentsPerLecturer()
    {
        var (db, semester) = await GetDbWithSemesterAsync();
        semester.MaxStudentsPerLecturer = 1;
        await db.SaveChangesAsync();

        // 2 GV × tối đa 1 SV/GV (theo cấu hình kỳ) → chỉ 2 SV đầu được phân công, 2 SV còn lại bỏ trống.
        var lecturerA = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GVA", FullName = "Lecturer A", CreatedAt = DateTime.UtcNow };
        var lecturerB = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GVB", FullName = "Lecturer B", CreatedAt = DateTime.UtcNow };
        var students = Enumerable.Range(1, 4).Select(i => new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = $"SV00{i}",
            FullName = $"Student {i}",
            CreatedAt = DateTime.UtcNow,
        }).ToList();

        await db.Lecturers.AddRangeAsync(lecturerA, lecturerB);
        await db.Students.AddRangeAsync(students);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.AutoAssignAsync(new AutoAssignRequest { Strategy = "even" });

        result.TotalAssigned.Should().Be(2);
        var assigned = await db.Internships.CountAsync(i => i.LecturerId != null);
        assigned.Should().Be(2);
    }

    [Fact]
    public async Task GetHistoryAsync_ShouldGroupByLecturerAndMinute()
    {
        var (db, _) = await GetDbWithSemesterAsync();
        var lecturer = new Lecturer
        {
            Id = Guid.NewGuid(),
            StaffCode = "GV001",
            FullName = "Lecturer A",
            CreatedAt = DateTime.UtcNow,
        };
        var company = new Company { Id = Guid.NewGuid(), CompanyName = "FPT", CreatedAt = DateTime.UtcNow };
        var students = Enumerable.Range(1, 2).Select(i => new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = $"SV00{i}",
            FullName = $"Student {i}",
            Class = "20CNTT1",
            CreatedAt = DateTime.UtcNow,
        }).ToList();
        var now = DateTime.UtcNow;

        await db.Lecturers.AddAsync(lecturer);
        await db.Companies.AddAsync(company);
        await db.Students.AddRangeAsync(students);
        await db.Internships.AddRangeAsync(students.Select(s => new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = s.Id,
            CompanyId = company.Id,
            LecturerId = lecturer.Id,
            Status = InternshipStatus.NotStarted,
            CreatedAt = now,
        }));
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var history = await service.GetHistoryAsync(10);

        history.Should().ContainSingle();
        history[0].LecturerName.Should().Be("Lecturer A");
        history[0].StudentCount.Should().Be(2);
        history[0].ClassGroups.Should().Contain("20CNTT1");
    }

    [Fact]
    public async Task GetHistoryAsync_BulkSpanningSeveralMinutes_ShouldStaySingleBatch()
    {
        var (db, _) = await GetDbWithSemesterAsync();
        var lecturer = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GVB", FullName = "Lecturer B", CreatedAt = DateTime.UtcNow };
        var t0 = DateTime.UtcNow.AddMinutes(-10);
        var students = Enumerable.Range(1, 3).Select(i => new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = $"SV1{i:00}",
            FullName = $"Student {i}",
            CreatedAt = DateTime.UtcNow,
        }).ToList();

        await db.Lecturers.AddAsync(lecturer);
        await db.Students.AddRangeAsync(students);
        // 3 bản ghi của 1 lô phân công nhưng lệch nhau vài phút — bucket theo phút cũ
        // sẽ tách thành 3 dòng lịch sử sai nghĩa; chia lô theo cửa sổ 10 phút phải gộp lại.
        await db.Internships.AddRangeAsync(students.Select((s, i) => new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = s.Id,
            LecturerId = lecturer.Id,
            Status = InternshipStatus.NotStarted,
            AssignedAt = t0.AddMinutes(i * 2), // lệch 0/2/4 phút — cùng lô
            CreatedAt = t0,
        }));
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var history = await service.GetHistoryAsync(10);

        history.Should().ContainSingle();
        history[0].StudentCount.Should().Be(3);
    }

    [Fact]
    public async Task GetHistoryAsync_SeparateBatchesBeyondGap_ShouldSplit()
    {
        var (db, _) = await GetDbWithSemesterAsync();
        var lecturer = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GVC", FullName = "Lecturer C", CreatedAt = DateTime.UtcNow };
        var t0 = DateTime.UtcNow.AddHours(-2);
        var students = Enumerable.Range(1, 2).Select(i => new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = $"SV2{i:00}",
            FullName = $"Student {i}",
            CreatedAt = DateTime.UtcNow,
        }).ToList();

        await db.Lecturers.AddAsync(lecturer);
        await db.Students.AddRangeAsync(students);
        await db.Internships.AddRangeAsync(students.Select((s, i) => new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = s.Id,
            LecturerId = lecturer.Id,
            Status = InternshipStatus.NotStarted,
            AssignedAt = i == 0 ? t0 : t0.AddMinutes(-30), // cách nhau 30 phút > ngưỡng 10 phút
            CreatedAt = t0,
        }));
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var history = await service.GetHistoryAsync(10);

        history.Should().HaveCount(2);
        history[0].StudentCount.Should().Be(1);
        history[1].StudentCount.Should().Be(1);
    }

    [Fact]
    public async Task ImportCompanyAllocationsFromExcelAsync_ShouldAssignCompanyByStudentNameAndClass()
    {
        var (db, semester) = await GetDbWithSemesterAsync();
        var company = new Company
        {
            Id = Guid.NewGuid(),
            CompanyName = "Công ty Cổ phần Công nghệ RADA360",
            CreatedAt = DateTime.UtcNow
        };
        var student = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "2300001",
            FullName = "Phạm Duy Văn",
            Class = "C23A.TH2",
            CreatedAt = DateTime.UtcNow
        };
        await db.Companies.AddAsync(company);
        await db.Students.AddAsync(student);
        await db.SaveChangesAsync();

        using var workbook = new ClosedXML.Excel.XLWorkbook();
        var sheet = workbook.Worksheets.Add("Allocations");
        sheet.Cell(1, 1).Value = "STT";
        sheet.Cell(1, 2).Value = "HỌ TÊN";
        sheet.Cell(1, 3).Value = "LỚP";
        sheet.Cell(1, 4).Value = "CÔNG TY THỰC TẬP";

        sheet.Cell(2, 1).Value = 1;
        sheet.Cell(2, 2).Value = "Phạm Duy Văn";
        sheet.Cell(2, 3).Value = "C23A.TH2";
        sheet.Cell(2, 4).Value = "Công ty Cổ phần Công nghệ RADA360";

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;

        var service = CreateService(db);
        var result = await service.ImportCompanyAllocationsFromExcelAsync(stream, semester.Id);

        result.SuccessCount.Should().Be(1);
        result.FailedCount.Should().Be(0);

        var internship = await db.Internships.FirstOrDefaultAsync(i => i.StudentId == student.Id);
        internship.Should().NotBeNull();
        internship!.CompanyId.Should().Be(company.Id);
    }

    [Fact]
    public async Task ImportCompanyAllocationsFromExcelAsync_WithUnknownCompany_ShouldReportError()
    {
        var (db, semester) = await GetDbWithSemesterAsync();
        var student = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "2300002",
            FullName = "Lê Văn Thành Đạt",
            Class = "C23A.TH1",
            CreatedAt = DateTime.UtcNow
        };
        await db.Students.AddAsync(student);
        await db.SaveChangesAsync();

        using var workbook = new ClosedXML.Excel.XLWorkbook();
        var sheet = workbook.Worksheets.Add("Allocations");
        sheet.Cell(1, 1).Value = "HỌ TÊN";
        sheet.Cell(1, 2).Value = "LỚP";
        sheet.Cell(1, 3).Value = "CÔNG TY THỰC TẬP";

        sheet.Cell(2, 1).Value = "Lê Văn Thành Đạt";
        sheet.Cell(2, 2).Value = "C23A.TH1";
        sheet.Cell(2, 3).Value = "Công ty chưa tồn tại XYZ";

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;

        var service = CreateService(db);
        var result = await service.ImportCompanyAllocationsFromExcelAsync(stream, semester.Id);

        result.SuccessCount.Should().Be(0);
        result.FailedCount.Should().Be(1);
    }

    [Fact]
    public void Templates_ShouldLoadFromDisk()
    {
        var studentTemplate = TemplateHelper.FindTemplatePath("Mau-danh-sach-SV.xlsx");
        var lecturerTemplate = TemplateHelper.FindTemplatePath("Mau-danh-sach-GV.xlsx");
        var companyTemplate = TemplateHelper.FindTemplatePath("Mau-danh-sach-doanh-nghiep.xlsx");
        var lecturerAssignTemplate = TemplateHelper.FindTemplatePath("Mau-danh-sach-phan-cong-GVHD.xlsx");
        var companyAllocTemplate = TemplateHelper.FindTemplatePath("Mau-danh-sach-SV-thuc-tap-taiDN.xlsx");

        studentTemplate.Should().NotBeNullOrWhiteSpace();
        lecturerTemplate.Should().NotBeNullOrWhiteSpace();
        companyTemplate.Should().NotBeNullOrWhiteSpace();
        lecturerAssignTemplate.Should().NotBeNullOrWhiteSpace();
        companyAllocTemplate.Should().NotBeNullOrWhiteSpace();

        var bytes = TemplateHelper.GetTemplateBytes("Mau-danh-sach-SV.xlsx", () => []);
        bytes.Should().NotBeEmpty();
    }
}



