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

public class InternshipServiceTests
{
    private readonly IMapper _mapper;

    public InternshipServiceTests()
    {
        var config = new MapperConfiguration(cfg =>
        {
            cfg.AddProfile<InternshipProfile>();
            cfg.AddProfile<SubmissionProfile>();
            cfg.AddProfile<StudentProfile>();
            cfg.AddProfile<CompanyProfile>();
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

    private InternshipService CreateService(AppDbContext db) => new(db, _mapper);

    private static async Task<(User StudentUser, User LecturerUser, User StrangerUser, User AdminUser, Student Student, Company Company, Internship Internship)> SeedDataAsync(AppDbContext db)
    {
        var studentUser = new User { Id = Guid.NewGuid(), Username = "student", PasswordHash = "hash", Email = "student@test.com", Role = Role.Student, FullName = "Student 1", CreatedAt = DateTime.UtcNow };
        var lecturerUser = new User { Id = Guid.NewGuid(), Username = "lecturer", PasswordHash = "hash", Email = "lecturer@test.com", Role = Role.Lecturer, FullName = "Lecturer 1", CreatedAt = DateTime.UtcNow };
        var strangerUser = new User { Id = Guid.NewGuid(), Username = "stranger", PasswordHash = "hash", Email = "stranger@test.com", Role = Role.Student, FullName = "Stranger", CreatedAt = DateTime.UtcNow };
        var adminUser = new User { Id = Guid.NewGuid(), Username = "admin", PasswordHash = "hash", Email = "admin@test.com", Role = Role.SuperAdmin, FullName = "Admin", CreatedAt = DateTime.UtcNow };

        var student = new Student { Id = Guid.NewGuid(), UserId = studentUser.Id, StudentCode = "SV001", FullName = "Student 1", CreatedAt = DateTime.UtcNow };
        var lecturer = new Lecturer { Id = Guid.NewGuid(), UserId = lecturerUser.Id, StaffCode = "GV001", FullName = "Lecturer 1", CreatedAt = DateTime.UtcNow };
        var company = new Company { Id = Guid.NewGuid(), CompanyName = "Tech Corp", CreatedAt = DateTime.UtcNow };

        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            Student = student,
            LecturerId = lecturer.Id,
            Lecturer = lecturer,
            CompanyId = company.Id,
            Company = company,
            Position = "Backend Intern",
            Status = InternshipStatus.InProgress,
            StartDate = DateTime.UtcNow.AddMonths(-1),
            EndDate = DateTime.UtcNow.AddMonths(2),
            CreatedAt = DateTime.UtcNow
        };

        await db.Users.AddRangeAsync(studentUser, lecturerUser, strangerUser, adminUser);
        await db.Students.AddAsync(student);
        await db.Lecturers.AddAsync(lecturer);
        await db.Companies.AddAsync(company);
        await db.Internships.AddAsync(internship);
        await db.SaveChangesAsync();

        return (studentUser, lecturerUser, strangerUser, adminUser, student, company, internship);
    }

    [Fact]
    public async Task GetInternshipByIdAsync_StudentOwner_ShouldReturnInternship()
    {
        var db = GetDb();
        var (studentUser, _, _, _, _, _, internship) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetInternshipByIdAsync(internship.Id, studentUser.Id, isLecturerOrAdmin: false);

        result.Should().NotBeNull();
        result!.Id.Should().Be(internship.Id);
        result.Position.Should().Be("Backend Intern");
    }

    [Fact]
    public async Task GetInternshipByIdAsync_AssignedLecturer_ShouldReturnInternship()
    {
        var db = GetDb();
        var (_, lecturerUser, _, _, _, _, internship) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetInternshipByIdAsync(internship.Id, lecturerUser.Id, isLecturerOrAdmin: true);

        result.Should().NotBeNull();
        result!.Id.Should().Be(internship.Id);
    }

    [Fact]
    public async Task GetInternshipByIdAsync_SuperAdmin_ShouldReturnInternship()
    {
        var db = GetDb();
        var (_, _, _, adminUser, _, _, internship) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetInternshipByIdAsync(internship.Id, adminUser.Id, isLecturerOrAdmin: true);

        result.Should().NotBeNull();
        result!.Id.Should().Be(internship.Id);
    }

    [Fact]
    public async Task GetInternshipByIdAsync_StrangerStudent_ShouldThrowUnauthorizedAccessException()
    {
        var db = GetDb();
        var (_, _, strangerUser, _, _, _, internship) = await SeedDataAsync(db);
        var service = CreateService(db);

        var act = async () => await service.GetInternshipByIdAsync(internship.Id, strangerUser.Id, isLecturerOrAdmin: false);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*quyền truy cập*");
    }

    [Fact]
    public async Task GetInternshipByIdAsync_UnassignedLecturer_ShouldThrowUnauthorizedAccessException()
    {
        var db = GetDb();
        var (_, _, _, _, _, _, internship) = await SeedDataAsync(db);

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

        var act = async () => await service.GetInternshipByIdAsync(internship.Id, otherLecturer.Id, isLecturerOrAdmin: true);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*quyền truy cập*");
    }

    [Fact]
    public async Task GetInternshipByIdAsync_NonExistent_ShouldReturnNull()
    {
        var db = GetDb();
        var (studentUser, _, _, _, _, _, _) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetInternshipByIdAsync(Guid.NewGuid(), studentUser.Id, isLecturerOrAdmin: false);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAllInternshipsAsync_ShouldReturnItems()
    {
        var db = GetDb();
        await SeedDataAsync(db);
        var service = CreateService(db);

        var items = await service.GetAllInternshipsAsync(0, 10);

        items.Should().ContainSingle();
    }

    [Fact]
    public async Task GetInternshipsByStudentAsync_ShouldReturnMatching()
    {
        var db = GetDb();
        var (_, _, _, _, student, _, _) = await SeedDataAsync(db);
        var service = CreateService(db);

        var items = await service.GetInternshipsByStudentAsync(student.Id);

        items.Should().ContainSingle();
        items.First().StudentId.Should().Be(student.Id);
    }

    [Fact]
    public async Task AssignCompanyAsync_AssignedLecturer_ShouldAssignActiveCompany()
    {
        var db = GetDb();
        var (_, _, _, _, _, currentCompany, internship) = await SeedDataAsync(db);
        var lecturerId = (await db.Lecturers.SingleAsync()).Id;
        var newCompany = new Company
        {
            Id = Guid.NewGuid(),
            CompanyName = "New Partner",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await db.Companies.AddAsync(newCompany);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.AssignCompanyAsync(
            internship.Id,
            new AssignCompanyRequest { CompanyId = newCompany.Id, Position = "QA Intern" },
            lecturerId);

        result.Should().NotBeNull();
        result!.CompanyId.Should().Be(newCompany.Id);
        result.Position.Should().Be("QA Intern");
        currentCompany.Id.Should().NotBe(newCompany.Id);
    }

    [Fact]
    public async Task AssignCompanyAsync_UnassignedLecturer_ShouldNotModifyInternship()
    {
        var db = GetDb();
        var (_, _, _, _, _, company, internship) = await SeedDataAsync(db);
        var otherLecturer = new Lecturer
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            StaffCode = "GV002",
            FullName = "Other Lecturer",
            CreatedAt = DateTime.UtcNow
        };
        await db.Lecturers.AddAsync(otherLecturer);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.AssignCompanyAsync(
            internship.Id,
            new AssignCompanyRequest { CompanyId = company.Id },
            otherLecturer.Id);

        result.Should().BeNull();
        (await db.Internships.FindAsync(internship.Id))!.CompanyId.Should().Be(company.Id);
    }

    [Fact]
    public async Task AssignCompanyAsync_InactiveCompany_ShouldRejectAssignment()
    {
        var db = GetDb();
        var (_, _, _, _, _, _, internship) = await SeedDataAsync(db);
        var lecturerId = (await db.Lecturers.SingleAsync()).Id;
        var inactiveCompany = new Company
        {
            Id = Guid.NewGuid(),
            CompanyName = "Inactive Partner",
            IsActive = false,
            CreatedAt = DateTime.UtcNow
        };
        await db.Companies.AddAsync(inactiveCompany);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var act = async () => await service.AssignCompanyAsync(
            internship.Id,
            new AssignCompanyRequest { CompanyId = inactiveCompany.Id },
            lecturerId);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ngưng hoạt động*");
    }
}
