using ClosedXML.Excel;
using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Identity;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
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

    [Fact]
    public async Task ValidateImportAsync_ClassifiesExistingStudentAsUpsertWarning()
    {
        await using var db = CreateDb();
        db.Students.Add(new Student { StudentCode = "SV001", FullName = "Old Name", Email = "sv001@example.edu.vn" });
        await db.SaveChangesAsync();
        var (service, request) = await StageStudentsAsync(db, "SV001", "New Name", "sv001@example.edu.vn");

        var result = await service.ValidateImportAsync(request, "admin", null, null, CancellationToken.None);

        result.WarningRecordsCount.Should().Be(1);
        result.ErrorRecordsCount.Should().Be(0);
        result.Rows.Should().ContainSingle().Which.Status.Should().Be("Warning");
        result.Rows[0].Issues.Should().Contain(issue => issue.Severity == "Warning");
    }

    [Fact]
    public async Task ValidateImportAsync_ReportsInvalidEmailAsRowError()
    {
        await using var db = CreateDb();
        var (service, request) = await StageStudentsAsync(db, "SV001", "Student One", "not-an-email");

        var result = await service.ValidateImportAsync(request, "admin", null, null, CancellationToken.None);

        result.IsValid.Should().BeFalse();
        result.ErrorRecordsCount.Should().Be(1);
        result.Errors.Should().ContainSingle(issue => issue.FieldCode == "Email" && issue.RowIndex == 2);
        result.ErrorReportId.Should().NotBeNull();
        var report = await service.GetErrorReportAsync(
            result.ErrorReportId!.Value, "admin", null, null, CancellationToken.None);
        report.Should().NotBeNull();
        using var workbook = new XLWorkbook(report!.FilePath);
        var sheet = workbook.Worksheet("Students");
        sheet.Cell(1, 5).GetString().Should().Be("Kết quả");
        sheet.Cell(2, 1).GetString().Should().Be("SV001");
        sheet.Cell(2, 5).GetString().Should().Contain("Email: Email không đúng định dạng.");
    }

    [Fact]
    public async Task ValidateImportAsync_ReportsMissingDepartmentForeignKey()
    {
        await using var db = CreateDb();
        var (service, request) = await StageStudentsAsync(
            db, "SV001", "Student One", "student@example.edu.vn", "NO_SUCH_DEPARTMENT");

        var result = await service.ValidateImportAsync(request, "admin", null, null, CancellationToken.None);

        result.ErrorRecordsCount.Should().Be(1);
        result.Errors.Should().Contain(issue => issue.FieldCode == "DepartmentCode");
    }

    [Fact]
    public async Task ValidateImportAsync_SkipsRowsWithOnlyUnmappedSequenceNumbers()
    {
        await using var db = CreateDb();
        using var tempDirectory = new TemporaryTestDirectory();
        var service = new SmartExcelImportService(
            db, new PasswordHasher<User>(), new ExcelImportFileStore(tempDirectory.Path));
        using var workbook = new XLWorkbook();
        var sheet = workbook.AddWorksheet("Students");
        sheet.Cell(1, 1).Value = "STT";
        sheet.Cell(1, 2).Value = "MSSV";
        sheet.Cell(1, 3).Value = "Họ tên";
        sheet.Cell(2, 1).Value = 1;
        sheet.Cell(3, 1).Value = 2;
        sheet.Cell(3, 2).Value = "SV001";
        sheet.Cell(3, 3).Value = "Student One";
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        var staged = await service.StageAndAnalyzeExcelAsync(
            stream, "students.xlsx", "Students", "admin", null, null, CancellationToken.None);
        var request = new ExcelImportRequest(
            staged.FileId,
            new ExcelImportMappingConfig(
                "Students",
                2,
                null,
                null,
                "Students",
                [
                    new ExcelColumnMappingDto("StudentCode", "MSSV", 1, true, null, "TRIM"),
                    new ExcelColumnMappingDto("FullName", "Họ tên", 2, true, null, "TRIM")
                ]));

        var result = await service.ValidateImportAsync(
            request, "admin", null, null, CancellationToken.None);

        result.TotalRecords.Should().Be(1);
        result.Rows.Should().ContainSingle().Which.RowIndex.Should().Be(3);
        result.ErrorRecordsCount.Should().Be(0);
    }

    [Fact]
    public async Task ExecuteImportAsync_UpsertsStudentAndCreatesHashedStudentAccountAndRole()
    {
        await using var db = CreateDb();
        db.Students.Add(new Student { StudentCode = "SV001", FullName = "Old Name" });
        db.SysRoles.Add(new SysRole { Code = nameof(Role.Student), Name = "Sinh viên", IsActive = true });
        await db.SaveChangesAsync();
        var (service, request) = await StageStudentsAsync(db, "SV001", "Updated Name", "sv001@example.edu.vn");
        var executeRequest = new ExecuteExcelImportRequest(
            request.FileId, request.MappingConfig, ConfirmImport: true);

        var result = await service.ExecuteImportAsync(
            executeRequest, "admin", null, null, "admin", CancellationToken.None);

        result.TotalProcessed.Should().Be(1);
        result.SuccessCount.Should().Be(0);
        result.UpdatedCount.Should().Be(1);
        var student = await db.Students.SingleAsync();
        student.FullName.Should().Be("Updated Name");
        student.UserId.Should().NotBeNull();
        var account = await db.Users.SingleAsync();
        account.MustChangePassword.Should().BeTrue();
        account.PasswordHash.Should().NotBe("sv001@example.edu.vn");
        new PasswordHasher<User>().VerifyHashedPassword(account, account.PasswordHash, "sv001@example.edu.vn")
            .Should().Be(PasswordVerificationResult.Failed);
        (await db.SysUsers.CountAsync()).Should().Be(1);
        (await db.SysUserRoles.CountAsync()).Should().Be(1);
    }

    [C24AthFixtureFact]
    public async Task ExecuteImportAsync_ValidatesAndImportsTheC24AthStudentWorkbook()
    {
        var path = C24AthFixtureFactAttribute.WorkbookPath;
        using var db = CreateDb();
        db.SysRoles.Add(new SysRole { Code = nameof(Role.Student), Name = "Sinh viên", IsActive = true });
        await db.SaveChangesAsync();
        var service = new SmartExcelImportService(
            db,
            new PasswordHasher<User>(),
            new ExcelImportFileStore(Path.Combine(Path.GetTempPath(), "InternLinkTests", Guid.NewGuid().ToString("N"))));
        await using var stream = File.OpenRead(path);

        var staged = await service.StageAndAnalyzeExcelAsync(
            stream, Path.GetFileName(path), "Students", "admin", null, null, CancellationToken.None);

        staged.Preview.SheetNames.Should().Contain("Students");
        staged.Preview.TotalRows.Should().BePositive();
        var studentCodeColumn = staged.Preview.Columns.Single(column => column.ExcelColumnName == "MSSV");
        var fullNameColumn = staged.Preview.Columns.Single(column => column.ExcelColumnName == "HoTen");
        var mappings = new[]
        {
            studentCodeColumn with { SystemFieldCode = "StudentCode", IsRequired = true },
            fullNameColumn with { SystemFieldCode = "FullName", IsRequired = true }
        };
        var mappingConfig = new ExcelImportMappingConfig(
            "Students",
            staged.Preview.HeaderRowIndex + 2,
            null,
            null,
            staged.Preview.SelectedSheetName,
            mappings);
        var request = new ExcelImportRequest(staged.FileId, mappingConfig);

        var validation = await service.ValidateImportAsync(
            request, "admin", null, null, CancellationToken.None);
        validation.ErrorRecordsCount.Should().Be(0);
        validation.TotalRecords.Should().Be(staged.Preview.TotalRows);

        var result = await service.ExecuteImportAsync(
            new ExecuteExcelImportRequest(staged.FileId, mappingConfig, true),
            "admin", null, null, "admin", CancellationToken.None);

        result.TotalProcessed.Should().Be(staged.Preview.TotalRows);
        result.SuccessCount.Should().Be(staged.Preview.TotalRows);
        result.ErrorCount.Should().Be(0);
        (await db.Students.CountAsync()).Should().Be(staged.Preview.TotalRows);
        (await db.SysUserRoles.CountAsync()).Should().Be(staged.Preview.TotalRows);
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<(SmartExcelImportService Service, ExcelImportRequest Request)> StageStudentsAsync(
        AppDbContext db,
        string studentCode,
        string fullName,
        string email,
        string? departmentCode = null)
    {
        var fileStore = new ExcelImportFileStore(Path.Combine(Path.GetTempPath(), "InternLinkTests", Guid.NewGuid().ToString("N")));
        var service = new SmartExcelImportService(db, new PasswordHasher<User>(), fileStore);
        using var workbook = new XLWorkbook();
        var sheet = workbook.AddWorksheet("Students");
        sheet.Cell(1, 1).Value = "MSSV";
        sheet.Cell(1, 2).Value = "Họ tên";
        sheet.Cell(1, 3).Value = "Email";
        sheet.Cell(1, 4).Value = "Mã khoa";
        sheet.Cell(2, 1).Value = studentCode;
        sheet.Cell(2, 2).Value = fullName;
        sheet.Cell(2, 3).Value = email;
        sheet.Cell(2, 4).Value = departmentCode;
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        var staged = await service.StageAndAnalyzeExcelAsync(
            stream, "students.xlsx", "Students", "admin", null, null, CancellationToken.None);
        var mapping = new List<ExcelColumnMappingDto>
        {
            new("StudentCode", "MSSV", 0, true, null, "TRIM"),
            new("FullName", "Họ tên", 1, true, null, "TRIM"),
            new("Email", "Email", 2, false, null, "TRIM")
        };
        if (departmentCode != null)
            mapping.Add(new ExcelColumnMappingDto("DepartmentCode", "Mã khoa", 3, false, null, "TRIM"));

        return (service, new ExcelImportRequest(
            staged.FileId,
            new ExcelImportMappingConfig(
                "Students", 2, null, null, "Students", mapping)));
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
