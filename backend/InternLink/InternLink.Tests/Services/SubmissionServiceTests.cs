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

public class SubmissionServiceTests
{
    private readonly IMapper _mapper;

    public SubmissionServiceTests()
    {
        var config = new MapperConfiguration(cfg =>
        {
            cfg.AddProfile<SubmissionProfile>();
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

    private SubmissionService CreateService(AppDbContext db, INotificationService? notificationService = null)
    {
        var envMock = new Mock<IWebHostEnvironment>();
        envMock.Setup(e => e.ContentRootPath).Returns(AppDomain.CurrentDomain.BaseDirectory);

        return new SubmissionService(
            db,
            _mapper,
            notificationService ?? Mock.Of<INotificationService>(),
            envMock.Object);
    }

    private static async Task<(User StudentUser, User LecturerUser, User StrangerUser, User AdminUser, Internship Internship, Submission Submission)> SeedDataAsync(AppDbContext db)
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

        var submission = new Submission
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            Internship = internship,
            Title = "Report 1",
            Type = SubmissionType.FinalReport,
            Status = SubmissionStatus.Submitted,
            Version = 1,
            SubmittedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        await db.Users.AddRangeAsync(studentUser, lecturerUser, strangerUser, adminUser);
        await db.Students.AddAsync(student);
        await db.Lecturers.AddAsync(lecturer);
        await db.Internships.AddAsync(internship);
        await db.Submissions.AddAsync(submission);
        await db.SaveChangesAsync();

        return (studentUser, lecturerUser, strangerUser, adminUser, internship, submission);
    }

    [Fact]
    public async Task GetByIdAsync_StudentOwner_ShouldReturnSubmission()
    {
        var db = GetDb();
        var (studentUser, _, _, _, _, submission) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetByIdAsync(submission.Id, studentUser.Id, isLecturerOrAdmin: false);

        result.Should().NotBeNull();
        result!.Id.Should().Be(submission.Id);
        result.Title.Should().Be("Report 1");
    }

    [Fact]
    public async Task GetByIdAsync_AssignedLecturer_ShouldReturnSubmission()
    {
        var db = GetDb();
        var (_, lecturerUser, _, _, _, submission) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetByIdAsync(submission.Id, lecturerUser.Id, isLecturerOrAdmin: true);

        result.Should().NotBeNull();
        result!.Id.Should().Be(submission.Id);
    }

    [Fact]
    public async Task GetByIdAsync_SuperAdmin_ShouldReturnSubmission()
    {
        var db = GetDb();
        var (_, _, _, adminUser, _, submission) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetByIdAsync(submission.Id, adminUser.Id, isLecturerOrAdmin: true);

        result.Should().NotBeNull();
        result!.Id.Should().Be(submission.Id);
    }

    [Fact]
    public async Task GetByIdAsync_StrangerStudent_ShouldThrowUnauthorizedAccessException()
    {
        var db = GetDb();
        var (_, _, strangerUser, _, _, submission) = await SeedDataAsync(db);
        var service = CreateService(db);

        var act = async () => await service.GetByIdAsync(submission.Id, strangerUser.Id, isLecturerOrAdmin: false);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*quyền truy cập*");
    }

    [Fact]
    public async Task GetByIdAsync_UnassignedLecturer_ShouldThrowUnauthorizedAccessException()
    {
        var db = GetDb();
        var (_, _, _, _, _, submission) = await SeedDataAsync(db);

        var otherLecturerUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "other_lecturer",
            PasswordHash = "hash",
            Role = Role.Lecturer,
            CreatedAt = DateTime.UtcNow
        };
        await db.Users.AddAsync(otherLecturerUser);
        await db.SaveChangesAsync();

        var service = CreateService(db);

        var act = async () => await service.GetByIdAsync(submission.Id, otherLecturerUser.Id, isLecturerOrAdmin: true);

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
    public async Task CreateAsync_ValidStudent_ShouldCreateSubmission()
    {
        var db = GetDb();
        var (studentUser, _, _, _, internship, _) = await SeedDataAsync(db);
        var service = CreateService(db);

        var request = new CreateSubmissionRequest
        {
            InternshipId = internship.Id,
            Type = "FinalReport",
            Title = "Final Report Title",
            Description = "Final Report Description"
        };

        var result = await service.CreateAsync(studentUser.Id, request);

        result.Should().NotBeNull();
        result.Title.Should().Be("Final Report Title");
        result.Type.Should().Be("FinalReport");

        var created = await db.Submissions.FindAsync(result.Id);
        created.Should().NotBeNull();
        created!.Title.Should().Be("Final Report Title");
    }

    [Fact]
    public async Task CreateAsync_StrangerStudent_ShouldThrowUnauthorizedAccessException()
    {
        var db = GetDb();
        var (_, _, strangerUser, _, internship, _) = await SeedDataAsync(db);
        var service = CreateService(db);

        var request = new CreateSubmissionRequest
        {
            InternshipId = internship.Id,
            Type = "FinalReport",
            Title = "Final Report Title"
        };

        var act = async () => await service.CreateAsync(strangerUser.Id, request);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task AddFeedbackAsync_AssignedLecturerCanReviewProductSubmission()
    {
        var db = GetDb();
        var (_, lecturerUser, _, _, internship, _) = await SeedDataAsync(db);
        var product = new Submission
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            Type = SubmissionType.Product,
            Title = "Deployed product",
            Status = SubmissionStatus.Submitted,
            Version = 1,
            SubmittedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
        };
        await db.Submissions.AddAsync(product);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.AddFeedbackAsync(product.Id, lecturerUser.Id, new CreateFeedbackRequest
        {
            Comment = "Vui lòng bổ sung ảnh triển khai.",
            IsPublic = true,
            NewStatus = "RevisionRequested",
        });

        result.Should().NotBeNull();
        result!.Comment.Should().Be("Vui lòng bổ sung ảnh triển khai.");
        (await db.Submissions.FindAsync(product.Id))!.Status.Should().Be(SubmissionStatus.RevisionRequested);
    }

    [Fact]
    public async Task GetFeedbacksAsync_StudentOwner_ShouldReturnOnlyPublicFeedbacks()
    {
        var db = GetDb();
        var (studentUser, lecturerUser, _, _, _, submission) = await SeedDataAsync(db);

        var publicFeedback = new Feedback
        {
            Id = Guid.NewGuid(),
            SubmissionId = submission.Id,
            LecturerId = Guid.NewGuid(),
            Comment = "Public comment",
            IsPublic = true,
            CreatedAt = DateTime.UtcNow
        };
        var privateFeedback = new Feedback
        {
            Id = Guid.NewGuid(),
            SubmissionId = submission.Id,
            LecturerId = Guid.NewGuid(),
            Comment = "Private internal comment",
            IsPublic = false,
            CreatedAt = DateTime.UtcNow
        };
        await db.Feedbacks.AddRangeAsync(publicFeedback, privateFeedback);
        await db.SaveChangesAsync();

        var service = CreateService(db);

        var result = await service.GetFeedbacksAsync(submission.Id, studentUser.Id, isLecturer: false);

        result.Should().HaveCount(1);
        result.First().Comment.Should().Be("Public comment");
    }

    [Fact]
    public async Task GetFeedbacksAsync_StrangerStudent_ShouldThrowUnauthorizedAccessException()
    {
        var db = GetDb();
        var (_, _, strangerUser, _, _, submission) = await SeedDataAsync(db);
        var service = CreateService(db);

        var act = async () => await service.GetFeedbacksAsync(submission.Id, strangerUser.Id, isLecturer: false);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
