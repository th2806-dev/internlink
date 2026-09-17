using InternLink.Domain.Enums;

namespace InternLink.Domain.Entities;

public class WeeklyReport : BaseEntity
{
    public Guid InternshipId { get; set; }
    public Internship Internship { get; set; } = null!;

    public int WeekNumber { get; set; }
    public int Version { get; set; } = 1;
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
    public string? GoogleDriveFileId { get; set; }
    public long? FileSize { get; set; }
    public string? MimeType { get; set; }
    public WeeklyReportStatus Status { get; set; } = WeeklyReportStatus.Draft;
    public DateTime? SubmittedAt { get; set; }
    public string? LecturerComment { get; set; }
    public ICollection<Feedback> Feedbacks { get; set; } = new List<Feedback>();
    public ICollection<WeeklyReportVersion> Versions { get; set; } = new List<WeeklyReportVersion>();
}
