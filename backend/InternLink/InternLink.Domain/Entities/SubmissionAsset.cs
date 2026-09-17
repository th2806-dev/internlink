namespace InternLink.Domain.Entities;

public class SubmissionAsset : BaseEntity
{
    public Guid SubmissionId { get; set; }
    public Submission Submission { get; set; } = null!;

    public string? Label { get; set; }
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
    public string? GoogleDriveFileId { get; set; }
    public string AssetType { get; set; } = "file";
    public long? FileSize { get; set; }
    public string? MimeType { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
