namespace InternLink.Application.DTOs;

using Microsoft.AspNetCore.Http;

public sealed class WeeklyReportDto
{
    public Guid Id { get; set; }
    public Guid InternshipId { get; set; }
    public int WeekNumber { get; set; }
    public int Version { get; set; }
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
    public long? FileSize { get; set; }
    public string? MimeType { get; set; }
    public string Status { get; set; } = null!;
    public DateTime? SubmittedAt { get; set; }
    public string? LecturerComment { get; set; }
    public List<FeedbackDto> Feedbacks { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DueDate { get; set; }
    public List<WeeklyReportVersionDto> Versions { get; set; } = new();
}

public sealed class WeeklyReportVersionDto
{
    public Guid Id { get; set; }
    public int Version { get; set; }
    public string FileName { get; set; } = null!;
    public long FileSize { get; set; }
    public string MimeType { get; set; } = null!;
    public DateTime UploadedAt { get; set; }
}

public sealed class CreateWeeklyReportRequest
{
    public Guid InternshipId { get; set; }
    public int WeekNumber { get; set; }
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
}

public sealed class UpdateWeeklyReportRequest
{
    public string? Title { get; set; }
    public string? Content { get; set; }
}

public sealed class UploadWeeklyReportFormRequest
{
    public Guid InternshipId { get; set; }
    public int WeekNumber { get; set; }
    public string Title { get; set; } = null!;
    public IFormFile? File { get; set; }
}

public sealed class ReviewWeeklyReportRequest
{
    public string Status { get; set; } = null!;
    public string? LecturerComment { get; set; }
}
