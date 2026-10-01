using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public class SemesterService : ISemesterService
{
    private readonly AppDbContext _context;

    public SemesterService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<SemesterDto>> GetAllSemestersAsync(Guid? departmentId = null)
    {
        var query = _context.Semesters.Where(s => !s.IsDeleted);

        // DepartmentAdmin: see their department's semesters plus legacy shared ones (DepartmentId = null).
        // Each department manages its own terms; shared terms are view-only for them.
        if (departmentId.HasValue)
            query = query.Where(s => s.DepartmentId == departmentId.Value || s.DepartmentId == null);

        var semesters = await query
            .Include(s => s.Internships)
            .Include(s => s.SemesterLecturers)
            .OrderByDescending(s => s.Status == SemesterStatus.Active)
            .ThenByDescending(s => s.CreatedAt)
            .ToListAsync();

        return semesters.Select(MapToDto);
    }

    /// <summary>
    /// Kỳ đang Active cho portal/người dùng cuối. Thuần đọc (audit mục 4.1: GET không còn
    /// side-effect ghi DB). Ưu tiên kỳ riêng của khoa (DepartmentId = departmentId),
    /// fallback kỳ dùng chung (DepartmentId = null).
    /// </summary>
    public async Task<SemesterDto?> GetActiveSemesterAsync(Guid? departmentId = null)
    {
        var query = _context.Semesters
            .AsNoTracking()
            .Where(s => !s.IsDeleted && s.Status == SemesterStatus.Active);

        if (departmentId.HasValue)
        {
            // Ưu tiên kỳ riêng của khoa trước kỳ dùng chung.
            query = query.Where(s => s.DepartmentId == departmentId.Value || s.DepartmentId == null)
                .OrderBy(s => s.DepartmentId == null);
        }

        var semester = await query
            .OrderByDescending(s => s.UpdatedAt ?? s.CreatedAt)
            .FirstOrDefaultAsync();

        return semester == null ? null : MapToDto(semester);
    }

    public async Task<SemesterDto?> GetSemesterByIdAsync(Guid id)
    {
        var semester = await _context.Semesters
            .Where(s => s.Id == id && !s.IsDeleted)
            .Include(s => s.Internships)
            .Include(s => s.SemesterLecturers)
            .FirstOrDefaultAsync();

        return semester == null ? null : MapToDto(semester);
    }

    public async Task<SemesterDto> CreateSemesterAsync(CreateSemesterDto dto)
    {
        ValidateInternshipPeriodInSemester(dto.StartDate, dto.EndDate, Math.Clamp(dto.InternshipStartWeek, 1, 52), Math.Clamp(dto.TotalWeeks, 1, 52));

        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Term = dto.Term,
            AcademicYear = dto.AcademicYear,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Status = dto.Status,
            Description = dto.Description,
            MaxStudentsPerLecturer = dto.MaxStudentsPerLecturer,
            TotalWeeks = Math.Clamp(dto.TotalWeeks, 1, 52),
            InternshipStartWeek = Math.Clamp(dto.InternshipStartWeek, 1, 52),
            DepartmentId = dto.DepartmentId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Semesters.Add(semester);
        await _context.SaveChangesAsync();

        await GenerateDefaultSchedulesAsync(semester.Id);

        return MapToDto(semester);
    }

    public async Task<SemesterDto?> UpdateSemesterAsync(Guid id, UpdateSemesterDto dto)
    {
        var semester = await _context.Semesters
            .Where(s => s.Id == id && !s.IsDeleted)
            .Include(s => s.Internships)
            .Include(s => s.SemesterLecturers)
            .FirstOrDefaultAsync();

        if (semester == null)
            return null;

        var originalStartDate = semester.StartDate;
        var originalEndDate = semester.EndDate;

        if (dto.Name != null) semester.Name = dto.Name;
        if (dto.Term != null) semester.Term = dto.Term;
        if (dto.AcademicYear != null) semester.AcademicYear = dto.AcademicYear;
        if (dto.StartDate.HasValue) semester.StartDate = dto.StartDate.Value;
        if (dto.EndDate.HasValue) semester.EndDate = dto.EndDate.Value;
        if (dto.Status.HasValue) semester.Status = dto.Status.Value;
        if (dto.Description != null) semester.Description = dto.Description;
        if (dto.MaxStudentsPerLecturer.HasValue) semester.MaxStudentsPerLecturer = dto.MaxStudentsPerLecturer.Value;
        if (dto.TotalWeeks.HasValue) semester.TotalWeeks = Math.Clamp(dto.TotalWeeks.Value, 1, 52);
        if (dto.InternshipStartWeek.HasValue) semester.InternshipStartWeek = Math.Clamp(dto.InternshipStartWeek.Value, 1, 52);

        // Chặn lưu khi giai đoạn thực tập vượt EndDate (dùng giá trị hiệu lực sau cập nhật)
        ValidateInternshipPeriodInSemester(semester.StartDate, semester.EndDate, semester.InternshipStartWeek, semester.TotalWeeks);

        // Đồng bộ ngày internship khi admin đổi StartDate/EndDate SAU khi start kỳ:
        // internship được copy ngày từ kỳ đúng MỘT LẦN lúc start (StartDate ??= ...), nên nếu
        // không sync thì toàn bộ trang SV/GV hiện ngày cũ. Chỉ tự sync khi kỳ CHƯA CÓ hoạt
        // động thật (báo cáo đã nộp, bài nộp, buổi điểm danh) — tránh xô lệch dữ liệu lịch sử.
        var datesChanged = dto.StartDate.HasValue && dto.StartDate.Value != originalStartDate
            || dto.EndDate.HasValue && dto.EndDate.Value != originalEndDate;
        if (datesChanged)
        {
            var internshipIds = await _context.Internships
                .Where(i => !i.IsDeleted && i.SemesterId == id)
                .Select(i => i.Id)
                .ToListAsync();
            var hasRealActivity = (internshipIds.Count > 0 && await _context.WeeklyReports
                    .AnyAsync(r => !r.IsDeleted && internshipIds.Contains(r.InternshipId) && r.Status != WeeklyReportStatus.Draft))
                || (internshipIds.Count > 0 && await _context.Submissions
                    .AnyAsync(s => !s.IsDeleted && internshipIds.Contains(s.InternshipId)))
                || await _context.AttendanceSessions.AnyAsync(a => !a.IsDeleted && a.SemesterId == id);
            if (hasRealActivity)
            {
                throw new InvalidOperationException(
                    "Không thể đổi ngày học kỳ sau khi đã có báo cáo, bài nộp hoặc điểm danh. Hãy xử lý dữ liệu hoạt động trước.");
            }

            foreach (var internship in semester.Internships.Where(i => !i.IsDeleted))
            {
                internship.StartDate = semester.StartDate;
                internship.EndDate = semester.EndDate;
                internship.UpdatedAt = DateTime.UtcNow;
            }
        }

        semester.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToDto(semester);
    }

    public async Task<SemesterDto?> StartSemesterAsync(Guid id)
    {
        var semester = await _context.Semesters
            .Where(s => s.Id == id && !s.IsDeleted)
            .Include(s => s.Internships)
            .Include(s => s.SemesterLecturers)
            .FirstOrDefaultAsync();

        if (semester == null)
            return null;

        if (semester.Status == SemesterStatus.Completed)
            throw new InvalidOperationException("A completed semester cannot be started again.");

        // "One active semester" constraint is scoped per department:
        // each department runs its own terms independently.
        var anotherActiveSemesterExists = await _context.Semesters
            .AnyAsync(s => s.Id != id && !s.IsDeleted && s.Status == SemesterStatus.Active && s.DepartmentId == semester.DepartmentId);
        if (anotherActiveSemesterExists)
        {
            var activeSemesterName = await _context.Semesters
                .Where(s => s.Id != id && !s.IsDeleted && s.Status == SemesterStatus.Active && s.DepartmentId == semester.DepartmentId)
                .Select(s => s.Name)
                .FirstOrDefaultAsync();
            throw new InvalidOperationException(
                $"Không thể bắt đầu kỳ này vì kỳ \"{activeSemesterName ?? "khác"}\" đang hoạt động. Hãy đóng kỳ hiện tại trước.");
        }

        semester.Status = SemesterStatus.Active;

        var internships = await _context.Internships
            .Where(i => !i.IsDeleted && i.SemesterId == id)
            .ToListAsync();
        foreach (var internship in internships)
        {
            if (internship.Status == InternshipStatus.NotStarted)
                internship.Status = InternshipStatus.InProgress;
            internship.StartDate ??= semester.StartDate;
            internship.EndDate ??= semester.EndDate;
            internship.UpdatedAt = DateTime.UtcNow;
        }

        var lecturerIds = await _context.SemesterLecturers
            .Where(link => link.SemesterId == id && !link.IsDeleted)
            .Select(link => link.LecturerId)
            .Distinct()
            .ToListAsync();
        var internshipLecturerIds = internships
            .Where(i => i.LecturerId.HasValue)
            .Select(i => i.LecturerId!.Value)
            .Distinct()
            .ToList();
        lecturerIds.AddRange(internshipLecturerIds);
        var studentIds = internships.Select(i => i.StudentId).Distinct().ToList();
        var userIds = await _context.Lecturers
            .Where(lecturer => lecturerIds.Contains(lecturer.Id) && lecturer.UserId.HasValue)
            .Select(lecturer => lecturer.UserId!.Value)
            .ToListAsync();
        userIds.AddRange(
            await _context.Students
                .Where(student => studentIds.Contains(student.Id) && student.UserId.HasValue)
                .Select(student => student.UserId!.Value)
                .ToListAsync());
        userIds = userIds.Distinct().ToList();
        var users = await _context.Users
            .Where(user => userIds.Contains(user.Id) && !user.IsDeleted)
            .ToListAsync();
        foreach (var user in users)
        {
            user.IsActive = true;
            user.UpdatedAt = DateTime.UtcNow;
        }

        semester.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToDto(semester);
    }

    public async Task<bool> CloseSemesterAsync(Guid id)
    {
        var semester = await _context.Semesters
            .Where(s => s.Id == id && !s.IsDeleted)
            .FirstOrDefaultAsync();

        if (semester == null)
            return false;

        semester.Status = SemesterStatus.Completed;
        semester.UpdatedAt = DateTime.UtcNow;

        // Khóa account SV của kỳ này — NHƯNG chỉ SV không còn kỳ thực tập nào khác đang mở
        // (audit mục 4.3: SV trùng 2 kỳ không bị khóa oan khi 1 kỳ đóng).
        var closingStudentUserIds = await _context.Internships
            .Where(i => i.SemesterId == id && !i.IsDeleted && i.Student.UserId != null)
            .Select(i => i.Student.UserId!.Value)
            .Distinct()
            .ToListAsync();

        if (closingStudentUserIds.Count > 0)
        {
            // SV còn internship chưa kết thúc (không phải Completed/Graded) ở kỳ KHÁC đang mở → giữ active.
            var stillBusyUserIds = await _context.Internships
                .Where(i => !i.IsDeleted
                    && i.SemesterId != id
                    && closingStudentUserIds.Contains(i.Student.UserId!.Value)
                    && i.Status != InternshipStatus.Completed
                    && i.Status != InternshipStatus.Graded
                    && i.Semester!.Status == SemesterStatus.Active)
                .Select(i => i.Student.UserId!.Value)
                .Distinct()
                .ToListAsync();

            var userIdsToLock = closingStudentUserIds.Except(stillBusyUserIds).ToList();
            if (userIdsToLock.Count > 0)
            {
                var users = await _context.Users
                    .Where(u => userIdsToLock.Contains(u.Id) && !u.IsDeleted)
                    .ToListAsync();

                foreach (var u in users)
                {
                    u.IsActive = false; // Closed term students are deactivated
                    u.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteSemesterAsync(Guid id)
    {
        var semester = await _context.Semesters
            .Where(s => s.Id == id && !s.IsDeleted)
            .FirstOrDefaultAsync();

        if (semester == null)
            return false;

        // Soft-delete cả con (audit mục 4.2): báo cáo query trực tiếp theo semesterId
        // sẽ không còn "thấy" dữ liệu kỳ đã xóa, không còn dữ liệu mồ côi.
        var now = DateTime.UtcNow;

        var childInternships = await _context.Internships
            .Where(i => i.SemesterId == id && !i.IsDeleted)
            .ToListAsync();
        foreach (var i in childInternships) { i.IsDeleted = true; i.UpdatedAt = now; }

        var schedules = await _context.SemesterReportSchedules
            .Where(rs => rs.SemesterId == id && !rs.IsDeleted)
            .ToListAsync();
        foreach (var rs in schedules) { rs.IsDeleted = true; rs.UpdatedAt = now; }

        var semesterLecturers = await _context.SemesterLecturers
            .Where(sl => sl.SemesterId == id && !sl.IsDeleted)
            .ToListAsync();
        foreach (var sl in semesterLecturers) { sl.IsDeleted = true; sl.UpdatedAt = now; }

        var semesterCompanies = await _context.SemesterCompanies
            .Where(sc => sc.SemesterId == id && !sc.IsDeleted)
            .ToListAsync();
        foreach (var sc in semesterCompanies) { sc.IsDeleted = true; sc.UpdatedAt = now; }

        semester.IsDeleted = true;
        semester.UpdatedAt = now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<SemesterReportScheduleDto>> GetReportSchedulesAsync(Guid semesterId, Guid? lecturerId = null)
    {
        var allSchedules = await _context.SemesterReportSchedules
            .Include(s => s.Semester)
            .Where(s => s.SemesterId == semesterId && !s.IsDeleted && (s.LecturerId == lecturerId || s.LecturerId == null))
            .ToListAsync();

        if (allSchedules.Count == 0 && !lecturerId.HasValue)
        {
            var semester = await _context.Semesters.FirstOrDefaultAsync(s => s.Id == semesterId && !s.IsDeleted);
            if (semester != null)
            {
                return await GenerateDefaultSchedulesAsync(semesterId);
            }
        }

        var schedules = allSchedules
            .GroupBy(s => s.WeekNumber)
            .Select(g => g
                .OrderByDescending(s => lecturerId.HasValue && s.LecturerId == lecturerId)
                .ThenByDescending(s => s.UpdatedAt ?? s.CreatedAt)
                .ThenByDescending(s => s.CreatedAt)
                .First())
            .OrderBy(s => s.WeekNumber)
            .ToList();

        return schedules.Select(s => new SemesterReportScheduleDto
        {
            Id = s.Id,
            SemesterId = s.SemesterId,
            LecturerId = s.LecturerId,
            WeekNumber = s.WeekNumber,
            Title = s.Title,
            StartDate = s.StartDate.HasValue ? DateTime.SpecifyKind(s.StartDate.Value, DateTimeKind.Utc) : null,
            DueDate = DateTime.SpecifyKind(s.DueDate, DateTimeKind.Utc),
            IsSubmissionOpen = s.IsSubmissionOpen,
            AllowLateSubmission = s.AllowLateSubmission,
            Description = s.Description,
            IsFinalReport = s.WeekNumber > (s.Semester?.TotalWeeks ?? C23_DEFAULT_TOTAL_WEEKS)
        });
    }

    private const int C23_DEFAULT_TOTAL_WEEKS = 6;

    public async Task<IEnumerable<SemesterReportScheduleDto>> GenerateDefaultSchedulesAsync(Guid semesterId, Guid? lecturerId = null)
    {
        var semester = await _context.Semesters
            .Include(s => s.ReportSchedules)
            .FirstOrDefaultAsync(s => s.Id == semesterId && !s.IsDeleted);

        if (semester == null)
            throw new KeyNotFoundException(InternLink.Shared.Responses.ErrorMessage.SemesterNotFoundById(semesterId));

        var existingSchedules = await _context.SemesterReportSchedules
            .Where(s => s.SemesterId == semesterId && s.LecturerId == lecturerId && !s.IsDeleted)
            .ToListAsync();

        var existingWeeks = existingSchedules.Select(s => s.WeekNumber).ToHashSet();
        var totalWeeks = semester.TotalWeeks > 0 ? semester.TotalWeeks : C23_DEFAULT_TOTAL_WEEKS;
        var startDate = (semester.StartDate ?? DateTime.UtcNow)
            .AddDays((semester.InternshipStartWeek - 1) * 7);

        var newSchedules = new List<SemesterReportSchedule>();
        for (int week = 1; week <= totalWeeks; week++)
        {
            if (!existingWeeks.Contains(week))
            {
                var schedule = new SemesterReportSchedule
                {
                    Id = Guid.NewGuid(),
                    SemesterId = semesterId,
                    LecturerId = lecturerId,
                    WeekNumber = week,
                    Title = $"Báo cáo tuần {week}",
                    StartDate = startDate.AddDays((week - 1) * 7).Date,
                    DueDate = startDate.AddDays(week * 7).Date.AddHours(23).AddMinutes(59).AddSeconds(59),
                    IsSubmissionOpen = true,
                    AllowLateSubmission = true,
                    Description = $"Hạn nộp báo cáo kết quả thực tập tuần thứ {week}.",
                    CreatedAt = DateTime.UtcNow
                };
                newSchedules.Add(schedule);
                _context.SemesterReportSchedules.Add(schedule);
            }
        }

        // Báo cáo cuối kỳ — tuần số quy ước = totalWeeks + 1 (cột NỘP BC trong template C23)
        var finalWeek = totalWeeks + 1;
        if (!existingWeeks.Contains(finalWeek))
        {
            var finalSchedule = new SemesterReportSchedule
            {
                Id = Guid.NewGuid(),
                SemesterId = semesterId,
                LecturerId = lecturerId,
                WeekNumber = finalWeek,
                Title = "Báo cáo cuối kỳ",
                StartDate = startDate.AddDays((totalWeeks - 1) * 7).Date,
                DueDate = startDate.AddDays(totalWeeks * 7 + 3).Date.AddHours(23).AddMinutes(59).AddSeconds(59),
                IsSubmissionOpen = true,
                AllowLateSubmission = true,
                Description = "Hạn nộp báo cáo tổng kết cuối kỳ thực tập tốt nghiệp.",
                CreatedAt = DateTime.UtcNow
            };
            newSchedules.Add(finalSchedule);
            _context.SemesterReportSchedules.Add(finalSchedule);
        }

        if (newSchedules.Count > 0)
        {
            await _context.SaveChangesAsync();
        }

        return await GetReportSchedulesAsync(semesterId, lecturerId);
    }

    public async Task<SemesterReportScheduleDto> UpdateReportScheduleAsync(Guid semesterId, int weekNumber, UpdateReportScheduleRequest request, Guid? lecturerId = null)
    {
        var schedule = await _context.SemesterReportSchedules
            .FirstOrDefaultAsync(s => s.SemesterId == semesterId && s.WeekNumber == weekNumber && s.LecturerId == lecturerId && !s.IsDeleted);

        if (schedule == null)
        {
            var semester = await _context.Semesters.FirstOrDefaultAsync(s => s.Id == semesterId && !s.IsDeleted);
            if (semester == null)
                throw new KeyNotFoundException(InternLink.Shared.Responses.ErrorMessage.SemesterNotFoundById(semesterId));

            // Kế thừa mốc từ default schedule nếu GV tạo mới đè lên default
            var defaultSchedule = await _context.SemesterReportSchedules
                .FirstOrDefaultAsync(s => s.SemesterId == semesterId && s.WeekNumber == weekNumber && s.LecturerId == null && !s.IsDeleted);

            var startDate = (semester.StartDate ?? DateTime.UtcNow)
                .AddDays((semester.InternshipStartWeek - 1) * 7);
            schedule = new SemesterReportSchedule
            {
                Id = Guid.NewGuid(),
                SemesterId = semesterId,
                LecturerId = lecturerId,
                WeekNumber = weekNumber,
                Title = request.Title ?? defaultSchedule?.Title ?? (weekNumber > C23_DEFAULT_TOTAL_WEEKS ? "Báo cáo cuối kỳ" : $"Báo cáo tuần {weekNumber}"),
                StartDate = request.StartDate ?? defaultSchedule?.StartDate ?? startDate.AddDays((weekNumber - 1) * 7).Date,
                DueDate = request.DueDate ?? defaultSchedule?.DueDate ?? startDate.AddDays(weekNumber * 7).Date.AddHours(23).AddMinutes(59).AddSeconds(59),
                IsSubmissionOpen = request.IsSubmissionOpen ?? defaultSchedule?.IsSubmissionOpen ?? true,
                AllowLateSubmission = request.AllowLateSubmission ?? defaultSchedule?.AllowLateSubmission ?? true,
                Description = request.Description ?? defaultSchedule?.Description,
                CreatedAt = DateTime.UtcNow
            };
            _context.SemesterReportSchedules.Add(schedule);
        }
        else
        {
            if (request.Title != null) schedule.Title = request.Title;
            if (request.StartDate.HasValue) schedule.StartDate = request.StartDate.Value;
            if (request.DueDate.HasValue) schedule.DueDate = request.DueDate.Value;
            if (request.IsSubmissionOpen.HasValue) schedule.IsSubmissionOpen = request.IsSubmissionOpen.Value;
            if (request.AllowLateSubmission.HasValue) schedule.AllowLateSubmission = request.AllowLateSubmission.Value;
            if (request.Description != null) schedule.Description = request.Description;
            schedule.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return new SemesterReportScheduleDto
        {
            Id = schedule.Id,
            SemesterId = schedule.SemesterId,
            LecturerId = schedule.LecturerId,
            WeekNumber = schedule.WeekNumber,
            Title = schedule.Title,
            StartDate = schedule.StartDate.HasValue ? DateTime.SpecifyKind(schedule.StartDate.Value, DateTimeKind.Utc) : null,
            DueDate = DateTime.SpecifyKind(schedule.DueDate, DateTimeKind.Utc),
            IsSubmissionOpen = schedule.IsSubmissionOpen,
            AllowLateSubmission = schedule.AllowLateSubmission,
            Description = schedule.Description,
            IsFinalReport = schedule.WeekNumber > (schedule.Semester?.TotalWeeks ?? C23_DEFAULT_TOTAL_WEEKS)
        };
    }

    private static SemesterDto MapToDto(Semester semester)
    {
        var validInternships = semester.Internships.Where(i => !i.IsDeleted).ToList();
        var studentsCount = validInternships.Count;

        // Lecturers = assigned via internships OR imported/registered via SemesterLecturers.
        var lecturerIds = validInternships
            .Where(i => i.LecturerId != null)
            .Select(i => i.LecturerId!.Value);
        if (semester.SemesterLecturers != null)
        {
            lecturerIds = lecturerIds.Concat(
                semester.SemesterLecturers.Where(sl => !sl.IsDeleted).Select(sl => sl.LecturerId));
        }
        var lecturersCount = lecturerIds.Distinct().Count();

        var companiesCount = validInternships.Select(i => i.CompanyId).Distinct().Count();
        var placedStudents = validInternships.Count(i => i.Status == InternshipStatus.InProgress || i.Status == InternshipStatus.Completed);

        var progressPercent = CalculateProgressPercent(semester);

        var currentPhase = semester.Status switch
        {
            SemesterStatus.Completed => "Đã hoàn thành & Khóa dữ liệu",
            SemesterStatus.Active => "Thực tập & Nộp báo cáo giữa kỳ",
            SemesterStatus.Upcoming => "Tiếp nhận hồ sơ & Phân công",
            _ => "Chuẩn bị danh sách"
        };

        return new SemesterDto
        {
            Id = semester.Id,
            Name = semester.Name,
            Term = semester.Term,
            AcademicYear = semester.AcademicYear,
            StartDate = semester.StartDate,
            EndDate = semester.EndDate,
            Status = semester.Status,
            Description = semester.Description,
            MaxStudentsPerLecturer = semester.MaxStudentsPerLecturer,
            TotalWeeks = semester.TotalWeeks,
            InternshipStartWeek = semester.InternshipStartWeek,
            DepartmentId = semester.DepartmentId,
            StudentsCount = studentsCount,
            LecturersCount = lecturersCount,
            PlacedStudents = placedStudents,
            CompaniesCount = companiesCount,
            ProgressPercent = progressPercent,
            CurrentPhase = currentPhase,
            CreatedAt = semester.CreatedAt
        };
    }

    private static int CalculateProgressPercent(Semester semester)
    {
        if (semester.Status == SemesterStatus.Completed) return 100;
        if (semester.Status != SemesterStatus.Active || !semester.StartDate.HasValue || !semester.EndDate.HasValue) return 0;
        var totalDays = (semester.EndDate.Value - semester.StartDate.Value).TotalDays;
        if (totalDays <= 0) return 0;
        var elapsedDays = (DateTime.UtcNow - semester.StartDate.Value).TotalDays;
        return Math.Clamp((int)Math.Round(elapsedDays / totalDays * 100), 0, 100);
    }

    /// <summary>
    /// Chặn cấu hình mâu thuẫn: nếu StartDate là NGÀY BẮT ĐẦU THỰC TẬP (trường hợp phổ biến)
    /// thì InternshipStartWeek phải = 1. Đặt > 1 sẽ đẩy toàn bộ giai đoạn thực tập
    /// (StartDate + (startWeek-1) tuần chờ + totalWeeks tuần thực tập) vượt qua EndDate —
    /// khi đó lịch buổi gặp/báo cáo tuần sẽ rơi ngoài kỳ và bị chặn 400 bởi validate ngày↔tuần.
    /// Chỉ áp dụng khi kỳ đã cấu hình đủ StartDate + EndDate.
    /// </summary>
    private static void ValidateInternshipPeriodInSemester(DateTime? startDate, DateTime? endDate, int internshipStartWeek, int totalWeeks)
    {
        if (!startDate.HasValue || !endDate.HasValue) return;

        var internshipPeriodEnd = startDate.Value.Date
            .AddDays((internshipStartWeek - 1) * 7)          // tuần chờ trước thực tập
            .AddDays(totalWeeks * 7 - 1);                    // tổng thời gian thực tập

        if (internshipPeriodEnd > endDate.Value.Date)
        {
            throw new InvalidOperationException(
                $"Cấu hình học kỳ mâu thuẫn: với ngày bắt đầu {startDate.Value:dd/MM/yyyy} và " +
                $"\"Tuần HK bắt đầu thực tập\" = {internshipStartWeek}, giai đoạn thực tập " +
                $"{totalWeeks} tuần sẽ kết thúc {internshipPeriodEnd:dd/MM/yyyy} — sau EndDate {endDate.Value:dd/MM/yyyy}. " +
                "Nếu StartDate là NGÀY BẮT ĐẦU THỰC TẬP thì đặt \"Tuần HK bắt đầu thực tập\" = 1, " +
                "hoặc tăng EndDate / giảm số tuần thực tập cho khớp.");
        }
    }
}
