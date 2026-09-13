namespace InternLink.Domain.Entities;

/// <summary>
/// Represents a document (file) related to an internship
/// </summary>
public class Document : BaseEntity
{
    /// <summary>
    /// The internship this document belongs to (null for general / official templates)
    /// </summary>
    public Guid? InternshipId { get; set; }
    public Internship? Internship { get; set; }

    /// <summary>
    /// The semester this template/document is designated for (null for all semesters)
    /// </summary>
    public Guid? SemesterId { get; set; }
    public Semester? Semester { get; set; }

    /// <summary>
    /// Department scope (e.g. CNTT, QTKD) (null for entire school)
    /// </summary>
    public string? Department { get; set; }

    /// <summary>
    /// Template version (e.g. "1.0", "2.1")
    /// </summary>
    public string Version { get; set; } = "1.0";

    /// <summary>
    /// Date when the document/template was published
    /// </summary>
    public DateTime? PublishedAt { get; set; }

    /// <summary>
    /// The lecturer or admin who uploaded this document
    /// </summary>
    public Guid? UploadedById { get; set; }
    public Lecturer? UploadedBy { get; set; }

    /// <summary>
    /// Document title/name
    /// </summary>
    public string Title { get; set; } = null!;

    /// <summary>
    /// Document description
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Original file name
    /// </summary>
    public string FileName { get; set; } = null!;

    /// <summary>
    /// File path relative to wwwroot/uploads/documents/
    /// </summary>
    public string FilePath { get; set; } = null!;

    /// <summary>
    /// File size in bytes
    /// </summary>
    public long FileSize { get; set; }

    public int DownloadCount { get; set; }

    /// <summary>
    /// File MIME type (e.g., application/pdf, application/msword)
    /// </summary>
    public string MimeType { get; set; } = null!;

    /// <summary>
    /// Date the document was uploaded
    /// </summary>
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Flag indicating if this is a required document
    /// </summary>
    public bool IsRequired { get; set; } = false;

    public bool IsPublished { get; set; } = true;
    public string? ArchiveReason { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public string? ArchivedBy { get; set; }

    /// <summary>
    /// Document category/type (e.g., "WeeklyReport", "MidtermReport", "FinalReport", "Other")
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Full version history — each upload/reupload creates a new DocumentVersion entry
    /// </summary>
    public ICollection<DocumentVersion> Versions { get; set; } = new List<DocumentVersion>();
}
