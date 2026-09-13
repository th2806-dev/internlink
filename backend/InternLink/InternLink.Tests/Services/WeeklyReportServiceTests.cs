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

    private WeeklyReportService CreateService(AppDbContext db, INotificationService? notificationService = null) =>
        new(db, _mapper, notificationService ?? Mock.Of<INotificationService>());

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
            .WithMessage("*access*");
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
            .WithMessage("*access*");
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
}

