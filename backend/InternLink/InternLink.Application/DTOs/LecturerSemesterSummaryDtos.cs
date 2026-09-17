namespace InternLink.Application.DTOs;

public sealed class LecturerSemesterSummaryDto
{
    public Guid SemesterId { get; set; }
    public string Results { get; set; } = string.Empty;
    public string Difficulties { get; set; } = string.Empty;
    public string Recommendations { get; set; } = string.Empty;
    public string Conclusion { get; set; } = string.Empty;
    public DateTime? UpdatedAt { get; set; }
}

public sealed class SaveLecturerSemesterSummaryRequest
{
    public string Results { get; set; } = string.Empty;
    public string Difficulties { get; set; } = string.Empty;
    public string Recommendations { get; set; } = string.Empty;
    public string Conclusion { get; set; } = string.Empty;
}