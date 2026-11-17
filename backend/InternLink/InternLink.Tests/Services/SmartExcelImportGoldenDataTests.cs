using System.Globalization;
using System.Text;
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

public sealed class SmartExcelImportGoldenDataTests
{
    [GoldenImportDataFact]
    public async Task ImportsGoldenWorkbooksInSemesterPreparationOrder()
    {
        await using var db = CreateDb();
        var (cntt, _) = await SeedScopesAsync(db);
        var semester = new Semester
        {
            Name = "Golden Data Test Semester",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            DepartmentId = cntt.PublicId
        };
        db.Semesters.Add(semester);
        db.SysRoles.AddRange(
            new SysRole { Code = nameof(Role.Student), Name = "Sinh viên", IsActive = true },
            new SysRole { Code = nameof(Role.Lecturer), Name = "Giảng viên", IsActive = true });
        await db.SaveChangesAsync();

        using var tempDirectory = new TemporaryTestDirectory();
        var store = new ExcelImportFileStore(tempDirectory.Path);
        var service = new SmartExcelImportService(db, new PasswordHasher<User>(), store);
        var importDirectory = GoldenImportDataFactAttribute.ImportDirectory;

        var students = await StageAsync(service, importDirectory, "danh-sach-SV.xlsx");
        var studentMappings = MapColumns(students.Preview,
        [
            ("StudentCode", true, new[] { "mssv" }),
            ("FullName", true, new[] { "hoten", "hovaten" }),
            ("Email", false, new[] { "email" }),
            ("PhoneNumber", false, new[] { "sdt", "dienthoai" }),
            ("ClassName", false, new[] { "lop" }),
            ("MajorName", false, new[] { "nganh" }),
            ("DepartmentName", false, new[] { "khoa" })
        ]);
        var studentResult = await ImportAsync(
            service, students, "Students", studentMappings, cntt.PublicId);

        var lecturers = await StageAsync(service, importDirectory, "danh-sach-GV.xlsx");
        var lecturerMappings = MapColumns(lecturers.Preview,
        [
            ("StaffCode", true, new[] { "magv" }),
            ("FullName", true, new[] { "hovaten", "hoten" }),
            ("Email", false, new[] { "email" }),
            ("PhoneNumber", false, new[] { "sdt", "dienthoai" }),
            ("DepartmentName", false, new[] { "khoa" })
        ]);
        var lecturerResult = await ImportAsync(
            service, lecturers, "Lecturers", lecturerMappings, cntt.PublicId);

        var companies = await StageAsync(service, importDirectory, "danh-sach-doanh-nghiep.xlsx");
        var companyMappings = MapColumns(companies.Preview,
        [
            ("CompanyCode", false, new[] { "madn" }),
            ("CompanyName", true, new[] { "tencongty", "tendoanhnghiep" }),
            ("Industry", false, new[] { "nganh" }),
            ("ContactPerson", false, new[] { "nguoilienhe" }),
            ("ContactEmail", false, new[] { "email" }),
            ("ContactPhone", false, new[] { "sdt", "dienthoai" }),
            ("Address", false, new[] { "diachi" }),
            ("Website", false, new[] { "website" })
        ]);
        var companyResult = await ImportAsync(
            service, companies, "Companies", companyMappings, cntt.PublicId);

        var assignments = await StageAsync(service, importDirectory, "danh-sach-phan-cong-GVHD.xlsx");
        var assignmentMappings = MapColumns(assignments.Preview,
        [
            ("StudentCode", true, new[] { "mssv" }),
            ("StaffCode", false, new[] { "magv" })
        ]).ToList();
        assignmentMappings.Add(new ExcelColumnMappingDto(
            "SemesterId",
            "SemesterId",
            assignments.Preview.Columns.Max(column => column.ExcelColumnIndex) + 10,
            true,
            semester.PublicId.ToString(),
            "TRIM"));
        var assignmentResult = await ImportAsync(
            service, assignments, "InternshipAssignments", assignmentMappings, cntt.PublicId);

        studentResult.TotalProcessed.Should().BePositive();
        lecturerResult.TotalProcessed.Should().BePositive();
        companyResult.TotalProcessed.Should().BePositive();
        assignmentResult.TotalProcessed.Should().BePositive();
        assignmentResult.ErrorCount.Should().Be(0);

        (await db.Students.CountAsync()).Should().Be(studentResult.SuccessCount);
        (await db.Lecturers.CountAsync()).Should().Be(lecturerResult.SuccessCount);
        (await db.Companies.CountAsync()).Should().Be(companyResult.SuccessCount);
        (await db.Internships.CountAsync()).Should().Be(assignmentResult.SuccessCount);
        (await db.Internships.AllAsync(item =>
            item.SemesterId == semester.PublicId
            && item.Student.DepartmentId == cntt.PublicId
            && item.Lecturer != null
            && item.Lecturer.DepartmentId == cntt.PublicId)).Should().BeTrue();

        (await db.Students.AllAsync(item => item.DepartmentId == cntt.PublicId)).Should().BeTrue();
        (await db.Lecturers.AllAsync(item => item.DepartmentId == cntt.PublicId && item.UserId != null)).Should().BeTrue();
        (await db.Companies.AllAsync(item => item.DepartmentId == cntt.PublicId)).Should().BeTrue();
        (await db.SysUserRoles.CountAsync(item => item.Role.Code == nameof(Role.Lecturer)))
            .Should().Be(lecturerResult.SuccessCount);
    }

    [Fact]
    public async Task DepartmentAdminCannotValidateAnotherDepartmentsStagedWorkbook()
    {
        await using var db = CreateDb();
        var (cntt, otherDepartment) = await SeedScopesAsync(db);
        db.SysRoles.Add(new SysRole { Code = nameof(Role.Student), Name = "Sinh viên", IsActive = true });
        await db.SaveChangesAsync();

        using var tempDirectory = new TemporaryTestDirectory();
        var service = new SmartExcelImportService(
            db,
            new PasswordHasher<User>(),
            new ExcelImportFileStore(tempDirectory.Path));
        var staged = await StageSyntheticStudentAsync(service, cntt.PublicId, "admin-cntt");
        var mappings = MapColumns(staged.Preview,
        [
            ("StudentCode", true, new[] { "mssv" }),
            ("FullName", true, new[] { "hoten" })
        ]);
        var otherDepartmentRequest = new ExcelImportRequest(
            staged.FileId,
            new ExcelImportMappingConfig(
                "Students",
                staged.Preview.HeaderRowIndex + 2,
                otherDepartment.PublicId,
                null,
                staged.Preview.SelectedSheetName,
                mappings));

        var act = () => service.ValidateImportAsync(
            otherDepartmentRequest,
            "admin-other-faculty",
            otherDepartment.PublicId,
            null,
            CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();

        var actualDepartmentRequest = otherDepartmentRequest with
        {
            MappingConfig = otherDepartmentRequest.MappingConfig with { DepartmentId = cntt.PublicId }
        };
        var result = await ImportAsync(
            service, staged, "Students", mappings, cntt.PublicId, actualDepartmentRequest: actualDepartmentRequest);

        result.SuccessCount.Should().Be(1);
        (await db.Students.SingleAsync()).DepartmentId.Should().Be(cntt.PublicId);
        (await db.Students.CountAsync(item => item.DepartmentId == otherDepartment.PublicId)).Should().Be(0);
    }

    private static async Task<ImportCommitResult> ImportAsync(
        SmartExcelImportService service,
        StagedExcelPreviewResponse staged,
        string targetEntity,
        IReadOnlyList<ExcelColumnMappingDto> mappings,
        Guid departmentId,
        ExcelImportRequest? actualDepartmentRequest = null)
    {
        var request = actualDepartmentRequest ?? new ExcelImportRequest(
            staged.FileId,
            new ExcelImportMappingConfig(
                targetEntity,
                staged.Preview.HeaderRowIndex + 2,
                departmentId,
                null,
                staged.Preview.SelectedSheetName,
                mappings));
        var validation = await service.ValidateImportAsync(
            request, "admin-cntt", departmentId, null, CancellationToken.None);
        validation.IsValid.Should().BeTrue(
            string.Join("; ", validation.Errors.Select(issue => $"row {issue.RowIndex} {issue.FieldCode}: {issue.ErrorMessage}")));

        return await service.ExecuteImportAsync(
            new ExecuteExcelImportRequest(request.FileId, request.MappingConfig, true),
            "admin-cntt",
            departmentId,
            null,
            "admin-cntt",
            CancellationToken.None);
    }

    private static async Task<StagedExcelPreviewResponse> StageAsync(
        SmartExcelImportService service,
        string importDirectory,
        string fileName)
    {
        await using var stream = File.OpenRead(Path.Combine(importDirectory, fileName));
        return await service.StageAndAnalyzeExcelAsync(
            stream, fileName, null, "admin-cntt", GetDepartmentId("CNTT"), null, CancellationToken.None);
    }

    private static async Task<StagedExcelPreviewResponse> StageSyntheticStudentAsync(
        SmartExcelImportService service,
        Guid departmentId,
        string ownerKey)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.AddWorksheet("Students");
        sheet.Cell(1, 1).Value = "MSSV";
        sheet.Cell(1, 2).Value = "HoTen";
        sheet.Cell(2, 1).Value = "GOLDEN-001";
        sheet.Cell(2, 2).Value = "Golden Student";
        await using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        return await service.StageAndAnalyzeExcelAsync(
            stream, "students.xlsx", "Students", ownerKey, departmentId, null, CancellationToken.None);
    }

    private static IReadOnlyList<ExcelColumnMappingDto> MapColumns(
        ExcelPreviewResponse preview,
        IReadOnlyList<(string SystemField, bool Required, string[] Aliases)> definitions) =>
        definitions.Select(definition =>
        {
            var column = preview.Columns.SingleOrDefault(item =>
                definition.Aliases.Contains(Normalize(item.ExcelColumnName), StringComparer.Ordinal));
            if (column == null && definition.Required)
                throw new InvalidDataException(
                    $"Required golden-data field '{definition.SystemField}' was not found in sheet '{preview.SelectedSheetName}'.");
            return column == null
                ? null
                : new ExcelColumnMappingDto(
                    definition.SystemField,
                    column.ExcelColumnName,
                    column.ExcelColumnIndex,
                    definition.Required,
                    null,
                    "TRIM");
        })
        .Where(mapping => mapping != null)
        .Select(mapping => mapping!)
        .ToArray();

    private static string Normalize(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
                continue;
            builder.Append(character is 'đ' or 'Đ' ? 'd' : char.ToLowerInvariant(character));
        }
        return new string(builder.ToString().Where(char.IsLetterOrDigit).ToArray());
    }

    private static Guid GetDepartmentId(string code) =>
        code == "CNTT" ? GoldenImportIds.CnttDepartmentId : GoldenImportIds.OtherDepartmentId;

    private static async Task<(Department Cntt, Department Other)> SeedScopesAsync(AppDbContext db)
    {
        var cntt = new Department
        {
            PublicId = GoldenImportIds.CnttDepartmentId,
            Code = "CNTT",
            Name = "Công nghệ thông tin"
        };
        var other = new Department
        {
            PublicId = GoldenImportIds.OtherDepartmentId,
            Code = "OTHER",
            Name = "Khoa khác"
        };
        db.Departments.AddRange(cntt, other);
        await db.SaveChangesAsync();
        return (cntt, other);
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static class GoldenImportIds
    {
        public static readonly Guid CnttDepartmentId = Guid.NewGuid();
        public static readonly Guid OtherDepartmentId = Guid.NewGuid();
    }
}

internal sealed class TemporaryTestDirectory : IDisposable
{
    public string Path { get; } =
        System.IO.Path.Combine(System.IO.Path.GetTempPath(), "InternLinkGoldenTests", Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(Path))
            Directory.Delete(Path, recursive: true);
    }
}

public sealed class GoldenImportDataFactAttribute : FactAttribute
{
    private static readonly string[] RequiredFiles =
    [
        "danh-sach-SV.xlsx",
        "danh-sach-GV.xlsx",
        "danh-sach-doanh-nghiep.xlsx",
        "danh-sach-phan-cong-GVHD.xlsx"
    ];

    public static string ImportDirectory =>
        Environment.GetEnvironmentVariable("INTERNLINK_C24ATH_IMPORT_DIR")
        ?? @"E:\Downloads\TTTN_C24ATH\Import";

    public GoldenImportDataFactAttribute()
    {
        if (RequiredFiles.Any(file => !File.Exists(Path.Combine(ImportDirectory, file))))
            Skip = "The complete C24ATH golden workbook set is not available.";
    }
}
