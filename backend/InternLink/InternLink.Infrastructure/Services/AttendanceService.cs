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
    /// <summary>Số tuần CHUẨN BỊ tối đa trước Tuần thực tập 1 (tuần 0, -1, -2, -3).</summary>
    private const int MaxPreparationWeeks = 3;

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

    public async Task<List<AttendanceSessionDto>> GetSessionsBySemesterAsync(Guid semesterId, Guid? departmentId = null)
    {
        var query = _context.AttendanceSessions
            .AsNoTracking()
            .Where(s => s.SemesterId == semesterId);

        // Department scope: keep sessions whose lecturer (or attending students) belong to the department.
        if (departmentId.HasValue)
        {
            query = query.Where(s =>
                (s.Lecturer != null && s.Lecturer.DepartmentId == departmentId.Value) ||
                s.Records.Any(r => r.Student != null && r.Student.DepartmentId == departmentId.Value));
        }

        var sessions = await query
            .Include(s => s.Semester)
            .Include(s => s.Lecturer)
            .Include(s => s.Records)
            .OrderBy(s => s.WeekNumber)
            .ThenBy(s => s.MeetingDate)
            .ToListAsync();

        return sessions.Select(MapToSessionDto).ToList();
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

        // Tuần dương = tuần thực tập chính (1..TotalWeeks).
        // Tuần <= 0 = tuần chuẩn bị trước khi sinh viên đi thực tập (tối đa 3 tuần,
        // tính lùi từ ngày bắt đầu kỳ): 0 = tuần ngay trước tuần 1, -1, -2, -3...
        if (dto.WeekNumber < -MaxPreparationWeeks || dto.WeekNumber > semester.TotalWeeks)
        {
            throw new InvalidOperationException(
                $"Tuần phải nằm trong khoảng -{MaxPreparationWeeks} (chuẩn bị) đến {semester.TotalWeeks} (thực tập chính).");
        }

        // Đồng bộ NGÀY ↔ TUẦN theo lịch học kỳ: buổi gặp phải rơi đúng vào tuần đã chọn,
        // nếu không dữ liệu xuất ra (Excel lịch hướng dẫn, báo cáo) sẽ sai tuần.
        // (ValidateMeetingDateInWeek đã chặn ngày ngoài khung của tuần, bao gồm cả tuần chuẩn bị
        // -3..0 = [Start - 4 tuần, Start); check riêng trước đây bị mâu thuẫn và từ chối sai tuần -3.)
        ValidateMeetingDateInWeek(semester, dto.WeekNumber, dto.MeetingDate);

        // Mỗi tuần chỉ một buổi GẶP SINH VIÊN; buổi công tác riêng (IsLecturerOnly)
        // được phép trùng tuần vì chúng là lịch làm việc nội bộ của giảng viên.
        if (!dto.IsLecturerOnly)
        {
            var alreadyScheduled = await _context.AttendanceSessions
                .AnyAsync(s => s.SemesterId == dto.SemesterId
                    && s.LecturerId == lecturerId
                    && s.WeekNumber == dto.WeekNumber
                    && !s.IsDeleted
                    && !s.IsLecturerOnly);
            if (alreadyScheduled)
            {
                throw new InvalidOperationException($"Tuần {dto.WeekNumber} đã có buổi gặp sinh viên được lên lịch.");
            }
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
            IsLecturerOnly = dto.IsLecturerOnly,
        };

        // Determine students to populate
        List<Internship> targetInternships;
        if (dto.IsLecturerOnly)
        {
            targetInternships = new List<Internship>();
        }
        else if (dto.StudentIds != null && dto.StudentIds.Any())
        {
            targetInternships = await _context.Internships
                .Where(i => i.SemesterId == dto.SemesterId && i.LecturerId == lecturerId && dto.StudentIds.Contains(i.StudentId))
                .ToListAsync();
        }
        else
        {
            // No students selected and not lecturer-only: reject to avoid
            // silently creating attendance records for every assigned student.
            throw new InvalidOperationException(
                "Vui lòng chọn ít nhất một sinh viên tham dự, hoặc đánh dấu là công tác riêng của giảng viên.");
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

        var semester = await _context.Semesters.FindAsync(session.SemesterId);
        if (semester == null)
        {
            throw new KeyNotFoundException("Không tìm thấy học kỳ của buổi gặp.");
        }

        var effectiveMeetingDate = dto.MeetingDate ?? session.MeetingDate;

        // ── Đồng bộ TUẦN ↔ NGÀY theo lịch học kỳ ──
        // - Ưu tiên tuần do client gửi (modal Sửa có ô chọn Tuần);
        // - Nếu chỉ đổi ngày họp → suy ra tuần tương ứng, DB không bao giờ lệch;
        // - Cả hai gửi lên → kiểm tra rơi đúng khung tuần, sai thì báo lỗi rõ ràng.
        int newWeek;
        if (dto.WeekNumber.HasValue)
        {
            newWeek = dto.WeekNumber.Value;
        }
        else if (dto.MeetingDate.HasValue)
        {
            var derived = DeriveWeekNumberFromMeetingDate(semester, effectiveMeetingDate);
            if (!derived.HasValue)
            {
                throw new InvalidOperationException(
                    $"Ngày {effectiveMeetingDate:dd/MM/yyyy} nằm ngoài phạm vi kỳ thực tập " +
                    $"(tuần -{MaxPreparationWeeks} chuẩn bị đến tuần {semester.TotalWeeks}, tính từ ngày bắt đầu kỳ). " +
                    "Hãy chọn ngày khác hoặc điều chỉnh kỳ thực tập.");
            }
            newWeek = derived.Value;
        }
        else
        {
            newWeek = session.WeekNumber;
        }

        if (newWeek < -MaxPreparationWeeks || newWeek > semester.TotalWeeks)
        {
            throw new InvalidOperationException(
                $"Tuần phải nằm trong khoảng -{MaxPreparationWeeks} (chuẩn bị) đến {semester.TotalWeeks} (thực tập chính).");
        }

        ValidateMeetingDateInWeek(semester, newWeek, effectiveMeetingDate);

        var newIsLecturerOnly = dto.IsLecturerOnly ?? session.IsLecturerOnly;

        // Mỗi tuần chỉ một buổi GẶP SINH VIÊN — kiểm tra cho cả trường hợp đổi tuần
        // lẫn bật/tắt "Công tác riêng" (buổi công tác riêng được phép trùng tuần).
        if (!newIsLecturerOnly)
        {
            var hasStudentMeeting = await _context.AttendanceSessions
                .AnyAsync(s => s.SemesterId == session.SemesterId
                    && s.LecturerId == lecturerId
                    && s.WeekNumber == newWeek
                    && s.Id != session.Id
                    && !s.IsDeleted
                    && !s.IsLecturerOnly);
            if (hasStudentMeeting)
            {
                var semesterWeek = (semester.InternshipStartWeek - 1) + newWeek;
                throw new InvalidOperationException(
                    $"Tuần {newWeek} (tuần {semesterWeek} của học kỳ) đã có buổi gặp sinh viên. " +
                    "Mỗi tuần chỉ một buổi có điểm danh — hoặc giữ buổi này là công tác riêng.");
            }
        }

        session.WeekNumber = newWeek;

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

        // Handle isLecturerOnly toggle
        if (dto.IsLecturerOnly.HasValue && dto.IsLecturerOnly.Value != session.IsLecturerOnly)
        {
            if (dto.IsLecturerOnly.Value)
            {
                // Switching to lecturer-only: remove all attendance records
                var records = await _context.AttendanceRecords
                    .Where(r => r.AttendanceSessionId == sessionId)
                    .ToListAsync();
                _context.AttendanceRecords.RemoveRange(records);
            }
            else
            {
                // Chuyển từ công tác riêng sang buổi gặp SV: đã kiểm tra trùng tuần ở trên
                // (newIsLecturerOnly = false) nên ở đây chỉ cần tạo lại dòng điểm danh.

                // Create records for all assigned students
                var internships = await _context.Internships
                    .Where(i => i.SemesterId == session.SemesterId && i.LecturerId == lecturerId)
                    .ToListAsync();
                foreach (var internship in internships)
                {
                    session.Records.Add(new AttendanceRecord
                    {
                        StudentId = internship.StudentId,
                        InternshipId = internship.Id,
                        Status = AttendanceStatus.Present,
                    });
                }
            }
            session.IsLecturerOnly = dto.IsLecturerOnly.Value;
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
        var rate = totalSessions > 0 ? Math.Round((double)presentCount / totalSessions * 100, 1) : 0.0;

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
                MeetingDate = ToUtc(r.AttendanceSession.MeetingDate),
                DurationMinutes = r.AttendanceSession.DurationMinutes,
                Location = r.AttendanceSession.Location,
                LecturerName = r.AttendanceSession.Lecturer?.FullName ?? "Giảng viên",
                Status = r.Status.ToString(),
                Notes = r.Notes,
                MarkedAt = r.MarkedAt,
            }).ToList(),
        };
    }

    public async Task<AdminAttendanceReportDto> GetAdminAttendanceReportAsync(Guid semesterId, Guid? departmentId = null)
    {
        var semester = await _context.Semesters.FindAsync(semesterId);
        var semesterName = semester?.Name ?? "Học kỳ";

        var sessionsQuery = _context.AttendanceSessions
            .AsNoTracking()
            .Where(s => s.SemesterId == semesterId);

        // Department scope: keep sessions whose students (or lecturer) belong to the department.
        if (departmentId.HasValue)
        {
            sessionsQuery = sessionsQuery.Where(s =>
                s.Records.Any(r => r.Student != null && r.Student.DepartmentId == departmentId.Value) ||
                (s.Lecturer != null && s.Lecturer.DepartmentId == departmentId.Value));
        }

        var sessions = await sessionsQuery
            .Include(s => s.Lecturer)
            .Include(s => s.Records)
                .ThenInclude(r => r.Student)
            .OrderBy(s => s.WeekNumber)
            .ToListAsync();

        var allRecords = sessions.SelectMany(s => s.Records).ToList();
        var totalRecords = allRecords.Count;
        var totalPresent = allRecords.Count(r => r.Status == AttendanceStatus.Present);
        var overallRate = totalRecords > 0 ? Math.Round((double)totalPresent / totalRecords * 100, 1) : 0.0;

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

    /// <summary>
    /// Quy đổi tuần tương đối (1..TotalWeeks, &lt;=0 = chuẩn bị) sang tuần TUYỆT ĐỐI
    /// của học kỳ trường: tuần HK = InternshipStartWeek + (tuần tương đối - 1).
    /// Ví dụ InternshipStartWeek = 14 → tuần thực tập 1..6 = tuần 14..19,
    /// tuần chuẩn bị 0..-3 = tuần 13..10.
    /// </summary>
    private static int ToSemesterWeek(Semester? semester, int relativeWeek)
        => (semester?.InternshipStartWeek ?? 1) - 1 + relativeWeek;

    /// <summary>
    /// Ngày họp phải nằm trong đúng khung 7 ngày của tuần đã chọn
    /// [Bắt đầu kỳ + (tuần-1)*7, Bắt đầu kỳ + tuần*7), tính theo giờ Việt Nam (UTC+7).
    /// Không cấu hình ngày bắt đầu kỳ thì bỏ qua.
    /// </summary>
    private static void ValidateMeetingDateInWeek(Semester semester, int weekNumber, DateTime meetingDate)
    {
        if (semester.StartDate is null) return;

        var start = semester.StartDate.Value.Date.AddDays((semester.InternshipStartWeek - 1) * 7);
        var windowFrom = start.AddDays((weekNumber - 1) * 7);
        var windowTo = start.AddDays(weekNumber * 7);
        var localDate = ToSchoolLocal(meetingDate);

        if (localDate < windowFrom || localDate >= windowTo)
        {
            var semesterWeek = ToSemesterWeek(semester, weekNumber);
            throw new InvalidOperationException(
                $"Ngày {localDate:dd/MM/yyyy} không thuộc Tuần {weekNumber} thực tập " +
                $"(tuần {semesterWeek} của học kỳ — hiệu lực {windowFrom:dd/MM/yyyy} đến {windowTo.AddDays(-1):dd/MM/yyyy}). " +
                "Hãy chọn lại ngày hoặc tuần cho khớp lịch học kỳ.");
        }
    }

    /// <summary>Suy ra tuần tương đối từ ngày họp; null nếu nằm ngoài phạm vi kỳ cho phép.</summary>
    private static int? DeriveWeekNumberFromMeetingDate(Semester semester, DateTime meetingDate)
    {
        if (semester.StartDate is null) return null;

        var start = semester.StartDate.Value.Date.AddDays((semester.InternshipStartWeek - 1) * 7);
        var diffDays = (ToSchoolLocal(meetingDate).Date - start).Days;
        var week = (int)Math.Floor(diffDays / 7.0) + 1;
        return week < -MaxPreparationWeeks || week > semester.TotalWeeks ? null : week;
    }

    /// <summary>Ngày giờ học kỳ (giờ VN, UTC+7) — DB lưu MeetingDate kiểu UTC.</summary>
    private static DateTime ToSchoolLocal(DateTime value)
    {
        var utc = value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
        return utc.AddHours(7);
    }

    private static AttendanceSessionDto MapToSessionDto(AttendanceSession s)
    {
        var total = s.Records.Count;
        var present = s.Records.Count(r => r.Status == AttendanceStatus.Present);
        var absent = s.Records.Count(r => r.Status == AttendanceStatus.Absent);
        var rate = total > 0 ? Math.Round((double)present / total * 100, 1) : 0.0;

        return new AttendanceSessionDto
        {
            Id = s.Id,
            SemesterId = s.SemesterId,
            SemesterName = s.Semester?.Name ?? string.Empty,
            LecturerId = s.LecturerId,
            LecturerName = s.Lecturer?.FullName ?? string.Empty,
            WeekNumber = s.WeekNumber,
            SemesterWeekNumber = ToSemesterWeek(s.Semester, s.WeekNumber),
            Title = s.Title,
            Description = s.Description,
            MeetingDate = ToUtc(s.MeetingDate),
            DurationMinutes = s.DurationMinutes,
            Location = s.Location,
            Status = s.Status.ToString(),
            IsLecturerOnly = s.IsLecturerOnly,
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
            SemesterWeekNumber = baseDto.SemesterWeekNumber,
            Title = baseDto.Title,
            Description = baseDto.Description,
            MeetingDate = baseDto.MeetingDate,
            DurationMinutes = baseDto.DurationMinutes,
            Location = baseDto.Location,
            Status = baseDto.Status,
            IsLecturerOnly = baseDto.IsLecturerOnly,
            TotalStudents = baseDto.TotalStudents,
            PresentCount = baseDto.PresentCount,
            AbsentCount = baseDto.AbsentCount,
            AttendanceRate = baseDto.AttendanceRate,
            CreatedAt = baseDto.CreatedAt,
            Records = s.Records.Select(r => MapToRecordDto(r)).ToList(),
        };
    }

    private static DateTime ToUtc(DateTime value)
    {
        // SQL Server DateTime has no timezone metadata; attendance dates are stored as UTC.
        return DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    private static AttendanceRecordDto MapToRecordDto(AttendanceRecord r)
    {
        return new AttendanceRecordDto
        {
            Id = r.Id,
            AttendanceSessionId = r.AttendanceSessionId,
            StudentId = r.StudentId,
            StudentName = r.Student?.FullName ?? string.Empty,
            MeetingDate = r.AttendanceSession != null ? ToUtc(r.AttendanceSession.MeetingDate) : null,
            WeekNumber = r.AttendanceSession?.WeekNumber,
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

    /// <inheritdoc />
    public async Task<Dictionary<string, int>> GetStudentAbsenceSummaryAsync(Guid lecturerId, Guid semesterId)
    {
        var query = _context.AttendanceRecords
            .AsNoTracking()
            .Include(r => r.AttendanceSession)
            .Where(r => !r.IsDeleted
                        && r.Status == AttendanceStatus.Absent
                        && r.AttendanceSession.SemesterId == semesterId
                        && !r.AttendanceSession.IsDeleted);

        // Lecturer: chỉ đếm các buổi do mình phụ trách; Guid.Empty → toàn bộ (admin)
        if (lecturerId != Guid.Empty)
        {
            query = query.Where(r => r.AttendanceSession.LecturerId == lecturerId);
        }        var summary = await query
            .GroupBy(r => r.StudentId)
            .Select(g => new { StudentId = g.Key, AbsentCount = g.Count() })
            .ToDictionaryAsync(x => x.StudentId.ToString(), x => x.AbsentCount);

        return summary;
    }
}
