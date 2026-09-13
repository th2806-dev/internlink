using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InternLink.Infrastructure.Services;

public class AttendanceService : IAttendanceService
{
    private readonly AppDbContext _context;
    private readonly ILogger<AttendanceService> _logger;

    public AttendanceService(AppDbContext context, ILogger<AttendanceService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<AttendanceSessionDto>> GetLecturerSessionsAsync(Guid lecturerId, Guid semesterId)
    {
        var sessions = await _context.AttendanceSessions
            .AsNoTracking()
            .Where(s => s.LecturerId == lecturerId && s.SemesterId == semesterId)
            .Include(s => s.Semester)
            .Include(s => s.Lecturer)
            .Include(s => s.Records)
            .OrderBy(s => s.WeekNumber)
            .ThenBy(s => s.MeetingDate)
            .ToListAsync();

        return sessions.Select(s => MapToSessionDto(s)).ToList();
    }

    public async Task<AttendanceSessionDetailDto?> GetSessionDetailAsync(Guid sessionId, Guid? lecturerId = null)
    {
        var query = _context.AttendanceSessions
            .AsNoTracking()
            .Where(s => s.Id == sessionId);

        if (lecturerId.HasValue)
        {
            query = query.Where(s => s.LecturerId == lecturerId.Value);
        }

        var session = await query
            .Include(s => s.Semester)
            .Include(s => s.Lecturer)
            .Include(s => s.Records)
                .ThenInclude(r => r.Student)
            .Include(s => s.Records)
                .ThenInclude(r => r.Internship)
                    .ThenInclude(i => i!.Company)
            .FirstOrDefaultAsync();

        if (session == null) return null;

        var dto = MapToSessionDetailDto(session);
        return dto;
    }

    public async Task<AttendanceSessionDetailDto> CreateSessionAsync(Guid lecturerId, CreateAttendanceSessionDto dto)
    {
        var semester = await _context.Semesters.FindAsync(dto.SemesterId);
        if (semester == null)
        {
            throw new KeyNotFoundException("Không tìm thấy học kỳ yêu cầu.");
        }

        var lecturer = await _context.Lecturers.FindAsync(lecturerId);
        if (lecturer == null)
        {
            throw new KeyNotFoundException("Không tìm thấy thông tin giảng viên.");
        }

        var session = new AttendanceSession
        {
            SemesterId = dto.SemesterId,
            LecturerId = lecturerId,
            WeekNumber = dto.WeekNumber,
            Title = string.IsNullOrWhiteSpace(dto.Title) ? $"Buổi gặp tuần {dto.WeekNumber}" : dto.Title.Trim(),
            Description = dto.Description?.Trim(),
            MeetingDate = dto.MeetingDate,
            DurationMinutes = dto.DurationMinutes ?? 60,
            Location = dto.Location?.Trim(),
            Status = AttendanceSessionStatus.Scheduled,
        };

        // Determine students to populate
        List<Internship> targetInternships;
        if (dto.StudentIds != null && dto.StudentIds.Any())
        {
            targetInternships = await _context.Internships
                .Where(i => i.SemesterId == dto.SemesterId && i.LecturerId == lecturerId && dto.StudentIds.Contains(i.StudentId))
                .ToListAsync();
        }
        else
        {
            // Default: All assigned students in this semester
            targetInternships = await _context.Internships
                .Where(i => i.SemesterId == dto.SemesterId && i.LecturerId == lecturerId)
                .ToListAsync();
        }

        foreach (var internship in targetInternships)
        {
            session.Records.Add(new AttendanceRecord
            {
                StudentId = internship.StudentId,
                InternshipId = internship.Id,
                Status = AttendanceStatus.Present,
            });
        }

        _context.AttendanceSessions.Add(session);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Lecturer {LecturerId} created attendance session {SessionId} with {Count} students",
            lecturerId, session.Id, session.Records.Count);

        var result = await GetSessionDetailAsync(session.Id, lecturerId);
        return result!;
    }

    public async Task<AttendanceSessionDetailDto> UpdateSessionAsync(Guid sessionId, Guid lecturerId, UpdateAttendanceSessionDto dto)
    {
        var session = await _context.AttendanceSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.LecturerId == lecturerId);

        if (session == null)
        {
            throw new KeyNotFoundException("Không tìm thấy buổi gặp hoặc bạn không có quyền chỉnh sửa.");
        }

        if (!string.IsNullOrWhiteSpace(dto.Title))
            session.Title = dto.Title.Trim();

        if (dto.Description != null)
            session.Description = dto.Description.Trim();

        if (dto.MeetingDate.HasValue)
            session.MeetingDate = dto.MeetingDate.Value;

        if (dto.DurationMinutes.HasValue)
            session.DurationMinutes = dto.DurationMinutes.Value;

        if (dto.Location != null)
            session.Location = dto.Location.Trim();

        if (!string.IsNullOrWhiteSpace(dto.Status) && Enum.TryParse<AttendanceSessionStatus>(dto.Status, true, out var parsedStatus))
        {
            session.Status = parsedStatus;
        }

        await _context.SaveChangesAsync();

        var result = await GetSessionDetailAsync(sessionId, lecturerId);
        return result!;
    }

    public async Task<bool> DeleteSessionAsync(Guid sessionId, Guid lecturerId)
    {
        var session = await _context.AttendanceSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.LecturerId == lecturerId);

        if (session == null)
            return false;

        _context.AttendanceSessions.Remove(session);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<AttendanceSessionDetailDto> MarkAttendanceAsync(Guid sessionId, Guid lecturerId, MarkAttendanceDto dto)
    {
        var session = await _context.AttendanceSessions
            .Include(s => s.Lecturer)
            .Include(s => s.Records)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.LecturerId == lecturerId);

        if (session == null)
        {
            throw new KeyNotFoundException("Không tìm thấy buổi gặp hoặc bạn không có quyền điểm danh.");
        }

        var markerName = session.Lecturer?.FullName ?? "Giảng viên";
        var now = DateTime.UtcNow;

        foreach (var item in dto.Records)
        {
            var record = session.Records.FirstOrDefault(r => r.StudentId == item.StudentId);
            if (record != null)
            {
                record.Status = string.Equals(item.Status, "Absent", StringComparison.OrdinalIgnoreCase)
                    ? AttendanceStatus.Absent
                    : AttendanceStatus.Present;

                record.Notes = item.Notes?.Trim();
                record.MarkedAt = now;
                record.MarkedBy = markerName;
            }
        }

        session.Status = AttendanceSessionStatus.Completed;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Lecturer {LecturerId} marked attendance for session {SessionId}", lecturerId, sessionId);

        var result = await GetSessionDetailAsync(sessionId, lecturerId);
        return result!;
    }

    public async Task<StudentAttendanceOverviewDto> GetStudentAttendanceAsync(Guid studentId, Guid semesterId)
    {
        var records = await _context.AttendanceRecords
            .AsNoTracking()
            .Where(r => r.StudentId == studentId && r.AttendanceSession.SemesterId == semesterId)
            .Include(r => r.AttendanceSession)
                .ThenInclude(s => s.Lecturer)
            .OrderBy(r => r.AttendanceSession.WeekNumber)
            .ThenBy(r => r.AttendanceSession.MeetingDate)
            .ToListAsync();

        var totalSessions = records.Count;
        var presentCount = records.Count(r => r.Status == AttendanceStatus.Present);
        var absentCount = records.Count(r => r.Status == AttendanceStatus.Absent);
        var rate = totalSessions > 0 ? Math.Round((double)presentCount / totalSessions * 100, 1) : 100.0;

        return new StudentAttendanceOverviewDto
        {
            TotalSessions = totalSessions,
            PresentCount = presentCount,
            AbsentCount = absentCount,
            AttendanceRate = rate,
            Sessions = records.Select(r => new StudentAttendanceItemDto
            {
                SessionId = r.AttendanceSessionId,
                WeekNumber = r.AttendanceSession.WeekNumber,
                Title = r.AttendanceSession.Title,
                Description = r.AttendanceSession.Description,
                MeetingDate = r.AttendanceSession.MeetingDate,
                DurationMinutes = r.AttendanceSession.DurationMinutes,
                Location = r.AttendanceSession.Location,
                LecturerName = r.AttendanceSession.Lecturer?.FullName ?? "Giảng viên",
                Status = r.Status.ToString(),
                Notes = r.Notes,
                MarkedAt = r.MarkedAt,
            }).ToList(),
        };
    }

    public async Task<AdminAttendanceReportDto> GetAdminAttendanceReportAsync(Guid semesterId)
    {
        var semester = await _context.Semesters.FindAsync(semesterId);
        var semesterName = semester?.Name ?? "Học kỳ";

        var sessions = await _context.AttendanceSessions
            .AsNoTracking()
            .Where(s => s.SemesterId == semesterId)
            .Include(s => s.Lecturer)
            .Include(s => s.Records)
                .ThenInclude(r => r.Student)
            .OrderBy(s => s.WeekNumber)
            .ToListAsync();

        var allRecords = sessions.SelectMany(s => s.Records).ToList();
        var totalRecords = allRecords.Count;
        var totalPresent = allRecords.Count(r => r.Status == AttendanceStatus.Present);
        var overallRate = totalRecords > 0 ? Math.Round((double)totalPresent / totalRecords * 100, 1) : 100.0;

        // Group by student to find absentees
        var studentGroups = allRecords
            .GroupBy(r => r.StudentId)
            .Select(g =>
            {
                var sample = g.First();
                var total = g.Count();
                var absent = g.Count(r => r.Status == AttendanceStatus.Absent);
                var absentRate = total > 0 ? Math.Round((double)absent / total * 100, 1) : 0.0;

                return new StudentAbsentSummaryDto
                {
                    StudentId = g.Key,
                    StudentName = sample.Student?.FullName ?? "Sinh viên",
                    StudentCode = sample.Student?.StudentCode ?? string.Empty,
                    Class = sample.Student?.Class,
                    LecturerName = sessions.FirstOrDefault(s => s.Id == sample.AttendanceSessionId)?.Lecturer?.FullName,
                    TotalSessions = total,
                    AbsentCount = absent,
                    AbsentRate = absentRate,
                };
            })
            .Where(s => s.AbsentCount > 0)
            .OrderByDescending(s => s.AbsentCount)
            .ThenByDescending(s => s.AbsentRate)
            .ToList();

        return new AdminAttendanceReportDto
        {
            SemesterId = semesterId,
            SemesterName = semesterName,
            TotalSessions = sessions.Count,
            TotalStudents = allRecords.Select(r => r.StudentId).Distinct().Count(),
            OverallAttendanceRate = overallRate,
            HighAbsentStudentsCount = studentGroups.Count(s => s.AbsentCount >= 2 || s.AbsentRate >= 30),
            TopAbsentees = studentGroups,
            Sessions = sessions.Select(s => MapToSessionDto(s)).ToList(),
        };
    }

    public async Task<List<AttendanceRecordDto>> GetStudentAttendanceForLecturerAsync(Guid lecturerId, Guid studentId, Guid semesterId)
    {
        var records = await _context.AttendanceRecords
            .AsNoTracking()
            .Where(r => r.StudentId == studentId &&
                        r.AttendanceSession.LecturerId == lecturerId &&
                        r.AttendanceSession.SemesterId == semesterId)
            .Include(r => r.AttendanceSession)
            .Include(r => r.Student)
            .Include(r => r.Internship)
                .ThenInclude(i => i!.Company)
            .OrderBy(r => r.AttendanceSession.WeekNumber)
            .ThenBy(r => r.AttendanceSession.MeetingDate)
            .ToListAsync();

        return records.Select(r => MapToRecordDto(r)).ToList();
    }

    // ---- Private Helpers ----

    private static AttendanceSessionDto MapToSessionDto(AttendanceSession s)
    {
        var total = s.Records.Count;
        var present = s.Records.Count(r => r.Status == AttendanceStatus.Present);
        var absent = s.Records.Count(r => r.Status == AttendanceStatus.Absent);
        var rate = total > 0 ? Math.Round((double)present / total * 100, 1) : 100.0;

        return new AttendanceSessionDto
        {
            Id = s.Id,
            SemesterId = s.SemesterId,
            SemesterName = s.Semester?.Name ?? string.Empty,
            LecturerId = s.LecturerId,
            LecturerName = s.Lecturer?.FullName ?? string.Empty,
            WeekNumber = s.WeekNumber,
            Title = s.Title,
            Description = s.Description,
            MeetingDate = s.MeetingDate,
            DurationMinutes = s.DurationMinutes,
            Location = s.Location,
            Status = s.Status.ToString(),
            TotalStudents = total,
            PresentCount = present,
            AbsentCount = absent,
            AttendanceRate = rate,
            CreatedAt = s.CreatedAt,
        };
    }

    private static AttendanceSessionDetailDto MapToSessionDetailDto(AttendanceSession s)
    {
        var baseDto = MapToSessionDto(s);
        return new AttendanceSessionDetailDto
        {
            Id = baseDto.Id,
            SemesterId = baseDto.SemesterId,
            SemesterName = baseDto.SemesterName,
            LecturerId = baseDto.LecturerId,
            LecturerName = baseDto.LecturerName,
            WeekNumber = baseDto.WeekNumber,
            Title = baseDto.Title,
            Description = baseDto.Description,
            MeetingDate = baseDto.MeetingDate,
            DurationMinutes = baseDto.DurationMinutes,
            Location = baseDto.Location,
            Status = baseDto.Status,
            TotalStudents = baseDto.TotalStudents,
            PresentCount = baseDto.PresentCount,
            AbsentCount = baseDto.AbsentCount,
            AttendanceRate = baseDto.AttendanceRate,
            CreatedAt = baseDto.CreatedAt,
            Records = s.Records.Select(r => MapToRecordDto(r)).ToList(),
        };
    }

    private static AttendanceRecordDto MapToRecordDto(AttendanceRecord r)
    {
        return new AttendanceRecordDto
        {
            Id = r.Id,
            AttendanceSessionId = r.AttendanceSessionId,
            StudentId = r.StudentId,
            StudentName = r.Student?.FullName ?? string.Empty,
            StudentCode = r.Student?.StudentCode ?? string.Empty,
            Class = r.Student?.Class,
            Major = r.Student?.Major,
            InternshipId = r.InternshipId,
            CompanyName = r.Internship?.Company?.CompanyName,
            Status = r.Status.ToString(),
            Notes = r.Notes,
            MarkedAt = r.MarkedAt,
            MarkedBy = r.MarkedBy,
        };
    }
}
