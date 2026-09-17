namespace InternLink.Domain.Entities;

public class WeeklyReportVersion : BaseEntity
{
    public Guid WeeklyReportId { get; set; }
    public WeeklyReport WeeklyReport { get; set; } = null!;
    public int Version { get; set; }
    public string FileName { get; set; } = null!;
    public string FileUrl { get; set; } = null!;
    public string? GoogleDriveFileId { get; set; }
    public long FileSize { get; set; }
    public string MimeType { get; set; } = "application/pdf";
    public Guid UploadedById { get; set; }
    public DateTime UploadedAt { get; set; }
}