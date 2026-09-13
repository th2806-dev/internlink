using ClosedXML.Excel;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
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
    public async Task<byte[]> ExportC23ExcelAsync(Guid? semesterId = null, string? department = null, Guid? departmentId = null)
    {
        // ── Load data ──────────────────────────────────────────────────────
        var internshipsQuery = _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Lecturer)
            .Include(i => i.WeeklyReports)
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

        var internships = await internshipsQuery
            .OrderBy(i => i.Student.Class)
            .ThenBy(i => i.Student.FullName)
            .ToListAsync();

        // Load evaluations separately
        var internshipIds = internships.Select(i => i.Id).ToHashSet();
        var evaluations = await _db.Set<Domain.Entities.Evaluation>()
            .Where(e => internshipIds.Contains(e.InternshipId))
            .AsNoTracking()
            .ToDictionaryAsync(e => e.InternshipId);

        // Load students without internship
        var studentsWithInternshipIds = internships.Select(i => i.StudentId).ToHashSet();
        var studentsQuery = _db.Students
            .Where(s => !studentsWithInternshipIds.Contains(s.Id) && !s.IsDeleted);

        if (!string.IsNullOrWhiteSpace(department))
            studentsQuery = studentsQuery.Where(s => s.Department == department);

        if (departmentId.HasValue)
            studentsQuery = studentsQuery.Where(s => s.DepartmentId == departmentId.Value);

        var studentsWithoutInternship = await studentsQuery
            .AsNoTracking()
            .OrderBy(s => s.Class)
            .ThenBy(s => s.FullName)
            .ToListAsync();

        // Load companies
        var companies = await _db.Companies
            .Where(c => c.IsActive)
            .AsNoTracking()
            .OrderBy(c => c.CompanyName)
            .ToListAsync();

        using var workbook = new XLWorkbook();

        // ═══════════════════════════════════════════════════════════════════
        // Sheet 1: DANH SÁCH – Full tracking & grading table
        // ═══════════════════════════════════════════════════════════════════
        var ws1 = workbook.Worksheets.Add("DANH SÁCH");
        BuildDanhSachSheet(ws1, internships, evaluations, studentsWithoutInternship);

        // ═══════════════════════════════════════════════════════════════════
        // Sheet 2: DATABASE – Student-Company mapping
        // ═══════════════════════════════════════════════════════════════════
        var ws2 = workbook.Worksheets.Add("DATABASE");
        BuildDatabaseSheet(ws2, internships, studentsWithoutInternship);

        // ═══════════════════════════════════════════════════════════════════
        // Sheet 3: TÊN CÔNG TY – Company directory
        // ═══════════════════════════════════════════════════════════════════
        var ws3 = workbook.Worksheets.Add("TÊN CÔNG TY");
        BuildCompanySheet(ws3, companies, internships);

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    /// <inheritdoc />
    public async Task<byte[]> ExportC22ASummaryReportAsync(Guid? semesterId = null, string? department = null, Guid? departmentId = null)
    {
        // ── Load data ──────────────────────────────────────────────────────
        var internshipsQuery = _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Lecturer)
            .Include(i => i.WeeklyReports)
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

        var internships = await internshipsQuery.ToListAsync();

        var internshipIds = internships.Select(i => i.Id).ToHashSet();
        var evaluations = await _db.Set<Domain.Entities.Evaluation>()
            .Where(e => internshipIds.Contains(e.InternshipId))
            .AsNoTracking()
            .ToDictionaryAsync(e => e.InternshipId);

        var studentsCountQuery = _db.Students.Where(s => !s.IsDeleted);
        if (!string.IsNullOrWhiteSpace(department))
            studentsCountQuery = studentsCountQuery.Where(s => s.Department == department);
        if (departmentId.HasValue)
            studentsCountQuery = studentsCountQuery.Where(s => s.DepartmentId == departmentId.Value);
        var totalStudents = await studentsCountQuery.CountAsync();

        var totalCompanies = internships.Select(i => i.CompanyId).Where(c => c.HasValue).Distinct().Count();

        // Build the summary report as a styled Excel file (matching the C22A Word structure)
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("BÁO CÁO TỔNG KẾT");
        BuildC22ASummarySheet(ws, internships, evaluations, totalStudents, totalCompanies);

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    /// <inheritdoc />
    public async Task<byte[]> ExportC22AWordReportAsync(Guid? semesterId = null, string? department = null, Guid? departmentId = null)
    {
        // ── Load data ──────────────────────────────────────────────────────
        var internshipsQuery = _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Lecturer)
            .Include(i => i.WeeklyReports)
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

        var internships = await internshipsQuery.ToListAsync();

        var internshipIds = internships.Select(i => i.Id).ToHashSet();
        var evaluations = await _db.Set<Domain.Entities.Evaluation>()
            .Where(e => internshipIds.Contains(e.InternshipId))
            .AsNoTracking()
            .ToDictionaryAsync(e => e.InternshipId);

        var studentsCountQuery = _db.Students.Where(s => !s.IsDeleted);
        if (!string.IsNullOrWhiteSpace(department))
            studentsCountQuery = studentsCountQuery.Where(s => s.Department == department);
        if (departmentId.HasValue)
            studentsCountQuery = studentsCountQuery.Where(s => s.DepartmentId == departmentId.Value);
        var totalStudents = await studentsCountQuery.CountAsync();

        var totalCompanies = internships
            .Select(i => i.CompanyId)
            .Where(c => c.HasValue).Distinct().Count();

        var semester = semesterId.HasValue
            ? await _db.Semesters.FirstOrDefaultAsync(s => s.Id == semesterId.Value)
            : await _db.Semesters.OrderByDescending(s => s.StartDate).FirstOrDefaultAsync();

        var startDateStr = semester?.StartDate?.ToString("dd/MM/yyyy") ?? DateTime.Now.ToString("dd/MM/yyyy");
        var endDateStr = semester?.EndDate?.ToString("dd/MM/yyyy") ?? DateTime.Now.AddDays(45).ToString("dd/MM/yyyy");

        // ── Calculate statistics ────────────────────────────────────────────
        var interning = internships.Count;
        var completedCount = internships.Count(i =>
            i.Status == InternshipStatus.Completed || i.Status == InternshipStatus.Graded);
        var incompleteCount = interning - completedCount;
        var notInterning = totalStudents - interning;

        // Grade classification
        var gradeCategories = new[]
        {
            "Xuất sắc", "Giỏi", "Khá", "Trung bình khá",
            "Trung bình", "Yếu", "Không thực tập"
        };
        var gradeCounts = new Dictionary<string, int>();
        foreach (var cat in gradeCategories) gradeCounts[cat] = 0;

        foreach (var intern in internships)
        {
            if (evaluations.TryGetValue(intern.Id, out var eval))
            {
                var classification = ClassifyGrade(eval.FinalGrade);
                gradeCounts[classification]++;
            }
            else
            {
                gradeCounts["Trung bình"]++;
            }
        }
        gradeCounts["Không thực tập"] = notInterning;

        int totalForPercent = totalStudents > 0 ? totalStudents : 1;

        // Incomplete students
        var incompleteStudents = internships
            .Where(i => i.Status != InternshipStatus.Completed && i.Status != InternshipStatus.Graded)
            .Select(i => i.Student)
            .ToList();

        // ── Build placeholder map ──────────────────────────────────────────
        var placeholders = new Dictionary<string, string>
        {
            ["{{REPORT_DATE}}"] = DateTime.Now.ToString("dd/MM/yyyy"),
            ["{{TOTAL_COMPANIES}}"] = totalCompanies.ToString(),
            ["{{TOTAL_REGISTERED_STUDENTS}}"] = interning.ToString(),
            ["{{TOTAL_COMPLETED_STUDENTS}}"] = completedCount.ToString(),
            ["{{TOTAL_NOT_COMPLETED_STUDENTS}}"] = incompleteCount.ToString(),
            ["{{TOTAL_STUDENTS}}"] = totalStudents.ToString(),
            ["{{TOTAL_NOT_INTERNSHIP}}"] = notInterning.ToString(),
            ["{{START_DATE}}"] = startDateStr,
            ["{{END_DATE}}"] = endDateStr,
            ["{{DEPARTMENT}}"] = !string.IsNullOrWhiteSpace(department) ? department : "CÔNG NGHỆ THÔNG TIN",
        };

        // Grade stats placeholders
        foreach (var cat in gradeCategories)
        {
            int count = gradeCounts[cat];
            double pct = Math.Round(count * 100.0 / totalForPercent, 1);
            string key = cat switch
            {
                "Xuất sắc" => "EXCELLENT",
                "Giỏi" => "GOOD",
                "Khá" => "FAIR",
                "Trung bình khá" => "AVERAGE_GOOD",
                "Trung bình" => "AVERAGE",
                "Yếu" => "WEAK",
                "Không thực tập" => "NO_INTERNSHIP",
                _ => cat.ToUpper()
            };
            placeholders[$"{{{{{key}_COUNT}}}}"] = count.ToString();
            placeholders[$"{{{{{key}_PERCENT}}}}"] = $"{pct}%";
        }

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

            // ── Replace placeholders in paragraphs and tables ───────────────
            ReplacePlaceholdersInBody(body, placeholders);

            // ── Update institutional paragraphs ─────────────────────────────
            UpdateInstitutionalParagraphs(body, department, startDateStr, endDateStr, totalCompanies, interning, completedCount, incompleteCount);

            // ── Update Grade Statistics Table ───────────────────────────────
            UpdateGradeStatisticsTable(body, gradeCounts, totalStudents);

            // ── Populate the incomplete students table ──────────────────────
            PopulateIncompleteStudentsTable(body, incompleteStudents);

            doc.MainDocumentPart.Document.Save();
        }

        return outputStream.ToArray();
    }

    // ────────────────────────────────────────────────────────────────────────
    // Word document helpers
    // ────────────────────────────────────────────────────────────────────────

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
        int totalStudents)
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

            foreach (var kvp in gradeCounts)
            {
                if (rowLabel.Equals(kvp.Key, StringComparison.OrdinalIgnoreCase))
                {
                    var count = kvp.Value;
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
        // Process all paragraphs
        foreach (var paragraph in body.Descendants<Paragraph>())
        {
            var fullText = string.Concat(paragraph.Descendants<Text>().Select(t => t.Text));
            if (string.IsNullOrEmpty(fullText)) continue;

            bool replaced = false;
            foreach (var kvp in placeholders)
            {
                if (fullText.Contains(kvp.Key))
                {
                    fullText = fullText.Replace(kvp.Key, kvp.Value);
                    replaced = true;
                }
            }

            if (replaced)
            {
                // Preserve the first run's formatting
                var firstRun = paragraph.Descendants<Run>().FirstOrDefault();
                var rPr = firstRun?.RunProperties?.CloneNode(true) as RunProperties;

                // Clear all runs and texts
                foreach (var run in paragraph.Descendants<Run>().ToList())
                    run.Remove();
                foreach (var child in paragraph.ChildElements
                    .Where(c => c is not ParagraphProperties).ToList())
                    child.Remove();

                // Rebuild with the replaced text, preserving formatting
                var newRun = new Run();
                if (rPr != null) newRun.Append(rPr);
                newRun.Append(new Text(fullText) { Space = SpaceProcessingModeValues.Preserve });
                paragraph.Append(newRun);
            }
        }

        // Also process tables (cells may contain placeholders)
        foreach (var table in body.Descendants<Table>())
        {
            foreach (var cell in table.Descendants<TableCell>())
            {
                foreach (var paragraph in cell.Descendants<Paragraph>())
                {
                    var fullText = string.Concat(
                        paragraph.Descendants<Text>().Select(t => t.Text));
                    if (string.IsNullOrEmpty(fullText)) continue;

                    bool replaced = false;
                    foreach (var kvp in placeholders)
                    {
                        if (fullText.Contains(kvp.Key))
                        {
                            fullText = fullText.Replace(kvp.Key, kvp.Value);
                            replaced = true;
                        }
                    }

                    if (replaced)
                    {
                        var firstRun = paragraph.Descendants<Run>().FirstOrDefault();
                        var rPr = firstRun?.RunProperties?.CloneNode(true) as RunProperties;

                        foreach (var run in paragraph.Descendants<Run>().ToList())
                            run.Remove();
                        foreach (var child in paragraph.ChildElements
                            .Where(c => c is not ParagraphProperties).ToList())
                            child.Remove();

                        var newRun = new Run();
                        if (rPr != null) newRun.Append(rPr);
                        newRun.Append(new Text(fullText)
                        {
                            Space = SpaceProcessingModeValues.Preserve
                        });
                        paragraph.Append(newRun);
                    }
                }
            }
        }
    }

    private static void PopulateIncompleteStudentsTable(
        DocumentFormat.OpenXml.Wordprocessing.Body body,
        List<Domain.Entities.Student> incompleteStudents)
    {
        // Find the incomplete students table by its header cells.
        // The C22A template header is "TT | MSSV | Họ Tên | Lớp | Lý do".
        var tables = body.Descendants<Table>().ToList();
        Table? targetTable = null;

        foreach (var table in tables)
        {
            var tableText = string.Concat(
                table.Descendants<Text>().Select(t => t.Text));
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
            if (cells.Count >= 5)
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

    private static void BuildDanhSachSheet(
        IXLWorksheet ws,
        List<Domain.Entities.Internship> internships,
        Dictionary<Guid, Domain.Entities.Evaluation> evaluations,
        List<Domain.Entities.Student> studentsWithoutInternship)
    {
        const int totalWeeks = 6;

        // ── Title rows ─────────────────────────────────────────────────────
        ws.Range(1, 1, 1, 18 + totalWeeks).Merge();
        var titleCell = ws.Cell(1, 1);
        titleCell.Value = "DANH SÁCH THỰC TẬP TỐT NGHIỆP";
        titleCell.Style.Font.Bold = true;
        titleCell.Style.Font.FontSize = 16;
        titleCell.Style.Font.FontName = "Times New Roman";
        titleCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        ws.Row(1).Height = 30;

        ws.Range(2, 1, 2, 18 + totalWeeks).Merge();
        var subCell = ws.Cell(2, 1);
        subCell.Value = $"Ngày xuất: {DateTime.Now:dd/MM/yyyy} | Khoa Công nghệ thông tin";
        subCell.Style.Font.Italic = true;
        subCell.Style.Font.FontSize = 10;
        subCell.Style.Font.FontName = "Times New Roman";
        subCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        // ── Column headers (row 4) ─────────────────────────────────────────
        int headerRow = 4;
        var headers = new[]
        {
            "STT", "HỌ", "TÊN", "LỚP", "PHỤ TRÁCH CÔNG TY", "GV HƯỚNG DẪN THỰC TẬP",
            "GHI CHÚ", "Điểm tham gia", "Điểm QT", "Thi", "Điểm TB", "Kết quả xếp loại",
            "HD CHUNG"
        };

        int col = 1;
        foreach (var h in headers)
        {
            var cell = ws.Cell(headerRow, col);
            cell.Value = h;
            StyleHeaderCell(cell);
            col++;
        }

        // Weekly columns: TUẦN 1..6
        for (int w = 1; w <= totalWeeks; w++)
        {
            var cell = ws.Cell(headerRow, col);
            cell.Value = $"TUẦN {w}";
            StyleHeaderCell(cell);
            col++;
        }

        // NỘP BC, TỔNG
        var nbcCell = ws.Cell(headerRow, col);
        nbcCell.Value = "NỘP BC";
        StyleHeaderCell(nbcCell);
        col++;

        var tongCell = ws.Cell(headerRow, col);
        tongCell.Value = "TỔNG";
        StyleHeaderCell(tongCell);
        int totalCols = col;

        ws.Row(headerRow).Height = 28;

        // ── Data rows ──────────────────────────────────────────────────────
        int row = headerRow + 1;
        int stt = 1;

        foreach (var intern in internships)
        {
            var student = intern.Student;
            var nameParts = SplitName(student.FullName);
            var evaluation = evaluations.GetValueOrDefault(intern.Id);
            var weeklyReports = intern.WeeklyReports?.OrderBy(r => r.WeekNumber).ToList() ?? [];

            col = 1;
            ws.Cell(row, col++).Value = stt;
            ws.Cell(row, col++).Value = nameParts.Ho;
            ws.Cell(row, col++).Value = nameParts.Ten;
            ws.Cell(row, col++).Value = student.Class ?? "—";
            ws.Cell(row, col++).Value = intern.Company?.CompanyName ?? "Chưa có";
            ws.Cell(row, col++).Value = intern.Lecturer?.FullName ?? "Chưa phân công";
            ws.Cell(row, col++).Value = intern.Notes ?? "";

            // Scores
            if (evaluation != null)
            {
                decimal diemThamGia = evaluation.InitiativeScore;
                decimal diemQT = (evaluation.TechnicalScore + evaluation.CommunicationScore + evaluation.TeamworkScore) / 3.0m;
                decimal thi = evaluation.FinalGrade;
                decimal diemTB = Math.Round((diemThamGia + diemQT + thi) / 3.0m, 2);

                ws.Cell(row, col++).Value = Math.Round(diemThamGia, 1);
                ws.Cell(row, col++).Value = Math.Round(diemQT, 1);
                ws.Cell(row, col++).Value = Math.Round(thi, 1);
                ws.Cell(row, col++).Value = Math.Round(diemTB, 1);
                ws.Cell(row, col++).Value = ClassifyGrade(diemTB);
            }
            else
            {
                col += 5; // skip score columns
            }

            // HD CHUNG: overall guidance status
            bool hasAllWeeks = weeklyReports.Count >= totalWeeks;
            ws.Cell(row, col++).Value = hasAllWeeks ? "Đủ" : "Thiếu";

            // Weekly report status (TUẦN 1..6)
            for (int w = 1; w <= totalWeeks; w++)
            {
                var report = weeklyReports.FirstOrDefault(r => r.WeekNumber == w);
                var wCell = ws.Cell(row, col++);
                if (report != null)
                {
                    wCell.Value = report.Status switch
                    {
                        WeeklyReportStatus.Approved => "✓",
                        WeeklyReportStatus.Reviewed => "✓",
                        WeeklyReportStatus.Submitted => "Đã nộp",
                        WeeklyReportStatus.Draft => "Nháp",
                        _ => "—"
                    };
                    if (report.Status == WeeklyReportStatus.Approved || report.Status == WeeklyReportStatus.Reviewed)
                        wCell.Style.Font.FontColor = XLColor.Green;
                }
                else
                {
                    wCell.Value = "—";
                    wCell.Style.Font.FontColor = XLColor.Red;
                }
            }

            // NỘP BC
            bool hasSubmission = intern.Status == InternshipStatus.Completed || intern.Status == InternshipStatus.Graded;
            ws.Cell(row, col++).Value = hasSubmission ? "Đã nộp" : "Chưa";

            // TỔNG - Đủ điều kiện / Không đủ điều kiện
            bool eligible = hasAllWeeks && hasSubmission && evaluation != null;
            var tongDataCell = ws.Cell(row, col);
            tongDataCell.Value = eligible ? "Đủ điều kiện" : "Không đủ điều kiện";
            if (!eligible)
            {
                tongDataCell.Style.Font.FontColor = XLColor.Red;
                tongDataCell.Style.Font.Bold = true;
            }

            // Zebra striping
            if (stt % 2 == 0)
            {
                for (int c = 1; c <= totalCols; c++)
                    ws.Cell(row, c).Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
            }

            // Apply borders and font to entire row
            for (int c = 1; c <= totalCols; c++)
            {
                ws.Cell(row, c).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                ws.Cell(row, c).Style.Border.OutsideBorderColor = XLColor.FromHtml("#D1D5DB");
                ws.Cell(row, c).Style.Font.FontName = "Times New Roman";
                ws.Cell(row, c).Style.Font.FontSize = 10;
            }

            stt++;
            row++;
        }

        // Add students without internship as "Không thực tập"
        foreach (var student in studentsWithoutInternship)
        {
            var nameParts = SplitName(student.FullName);
            col = 1;
            ws.Cell(row, col++).Value = stt;
            ws.Cell(row, col++).Value = nameParts.Ho;
            ws.Cell(row, col++).Value = nameParts.Ten;
            ws.Cell(row, col++).Value = student.Class ?? "—";
            // Skip remaining columns, mark as Không thực tập
            ws.Cell(row, 12).Value = "không thực tập";
            ws.Cell(row, 12).Style.Font.FontColor = XLColor.Red;
            ws.Cell(row, totalCols).Value = "Không đủ điều kiện";
            ws.Cell(row, totalCols).Style.Font.FontColor = XLColor.Red;

            for (int c = 1; c <= totalCols; c++)
            {
                ws.Cell(row, c).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                ws.Cell(row, c).Style.Border.OutsideBorderColor = XLColor.FromHtml("#D1D5DB");
                ws.Cell(row, c).Style.Font.FontName = "Times New Roman";
                ws.Cell(row, c).Style.Font.FontSize = 10;
            }

            stt++;
            row++;
        }

        // Auto-fit
        ws.Columns(1, totalCols).AdjustToContents();
        ws.Column(1).Width = 5;  // STT
        ws.Column(2).Width = 15; // HỌ
        ws.Column(3).Width = 10; // TÊN
        ws.Column(5).Width = 25; // CÔNG TY
        ws.Column(6).Width = 22; // GVHD
    }

    private static void BuildDatabaseSheet(
        IXLWorksheet ws,
        List<Domain.Entities.Internship> internships,
        List<Domain.Entities.Student> studentsWithoutInternship)
    {
        var headers = new[] { "STT", "HỌ TÊN", "LỚP", "CÔNG TY THỰC TẬP" };
        int col = 1;
        foreach (var h in headers)
        {
            StyleHeaderCell(ws.Cell(1, col));
            ws.Cell(1, col).Value = h;
            col++;
        }
        ws.Row(1).Height = 26;

        int row = 2;
        int stt = 1;
        foreach (var intern in internships)
        {
            ws.Cell(row, 1).Value = stt;
            ws.Cell(row, 2).Value = intern.Student.FullName;
            ws.Cell(row, 3).Value = intern.Student.Class ?? "—";
            ws.Cell(row, 4).Value = intern.Company?.CompanyName ?? "Chưa có";

            for (int c = 1; c <= 4; c++)
            {
                ws.Cell(row, c).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                ws.Cell(row, c).Style.Font.FontName = "Times New Roman";
                ws.Cell(row, c).Style.Font.FontSize = 10;
            }
            stt++;
            row++;
        }

        foreach (var student in studentsWithoutInternship)
        {
            ws.Cell(row, 1).Value = stt;
            ws.Cell(row, 2).Value = student.FullName;
            ws.Cell(row, 3).Value = student.Class ?? "—";
            ws.Cell(row, 4).Value = "Không thực tập";
            ws.Cell(row, 4).Style.Font.FontColor = XLColor.Red;

            for (int c = 1; c <= 4; c++)
            {
                ws.Cell(row, c).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                ws.Cell(row, c).Style.Font.FontName = "Times New Roman";
                ws.Cell(row, c).Style.Font.FontSize = 10;
            }
            stt++;
            row++;
        }

        ws.Columns(1, 4).AdjustToContents();
        ws.Column(1).Width = 5;
        ws.Column(2).Width = 25;
        ws.Column(4).Width = 30;
    }

    private static void BuildCompanySheet(
        IXLWorksheet ws,
        List<Domain.Entities.Company> companies,
        List<Domain.Entities.Internship> internships)
    {
        var headers = new[] { "STT", "Tên Công Ty", "Địa Chỉ", "Số Lượng", "Điện thoại / Liên Hệ" };
        int col = 1;
        foreach (var h in headers)
        {
            StyleHeaderCell(ws.Cell(1, col));
            ws.Cell(1, col).Value = h;
            col++;
        }
        ws.Row(1).Height = 26;

        // Count students per company
        var companyCounts = internships
            .Where(i => i.CompanyId.HasValue)
            .GroupBy(i => i.CompanyId!.Value)
            .ToDictionary(g => g.Key, g => g.Count());

        int row = 2;
        int stt = 1;
        foreach (var company in companies)
        {
            ws.Cell(row, 1).Value = stt;
            ws.Cell(row, 2).Value = company.CompanyName;
            ws.Cell(row, 3).Value = company.Address ?? "—";
            ws.Cell(row, 4).Value = companyCounts.GetValueOrDefault(company.Id, 0);
            ws.Cell(row, 5).Value = string.IsNullOrWhiteSpace(company.ContactPhone)
                ? (company.ContactPerson ?? "—")
                : $"{company.ContactPerson} - {company.ContactPhone}";

            for (int c = 1; c <= 5; c++)
            {
                ws.Cell(row, c).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                ws.Cell(row, c).Style.Font.FontName = "Times New Roman";
                ws.Cell(row, c).Style.Font.FontSize = 10;
            }
            stt++;
            row++;
        }

        ws.Columns(1, 5).AdjustToContents();
        ws.Column(1).Width = 5;
        ws.Column(2).Width = 30;
        ws.Column(3).Width = 35;
        ws.Column(5).Width = 30;
    }

    private static void BuildC22ASummarySheet(
        IXLWorksheet ws,
        List<Domain.Entities.Internship> internships,
        Dictionary<Guid, Domain.Entities.Evaluation> evaluations,
        int totalStudents,
        int totalCompanies)
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
        var completedCount = internships.Count(i => i.Status == InternshipStatus.Completed || i.Status == InternshipStatus.Graded);
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

        // Classification based on evaluations
        var gradeCategories = new[] { "Xuất sắc", "Giỏi", "Khá", "Trung bình khá", "Trung bình", "Yếu", "Không thực tập" };
        var gradeCounts = new Dictionary<string, int>();
        foreach (var cat in gradeCategories) gradeCounts[cat] = 0;

        foreach (var intern in internships)
        {
            if (evaluations.TryGetValue(intern.Id, out var eval))
            {
                decimal avg = eval.FinalGrade;
                var classification = ClassifyGrade(avg);
                if (gradeCounts.ContainsKey(classification))
                    gradeCounts[classification]++;
                else
                    gradeCounts["Trung bình"]++;
            }
            else
            {
                // No evaluation — check if completed
                if (intern.Status == InternshipStatus.Completed || intern.Status == InternshipStatus.Graded)
                    gradeCounts["Trung bình"]++;
            }
        }
        gradeCounts["Không thực tập"] = notInterning;

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
            .Where(i => i.Status != InternshipStatus.Completed && i.Status != InternshipStatus.Graded)
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

    private static (string Ho, string Ten) SplitName(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            return ("", "");

        var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length <= 1)
            return ("", fullName.Trim());

        var ten = parts[^1];
        var ho = string.Join(' ', parts[..^1]);
        return (ho, ten);
    }

    /// <summary>
    /// Classify final grade into Vietnamese categories matching C23 template.
    /// </summary>
    private static string ClassifyGrade(decimal average)
    {
        return average switch
        {
            >= 9.0m => "Xuất sắc",
            >= 8.0m => "Giỏi",
            >= 7.0m => "Khá",
            >= 6.0m => "Trung bình khá",
            >= 5.0m => "Trung bình",
            _ => "Yếu"
        };
    }
}
