using InternLink.Application.Common;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InternLink.Infrastructure.Services;

/// <summary>
/// Tổng hợp điểm & điều kiện dự thi theo quy định đánh giá thực tập hiện hành.
/// </summary>
public class InternshipGradingService : IInternshipGradingService
{
    private readonly AppDbContext _context;
    private readonly ILogger<InternshipGradingService> _logger;
    private readonly ISemesterService _semesterService;

    public InternshipGradingService(
        AppDbContext context,
        ILogger<InternshipGradingService> logger,
        ISemesterService semesterService)
    {
        _context = context;
        _logger = logger;
        _semesterService = semesterService;
    }

    public async Task<InternshipSummaryResponseDto> GetSummaryAsync(Guid semesterId, Guid? lecturerId, Guid? departmentId, string? className = null)
    {
        var semester = await _context.Semesters
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == semesterId && !s.IsDeleted)
            ?? throw new KeyNotFoundException($"Semester {semesterId} not found");

        // 1) Lịch báo cáo (tự sinh mặc định nếu chưa có — cùng hành vi với màn hình 1)
        var schedules = await _context.SemesterReportSchedules
            .AsNoTracking()
            .Where(s => s.SemesterId == semesterId && !s.IsDeleted)
            .OrderBy(s => s.WeekNumber)
            .ToListAsync();

        if (schedules.Count == 0)
        {
            await _semesterService.GenerateDefaultSchedulesAsync(semesterId);
            schedules = await _context.SemesterReportSchedules
                .AsNoTracking()
                .Where(s => s.SemesterId == semesterId && !s.IsDeleted)
                .OrderBy(s => s.WeekNumber)
                .ToListAsync();
        }

        // 2) Sinh viên: internship trong kỳ, lọc theo GV/phân hệ khoa
        var internshipsQuery = _context.Internships
            .AsNoTracking()
            .Include(i => i.Student)
            .Where(i => i.SemesterId == semesterId && !i.IsDeleted && i.Student != null && !i.Student.IsDeleted);

        if (lecturerId.HasValue)
            internshipsQuery = internshipsQuery.Where(i => i.LecturerId == lecturerId.Value);
        if (departmentId.HasValue)
            internshipsQuery = internshipsQuery.Where(i => i.Student!.DepartmentId == departmentId.Value);
        if (!string.IsNullOrWhiteSpace(className))
            internshipsQuery = internshipsQuery.Where(i => i.Student!.Class == className);

        var internships = await internshipsQuery
            .OrderBy(i => i.Student!.StudentCode)
            .ToListAsync();

        var internshipIds = internships.Select(i => i.Id).ToList();
        var studentIds = internships.Select(i => i.StudentId).ToList();

        // 3) Báo cáo tuần đã nộp (mọi trạng thái != Draft tính là đã nộp)
        var reports = await _context.WeeklyReports
            .AsNoTracking()
            .Where(w => internshipIds.Contains(w.InternshipId) && !w.IsDeleted && w.Status != WeeklyReportStatus.Draft)
            .Select(w => new { w.InternshipId, w.WeekNumber, w.SubmittedAt })
            .ToListAsync();
        var reportTuples = reports
            .Select(r => (InternshipId: r.InternshipId, WeekNumber: r.WeekNumber, SubmittedAt: r.SubmittedAt))
            .ToList();

        var reportsByInternship = reportTuples
            .GroupBy(r => r.InternshipId)
            .ToDictionary(g => g.Key, g => g.ToList());

        // 4) Điểm danh buổi hẹn theo tuần — NGUỒN SỰ THẬT cho cột V (người dạy điểm danh tại trang Điểm danh)
        var attendance = await _context.AttendanceRecords
            .AsNoTracking()
            .Where(a => studentIds.Contains(a.StudentId) && !a.IsDeleted
                        && a.AttendanceSession.SemesterId == semesterId
                        && !a.AttendanceSession.IsDeleted
                        && !a.AttendanceSession.IsLecturerOnly)
            .Select(a => new { a.StudentId, a.Status, a.AttendanceSession.WeekNumber })
            .ToListAsync();

        // studentId → week → trạng thái điểm danh của buổi gặp tuần đó (nhiều buổi/tuần:Absent ưu tiên)
        var attendanceByStudent = attendance
            .GroupBy(a => a.StudentId)
            .ToDictionary(
                g => g.Key,
                g => g.GroupBy(x => x.WeekNumber).ToDictionary(
                    w => w.Key,
                    w => w.Any(x => x.Status == AttendanceStatus.Absent) ? "absent" : "present"));

        // Tuần có buổi hẹn (để phân bi�“t "chưa có buổi" vs "vắng")
        var sessionWeeks = await _context.AttendanceSessions
            .AsNoTracking()
            .Where(s => s.SemesterId == semesterId && !s.IsDeleted && !s.IsLecturerOnly)
            .Select(s => new { s.WeekNumber })
            .Distinct()
            .ToListAsync();
        var sessionWeekSet = sessionWeeks.Select(x => x.WeekNumber).ToHashSet();

        // 5) Điểm giảng viên đã lưu (QualityLevel / HasCreativeProduct / OralExamScore)
        var evaluations = await _context.Evaluations
            .AsNoTracking()
            .Where(e => internshipIds.Contains(e.InternshipId) && !e.IsDeleted)
            .Select(e => new { e.InternshipId, e.QualityLevel, e.HasCreativeProduct, e.OralExamScore })
            .ToListAsync();

        var evalByInternship = evaluations.GroupBy(e => e.InternshipId)
            .ToDictionary(g => g.Key, g => g.First());

        var totalWeeks = Math.Max(semester.TotalWeeks, 1);
        var finalReportWeek = totalWeeks + 1;
        var weekSchedules = schedules.Where(s => s.WeekNumber >= 1 && s.WeekNumber <= totalWeeks).ToList();
        var finalSchedule = schedules.FirstOrDefault(s => s.WeekNumber == finalReportWeek);

        var scheduleDtos = schedules.Select(s => new InternshipWeekStatusDto
        {
            WeekNumber = s.WeekNumber,
            Title = s.Title,
            StartDate = s.StartDate,
            Deadline = s.DueDate,
            Status = "pending",
        }).ToList();

        var now = DateTime.UtcNow;
        var students = new List<InternshipStudentGradeDto>();

        foreach (var internship in internships)
        {
            var student = internship.Student!;
            var submitted = reportsByInternship.TryGetValue(internship.Id, out var list)
                ? list : new List<(Guid InternshipId, int WeekNumber, DateTime? SubmittedAt)>();
            var attendanceByWeek = attendanceByStudent.TryGetValue(student.Id, out var atMap)
                ? atMap : new Dictionary<int, string>();

            var weeks = new List<InternshipWeekStatusDto>();
            var lateCount = 0;
            var absentCount = 0;
            var eligibilityViolationWeeks = new HashSet<int>();

            foreach (var schedule in weekSchedules)
            {
                // ── Trạng thái nộp báo cáo tuần (cột T1-T6, chỉ hiển thị) ──
                var report = submitted.FirstOrDefault(r => r.WeekNumber == schedule.WeekNumber);
                string status;
                if (report.SubmittedAt.HasValue)
                {
                    var deadline = schedule.DueDate;
                    status = deadline != default && report.SubmittedAt.Value > deadline ? "late" : "on_time";
                }
                else if (schedule.DueDate < now)
                {
                    status = "missing";
                }
                else
                {
                    status = "pending";
                }
                if (status == "late") lateCount++;

                // ── Điểm danh buổi hẹn (cột V) — nguồn sự thật: trang Điểm danh ──
                var hasSession = sessionWeekSet.Contains(schedule.WeekNumber);
                var attendanceStatus = attendanceByWeek.TryGetValue(schedule.WeekNumber, out var at)
                    ? at
                    : (hasSession ? "absent" : "no_session"); // có buổi nhưng chưa chấm → coi như vắng
                var absent = attendanceStatus == "absent";
                if (absent) absentCount++;
                if (status == "missing" || absent)
                    eligibilityViolationWeeks.Add(schedule.WeekNumber);

                weeks.Add(new InternshipWeekStatusDto
                {
                    WeekNumber = schedule.WeekNumber,
                    Title = schedule.Title,
                    StartDate = schedule.StartDate,
                    Deadline = schedule.DueDate,
                    SubmittedAt = report.SubmittedAt,
                    Status = status,
                    AttendanceStatus = attendanceStatus,
                    IsAttendanceAbsent = absent,
                });
            }

            // Báo cáo cuối kỳ (cột NỘP BC)
            string finalStatus = "pending";
            if (finalSchedule != null)
            {
                var finalReport = submitted.FirstOrDefault(r => r.WeekNumber == finalReportWeek);
                if (finalReport.SubmittedAt.HasValue)
                {
                    finalStatus = finalReport.SubmittedAt.Value > finalSchedule.DueDate ? "late" : "on_time";
                }
                else if (finalSchedule.DueDate < now)
                {
                    finalStatus = "missing";
                }
            }

            var finalSubmitted = finalStatus == "on_time" || finalStatus == "late";

            evalByInternship.TryGetValue(internship.Id, out var eval);
            decimal? quality = eval?.QualityLevel;
            var creative = eval?.HasCreativeProduct ?? false;
            var oral = eval?.OralExamScore;

            // ── Điều kiện dự thi: NỘP BC + SỐ BUỔI VẮNG (theo điểm danh) >= 2 ──
            var (isEligible, reasons) = InternshipGradeCalculator.EvaluateEligibility(finalSubmitted, eligibilityViolationWeeks.Count);
            // ── Điểm QT: trừ điểm theo bài thiếu (nộp) và bài trễ — vắng không trừ QT ──
            var missingCount = weeks.Count(w => w.Status == "missing");
            var processScore = InternshipGradeCalculator.ComputeProcessScore(missingCount, lateCount, quality, creative);
            var (average, classification) = InternshipGradeCalculator.ComputeAverage(isEligible, processScore, oral);

            students.Add(new InternshipStudentGradeDto
            {
                StudentId = student.Id,
                StudentCode = student.StudentCode,
                FullName = student.FullName,
                ClassName = student.Class ?? string.Empty,
                Note = internship.Notes ?? string.Empty,
                MissingCount = missingCount,
                LateCount = lateCount,
                AbsentCount = absentCount,
                SubmissionScore = InternshipGradeCalculator.Round1(Math.Max(0m, InternshipGradeCalculator.SubmissionMax - missingCount * InternshipGradeCalculator.StepPenalty)),
                PunctualityScore = InternshipGradeCalculator.Round1(Math.Max(0m, InternshipGradeCalculator.PunctualityMax - lateCount * InternshipGradeCalculator.StepPenalty)),
                QualityScore = quality,
                HasCreativeProduct = creative,
                ProcessScore = processScore,
                OralExamScore = oral,
                AverageScore = average,
                Classification = classification,
                Weeks = weeks,
                FinalReportStatus = finalStatus,
                IsEligible = isEligible,
                IneligibleReasons = reasons,
            });
        }

        return new InternshipSummaryResponseDto
        {
            SemesterId = semester.Id,
            SemesterName = semester.Name,
            Schedule = scheduleDtos,
            Students = students,
            GeneratedAt = DateTime.UtcNow,
        };
    }

    public async Task<InternshipStudentGradeDto?> SaveGradeAsync(Guid semesterId, SaveInternshipGradeRequestDto dto, Guid actorUserId, Guid? actorLecturerId)
    {
        var internship = await _context.Internships
            .Include(i => i.Student)
            .FirstOrDefaultAsync(i => i.StudentId == dto.StudentId && i.SemesterId == semesterId && !i.IsDeleted);

        if (internship == null) return null;

        // Lecturer chỉ được chấm sinh viên của mình
        if (actorLecturerId.HasValue && internship.LecturerId != actorLecturerId.Value) return null;

        if (dto.QualityScore.HasValue && !InternshipGradeCalculator.IsValidQualityLevel(dto.QualityScore))
            throw new ArgumentException("QualityScore phải là 1 trong các mức: 1.0, 2.0, 3.5, 4.0, 5.0");

        var evaluation = await _context.Evaluations
            .FirstOrDefaultAsync(e => e.InternshipId == internship.Id && !e.IsDeleted);

        if (evaluation == null)
        {
            evaluation = new Domain.Entities.Evaluation
            {
                Id = Guid.NewGuid(),
                InternshipId = internship.Id,
                CreatedAt = DateTime.UtcNow,
            };
            _context.Evaluations.Add(evaluation);
        }

        if (dto.QualityScore.HasValue) evaluation.QualityLevel = dto.QualityScore;
        evaluation.HasCreativeProduct = dto.HasCreativeProduct;
        if (dto.OralExamScore.HasValue)
            evaluation.OralExamScore = Math.Clamp(dto.OralExamScore.Value, 0m, 10m);
        if (dto.Note != null) internship.Notes = dto.Note;

        evaluation.EvaluatedById = actorUserId;
        evaluation.EvaluatedAt = DateTime.UtcNow;
        internship.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Trả về dòng điểm mới nhất cho sinh viên này
        var summary = await GetSummaryAsync(semesterId, actorLecturerId, null);
        return summary.Students.FirstOrDefault(s => s.StudentId == dto.StudentId);
    }
}
