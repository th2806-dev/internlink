using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternLink.Tests.Services;

public class SemesterServiceTests
{
    private static AppDbContext GetDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetAllSemestersAsync_ShouldReturnActiveSemestersFirst()
    {
        var db = GetDb();
        var semester1 = new Semester { Id = Guid.NewGuid(), Name = "Semester 1", Term = "Học kỳ I", AcademicYear = "2025 - 2026", Status = SemesterStatus.Completed, CreatedAt = DateTime.UtcNow.AddDays(-10) };
        var semester2 = new Semester { Id = Guid.NewGuid(), Name = "Semester 2", Term = "Học kỳ II", AcademicYear = "2025 - 2026", Status = SemesterStatus.Active, CreatedAt = DateTime.UtcNow.AddDays(-5) };

        await db.Semesters.AddRangeAsync(semester1, semester2);
        await db.SaveChangesAsync();

        var service = new SemesterService(db);

        var semesters = (await service.GetAllSemestersAsync()).ToList();

        semesters.Should().HaveCount(2);
        semesters.First().Status.Should().Be(SemesterStatus.Active);
    }

    [Fact]
    public async Task GetSemesterByIdAsync_ValidId_ShouldReturnSemester()
    {
        var db = GetDb();
        var semester = new Semester { Id = Guid.NewGuid(), Name = "Fall 2026", Term = "Học kỳ I", AcademicYear = "2026 - 2027", Status = SemesterStatus.Active, CreatedAt = DateTime.UtcNow };
        await db.Semesters.AddAsync(semester);
        await db.SaveChangesAsync();

        var service = new SemesterService(db);

        var result = await service.GetSemesterByIdAsync(semester.Id);

        result.Should().NotBeNull();
        result!.Name.Should().Be("Fall 2026");
    }

    [Fact]
    public async Task GetAllSemestersAsync_ShouldCountSemesterLinkedLecturers()
    {
        var db = GetDb();
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Fall 2026",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            Status = SemesterStatus.Upcoming,
            CreatedAt = DateTime.UtcNow
        };
        var lecturer1 = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GV001", FullName = "GV 1", CreatedAt = DateTime.UtcNow };
        var lecturer2 = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GV002", FullName = "GV 2", CreatedAt = DateTime.UtcNow };
        var lecturer3 = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GV003", FullName = "GV 3", CreatedAt = DateTime.UtcNow };
        var student = new Student { Id = Guid.NewGuid(), StudentCode = "SV001", FullName = "SV 1", CreatedAt = DateTime.UtcNow };

        db.Semesters.Add(semester);
        db.Lecturers.AddRange(lecturer1, lecturer2, lecturer3);
        db.Students.Add(student);
        db.SemesterLecturers.AddRange(
            new SemesterLecturer { Id = Guid.NewGuid(), SemesterId = semester.Id, LecturerId = lecturer1.Id, CreatedAt = DateTime.UtcNow },
            new SemesterLecturer { Id = Guid.NewGuid(), SemesterId = semester.Id, LecturerId = lecturer2.Id, CreatedAt = DateTime.UtcNow });
        // lecturer3 is assigned through an internship in this semester
        db.Internships.Add(new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            SemesterId = semester.Id,
            LecturerId = lecturer3.Id,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = new SemesterService(db);
        var dto = (await service.GetAllSemestersAsync()).Single();

        dto.LecturersCount.Should().Be(3);
    }

    [Fact]
    public async Task CreateSemesterAsync_Valid_ShouldCreateAndReturn()
    {
        var db = GetDb();
        var service = new SemesterService(db);

        var dto = new CreateSemesterDto
        {
            Name = "Spring 2027",
            Term = "Spring",
            AcademicYear = "2026-2027",
            Status = SemesterStatus.Upcoming,
            MaxStudentsPerLecturer = 25
        };

        var result = await service.CreateSemesterAsync(dto);

        result.Should().NotBeNull();
        result.Name.Should().Be("Spring 2027");

        var created = await db.Semesters.FindAsync(result.Id);
        created.Should().NotBeNull();
        created!.MaxStudentsPerLecturer.Should().Be(25);
    }

    [Fact]
    public async Task StartSemesterAsync_ShouldActivateAccountsAndInternshipsForThatSemester()
    {
        var db = GetDb();
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Internship 2026",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            StartDate = new DateTime(2026, 9, 1),
            EndDate = new DateTime(2026, 10, 15),
            Status = SemesterStatus.Upcoming,
            CreatedAt = DateTime.UtcNow
        };
        var lecturerUser = new User { Id = Guid.NewGuid(), Username = "lecturer", PasswordHash = "hash", Role = Role.Lecturer, IsActive = false, CreatedAt = DateTime.UtcNow };
        var studentUser = new User { Id = Guid.NewGuid(), Username = "student", PasswordHash = "hash", Role = Role.Student, IsActive = false, CreatedAt = DateTime.UtcNow };
        var lecturer = new Lecturer { Id = Guid.NewGuid(), UserId = lecturerUser.Id, StaffCode = "GV001", FullName = "Lecturer", CreatedAt = DateTime.UtcNow };
        var student = new Student { Id = Guid.NewGuid(), UserId = studentUser.Id, StudentCode = "SV001", FullName = "Student", CreatedAt = DateTime.UtcNow };
        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            StudentId = student.Id,
            LecturerId = lecturer.Id,
            Status = InternshipStatus.NotStarted,
            CreatedAt = DateTime.UtcNow
        };

        db.Semesters.Add(semester);
        db.Users.AddRange(lecturerUser, studentUser);
        db.Lecturers.Add(lecturer);
        db.Students.Add(student);
        db.Internships.Add(internship);
        await db.SaveChangesAsync();

        var result = await new SemesterService(db).StartSemesterAsync(semester.Id);

        result!.Status.Should().Be(SemesterStatus.Active);
        (await db.Internships.FindAsync(internship.Id))!.Status.Should().Be(InternshipStatus.InProgress);
        (await db.Internships.FindAsync(internship.Id))!.StartDate.Should().Be(semester.StartDate);
        (await db.Users.FindAsync(lecturerUser.Id))!.IsActive.Should().BeTrue();
        (await db.Users.FindAsync(studentUser.Id))!.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task CreateSemesterAsync_ShouldGenerateDefaultSchedulesMatchingTotalWeeks()
    {
        var db = GetDb();
        var service = new SemesterService(db);

        var dto = new CreateSemesterDto
        {
            Name = "Kỳ thực tập linh hoạt 8 tuần",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            StartDate = new DateTime(2026, 9, 1),
            EndDate = new DateTime(2026, 11, 1),
            Status = SemesterStatus.Upcoming,
            TotalWeeks = 8,
            MaxStudentsPerLecturer = 15
        };

        var created = await service.CreateSemesterAsync(dto);

        var schedules = (await service.GetReportSchedulesAsync(created.Id)).ToList();
        schedules.Should().HaveCount(8);
        schedules[0].WeekNumber.Should().Be(1);
        schedules[0].Title.Should().Be("Báo cáo tuần 1");
        schedules[0].AllowLateSubmission.Should().BeTrue();
        schedules[7].WeekNumber.Should().Be(8);
        schedules[7].Title.Should().Be("Báo cáo tuần 8");
    }

    [Fact]
    public async Task UpdateReportScheduleAsync_ShouldUpdateDeadlineAndLateSubmissionPolicy()
    {
        var db = GetDb();
        var service = new SemesterService(db);

        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Kỳ 6 tuần",
            Term = "Học kỳ II",
            AcademicYear = "2026 - 2027",
            StartDate = new DateTime(2026, 10, 1),
            TotalWeeks = 6,
            CreatedAt = DateTime.UtcNow
        };
        db.Semesters.Add(semester);
        await db.SaveChangesAsync();

        await service.GenerateDefaultSchedulesAsync(semester.Id);

        var newDeadline = new DateTime(2026, 10, 10, 23, 59, 59, DateTimeKind.Utc);
        var updated = await service.UpdateReportScheduleAsync(semester.Id, 1, new UpdateReportScheduleRequest
        {
            Title = "Báo cáo tuần 1 (Đã dời hạn)",
            DueDate = newDeadline,
            AllowLateSubmission = false,
            Description = "Nghiêm cấm nộp trễ hạn tuần này"
        });

        updated.Title.Should().Be("Báo cáo tuần 1 (Đã dời hạn)");
        updated.DueDate.Should().Be(newDeadline);
        updated.AllowLateSubmission.Should().BeFalse();
        updated.Description.Should().Be("Nghiêm cấm nộp trễ hạn tuần này");
    }
}

