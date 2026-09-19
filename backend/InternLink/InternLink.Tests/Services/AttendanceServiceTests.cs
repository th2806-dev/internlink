using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace InternLink.Tests.Services;

public class AttendanceServiceTests
{
    private static AppDbContext GetDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task CreateSessionAsync_ShouldPopulateAssignedStudentsByDefault()
    {
        var db = GetDb();
        var semester = new Semester { Id = Guid.NewGuid(), Name = "Kỳ 1 2026", Term = "HK1", AcademicYear = "2026-2027", TotalWeeks = 6 };
        var lecturer = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GV01", FullName = "Thầy A" };
        var student1 = new Student { Id = Guid.NewGuid(), StudentCode = "SV01", FullName = "Nguyễn Văn A" };
        var student2 = new Student { Id = Guid.NewGuid(), StudentCode = "SV02", FullName = "Trần Thị B" };

        var internship1 = new Internship { Id = Guid.NewGuid(), SemesterId = semester.Id, LecturerId = lecturer.Id, StudentId = student1.Id };
        var internship2 = new Internship { Id = Guid.NewGuid(), SemesterId = semester.Id, LecturerId = lecturer.Id, StudentId = student2.Id };

        await db.Semesters.AddAsync(semester);
        await db.Lecturers.AddAsync(lecturer);
        await db.Students.AddRangeAsync(student1, student2);
        await db.Internships.AddRangeAsync(internship1, internship2);
        await db.SaveChangesAsync();

        var service = new AttendanceService(db, NullLogger<AttendanceService>.Instance);

        var dto = new CreateAttendanceSessionDto
        {
            SemesterId = semester.Id,
            WeekNumber = 1,
            Title = "Buổi gặp tuần 1",
            MeetingDate = DateTime.UtcNow.AddDays(1),
            DurationMinutes = 60,
            Location = "Phòng 302",
            StudentIds = new List<Guid> { student1.Id, student2.Id },
        };

        var result = await service.CreateSessionAsync(lecturer.Id, dto);

        result.Should().NotBeNull();
        result.Title.Should().Be("Buổi gặp tuần 1");
        result.TotalStudents.Should().Be(2);
        result.Records.Should().HaveCount(2);
        result.Records.Select(r => r.StudentId).Should().Contain(new[] { student1.Id, student2.Id });
    }

    [Fact]
    public async Task CreateSessionAsync_WithSpecificStudentIds_ShouldOnlyIncludeSpecifiedStudents()
    {
        var db = GetDb();
        var semester = new Semester { Id = Guid.NewGuid(), Name = "Kỳ 1 2026", Term = "HK1", AcademicYear = "2026-2027", TotalWeeks = 6 };
        var lecturer = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GV01", FullName = "Thầy A" };
        var student1 = new Student { Id = Guid.NewGuid(), StudentCode = "SV01", FullName = "Nguyễn Văn A" };
        var student2 = new Student { Id = Guid.NewGuid(), StudentCode = "SV02", FullName = "Trần Thị B" };

        var internship1 = new Internship { Id = Guid.NewGuid(), SemesterId = semester.Id, LecturerId = lecturer.Id, StudentId = student1.Id };
        var internship2 = new Internship { Id = Guid.NewGuid(), SemesterId = semester.Id, LecturerId = lecturer.Id, StudentId = student2.Id };

        await db.Semesters.AddAsync(semester);
        await db.Lecturers.AddAsync(lecturer);
        await db.Students.AddRangeAsync(student1, student2);
        await db.Internships.AddRangeAsync(internship1, internship2);
        await db.SaveChangesAsync();

        var service = new AttendanceService(db, NullLogger<AttendanceService>.Instance);

        var dto = new CreateAttendanceSessionDto
        {
            SemesterId = semester.Id,
            WeekNumber = 2,
            Title = "Gặp riêng nhóm SV01",
            MeetingDate = DateTime.UtcNow.AddDays(2),
            StudentIds = new List<Guid> { student1.Id },
        };

        var result = await service.CreateSessionAsync(lecturer.Id, dto);

        result.Should().NotBeNull();
        result.TotalStudents.Should().Be(1);
        result.Records.Should().HaveCount(1);
        result.Records.First().StudentId.Should().Be(student1.Id);
    }

    [Fact]
    public async Task MarkAttendanceAsync_ShouldUpdatePresentAndAbsentCorrectly()
    {
        var db = GetDb();
        var semester = new Semester { Id = Guid.NewGuid(), Name = "Kỳ 1 2026", Term = "HK1", AcademicYear = "2026-2027", TotalWeeks = 6 };
        var lecturer = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GV01", FullName = "Thầy A" };
        var student1 = new Student { Id = Guid.NewGuid(), StudentCode = "SV01", FullName = "Nguyễn Văn A" };
        var student2 = new Student { Id = Guid.NewGuid(), StudentCode = "SV02", FullName = "Trần Thị B" };

        var internship1 = new Internship { Id = Guid.NewGuid(), SemesterId = semester.Id, LecturerId = lecturer.Id, StudentId = student1.Id };
        var internship2 = new Internship { Id = Guid.NewGuid(), SemesterId = semester.Id, LecturerId = lecturer.Id, StudentId = student2.Id };

        await db.Semesters.AddAsync(semester);
        await db.Lecturers.AddAsync(lecturer);
        await db.Students.AddRangeAsync(student1, student2);
        await db.Internships.AddRangeAsync(internship1, internship2);
        await db.SaveChangesAsync();

        var service = new AttendanceService(db, NullLogger<AttendanceService>.Instance);

        var session = await service.CreateSessionAsync(lecturer.Id, new CreateAttendanceSessionDto
        {
            SemesterId = semester.Id,
            WeekNumber = 3,
            Title = "Buổi gặp tuần 3",
            MeetingDate = DateTime.UtcNow,
            StudentIds = new List<Guid> { student1.Id, student2.Id },
        });

        var markDto = new MarkAttendanceDto
        {
            Records = new List<MarkStudentAttendanceItemDto>
            {
                new() { StudentId = student1.Id, Status = "Present", Notes = "Báo cáo tốt" },
                new() { StudentId = student2.Id, Status = "Absent", Notes = "Không phép" },
            }
        };

        var updated = await service.MarkAttendanceAsync(session.Id, lecturer.Id, markDto);

        updated.Status.Should().Be("Completed");
        updated.PresentCount.Should().Be(1);
        updated.AbsentCount.Should().Be(1);
        updated.AttendanceRate.Should().Be(50.0);

        var r1 = updated.Records.First(r => r.StudentId == student1.Id);
        r1.Status.Should().Be("Present");
        r1.Notes.Should().Be("Báo cáo tốt");

        var r2 = updated.Records.First(r => r.StudentId == student2.Id);
        r2.Status.Should().Be("Absent");
        r2.Notes.Should().Be("Không phép");
    }

    [Fact]
    public async Task GetStudentAttendanceAsync_ShouldCalculateRateAccurately()
    {
        var db = GetDb();
        var semester = new Semester { Id = Guid.NewGuid(), Name = "Kỳ 1 2026", Term = "HK1", AcademicYear = "2026-2027", TotalWeeks = 6 };
        var lecturer = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GV01", FullName = "Thầy A" };
        var student = new Student { Id = Guid.NewGuid(), StudentCode = "SV01", FullName = "Nguyễn Văn A" };

        var session1 = new AttendanceSession { Id = Guid.NewGuid(), SemesterId = semester.Id, LecturerId = lecturer.Id, WeekNumber = 1, Title = "Tuần 1", MeetingDate = DateTime.UtcNow.AddDays(-7), Status = AttendanceSessionStatus.Completed };
        var session2 = new AttendanceSession { Id = Guid.NewGuid(), SemesterId = semester.Id, LecturerId = lecturer.Id, WeekNumber = 2, Title = "Tuần 2", MeetingDate = DateTime.UtcNow.AddDays(-1), Status = AttendanceSessionStatus.Completed };

        var rec1 = new AttendanceRecord { Id = Guid.NewGuid(), AttendanceSessionId = session1.Id, StudentId = student.Id, Status = AttendanceStatus.Present };
        var rec2 = new AttendanceRecord { Id = Guid.NewGuid(), AttendanceSessionId = session2.Id, StudentId = student.Id, Status = AttendanceStatus.Absent };

        await db.Semesters.AddAsync(semester);
        await db.Lecturers.AddAsync(lecturer);
        await db.Students.AddAsync(student);
        await db.AttendanceSessions.AddRangeAsync(session1, session2);
        await db.AttendanceRecords.AddRangeAsync(rec1, rec2);
        await db.SaveChangesAsync();

        var service = new AttendanceService(db, NullLogger<AttendanceService>.Instance);

        var overview = await service.GetStudentAttendanceAsync(student.Id, semester.Id);

        overview.Should().NotBeNull();
        overview.TotalSessions.Should().Be(2);
        overview.PresentCount.Should().Be(1);
        overview.AbsentCount.Should().Be(1);
        overview.AttendanceRate.Should().Be(50.0);
        overview.Sessions.Should().HaveCount(2);
    }

    [Fact]
    public async Task DeleteSessionAsync_ShouldRemoveSessionAndCascadeRecords()
    {
        var db = GetDb();
        var semester = new Semester { Id = Guid.NewGuid(), Name = "Kỳ 1 2026", Term = "HK1", AcademicYear = "2026-2027", TotalWeeks = 6 };
        var lecturer = new Lecturer { Id = Guid.NewGuid(), StaffCode = "GV01", FullName = "Thầy A" };
        var student = new Student { Id = Guid.NewGuid(), StudentCode = "SV01", FullName = "Nguyễn Văn A" };
        var internship = new Internship { Id = Guid.NewGuid(), SemesterId = semester.Id, LecturerId = lecturer.Id, StudentId = student.Id };

        await db.Semesters.AddAsync(semester);
        await db.Lecturers.AddAsync(lecturer);
        await db.Students.AddAsync(student);
        await db.Internships.AddAsync(internship);
        await db.SaveChangesAsync();

        var service = new AttendanceService(db, NullLogger<AttendanceService>.Instance);

        var session = await service.CreateSessionAsync(lecturer.Id, new CreateAttendanceSessionDto
        {
            SemesterId = semester.Id,
            WeekNumber = 1,
            Title = "Buổi gặp cần xóa",
            MeetingDate = DateTime.UtcNow,
            StudentIds = new List<Guid> { student.Id },
        });

        db.AttendanceSessions.Count().Should().Be(1);
        db.AttendanceRecords.Count().Should().Be(1);

        var ok = await service.DeleteSessionAsync(session.Id, lecturer.Id);
        ok.Should().BeTrue();

        db.AttendanceSessions.Count().Should().Be(0);
        db.AttendanceRecords.Count().Should().Be(0);
    }
}
