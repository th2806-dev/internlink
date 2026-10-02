using AutoMapper;
using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Application.Mappings;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternLink.Tests.Services;

public class LecturerServiceTests
{
    private readonly IMapper _mapper;

    public LecturerServiceTests()
    {
        var config = new MapperConfiguration(cfg =>
        {
            cfg.AddProfile<LecturerProfile>();
            cfg.AddProfile<InternshipProfile>();
            cfg.AddProfile<StudentProfile>();
            cfg.AddProfile<CompanyProfile>();
            cfg.AddProfile<SubmissionProfile>();
        });
        _mapper = config.CreateMapper();
    }

    private static AppDbContext GetDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<(User LecturerUser, Lecturer Lecturer, Internship Internship1, Internship Internship2)> SeedLecturerDataAsync(AppDbContext db)
    {
        var lecturerUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "lecturer1",
            PasswordHash = "hash",
            Role = Role.Lecturer,
            FullName = "TS. Nguyen Van A",
            Email = "nguyenvana@uni.edu.vn",
            CreatedAt = DateTime.UtcNow
        };

        var lecturer = new Lecturer
        {
            Id = Guid.NewGuid(),
            UserId = lecturerUser.Id,
            StaffCode = "GV001",
            FullName = "TS. Nguyen Van A",
            Email = "nguyenvana@uni.edu.vn",
            Department = "Khoa CNTT",
            CreatedAt = DateTime.UtcNow
        };

        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "HK I - 2026",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            Status = SemesterStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        var company1 = new Company
        {
            Id = Guid.NewGuid(),
            CompanyName = "FPT Software",
            Industry = "CNTT",
            ContactEmail = "hr@fpt.com",
            CreatedAt = DateTime.UtcNow
        };

        var company2 = new Company
        {
            Id = Guid.NewGuid(),
            CompanyName = "VNG Corporation",
            Industry = "Game & Cloud",
            ContactEmail = "recruitment@vng.com.vn",
            CreatedAt = DateTime.UtcNow
        };

        var student1 = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "SV001",
            FullName = "Tran Van B",
            Class = "21DTH01",
            Major = "CNTT",
            CreatedAt = DateTime.UtcNow
        };

        var student2 = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "SV002",
            FullName = "Le Thi C",
            Class = "21DTH02",
            Major = "KTPM",
            CreatedAt = DateTime.UtcNow
        };

        var internship1 = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student1.Id,
            Student = student1,
            LecturerId = lecturer.Id,
            Lecturer = lecturer,
            CompanyId = company1.Id,
            Company = company1,
            SemesterId = semester.Id,
            Semester = semester,
            Position = "React Developer",
            Status = InternshipStatus.InProgress,
            CreatedAt = DateTime.UtcNow
        };

        var internship2 = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student2.Id,
            Student = student2,
            LecturerId = lecturer.Id,
            Lecturer = lecturer,
            CompanyId = company2.Id,
            Company = company2,
            SemesterId = semester.Id,
            Semester = semester,
            Position = ".NET Developer",
            Status = InternshipStatus.Completed,
            CreatedAt = DateTime.UtcNow
        };

        var eval2 = new Evaluation
        {
            Id = Guid.NewGuid(),
            InternshipId = internship2.Id,
            EvaluatedById = lecturerUser.Id,
            FinalGrade = 9.0m,
            IsFinalized = true,
            CreatedAt = DateTime.UtcNow
        };

        var report1 = new WeeklyReport
        {
            Id = Guid.NewGuid(),
            InternshipId = internship1.Id,
            WeekNumber = 1,
            Status = WeeklyReportStatus.Submitted,
            Title = "Báo cáo tuần 1",
            Content = "Nội dung báo cáo tiến độ tuần 1",
            CreatedAt = DateTime.UtcNow
        };

        await db.Users.AddAsync(lecturerUser);
        await db.Lecturers.AddAsync(lecturer);
        await db.Semesters.AddAsync(semester);
        await db.Companies.AddRangeAsync(company1, company2);
        await db.Students.AddRangeAsync(student1, student2);
        await db.Internships.AddRangeAsync(internship1, internship2);
        await db.Evaluations.AddAsync(eval2);
        await db.WeeklyReports.AddAsync(report1);
        await db.SaveChangesAsync();

        return (lecturerUser, lecturer, internship1, internship2);
    }

    [Fact]
    public async Task GetAssignedSemestersAsync_ShouldReturnOnlySemestersWithAssignedInternships()
    {
        var db = GetDb();
        var (lecturerUser, lecturer, _, _) = await SeedLecturerDataAsync(db);
        var previousSemester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "HK II - 2025",
            Term = "Học kỳ II",
            AcademicYear = "2025 - 2026",
            StartDate = new DateTime(2026, 1, 1),
            CreatedAt = DateTime.UtcNow.AddMonths(-8),
        };
        var otherSemester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "HK I - Other Lecturer",
            Term = "Học kỳ I",
            AcademicYear = "2025 - 2026",
            CreatedAt = DateTime.UtcNow.AddMonths(-12),
        };
        db.Semesters.AddRange(previousSemester, otherSemester);
        db.Internships.Add(new Internship
        {
            Id = Guid.NewGuid(),
            SemesterId = previousSemester.Id,
            StudentId = Guid.NewGuid(),
            LecturerId = lecturer.Id,
            Status = InternshipStatus.Completed,
            CreatedAt = DateTime.UtcNow.AddMonths(-8),
        });
        db.Internships.Add(new Internship
        {
            Id = Guid.NewGuid(),
            SemesterId = otherSemester.Id,
            StudentId = Guid.NewGuid(),
            LecturerId = Guid.NewGuid(),
            Status = InternshipStatus.Completed,
            CreatedAt = DateTime.UtcNow.AddMonths(-12),
        });
        await db.SaveChangesAsync();

        var result = (await new LecturerService(db, _mapper, Mock.Of<INotificationService>())
            .GetAssignedSemestersAsync(lecturerUser.Id)).ToList();

        result.Should().HaveCount(2);
        result.Select(semester => semester.Id).Should().Contain(previousSemester.Id);
        result.Select(semester => semester.Id).Should().NotContain(otherSemester.Id);
        result.First().Id.Should().Be(previousSemester.Id);
    }

    [Fact]
    public async Task GetInternshipsAsync_ValidLecturer_ShouldReturnInternshipsInActiveSemester()
    {
        var db = GetDb();
        var (lecturerUser, _, _, _) = await SeedLecturerDataAsync(db);
        var service = new LecturerService(db, _mapper, Mock.Of<INotificationService>());

        var result = await service.GetInternshipsAsync(lecturerUser.Id);

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetInternshipAsync_WrongLecturer_ShouldReturnNull()
    {
        var db = GetDb();
        var otherUser = new User { Id = Guid.NewGuid(), Username = "other", PasswordHash = "hash", Role = Role.Lecturer, CreatedAt = DateTime.UtcNow };
        await db.Users.AddAsync(otherUser);
        await db.SaveChangesAsync();

        var service = new LecturerService(db, _mapper, Mock.Of<INotificationService>());

        var result = await service.GetInternshipAsync(Guid.NewGuid(), otherUser.Id);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetMeAsync_ValidLecturer_ShouldReturnOverview()
    {
        var db = GetDb();
        var (lecturerUser, _, _, _) = await SeedLecturerDataAsync(db);
        var service = new LecturerService(db, _mapper, Mock.Of<INotificationService>());

        var result = await service.GetMeAsync(lecturerUser.Id);

        result.Should().NotBeNull();
        result!.Lecturer.StaffCode.Should().Be("GV001");
        result.TotalInternships.Should().Be(2);
        result.Internships.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetDashboardStatsAsync_ValidLecturer_ShouldReturnCorrectCalculations()
    {
        var db = GetDb();
        var (lecturerUser, _, _, _) = await SeedLecturerDataAsync(db);
        var service = new LecturerService(db, _mapper, Mock.Of<INotificationService>());

        var stats = await service.GetDashboardStatsAsync(lecturerUser.Id);

        stats.TotalStudents.Should().Be(2);
        stats.InterningCount.Should().Be(1);
        stats.CompletedCount.Should().Be(1);
        stats.PendingReviewsCount.Should().Be(1); // 1 submitted weekly report
        stats.AverageGrade.Should().Be(9.0m);
    }

    [Fact]
    public async Task GetAssignedStudentsAsync_WithFilter_ShouldFilterCorrectly()
    {
        var db = GetDb();
        var (lecturerUser, _, _, _) = await SeedLecturerDataAsync(db);
        var service = new LecturerService(db, _mapper, Mock.Of<INotificationService>());

        var allStudents = await service.GetAssignedStudentsAsync(lecturerUser.Id);
        allStudents.Should().HaveCount(2);

        var filteredSearch = await service.GetAssignedStudentsAsync(lecturerUser.Id, search: "SV001");
        filteredSearch.Should().ContainSingle();
        filteredSearch.First().StudentCode.Should().Be("SV001");

        var filteredStatus = await service.GetAssignedStudentsAsync(lecturerUser.Id, status: "Completed");
        filteredStatus.Should().ContainSingle();
        filteredStatus.First().StudentCode.Should().Be("SV002");
    }

    [Fact]
    public async Task GetAssignedCompaniesAsync_ShouldGroupCompaniesCorrectly()
    {
        var db = GetDb();
        var (lecturerUser, _, _, _) = await SeedLecturerDataAsync(db);
        var service = new LecturerService(db, _mapper, Mock.Of<INotificationService>());

        var companies = await service.GetAssignedCompaniesAsync(lecturerUser.Id);

        companies.Should().HaveCount(2);
        companies.Select(c => c.CompanyName).Should().Contain("FPT Software");
        companies.Select(c => c.CompanyName).Should().Contain("VNG Corporation");
    }

    [Fact]
    public async Task ExportEndOfTermExcelAsync_ShouldGenerateNonEmptyBytes()
    {
        var db = GetDb();
        var (lecturerUser, _, _, _) = await SeedLecturerDataAsync(db);
        var service = new LecturerService(db, _mapper, Mock.Of<INotificationService>());

        var bytes = await service.ExportEndOfTermExcelAsync(lecturerUser.Id);

        bytes.Should().NotBeNull();
        bytes.Length.Should().BeGreaterThan(100);
    }

    [Fact]
    public async Task RemindStudentAsync_ShouldCreateNotification_WhenStudentAssigned()
    {
        var db = GetDb();
        var (lecturerUser, _, internship1, _) = await SeedLecturerDataAsync(db);
        var studentUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "student1",
            PasswordHash = "hash",
            Role = Role.Student,
            FullName = "Tran Van B",
            Email = "student1@uni.edu.vn",
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(studentUser);
        internship1.Student.UserId = studentUser.Id;
        await db.SaveChangesAsync();

        var notificationServiceMock = new Mock<INotificationService>();
        var service = new LecturerService(db, _mapper, notificationServiceMock.Object);

        var result = await service.RemindStudentAsync(lecturerUser.Id, internship1.StudentId, "Custom Title", "Custom Message");

        result.Should().BeTrue();
        notificationServiceMock.Verify(n => n.CreateAsync(It.Is<CreateNotificationRequest>(r =>
            r.UserId == studentUser.Id &&
            r.Title == "Custom Title" &&
            r.Content == "Custom Message" &&
            r.Link == "/student/dashboard")), Times.Once);
    }

    [Fact]
    public async Task RemindStudentAsync_ShouldReturnFalse_WhenStudentNotAssigned()
    {
        var db = GetDb();
        var (lecturerUser, _, _, _) = await SeedLecturerDataAsync(db);
        var service = new LecturerService(db, _mapper, Mock.Of<INotificationService>());

        var result = await service.RemindStudentAsync(lecturerUser.Id, Guid.NewGuid());

        result.Should().BeFalse();
    }
}

