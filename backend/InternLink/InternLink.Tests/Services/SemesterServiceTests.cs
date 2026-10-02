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
        db.SchoolAcademicTerms.Add(new SchoolAcademicTerm
        {
            Id = Guid.NewGuid(),
            AcademicYear = "2026-2027",
            Term = "Spring",
            StartDate = new DateTime(2026, 9, 1),
            EndDate = new DateTime(2027, 1, 15),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
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
        result.StartDate.Should().Be(new DateTime(2026, 9, 1));
        result.EndDate.Should().Be(new DateTime(2027, 1, 15));

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
    public async Task UpdateSemesterAsync_ShouldSyncInternshipDatesBeforeAnyActivity()
    {
        var db = GetDb();
        db.SchoolAcademicTerms.Add(new SchoolAcademicTerm
        {
            Id = Guid.NewGuid(),
            AcademicYear = "2025 - 2026",
            Term = "Học kỳ I",
            StartDate = new DateTime(2026, 9, 8),
            EndDate = new DateTime(2026, 10, 22),
            CreatedAt = DateTime.UtcNow
        });
        var semester = NewSemester("Kỳ cập nhật ngày", SemesterStatus.Active);
        semester.StartDate = new DateTime(2026, 9, 1);
        semester.EndDate = new DateTime(2026, 10, 15);
        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            StudentId = Guid.NewGuid(),
            StartDate = semester.StartDate,
            EndDate = semester.EndDate,
            Status = InternshipStatus.InProgress,
            CreatedAt = DateTime.UtcNow
        };
        db.Semesters.Add(semester);
        db.Internships.Add(internship);
        await db.SaveChangesAsync();

        var startDate = new DateTime(2026, 9, 8);
        var endDate = new DateTime(2026, 10, 22);
        await new SemesterService(db).UpdateSemesterAsync(semester.Id, new UpdateSemesterDto
        {
            StartDate = startDate,
            EndDate = endDate
        });

        var updatedInternship = await db.Internships.FindAsync(internship.Id);
        updatedInternship!.StartDate.Should().Be(startDate);
        updatedInternship.EndDate.Should().Be(new DateTime(2026, 10, 19));
    }

    [Fact]
    public async Task UpdateSemesterAsync_ShouldRejectDateChangesAfterSubmittedReport()
    {
        var db = GetDb();
        db.SchoolAcademicTerms.Add(new SchoolAcademicTerm
        {
            Id = Guid.NewGuid(),
            AcademicYear = "2025 - 2026",
            Term = "Học kỳ I",
            StartDate = new DateTime(2026, 9, 8),
            EndDate = new DateTime(2026, 10, 30),
            CreatedAt = DateTime.UtcNow
        });
        var semester = NewSemester("Kỳ đã có hoạt động", SemesterStatus.Active);
        semester.StartDate = new DateTime(2026, 9, 1);
        semester.EndDate = new DateTime(2026, 10, 30);
        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            StudentId = Guid.NewGuid(),
            Status = InternshipStatus.InProgress,
            CreatedAt = DateTime.UtcNow
        };
        db.Semesters.Add(semester);
        db.Internships.Add(internship);
        db.WeeklyReports.Add(new WeeklyReport
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            WeekNumber = 1,
            Title = "Báo cáo tuần 1",
            Content = "Đã gửi",
            Status = WeeklyReportStatus.Submitted,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var act = () => new SemesterService(db).UpdateSemesterAsync(semester.Id, new UpdateSemesterDto
        {
            StartDate = new DateTime(2026, 9, 8)
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Không thể đổi ngày học kỳ sau khi đã có báo cáo, bài nộp hoặc điểm danh. Hãy xử lý dữ liệu hoạt động trước.");
    }

    [Fact]
    public async Task UpdateSemesterAsync_ShouldApplyConfiguredSchoolTermWhenLegacyInternshipDatesStayTheSame()
    {
        var db = GetDb();
        var semester = NewSemester("Thực tập Tốt nghiệp C24A.TH", SemesterStatus.Active);
        semester.AcademicYear = "2026 - 2027";
        semester.StartDate = new DateTime(2026, 9, 28);
        semester.EndDate = new DateTime(2026, 11, 8);
        semester.TotalWeeks = 6;
        semester.InternshipStartWeek = 1;
        var schoolTerm = new SchoolAcademicTerm
        {
            Id = Guid.NewGuid(),
            AcademicYear = "2026 - 2027",
            Term = "Học kỳ I",
            StartDate = new DateTime(2026, 6, 29),
            EndDate = new DateTime(2026, 11, 29),
            CreatedAt = DateTime.UtcNow,
        };
        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            StudentId = Guid.NewGuid(),
            StartDate = new DateTime(2026, 9, 28),
            EndDate = new DateTime(2026, 11, 8),
            CreatedAt = DateTime.UtcNow,
        };
        var attendance = new AttendanceSession
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            LecturerId = Guid.NewGuid(),
            WeekNumber = 2,
            Title = "Buổi gặp tuần 2",
            MeetingDate = new DateTime(2026, 10, 9),
            Status = AttendanceSessionStatus.Scheduled,
            CreatedAt = DateTime.UtcNow,
        };
        db.Semesters.Add(semester);
        db.SchoolAcademicTerms.Add(schoolTerm);
        db.Internships.Add(internship);
        db.AttendanceSessions.Add(attendance);
        await db.SaveChangesAsync();

        var result = await new SemesterService(db).UpdateSemesterAsync(semester.Id, new UpdateSemesterDto
        {
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            TotalWeeks = 6,
            InternshipStartWeek = 14,
        });

        result.Should().NotBeNull();
        result!.StartDate.Should().Be(schoolTerm.StartDate);
        result.EndDate.Should().Be(schoolTerm.EndDate);
        result.InternshipStartWeek.Should().Be(14);
        var savedInternship = await db.Internships.SingleAsync();
        savedInternship.StartDate.Should().Be(new DateTime(2026, 9, 28));
        savedInternship.EndDate.Should().Be(new DateTime(2026, 11, 8));
        var savedAttendance = await db.AttendanceSessions.SingleAsync();
        savedAttendance.MeetingDate.Should().Be(attendance.MeetingDate);
        savedAttendance.WeekNumber.Should().Be(2);
    }

    [Fact]
    public async Task CreateSemesterAsync_ShouldGenerateDefaultSchedulesMatchingTotalWeeks()
    {
        var db = GetDb();
        db.SchoolAcademicTerms.Add(new SchoolAcademicTerm
        {
            Id = Guid.NewGuid(),
            AcademicYear = "2026 - 2027",
            Term = "Học kỳ I",
            StartDate = new DateTime(2026, 9, 1),
            EndDate = new DateTime(2026, 11, 1),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
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
        schedules.Should().HaveCount(9);
        schedules[0].WeekNumber.Should().Be(1);
        schedules[0].Title.Should().Be("Báo cáo tuần 1");
        schedules[0].AllowLateSubmission.Should().BeTrue();
        schedules[7].WeekNumber.Should().Be(8);
        schedules[7].Title.Should().Be("Báo cáo tuần 8");
    }

    [Fact]
    public async Task CreateSemesterAsync_ShouldRejectWeeksOutsideConfiguredSchoolTerm()
    {
        var db = GetDb();
        db.SchoolAcademicTerms.Add(new SchoolAcademicTerm
        {
            Id = Guid.NewGuid(),
            AcademicYear = "2026 - 2027",
            Term = "Học kỳ I",
            StartDate = new DateTime(2026, 9, 1),
            EndDate = new DateTime(2026, 9, 7),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var act = () => new SemesterService(db).CreateSemesterAsync(new CreateSemesterDto
        {
            Name = "Kỳ vượt khung",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            TotalWeeks = 2,
            InternshipStartWeek = 1
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Khoảng tuần thực tập phải nằm trong Tuần 1 đến Tuần 1 của học kỳ.");
    }

    [Fact]
    public async Task GetAllSemestersAsync_ShouldCalculateOnTimeSubmissionRateForDueWeeks()
    {
        var db = GetDb();
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Kỳ đã đóng",
            Term = "Học kỳ I",
            AcademicYear = "2025 - 2026",
            Status = SemesterStatus.Completed,
            TotalWeeks = 1,
            CreatedAt = DateTime.UtcNow
        };
        var submittedInternship = new Internship
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            StudentId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow
        };
        var missingInternship = new Internship
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            StudentId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow
        };
        var dueDate = DateTime.UtcNow.AddDays(-1);
        db.Semesters.Add(semester);
        db.Internships.AddRange(submittedInternship, missingInternship);
        db.SemesterReportSchedules.Add(new SemesterReportSchedule
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            WeekNumber = 1,
            Title = "Báo cáo tuần 1",
            DueDate = dueDate,
            CreatedAt = DateTime.UtcNow.AddDays(-5)
        });
        db.WeeklyReports.Add(new WeeklyReport
        {
            Id = Guid.NewGuid(),
            InternshipId = submittedInternship.Id,
            WeekNumber = 1,
            Title = "Báo cáo tuần 1",
            Content = "Đã nộp đúng hạn",
            Status = WeeklyReportStatus.Submitted,
            SubmittedAt = dueDate.AddHours(-1),
            CreatedAt = dueDate.AddHours(-2)
        });
        await db.SaveChangesAsync();

        var result = (await new SemesterService(db).GetAllSemestersAsync()).Single();

        result.OnTimeSubmissionRate.Should().Be(50m);
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

    [Fact]
    public async Task GetReportSchedulesAsync_ShouldPreferMostRecentlyUpdatedDuplicateDefaultSchedule()
    {
        var db = GetDb();
        var semester = NewSemester("Kỳ lịch trùng", SemesterStatus.Active);
        var older = new SemesterReportSchedule
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            WeekNumber = 3,
            Title = "Lịch cũ",
            DueDate = DateTime.UtcNow.AddDays(3),
            CreatedAt = DateTime.UtcNow.AddDays(-2),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };
        var newer = new SemesterReportSchedule
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            WeekNumber = 3,
            Title = "Lịch mới",
            DueDate = DateTime.UtcNow.AddDays(10),
            CreatedAt = DateTime.UtcNow.AddDays(-2),
            UpdatedAt = DateTime.UtcNow
        };
        db.Semesters.Add(semester);
        db.SemesterReportSchedules.AddRange(older, newer);
        await db.SaveChangesAsync();

        var schedules = (await new SemesterService(db).GetReportSchedulesAsync(semester.Id)).ToList();

        schedules.Should().ContainSingle(schedule => schedule.WeekNumber == 3);
        schedules.Single(schedule => schedule.WeekNumber == 3).Title.Should().Be("Lịch mới");
    }

    // ══ Audit mục 4.1–4.3 ═════════════════════════════════════════════════

    private static Semester NewSemester(string name, SemesterStatus status, Guid? departmentId = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            Name = name,
            Term = "Học kỳ I",
            AcademicYear = "2025 - 2026",
            Status = status,
            DepartmentId = departmentId,
            CreatedAt = DateTime.UtcNow,
        };

    [Fact]
    public async Task CloseSemesterAsync_ShouldNotLockStudentsWithOpenInternshipInAnotherSemester()
    {
        var db = GetDb();
        var service = new SemesterService(db);

        var semesterA = NewSemester("Kỳ A", SemesterStatus.Active);
        var semesterB = NewSemester("Kỳ B", SemesterStatus.Active);

        // SV1 trùng 2 kỳ (còn internship mở ở kỳ B) — SV2 chỉ ở kỳ A.
        var busyUser = new User { Id = Guid.NewGuid(), Username = "busy", PasswordHash = "h", Role = Role.Student, IsActive = true, FullName = "Busy", CreatedAt = DateTime.UtcNow };
        var onlyUser = new User { Id = Guid.NewGuid(), Username = "only", PasswordHash = "h", Role = Role.Student, IsActive = true, FullName = "Only", CreatedAt = DateTime.UtcNow };
        var busyStudent = new Student { Id = Guid.NewGuid(), UserId = busyUser.Id, StudentCode = "SV01", FullName = "Busy", CreatedAt = DateTime.UtcNow };
        var onlyStudent = new Student { Id = Guid.NewGuid(), UserId = onlyUser.Id, StudentCode = "SV02", FullName = "Only", CreatedAt = DateTime.UtcNow };

        await db.Semesters.AddRangeAsync(semesterA, semesterB);
        await db.Users.AddRangeAsync(busyUser, onlyUser);
        await db.Students.AddRangeAsync(busyStudent, onlyStudent);
        await db.Internships.AddRangeAsync(
            new Internship { Id = Guid.NewGuid(), StudentId = busyStudent.Id, SemesterId = semesterA.Id, Status = InternshipStatus.InProgress, CreatedAt = DateTime.UtcNow },
            new Internship { Id = Guid.NewGuid(), StudentId = busyStudent.Id, SemesterId = semesterB.Id, Status = InternshipStatus.InProgress, CreatedAt = DateTime.UtcNow },
            new Internship { Id = Guid.NewGuid(), StudentId = onlyStudent.Id, SemesterId = semesterA.Id, Status = InternshipStatus.InProgress, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var result = await service.CloseSemesterAsync(semesterA.Id);

        result.Should().BeTrue();
        semesterA.Status.Should().Be(SemesterStatus.Completed);
        // SV còn internship mở ở kỳ B (Active) → giữ active; SV chỉ ở kỳ A → bị khóa.
        busyUser.IsActive.Should().BeTrue();
        onlyUser.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteSemesterAsync_ShouldSoftDeleteChildRecords()
    {
        var db = GetDb();
        var service = new SemesterService(db);

        var semester = NewSemester("Kỳ bị xóa", SemesterStatus.Upcoming);
        await db.Semesters.AddAsync(semester);
        await db.Internships.AddAsync(new Internship { Id = Guid.NewGuid(), StudentId = Guid.NewGuid(), SemesterId = semester.Id, Status = InternshipStatus.NotStarted, CreatedAt = DateTime.UtcNow });
        await db.SemesterReportSchedules.AddAsync(new SemesterReportSchedule { Id = Guid.NewGuid(), SemesterId = semester.Id, WeekNumber = 1, Title = "Tuần 1", DueDate = DateTime.UtcNow.AddDays(7), IsSubmissionOpen = true, CreatedAt = DateTime.UtcNow });
        await db.SemesterLecturers.AddAsync(new SemesterLecturer { Id = Guid.NewGuid(), SemesterId = semester.Id, LecturerId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow });
        await db.SemesterCompanies.AddAsync(new SemesterCompany { Id = Guid.NewGuid(), SemesterId = semester.Id, CompanyId = Guid.NewGuid(), IsActive = true, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var result = await service.DeleteSemesterAsync(semester.Id);

        result.Should().BeTrue();
        semester.IsDeleted.Should().BeTrue();
        // Con cũng bị soft-delete — báo cáo query theo semesterId không còn thấy dữ liệu mồ côi.
        (await db.Internships.CountAsync(i => i.SemesterId == semester.Id && !i.IsDeleted)).Should().Be(0);
        (await db.SemesterReportSchedules.CountAsync(rs => rs.SemesterId == semester.Id && !rs.IsDeleted)).Should().Be(0);
        (await db.SemesterLecturers.CountAsync(sl => sl.SemesterId == semester.Id && !sl.IsDeleted)).Should().Be(0);
        (await db.SemesterCompanies.CountAsync(sc => sc.SemesterId == semester.Id && !sc.IsDeleted)).Should().Be(0);
    }

    [Fact]
    public async Task GetActiveSemesterAsync_ShouldPreferDepartmentSemester_ShouldNotWriteDb()
    {
        var db = GetDb();
        var service = new SemesterService(db);

        var deptA = Guid.NewGuid();
        var deptB = Guid.NewGuid();
        var shared = NewSemester("Kỳ dùng chung", SemesterStatus.Active);
        var ownA = NewSemester("Kỳ khoa A", SemesterStatus.Active, deptA);
        // Internship NotStarted trong kỳ khoa A: GET KHÔNG được tự chuyển sang InProgress (side-effect cũ).
        var pending = new Student { Id = Guid.NewGuid(), StudentCode = "SV10", FullName = "Pending", CreatedAt = DateTime.UtcNow };
        await db.Semesters.AddRangeAsync(shared, ownA);
        await db.Students.AddAsync(pending);
        await db.Internships.AddAsync(new Internship { Id = Guid.NewGuid(), StudentId = pending.Id, SemesterId = ownA.Id, Status = InternshipStatus.NotStarted, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        // Khoa B không có kỳ riêng → nhận kỳ dùng chung.
        var forB = await service.GetActiveSemesterAsync(deptB);
        forB!.Id.Should().Be(shared.Id);

        // Khoa A có kỳ riêng → ưu tiên kỳ khoa A.
        var forA = await service.GetActiveSemesterAsync(deptA);
        forA!.Id.Should().Be(ownA.Id);

        // Thuần đọc: internship NotStarted giữ nguyên trạng thái.
        (await db.Internships.CountAsync(i => i.Status == InternshipStatus.NotStarted)).Should().Be(1);
    }
}

