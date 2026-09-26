using AutoMapper;
using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Application.Mappings;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternLink.Tests.Services;

public class EvaluationServiceTests
{
    private readonly IMapper _mapper;

    public EvaluationServiceTests()
    {
        var config = new MapperConfiguration(cfg =>
        {
            cfg.AddProfile<EvaluationProfile>();
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

    private EvaluationService CreateService(AppDbContext db) => new(db, _mapper);

    private static async Task<(User StudentUser, User LecturerUser, User StrangerUser, User AdminUser, Internship Internship, Evaluation Evaluation)> SeedDataAsync(AppDbContext db)
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

        var evaluation = new Evaluation
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            Internship = internship,
            EvaluatedById = lecturerUser.Id,
            EvaluatedBy = lecturerUser,
            TechnicalScore = 9,
            CommunicationScore = 8,
            TeamworkScore = 9,
            InitiativeScore = 8,
            FinalGrade = 8.5m,
            Comments = "Excellent work",
            IsFinalized = false,
            CreatedAt = DateTime.UtcNow
        };

        await db.Users.AddRangeAsync(studentUser, lecturerUser, strangerUser, adminUser);
        await db.Students.AddAsync(student);
        await db.Lecturers.AddAsync(lecturer);
        await db.Internships.AddAsync(internship);
        await db.Evaluations.AddAsync(evaluation);
        await db.SaveChangesAsync();

        return (studentUser, lecturerUser, strangerUser, adminUser, internship, evaluation);
    }

    [Fact]
    public async Task GetEvaluationByIdAsync_StudentOwner_ShouldReturnEvaluation()
    {
        var db = GetDb();
        var (studentUser, _, _, _, _, evaluation) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetEvaluationByIdAsync(evaluation.Id, studentUser.Id, isLecturerOrAdmin: false);

        result.Should().NotBeNull();
        result!.Id.Should().Be(evaluation.Id);
        result.FinalGrade.Should().Be(8.5m);
    }

    [Fact]
    public async Task GetEvaluationByIdAsync_AssignedLecturer_ShouldReturnEvaluation()
    {
        var db = GetDb();
        var (_, lecturerUser, _, _, _, evaluation) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetEvaluationByIdAsync(evaluation.Id, lecturerUser.Id, isLecturerOrAdmin: true);

        result.Should().NotBeNull();
        result!.Id.Should().Be(evaluation.Id);
    }

    [Fact]
    public async Task GetEvaluationByIdAsync_SuperAdmin_ShouldReturnEvaluation()
    {
        var db = GetDb();
        var (_, _, _, adminUser, _, evaluation) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetEvaluationByIdAsync(evaluation.Id, adminUser.Id, isLecturerOrAdmin: true);

        result.Should().NotBeNull();
        result!.Id.Should().Be(evaluation.Id);
    }

    [Fact]
    public async Task GetEvaluationByIdAsync_StrangerStudent_ShouldThrowUnauthorizedAccessException()
    {
        var db = GetDb();
        var (_, _, strangerUser, _, _, evaluation) = await SeedDataAsync(db);
        var service = CreateService(db);

        var act = async () => await service.GetEvaluationByIdAsync(evaluation.Id, strangerUser.Id, isLecturerOrAdmin: false);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*quyền truy cập*");
    }

    [Fact]
    public async Task GetEvaluationByIdAsync_UnassignedLecturer_ShouldThrowUnauthorizedAccessException()
    {
        var db = GetDb();
        var (_, _, _, _, _, evaluation) = await SeedDataAsync(db);

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

        var act = async () => await service.GetEvaluationByIdAsync(evaluation.Id, otherLecturer.Id, isLecturerOrAdmin: true);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*quyền truy cập*");
    }

    [Fact]
    public async Task GetEvaluationByIdAsync_NonExistent_ShouldReturnNull()
    {
        var db = GetDb();
        var (studentUser, _, _, _, _, _) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetEvaluationByIdAsync(Guid.NewGuid(), studentUser.Id, isLecturerOrAdmin: false);

        result.Should().BeNull();
    }

    [Fact]
    public async Task CreateEvaluationAsync_Valid_ShouldCreateEvaluation()
    {
        var db = GetDb();
        var (_, lecturerUser, _, _, internship, _) = await SeedDataAsync(db);

        // Create new internship without evaluation
        var newStudent = new Student { Id = Guid.NewGuid(), StudentCode = "SV002", FullName = "Student 2", CreatedAt = DateTime.UtcNow };
        var newInternship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = newStudent.Id,
            Student = newStudent,
            LecturerId = internship.LecturerId,
            Lecturer = internship.Lecturer,
            Status = InternshipStatus.InProgress,
            CreatedAt = DateTime.UtcNow
        };
        await db.Students.AddAsync(newStudent);
        await db.Internships.AddAsync(newInternship);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var request = new CreateEvaluationRequest
        {
            InternshipId = newInternship.Id,
            TechnicalScore = 10,
            CommunicationScore = 9,
            TeamworkScore = 9,
            InitiativeScore = 8,
            Comments = "Great job"
        };

        var result = await service.CreateEvaluationAsync(request, lecturerUser.Id);

        result.Should().NotBeNull();
        result.InternshipId.Should().Be(newInternship.Id);
    }
}
