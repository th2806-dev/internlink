namespace InternLink.Domain.Entities;

/// <summary>
/// Stores a historical snapshot of a Document file each time it is uploaded or replaced.
/// Similar to WeeklyReportVersion but for general Documents.
/// </summary>
public class DocumentVersion : BaseEntity
{
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = null!;

    /// <summary>
    /// Auto-incrementing version number per document (1, 2, 3, ...)
    /// </summary>
    public int VersionNumber { get; set; }

    public string FileName { get; set; } = null!;
    public string FilePath { get; set; } = null!;
    public string? GoogleDriveFileId { get; set; }
    public long FileSize { get; set; }
    public string MimeType { get; set; } = "application/octet-stream";

    /// <summary>
    /// The user who uploaded this version
    /// </summary>
    public Guid? UploadedById { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Optional note describing why a new version was uploaded
    /// </summary>
    public string? ChangeNote { get; set; }
}
