using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace InternLink.Tests.Services;

/// <summary>
/// Flow quan trọng: Superadmin tạo năm học + các học kỳ (1 năm 3 học kỳ) đặt mốc thời gian
/// và suy ra thứ tự tuần; Admin khoa tạo kỳ thực tập chọn năm học, học kỳ, tuần đầu/tuần
/// kết thúc suy ra số tuần và số lượng sinh viên (chỉ tiêu).
/// </summary>
public class SchoolAcademicTermServiceTests
{
    private static AppDbContext GetDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            // Service dùng transaction cho batch tạo năm học; InMemory không hỗ trợ → bỏ qua warning.
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new AppDbContext(options);
    }

    private static CreateAcademicYearRequest ValidYearRequest(string academicYear = "2026 - 2027") => new()
    {
        AcademicYear = academicYear,
        Term1Start = new DateTime(2026, 9, 1),
        Term1End = new DateTime(2027, 1, 15),   // 137 ngày → 20 tuần
        Term2Start = new DateTime(2027, 1, 18),
        Term2End = new DateTime(2027, 5, 31),   // 134 ngày → 20 tuần
        SummerStart = new DateTime(2027, 6, 7),
        SummerEnd = new DateTime(2027, 7, 18),  // 42 ngày → 6 tuần
    };

    // ══ 1. Superadmin tạo nhanh cả năm học (3 học kỳ) ════════════════════

    [Fact]
    public async Task CreateAcademicYearAsync_ShouldCreateAllThreeTermsWithDerivedWeeks()
    {
        var db = GetDb();
        var service = new SchoolAcademicTermService(db);

        var result = await service.CreateAcademicYearAsync(ValidYearRequest());

        result.AcademicYear.Should().Be("2026 - 2027");
        result.Terms.Should().HaveCount(3);

        var term1 = result.Terms.Single(t => t.Term == "Học kỳ I");
        var term2 = result.Terms.Single(t => t.Term == "Học kỳ II");
        var summer = result.Terms.Single(t => t.Term == "Học kỳ Hè");

        // Suy ra số tuần: block 7 ngày từ StartDate → EndDate (công thức (days + 6) / 7).
        term1.StartDate.Should().Be(new DateTime(2026, 9, 1));
        term1.EndDate.Should().Be(new DateTime(2027, 1, 15));
        term1.TotalWeeks.Should().Be(20);
        term2.TotalWeeks.Should().Be(20);
        summer.TotalWeeks.Should().Be(6);

        // Đã lưu DB thật.
        (await db.SchoolAcademicTerms.CountAsync(t => !t.IsDeleted && t.AcademicYear == "2026 - 2027"))
            .Should().Be(3);
    }

    [Fact]
    public async Task CreateAcademicYearAsync_OverlappingTerms_ShouldRejectAll()
    {
        var db = GetDb();
        var service = new SchoolAcademicTermService(db);
        var request = ValidYearRequest();
        request.Term2Start = request.Term1End; // chồng lấn: HK II bắt đầu đúng ngày HK I kết thúc

        var act = () => service.CreateAcademicYearAsync(request);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Học kỳ II phải bắt đầu sau khi Học kỳ I kết thúc.");
        // Atomic: không có học kỳ nào được tạo nửa chừng.
        (await db.SchoolAcademicTerms.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task CreateAcademicYearAsync_YearAlreadyConfigured_ShouldReject()
    {
        var db = GetDb();
        var service = new SchoolAcademicTermService(db);
        await service.CreateAcademicYearAsync(ValidYearRequest());

        var act = () => service.CreateAcademicYearAsync(ValidYearRequest());

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Năm học 2026 - 2027 đã có cấu hình học kỳ (Học kỳ I, Học kỳ II, Học kỳ Hè). Không thể tạo trùng.");
    }

    [Fact]
    public async Task CreateAcademicYearAsync_TermEndBeforeStart_ShouldRejectThatTerm()
    {
        var db = GetDb();
        var service = new SchoolAcademicTermService(db);
        var request = ValidYearRequest();
        request.SummerEnd = request.SummerStart.AddDays(-1);

        var act = () => service.CreateAcademicYearAsync(request);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Học kỳ Hè: ngày bắt đầu phải trước hoặc trùng ngày kết thúc.");
    }

    // ══ 2. Admin khoa tạo kỳ thực tập dựa trên khung học kỳ ══════════════

    [Fact]
    public async Task CreateSemesterAsync_WeeksInsideSchoolTermFrame_ShouldSucceedAndDeriveCount()
    {
        var db = GetDb();
        var term = new SchoolAcademicTerm
        {
            Id = Guid.NewGuid(),
            AcademicYear = "2026 - 2027",
            Term = "Học kỳ I",
            StartDate = new DateTime(2026, 9, 1),
            EndDate = new DateTime(2027, 1, 15),
            CreatedAt = DateTime.UtcNow
        };
        db.SchoolAcademicTerms.Add(term);
        await db.SaveChangesAsync();

        var semesterService = new SemesterService(db);

        // Admin khoa: thực tập tuần 10 → 15 (6 tuần) của HK 20 tuần, chỉ tiêu 350 SV.
        var dto = new CreateSemesterDto
        {
            Name = "Thực tập Tốt nghiệp HK I 2026-2027",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            InternshipStartWeek = 10,
            TotalWeeks = 6,
            TargetStudents = 350,
            Status = SemesterStatus.Upcoming,
            DepartmentId = Guid.NewGuid()
        };

        var created = await semesterService.CreateSemesterAsync(dto);

        // Ngày kỳ = ngày khung học kỳ do superadmin cấu hình (không nhận tự do).
        created.StartDate.Should().Be(term.StartDate);
        created.EndDate.Should().Be(term.EndDate);
        created.TargetStudents.Should().Be(350);
        created.InternshipStartWeek.Should().Be(10);
        created.TotalWeeks.Should().Be(6);

        // Lịch báo cáo mặc định sinh đúng số tuần, mốc ngày theo InternshipStartWeek.
        var schedules = (await semesterService.GetReportSchedulesAsync(created.Id)).ToList();
        schedules.Should().HaveCount(7); // 6 tuần + 1 báo cáo cuối kỳ
        schedules[0].StartDate.Should().Be(term.StartDate.AddDays(9 * 7)); // tuần HK thứ 10

        var dbSemester = await db.Semesters.FindAsync(created.Id);
        dbSemester!.TargetStudents.Should().Be(350);
    }

    [Fact]
    public async Task CreateSemesterAsync_WeekRangeExceedsSchoolTermFrame_ShouldReject()
    {
        var db = GetDb();
        db.SchoolAcademicTerms.Add(new SchoolAcademicTerm
        {
            Id = Guid.NewGuid(),
            AcademicYear = "2026 - 2027",
            Term = "Học kỳ I",
            StartDate = new DateTime(2026, 9, 1),
            EndDate = new DateTime(2027, 1, 15), // 20 tuần
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var act = () => new SemesterService(db).CreateSemesterAsync(new CreateSemesterDto
        {
            Name = "Kỳ vượt khung",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            InternshipStartWeek = 18,
            TotalWeeks = 6 // 18 + 6 - 1 = 23 > 20
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Khoảng tuần thực tập phải nằm trong Tuần 1 đến Tuần 20 của học kỳ.");
    }

    [Fact]
    public async Task CreateSemesterAsync_SchoolTermNotConfigured_ShouldRejectWithGuidance()
    {
        var db = GetDb();

        var act = () => new SemesterService(db).CreateSemesterAsync(new CreateSemesterDto
        {
            Name = "Kỳ chưa có khung",
            Term = "Học kỳ I",
            AcademicYear = "2030 - 2031",
            InternshipStartWeek = 1,
            TotalWeeks = 6
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Superadmin chưa cấu hình thời gian cho niên khóa và học kỳ đã chọn.");
    }

    [Fact]
    public async Task UpdateSemesterAsync_TargetStudents_ShouldUpdate()
    {
        var db = GetDb();
        db.SchoolAcademicTerms.Add(new SchoolAcademicTerm
        {
            Id = Guid.NewGuid(),
            AcademicYear = "2026 - 2027",
            Term = "Học kỳ I",
            StartDate = new DateTime(2026, 9, 1),
            EndDate = new DateTime(2027, 1, 15),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        var semesterService = new SemesterService(db);
        var created = await semesterService.CreateSemesterAsync(new CreateSemesterDto
        {
            Name = "Kỳ chỉ tiêu",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            InternshipStartWeek = 1,
            TotalWeeks = 6,
            TargetStudents = 100
        });

        var updated = await semesterService.UpdateSemesterAsync(created.Id, new UpdateSemesterDto
        {
            TargetStudents = 250
        });

        updated!.TargetStudents.Should().Be(250);
        (await db.Semesters.FindAsync(created.Id))!.TargetStudents.Should().Be(250);
    }

    // ══ CRUD đơn của khung học kỳ ════════════════════════════════════════

    [Fact]
    public async Task CreateAsync_DuplicateYearTerm_ShouldReject()
    {
        var db = GetDb();
        var service = new SchoolAcademicTermService(db);
        var request = new SaveSchoolAcademicTermRequest
        {
            AcademicYear = "2026 - 2027",
            Term = "Học kỳ I",
            StartDate = new DateTime(2026, 9, 1),
            EndDate = new DateTime(2027, 1, 15)
        };
        await service.CreateAsync(request);

        var act = () => service.CreateAsync(request);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Khung thời gian học kỳ này đã tồn tại.");
    }

    [Fact]
    public async Task CreateAsync_StartAfterEnd_ShouldReject()
    {
        var db = GetDb();
        var service = new SchoolAcademicTermService(db);

        var act = () => service.CreateAsync(new SaveSchoolAcademicTermRequest
        {
            AcademicYear = "2026 - 2027",
            Term = "Học kỳ Hè",
            StartDate = new DateTime(2027, 7, 1),
            EndDate = new DateTime(2027, 6, 1)
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Ngày bắt đầu phải trước hoặc trùng ngày kết thúc.");
    }

    [Fact]
    public async Task UpdateAsync_ChangeDates_ShouldRecomputeTotalWeeks()
    {
        var db = GetDb();
        var service = new SchoolAcademicTermService(db);
        var created = await service.CreateAsync(new SaveSchoolAcademicTermRequest
        {
            AcademicYear = "2026 - 2027",
            Term = "Học kỳ Hè",
            StartDate = new DateTime(2027, 6, 7),
            EndDate = new DateTime(2027, 7, 18) // 6 tuần
        });

        var updated = await service.UpdateAsync(created.Id, new SaveSchoolAcademicTermRequest
        {
            AcademicYear = "2026 - 2027",
            Term = "Học kỳ Hè",
            StartDate = new DateTime(2027, 6, 7),
            EndDate = new DateTime(2027, 8, 15) // 70 ngày → 10 tuần
        });

        updated.Should().NotBeNull();
        updated!.TotalWeeks.Should().Be(10);
    }
}
