namespace InternLink.Application.DTOs;

public sealed class WeeklyReportArchiveStudentDto
{
    public Guid StudentId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public string? CompanyName { get; set; }
    public int ReportCount { get; set; }
    public int FileCount { get; set; }
    public List<int> Weeks { get; set; } = new();
    public DateTime? LastSubmittedAt { get; set; }
}

public sealed class WeeklyReportArchiveZipDto
{
    public byte[] Content { get; set; } = Array.Empty<byte>();
    public string FileName { get; set; } = string.Empty;
}