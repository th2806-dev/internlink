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

    public async Task<SemesterDto?> GetActiveSemesterAsync()
    {
        var semester = await _context.Semesters
            .Where(s => !s.IsDeleted && s.Status == SemesterStatus.Active)
            .Include(s => s.Internships)
            .Include(s => s.SemesterLecturers)
            .OrderByDescending(s => s.UpdatedAt ?? s.CreatedAt)
            .FirstOrDefaultAsync();

        if (semester == null)
            return null;

        var pendingInternships = await _context.Internships
            .Where(i => !i.IsDeleted && i.SemesterId == semester.Id && i.Status == InternshipStatus.NotStarted)
            .ToListAsync();

        foreach (var internship in pendingInternships)
        {
            internship.Status = InternshipStatus.InProgress;
            internship.StartDate ??= semester.StartDate;
            internship.EndDate ??= semester.EndDate;
            internship.UpdatedAt = DateTime.UtcNow;
        }

        if (pendingInternships.Count > 0)
            await _context.SaveChangesAsync();

        return MapToDto(semester);
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

        // Optionally lock student user accounts belonging to this semester
        var studentUserIds = await _context.Internships
            .Where(i => i.SemesterId == id && !i.IsDeleted && i.Student.UserId != null)
            .Select(i => i.Student.UserId!.Value)
            .Distinct()
            .ToListAsync();

        if (studentUserIds.Count > 0)
        {
            var users = await _context.Users
                .Where(u => studentUserIds.Contains(u.Id) && !u.IsDeleted)
                .ToListAsync();

            foreach (var u in users)
            {
                u.IsActive = false; // Closed term students are deactivated
                u.UpdatedAt = DateTime.UtcNow;
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

        semester.IsDeleted = true;
        semester.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<SemesterReportScheduleDto>> GetReportSchedulesAsync(Guid semesterId)
    {
        var schedules = await _context.SemesterReportSchedules
            .Where(s => s.SemesterId == semesterId && !s.IsDeleted)
            .OrderBy(s => s.WeekNumber)
            .ToListAsync();

        if (schedules.Count == 0)
        {
            var semester = await _context.Semesters.FirstOrDefaultAsync(s => s.Id == semesterId && !s.IsDeleted);
            if (semester != null)
            {
                return await GenerateDefaultSchedulesAsync(semesterId);
            }
        }

        return schedules.Select(s => new SemesterReportScheduleDto
        {
            Id = s.Id,
            SemesterId = s.SemesterId,
            WeekNumber = s.WeekNumber,
            Title = s.Title,
            StartDate = s.StartDate,
            DueDate = s.DueDate,
            IsSubmissionOpen = s.IsSubmissionOpen,
            AllowLateSubmission = s.AllowLateSubmission,
            Description = s.Description,
            IsFinalReport = s.WeekNumber > (s.Semester?.TotalWeeks ?? C23_DEFAULT_TOTAL_WEEKS)
        });
    }

    private const int C23_DEFAULT_TOTAL_WEEKS = 6;

    public async Task<IEnumerable<SemesterReportScheduleDto>> GenerateDefaultSchedulesAsync(Guid semesterId)
    {
        var semester = await _context.Semesters
            .Include(s => s.ReportSchedules)
            .FirstOrDefaultAsync(s => s.Id == semesterId && !s.IsDeleted);

        if (semester == null)
            throw new KeyNotFoundException($"Semester with ID {semesterId} not found");

        var existingSchedules = await _context.SemesterReportSchedules
            .Where(s => s.SemesterId == semesterId && !s.IsDeleted)
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

        var allSchedules = await _context.SemesterReportSchedules
            .Include(s => s.Semester)
            .Where(s => s.SemesterId == semesterId && !s.IsDeleted)
            .OrderBy(s => s.WeekNumber)
            .ToListAsync();

        return allSchedules.Select(s => new SemesterReportScheduleDto
        {
            Id = s.Id,
            SemesterId = s.SemesterId,
            WeekNumber = s.WeekNumber,
            Title = s.Title,
            StartDate = s.StartDate,
            DueDate = s.DueDate,
            IsSubmissionOpen = s.IsSubmissionOpen,
            AllowLateSubmission = s.AllowLateSubmission,
            Description = s.Description,
            IsFinalReport = s.WeekNumber > (s.Semester?.TotalWeeks ?? C23_DEFAULT_TOTAL_WEEKS)
        });
    }

    public async Task<SemesterReportScheduleDto> UpdateReportScheduleAsync(Guid semesterId, int weekNumber, UpdateReportScheduleRequest request)
    {
        var schedule = await _context.SemesterReportSchedules
            .FirstOrDefaultAsync(s => s.SemesterId == semesterId && s.WeekNumber == weekNumber && !s.IsDeleted);

        if (schedule == null)
        {
            var semester = await _context.Semesters.FirstOrDefaultAsync(s => s.Id == semesterId && !s.IsDeleted);
            if (semester == null)
                throw new KeyNotFoundException($"Semester with ID {semesterId} not found");

            var startDate = (semester.StartDate ?? DateTime.UtcNow)
                .AddDays((semester.InternshipStartWeek - 1) * 7);
            schedule = new SemesterReportSchedule
            {
                Id = Guid.NewGuid(),
                SemesterId = semesterId,
                WeekNumber = weekNumber,
                Title = request.Title ?? (weekNumber > C23_DEFAULT_TOTAL_WEEKS ? "Báo cáo cuối kỳ" : $"Báo cáo tuần {weekNumber}"),
                StartDate = request.StartDate ?? startDate.AddDays((weekNumber - 1) * 7).Date,
                DueDate = request.DueDate ?? startDate.AddDays(weekNumber * 7).Date.AddHours(23).AddMinutes(59).AddSeconds(59),
                IsSubmissionOpen = request.IsSubmissionOpen ?? true,
                AllowLateSubmission = request.AllowLateSubmission ?? true,
                Description = request.Description,
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
            WeekNumber = schedule.WeekNumber,
            Title = schedule.Title,
            StartDate = schedule.StartDate,
            DueDate = schedule.DueDate,
            IsSubmissionOpen = schedule.IsSubmissionOpen,
            AllowLateSubmission = schedule.AllowLateSubmission,
            Description = schedule.Description
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
}
