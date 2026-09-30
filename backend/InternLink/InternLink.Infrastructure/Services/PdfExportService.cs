using System.Globalization;
using System.Text;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public class PdfExportService : IPdfExportService
{
    private readonly AppDbContext _db;

    public PdfExportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<byte[]> GenerateLecturerSummaryPdfAsync(Guid lecturerUserId, CancellationToken cancellationToken = default)
    {
        var lecturer = await _db.Lecturers
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.UserId == lecturerUserId && !l.IsDeleted, cancellationToken);

        if (lecturer == null)
            throw new InvalidOperationException("Khong tim thay thong tin giang vien tuong ung voi tai khoan.");

        var internships = await _db.Internships
            .AsNoTracking()
            .Where(i => i.LecturerId == lecturer.Id && !i.IsDeleted)
            .Include(i => i.Student)
            .Include(i => i.Company)
            .OrderBy(i => i.Student!.FullName)
            .ToListAsync(cancellationToken);

        var internshipIds = internships.Select(i => i.Id).ToList();

        // Lấy bản đánh giá mới nhất cho mỗi internship (1 internship có thể có nhiều lượt).
        var evaluationRows = await _db.Evaluations
            .AsNoTracking()
            .Where(e => !e.IsDeleted && internshipIds.Contains(e.InternshipId))
            .ToListAsync(cancellationToken);
        var evaluations = evaluationRows
            .GroupBy(e => e.InternshipId)
            .ToDictionary(g => g.Key, g => g.First());

        var weeklyCounts = await _db.WeeklyReports
            .AsNoTracking()
            .Where(r => !r.IsDeleted && internshipIds.Contains(r.InternshipId))
            .GroupBy(r => r.InternshipId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);

        var doc = new SimplePdfDocument("A4", landscape: true);
        doc.AddPage();

        // Top Header
        doc.DrawText("BO GIAO DUC VA DAO TAO - TRUONG DAI HOC CONG NGHE", 40, 560, fontSize: 10, isBold: false);
        doc.DrawText("KHOA CONG NGHE THONG TIN - BAN QUAN LY THUC TAP", 40, 545, fontSize: 11, isBold: true);
        doc.DrawText("CONG HOA XA HOI CHU NGHIA VIET NAM", 520, 560, fontSize: 10, isBold: false);
        doc.DrawText("Doc lap - Tu do - Hanh phuc", 550, 545, fontSize: 10, isBold: true);
        doc.DrawLine(530, 540, 720, 540, 1);

        // Title
        doc.DrawText("BANG TONG HOP KET QUA HUONG DAN THUC TAP CUOI KY", 200, 505, fontSize: 16, isBold: true);
        doc.DrawText($"Giang vien phu trach: {RemoveDiacritics(lecturer.FullName)}  |  Ma GV: {lecturer.StaffCode}  |  Email: {lecturer.Email ?? "N/A"}", 210, 485, fontSize: 10, isBold: false);
        doc.DrawText($"Ngay xuat bao cao: {DateTime.UtcNow:dd/MM/yyyy HH:mm} (UTC)  |  Tong so sinh vien huong dan: {internships.Count}", 245, 470, fontSize: 9, isBold: false);

        // Table Header
        float tableTop = 445;
        doc.DrawFilledRect(30, tableTop - 20, 782, 22, 0.9f, 0.93f, 0.98f);
        doc.DrawRect(30, tableTop - 20, 782, 22, 1);

        var cols = new (string title, float width, float x)[]
        {
            ("STT", 35, 35),
            ("MSSV", 75, 70),
            ("Ho va Ten Sinh Vien", 155, 145),
            ("Lop", 70, 300),
            ("Doanh Nghiep Thuc Tap", 175, 370),
            ("BC Tuan", 55, 545),
            ("Ky Thuat", 55, 600),
            ("Thai Do", 55, 655),
            ("Diem Tong", 60, 710),
            ("Xep Loai", 57, 765)
        };

        foreach (var c in cols)
        {
            doc.DrawText(c.title, c.x, tableTop - 14, fontSize: 8.5f, isBold: true);
        }

        float y = tableTop - 20;
        int index = 1;

        foreach (var item in internships)
        {
            y -= 20;
            if (y < 70)
            {
                doc.AddPage();
                y = 540;
            }

            evaluations.TryGetValue(item.Id, out var eval);
            weeklyCounts.TryGetValue(item.Id, out var bcCount);

            if (index % 2 == 0)
            {
                doc.DrawFilledRect(30, y, 782, 20, 0.97f, 0.97f, 0.97f);
            }
            doc.DrawRect(30, y, 782, 20, 0.5f);

            var finalGrade = eval?.FinalGrade;
            string gradeText = finalGrade.HasValue ? finalGrade.Value.ToString("F1", CultureInfo.InvariantCulture) : "--";
            string rankText = !finalGrade.HasValue ? "Chua cham"
                : finalGrade >= 8.5m ? "Xuat sac"
                : finalGrade >= 7.0m ? "Gioi / Kha"
                : finalGrade >= 5.0m ? "Trung binh" : "Khong dat";

            doc.DrawText(index.ToString(), 42, y + 6, fontSize: 8);
            doc.DrawText(item.Student?.StudentCode ?? "--", 70, y + 6, fontSize: 8);
            doc.DrawText(Truncate(RemoveDiacritics(item.Student?.FullName ?? "--"), 24), 145, y + 6, fontSize: 8, isBold: true);
            doc.DrawText(item.Student?.Class ?? "--", 300, y + 6, fontSize: 8);
            doc.DrawText(Truncate(RemoveDiacritics(item.Company?.CompanyName ?? "Chua xac dinh"), 28), 370, y + 6, fontSize: 8);
            doc.DrawText($"{bcCount} tuan", 552, y + 6, fontSize: 8);
            doc.DrawText(eval == null ? "--" : eval.TechnicalScore.ToString("F1"), 610, y + 6, fontSize: 8);
            doc.DrawText(eval == null ? "--" : eval.InitiativeScore.ToString("F1"), 665, y + 6, fontSize: 8);
            doc.DrawText(gradeText, 720, y + 6, fontSize: 8.5f, isBold: true);
            doc.DrawText(rankText, 765, y + 6, fontSize: 7.5f);

            index++;
        }

        // Signature section
        float sigY = Math.Max(40, y - 50);
        if (sigY < 90)
        {
            doc.AddPage();
            sigY = 480;
        }

        doc.DrawText("XAC NHAN CUA TRUONG KHOA", 100, sigY + 20, fontSize: 9.5f, isBold: true);
        doc.DrawText("(Ky va ghi ro ho ten)", 120, sigY + 5, fontSize: 8);

        doc.DrawText($"Tp. Ho Chi Minh, ngay {DateTime.UtcNow:dd} thang {DateTime.UtcNow:MM} nam {DateTime.UtcNow:yyyy}", 530, sigY + 35, fontSize: 9);
        doc.DrawText("GIANG VIEN HUONG DAN", 570, sigY + 20, fontSize: 9.5f, isBold: true);
        doc.DrawText("(Ky va ghi ro ho ten)", 585, sigY + 5, fontSize: 8);
        doc.DrawText(RemoveDiacritics(lecturer.FullName), 570, sigY - 45, fontSize: 9.5f, isBold: true);

        return doc.Build();
    }

    public async Task<byte[]> GenerateStudentEvaluationPdfAsync(Guid internshipId, Guid requesterUserId, CancellationToken cancellationToken = default)
    {
        var internship = await _db.Internships
            .AsNoTracking()
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Lecturer)
            .FirstOrDefaultAsync(i => i.Id == internshipId && !i.IsDeleted, cancellationToken);

        if (internship == null)
            throw new InvalidOperationException("Khong tim thay thong tin dot thuc tap.");

        var evaluation = await _db.Evaluations
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.InternshipId == internshipId && !e.IsDeleted, cancellationToken);

        var doc = new SimplePdfDocument("A4", landscape: false);
        doc.AddPage();

        // Header
        doc.DrawText("BO GIAO DUC VA DAO TAO", 45, 800, fontSize: 9.5f, isBold: false);
        doc.DrawText("TRUONG DAI HOC CONG NGHE", 45, 786, fontSize: 10, isBold: true);
        doc.DrawText("KHOA CONG NGHE THONG TIN", 45, 772, fontSize: 10, isBold: true);

        doc.DrawText("CONG HOA XA HOI CHU NGHIA VIET NAM", 330, 800, fontSize: 9.5f, isBold: false);
        doc.DrawText("Doc lap - Tu do - Hanh phuc", 360, 786, fontSize: 10, isBold: true);
        doc.DrawLine(340, 780, 520, 780, 1);

        // Title
        doc.DrawText("PHIEU DANH GIA KET QUA THUC TAP TOT NGHIEP", 110, 725, fontSize: 14, isBold: true);
        doc.DrawText("INTERNSHIP FINAL EVALUATION SHEET", 185, 710, fontSize: 9.5f, isBold: false);

        // Section 1: Student info
        doc.DrawFilledRect(45, 680, 505, 18, 0.92f, 0.94f, 0.98f);
        doc.DrawText("I. THONG TIN SINH VIEN VA DON VI THUC TAP", 52, 685, fontSize: 9, isBold: true);

        float sY = 660;
        doc.DrawText($"Ho va ten sinh vien: {RemoveDiacritics(internship.Student?.FullName ?? "N/A")}", 55, sY, fontSize: 9, isBold: true);
        doc.DrawText($"MSSV: {internship.Student?.StudentCode ?? "N/A"}", 350, sY, fontSize: 9, isBold: true);

        sY -= 18;
        doc.DrawText($"Lop: {internship.Student?.Class ?? "N/A"}", 55, sY, fontSize: 8.5f);
        doc.DrawText($"Nganh hoc: {RemoveDiacritics(internship.Student?.Major ?? "CNTT")}", 200, sY, fontSize: 8.5f);
        doc.DrawText($"Khoa: Cong nghe Thong tin", 380, sY, fontSize: 8.5f);

        sY -= 18;
        doc.DrawText($"Doanh nghiep thuc tap: {RemoveDiacritics(internship.Company?.CompanyName ?? "Chua cap nhat")}", 55, sY, fontSize: 8.5f, isBold: true);

        sY -= 18;
        doc.DrawText($"Vi tri thuc tap: {RemoveDiacritics(internship.Position ?? "Thuc tap sinh Software Engineer")}", 55, sY, fontSize: 8.5f);
        doc.DrawText($"Thoi gian: {internship.StartDate:dd/MM/yyyy} den {internship.EndDate:dd/MM/yyyy}", 320, sY, fontSize: 8.5f);

        // Section 2: Lecturer evaluation
        sY -= 28;
        doc.DrawFilledRect(45, sY, 505, 18, 0.92f, 0.94f, 0.98f);
        doc.DrawText("II. KET QUA DANH GIA CUA GIANG VIEN HUONG DAN", 52, sY + 5, fontSize: 9, isBold: true);

        sY -= 20;
        doc.DrawText($"Giang vien phu trach: {RemoveDiacritics(internship.Lecturer?.FullName ?? "N/A")} ({internship.Lecturer?.StaffCode ?? ""})", 55, sY, fontSize: 8.5f);

        // Rubric Table
        sY -= 20;
        doc.DrawFilledRect(45, sY, 505, 20, 0.95f, 0.95f, 0.95f);
        doc.DrawRect(45, sY, 505, 20, 1);
        doc.DrawText("Tieu chi danh gia (Rubric)", 60, sY + 6, fontSize: 8.5f, isBold: true);
        doc.DrawText("Trong so", 320, sY + 6, fontSize: 8.5f, isBold: true);
        doc.DrawText("Thang diem", 390, sY + 6, fontSize: 8.5f, isBold: true);
        doc.DrawText("Diem dat duoc", 470, sY + 6, fontSize: 8.5f, isBold: true);

        var criteria = new (string name, string weight, decimal? score)[]
        {
            ("1. Kien thuc chuyen mon & Ky nang ky thuat", "40%", evaluation == null ? null : evaluation.TechnicalScore),
            ("2. Tinh chu dong, y thuc ky luat & Chuyen can", "20%", evaluation == null ? null : evaluation.InitiativeScore),
            ("3. Ky nang lam viec nhom & Giao tiep bao cao", "20%", evaluation == null ? null : evaluation.CommunicationScore),
            ("4. Chat luong san pham & Bao cao tong ket cuoi ky", "20%", evaluation == null ? null : evaluation.TeamworkScore)
        };

        foreach (var cr in criteria)
        {
            sY -= 20;
            doc.DrawRect(45, sY, 505, 20, 0.5f);
            doc.DrawText(cr.name, 55, sY + 6, fontSize: 8);
            doc.DrawText(cr.weight, 335, sY + 6, fontSize: 8);
            doc.DrawText("10.0", 410, sY + 6, fontSize: 8);
            doc.DrawText(cr.score?.ToString("F1") ?? "--", 495, sY + 6, fontSize: 8.5f, isBold: true);
        }

        // Final Score Highlight Box
        sY -= 35;
        doc.DrawFilledRect(45, sY, 505, 30, 0.90f, 0.96f, 0.90f);
        doc.DrawRect(45, sY, 505, 30, 1.2f);
        doc.DrawText("DIEM TONG KET THUC TAP (Thang diem 10):", 65, sY + 10, fontSize: 10, isBold: true);

        var finalScore = evaluation?.FinalGrade;
        string scoreStr = finalScore.HasValue ? finalScore.Value.ToString("F1", CultureInfo.InvariantCulture) : "Chua tong ket";
        doc.DrawText(scoreStr, 380, sY + 8, fontSize: 14, isBold: true);

        string rank = !finalScore.HasValue ? "--"
            : finalScore >= 8.5m ? "XUAT SAC"
            : finalScore >= 7.0m ? "GIOI / KHA"
            : finalScore >= 5.0m ? "TRUNG BINH" : "KHONG DAT";
        doc.DrawText($"({rank})", 445, sY + 10, fontSize: 9.5f, isBold: true);

        // Feedback
        sY -= 40;
        doc.DrawText("Nhan xet tong quat cua Giang vien:", 55, sY, fontSize: 8.5f, isBold: true);
        string comment = RemoveDiacritics(evaluation?.Comments ?? "Sinh vien hoan thanh tot cac yeu cau va nhiem vu duoc giao trong qua trinh thuc tap tai doanh nghiep.");
        doc.DrawText(Truncate(comment, 95), 55, sY - 14, fontSize: 8);

        // Signatures
        float signY = 120;
        doc.DrawText("DAI DIEN DOANH NGHIEP", 70, signY, fontSize: 9.5f, isBold: true);
        doc.DrawText("(Ky ten & Dong dau xac nhan)", 75, signY - 14, fontSize: 8);

        doc.DrawText($"Tp.HCM, ngay {DateTime.UtcNow:dd} thang {DateTime.UtcNow:MM} nam {DateTime.UtcNow:yyyy}", 360, signY + 14, fontSize: 8.5f);
        doc.DrawText("GIANG VIEN HUONG DAN", 380, signY, fontSize: 9.5f, isBold: true);
        doc.DrawText("(Ky va ghi ro ho ten)", 400, signY - 14, fontSize: 8);
        doc.DrawText(RemoveDiacritics(internship.Lecturer?.FullName ?? ""), 380, signY - 60, fontSize: 9.5f, isBold: true);

        return doc.Build();
    }

    private static string Truncate(string val, int max) =>
        string.IsNullOrEmpty(val) ? "" : (val.Length <= max ? val : val[..max] + "...");

    private static string RemoveDiacritics(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        var normalizedString = text.Normalize(NormalizationForm.FormD);
        var stringBuilder = new StringBuilder(capacity: normalizedString.Length);

        foreach (var c in normalizedString)
        {
            var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
            if (unicodeCategory != UnicodeCategory.NonSpacingMark)
            {
                if (c == 'đ' || c == 'Đ') stringBuilder.Append('d');
                else stringBuilder.Append(c);
            }
        }

        return stringBuilder.ToString().Normalize(NormalizationForm.FormC)
            .Replace("đ", "d").Replace("Đ", "D");
    }
}

/// <summary>
/// Lightweight, standards-compliant pure C# PDF 1.4 generation without third-party dependencies.
/// </summary>
internal sealed class SimplePdfDocument
{
    private readonly List<StringBuilder> _pages = new();
    private readonly float _pageWidth;
    private readonly float _pageHeight;

    public SimplePdfDocument(string format = "A4", bool landscape = false)
    {
        float w = 595.28f;
        float h = 841.89f;
        _pageWidth = landscape ? h : w;
        _pageHeight = landscape ? w : h;
    }

    public void AddPage()
    {
        _pages.Add(new StringBuilder());
    }

    private StringBuilder CurrentPage => _pages.Last();

    public void DrawText(string text, float x, float y, float fontSize = 10, bool isBold = false)
    {
        if (string.IsNullOrEmpty(text)) return;
        var escaped = text.Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)");
        var fontKey = isBold ? "/F2" : "/F1";
        CurrentPage.AppendLine($"BT {fontKey} {fontSize.ToString("F1", CultureInfo.InvariantCulture)} Tf 0 0 0 rg {x.ToString("F1", CultureInfo.InvariantCulture)} {y.ToString("F1", CultureInfo.InvariantCulture)} Td ({escaped}) Tj ET");
    }

    public void DrawLine(float x1, float y1, float x2, float y2, float width = 1)
    {
        CurrentPage.AppendLine($"{width.ToString("F1", CultureInfo.InvariantCulture)} w 0.2 0.2 0.2 RG {x1.ToString("F1", CultureInfo.InvariantCulture)} {y1.ToString("F1", CultureInfo.InvariantCulture)} m {x2.ToString("F1", CultureInfo.InvariantCulture)} {y2.ToString("F1", CultureInfo.InvariantCulture)} l S");
    }

    public void DrawRect(float x, float y, float width, float height, float strokeWidth = 1)
    {
        CurrentPage.AppendLine($"{strokeWidth.ToString("F1", CultureInfo.InvariantCulture)} w 0.5 0.5 0.5 RG {x.ToString("F1", CultureInfo.InvariantCulture)} {y.ToString("F1", CultureInfo.InvariantCulture)} {width.ToString("F1", CultureInfo.InvariantCulture)} {height.ToString("F1", CultureInfo.InvariantCulture)} re S");
    }

    public void DrawFilledRect(float x, float y, float width, float height, float r, float g, float b)
    {
        CurrentPage.AppendLine($"{r.ToString("F2", CultureInfo.InvariantCulture)} {g.ToString("F2", CultureInfo.InvariantCulture)} {b.ToString("F2", CultureInfo.InvariantCulture)} rg {x.ToString("F1", CultureInfo.InvariantCulture)} {y.ToString("F1", CultureInfo.InvariantCulture)} {width.ToString("F1", CultureInfo.InvariantCulture)} {height.ToString("F1", CultureInfo.InvariantCulture)} re f");
    }

    public byte[] Build()
    {
        using var ms = new MemoryStream();
        using var writer = new StreamWriter(ms, Encoding.ASCII);

        var offsets = new List<long>();
        void WriteObject(string content)
        {
            writer.Flush();
            offsets.Add(ms.Position);
            writer.WriteLine(content);
        }

        writer.WriteLine("%PDF-1.4");
        writer.WriteLine("%\u00e2\u00e3\u00cf\u00d3");

        // Object 1: Catalog
        WriteObject("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");

        // Pages Kids references
        int pageCount = _pages.Count;
        var kids = new StringBuilder();
        int firstPageObj = 5;
        for (int i = 0; i < pageCount; i++)
        {
            int pageObjNum = firstPageObj + (i * 2);
            kids.Append($"{pageObjNum} 0 R ");
        }

        // Object 2: Pages
        WriteObject($"2 0 obj\n<< /Type /Pages /Kids [ {kids} ] /Count {pageCount} >>\nendobj");

        // Object 3: Font Helvetica Regular
        WriteObject("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj");

        // Object 4: Font Helvetica Bold
        WriteObject("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj");

        // Page and content stream objects
        for (int i = 0; i < pageCount; i++)
        {
            int pageObjNum = firstPageObj + (i * 2);
            int contentObjNum = pageObjNum + 1;
            var streamData = _pages[i].ToString();
            var streamBytes = Encoding.ASCII.GetBytes(streamData);

            WriteObject($"{pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 {_pageWidth.ToString("F2", CultureInfo.InvariantCulture)} {_pageHeight.ToString("F2", CultureInfo.InvariantCulture)} ] /Contents {contentObjNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj");

            WriteObject($"{contentObjNum} 0 obj\n<< /Length {streamBytes.Length} >>\nstream\n{streamData}\nendstream\nendobj");
        }

        writer.Flush();
        long startXref = ms.Position;

        int totalObjects = firstPageObj + (pageCount * 2);
        writer.WriteLine($"xref\n0 {totalObjects}");
        writer.WriteLine("0000000000 65535 f ");
        foreach (var offset in offsets)
        {
            writer.WriteLine($"{offset:D10} 00000 n ");
        }

        writer.WriteLine($"trailer\n<< /Size {totalObjects} /Root 1 0 R >>\nstartxref\n{startXref}\n%%EOF");
        writer.Flush();

        return ms.ToArray();
    }
}
