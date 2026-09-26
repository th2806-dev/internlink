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
            ?? throw new KeyNotFoundException(InternLink.Shared.Responses.ErrorMessage.SemesterNotFoundById(semesterId));

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
            .Include(i => i.Submissions)
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

        // 3) Báo cáo đã nộp (mọi trạng thái != Draft tính là đã nộp — gồm cả "GV đã duyệt")
        var reports = await _context.WeeklyReports
            .AsNoTracking()
            .Where(w => internshipIds.Contains(w.InternshipId) && !w.IsDeleted && w.Status != WeeklyReportStatus.Draft)
            .Select(w => new { w.InternshipId, w.WeekNumber, w.SubmittedAt, w.Status })
            .ToListAsync();
        var reportTuples = reports
            .Select(r => (InternshipId: r.InternshipId, WeekNumber: r.WeekNumber, SubmittedAt: r.SubmittedAt))
            .ToList();

        var reportsByInternship = reportTuples
            .GroupBy(r => r.InternshipId)
            .ToDictionary(g => g.Key, g => g.ToList());

        // 4) Điểm danh buổi hẹn theo tuần — hệ thống ĐỘC LẬP với nộp bài.
        // Vắng (V) chỉ đến từ đây, không suy ra từ việc không nộp báo cáo.
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
            .Select(e => new { e.InternshipId, e.QualityLevel, e.HasCreativeProduct, e.OralExamScore, e.WeeklyQualityJson })
            .ToListAsync();

        var evalByInternship = evaluations.GroupBy(e => e.InternshipId)
            .ToDictionary(g => g.Key, g => g.First());

        var totalWeeks = Math.Max(semester.TotalWeeks, 1);
        var finalReportWeek = totalWeeks + 1;
        // Tiến độ / điểm QT chỉ tính tuần báo cáo tuần đang bật trong «Cấu hình báo cáo».
        var weekSchedules = schedules
            .Where(s => s.WeekNumber >= 1 && s.WeekNumber <= totalWeeks && s.IsSubmissionOpen)
            .ToList();
        var finalSchedule = schedules.FirstOrDefault(s => s.WeekNumber == finalReportWeek && s.IsSubmissionOpen);

        // 5c) Mức rubric TỪNG TUẦN đã lưu trong Evaluation.WeeklyQualityJson ("{"1":4.0,...}")
        var weeklyQualityByInternship = new Dictionary<Guid, Dictionary<int, decimal>>();
        foreach (var e in evaluations)
        {
            if (string.IsNullOrWhiteSpace(e.WeeklyQualityJson)) continue;
            try
            {
                var parsed = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, decimal>>(e.WeeklyQualityJson);
                if (parsed == null || parsed.Count == 0) continue;
                weeklyQualityByInternship[e.InternshipId] = parsed.ToDictionary(
                    kv => int.TryParse(kv.Key, out var w) ? w : -1,
                    kv => kv.Value);
            }
            catch (System.Text.Json.JsonException)
            {
                // JSON hỏng → bỏ qua, dùng QualityLevel tổng
            }
        }

        var scheduleDtos = schedules.Select(s => new InternshipWeekStatusDto
        {
            WeekNumber = s.WeekNumber,
            Title = s.Title,
            StartDate = s.StartDate,
            Deadline = s.DueDate,
            IsSubmissionOpen = s.IsSubmissionOpen,
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
            var missingCount = 0;
            var absentCount = 0;   // CHỈ từ điểm danh — không liên quan nộp bài

            foreach (var schedule in weekSchedules)
            {
                // ── Trạng thái nộp báo cáo tuần (cột T1-T6, chỉ hiển thị + điểm QT) ──
                var report = submitted.FirstOrDefault(r => r.WeekNumber == schedule.WeekNumber);
                string status;
                if (!schedule.IsSubmissionOpen)
                {
                    status = "pending";
                }
                else if (report.SubmittedAt.HasValue)
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
                if (status == "missing" && schedule.IsSubmissionOpen) missingCount++;

                // ── Điểm danh buổi hẹn — hệ thống ĐỘC LẬP với nộp bài ──
                var hasSession = sessionWeekSet.Contains(schedule.WeekNumber);
                var attendanceStatus = attendanceByWeek.TryGetValue(schedule.WeekNumber, out var at)
                    ? at
                    : (hasSession ? "absent" : "no_session"); // có buổi nhưng chưa chấm → coi như vắng
                var absent = attendanceStatus == "absent";
                if (absent) absentCount++;

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

            // Báo cáo cuối kỳ (cột NỘP BC) — đã nộp ở MỌI trạng thái (Submitted/Reviewed/Approved)
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

            var finalSubmission = internship.Submissions
                .Where(s => !s.IsDeleted && s.Type == SubmissionType.FinalReport && s.Status != SubmissionStatus.Rejected)
                .OrderByDescending(s => s.SubmittedAt)
                .FirstOrDefault();
            var finalSubmitted = finalSubmission != null;
            if (finalSubmitted)
                finalStatus = finalSubmission!.SubmittedAt > (finalSchedule?.DueDate ?? DateTime.MaxValue) ? "late" : "on_time";

            evalByInternship.TryGetValue(internship.Id, out var eval);
            var creative = eval?.HasCreativeProduct ?? false;
            var productSubmitted = internship.Submissions.Any(s => !s.IsDeleted && s.Type == SubmissionType.Product && s.Status != SubmissionStatus.Rejected);
            var oral = eval?.OralExamScore;

            // ── Rubric chất lượng TỪNG TUẦN: đọc mức GV đã chấm theo tuần, trung bình lại ──
            var weeklyQuality = new Dictionary<int, decimal>();
            if (weeklyQualityByInternship.TryGetValue(internship.Id, out var wqMap))
                weeklyQuality = wqMap;
            var qualityLevels = weeks
                .Where(w => weeklyQuality.ContainsKey(w.WeekNumber))
                .Select(w => weeklyQuality[w.WeekNumber])
                .Cast<decimal?>()
                .ToList();
            decimal? quality = qualityLevels.Count > 0 ? qualityLevels.Average(v => v!.Value) : (decimal?)null;

            // ── Điều kiện dự thi: BC cuối kỳ (nộp bài) + số buổi VẮNG (điểm danh) — hai hệ thống độc lập ──
            var (isEligible, reasons) = InternshipGradeCalculator.EvaluateEligibility(finalSubmitted, absentCount);
            // ── Điểm QT: trừ theo bài thiếu/trễ (chỉ từ nộp bài) + rubric chất lượng trung bình theo tuần ──
            var submittedWeekCount = weeks.Count(w => w.Status == "on_time" || w.Status == "late");
            var processScore = InternshipGradeCalculator.ComputeProcessScore(
                missingCount,
                lateCount,
                submittedWeekCount,
                qualityLevels,
                creative);
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
                WeeklyQualityScores = weeklyQuality,
                ProductSubmitted = productSubmitted,
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

        if (dto.WeeklyQualityScores != null)
        {
            foreach (var kv in dto.WeeklyQualityScores)
                if (!InternshipGradeCalculator.IsValidQualityLevel(kv.Value))
                    throw new ArgumentException($"Mức rubric tuần {kv.Key} phải là 1 trong các mức: 1.0, 2.0, 3.5, 4.0, 5.0");
        }

        // ── Guard điều kiện dự thi: KHÔNG nhận Điểm thi khi SV không đủ điều kiện ──
        // (thiếu BC cuối kỳ, hoặc vắng >= 2 buổi theo điểm danh — hai hệ thống độc lập với nộp bài)
        if (dto.OralExamScore.HasValue)
        {
            var finalSubmittedGuard = await _context.Submissions.AsNoTracking()
                .AnyAsync(s => s.InternshipId == internship.Id && !s.IsDeleted
                    && s.Type == SubmissionType.FinalReport && s.Status != SubmissionStatus.Rejected);

            var absentWeeksGuard = await _context.AttendanceRecords.AsNoTracking()
                .Where(a => a.StudentId == internship.StudentId && !a.IsDeleted
                    && a.Status == AttendanceStatus.Absent
                    && a.AttendanceSession.SemesterId == semesterId
                    && !a.AttendanceSession.IsDeleted
                    && !a.AttendanceSession.IsLecturerOnly)
                .Select(a => (int?)a.AttendanceSession.WeekNumber)
                .Distinct()
                .CountAsync();

            var (guardEligible, guardReasons) = InternshipGradeCalculator.EvaluateEligibility(finalSubmittedGuard, absentWeeksGuard);
            if (!guardEligible)
                throw new InvalidOperationException($"Sinh viên này KHÔNG đủ điều kiện dự thi — không thể nhập Điểm thi. Lý do: {string.Join("; ", guardReasons)}");
        }

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

        // Rubric theo TỪNG tuần — ưu tiên hơn mức chung
        if (dto.WeeklyQualityScores != null && dto.WeeklyQualityScores.Count > 0)
        {
            evaluation.WeeklyQualityJson = System.Text.Json.JsonSerializer.Serialize(dto.WeeklyQualityScores);
            // Mức chung = trung bình các tuần để tương thích ngược với màn hình cũ / export
            if (!dto.QualityScore.HasValue)
                evaluation.QualityLevel = InternshipGradeCalculator.Round1(dto.WeeklyQualityScores.Values.Average());
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
        var updatedStudent = summary.Students.FirstOrDefault(s => s.StudentId == dto.StudentId);
        if (updatedStudent != null)
        {
            evaluation.FinalGrade = updatedStudent.AverageScore ?? 0m;
            // Chấm xong điểm thi + đủ điều kiện → chốt đánh giá & status Graded
            // (Word / tiến độ hoàn thành dựa trên status này, không chỉ có điểm trong Evaluation).
            if (evaluation.OralExamScore.HasValue && updatedStudent.IsEligible)
            {
                evaluation.IsFinalized = true;
                internship.Status = InternshipStatus.Graded;
                internship.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
        }
        return updatedStudent;
    }
}
