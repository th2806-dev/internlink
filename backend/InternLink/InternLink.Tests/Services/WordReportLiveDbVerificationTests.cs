using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using FluentAssertions;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using Xunit.Abstractions;

namespace InternLink.Tests.Services;

public class WordReportLiveDbVerificationTests
{
    private readonly ITestOutputHelper _output;

    public WordReportLiveDbVerificationTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task VerifyWordReportAgainstLiveDb()
    {
        var connStr = "Server=127.0.0.1;Database=InternLink;User Id=sa;Password=sa;TrustServerCertificate=True;MultipleActiveResultSets=true;Connect Timeout=15";
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(connStr)
            .Options;

        await using var db = new AppDbContext(options);

        // Find the C24 semester
        var semester = await db.Semesters.FirstOrDefaultAsync(s => s.Name.Contains("C24"));
        semester.Should().NotBeNull("C24 semester must exist in restored DB");
        var semesterId = semester!.Id;
        _output.WriteLine($"Semester: {semester.Name} ({semesterId})");

        var reportService = new InternshipReportService(db);
        var semesterService = new SemesterService(db);
        var gradingService = new InternshipGradingService(db, NullLogger<InternshipGradingService>.Instance, semesterService);

        // 1. Get grading summary
        var summary = await gradingService.GetSummaryAsync(semesterId, null, null, null);
        _output.WriteLine($"=== GRADING SUMMARY ===");
        _output.WriteLine($"TotalStudentCount: {summary.TotalStudentCount}, NotInterning: {summary.NotInterningStudentCount}, Students: {summary.Students.Count}");
        foreach (var s in summary.Students)
        {
            _output.WriteLine($"  {s.StudentCode} | {s.FullName} | QT: {s.ProcessScore} | Thi: {s.OralExamScore} | TB: {s.AverageScore} | XL: {s.Classification} | ĐK: {s.IsEligible} | Cty: {s.CompanyName}");
        }

        // 2. Export Word report
        var docxBytes = await reportService.ExportC22AWordReportAsync(semesterId, null, null, null);
        docxBytes.Should().NotBeNull();
        docxBytes.Length.Should().BeGreaterThan(0);

        // 3. Inspect Word document tables
        using var stream = new MemoryStream(docxBytes);
        using var doc = WordprocessingDocument.Open(stream, false);
        var body = doc.MainDocumentPart!.Document.Body!;

        _output.WriteLine($"=== WORD DOCUMENT STATS TABLE ===");
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

        statsTable.Should().NotBeNull("Grade statistics table must be found in Word report");
        foreach (var row in statsTable!.Descendants<TableRow>())
        {
            var cells = row.Descendants<TableCell>().Select(c => string.Concat(c.Descendants<Text>().Select(t => t.Text)).Trim()).ToList();
            _output.WriteLine($"  Row: {string.Join(" | ", cells)}");
        }
    }
}
