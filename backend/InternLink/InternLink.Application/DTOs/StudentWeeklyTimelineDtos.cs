namespace InternLink.Application.DTOs;

/// <summary>Weekly schedule, report submissions, and lecturer feedback for one assigned student.</summary>
public sealed record StudentWeeklyTimelineDto(
    Guid StudentId,
    string StudentCode,
    string FullName,
    string CompanyName,
    string? MentorName,
    int TotalWeeks,
    int SubmittedWeeks,
    int ApprovedWeeks,
    decimal? AverageWeeklyScore,
    IReadOnlyList<StudentWeeklyTimelineWeekDto> Weeks);

/// <summary>Schedule and report details for one internship week.</summary>
public sealed record StudentWeeklyTimelineWeekDto(
    int WeekNumber,
    string Title,
    DateTimeOffset? DueDate,
    string Status,
    DateTimeOffset? SubmittedAt,
    string? ReportContent,
    IReadOnlyList<StudentWeeklyTimelineAttachmentDto> Attachments,
    decimal? Score,
    string? Feedback,
    DateTimeOffset? GradedAt,
    IReadOnlyList<WeeklyReportDto> Reports);

/// <summary>Downloadable report file associated with a timeline week.</summary>
public sealed record StudentWeeklyTimelineAttachmentDto(
    Guid Id,
    string FileName,
    long? FileSize,
    string? MimeType,
    int Version);
