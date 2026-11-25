using System.IO.Compression;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Entities.System;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace InternLink.Tests.Services;

public sealed class SystemTenantExportServiceTests
{
    [Fact]
    public async Task ExportAsync_IncludesOnlyTenantAcademicDataAndArchivesLocalEvidence()
    {
        var root = Path.Combine(Path.GetTempPath(), $"tenant-export-test-{Guid.NewGuid():N}");
        var webRoot = Path.Combine(root, "wwwroot");
        var relativeFile = Path.Combine("documents", "report.txt");
        var physicalFile = Path.Combine(webRoot, relativeFile);
        var outsideFile = Path.Combine(root, "outside.txt");
        Directory.CreateDirectory(Path.GetDirectoryName(physicalFile)!);
        await File.WriteAllTextAsync(physicalFile, "tenant evidence");
        await File.WriteAllTextAsync(outsideFile, "outside secret");

        try
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            var tenantContext = new ScopedTenantContext();
            tenantContext.SetTenantId(SysTenant.DefaultTenantId);
            tenantContext.SetPlatformAdmin(true);
            await using var db = new AppDbContext(options, tenantContext);

            var systemTenant = new SysTenant
            {
                PublicId = SysTenant.DefaultTenantId,
                TenantCode = "PLATFORM",
                Name = "Platform",
                LegalName = "Platform",
                Subdomain = "platform"
            };
            var tenant = new SysTenant
            {
                TenantCode = "CAMPUS-A",
                Name = "Campus A",
                LegalName = "Campus A University",
                Subdomain = "campus-a"
            };
            var otherTenant = new SysTenant
            {
                TenantCode = "CAMPUS-B",
                Name = "Campus B",
                LegalName = "Campus B University",
                Subdomain = "campus-b"
            };
            var actor = new User
            {
                TenantId = SysTenant.DefaultTenantId,
                Username = "platform-admin",
                PasswordHash = "not-exported",
                Role = Role.SuperAdmin
            };
            var student = new Student
            {
                TenantId = tenant.PublicId,
                StudentCode = "A001",
                FullName = "=HYPERLINK(\"https://example.invalid\")",
                ResumeUrl = "https://example.invalid/path/resume.pdf?access_token=secret-value"
            };
            var otherStudent = new Student
            {
                TenantId = otherTenant.PublicId,
                StudentCode = "B001",
                FullName = "Other campus student"
            };
            var internship = new Internship
            {
                TenantId = tenant.PublicId,
                StudentId = student.PublicId,
                Student = student,
                Position = "Intern"
            };
            var evaluation = new Evaluation
            {
                TenantId = tenant.PublicId,
                InternshipId = internship.PublicId,
                Internship = internship,
                FinalGrade = 8.5m,
                IsFinalized = true
            };
            var document = new Document
            {
                TenantId = tenant.PublicId,
                Title = "Báo cáo minh chứng",
                FileName = "report.txt",
                FilePath = relativeFile,
                FileSize = new FileInfo(physicalFile).Length,
                MimeType = "text/plain"
            };
            var traversalDocument = new Document
            {
                TenantId = tenant.PublicId,
                Title = "Invalid path",
                FileName = "outside.txt",
                FilePath = Path.Combine("..", "outside.txt"),
                FileSize = new FileInfo(outsideFile).Length,
                MimeType = "text/plain"
            };
            var actorId = actor.PublicId;
            var tenantId = tenant.PublicId;

            db.SysTenants.AddRange(systemTenant, tenant, otherTenant);
            db.Users.Add(actor);
            db.Students.AddRange(student, otherStudent);
            db.Internships.Add(internship);
            db.Evaluations.Add(evaluation);
            db.Documents.AddRange(document, traversalDocument);
            await db.SaveChangesAsync();

            var environment = new Mock<IWebHostEnvironment>();
            environment.Setup(item => item.WebRootPath).Returns(webRoot);
            environment.Setup(item => item.ContentRootPath).Returns(root);
            var service = new SystemTenantExportService(db, environment.Object);

            var export = await service.ExportAsync(tenantId, actorId, "127.0.0.1", CancellationToken.None);

            Assert.NotNull(export);
            await using (export.Content)
            using (var archive = new ZipArchive(export.Content, ZipArchiveMode.Read, leaveOpen: true))
            {
                var studentCsv = await ReadEntryAsync(archive, "data/students.csv");
                Assert.Contains("'=HYPERLINK", studentCsv, StringComparison.Ordinal);
                var workbookEntry = Assert.Single(archive.Entries, item =>
                    item.FullName == "data/academic-records.xlsx");
                await using var workbookBytes = new MemoryStream();
                await using (var workbookStream = workbookEntry.Open())
                    await workbookStream.CopyToAsync(workbookBytes);
                workbookBytes.Position = 0;
                using var workbook = new XLWorkbook(workbookBytes);
                var studentSheet = workbook.Worksheet("Sinh viên");
                Assert.Equal("DANH SÁCH SINH VIÊN", studentSheet.Cell(1, 1).GetString());
                Assert.Equal("A001", studentSheet.Cell(5, 1).GetString());
                Assert.Equal("=HYPERLINK(\"https://example.invalid\")", studentSheet.Cell(5, 2).GetString());
                Assert.False(studentSheet.Cell(5, 2).HasFormula);
                Assert.Equal("Arial", studentSheet.Cell(5, 2).Style.Font.FontName);
                Assert.Equal(13, studentSheet.Cell(5, 2).Style.Font.FontSize);
                Assert.Equal("Students", Assert.Single(studentSheet.Tables).Name);
                Assert.Equal(8.5, workbook.Worksheet("Đánh giá").Cell(5, 7).GetDouble());

                var studentData = await ReadEntryAsync(archive, "data/students.json");
                Assert.Contains("A001", studentData, StringComparison.Ordinal);
                Assert.DoesNotContain("B001", studentData, StringComparison.Ordinal);
                Assert.Contains("data/evaluations.json", archive.Entries.Select(item => item.FullName));
                Assert.Contains("data/semesters.json", archive.Entries.Select(item => item.FullName));

                var evidenceEntry = Assert.Single(archive.Entries, item =>
                    item.FullName.StartsWith("files/documents/", StringComparison.Ordinal));
                Assert.Equal("tenant evidence", await ReadEntryAsync(archive, evidenceEntry.FullName));

                var manifest = await ReadEntryAsync(archive, "manifest.json");
                using var manifestJson = JsonDocument.Parse(manifest);
                Assert.Equal(1, manifestJson.RootElement.GetProperty("formatVersion").GetInt32());
                Assert.Equal("CAMPUS-A", manifestJson.RootElement
                    .GetProperty("tenant").GetProperty("tenantCode").GetString());
                Assert.Equal("data/academic-records.xlsx", manifestJson.RootElement
                    .GetProperty("presentationWorkbook").GetString());
                Assert.Equal(2, manifestJson.RootElement.GetProperty("files")
                    .GetProperty("unavailableOrExternalCount").GetInt32());
                Assert.DoesNotContain("secret-value", manifest, StringComparison.Ordinal);
                Assert.Contains("data/attendance-records.json", manifestJson.RootElement
                    .GetProperty("datasets").EnumerateObject().Select(item => item.Name));
            }

            var audit = await db.SysAuditLogs.IgnoreQueryFilters()
                .SingleAsync(item => item.FunctionCode == "TENANTS.EXPORT");
            Assert.Equal(tenantId.ToString(), audit.RecordId);
            Assert.Equal(actorId, audit.UserId);
            Assert.Contains("archivedFileCount", audit.NewValuesJson, StringComparison.Ordinal);
        }
        finally
        {
            if (Directory.Exists(root))
                Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task ExportAsync_ReturnsNullForUnknownTenant()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var tenantContext = new ScopedTenantContext();
        tenantContext.SetTenantId(SysTenant.DefaultTenantId);
        tenantContext.SetPlatformAdmin(true);
        await using var db = new AppDbContext(options, tenantContext);
        var environment = new Mock<IWebHostEnvironment>();
        environment.Setup(item => item.WebRootPath).Returns(Path.GetTempPath());
        environment.Setup(item => item.ContentRootPath).Returns(Path.GetTempPath());
        var service = new SystemTenantExportService(db, environment.Object);

        var result = await service.ExportAsync(Guid.NewGuid(), Guid.NewGuid(), null, CancellationToken.None);

        Assert.Null(result);
    }

    private static async Task<string> ReadEntryAsync(ZipArchive archive, string entryName)
    {
        var entry = Assert.Single(archive.Entries, item => item.FullName == entryName);
        await using var stream = entry.Open();
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return await reader.ReadToEndAsync();
    }
}
