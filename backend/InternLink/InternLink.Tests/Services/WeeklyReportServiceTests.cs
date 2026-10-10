using AutoMapper;
using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Application.Mappings;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternLink.Tests.Services;

public class WeeklyReportServiceTests
{
    private readonly IMapper _mapper;

    public WeeklyReportServiceTests()
    {
        var config = new MapperConfiguration(cfg =>
        {
            cfg.AddProfile<WeeklyReportProfile>();
            cfg.AddProfile<InternshipProfile>();
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

    private WeeklyReportService CreateService(
        AppDbContext db,
        INotificationService? notificationService = null,
        string? contentRootPath = null)
    {
        var environment = new Mock<IWebHostEnvironment>();
        environment.Setup(item => item.ContentRootPath).Returns(contentRootPath ?? Directory.GetCurrentDirectory());
        return new WeeklyReportService(db, _mapper, notificationService ?? Mock.Of<INotificationService>(), environment.Object);
    }

    private static async Task<(User StudentUser, User LecturerUser, User StrangerUser, User AdminUser, Internship Internship, WeeklyReport Report)> SeedDataAsync(AppDbContext db)
    {
        var studentUser = new User { Id = Guid.NewGuid(), Username = "student", PasswordHash = "hash", Email = "student@test.com", Role = Role.Student, FullName = "Student 1", CreatedAt = DateTime.UtcNow };
        var lecturerUser = new User { Id = Guid.NewGuid(), Username = "lecturer", PasswordHash = "hash", Email = "lecturer@test.com", Role = Role.Lecturer, FullName = "Lecturer 1", CreatedAt = DateTime.UtcNow };
        var strangerUser = new User { Id = Guid.NewGuid(), Username = "stranger", PasswordHash = "hash", Email = "stranger@test.com", Role = Role.Student, FullName = "Stranger", CreatedAt = DateTime.UtcNow };
        var adminUser = new User { Id = Guid.NewGuid(), Username = "admin", PasswordHash = "hash", Email = "admin@test.com", Role = Role.SuperAdmin, FullName = "Admin", CreatedAt = DateTime.UtcNow };

        var student = new Student { Id = Guid.NewGuid(), UserId = studentUser.Id, StudentCode = "SV001", FullName = "Student 1", CreatedAt = DateTime.UtcNow };
        var lecturer = new Lecturer { Id = Guid.NewGuid(), UserId = lecturerUser.Id, StaffCode = "GV001", FullName = "Lecturer 1", CreatedAt = DateTime.UtcNow };

        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            Student = student,
            LecturerId = lecturer.Id,
            Lecturer = lecturer,
            Status = InternshipStatus.InProgress,
            CreatedAt = DateTime.UtcNow
        };

        var report = new WeeklyReport
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            Internship = internship,
            WeekNumber = 1,
            Title = "Week 1 Progress",
            Content = "Learned codebase and setup dev environment",
            Status = WeeklyReportStatus.Draft,
            CreatedAt = DateTime.UtcNow
        };

        await db.Users.AddRangeAsync(studentUser, lecturerUser, strangerUser, adminUser);
        await db.Students.AddAsync(student);
        await db.Lecturers.AddAsync(lecturer);
        await db.Internships.AddAsync(internship);
        await db.WeeklyReports.AddAsync(report);
        await db.SaveChangesAsync();

        return (studentUser, lecturerUser, strangerUser, adminUser, internship, report);
    }

    [Fact]
    public async Task GetByIdAsync_StudentOwner_ShouldReturnReport()
    {
        var db = GetDb();
        var (studentUser, _, _, _, _, report) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetByIdAsync(report.Id, studentUser.Id, isLecturerOrAdmin: false);

        result.Should().NotBeNull();
        result!.Id.Should().Be(report.Id);
        result.Title.Should().Be("Week 1 Progress");
    }

    [Fact]
    public async Task GetByIdAsync_AssignedLecturer_ShouldReturnReport()
    {
        var db = GetDb();
        var (_, lecturerUser, _, _, _, report) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetByIdAsync(report.Id, lecturerUser.Id, isLecturerOrAdmin: true);

        result.Should().NotBeNull();
        result!.Id.Should().Be(report.Id);
    }

    [Fact]
    public async Task GetByIdAsync_SuperAdmin_ShouldReturnReport()
    {
        var db = GetDb();
        var (_, _, _, adminUser, _, report) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetByIdAsync(report.Id, adminUser.Id, isLecturerOrAdmin: true);

        result.Should().NotBeNull();
        result!.Id.Should().Be(report.Id);
    }

    [Fact]
    public async Task GetByIdAsync_StrangerStudent_ShouldThrowUnauthorizedAccessException()
    {
        var db = GetDb();
        var (_, _, strangerUser, _, _, report) = await SeedDataAsync(db);
        var service = CreateService(db);

        var act = async () => await service.GetByIdAsync(report.Id, strangerUser.Id, isLecturerOrAdmin: false);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*quyền truy cập*");
    }

    [Fact]
    public async Task GetByIdAsync_UnassignedLecturer_ShouldThrowUnauthorizedAccessException()
    {
        var db = GetDb();
        var (_, _, _, _, _, report) = await SeedDataAsync(db);

        var otherLecturer = new User
        {
            Id = Guid.NewGuid(),
            Username = "other_lecturer",
            PasswordHash = "hash",
            Role = Role.Lecturer,
            CreatedAt = DateTime.UtcNow
        };
        await db.Users.AddAsync(otherLecturer);
        await db.SaveChangesAsync();

        var service = CreateService(db);

        var act = async () => await service.GetByIdAsync(report.Id, otherLecturer.Id, isLecturerOrAdmin: true);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*quyền truy cập*");
    }

    [Fact]
    public async Task GetByIdAsync_NonExistent_ShouldReturnNull()
    {
        var db = GetDb();
        var (studentUser, _, _, _, _, _) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetByIdAsync(Guid.NewGuid(), studentUser.Id, isLecturerOrAdmin: false);

        result.Should().BeNull();
    }

    [Fact]
    public async Task CreateDraftAsync_ValidStudent_ShouldCreateReport()
    {
        var db = GetDb();
        var (studentUser, _, _, _, internship, _) = await SeedDataAsync(db);
        var service = CreateService(db);

        var request = new CreateWeeklyReportRequest
        {
            InternshipId = internship.Id,
            WeekNumber = 2,
            Title = "Week 2 Progress",
            Content = "Implemented features and unit tests"
        };

        var result = await service.CreateDraftAsync(studentUser.Id, request);

        result.Should().NotBeNull();
        result.WeekNumber.Should().Be(2);
        result.Title.Should().Be("Week 2 Progress");
    }

    [Fact]
    public async Task CreateDraftWithFileAsync_BeforeConfiguredStart_ShouldRejectUpload()
    {
        var db = GetDb();
        var (studentUser, _, _, _, internship, _) = await SeedDataAsync(db);
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Kỳ thực tập",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            Status = SemesterStatus.Active,
            TotalWeeks = 1,
            CreatedAt = DateTime.UtcNow
        };
        internship.SemesterId = semester.Id;
        db.Semesters.Add(semester);
        db.SemesterReportSchedules.Add(new SemesterReportSchedule
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            WeekNumber = 1,
            Title = "Báo cáo tuần 1",
            StartDate = DateTime.UtcNow.AddDays(1),
            DueDate = DateTime.UtcNow.AddDays(8),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var act = () => CreateService(db).CreateDraftWithFileAsync(
            studentUser.Id,
            new CreateWeeklyReportRequest { InternshipId = internship.Id, WeekNumber = 1, Title = "Báo cáo tuần 1" },
            new MemoryStream(new byte[] { 1 }),
            "report.pdf",
            1,
            "application/pdf");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bài nộp cho Báo cáo tuần 1 chưa mở nhận trước ngày *.");
    }

    [Fact]
    public async Task CreateDraftWithFileAsync_ShouldStoreCanonicalFilenameWithoutUuidPrefix()
    {
        var db = GetDb();
        var (studentUser, _, _, _, internship, _) = await SeedDataAsync(db);
        internship.Student!.FullName = "Nguyen Van A";
        var contentRootPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var service = CreateService(db, contentRootPath: contentRootPath);

        try
        {
            var result = await service.CreateDraftWithFileAsync(
                studentUser.Id,
                new CreateWeeklyReportRequest { InternshipId = internship.Id, WeekNumber = 2, Title = "Báo cáo tuần 2" },
                new MemoryStream(new byte[] { 1, 2, 3 }),
                "anything.pdf",
                3,
                "application/pdf");

            result.FileName.Should().Be("Tuan02_NguyenVanA_V1.pdf");
            result.FileUrl.Should().NotBeNullOrWhiteSpace();
            var relativePath = result.FileUrl!;
            Path.GetFileName(relativePath).Should().Be("Tuan02_NguyenVanA_V1.pdf");
            File.Exists(Path.Combine(contentRootPath, relativePath.Replace('/', Path.DirectorySeparatorChar))).Should().BeTrue();
        }
        finally
        {
            if (Directory.Exists(contentRootPath))
                Directory.Delete(contentRootPath, recursive: true);
        }
    }

    [Fact]
    public async Task CreateDraftWithFileAsync_WhenCanonicalFilenameExists_ShouldAdvanceStoredVersion()
    {
        var db = GetDb();
        var (studentUser, _, _, _, internship, _) = await SeedDataAsync(db);
        internship.Student!.FullName = "Nguyen Van A";
        var contentRootPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var uploadPath = Path.Combine(contentRootPath, "uploads", "weekly-reports", internship.Id.ToString());
        Directory.CreateDirectory(uploadPath);
        await File.WriteAllBytesAsync(Path.Combine(uploadPath, "Tuan02_NguyenVanA_V1.pdf"), new byte[] { 9 });
        var service = CreateService(db, contentRootPath: contentRootPath);

        try
        {
            var result = await service.CreateDraftWithFileAsync(
                studentUser.Id,
                new CreateWeeklyReportRequest { InternshipId = internship.Id, WeekNumber = 2, Title = "Báo cáo tuần 2" },
                new MemoryStream(new byte[] { 1, 2, 3 }),
                "anything.pdf",
                3,
                "application/pdf");

            result.FileName.Should().Be("Tuan02_NguyenVanA_V2.pdf");
            result.Version.Should().Be(2);
            (await db.WeeklyReportVersions.SingleAsync(version => version.WeeklyReportId == result.Id))
                .Version.Should().Be(2);
        }
        finally
        {
            if (Directory.Exists(contentRootPath))
                Directory.Delete(contentRootPath, recursive: true);
        }
    }

    [Fact]
    public async Task SubmitAsync_WhenPastDeadlineAndLateNotAllowed_ShouldThrowInvalidOperationException()
    {
        var db = GetDb();
        var (studentUser, _, _, _, internship, report) = await SeedDataAsync(db);
        var service = CreateService(db);

        var semesterId = Guid.NewGuid();
        internship.SemesterId = semesterId;
        report.Status = WeeklyReportStatus.Draft;
        report.WeekNumber = 1;

        // Schedule with past due date and AllowLateSubmission = false
        var schedule = new SemesterReportSchedule
        {
            Id = Guid.NewGuid(),
            SemesterId = semesterId,
            WeekNumber = 1,
            Title = "Báo cáo tuần 1",
            DueDate = DateTime.UtcNow.AddDays(-2), // 2 days ago
            AllowLateSubmission = false,
            CreatedAt = DateTime.UtcNow
        };
        db.SemesterReportSchedules.Add(schedule);
        await db.SaveChangesAsync();

        var act = () => service.SubmitAsync(report.Id, studentUser.Id);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Không cho phép nộp muộn*");
    }

    [Fact]
    public async Task ReviewAsync_WhenWeekIsClosedBeforeDueDate_ShouldThrowInvalidOperationException()
    {
        var db = GetDb();
        var (_, lecturerUser, _, _, internship, report) = await SeedDataAsync(db);
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Kỳ thực tập",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            Status = SemesterStatus.Active,
            TotalWeeks = 1,
            CreatedAt = DateTime.UtcNow
        };
        internship.SemesterId = semester.Id;
        report.Status = WeeklyReportStatus.Submitted;
        db.Semesters.Add(semester);
        db.SemesterReportSchedules.Add(new SemesterReportSchedule
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            WeekNumber = 1,
            Title = "Báo cáo tuần 1",
            DueDate = DateTime.UtcNow.AddDays(7),
            IsSubmissionOpen = false,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var act = () => CreateService(db).ReviewAsync(
            report.Id,
            lecturerUser.Id,
            new ReviewWeeklyReportRequest { Status = "Approved" });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Tuần thực tập đã đóng, nhật ký đang ở chế độ chỉ xem.");
    }

    [Fact]
    public async Task SubmitAsync_WhenPastDeadlineAndLateAllowed_ShouldSucceed()
    {
        var db = GetDb();
        var (studentUser, _, _, _, internship, report) = await SeedDataAsync(db);
        var service = CreateService(db);

        var semesterId = Guid.NewGuid();
        internship.SemesterId = semesterId;
        report.Status = WeeklyReportStatus.Draft;
        report.WeekNumber = 1;

        // Schedule with past due date but AllowLateSubmission = true
        var schedule = new SemesterReportSchedule
        {
            Id = Guid.NewGuid(),
            SemesterId = semesterId,
            WeekNumber = 1,
            Title = "Báo cáo tuần 1",
            DueDate = DateTime.UtcNow.AddDays(-2),
            AllowLateSubmission = true,
            CreatedAt = DateTime.UtcNow
        };
        db.SemesterReportSchedules.Add(schedule);
        await db.SaveChangesAsync();

        var result = await service.SubmitAsync(report.Id, studentUser.Id);

        result.Should().NotBeNull();
        result!.Status.Should().Be("Submitted");
    }

    [Fact]
    public async Task SoftDeleteAsync_SubmittedReport_ShouldHideReportAndDeleteUploadedFiles()
    {
        var db = GetDb();
        var (studentUser, _, _, _, internship, report) = await SeedDataAsync(db);
        var contentRootPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var uploadDirectory = Path.Combine(contentRootPath, "uploads", "weekly-reports", internship.Id.ToString());
        Directory.CreateDirectory(uploadDirectory);

        var currentFileName = "week-1-v2.pdf";
        var previousFileName = "week-1-v1.pdf";
        var currentPath = Path.Combine(uploadDirectory, currentFileName);
        var previousPath = Path.Combine(uploadDirectory, previousFileName);
        await File.WriteAllBytesAsync(currentPath, new byte[] { 2 });
        await File.WriteAllBytesAsync(previousPath, new byte[] { 1 });

        report.Status = WeeklyReportStatus.Submitted;
        report.FileName = currentFileName;
        report.FileUrl = $"uploads/weekly-reports/{internship.Id}/{currentFileName}";
        db.WeeklyReportVersions.AddRange(
            new WeeklyReportVersion
            {
                Id = Guid.NewGuid(),
                WeeklyReportId = report.Id,
                Version = 1,
                FileName = previousFileName,
                FileUrl = $"uploads/weekly-reports/{internship.Id}/{previousFileName}",
                FileSize = 1,
                MimeType = "application/pdf",
                UploadedById = studentUser.Id,
                UploadedAt = DateTime.UtcNow.AddMinutes(-1),
            },
            new WeeklyReportVersion
            {
                Id = Guid.NewGuid(),
                WeeklyReportId = report.Id,
                Version = 2,
                FileName = currentFileName,
                FileUrl = report.FileUrl,
                FileSize = 1,
                MimeType = "application/pdf",
                UploadedById = studentUser.Id,
                UploadedAt = DateTime.UtcNow,
            });
        await db.SaveChangesAsync();

        try
        {
            var deleted = await CreateService(db, contentRootPath: contentRootPath)
                .SoftDeleteAsync(report.Id, studentUser.Id);

            deleted.Should().BeTrue();
            (await db.WeeklyReports.SingleAsync(item => item.Id == report.Id)).IsDeleted.Should().BeTrue();
            var versions = db.WeeklyReportVersions
                .Where(item => item.WeeklyReportId == report.Id)
                .ToList();
            versions.Should().OnlyContain(item => item.IsDeleted);
            File.Exists(currentPath).Should().BeFalse();
            File.Exists(previousPath).Should().BeFalse();
        }
        finally
        {
            if (Directory.Exists(contentRootPath))
                Directory.Delete(contentRootPath, recursive: true);
        }
    }

    [Fact]
    public async Task SoftDeleteAsync_ApprovedReport_ShouldRejectCancellation()
    {
        var db = GetDb();
        var (studentUser, _, _, _, _, report) = await SeedDataAsync(db);
        report.Status = WeeklyReportStatus.Approved;
        await db.SaveChangesAsync();

        var act = () => CreateService(db).SoftDeleteAsync(report.Id, studentUser.Id);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Báo cáo đã được giảng viên duyệt, không thể hủy nộp.");
        (await db.WeeklyReports.SingleAsync(item => item.Id == report.Id)).IsDeleted.Should().BeFalse();
    }
}
