using System.Data;
using ClosedXML.Excel;
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
        var studentsQuery = _db.Students
            .AsNoTracking()
            .Include(s => s.Internships.Where(i => !i.IsDeleted && (!semesterId.HasValue || i.SemesterId == semesterId.Value) && (!lecturerId.HasValue || i.LecturerId == lecturerId.Value)))
                .ThenInclude(i => i.Company)
            .Include(s => s.Internships.Where(i => !i.IsDeleted && (!semesterId.HasValue || i.SemesterId == semesterId.Value) && (!lecturerId.HasValue || i.LecturerId == lecturerId.Value)))
                .ThenInclude(i => i.Lecturer)
            .Include(s => s.Internships.Where(i => !i.IsDeleted && (!semesterId.HasValue || i.SemesterId == semesterId.Value) && (!lecturerId.HasValue || i.LecturerId == lecturerId.Value)))
                .ThenInclude(i => i.WeeklyReports)
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

        var studentExportList = new List<InternshipStudentExportDto>();
        int stt = 1;

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
                dto.GhiChu = internship.Notes ?? string.Empty;

                // Map scores from Evaluation if available
                if (evaluations.TryGetValue(internship.Id, out var eval))
                {
                    dto.DiemThamGia = eval.InitiativeScore;
                    // DiemQT: average of Technical, Communication, Teamwork
                    dto.DiemQT = Math.Round((eval.TechnicalScore + eval.CommunicationScore + eval.TeamworkScore) / 3.0m, 1);
                    dto.Thi = eval.FinalGrade;
                }

                // Map weekly reports
                var reports = internship.WeeklyReports.OrderBy(r => r.WeekNumber).ToList();
                dto.HdChung = reports.Count >= 6 ? "Đủ" : "Thiếu";
                dto.Tuan1 = FormatWeeklyReportCell(reports.FirstOrDefault(r => r.WeekNumber == 1));
                dto.Tuan2 = FormatWeeklyReportCell(reports.FirstOrDefault(r => r.WeekNumber == 2));
                dto.Tuan3 = FormatWeeklyReportCell(reports.FirstOrDefault(r => r.WeekNumber == 3));
                dto.Tuan4 = FormatWeeklyReportCell(reports.FirstOrDefault(r => r.WeekNumber == 4));
                dto.Tuan5 = FormatWeeklyReportCell(reports.FirstOrDefault(r => r.WeekNumber == 5));
                dto.Tuan6 = FormatWeeklyReportCell(reports.FirstOrDefault(r => r.WeekNumber == 6));

                // Report submission status: "Đã nộp" or "X"
                bool isSubmitted = internship.Status == InternshipStatus.Completed ||
                                   internship.Status == InternshipStatus.Graded ||
                                   reports.Count >= 6;
                dto.NopBc = isSubmitted ? "Đã nộp" : "X";
            }
            else
            {
                dto.PhuTrachCongTy = string.Empty;
                dto.GvHuongDan = string.Empty;
                dto.GhiChu = "Không thực tập";
                dto.HdChung = "Thiếu";
                dto.Tuan1 = "V";
                dto.Tuan2 = "V";
                dto.Tuan3 = "V";
                dto.Tuan4 = "V";
                dto.Tuan5 = "V";
                dto.Tuan6 = "V";
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
            ExportStudents(workbook, data.Students);
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
            .Include(s => s.ReportSchedules)
            .FirstOrDefaultAsync(s => s.Id == semesterId, cancellationToken);

        if (semester == null)
            throw new InvalidOperationException($"Không tìm thấy học kỳ có mã {semesterId}");

        var lecturer = await _db.Lecturers
            .Include(l => l.User)
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

        var templatePath = TemplateHelper.FindTemplatePath("Lich huong dan TTTN-C23-Cuong.xlsx")
            ?? TemplateHelper.FindTemplatePath("Lich huong dan TTTN.xlsx");

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
                : "C23A.TH1, C23A.TH2";

            var academicYear = semester.AcademicYear ?? $"{DateTime.Now.Year}-{DateTime.Now.Year + 1}";
            var semesterNumber = semester.Name.Contains("2") ? "2" : (semester.Name.Contains("3") ? "Hè" : "1");

            // Header & metadata
            ws1.Cell("E5").Value = "HỌC KỲ:";
            ws1.Cell("F5").Value = semesterNumber;
            ws1.Cell("G5").Value = $"NĂM HỌC: {academicYear}";
            ws1.Cell("A6").Value = $"Tên Giảng Viên: {lecturer.FullName}";
            ws1.Cell("A7").Value = $"Tên học phần: Thực tập tốt nghiệp, Lớp {distinctClasses}";
            ws1.Cell("G7").Value = $"Số SV: {studentCount:D2}";
            ws1.Cell("I7").Value = $" Số tiết qui đổi:  2x{studentCount:D2} = {2 * studentCount} tiết";

            if (ws1.Cell("D19").IsEmpty() || ws1.Cell("A19").GetString().Contains("Tổng", StringComparison.OrdinalIgnoreCase))
            {
                ws1.Cell("D19").Value = 2 * studentCount;
            }

            ws1.Cell("H20").Value = $"TP. Hồ Chí Minh, ngày {DateTime.Now:dd} tháng {DateTime.Now:MM} năm {DateTime.Now:yyyy}";
            ws1.Cell("J26").Value = lecturer.FullName;

            if (!string.IsNullOrWhiteSpace(lecturer.Department))
            {
                ws1.Cell("G22").Value = $"Khoa {lecturer.Department.ToUpperInvariant()}";
            }

            // Sync report schedules if configured in semester
            if (semester.ReportSchedules != null && semester.ReportSchedules.Count > 0)
            {
                var schedules = semester.ReportSchedules.OrderBy(s => s.WeekNumber).ToList();
                for (int i = 0; i < schedules.Count && i < 10; i++)
                {
                    int r = 9 + i;
                    var sched = schedules[i];
                    ws1.Cell(r, 2).Value = sched.DueDate.ToString("dd/MM/yyyy");
                    ws1.Cell(r, 3).Value = sched.WeekNumber;
                    if (!string.IsNullOrWhiteSpace(sched.Title))
                    {
                        ws1.Cell(r, 5).Value = sched.Title;
                    }
                }
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
    private void ExportStudents(XLWorkbook workbook, List<InternshipStudentExportDto> students)
    {
        var ws = FindWorksheet(workbook, "DANH SÁCH (2)", "DANH SÁCH THỰC TẬP", "DANH SÁCH")
            ?? workbook.Worksheets.FirstOrDefault();
        if (ws == null) return;

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
            MapStudentToRow(ws, r, s, currentLookupStartRow, currentLookupEndRow);
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

        // K: Điểm TB Formula
        ws.Cell(row, 11).FormulaA1 = $"I{row}*0.4+J{row}*0.6";

        // L: Xếp loại Formula via dynamic VLOOKUP
        ws.Cell(row, 12).FormulaA1 = $"VLOOKUP(K{row},$I${lookupStartRow}:$L${lookupEndRow},4,1)";

        // Progress (Cols M to S)
        ws.Cell(row, 13).Value = s.HdChung;
        ws.Cell(row, 14).Value = s.Tuan1;
        ws.Cell(row, 15).Value = s.Tuan2;
        ws.Cell(row, 16).Value = s.Tuan3;
        ws.Cell(row, 17).Value = s.Tuan4;
        ws.Cell(row, 18).Value = s.Tuan5;
        ws.Cell(row, 19).Value = s.Tuan6;

        // T: Nộp báo cáo
        ws.Cell(row, 20).Value = s.NopBc;

        // U: Final eligibility dynamic formula
        ws.Cell(row, 21).FormulaA1 = $"IF(OR(T{row}=\"X\",(COUNTIF(N{row}:S{row},\"V\")>=2)),\"Không đủ điều kiện\",\"\")";

        // Formatting styles
        for (int c = 1; c <= 21; c++)
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
        for (int c = 13; c <= 21; c++)
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

    private static string FormatWeeklyReportCell(WeeklyReport? report)
    {
        if (report == null) return "V"; // Vắng / Chưa nộp
        return report.Status switch
        {
            WeeklyReportStatus.Approved => "✓",
            WeeklyReportStatus.Reviewed => "✓",
            WeeklyReportStatus.Submitted => "Đã nộp",
            WeeklyReportStatus.Draft => "Nháp",
            _ => "V"
        };
    }
}
