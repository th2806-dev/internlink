using System.Data;
using ClosedXML.Excel;
using InternLink.Application.Common;
using InternLink.Application.DTOs.Export;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InternLink.Infrastructure.Services;

/// <summary>
/// Production-ready Excel export service that loads relational datasets from multiple database tables
/// using optimized LINQ queries and injects them into the institutional Excel template.
/// </summary>
public class ExcelExportService : IExcelExportService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ExcelExportService> _logger;

    public ExcelExportService(AppDbContext db, ILogger<ExcelExportService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<InternshipExportDataDto> GetExportDataAsync(Guid? semesterId = null, Guid? lecturerId = null, string? department = null, Guid? departmentId = null, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Retrieving export datasets from relational tables. SemesterId: {SemesterId}, Department: {Department}", semesterId, department);

        // ────────────────────────────────────────────────────────────────────
        // 1. Relational Query for Sheet 1: DANH SÁCH THỰC TẬP
        // ────────────────────────────────────────────────────────────────────
        // Join Students with their semester Internship (LEFT JOIN), Company (LEFT JOIN),
        // Lecturer (LEFT JOIN), Evaluation (LEFT JOIN), and WeeklyReports.
        //
        // AUDIT MỤC 4.9 — filter internship lặp 4 lần là CỐ Ý, KHÔNG tách được biến dùng chung:
        // Include-filter của EF Core yêu cầu lambda viết INLINE trong expression tree. Vì
        // Internships là ICollection, Where resolve về Enumerable.Where — một biến
        // Expression<Func<>> gây CS1503 lúc compile, còn biến Func<> gây ArgumentException
        // lúc runtime (EF không dịch được delegate). Đã thử cả 2, đã revert.
        // Filter chuẩn (mọi Include dưới đây phải khớp):
        //   !i.IsDeleted && (!semesterId.HasValue || i.SemesterId == semesterId) && (!lecturerId.HasValue || i.LecturerId == lecturerId)

        var studentsQuery = _db.Students
            .AsNoTracking()
            .Include(s => s.Internships.Where(i => !i.IsDeleted && (!semesterId.HasValue || i.SemesterId == semesterId.Value) && (!lecturerId.HasValue || i.LecturerId == lecturerId.Value)))
                .ThenInclude(i => i.Company)
            .Include(s => s.Internships.Where(i => !i.IsDeleted && (!semesterId.HasValue || i.SemesterId == semesterId.Value) && (!lecturerId.HasValue || i.LecturerId == lecturerId.Value)))
                .ThenInclude(i => i.Lecturer)
            .Include(s => s.Internships.Where(i => !i.IsDeleted && (!semesterId.HasValue || i.SemesterId == semesterId.Value) && (!lecturerId.HasValue || i.LecturerId == lecturerId.Value)))
                .ThenInclude(i => i.WeeklyReports)
            .Include(s => s.Internships.Where(i => !i.IsDeleted && (!semesterId.HasValue || i.SemesterId == semesterId.Value) && (!lecturerId.HasValue || i.LecturerId == lecturerId.Value)))
                .ThenInclude(i => i.Submissions)
            .Include(s => s.AttendanceRecords.Where(a => !a.IsDeleted))
                .ThenInclude(a => a.AttendanceSession)
            .Where(s => !lecturerId.HasValue || s.Internships.Any(i => !i.IsDeleted && i.LecturerId == lecturerId.Value && (!semesterId.HasValue || i.SemesterId == semesterId.Value)));

        if (!string.IsNullOrWhiteSpace(department))
        {
            studentsQuery = studentsQuery.Where(s => s.Department == department || s.Internships.Any(i => !i.IsDeleted && i.Lecturer != null && i.Lecturer.Department == department));
        }

        // Department filter (GUID): scope to students belonging to the selected department.
        if (departmentId.HasValue)
        {
            studentsQuery = studentsQuery.Where(s => s.DepartmentId == departmentId.Value);
        }

        var students = await studentsQuery
            .OrderBy(s => s.Class)
            .ThenBy(s => s.FullName)
            .ToListAsync(cancellationToken);

        var internshipIds = students
            .SelectMany(s => s.Internships)
            .Select(i => i.Id)
            .Distinct()
            .ToList();

        // Load Evaluations via optimized dictionary lookup to avoid N+1 queries
        var evaluations = await _db.Evaluations
            .AsNoTracking()
            .Where(e => internshipIds.Contains(e.InternshipId))
            .ToDictionaryAsync(e => e.InternshipId, cancellationToken);

        var totalWeeks = semesterId.HasValue
            ? Math.Max(await _db.Semesters.Where(s => s.Id == semesterId.Value).Select(s => (int?)s.TotalWeeks).FirstOrDefaultAsync(cancellationToken) ?? 1, 1)
            : Math.Max(await _db.Internships.Where(i => internshipIds.Contains(i.Id)).Select(i => (int?)i.Semester!.TotalWeeks).MaxAsync(cancellationToken) ?? 1, 1);
        var finalReportWeek = totalWeeks + 1;

        // Report schedule and attendance use the week count configured on the semester.
        var reportScheduleByWeek = await _db.SemesterReportSchedules
            .AsNoTracking()
            .Where(s => !s.IsDeleted && s.IsSubmissionOpen && (!semesterId.HasValue || s.SemesterId == semesterId.Value) && s.WeekNumber >= 1 && s.WeekNumber <= totalWeeks)
            .OrderBy(s => s.WeekNumber)
            .ToDictionaryAsync(s => s.WeekNumber, cancellationToken);
        var studentExportList = new List<InternshipStudentExportDto>();
        int stt = 1;
        var now = DateTime.UtcNow;

        foreach (var student in students)
        {
            var (ho, ten) = SplitFullName(student.FullName);
            var internship = student.Internships.FirstOrDefault();

            var dto = new InternshipStudentExportDto
            {
                Stt = stt++,
                StudentCode = student.StudentCode,
                Ho = ho,
                Ten = ten,
                Lop = student.Class ?? "—",
            };

            if (internship != null)
            {
                dto.PhuTrachCongTy = internship.Company?.CompanyName ?? "Chưa có";
                dto.GvHuongDan = internship.Lecturer?.FullName ?? "Chưa phân công";
                dto.GhiChu = string.Empty;

                // Count missing/late reports and attendance violations by configured week.
                var reports23 = internship.WeeklyReports
                    .Where(r => !r.IsDeleted && r.Status != WeeklyReportStatus.Draft)
                    .ToList();
                var submittedWeekCount = reports23
                    .Where(r => r.SubmittedAt.HasValue)
                    .Select(r => r.WeekNumber)
                    .Distinct()
                    .Count();
                var reportMissingCount = 0;
                var lateCount = 0;
                // Hai hệ thống độc lập: thiếu bài (nộp bài) vs vắng (điểm danh buổi hẹn)
                var absentCount23 = 0;
                foreach (var (week, schedule) in reportScheduleByWeek)
                {
                    var hasReport = reports23.Any(r => r.WeekNumber == week && r.SubmittedAt.HasValue);
                    var absent = student.AttendanceRecords.Any(a => !a.IsDeleted
                        && a.Status == AttendanceStatus.Absent
                        && a.AttendanceSession != null
                        && a.AttendanceSession.SemesterId == (internship.SemesterId ?? semesterId)
                        && !a.AttendanceSession.IsLecturerOnly
                        && a.AttendanceSession.WeekNumber == week);

                    if (absent)
                        absentCount23++;

                    if (!hasReport)
                    {
                        // Chưa nộp quá hạn → tính thiếu bài (chỉ ảnh hưởng Điểm QT)
                        if (schedule.DueDate < now)
                            reportMissingCount++;
                    }
                    else
                    {
                        var submittedAt = reports23.First(r => r.WeekNumber == week && r.SubmittedAt.HasValue).SubmittedAt!.Value;
                        if (submittedAt > schedule.DueDate)
                            lateCount++;
                    }
                }

                var finalSubmitted = internship.Submissions.Any(s => !s.IsDeleted
                    && s.Type == SubmissionType.FinalReport
                    && s.Status != SubmissionStatus.Rejected);
                var ineligible = !finalSubmitted || absentCount23 >= InternshipGradeCalculator.MaxAbsentWeeks;

                // Map scores from Evaluation if available
                if (evaluations.TryGetValue(internship.Id, out var eval))
                {
                    // Điểm tham gia là điểm cộng riêng cho sản phẩm sáng tạo.
                    dto.DiemThamGia = eval.HasCreativeProduct ? 1m : 0m;
                    if (eval.HasCreativeProduct)
                        dto.GhiChu = "Có sản phẩm sáng tạo";

                    // Điểm QT = MIN(10, Điểm QT cơ bản + Điểm tham gia).
                    var weeklyQualityLevels = new List<decimal?>();
                    if (!string.IsNullOrWhiteSpace(eval.WeeklyQualityJson))
                    {
                        try
                        {
                            var parsedQuality = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, decimal>>(eval.WeeklyQualityJson);
                            if (parsedQuality != null) weeklyQualityLevels.AddRange(parsedQuality.Values.Select(value => (decimal?)value));
                        }
                        catch (System.Text.Json.JsonException) { }
                    }
                    if (weeklyQualityLevels.Count == 0) weeklyQualityLevels.Add(eval.QualityLevel);
                    var processScore = InternshipGradeCalculator.ComputeProcessScore(
                        reportMissingCount, lateCount, submittedWeekCount, weeklyQualityLevels, false);
                    dto.DiemQT = InternshipGradeCalculator.Round1(Math.Min(10m, processScore + dto.DiemThamGia.Value));
                    // Cột J: Điểm thi vấn đáp nhập tay
                    dto.Thi = eval.OralExamScore ?? eval.FinalGrade;
                }
                else
                {
                    dto.DiemThamGia = 0m;
                    dto.DiemQT = InternshipGradeCalculator.ComputeProcessScore(
                        reportMissingCount,
                        lateCount,
                        0,
                        null,
                        false);
                }

                dto.IsIneligible = ineligible;

                // Các cột TUẦN dùng để đánh vắng: lấy từ điểm danh, không lấy trạng thái bài nộp.
                // Trạng thái bài nộp vẫn được dùng riêng cho HD CHUNG, Điểm QT và NỘP BC.
                var reports = internship.WeeklyReports.OrderBy(r => r.WeekNumber).ToList();
                dto.HdChung = reports.Count(r => reportScheduleByWeek.ContainsKey(r.WeekNumber) && r.SubmittedAt.HasValue) >= reportScheduleByWeek.Count ? "Đủ" : "Thiếu";
                dto.WeeklyReportCells = Enumerable.Range(1, totalWeeks)
                    .Select(week => FormatAttendanceCell(student.AttendanceRecords, internship.SemesterId ?? semesterId, week))
                    .ToList();
                dto.Tuan1 = FormatAttendanceCell(student.AttendanceRecords, internship.SemesterId ?? semesterId, 1);
                dto.Tuan2 = FormatAttendanceCell(student.AttendanceRecords, internship.SemesterId ?? semesterId, 2);
                dto.Tuan3 = FormatAttendanceCell(student.AttendanceRecords, internship.SemesterId ?? semesterId, 3);
                dto.Tuan4 = FormatAttendanceCell(student.AttendanceRecords, internship.SemesterId ?? semesterId, 4);
                dto.Tuan5 = FormatAttendanceCell(student.AttendanceRecords, internship.SemesterId ?? semesterId, 5);
                dto.Tuan6 = FormatAttendanceCell(student.AttendanceRecords, internship.SemesterId ?? semesterId, 6);

                // Report submission status follows the dynamically derived final report week.
                dto.NopBc = finalSubmitted ? "C" : "X";
            }
            else
            {
                dto.PhuTrachCongTy = string.Empty;
                dto.GvHuongDan = string.Empty;
                dto.GhiChu = string.Empty;
                dto.HdChung = "Thiếu";
                dto.Tuan1 = "–";
                dto.Tuan2 = "–";
                dto.Tuan3 = "–";
                dto.Tuan4 = "–";
                dto.Tuan5 = "–";
                dto.Tuan6 = "–";
                dto.NopBc = "X";
            }

            studentExportList.Add(dto);
        }

        // ────────────────────────────────────────────────────────────────────
        // 2. Relational Query for Sheet 2: DANH SÁCH DOANH NGHIỆP / TÊN CÔNG TY
        // ────────────────────────────────────────────────────────────────────
        var companiesQuery = _db.Companies
            .AsNoTracking()
            .Where(c => c.IsActive);

        if (semesterId.HasValue || lecturerId.HasValue || !string.IsNullOrWhiteSpace(department) || departmentId.HasValue)
        {
            companiesQuery = companiesQuery.Where(c => c.Internships.Any(i =>
                !i.IsDeleted
                && (!semesterId.HasValue || i.SemesterId == semesterId.Value)
                && (!lecturerId.HasValue || i.LecturerId == lecturerId.Value)
                && (string.IsNullOrWhiteSpace(department)
                    || i.Student.Department == department
                    || (i.Lecturer != null && i.Lecturer.Department == department))
                && (!departmentId.HasValue || i.Student.DepartmentId == departmentId.Value)));
        }

        var companies = await companiesQuery
            .Select(c => new CompanyExportDto
            {
                CompanyId = c.Id,
                CompanyName = c.CompanyName,
                Address = c.Address ?? "—",
                StudentCount = c.Internships.Count(i =>
                    !i.IsDeleted
                    && (!semesterId.HasValue || i.SemesterId == semesterId.Value)
                    && (!lecturerId.HasValue || i.LecturerId == lecturerId.Value)
                    && (string.IsNullOrWhiteSpace(department)
                        || i.Student.Department == department
                        || (i.Lecturer != null && i.Lecturer.Department == department))
                    && (!departmentId.HasValue || i.Student.DepartmentId == departmentId.Value)),
                ContactInfo = string.IsNullOrWhiteSpace(c.ContactPhone)
                    ? (c.ContactPerson ?? "—")
                    : $"{c.ContactPerson} - {c.ContactPhone}"
            })
            .OrderBy(c => c.CompanyName)
            .ToListAsync(cancellationToken);

        int compStt = 1;
        foreach (var c in companies)
        {
            c.Stt = compStt++;
        }

        // ────────────────────────────────────────────────────────────────────
        // 3. Relational Query for Sheet 3: DANH SÁCH GIẢNG VIÊN PHÂN CÔNG / DATABASE
        // ────────────────────────────────────────────────────────────────────
        var assignmentsQuery = _db.Internships
            .AsNoTracking()
            .Where(i => !i.IsDeleted && (!semesterId.HasValue || i.SemesterId == semesterId.Value) && (!lecturerId.HasValue || i.LecturerId == lecturerId.Value));

        if (!string.IsNullOrWhiteSpace(department))
        {
            assignmentsQuery = assignmentsQuery.Where(i => i.Student.Department == department || (i.Lecturer != null && i.Lecturer.Department == department));
        }

        if (departmentId.HasValue)
        {
            assignmentsQuery = assignmentsQuery.Where(i => i.Student.DepartmentId == departmentId.Value);
        }

        var assignments = await assignmentsQuery
            .Select(i => new LecturerAssignmentExportDto
            {
                StudentFullName = i.Student.FullName,
                StudentClass = i.Student.Class ?? "—",
                CompanyName = i.Company != null ? i.Company.CompanyName : "Chưa có",
                LecturerName = i.Lecturer != null ? i.Lecturer.FullName : "Chưa phân công",
                LecturerDepartment = i.Lecturer != null ? (i.Lecturer.Department ?? "—") : "—"
            })
            .OrderBy(a => a.StudentClass)
            .ThenBy(a => a.StudentFullName)
            .ToListAsync(cancellationToken);

        int assignStt = 1;
        foreach (var a in assignments)
        {
            a.Stt = assignStt++;
        }

        return new InternshipExportDataDto
        {
            TotalWeeks = totalWeeks,
            Students = studentExportList,
            Companies = companies,
            LecturerAssignments = assignments
        };
    }

    /// <inheritdoc />
    public async Task<byte[]> GenerateInternshipExportExcelAsync(Guid? semesterId = null, Guid? lecturerId = null, string? department = null, Guid? departmentId = null, CancellationToken cancellationToken = default)
    {
        var data = await GetExportDataAsync(semesterId, lecturerId, department, departmentId, cancellationToken);
        return GenerateFromData(data);
    }

    /// <inheritdoc />
    public byte[] GenerateFromData(InternshipExportDataDto data, string? templatePath = null)
    {
        var templateFile = ResolveTemplatePath(templatePath);

        XLWorkbook workbook;
        if (!string.IsNullOrEmpty(templateFile) && File.Exists(templateFile))
        {
            _logger.LogInformation("Loading Excel template from {Path}", templateFile);
            var templateBytes = File.ReadAllBytes(templateFile);
            var templateStream = new MemoryStream(templateBytes);
            workbook = new XLWorkbook(templateStream);
        }
        else
        {
            _logger.LogWarning("Excel template not found on disk. Building workbook programmatically with template layout.");
            workbook = CreateFallbackWorkbook();
        }

        using (workbook)
        {
            ExportStudents(workbook, data.Students, Math.Max(data.TotalWeeks, 1));
            ExportCompanies(workbook, data.Companies);
            ExportLecturerAssignments(workbook, data.LecturerAssignments);

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            return ms.ToArray();
        }
    }

    /// <inheritdoc />
    public async Task<byte[]> GenerateGuidanceScheduleExcelAsync(Guid semesterId, Guid lecturerId, CancellationToken cancellationToken = default)
    {
        var semester = await _db.Semesters
            .FirstOrDefaultAsync(s => s.Id == semesterId, cancellationToken);

        if (semester == null)
            throw new InvalidOperationException($"Không tìm thấy học kỳ có mã {semesterId}");

        var lecturer = await _db.Lecturers
            .Include(l => l.User)
            .Include(l => l.DepartmentRef)
            .FirstOrDefaultAsync(l => l.Id == lecturerId, cancellationToken);

        if (lecturer == null)
            throw new InvalidOperationException($"Không tìm thấy giảng viên có mã {lecturerId}");

        var internships = await _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Where(i => i.SemesterId == semesterId && i.LecturerId == lecturerId && !i.IsDeleted)
            .OrderBy(i => i.Student.Class)
            .ThenBy(i => i.Student.FullName)
            .ToListAsync(cancellationToken);

        var attendanceSessions = await _db.AttendanceSessions
            .AsNoTracking()
            .Where(s => s.SemesterId == semesterId && s.LecturerId == lecturerId && !s.IsDeleted)
            .OrderBy(s => s.WeekNumber)
            .ThenBy(s => s.MeetingDate)
            .ToListAsync(cancellationToken);

        // Tuần học kỳ tuyệt đối: tuần HK = InternshipStartWeek + (tuần tương đối - 1)
        // (thực tập tuần 1..6 = tuần 14..19 của học kỳ khi InternshipStartWeek = 14).
        var semesterWeekOffset = semester.InternshipStartWeek - 1;

        // The workbook is a layout template only; all semester and student data below
        // comes from the selected semester and current lecturer assignment.
        var templatePath = TemplateHelper.FindTemplatePath("Lich huong dan TTTN.xlsx");

        XLWorkbook workbook;
        MemoryStream? workbookSourceStream = null;
        if (!string.IsNullOrEmpty(templatePath) && File.Exists(templatePath))
        {
            // Keep the backing stream alive for the workbook's lifetime — ClosedXML reads
            // it lazily (e.g. during SaveAs), so disposing it here corrupts the workbook.
            var templateBytes = await File.ReadAllBytesAsync(templatePath, cancellationToken);
            workbookSourceStream = new MemoryStream(templateBytes);
            workbook = new XLWorkbook(workbookSourceStream);
        }
        else
        {
            workbook = new XLWorkbook();
            workbook.Worksheets.Add("LỊCH HƯỚNG DẪN");
        }

        try
        {
            var ws1 = workbook.Worksheets.FirstOrDefault() ?? workbook.Worksheets.Add("LỊCH HƯỚNG DẪN");

            var studentCount = internships.Count;
            var distinctClassesList = internships
                .Select(i => i.Student.Class)
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Distinct()
                .ToList();
            var distinctClasses = distinctClassesList.Count > 0
                ? string.Join(", ", distinctClassesList)
                : "Chưa cập nhật";

            var academicYear = semester.AcademicYear ?? $"{DateTime.Now.Year}-{DateTime.Now.Year + 1}";
            var semesterNumber = !string.IsNullOrWhiteSpace(semester.Term)
                ? semester.Term
                : (semester.Name.Contains("2") ? "HK2" : (semester.Name.Contains("3") ? "HK Hè" : "HK1"));

            var departmentNameRaw = lecturer.DepartmentRef?.Name ?? lecturer.Department;
            // Template already has "KHOA" before {{TEN_KHOA}}, so use name WITHOUT "Khoa" prefix
            var departmentNameForTemplate = !string.IsNullOrWhiteSpace(departmentNameRaw)
                ? (departmentNameRaw.StartsWith("Khoa", StringComparison.OrdinalIgnoreCase)
                    ? departmentNameRaw.Substring(4).TrimStart()
                    : departmentNameRaw)
                : string.Empty;
            // Full name with prefix (for other uses)
            var fullDepartmentName = !string.IsNullOrWhiteSpace(departmentNameRaw)
                ? (departmentNameRaw.StartsWith("Khoa", StringComparison.OrdinalIgnoreCase) ? departmentNameRaw : $"Khoa {departmentNameRaw}")
                : string.Empty;

            var soTietQuyDoi = $"2x{studentCount:D2} = {2 * studentCount} tiết";

            // ── 1. Find the template row that contains {{item.stt}} ──
            int itemTemplateRow = 0;
            foreach (var cell in ws1.CellsUsed())
            {
                if (cell.GetString().Contains("{{item.stt}}", StringComparison.Ordinal))
                {
                    itemTemplateRow = cell.Address.RowNumber;
                    break;
                }
            }

            // ── 2. Insert session rows (shift rows down if needed) ──
            int sessionCount = attendanceSessions.Count;
            if (itemTemplateRow > 0 && sessionCount > 0)
            {
                // Insert extra rows if template only has 1 placeholder row but we have more sessions
                if (sessionCount > 1)
                {
                    ws1.Row(itemTemplateRow + 1).InsertRowsAbove(sessionCount - 1);
                }

                for (int i = 0; i < sessionCount; i++)
                {
                    int r = itemTemplateRow + i;
                    var session = attendanceSessions[i];
                    ws1.Cell(r, 1).Value = i + 1;                                    // {{item.stt}}
                    ws1.Cell(r, 2).Value = session.MeetingDate.ToString("dd/MM/yyyy"); // {{item.ngay}}
                    ws1.Cell(r, 3).Value = session.WeekNumber + semesterWeekOffset;    // {{item.tuan}} — tuần học kỳ
                    // 1 tiết = 45 phút
                    var soTiet = session.DurationMinutes.HasValue
                        ? Math.Round((decimal)session.DurationMinutes.Value / 45m, 2, MidpointRounding.AwayFromZero)
                        : 0m;
                    ws1.Cell(r, 4).Value = soTiet;
                    ws1.Cell(r, 4).Style.NumberFormat.Format = "0.##";              // {{item.so_tiet}} - hide trailing zeros
                    ws1.Cell(r, 5).Value = session.Title ?? string.Empty;             // {{item.noi_dung}}
                    ws1.Cell(r, 11).Value = session.Location ?? string.Empty;          // {{item.ghi_chu}}
                }
            }
            else if (itemTemplateRow > 0)
            {
                // No sessions — clear the template row
                for (int c = 1; c <= 10; c++) ws1.Cell(itemTemplateRow, c).Value = string.Empty;
            }

            // ── 2b. Update "Tổng cộng" row with actual sum of so_tiet ──
            // 1 tiết = 45 phút
            decimal totalSoTiet = 0;
            for (int i = 0; i < sessionCount; i++)
            {
                var s = attendanceSessions[i];
                totalSoTiet += s.DurationMinutes.HasValue
                    ? Math.Round((decimal)s.DurationMinutes.Value / 45m, 2, MidpointRounding.AwayFromZero)
                    : 0m;
            }
            // Find the "Tổng cộng" row and update the total cell (column D = so_tiet)
            foreach (var cell in ws1.CellsUsed())
            {
                if (cell.GetString().Contains("Tổng cộng", StringComparison.OrdinalIgnoreCase))
                {
                    ws1.Cell(cell.Address.RowNumber, 4).Value = totalSoTiet;
                    ws1.Cell(cell.Address.RowNumber, 4).Style.NumberFormat.Format = "0.##";
                    break;
                }
            }

            // ── 3. Global placeholder replacement across ALL cells in Sheet 1 ──
            var replacementMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["{{TEN_KHOA}}"] = departmentNameForTemplate,
                ["{{KHOA}}"] = departmentNameForTemplate,
                ["{{TEN_GIANG_VIEN}}"] = lecturer.FullName,
                ["{{GIANG_VIEN}}"] = lecturer.FullName,
                ["{{TEN_HOC_KY}}"] = semester.Name,
                ["{{HOC_KY}}"] = semesterNumber,
                ["{{NAM_HOC}}"] = academicYear,
                ["{{SO_SV}}"] = studentCount.ToString("D2"),
                ["{{DANH_SACH_LOP}}"] = distinctClasses,
                ["{{LOP}}"] = distinctClasses,
                ["{{TEN_HOC_PHAN}}"] = semester.Name,
                ["{{SO_TIET_QUI_DOI}}"] = soTietQuyDoi,
                ["{{NGAY}}"] = DateTime.Now.Day.ToString(),
                ["{{THANG}}"] = DateTime.Now.Month.ToString("D2"),
                ["{{NAM}}"] = DateTime.Now.Year.ToString(),
            };

            foreach (var cell in ws1.CellsUsed())
            {
                var text = cell.GetString();
                if (string.IsNullOrEmpty(text) || !text.Contains("{{", StringComparison.Ordinal)) continue;

                foreach (var kv in replacementMap)
                {
                    text = text.Replace(kv.Key, kv.Value, StringComparison.OrdinalIgnoreCase);
                }
                // Clear any leftover {{…}} / {{item.…}} placeholders
                text = System.Text.RegularExpressions.Regex.Replace(text, @"\{\{item\.[^}]*\}\}", string.Empty);
                text = System.Text.RegularExpressions.Regex.Replace(text, @"\{\{[^}]*\}\}", string.Empty);
                cell.Value = text.Trim();
            }

            // Sheet 2: Danh sách sinh viên thực tập của giảng viên
            var ws2 = workbook.Worksheets.Count > 1 ? workbook.Worksheets.Worksheet(2) : workbook.Worksheets.Add("DANH SÁCH SINH VIÊN");
            ws2.Name = "DANH SÁCH SINH VIÊN";
            ws2.Clear();

            // Title
            ws2.Cell("A1").Value = "DANH SÁCH SINH VIÊN THỰC TẬP HƯỚNG DẪN";
            ws2.Cell("A1").Style.Font.Bold = true;
            ws2.Cell("A1").Style.Font.FontSize = 14;
            ws2.Range("A1:G1").Merge().Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);

            ws2.Cell("A2").Value = $"Giảng viên: {lecturer.FullName} ({lecturer.StaffCode}) | Học kỳ: {semester.Name} | Năm học: {academicYear}";
            ws2.Cell("A2").Style.Font.Italic = true;
            ws2.Range("A2:G2").Merge().Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);

            // Table Headers
            var headers = new[] { "STT", "MSSV", "Họ và tên", "Lớp", "Đơn vị thực tập", "Địa chỉ / Người phụ trách", "Ghi chú" };
            for (int col = 0; col < headers.Length; col++)
            {
                var cell = ws2.Cell(4, col + 1);
                cell.Value = headers[col];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#E2EFDA"));
                cell.Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
                cell.Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin);
            }

            int rowIdx = 5;
            int sttIdx = 1;
            foreach (var intern in internships)
            {
                ws2.Cell(rowIdx, 1).Value = sttIdx++;
                ws2.Cell(rowIdx, 1).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
                ws2.Cell(rowIdx, 2).Value = intern.Student.StudentCode;
                ws2.Cell(rowIdx, 2).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
                ws2.Cell(rowIdx, 3).Value = intern.Student.FullName;
                ws2.Cell(rowIdx, 4).Value = intern.Student.Class ?? "—";
                ws2.Cell(rowIdx, 4).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
                ws2.Cell(rowIdx, 5).Value = intern.Company?.CompanyName ?? "Chưa có";
                ws2.Cell(rowIdx, 6).Value = intern.Company != null
                    ? $"{intern.Company.Address ?? ""} {(string.IsNullOrEmpty(intern.Company.ContactPerson) ? "" : " - LH: " + intern.Company.ContactPerson)}"
                    : "—";
                ws2.Cell(rowIdx, 7).Value = intern.Notes ?? string.Empty;

                ws2.Range(rowIdx, 1, rowIdx, 7).Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin);
                ws2.Range(rowIdx, 1, rowIdx, 7).Style.Border.SetInsideBorder(XLBorderStyleValues.Thin);

                rowIdx++;
            }

            ws2.Columns(1, 7).AdjustToContents();

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            return ms.ToArray();
        }
        finally
        {
            workbook.Dispose();
            workbookSourceStream?.Dispose();
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // Modular Sheet Exporters
    // ────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Populates Sheet 1 (DANH SÁCH / DANH SÁCH THỰC TẬP) with dynamic rows, formulas, and preserved formatting.
    /// </summary>
    private void ExportStudents(XLWorkbook workbook, List<InternshipStudentExportDto> students, int totalWeeks)
    {
        var ws = FindWorksheet(workbook, "DANH SÁCH (2)", "DANH SÁCH THỰC TẬP", "DANH SÁCH")
            ?? workbook.Worksheets.FirstOrDefault();
        if (ws == null) return;

        var courseKey = students
            .Select(s => s.Lop?.Trim())
            .Where(className => !string.IsNullOrWhiteSpace(className))
            .Select(className => className!.Length >= 3 ? className[..3] : className)
            .FirstOrDefault() ?? "—";
        ws.Cell(1, 1).Value = $"DANH SÁCH SINH VIÊN THỰC TẬP TẠI DOANH NGHIỆP KHÓA {courseKey}";

        const int dataStartRow = 3;
        const int defaultTemplateCapacity = 50; // Rows 3 to 52 in template
        int recordCount = students.Count;

        // 1. Locate or determine the Lookup & Statistics section
        // In the original template, Rows 64-71 are the lookup table, and Row 72 is the total row.
        int originalLookupStartRow = 65;
        int originalLookupEndRow = 71;
        int originalSumRow = 72;

        int extraRows = 0;
        if (recordCount > defaultTemplateCapacity)
        {
            extraRows = recordCount - defaultTemplateCapacity;
            int insertPosition = dataStartRow + defaultTemplateCapacity; // Row 53
            ws.Row(insertPosition).InsertRowsAbove(extraRows);

            // Copy style from template data row (Row 3) to newly inserted rows
            var templateRow = ws.Row(dataStartRow);
            for (int i = 0; i < extraRows; i++)
            {
                int targetRow = insertPosition + i;
                CopyTemplateRowStyle(templateRow, ws.Row(targetRow));
            }
        }

        int lastDataRow = Math.Max(dataStartRow, dataStartRow + recordCount - 1);
        int currentLookupStartRow = originalLookupStartRow + extraRows;
        int currentLookupEndRow = originalLookupEndRow + extraRows;
        int currentSumRow = originalSumRow + extraRows;

        // 2. Populate student data rows
        for (int i = 0; i < recordCount; i++)
        {
            int r = dataStartRow + i;
            var s = students[i];
            MapStudentToRow(ws, r, s, totalWeeks, currentLookupStartRow, currentLookupEndRow);
        }

        // 3. Clear unused template placeholder rows (if fewer than 50 records)
        if (recordCount < defaultTemplateCapacity)
        {
            for (int r = dataStartRow + recordCount; r < dataStartRow + defaultTemplateCapacity; r++)
            {
                ClearUnusedRow(ws, r);
            }
        }

        // 4. Update Lookup Table & Statistics Formulas
        UpdateLookupAndStatisticFormulas(ws, dataStartRow, lastDataRow, currentLookupStartRow, currentLookupEndRow, currentSumRow);
    }

    /// <summary>
    /// Populates Sheet 2 (TÊN CÔNG TY / DANH SÁCH DOANH NGHIỆP).
    /// </summary>
    private void ExportCompanies(XLWorkbook workbook, List<CompanyExportDto> companies)
    {
        var ws = FindWorksheet(workbook, "TÊN CÔNG TY (2)", "TÊN CÔNG TY", "DANH SÁCH DOANH NGHIỆP");
        if (ws == null) return;

        const int dataStartRow = 2;
        int recordCount = companies.Count;

        // Populate rows
        for (int i = 0; i < recordCount; i++)
        {
            int r = dataStartRow + i;
            var c = companies[i];
            MapCompanyToRow(ws, r, c);
        }

        // Clear any excess existing template rows beyond record count
        int maxRow = ws.LastRowUsed()?.RowNumber() ?? (dataStartRow + recordCount);
        for (int r = dataStartRow + recordCount; r <= maxRow; r++)
        {
            ws.Row(r).Clear();
        }

        ws.Columns(1, 6).AdjustToContents();
    }

    /// <summary>
    /// Populates Sheet 3 (DATABASE / DANH SÁCH GIẢNG VIÊN PHÂN CÔNG).
    /// </summary>
    private void ExportLecturerAssignments(XLWorkbook workbook, List<LecturerAssignmentExportDto> assignments)
    {
        var ws = FindWorksheet(workbook, "DATABASE", "DANH SÁCH GIẢNG VIÊN PHÂN CÔNG");
        if (ws == null) return;

        const int dataStartRow = 3;
        int recordCount = assignments.Count;

        for (int i = 0; i < recordCount; i++)
        {
            int r = dataStartRow + i;
            var a = assignments[i];
            MapLecturerAssignmentToRow(ws, r, a);
        }

        int maxRow = ws.LastRowUsed()?.RowNumber() ?? (dataStartRow + recordCount);
        for (int r = dataStartRow + recordCount; r <= maxRow; r++)
        {
            ws.Row(r).Clear();
        }

        ws.Columns(1, 6).AdjustToContents();
    }

    // ────────────────────────────────────────────────────────────────────────
    // Row Mapping & Formula Helpers
    // ────────────────────────────────────────────────────────────────────────

    private static void MapStudentToRow(
        IXLWorksheet ws,
        int row,
        InternshipStudentExportDto s,
        int totalWeeks,
        int lookupStartRow,
        int lookupEndRow)
    {
        ws.Cell(row, 1).Value = s.Stt;
        ws.Cell(row, 2).Value = s.Ho;
        ws.Cell(row, 3).Value = s.Ten;
        ws.Cell(row, 4).Value = s.Lop;
        ws.Cell(row, 5).Value = s.PhuTrachCongTy;
        ws.Cell(row, 6).Value = s.GvHuongDan;
        ws.Cell(row, 7).Value = s.GhiChu;

        // Scores (Cols H, I, J)
        if (s.DiemThamGia.HasValue) ws.Cell(row, 8).Value = s.DiemThamGia.Value;
        else ws.Cell(row, 8).Clear(XLClearOptions.Contents);

        if (s.DiemQT.HasValue) ws.Cell(row, 9).Value = s.DiemQT.Value;
        else ws.Cell(row, 9).Clear(XLClearOptions.Contents);

        if (s.Thi.HasValue) ws.Cell(row, 10).Value = s.Thi.Value;
        else ws.Cell(row, 10).Clear(XLClearOptions.Contents);

        // K: Điểm TB Formula — không đủ điều kiện → 0, ngược lại QT*0.4 + Thi*0.6
        if (s.IsIneligible)
        {
            ws.Cell(row, 11).Value = 0m;
            ws.Cell(row, 12).Value = InternshipGradeCalculator.IneligibleClassification;
        }
        else
        {
            ws.Cell(row, 11).FormulaA1 = $"ROUND(I{row}*0.4+J{row}*0.6,1)";

            // L: Xếp loại Formula via dynamic VLOOKUP
            ws.Cell(row, 12).FormulaA1 = $"VLOOKUP(K{row},$I${lookupStartRow}:$L${lookupEndRow},4,1)";
        }

        // Progress starts at M and expands with the configured number of weeks.
        ws.Cell(row, 13).Value = s.HdChung;
        var weeklyCells = s.WeeklyReportCells.Count > 0
            ? s.WeeklyReportCells
            : new[] { s.Tuan1, s.Tuan2, s.Tuan3, s.Tuan4, s.Tuan5, s.Tuan6 }.Take(totalWeeks).ToList();
        for (var week = 0; week < totalWeeks; week++)
            ws.Cell(row, 14 + week).Value = week < weeklyCells.Count ? weeklyCells[week] : string.Empty;

        var finalReportColumn = 14 + totalWeeks;
        var eligibilityColumn = finalReportColumn + 1;

        // Final report submission.
        ws.Cell(row, finalReportColumn).Value = s.NopBc;

        // Final eligibility formula uses the dynamically sized weekly range.
        var firstWeekColumn = 14;
        var lastWeekColumn = finalReportColumn - 1;
        var firstWeekAddress = ws.Cell(row, firstWeekColumn).Address.ColumnLetter;
        var lastWeekAddress = ws.Cell(row, lastWeekColumn).Address.ColumnLetter;
        var finalReportAddress = ws.Cell(row, finalReportColumn).Address.ColumnLetter;
        ws.Cell(row, eligibilityColumn).FormulaA1 = $"IF(OR(NOT(OR({finalReportAddress}{row}=\"C\",{finalReportAddress}{row}=\"✓\")),(COUNTIF({firstWeekAddress}{row}:{lastWeekAddress}{row},\"V\")>=2)),\"{InternshipGradeCalculator.IneligibleCell}\",\"\")";

        // Formatting styles
        for (int c = 1; c <= eligibilityColumn; c++)
        {
            var cell = ws.Cell(row, c);
            cell.Style.Font.FontName = "Times New Roman";
            cell.Style.Font.FontSize = 10;
            cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            cell.Style.Border.OutsideBorderColor = XLColor.FromHtml("#D1D5DB");
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }

        // Alignments
        ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        ws.Cell(row, 4).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        ws.Cell(row, 8).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
        ws.Cell(row, 9).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
        ws.Cell(row, 10).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
        ws.Cell(row, 11).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
        ws.Cell(row, 12).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        for (int c = 13; c <= eligibilityColumn; c++)
        {
            ws.Cell(row, c).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }
    }

    private static void MapCompanyToRow(IXLWorksheet ws, int row, CompanyExportDto c)
    {
        ws.Cell(row, 1).Value = c.Stt;
        ws.Cell(row, 2).Value = c.CompanyName;
        ws.Cell(row, 3).Value = c.Address;
        ws.Cell(row, 4).Value = c.StudentCount;
        ws.Cell(row, 6).Value = c.ContactInfo;

        for (int col = 1; col <= 6; col++)
        {
            var cell = ws.Cell(row, col);
            cell.Style.Font.FontName = "Times New Roman";
            cell.Style.Font.FontSize = 10;
            cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            cell.Style.Border.OutsideBorderColor = XLColor.FromHtml("#D1D5DB");
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }
        ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        ws.Cell(row, 4).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
    }

    private static void MapLecturerAssignmentToRow(IXLWorksheet ws, int row, LecturerAssignmentExportDto a)
    {
        ws.Cell(row, 1).Value = a.Stt;
        ws.Cell(row, 2).Value = a.StudentFullName;
        ws.Cell(row, 3).Value = a.StudentClass;
        ws.Cell(row, 4).Value = a.CompanyName;
        ws.Cell(row, 5).Value = a.LecturerName;
        ws.Cell(row, 6).Value = a.LecturerDepartment;

        for (int col = 1; col <= 6; col++)
        {
            var cell = ws.Cell(row, col);
            cell.Style.Font.FontName = "Times New Roman";
            cell.Style.Font.FontSize = 10;
            cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            cell.Style.Border.OutsideBorderColor = XLColor.FromHtml("#D1D5DB");
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }
        ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        ws.Cell(row, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
    }

    private static void ClearUnusedRow(IXLWorksheet ws, int row)
    {
        for (int c = 1; c <= 21; c++)
        {
            var cell = ws.Cell(row, c);
            cell.Clear(XLClearOptions.Contents | XLClearOptions.DataValidation);
        }
    }

    private static void CopyTemplateRowStyle(IXLRow sourceRow, IXLRow targetRow)
    {
        targetRow.Height = sourceRow.Height;
        for (int c = 1; c <= 21; c++)
        {
            var src = sourceRow.Cell(c);
            var tgt = targetRow.Cell(c);
            tgt.Style.Font.FontName = src.Style.Font.FontName;
            tgt.Style.Font.FontSize = src.Style.Font.FontSize;
            tgt.Style.Alignment.Horizontal = src.Style.Alignment.Horizontal;
            tgt.Style.Alignment.Vertical = src.Style.Alignment.Vertical;
            tgt.Style.Border.TopBorder = src.Style.Border.TopBorder;
            tgt.Style.Border.BottomBorder = src.Style.Border.BottomBorder;
            tgt.Style.Border.LeftBorder = src.Style.Border.LeftBorder;
            tgt.Style.Border.RightBorder = src.Style.Border.RightBorder;
            tgt.Style.Border.TopBorderColor = src.Style.Border.TopBorderColor;
            tgt.Style.Border.BottomBorderColor = src.Style.Border.BottomBorderColor;
            tgt.Style.Border.LeftBorderColor = src.Style.Border.LeftBorderColor;
            tgt.Style.Border.RightBorderColor = src.Style.Border.RightBorderColor;
        }
    }

    private static void UpdateLookupAndStatisticFormulas(
        IXLWorksheet ws,
        int dataStartRow,
        int lastDataRow,
        int lookupStartRow,
        int lookupEndRow,
        int sumRow)
    {
        // For each rating row in the conversion table (rows lookupStartRow..lookupEndRow)
        for (int r = lookupStartRow; r <= lookupEndRow; r++)
        {
            // Col M (Col 13): count how many students received rating in Col L
            ws.Cell(r, 13).FormulaA1 = $"COUNTIF($L${dataStartRow}:$L${lastDataRow},L{r})";
            // Col N (Col 14): percentage of total
            ws.Cell(r, 14).FormulaA1 = $"M{r}/$M${sumRow}";
        }

        // Sum row: Col M (Col 13) = SUM(M{lookupStartRow}:M{lookupEndRow})
        ws.Cell(sumRow, 13).FormulaA1 = $"SUM(M{lookupStartRow}:M{lookupEndRow})";
    }

    // ────────────────────────────────────────────────────────────────────────
    // Fallback Workbook Builder (if template file is missing)
    // ────────────────────────────────────────────────────────────────────────

    private static XLWorkbook CreateFallbackWorkbook()
    {
        var wb = new XLWorkbook();
        var ws1 = wb.Worksheets.Add("DANH SÁCH (2)");
        ws1.Cell(1, 1).Value = "DANH SÁCH SINH VIÊN THỰC TẬP TẠI DOANH NGHIỆP";
        ws1.Range(1, 1, 1, 21).Merge();
        ws1.Cell(1, 1).Style.Font.Bold = true;
        ws1.Cell(1, 1).Style.Font.FontSize = 14;
        ws1.Cell(1, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        var headers = new[]
        {
            "STT", "HỌ", "TÊN", "LỚP", "PHỤ TRÁCH CÔNG TY", "GV HƯỚNG DẪN THỰC TẬP",
            "GHI CHÚ", "Điểm tham gia", "Điểm QT", "Thi", "Điểm TB", "Kết quả xếp loại",
            "HD CHUNG", "TUẦN 1", "TUẦN 2", "TUẦN 3", "TUẦN 4", "TUẦN 5", "TUẦN 6", "NỘP BC", "TỔNG"
        };
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws1.Cell(2, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E2E8F0");
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        // Seed default conversion lookup table at rows 65-71
        ws1.Cell(63, 9).Value = "BẢNG THỐNG KÊ THEO THANG ĐIỂM QUY ĐỔI";
        ws1.Cell(64, 9).Value = "Hệ 10"; ws1.Cell(64, 10).Value = "Hệ 4"; ws1.Cell(64, 11).Value = "Điểm chữ"; ws1.Cell(64, 12).Value = "Xếp loại"; ws1.Cell(64, 13).Value = "kết quả";

        var lookupData = new (double Score10, double Score4, string Letter, string Rating)[]
        {
            (0.0, 0.0, "F", "không thực tập"),
            (4.0, 1.0, "D", "yếu"),
            (5.0, 2.0, "C", "Trung bình"),
            (6.5, 2.5, "C+", "Trung bình khá"),
            (7.0, 3.0, "B", "Khá"),
            (8.0, 3.5, "B+", "Giỏi"),
            (8.5, 4.0, "A", "Xuất sắc")
        };

        for (int i = 0; i < lookupData.Length; i++)
        {
            int r = 65 + i;
            ws1.Cell(r, 9).Value = lookupData[i].Score10;
            ws1.Cell(r, 10).Value = lookupData[i].Score4;
            ws1.Cell(r, 11).Value = lookupData[i].Letter;
            ws1.Cell(r, 12).Value = lookupData[i].Rating;
        }

        var ws2 = wb.Worksheets.Add("DATABASE");
        ws2.Cell(2, 1).Value = "STT";
        ws2.Cell(2, 2).Value = "HỌ TÊN";
        ws2.Cell(2, 3).Value = "LỚP";
        ws2.Cell(2, 4).Value = "CÔNG TY THỰC TẬP";
        ws2.Cell(2, 5).Value = "GV HƯỚNG DẪN";
        ws2.Cell(2, 6).Value = "KHOA / BỘ MÔN";

        var ws3 = wb.Worksheets.Add("TÊN CÔNG TY (2)");
        ws3.Cell(1, 1).Value = "STT";
        ws3.Cell(1, 2).Value = "Tên Công Ty";
        ws3.Cell(1, 3).Value = "Địa Chỉ";
        ws3.Cell(1, 4).Value = "Số Lượng";
        ws3.Cell(1, 6).Value = "Liên Hệ";

        return wb;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Utilities
    // ────────────────────────────────────────────────────────────────────────

    private static IXLWorksheet? FindWorksheet(XLWorkbook workbook, params string[] candidateNames)
    {
        foreach (var name in candidateNames)
        {
            var ws = workbook.Worksheets.FirstOrDefault(w =>
                w.Name.Equals(name, StringComparison.OrdinalIgnoreCase)
                || w.Name.Contains(name, StringComparison.OrdinalIgnoreCase));
            if (ws != null) return ws;
        }
        return null;
    }

    private static string? ResolveTemplatePath(string? customPath)
    {
        if (!string.IsNullOrEmpty(customPath) && File.Exists(customPath))
            return customPath;

        // Prefer the multi-sheet internship list template — never the guidance-schedule workbook.
        return TemplateHelper.FindTemplatePath("InternshipExportTemplate.xlsx")
            ?? TemplateHelper.FindTemplatePath("DANH SACH THUC TAP C23.xlsx");
    }

    private static (string Ho, string Ten) SplitFullName(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            return (string.Empty, string.Empty);

        var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length <= 1)
            return (string.Empty, fullName.Trim());

        var ten = parts[^1];
        var ho = string.Join(' ', parts[..^1]);
        return (ho, ten);
    }

    private static string FormatAttendanceCell(
        IEnumerable<AttendanceRecord> records,
        Guid? semesterId,
        int weekNumber)
    {
        var weekRecords = records.Where(record =>
            !record.IsDeleted
            && record.AttendanceSession != null
            && record.AttendanceSession.SemesterId == semesterId
            && !record.AttendanceSession.IsDeleted
            && !record.AttendanceSession.IsLecturerOnly
            && record.AttendanceSession.WeekNumber == weekNumber);

        if (weekRecords.Any(record => record.Status == AttendanceStatus.Absent)) return "V";
        if (weekRecords.Any(record => record.Status == AttendanceStatus.Present)) return "✓";
        return "–";
    }
}
