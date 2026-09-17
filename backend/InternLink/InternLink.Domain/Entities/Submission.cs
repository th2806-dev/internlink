using InternLink.Domain.Enums;

namespace InternLink.Domain.Entities;

public class Submission : BaseEntity
{
    public Guid InternshipId { get; set; }
    public Internship Internship { get; set; } = null!;

    public SubmissionType Type { get; set; } = SubmissionType.WeeklyReport;
    public SubmissionStatus Status { get; set; } = SubmissionStatus.Submitted;
    public int Version { get; set; } = 1;

    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
    public string? GoogleDriveFileId { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Feedback> Feedbacks { get; set; } = new List<Feedback>();
    public ICollection<SubmissionAsset> Assets { get; set; } = new List<SubmissionAsset>();
}
