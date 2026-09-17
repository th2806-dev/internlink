using Microsoft.AspNetCore.Http;

namespace InternLink.Application.DTOs;

/// <summary>
/// DTO for creating a new document (file upload)
/// </summary>
public class CreateDocumentRequest
{
    public Guid InternshipId { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public bool IsRequired { get; set; } = false;
}

/// <summary>
/// Form model for multipart upload endpoint (hỗ trợ nhiều file)
/// </summary>
public class UploadDocumentFormRequest
{
    public Guid InternshipId { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public bool IsRequired { get; set; } = false;
    public List<IFormFile>? Files { get; set; }
}

/// <summary>
/// DTO for updating a document
/// </summary>
public class UpdateDocumentRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public bool? IsRequired { get; set; }
    public bool? IsPublished { get; set; }
    public string? ArchiveReason { get; set; }
}

/// <summary>
/// DTO for document list item (summary)
/// </summary>
public class DocumentListItemDto
{
    public Guid Id { get; set; }
    public Guid? InternshipId { get; set; }
    public Guid? SemesterId { get; set; }
    public string? SemesterName { get; set; }
    public string? Department { get; set; }
    public string Version { get; set; } = "1.0";
    public DateTime? PublishedAt { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string FileName { get; set; } = null!;
    public long FileSize { get; set; }
    public int DownloadCount { get; set; }
    public string MimeType { get; set; } = null!;
    public DateTime UploadedAt { get; set; }
    public string? Category { get; set; }
    public bool IsRequired { get; set; }
    public bool IsPublished { get; set; }
    public string? ArchiveReason { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public string? ArchivedBy { get; set; }
    public UserSummaryDto? UploadedBy { get; set; }
}

/// <summary>
/// DTO for document detail view
/// </summary>
public class DocumentDetailDto
{
    public Guid Id { get; set; }
    public Guid? InternshipId { get; set; }
    public Guid? SemesterId { get; set; }
    public string? SemesterName { get; set; }
    public string? Department { get; set; }
    public string Version { get; set; } = "1.0";
    public DateTime? PublishedAt { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string FileName { get; set; } = null!;
    public string FilePath { get; set; } = null!;
    public string? GoogleDriveFileId { get; set; }
    public long FileSize { get; set; }
    public int DownloadCount { get; set; }
    public string MimeType { get; set; } = null!;
    public DateTime UploadedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? Category { get; set; }
    public bool IsRequired { get; set; }
    public bool IsPublished { get; set; }
    public string? ArchiveReason { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public string? ArchivedBy { get; set; }
    public UserSummaryDto? UploadedBy { get; set; }
}

/// <summary>
/// DTO for document file download response
/// </summary>
public class DocumentDownloadDto
{
    public byte[] FileContent { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public string MimeType { get; set; } = null!;
}

/// <summary>
/// DTO for filtering documents
/// </summary>
public class DocumentFilterRequest : PaginationRequest
{
    /// <summary>
    /// Filter by internship ID
    /// </summary>
    public Guid? InternshipId { get; set; }
    public Guid? SemesterId { get; set; }
    public string? Department { get; set; }
    public bool? IsPublished { get; set; }

    /// <summary>
    /// Filter by document type
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Search by title or description
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Filter by required documents only
    /// </summary>
    public bool? IsRequired { get; set; }

    /// <summary>
    /// Filter by upload date range (from)
    /// </summary>
    public DateTime? UploadedFrom { get; set; }

    /// <summary>
    /// Filter by upload date range (to)
    /// </summary>
    public DateTime? UploadedTo { get; set; }

    /// <summary>
    /// Sort field (e.g., "UploadedAt", "Title", "FileSize")
    /// </summary>
    public string? SortBy { get; set; } = "UploadedAt";

    /// <summary>
    /// Sort order (asc or desc)
    /// </summary>
    public string? SortOrder { get; set; } = "desc";
}

public class CreateTemplateRequest
{
    public Guid? SemesterId { get; set; }
    public string? Department { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string Version { get; set; } = "1.0";
    public bool IsPublished { get; set; } = true;
    public bool IsRequired { get; set; } = false;
    public IFormFile File { get; set; } = null!;
}

public class UpdateTemplateRequest
{
    public Guid? SemesterId { get; set; }
    public string? Department { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? Version { get; set; }
    public bool? IsPublished { get; set; }
    public bool? IsRequired { get; set; }
    public string? ArchiveReason { get; set; }
    public IFormFile? File { get; set; }
}

public class TemplateStatsDto
{
    public int TotalTemplates { get; set; }
    public int PublishedCount { get; set; }
    public int ArchivedCount { get; set; }
    public int TotalDownloads { get; set; }
}

/// <summary>
/// Represents one historical version of a document file
/// </summary>
public class DocumentVersionDto
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public int VersionNumber { get; set; }
    public string FileName { get; set; } = null!;
    public long FileSize { get; set; }
    public string MimeType { get; set; } = null!;
    public string? ChangeNote { get; set; }
    public DateTime UploadedAt { get; set; }
    public Guid? UploadedById { get; set; }
}
