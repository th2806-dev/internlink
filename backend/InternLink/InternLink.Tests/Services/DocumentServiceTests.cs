using AutoMapper;
using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Application.Mappings;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternLink.Tests.Services;

public class DocumentServiceTests
{
    private readonly IMapper _mapper;

    public DocumentServiceTests()
    {
        var config = new MapperConfiguration(cfg =>
        {
            cfg.AddProfile<DocumentProfile>();
            cfg.AddProfile<LecturerProfile>();
        });
        _mapper = config.CreateMapper();
    }

    private static AppDbContext GetDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private DocumentService CreateService(AppDbContext db)
    {
        var envMock = new Mock<IWebHostEnvironment>();
        envMock.Setup(e => e.ContentRootPath).Returns(AppDomain.CurrentDomain.BaseDirectory);

        return new DocumentService(db, _mapper, envMock.Object);
    }

    private static async Task<(User StudentUser, User LecturerUser, User StrangerUser, User AdminUser, Internship Internship, Document DocWithInternship)> SeedDataAsync(AppDbContext db)
    {
        var studentUser = new User { Id = Guid.NewGuid(), Username = "student", PasswordHash = "hash", Email = "student@test.com", Role = Role.Student, FullName = "Student 1", CreatedAt = DateTime.UtcNow };
        var lecturerUser = new User { Id = Guid.NewGuid(), Username = "lecturer", PasswordHash = "hash", Email = "lecturer@test.com", Role = Role.Lecturer, FullName = "Lecturer 1", CreatedAt = DateTime.UtcNow };
        var strangerUser = new User { Id = Guid.NewGuid(), Username = "stranger", PasswordHash = "hash", Email = "stranger@test.com", Role = Role.Student, FullName = "Stranger", CreatedAt = DateTime.UtcNow };
        var adminUser = new User { Id = Guid.NewGuid(), Username = "admin", PasswordHash = "hash", Email = "admin@test.com", Role = Role.SuperAdmin, FullName = "Admin", CreatedAt = DateTime.UtcNow };

        var student = new Student { Id = Guid.NewGuid(), UserId = studentUser.Id, StudentCode = "SV001", FullName = "Student 1", CreatedAt = DateTime.UtcNow };
        var lecturer = new Lecturer { Id = Guid.NewGuid(), UserId = lecturerUser.Id, StaffCode = "GV001", FullName = "Lecturer 1", CreatedAt = DateTime.UtcNow };

        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            Student = student,
            LecturerId = lecturer.Id,
            Lecturer = lecturer,
            Status = InternshipStatus.InProgress,
            CreatedAt = DateTime.UtcNow
        };

        var docWithInternship = new Document
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            Internship = internship,
            Title = "Internship Spec",
            FileName = "spec.pdf",
            FilePath = "uploads/documents/spec.pdf",
            MimeType = "application/pdf",
            UploadedById = lecturer.Id,
            UploadedBy = lecturer,
            CreatedAt = DateTime.UtcNow
        };

        await db.Users.AddRangeAsync(studentUser, lecturerUser, strangerUser, adminUser);
        await db.Students.AddAsync(student);
        await db.Lecturers.AddAsync(lecturer);
        await db.Internships.AddAsync(internship);
        await db.Documents.AddAsync(docWithInternship);
        await db.SaveChangesAsync();

        return (studentUser, lecturerUser, strangerUser, adminUser, internship, docWithInternship);
    }

    [Fact]
    public async Task GetDocumentByIdAsync_InternshipDoc_StudentOwner_ShouldReturnDocument()
    {
        var db = GetDb();
        var (studentUser, _, _, _, _, docWithInternship) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetDocumentByIdAsync(docWithInternship.Id, studentUser.Id, isLecturerOrAdmin: false);

        result.Should().NotBeNull();
        result!.Id.Should().Be(docWithInternship.Id);
        result.Title.Should().Be("Internship Spec");
    }

    [Fact]
    public async Task GetDocumentByIdAsync_InternshipDoc_AssignedLecturer_ShouldReturnDocument()
    {
        var db = GetDb();
        var (_, lecturerUser, _, _, _, docWithInternship) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetDocumentByIdAsync(docWithInternship.Id, lecturerUser.Id, isLecturerOrAdmin: true);

        result.Should().NotBeNull();
        result!.Id.Should().Be(docWithInternship.Id);
    }

    [Fact]
    public async Task GetDocumentByIdAsync_InternshipDoc_SuperAdmin_ShouldReturnDocument()
    {
        var db = GetDb();
        var (_, _, _, adminUser, _, docWithInternship) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetDocumentByIdAsync(docWithInternship.Id, adminUser.Id, isLecturerOrAdmin: true);

        result.Should().NotBeNull();
        result!.Id.Should().Be(docWithInternship.Id);
    }

    [Fact]
    public async Task GetDocumentByIdAsync_InternshipDoc_StrangerStudent_ShouldThrowUnauthorizedAccessException()
    {
        var db = GetDb();
        var (_, _, strangerUser, _, _, docWithInternship) = await SeedDataAsync(db);
        var service = CreateService(db);

        var act = async () => await service.GetDocumentByIdAsync(docWithInternship.Id, strangerUser.Id, isLecturerOrAdmin: false);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*access*");
    }

    [Fact]
    public async Task GetDocumentByIdAsync_InternshipDoc_UnassignedLecturer_ShouldThrowUnauthorizedAccessException()
    {
        var db = GetDb();
        var (_, _, _, _, _, docWithInternship) = await SeedDataAsync(db);

        var otherLecturer = new User
        {
            Id = Guid.NewGuid(),
            Username = "other_lecturer",
            PasswordHash = "hash",
            Role = Role.Lecturer,
            CreatedAt = DateTime.UtcNow
        };
        await db.Users.AddAsync(otherLecturer);
        await db.SaveChangesAsync();

        var service = CreateService(db);

        var act = async () => await service.GetDocumentByIdAsync(docWithInternship.Id, otherLecturer.Id, isLecturerOrAdmin: true);

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*access*");
    }

    [Fact]
    public async Task GetDocumentByIdAsync_NonExistent_ShouldReturnNull()
    {
        var db = GetDb();
        var (studentUser, _, _, _, _, _) = await SeedDataAsync(db);
        var service = CreateService(db);

        var result = await service.GetDocumentByIdAsync(Guid.NewGuid(), studentUser.Id, isLecturerOrAdmin: false);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetDocumentsByInternshipAsync_ShouldReturnItems()
    {
        var db = GetDb();
        var (_, _, _, _, internship, _) = await SeedDataAsync(db);
        var service = CreateService(db);

        var items = await service.GetDocumentsByInternshipAsync(internship.Id);

        items.Should().ContainSingle();
        items.First().Title.Should().Be("Internship Spec");
    }

    [Fact]
    public async Task UploadDocumentAsync_PowerPointFile_ShouldBeAccepted()
    {
        var db = GetDb();
        var (_, lecturerUser, _, _, internship, _) = await SeedDataAsync(db);
        var service = CreateService(db);
        await using var fileStream = new MemoryStream(new byte[] { 1, 2, 3 });

        var result = await service.UploadDocumentAsync(
            new CreateDocumentRequest { InternshipId = internship.Id, Title = "Slide" },
            fileStream,
            "presentation.pptx",
            lecturerUser.Id);

        result.FileName.Should().Be("presentation.pptx");
        result.MimeType.Should().Be("application/vnd.openxmlformats-officedocument.presentationml.presentation");
    }

    [Fact]
    public async Task GetTemplatesAsync_WithFilters_ShouldReturnFilteredTemplates()
    {
        var db = GetDb();
        var service = CreateService(db);

        var t1 = new Document
        {
            Id = Guid.NewGuid(),
            InternshipId = null,
            Title = "Báo cáo tốt nghiệp CNTT",
            Department = "CNTT",
            Category = "FinalReport",
            Version = "1.0",
            FileName = "t1.docx",
            FilePath = "uploads/t1.docx",
            MimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            IsPublished = true,
            CreatedAt = DateTime.UtcNow
        };
        var t2 = new Document
        {
            Id = Guid.NewGuid(),
            InternshipId = null,
            Title = "Báo cáo tuần QTKD",
            Department = "QTKD",
            Category = "WeeklyReport",
            Version = "1.0",
            FileName = "t2.docx",
            FilePath = "uploads/t2.docx",
            MimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            IsPublished = true,
            CreatedAt = DateTime.UtcNow
        };
        var t3 = new Document
        {
            Id = Guid.NewGuid(),
            InternshipId = null,
            Title = "Báo cáo tuần CNTT (Lưu trữ)",
            Department = "CNTT",
            Category = "WeeklyReport",
            Version = "0.9",
            FileName = "t3.docx",
            FilePath = "uploads/t3.docx",
            MimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            IsPublished = false,
            CreatedAt = DateTime.UtcNow
        };

        await db.Documents.AddRangeAsync(t1, t2, t3);
        await db.SaveChangesAsync();

        var result1 = await service.GetTemplatesAsync(department: "CNTT", isPublishedOnly: true);
        result1.Should().ContainSingle();
        result1.First().Title.Should().Be("Báo cáo tốt nghiệp CNTT");

        var result2 = await service.GetTemplatesAsync(category: "WeeklyReport");
        result2.Should().HaveCount(2);
    }

    [Fact]
    public async Task CreateTemplateAsync_ValidInput_ShouldPersistTemplate()
    {
        var db = GetDb();
        var service = CreateService(db);
        var adminId = Guid.NewGuid();

        var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("sample doc content"));
        var formFile = new Microsoft.AspNetCore.Http.FormFile(stream, 0, stream.Length, "File", "MauBaoCao.docx");

        var request = new CreateTemplateRequest
        {
            Title = "Mẫu Báo Cáo Tốt Nghiệp",
            Department = "CNTT",
            Category = "FinalReport",
            Version = "2.0",
            IsPublished = true,
            IsRequired = true,
            File = formFile
        };

        var result = await service.CreateTemplateAsync(request, adminId);

        result.Should().NotBeNull();
        result.Title.Should().Be("Mẫu Báo Cáo Tốt Nghiệp");
        result.Department.Should().Be("CNTT");
        result.Version.Should().Be("2.0");
        result.IsPublished.Should().BeTrue();
        result.IsRequired.Should().BeTrue();
        result.InternshipId.Should().BeNull();
    }

    [Fact]
    public async Task UpdateTemplateAsync_ArchiveTemplate_ShouldSetArchiveFields()
    {
        var db = GetDb();
        var service = CreateService(db);
        var adminId = Guid.NewGuid();

        var template = new Document
        {
            Id = Guid.NewGuid(),
            InternshipId = null,
            Title = "Mẫu Đánh Giá",
            Category = "CompanyEvaluation",
            Version = "1.0",
            FileName = "DanhGia.docx",
            FilePath = "uploads/DanhGia.docx",
            MimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            IsPublished = true,
            CreatedAt = DateTime.UtcNow
        };
        await db.Documents.AddAsync(template);
        await db.SaveChangesAsync();

        var updateRequest = new UpdateTemplateRequest
        {
            Title = "Mẫu Đánh Giá Cũ",
            IsPublished = false,
            ArchiveReason = "Thu hồi mẫu cũ để ban hành mẫu mới"
        };

        var updated = await service.UpdateTemplateAsync(template.Id, updateRequest, adminId);

        updated.Should().NotBeNull();
        updated!.Title.Should().Be("Mẫu Đánh Giá Cũ");
        updated.IsPublished.Should().BeFalse();
        updated.ArchiveReason.Should().Be("Thu hồi mẫu cũ để ban hành mẫu mới");
        updated.ArchivedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task GetTemplateStatsAsync_ShouldCalculateCorrectMetrics()
    {
        var db = GetDb();
        var service = CreateService(db);

        var t1 = new Document { Id = Guid.NewGuid(), Title = "T1", FileName = "t1.docx", FilePath = "p1", MimeType = "docx", IsPublished = true, DownloadCount = 5, CreatedAt = DateTime.UtcNow };
        var t2 = new Document { Id = Guid.NewGuid(), Title = "T2", FileName = "t2.docx", FilePath = "p2", MimeType = "docx", IsPublished = true, DownloadCount = 10, CreatedAt = DateTime.UtcNow };
        var t3 = new Document { Id = Guid.NewGuid(), Title = "T3", FileName = "t3.docx", FilePath = "p3", MimeType = "docx", IsPublished = false, DownloadCount = 2, CreatedAt = DateTime.UtcNow };

        await db.Documents.AddRangeAsync(t1, t2, t3);
        await db.SaveChangesAsync();

        var stats = await service.GetTemplateStatsAsync();

        stats.TotalTemplates.Should().Be(3);
        stats.PublishedCount.Should().Be(2);
        stats.ArchivedCount.Should().Be(1);
        stats.TotalDownloads.Should().Be(17);
    }

    [Fact]
    public async Task DownloadDocumentAsync_UnpublishedTemplate_StudentAccess_ShouldThrowUnauthorized()
    {
        var db = GetDb();
        var (studentUser, _, _, _, _, _) = await SeedDataAsync(db);
        var service = CreateService(db);

        var unpublishedTemplate = new Document
        {
            Id = Guid.NewGuid(),
            InternshipId = null,
            Title = "Bản nháp chưa ban hành",
            FileName = "draft.docx",
            FilePath = "uploads/draft.docx",
            MimeType = "docx",
            IsPublished = false,
            CreatedAt = DateTime.UtcNow
        };
        await db.Documents.AddAsync(unpublishedTemplate);
        await db.SaveChangesAsync();

        var act = async () => await service.DownloadDocumentAsync(unpublishedTemplate.Id, studentUser.Id, isLecturerOrAdmin: false);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task IncrementDownloadCountAsync_ShouldIncreaseCount()
    {
        var db = GetDb();
        var service = CreateService(db);

        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Mẫu Báo Cáo",
            FileName = "m.docx",
            FilePath = "p",
            MimeType = "docx",
            DownloadCount = 7,
            CreatedAt = DateTime.UtcNow
        };
        await db.Documents.AddAsync(doc);
        await db.SaveChangesAsync();

        await service.IncrementDownloadCountAsync(doc.Id);

        var reloaded = await db.Documents.FindAsync(doc.Id);
        reloaded!.DownloadCount.Should().Be(8);
    }

    [Fact]
    public async Task UpdateDocumentWithFileAsync_ShouldCreateNewVersionRecord()
    {
        var db = GetDb();
        var (_, _, _, _, _, doc) = await SeedDataAsync(db);
        var service = CreateService(db);

        // Seed initial version 1
        var v1 = new DocumentVersion
        {
            Id = Guid.NewGuid(),
            DocumentId = doc.Id,
            VersionNumber = 1,
            FileName = doc.FileName,
            FilePath = doc.FilePath,
            FileSize = 100,
            MimeType = doc.MimeType,
            UploadedAt = DateTime.UtcNow,
            ChangeNote = "Phiên bản đầu"
        };
        await db.DocumentVersions.AddAsync(v1);
        await db.SaveChangesAsync();

        // Update with new file
        var result = await service.UpdateDocumentWithFileAsync(
            doc.Id,
            "spec_v2.pdf",
            "uploads/documents/spec_v2.pdf",
            250,
            "application/pdf");

        result.Should().NotBeNull();
        result!.FileName.Should().Be("spec_v2.pdf");

        // Verify versions
        var versions = await service.GetDocumentVersionsAsync(doc.Id);
        versions.Should().HaveCount(2);
        versions[0].VersionNumber.Should().Be(2);
        versions[0].FileName.Should().Be("spec_v2.pdf");
        versions[1].VersionNumber.Should().Be(1);
        versions[1].FileName.Should().Be("spec.pdf");
    }

    [Fact]
    public async Task GetDocumentVersionsAsync_NoVersions_ShouldReturnEmptyList()
    {
        var db = GetDb();
        var service = CreateService(db);

        var docId = Guid.NewGuid();
        var versions = await service.GetDocumentVersionsAsync(docId);

        versions.Should().BeEmpty();
    }
}
