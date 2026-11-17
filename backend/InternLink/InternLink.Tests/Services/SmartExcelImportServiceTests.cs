using ClosedXML.Excel;
using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit.Sdk;

namespace InternLink.Tests.Services;

public class SmartExcelImportServiceTests
{
    [Fact]
    public async Task AnalyzeExcelAsync_DetectsHeaderAfterPreambleAndLimitsSamplesToFiveRows()
    {
        using var db = CreateDb();
        var service = new SmartExcelImportService(db);
        using var workbook = new XLWorkbook();
        var sheet = workbook.AddWorksheet("Students");
        sheet.Cell(1, 1).Value = "Danh sách sinh viên thực tập";
        sheet.Cell(3, 1).Value = "MSSV";
        sheet.Cell(3, 2).Value = "Họ tên";
        for (var index = 0; index < 7; index++)
        {
            sheet.Cell(index + 4, 1).Value = $"SV{index + 1}";
            sheet.Cell(index + 4, 2).Value = $"Sinh viên {index + 1}";
        }
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;

        var result = await service.AnalyzeExcelAsync(stream, "students.xlsx", null, CancellationToken.None);

        result.SelectedSheetName.Should().Be("Students");
        result.HeaderRowIndex.Should().Be(2);
        result.TotalRows.Should().Be(7);
        result.Columns.Select(column => column.ExcelColumnName).Should().Equal("MSSV", "Họ tên");
        result.SampleRows.Should().HaveCount(5);
        result.SampleRows[0]["MSSV"].Should().Be("SV1");
    }

    [Fact]
    public async Task AnalyzeExcelAsync_RejectsMissingRequestedSheet()
    {
        using var db = CreateDb();
        var service = new SmartExcelImportService(db);
        using var workbook = new XLWorkbook();
        workbook.AddWorksheet("Students").Cell(1, 1).Value = "MSSV";
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;

        var act = () => service.AnalyzeExcelAsync(stream, "students.xlsx", "Lecturers", CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task AnalyzeExcelAsync_SelectsRequestedSheetAndReturnsAllSheetNames()
    {
        using var db = CreateDb();
        var service = new SmartExcelImportService(db);
        using var workbook = new XLWorkbook();
        workbook.AddWorksheet("Cover").Cell(1, 1).Value = "Roster";
        var roster = workbook.AddWorksheet("Roster");
        roster.Cell(1, 1).Value = "MSSV";
        roster.Cell(1, 2).Value = "Họ tên";
        roster.Cell(2, 1).Value = "SV1";
        roster.Cell(2, 2).Value = "Sinh viên 1";
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;

        var result = await service.AnalyzeExcelAsync(
            stream, "students.xlsx", "roster", CancellationToken.None);

        result.SheetNames.Should().Equal("Cover", "Roster");
        result.SelectedSheetName.Should().Be("Roster");
        result.TotalRows.Should().Be(1);
    }

    [Fact]
    public async Task SavePresetAsync_PersistsMappingsAndRejectsDuplicateScopedCode()
    {
        using var db = CreateDb();
        var departmentId = Guid.NewGuid();
        db.Departments.Add(new Department
        {
            PublicId = departmentId,
            Code = "CNTT",
            Name = "Khoa Công nghệ Thông tin"
        });
        await db.SaveChangesAsync();
        var service = new SmartExcelImportService(db);
        var request = new SaveExcelPresetRequest
        {
            MappingCode = " sv_cntt ",
            MappingName = "Mẫu sinh viên CNTT",
            TargetEntity = "Students",
            DepartmentId = departmentId,
            Mappings =
            [
                new ExcelColumnMappingDto("StudentCode", "MSSV", 0, true, null, "TRIM"),
                new ExcelColumnMappingDto("FullName", "Họ tên", 1, true, null, "TRIM")
            ]
        };

        var saved = await service.SavePresetAsync(request, departmentId, null, "admin", CancellationToken.None);
        var presets = await service.GetPresetsAsync(departmentId, null, CancellationToken.None);

        saved.MappingCode.Should().Be("SV_CNTT");
        saved.DepartmentId.Should().Be(departmentId);
        saved.Mappings.Should().HaveCount(2);
        presets.Should().ContainSingle().Which.Id.Should().Be(saved.Id);
        var duplicate = () => service.SavePresetAsync(
            request, departmentId, null, "admin", CancellationToken.None);
        await duplicate.Should().ThrowAsync<InvalidOperationException>();
    }

    [C24AthFixtureFact]
    public async Task AnalyzeExcelAsync_ReadsTheC24AthStudentWorkbook()
    {
        var path = C24AthFixtureFactAttribute.WorkbookPath;
        using var db = CreateDb();
        var service = new SmartExcelImportService(db);
        await using var stream = File.OpenRead(path);

        var result = await service.AnalyzeExcelAsync(
            stream, Path.GetFileName(path), null, CancellationToken.None);

        result.SheetNames.Should().NotBeEmpty();
        result.Columns.Should().NotBeEmpty();
        result.TotalRows.Should().BePositive();
        result.SampleRows.Should().HaveCount(Math.Min(5, result.TotalRows));
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }
}

public sealed class C24AthFixtureFactAttribute : FactAttribute
{
    public static string WorkbookPath =>
        Environment.GetEnvironmentVariable("INTERNLINK_C24ATH_STUDENT_XLSX")
        ?? @"E:\Downloads\TTTN_C24ATH\Import\danh-sach-SV.xlsx";

    public C24AthFixtureFactAttribute()
    {
        if (!File.Exists(WorkbookPath))
            Skip = "The local C24ATH workbook fixture is not available.";
    }
}
