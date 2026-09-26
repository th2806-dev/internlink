using ClosedXML.Excel;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using InternLink.Domain.Entities;
using InternLink.Application.Common;
using InternLink.Application.Interfaces;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

/// <summary>
/// Generates institutional reports matching the C23 Excel and C22A summary templates
/// from "DANH SACH THUC TAP C23.xlsx" and "Bao cao tong ket cong tac thuc tap tot nghiep C22A.docx".
/// </summary>
public class InternshipReportService : IInternshipReportService
{
    private readonly AppDbContext _db;

    public InternshipReportService(AppDbContext db)
    {
        _db = db;
    }

    /// <inheritdoc />

    /// <inheritdoc />
    public async Task<byte[]> ExportC22ASummaryReportAsync(Guid? semesterId = null, string? department = null, Guid? departmentId = null, Guid? lecturerId = null)
    {
        // ── Load data ──────────────────────────────────────────────────────
        var internshipsQuery = _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Lecturer)
            .Include(i => i.WeeklyReports)
            .Include(i => i.Semester)
            .AsNoTracking();

        if (semesterId.HasValue)
            internshipsQuery = internshipsQuery.Where(i => i.SemesterId == semesterId.Value);

        // Scope by the STUDENT's department: the report summarizes a khoa's students.
        // Matching by lecturer's department would leak other departments' students
        // whenever a lecturer supervises cross-department internships.
        if (!string.IsNullOrWhiteSpace(department))
            internshipsQuery = internshipsQuery.Where(i => i.Student.Department == department);

        // GUID filter overrides the legacy string filter when provided.
        if (departmentId.HasValue)
            internshipsQuery = internshipsQuery.Where(i => i.Student.DepartmentId == departmentId.Value);

        // GV-scoped: chỉ internship do GV này hướng dẫn (controller ép lecturerId từ token).
        if (lecturerId.HasValue)
            internshipsQuery = internshipsQuery.Where(i => i.LecturerId == lecturerId.Value);

        var internships = await internshipsQuery.ToListAsync();

        var internshipIds = internships.Select(i => i.Id).ToHashSet();
        var evaluations = await _db.Set<Domain.Entities.Evaluation>()
            .Where(e => internshipIds.Contains(e.InternshipId))
            .AsNoTracking()
            .ToDictionaryAsync(e => e.InternshipId);

        var (absentWeeksByInternship, weeklyQualityLevelsByInternship) = await LoadGradingContextAsync(internships, semesterId, evaluations);

        // Mốc thống kê theo KHÓA THỰC TẬP CỦA KỲ (đề xuất P1) — không tính toàn bộ SV mọi khóa của khoa.
        var (totalStudents, _) = await ComputeCohortStatsAsync(internships, department, departmentId);

        var totalCompanies = internships.Select(i => i.CompanyId).Where(c => c.HasValue).Distinct().Count();

        // Build the summary report as a styled Excel file (matching the C22A Word structure)
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("BÁO CÁO TỔNG KẾT");
        var totalWeeks = internships
            .Select(i => i.Semester?.TotalWeeks ?? 0)
            .Where(weeks => weeks > 0)
            .DefaultIfEmpty(0)
            .Max();
        var reportScheduleByWeek = await LoadReportScheduleByWeekAsync(semesterId, totalWeeks);
        BuildC22ASummarySheet(ws, internships, evaluations, totalStudents, totalCompanies, absentWeeksByInternship, weeklyQualityLevelsByInternship, reportScheduleByWeek, DateTime.UtcNow);

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    /// <inheritdoc />
    public async Task<byte[]> ExportC22AWordReportAsync(Guid? semesterId = null, string? department = null, Guid? departmentId = null, Guid? lecturerId = null)
    {
        // ── Load data ──────────────────────────────────────────────────────
        var internshipsQuery = _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Lecturer)
            .Include(i => i.WeeklyReports)
            .Include(i => i.Submissions)
            .AsNoTracking();

        if (semesterId.HasValue)
            internshipsQuery = internshipsQuery.Where(i => i.SemesterId == semesterId.Value);

        // Scope by the STUDENT's department: the report summarizes a khoa's students.
        // Matching by lecturer's department would leak other departments' students
        // whenever a lecturer supervises cross-department internships.
        if (!string.IsNullOrWhiteSpace(department))
            internshipsQuery = internshipsQuery.Where(i => i.Student.Department == department);

        // GUID filter overrides the legacy string filter when provided.
        if (departmentId.HasValue)
            internshipsQuery = internshipsQuery.Where(i => i.Student.DepartmentId == departmentId.Value);

        // GV-scoped: chỉ internship do GV này hướng dẫn (controller ép lecturerId từ token).
        if (lecturerId.HasValue)
            internshipsQuery = internshipsQuery.Where(i => i.LecturerId == lecturerId.Value);

        var internships = await internshipsQuery.ToListAsync();

        var internshipIds = internships.Select(i => i.Id).ToHashSet();
        var evaluations = await _db.Set<Domain.Entities.Evaluation>()
            .Where(e => internshipIds.Contains(e.InternshipId))
            .AsNoTracking()
            .ToDictionaryAsync(e => e.InternshipId);

        var (absentWeeksByInternship, weeklyQualityLevelsByInternship) = await LoadGradingContextAsync(internships, semesterId, evaluations);

        var totalCompanies = internships
            .Select(i => i.CompanyId)
            .Where(c => c.HasValue).Distinct().Count();

        // Ưu tiên nội dung tổng kết CẤP KHOA (admin soạn); fallback sang nội dung tổng kết của giảng viên
        // khi xuất theo một GV cụ thể.
        // Ưu tiên bản ghi tổng kết CẤP KHOA nếu đã từng lưu (kể cả khi một số mục còn trống).
        var facultySummary = semesterId.HasValue
            ? await _db.Set<SemesterFacultySummary>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.SemesterId == semesterId.Value && x.DepartmentId == departmentId)
            : null;
        LecturerSemesterSummary? lecturerSummary = null;
        if (facultySummary == null && semesterId.HasValue && lecturerId.HasValue)
        {
            lecturerSummary = await _db.Set<LecturerSemesterSummary>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.SemesterId == semesterId.Value && x.LecturerId == lecturerId.Value);
        }
        var summaryResults = facultySummary?.Results ?? lecturerSummary?.Results;
        var summaryDifficulties = facultySummary?.Difficulties ?? lecturerSummary?.Difficulties;
        var summaryRecommendations = facultySummary?.Recommendations ?? lecturerSummary?.Recommendations;
        var summaryConclusion = facultySummary?.Conclusion ?? lecturerSummary?.Conclusion;

        var semester = semesterId.HasValue
            ? await _db.Semesters.FirstOrDefaultAsync(s => s.Id == semesterId.Value)
            : await _db.Semesters.OrderByDescending(s => s.StartDate).FirstOrDefaultAsync();

        // Lịch nộp báo cáo của kỳ — dùng để thống kê bài thiếu/trễ cho Điểm QT (khớp chuẩn chấm điểm).
        var totalWeeks = Math.Max(semester?.TotalWeeks ?? 0, 0);
        var reportScheduleByWeek = await LoadReportScheduleByWeekAsync(semesterId, totalWeeks);
        var nowUtc = DateTime.UtcNow;
        var reportDate = DateTime.Now;

        var startDateStr = semester?.StartDate?.ToString("dd/MM/yyyy") ?? reportDate.ToString("dd/MM/yyyy");
        var endDateStr = semester?.EndDate?.ToString("dd/MM/yyyy") ?? reportDate.AddDays(45).ToString("dd/MM/yyyy");

        // ── Calculate statistics ────────────────────────────────────────────
        var interning = internships.Count;
        var completedCount = internships.Count(i =>
            InternshipProgressCalculator.IsInternshipFinished(
                i.Status, evaluations.GetValueOrDefault(i.Id)));
        var incompleteCount = interning - completedCount;

        // Mốc % theo KHÓA THỰC TẬP CỦA KỲ (đề xuất P1): "Không thực tập" chỉ đếm SV cùng khóa
        // (class) đang thực tập kỳ này nhưng chưa đăng ký — loại SV các khóa chưa đến kỳ thực tập.
        var (totalStudents, notInterning) = await ComputeCohortStatsAsync(internships, department, departmentId);

        // Bảng xếp loại theo mẫu Word:
        // Xuất sắc | Giỏi | Khá | Trung bình khá | Trung bình | Yếu | Không thực tập
        // Chuẩn chấm điểm hiện tại: ≥8.5 XS | ≥8 Giỏi | ≥6.5 Khá | ≥5 TB | <5 Không đạt.
        // "Không đạt" map → "Yếu"; "Trung bình khá" giữ 0 (mẫu có dòng, quy chế chưa tách ngưỡng).
        var templateGradeRows = new[]
        {
            "Xuất sắc", "Giỏi", "Khá", "Trung bình khá", "Trung bình", "Yếu", "Không thực tập"
        };
        var gradeCounts = templateGradeRows.ToDictionary(c => c, _ => 0);

        foreach (var intern in internships)
        {
            var hasFinalReport = intern.Status == InternshipStatus.Completed || intern.Status == InternshipStatus.Graded
                || intern.Submissions.Any(s => !s.IsDeleted && s.Type == SubmissionType.FinalReport && s.Status != SubmissionStatus.Rejected);
            var (isEligible, _) = InternshipGradeCalculator.EvaluateEligibility(hasFinalReport, absentWeeksByInternship.GetValueOrDefault(intern.Id));

            if (!isEligible)
            {
                gradeCounts["Không thực tập"]++;
                continue;
            }
            if (!evaluations.TryGetValue(intern.Id, out var eval) || !eval.OralExamScore.HasValue)
            {
                // Đủ điều kiện nhưng chưa chốt điểm thi → chưa vào bảng xếp loại (không gộp vào Yếu/TB).
                continue;
            }

            var (missingCount, lateCount, submittedWeekCount) = CountSubmissionStats(intern, reportScheduleByWeek, nowUtc);
            var processScore = InternshipGradeCalculator.ComputeProcessScore(missingCount, lateCount, submittedWeekCount, weeklyQualityLevelsByInternship.GetValueOrDefault(intern.Id), eval.HasCreativeProduct);
            var (_, classification) = InternshipGradeCalculator.ComputeAverage(true, processScore, eval.OralExamScore);
            var templateLabel = MapClassificationToTemplateRow(classification);
            if (templateLabel != null)
                gradeCounts[templateLabel]++;
        }
        // "Không thực tập" = SV không đủ điều kiện dự thi + SV cùng khóa chưa đăng ký.
        gradeCounts["Không thực tập"] += notInterning;

        int totalForPercent = totalStudents > 0 ? totalStudents : 1;

        // Incomplete students — tách Họ / Tên theo mẫu Word (TT | MSSV | Họ | Tên | Lớp | Lý do)
        // Hoàn thành = Graded/Completed HOẶC đã có điểm thi (không chỉ nhìn status cũ).
        var incompleteStudentRows = internships
            .Where(i => !InternshipProgressCalculator.IsInternshipFinished(
                i.Status, evaluations.GetValueOrDefault(i.Id)))
            .Select(i =>
            {
                var (ho, ten) = SplitHoTen(i.Student.FullName);
                var hasFinalReport = InternshipProgressCalculator.IsInternshipFinished(
                        i.Status, evaluations.GetValueOrDefault(i.Id))
                    || i.Submissions.Any(s => !s.IsDeleted && s.Type == SubmissionType.FinalReport && s.Status != SubmissionStatus.Rejected);
                var (_, reasons) = InternshipGradeCalculator.EvaluateEligibility(
                    hasFinalReport, absentWeeksByInternship.GetValueOrDefault(i.Id));
                var lyDo = reasons.Count > 0
                    ? string.Join("; ", reasons)
                    : "Chưa hoàn thành báo cáo / thực tập";
                return (Mssv: i.Student.StudentCode ?? "", Ho: ho, Ten: ten, Lop: i.Student.Class ?? "—", LyDo: lyDo);
            })
            .ToList();

        var tenKhoa = await ResolveDepartmentNameForTemplateAsync(department, departmentId, internships);
        var noiDungBaoCaoChung = summaryResults ?? string.Empty;
        var noiDungDiemNoiBatHanChe = string.Join("\n\n", new[]
            {
                summaryDifficulties,
                summaryRecommendations,
                summaryConclusion
            }.Where(s => !string.IsNullOrWhiteSpace(s)));

        // ── Build placeholder map (khớp mẫu .docx: {TEN_KHOA}, {SO_DOANH_NGHIEP}, ...) ──
        string Pct(int count) => Math.Round(count * 100.0 / totalForPercent, 1).ToString("0.#");

        var placeholders = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["{TEN_KHOA}"] = tenKhoa,
            ["{NGAY}"] = reportDate.Day.ToString("00"),
            ["{THANG}"] = reportDate.Month.ToString("00"),
            ["{NAM}"] = reportDate.Year.ToString(),
            ["{NGAY_BAT_DAU}"] = startDateStr,
            ["{NGAY_KET_THUC}"] = endDateStr,
            ["{SO_DOANH_NGHIEP}"] = totalCompanies.ToString(),
            ["{SO_SV_DANG_KY}"] = interning.ToString(),
            ["{SO_SV_HOAN_THANH}"] = completedCount.ToString(),
            ["{SO_SV_KHONG_HOAN_THANH}"] = incompleteCount.ToString(),
            ["{SL_XUAT_SAC}"] = gradeCounts["Xuất sắc"].ToString(),
            ["{TL_XUAT_SAC}"] = Pct(gradeCounts["Xuất sắc"]),
            ["{SL_GIOI}"] = gradeCounts["Giỏi"].ToString(),
            ["{TL_GIOI}"] = Pct(gradeCounts["Giỏi"]),
            ["{SL_KHA}"] = gradeCounts["Khá"].ToString(),
            ["{TL_KHA}"] = Pct(gradeCounts["Khá"]),
            ["{SL_TB_KHA}"] = gradeCounts["Trung bình khá"].ToString(),
            ["{TL_TB_KHA}"] = Pct(gradeCounts["Trung bình khá"]),
            ["{SL_TRUNG_BINH}"] = gradeCounts["Trung bình"].ToString(),
            ["{TL_TRUNG_BINH}"] = Pct(gradeCounts["Trung bình"]),
            ["{SL_YEU}"] = gradeCounts["Yếu"].ToString(),
            ["{TL_YEU}"] = Pct(gradeCounts["Yếu"]),
            ["{SL_KHONG_TT}"] = gradeCounts["Không thực tập"].ToString(),
            ["{TL_KHONG_TT}"] = Pct(gradeCounts["Không thực tập"]),
            ["{TONG_SL}"] = totalStudents.ToString(),
            ["{TONG_TL}"] = "100",
            ["{NOI_DUNG_BAO_CAO_CHUNG}"] = noiDungBaoCaoChung,
            ["{NOI_DUNG_DIEM_NOI_BAT_HAN_CHE}"] = noiDungDiemNoiBatHanChe,
        };

        // ── Load Word template ─────────────────────────────────────────────
        var templatePath = TemplateHelper.FindTemplatePath("Bao cao tong ket cong tac thuc tap tot nghiep.docx")
            ?? TemplateHelper.FindTemplatePath("Bao cao tong ket cong tac thuc tap tot nghiep C22A.docx");

        if (string.IsNullOrEmpty(templatePath) || !File.Exists(templatePath))
        {
            throw new FileNotFoundException(
                $"Word template not found. Checked 'Bao cao tong ket cong tac thuc tap tot nghiep.docx' and 'Bao cao tong ket cong tac thuc tap tot nghiep C22A.docx'");
        }

        var templateBytes = await File.ReadAllBytesAsync(templatePath);
        using var templateStream = new MemoryStream(templateBytes);

        // Create a copy in memory to avoid modifying the original
        using var outputStream = new MemoryStream();
        templateStream.CopyTo(outputStream);
        outputStream.Position = 0;

        using (var doc = WordprocessingDocument.Open(outputStream, true))
        {
            var body = doc.MainDocumentPart?.Document?.Body;
            if (body == null)
                throw new InvalidOperationException("Word document has no body.");

            // 1) Nhân bản dòng {#ds_khong_hoan_thanh}…{/ds_khong_hoan_thanh} trước khi replace global
            PopulateIncompleteStudentsLoop(body, incompleteStudentRows);

            // 2) Thay toàn bộ placeholder {KEY} (kể cả placeholder bị Word tách run)
            ReplacePlaceholdersInBody(body, placeholders);

            doc.MainDocumentPart!.Document.Save();
        }

        return outputStream.ToArray();
    }

    /// <summary>
    /// Map xếp loại chuẩn chấm điểm → nhãn dòng trên mẫu Word.
    /// "Không đạt" → "Yếu"; "không thực tập" → "Không thực tập".
    /// </summary>
    private static string? MapClassificationToTemplateRow(string classification) =>
        classification switch
        {
            "Xuất sắc" => "Xuất sắc",
            "Giỏi" => "Giỏi",
            "Khá" => "Khá",
            "Trung bình khá" => "Trung bình khá",
            "Trung bình" => "Trung bình",
            "Yếu" => "Yếu",
            "Không đạt" => "Yếu",
            "Không thực tập" => "Không thực tập",
            var s when string.Equals(s, InternshipGradeCalculator.IneligibleClassification, StringComparison.OrdinalIgnoreCase)
                => "Không thực tập",
            _ => null
        };

    private static (string Ho, string Ten) SplitHoTen(string? fullName)
    {
        var parts = (fullName ?? string.Empty)
            .Trim()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return ("", "");
        if (parts.Length == 1) return ("", parts[0]);
        return (string.Join(" ", parts[..^1]), parts[^1]);
    }

    private async Task<string> ResolveDepartmentNameForTemplateAsync(
        string? department,
        Guid? departmentId,
        List<Domain.Entities.Internship> internships)
    {
        string? raw = null;
        if (departmentId.HasValue)
        {
            raw = await _db.Departments.AsNoTracking()
                .Where(d => d.Id == departmentId.Value)
                .Select(d => d.Name)
                .FirstOrDefaultAsync();
        }

        raw ??= !string.IsNullOrWhiteSpace(department)
            ? department
            : internships.Select(i => i.Student?.Department).FirstOrDefault(d => !string.IsNullOrWhiteSpace(d));

        if (string.IsNullOrWhiteSpace(raw))
            return "CÔNG NGHỆ THÔNG TIN";

        raw = raw.Trim();
        if (raw.StartsWith("Khoa ", StringComparison.OrdinalIgnoreCase))
            raw = raw[5..].TrimStart();
        else if (raw.StartsWith("KHOA ", StringComparison.OrdinalIgnoreCase))
            raw = raw[5..].TrimStart();

        return raw.ToUpperInvariant();
    }

    // ────────────────────────────────────────────────────────────────────────
    // Word document helpers
    // ────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Nạp ngữ cảnh chấm điểm dùng chung cho mọi xuất báo cáo:
    /// (1) số tuần VẮNG theo điểm danh (hệ thống độc lập với nộp bài) để đánh giá điều kiện dự thi;
    /// (2) mức rubric chất lượng từng tuần (WeeklyQualityJson) để tính Điểm QT.
    /// Cùng nguồn dữ liệu với màn hình chấm điểm (InternshipGradingService) và Excel C23 (ExcelExportService).
    /// </summary>
    private async Task<(Dictionary<Guid, int> absentWeeksByInternship, Dictionary<Guid, List<decimal?>> weeklyQualityLevelsByInternship)> LoadGradingContextAsync(
        List<Domain.Entities.Internship> internships,
        Guid? semesterId,
        Dictionary<Guid, Domain.Entities.Evaluation> evaluations)
    {
        // (1) Số tuần vắng theo ĐIỂM DANH buổi hẹn.
        var studentIds = internships.Select(i => i.StudentId).ToList();
        var absenceQuery = _db.AttendanceRecords
            .AsNoTracking()
            .Where(a => studentIds.Contains(a.StudentId) && !a.IsDeleted
                && a.Status == AttendanceStatus.Absent
                && !a.AttendanceSession.IsDeleted
                && !a.AttendanceSession.IsLecturerOnly);
        if (semesterId.HasValue)
            absenceQuery = absenceQuery.Where(a => a.AttendanceSession.SemesterId == semesterId.Value);
        var absenceRows = await absenceQuery
            .Select(a => new { a.StudentId, a.AttendanceSession.WeekNumber })
            .ToListAsync();
        var absentWeeksByStudent = absenceRows
            .GroupBy(a => a.StudentId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.WeekNumber).Distinct().Count());
        var absentWeeksByInternship = internships.ToDictionary(
            i => i.Id,
            i => absentWeeksByStudent.GetValueOrDefault(i.StudentId));

        // (2) Mức rubric từng tuần (WeeklyQualityJson) cho Điểm QT.
        var weeklyQualityLevelsByInternship = new Dictionary<Guid, List<decimal?>>();
        foreach (var (internshipId, evaluation) in evaluations)
        {
            var levels = new List<decimal?>();
            if (!string.IsNullOrWhiteSpace(evaluation.WeeklyQualityJson))
            {
                try
                {
                    var parsed = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, decimal>>(evaluation.WeeklyQualityJson);
                    if (parsed != null) levels.AddRange(parsed.Values.Select(v => (decimal?)v));
                }
                catch (System.Text.Json.JsonException) { }
            }
            if (levels.Count == 0 && evaluation.QualityLevel.HasValue) levels.Add(evaluation.QualityLevel);
            weeklyQualityLevelsByInternship[internshipId] = levels;
        }

        return (absentWeeksByInternship, weeklyQualityLevelsByInternship);
    }

    private static void UpdateInstitutionalParagraphs(
        DocumentFormat.OpenXml.Wordprocessing.Body body,
        string? department,
        string startDateStr,
        string endDateStr,
        int totalCompanies,
        int interning,
        int completedCount,
        int incompleteCount)
    {
        var dateStr = $"Tp. Hồ Chí Minh, ngày {DateTime.Now:dd} tháng {DateTime.Now:MM} năm {DateTime.Now:yyyy}";

        foreach (var p in body.Descendants<Paragraph>())
        {
            var text = string.Concat(p.Descendants<Text>().Select(t => t.Text));
            if (string.IsNullOrWhiteSpace(text)) continue;

            if (text.Contains("Tp. Hồ Chí Minh, ngày") || text.Contains("Tp. Hồ Chí Minh , ngày"))
            {
                SetParagraphTextPreserveFormat(p, dateStr);
            }
            else if (text.Contains("Thời gian thực tập:"))
            {
                SetParagraphTextPreserveFormat(p, $"Thời gian thực tập: từ {startDateStr} đến {endDateStr}");
            }
            else if (text.Contains("Số lượng doanh nghiệp nhận sinh viên thực tập:"))
            {
                SetParagraphTextPreserveFormat(p, $"Số lượng doanh nghiệp nhận sinh viên thực tập: {totalCompanies} đơn vị");
            }
            else if (text.Contains("Số lượng sinh viên đăng ký thực tập:"))
            {
                SetParagraphTextPreserveFormat(p, $"Số lượng sinh viên đăng ký thực tập: {interning} sinh viên");
            }
            else if (text.Contains("Số lượng sinh viên hoàn thành đợt thực tập:"))
            {
                SetParagraphTextPreserveFormat(p, $"Số lượng sinh viên hoàn thành đợt thực tập: {completedCount} sinh viên");
            }
            else if (text.Contains("Số sinh viên không hoàn thành thực tập:"))
            {
                SetParagraphTextPreserveFormat(p, $"Số sinh viên không hoàn thành thực tập: {incompleteCount} sinh viên");
            }
            else if (!string.IsNullOrWhiteSpace(department) && (text.Contains("KHOA CÔNG NGHỆ THÔNG TIN") || text.Contains("KHOA ")))
            {
                SetParagraphTextPreserveFormat(p, $"KHOA {department.ToUpperInvariant()}");
            }
        }
    }

    private static void SetParagraphTextPreserveFormat(Paragraph paragraph, string newText)
    {
        var firstRun = paragraph.Descendants<Run>().FirstOrDefault();
        var rPr = firstRun?.RunProperties?.CloneNode(true) as RunProperties;

        foreach (var run in paragraph.Descendants<Run>().ToList())
            run.Remove();
        foreach (var child in paragraph.ChildElements.Where(c => c is not ParagraphProperties).ToList())
            child.Remove();

        var newRun = new Run();
        if (rPr != null) newRun.Append(rPr);
        newRun.Append(new Text(newText) { Space = SpaceProcessingModeValues.Preserve });
        paragraph.Append(newRun);
    }

    private static void UpdateGradeStatisticsTable(
        DocumentFormat.OpenXml.Wordprocessing.Body body,
        Dictionary<string, int> gradeCounts,
        int totalStudents,
        int notInterning,
        bool includeNotInterningInCounts = true)
    {
        var tables = body.Descendants<Table>().ToList();
        Table? statsTable = null;

        foreach (var table in tables)
        {
            var text = string.Concat(table.Descendants<Text>().Select(t => t.Text));
            if (text.Contains("Xuất sắc") && (text.Contains("Giỏi") || text.Contains("Trung bình")))
            {
                statsTable = table;
                break;
            }
        }

        if (statsTable == null) return;

        int totalForPct = totalStudents > 0 ? totalStudents : 1;

        foreach (var row in statsTable.Descendants<TableRow>())
        {
            var cells = row.Descendants<TableCell>().ToList();
            if (cells.Count < 3) continue;

            var rowLabel = string.Concat(cells[0].Descendants<Text>().Select(t => t.Text)).Trim();

            // Khi includeNotInterningInCounts = false, gradeCounts đã chứa "Không thực tập"
            // (gồm SV không đủ điều kiện dự thi + SV cùng khóa chưa đăng ký) → không cộng thêm.
            var isNotInterningRow = rowLabel.Equals("Không thực tập", StringComparison.OrdinalIgnoreCase);
            var effectiveCountOffset = isNotInterningRow && !includeNotInterningInCounts ? notInterning : 0;

            foreach (var kvp in gradeCounts)
            {
                if (rowLabel.Equals(kvp.Key, StringComparison.OrdinalIgnoreCase))
                {
                    var count = kvp.Value + effectiveCountOffset;
                    var pct = Math.Round(count * 100.0 / totalForPct, 1);
                    SetCellText(cells[1], count.ToString());
                    SetCellText(cells[2], $"{pct}%");
                    break;
                }
            }

            if (rowLabel.Equals("TỔNG", StringComparison.OrdinalIgnoreCase) || rowLabel.Equals("Tổng", StringComparison.OrdinalIgnoreCase))
            {
                SetCellText(cells[1], totalStudents.ToString());
                SetCellText(cells[2], "100%");
            }
        }
    }

    private static void ReplacePlaceholdersInBody(
        DocumentFormat.OpenXml.Wordprocessing.Body body,
        Dictionary<string, string> placeholders)
    {
        // Longer keys first so `{#ds_...}` / `{TL_XUAT_SAC}` không bị cắt bởi key ngắn hơn.
        var ordered = placeholders
            .OrderByDescending(kvp => kvp.Key.Length)
            .ToList();

        foreach (var paragraph in body.Descendants<Paragraph>().ToList())
            ReplacePlaceholdersInParagraph(paragraph, ordered);
    }

    private static void ReplacePlaceholdersInParagraph(
        Paragraph paragraph,
        Dictionary<string, string> placeholders)
    {
        ReplacePlaceholdersInParagraph(
            paragraph,
            placeholders.OrderByDescending(kvp => kvp.Key.Length).ToList());
    }

    private static void ReplacePlaceholdersInParagraph(
        Paragraph paragraph,
        List<KeyValuePair<string, string>> orderedPlaceholders)
    {
        var fullText = string.Concat(paragraph.Descendants<Text>().Select(t => t.Text));
        if (string.IsNullOrEmpty(fullText)) return;

        var replaced = false;
        foreach (var kvp in orderedPlaceholders)
        {
            if (fullText.Contains(kvp.Key, StringComparison.Ordinal))
            {
                fullText = fullText.Replace(kvp.Key, kvp.Value ?? string.Empty, StringComparison.Ordinal);
                replaced = true;
            }
        }

        if (!replaced) return;

        var firstRun = paragraph.Descendants<Run>().FirstOrDefault();
        var rPr = firstRun?.RunProperties?.CloneNode(true) as RunProperties;

        foreach (var run in paragraph.Descendants<Run>().ToList())
            run.Remove();
        foreach (var child in paragraph.ChildElements
            .Where(c => c is not ParagraphProperties).ToList())
            child.Remove();

        // Hỗ trợ xuống dòng trong nội dung diễn giải (II / III).
        var lines = fullText.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
        for (var i = 0; i < lines.Length; i++)
        {
            var newRun = new Run();
            if (rPr != null) newRun.Append((RunProperties)rPr.CloneNode(true));
            if (i > 0) newRun.Append(new Break());
            newRun.Append(new Text(lines[i]) { Space = SpaceProcessingModeValues.Preserve });
            paragraph.Append(newRun);
        }
    }

    /// <summary>
    /// Nhân bản dòng mẫu có vòng lặp docxtemplater-style:
    /// <c>{#ds_khong_hoan_thanh}{stt}</c> … <c>{ly_do}{/ds_khong_hoan_thanh}</c>
    /// (6 cột: TT | MSSV | Họ | Tên | Lớp | Lý do).
    /// </summary>
    private static void PopulateIncompleteStudentsLoop(
        DocumentFormat.OpenXml.Wordprocessing.Body body,
        List<(string Mssv, string Ho, string Ten, string Lop, string LyDo)> incompleteStudents)
    {
        Table? targetTable = null;
        TableRow? templateRow = null;

        foreach (var table in body.Descendants<Table>())
        {
            foreach (var row in table.Elements<TableRow>())
            {
                var rowText = string.Concat(row.Descendants<Text>().Select(t => t.Text));
                if (rowText.Contains("#ds_khong_hoan_thanh", StringComparison.Ordinal)
                    || (rowText.Contains("{stt}", StringComparison.Ordinal)
                        && rowText.Contains("{mssv}", StringComparison.Ordinal)))
                {
                    targetTable = table;
                    templateRow = row;
                    break;
                }
            }
            if (templateRow != null) break;
        }

        if (targetTable == null || templateRow == null) return;

        // Xóa dòng trống thừa ngay sau dòng mẫu (nếu có).
        var nextSibling = templateRow.NextSibling<TableRow>();
        if (nextSibling != null)
        {
            var nextText = string.Concat(nextSibling.Descendants<Text>().Select(t => t.Text)).Trim();
            if (string.IsNullOrWhiteSpace(nextText))
                nextSibling.Remove();
        }

        if (incompleteStudents.Count == 0)
        {
            var emptyPlaceholders = new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["{#ds_khong_hoan_thanh}"] = string.Empty,
                ["{/ds_khong_hoan_thanh}"] = string.Empty,
                ["{stt}"] = "—",
                ["{mssv}"] = "Không có sinh viên không hoàn thành",
                ["{ho}"] = "—",
                ["{ten}"] = "—",
                ["{lop}"] = "—",
                ["{ly_do}"] = "—",
            };
            ReplacePlaceholdersInRow(templateRow, emptyPlaceholders);
            return;
        }

        templateRow.Remove();

        int stt = 1;
        foreach (var student in incompleteStudents)
        {
            var newRow = (TableRow)templateRow.CloneNode(true);
            var rowPlaceholders = new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["{#ds_khong_hoan_thanh}"] = string.Empty,
                ["{/ds_khong_hoan_thanh}"] = string.Empty,
                ["{stt}"] = stt.ToString(),
                ["{mssv}"] = student.Mssv,
                ["{ho}"] = student.Ho,
                ["{ten}"] = student.Ten,
                ["{lop}"] = student.Lop,
                ["{ly_do}"] = student.LyDo,
            };
            ReplacePlaceholdersInRow(newRow, rowPlaceholders);
            targetTable.Append(newRow);
            stt++;
        }
    }

    private static void ReplacePlaceholdersInRow(TableRow row, Dictionary<string, string> placeholders)
    {
        foreach (var paragraph in row.Descendants<Paragraph>())
            ReplacePlaceholdersInParagraph(paragraph, placeholders);
    }

    private static void PopulateIncompleteStudentsTable(
        DocumentFormat.OpenXml.Wordprocessing.Body body,
        List<Domain.Entities.Student> incompleteStudents)
    {
        // Legacy fallback for older templates (TT | MSSV | Họ Tên | Lớp | Lý do) without loop markers.
        var tables = body.Descendants<Table>().ToList();
        Table? targetTable = null;

        foreach (var table in tables)
        {
            var tableText = string.Concat(
                table.Descendants<Text>().Select(t => t.Text));
            if (tableText.Contains("#ds_khong_hoan_thanh", StringComparison.Ordinal))
                continue; // Handled by PopulateIncompleteStudentsLoop
            if (tableText.Contains("Lý do") && (tableText.Contains("MSSV") || tableText.Contains("Họ Tên")) ||
                tableText.Contains("Chưa hoàn thành") ||
                tableText.Contains("chưa hoàn thành"))
            {
                targetTable = table;
                break;
            }
        }

        if (targetTable == null) return;

        // Find the template data row (the row after headers that we can clone)
        var rows = targetTable.Descendants<TableRow>().ToList();
        if (rows.Count < 2) return;

        // The last data row is the template row to clone
        var templateRow = rows[^1];

        if (incompleteStudents.Count == 0)
        {
            var cells = templateRow.Descendants<TableCell>().ToList();
            if (cells.Count >= 4)
            {
                SetCellText(cells[0], "—");
                SetCellText(cells[1], "Không có sinh viên chưa hoàn thành");
                SetCellText(cells[2], "—");
                SetCellText(cells[3], "—");
                if (cells.Count >= 5)
                    SetCellText(cells[4], "—");
            }
            return;
        }

        // Remove template row
        templateRow.Remove();

        // Add rows for each incomplete student
        int stt = 1;
        foreach (var student in incompleteStudents)
        {
            var newRow = templateRow.CloneNode(true) as TableRow;
            if (newRow == null) continue;

            var cells = newRow.Descendants<TableCell>().ToList();
            var (ho, ten) = SplitHoTen(student.FullName);
            if (cells.Count >= 6)
            {
                SetCellText(cells[0], stt.ToString());
                SetCellText(cells[1], student.StudentCode);
                SetCellText(cells[2], ho);
                SetCellText(cells[3], ten);
                SetCellText(cells[4], student.Class ?? "—");
                SetCellText(cells[5], "Chưa hoàn thành báo cáo / thực tập");
            }
            else if (cells.Count >= 5)
            {
                SetCellText(cells[0], stt.ToString());
                SetCellText(cells[1], student.StudentCode);
                SetCellText(cells[2], student.FullName);
                SetCellText(cells[3], student.Class ?? "—");
                SetCellText(cells[4], "Chưa hoàn thành báo cáo / thực tập");
            }
            else if (cells.Count >= 4)
            {
                SetCellText(cells[0], stt.ToString());
                SetCellText(cells[1], student.FullName);
                SetCellText(cells[2], student.Class ?? "—");
                SetCellText(cells[3], "Chưa hoàn thành báo cáo / thực tập");
            }

            targetTable.Append(newRow);
            stt++;
        }
    }

    private static void SetCellText(TableCell cell, string text)
    {
        // Get existing formatting from the cell
        var existingPara = cell.Descendants<Paragraph>().FirstOrDefault();
        var existingRun = existingPara?.Descendants<Run>().FirstOrDefault();
        var rPr = existingRun?.RunProperties?.CloneNode(true) as RunProperties;

        // Clear existing content
        foreach (var para in cell.Descendants<Paragraph>().ToList())
        {
            foreach (var run in para.Descendants<Run>().ToList())
                run.Remove();
        }

        // Set new text with formatting
        var paragraph = cell.Descendants<Paragraph>().FirstOrDefault();
        if (paragraph == null)
        {
            paragraph = new Paragraph();
            cell.Append(paragraph);
        }

        var newRun = new Run();
        if (rPr != null) newRun.Append(rPr);
        newRun.Append(new Text(text) { Space = SpaceProcessingModeValues.Preserve });
        paragraph.Append(newRun);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Sheet builders
    // ────────────────────────────────────────────────────────────────────────




    private static void BuildC22ASummarySheet(
        IXLWorksheet ws,
        List<Domain.Entities.Internship> internships,
        Dictionary<Guid, Domain.Entities.Evaluation> evaluations,
        int totalStudents,
        int totalCompanies,
        Dictionary<Guid, int> absentWeeksByInternship,
        Dictionary<Guid, List<decimal?>> weeklyQualityLevelsByInternship,
        Dictionary<int, Domain.Entities.SemesterReportSchedule> reportScheduleByWeek,
        DateTime nowUtc)
    {
        ws.Style.Font.FontName = "Times New Roman";
        ws.Style.Font.FontSize = 12;

        int row = 1;

        // ── Header ─────────────────────────────────────────────────────────
        void WriteMergedBold(string text, int fontSize = 12)
        {
            ws.Range(row, 1, row, 6).Merge();
            var c = ws.Cell(row, 1);
            c.Value = text;
            c.Style.Font.Bold = true;
            c.Style.Font.FontSize = fontSize;
            c.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            row++;
        }

        void WriteMerged(string text, bool italic = false, XLAlignmentHorizontalValues align = XLAlignmentHorizontalValues.Left)
        {
            ws.Range(row, 1, row, 6).Merge();
            var c = ws.Cell(row, 1);
            c.Value = text;
            c.Style.Font.Italic = italic;
            c.Style.Alignment.Horizontal = align;
            c.Style.Alignment.WrapText = true;
            row++;
        }

        WriteMergedBold("TRƯỜNG CAO ĐẲNG GIAO THÔNG VẬN TẢI TP.HCM", 11);
        WriteMergedBold("KHOA CÔNG NGHỆ THÔNG TIN", 11);
        row++;
        WriteMergedBold("BÁO CÁO TỔNG KẾT", 16);
        WriteMergedBold("CÔNG TÁC THỰC TẬP TỐT NGHIỆP", 14);
        row++;

        // ── Summary metrics ────────────────────────────────────────────────
        var interning = internships.Count;
        var completedCount = internships.Count(i =>
            InternshipProgressCalculator.IsInternshipFinished(
                i.Status, evaluations.GetValueOrDefault(i.Id)));
        var incompleteCount = interning - completedCount;
        var notInterning = totalStudents - interning;

        WriteMerged($"I. TỔNG QUAN:", italic: false);
        WriteMerged($"   - Tổng số sinh viên: {totalStudents}");
        WriteMerged($"   - Số sinh viên thực tập: {interning}");
        WriteMerged($"   - Số doanh nghiệp tiếp nhận: {totalCompanies}");
        WriteMerged($"   - Hoàn thành: {completedCount}");
        WriteMerged($"   - Chưa hoàn thành: {incompleteCount}");
        WriteMerged($"   - Không thực tập: {notInterning}");
        row++;

        // ── Grading distribution table ─────────────────────────────────────
        WriteMerged("II. BẢNG TỔNG HỢP KẾT QUẢ XẾP LOẠI:");
        row++;

        // Classification — DÙNG CHUẨN DUY NHẤT InternshipGradeCalculator (khớp màn hình chấm điểm + Excel C23):
        // SV chưa có Điểm thi → "Chưa chốt"; không đủ điều kiện dự thi → "không thực tập".
        const string pendingClassification = "Chưa chốt";
        var gradeCategories = new[] { "Xuất sắc", "Giỏi", "Khá", "Trung bình", "Không đạt", pendingClassification, "Không thực tập" };
        var gradeCounts = new Dictionary<string, int>();
        foreach (var cat in gradeCategories) gradeCounts[cat] = 0;

        foreach (var intern in internships)
        {
            var hasFinalReport = intern.Status == InternshipStatus.Completed || intern.Status == InternshipStatus.Graded
                || intern.Submissions.Any(s => !s.IsDeleted && s.Type == SubmissionType.FinalReport && s.Status != SubmissionStatus.Rejected);
            var (isEligible, _) = InternshipGradeCalculator.EvaluateEligibility(hasFinalReport, absentWeeksByInternship.GetValueOrDefault(intern.Id));

            if (!isEligible)
            {
                // Xếp loại "không thực tập" theo quy định → gộp vào dòng "Không thực tập" của bảng tổng kết.
                gradeCounts["Không thực tập"]++;
                continue;
            }
            if (!evaluations.TryGetValue(intern.Id, out var eval) || !eval.OralExamScore.HasValue)
            {
                gradeCounts[pendingClassification]++;
                continue;
            }

            var (missingCount, lateCount, submittedWeekCount) = CountSubmissionStats(intern, reportScheduleByWeek, nowUtc);
            var processScore = InternshipGradeCalculator.ComputeProcessScore(missingCount, lateCount, submittedWeekCount, weeklyQualityLevelsByInternship.GetValueOrDefault(intern.Id), eval.HasCreativeProduct);
            var (_, classification) = InternshipGradeCalculator.ComputeAverage(true, processScore, eval.OralExamScore);
            gradeCounts[classification]++;
        }
        // "Không thực tập" = SV không đủ điều kiện dự thi + SV không có kỳ thực tập.
        gradeCounts["Không thực tập"] += notInterning;

        int totalForPercent = totalStudents > 0 ? totalStudents : 1;

        // Table headers
        var tHeaders = new[] { "STT", "Xếp loại", "Số lượng", "Tỷ lệ (%)" };
        for (int c = 1; c <= 4; c++)
        {
            StyleHeaderCell(ws.Cell(row, c));
            ws.Cell(row, c).Value = tHeaders[c - 1];
        }
        row++;

        int idx = 1;
        foreach (var cat in gradeCategories)
        {
            int count = gradeCounts[cat];
            double pct = Math.Round(count * 100.0 / totalForPercent, 1);

            ws.Cell(row, 1).Value = idx;
            ws.Cell(row, 2).Value = cat;
            ws.Cell(row, 3).Value = count;
            ws.Cell(row, 4).Value = $"{pct}%";

            for (int c = 1; c <= 4; c++)
            {
                ws.Cell(row, c).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                ws.Cell(row, c).Style.Alignment.Horizontal = c <= 2 ? XLAlignmentHorizontalValues.Left : XLAlignmentHorizontalValues.Center;
            }

            idx++;
            row++;
        }

        // Total row
        ws.Cell(row, 1).Value = "";
        ws.Cell(row, 2).Value = "Tổng cộng";
        ws.Cell(row, 2).Style.Font.Bold = true;
        ws.Cell(row, 3).Value = totalStudents;
        ws.Cell(row, 3).Style.Font.Bold = true;
        ws.Cell(row, 4).Value = "100%";
        for (int c = 1; c <= 4; c++)
            ws.Cell(row, c).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        row += 2;

        // ── Incomplete students list ───────────────────────────────────────
        WriteMerged("III. DANH SÁCH SINH VIÊN CHƯA HOÀN THÀNH:");
        row++;

        var incompleteStudents = internships
            .Where(i => !InternshipProgressCalculator.IsInternshipFinished(
                i.Status, evaluations.GetValueOrDefault(i.Id)))
            .Select(i => i.Student)
            .ToList();

        if (incompleteStudents.Count > 0)
        {
            var iHeaders = new[] { "STT", "Họ tên", "Lớp", "Lý do" };
            for (int c = 1; c <= 4; c++)
            {
                StyleHeaderCell(ws.Cell(row, c));
                ws.Cell(row, c).Value = iHeaders[c - 1];
            }
            row++;

            int iIdx = 1;
            foreach (var student in incompleteStudents)
            {
                ws.Cell(row, 1).Value = iIdx;
                ws.Cell(row, 2).Value = student.FullName;
                ws.Cell(row, 3).Value = student.Class ?? "—";
                ws.Cell(row, 4).Value = "Chưa hoàn thành báo cáo / thực tập";

                for (int c = 1; c <= 4; c++)
                    ws.Cell(row, c).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;

                iIdx++;
                row++;
            }
        }
        else
        {
            WriteMerged("   Tất cả sinh viên đã hoàn thành thực tập.", italic: true);
        }

        row += 2;

        // ── Signature block ────────────────────────────────────────────────
        ws.Range(row, 1, row, 3).Merge();
        ws.Cell(row, 1).Value = "TRƯỞNG KHOA";
        ws.Cell(row, 1).Style.Font.Bold = true;
        ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        ws.Range(row, 4, row, 6).Merge();
        ws.Cell(row, 4).Value = "TRƯỞNG PHÒNG ĐÀO TẠO";
        ws.Cell(row, 4).Style.Font.Bold = true;
        ws.Cell(row, 4).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        row += 4;
        ws.Range(row, 1, row, 3).Merge();
        ws.Cell(row, 1).Value = "(Ký tên, đóng dấu)";
        ws.Cell(row, 1).Style.Font.Italic = true;
        ws.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        ws.Range(row, 4, row, 6).Merge();
        ws.Cell(row, 4).Value = "(Ký tên, đóng dấu)";
        ws.Cell(row, 4).Style.Font.Italic = true;
        ws.Cell(row, 4).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        ws.Columns(1, 6).AdjustToContents();
        ws.Column(2).Width = Math.Max(ws.Column(2).Width, 25);
        ws.Column(4).Width = Math.Max(ws.Column(4).Width, 20);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Lịch nộp báo cáo tuần (các tuần 1..totalWeeks đang mở nộp) — dùng để thống kê bài thiếu/trễ
    /// cho Điểm QT, khớp cách tính của ExcelExportService (C23) và InternshipGradingService.
    /// </summary>
    private async Task<Dictionary<int, Domain.Entities.SemesterReportSchedule>> LoadReportScheduleByWeekAsync(Guid? semesterId, int totalWeeks)
    {
        if (totalWeeks <= 0) return new Dictionary<int, Domain.Entities.SemesterReportSchedule>();

        return await _db.SemesterReportSchedules
            .AsNoTracking()
            .Where(s => !s.IsDeleted && s.IsSubmissionOpen
                && (!semesterId.HasValue || s.SemesterId == semesterId.Value)
                && s.WeekNumber >= 1 && s.WeekNumber <= totalWeeks)
            .OrderBy(s => s.WeekNumber)
            .ToDictionaryAsync(s => s.WeekNumber);
    }

    /// <summary>
    /// Mốc thống kê tổng kết theo KHÓA THỰC TẬP CỦA KỲ (đề xuất P1 của báo cáo rà soát):
    /// - TotalStudents = số SV đăng ký thực tập kỳ này + SV cùng khóa (class) chưa đăng ký.
    /// - NotInterning = SV thuộc khóa (class) đang thực tập kỳ này nhưng chưa có internship.
    /// Xác định "khóa" qua tập class của các SV có internship trong kỳ — tránh phình số liệu
    /// "Không thực tập" khi khoa còn SV các khóa khác chưa đến kỳ thực tập.
    /// </summary>
    private async Task<(int TotalStudents, int NotInterning)> ComputeCohortStatsAsync(
        List<Domain.Entities.Internship> internships,
        string? department,
        Guid? departmentId)
    {
        var interningStudentIds = internships.Select(i => i.StudentId).ToHashSet();
        var cohortClasses = internships
            .Select(i => i.Student?.Class?.Trim())
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var khoaStudentsQuery = _db.Students.AsNoTracking().Where(s => !s.IsDeleted);
        if (!string.IsNullOrWhiteSpace(department))
            khoaStudentsQuery = khoaStudentsQuery.Where(s => s.Department == department);
        if (departmentId.HasValue)
            khoaStudentsQuery = khoaStudentsQuery.Where(s => s.DepartmentId == departmentId.Value);

        var khoaStudentClassRows = await khoaStudentsQuery
            .Select(s => new { s.Id, s.Class })
            .ToListAsync();

        var notInterning = khoaStudentClassRows.Count(s =>
            !interningStudentIds.Contains(s.Id)
            && !string.IsNullOrWhiteSpace(s.Class)
            && cohortClasses.Contains(s.Class!.Trim()));

        return (internships.Count + notInterning, notInterning);
    }

    /// <summary>
    /// Thống kê nộp bài của một internship: (số tuần thiếu, số tuần trễ, số tuần đã nộp).
    /// Chỉ tính từ NỘP BÀI theo lịch báo cáo của kỳ — không liên quan điểm danh.
    /// </summary>
    private static (int MissingCount, int LateCount, int SubmittedWeekCount) CountSubmissionStats(
        Domain.Entities.Internship intern,
        Dictionary<int, Domain.Entities.SemesterReportSchedule> reportScheduleByWeek,
        DateTime nowUtc)
    {
        var reports = intern.WeeklyReports?
            .Where(r => !r.IsDeleted && r.Status != WeeklyReportStatus.Draft)
            .ToList() ?? new List<WeeklyReport>();

        // Chỉ đếm tuần đang bật trong cấu hình — không tính tuần đóng / tuần cuối kỳ.
        var requiredWeeks = reportScheduleByWeek.Keys.ToHashSet();
        var submittedWeekCount = reports
            .Where(r => r.SubmittedAt.HasValue && requiredWeeks.Contains(r.WeekNumber))
            .Select(r => r.WeekNumber)
            .Distinct()
            .Count();

        var missingCount = 0;
        var lateCount = 0;
        foreach (var (week, schedule) in reportScheduleByWeek)
        {
            var report = reports.FirstOrDefault(r => r.WeekNumber == week && r.SubmittedAt.HasValue);
            if (report == null)
            {
                // Chưa nộp quá hạn → tính thiếu bài (chỉ ảnh hưởng Điểm QT).
                if (schedule.DueDate < nowUtc)
                    missingCount++;
            }
            else if (report.SubmittedAt!.Value > schedule.DueDate)
            {
                lateCount++;
            }
        }

        return (missingCount, lateCount, submittedWeekCount);
    }

    private static void StyleHeaderCell(IXLCell cell)
    {
        cell.Style.Font.Bold = true;
        cell.Style.Font.FontSize = 10;
        cell.Style.Font.FontName = "Times New Roman";
        cell.Style.Font.FontColor = XLColor.White;
        cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A8A");
        cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
    }


}
