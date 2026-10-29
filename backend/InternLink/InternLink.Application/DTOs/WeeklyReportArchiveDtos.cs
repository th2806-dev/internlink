namespace InternLink.Application.DTOs;

public sealed class WeeklyReportArchiveStudentDto
{
    public Guid StudentId { get; set; }
    public Guid InternshipId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public string? CompanyName { get; set; }
    public int ReportCount { get; set; }
    public int FileCount { get; set; }
    public int WeeklyReportCount { get; set; }
    public bool HasFinalReport { get; set; }
    public bool HasEvidence { get; set; }
    public int TotalFilesCount { get; set; }
    public List<int> Weeks { get; set; } = new();
    public DateTime? LastSubmittedAt { get; set; }
    public List<StudentArchiveDocumentItemDto> Documents { get; set; } = new();
}

public sealed class StudentArchiveDocumentItemDto
{
    public Guid Id { get; set; }
    public Guid? SubmissionId { get; set; }
    public Guid? AssetId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string DisplayType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    public int? WeekNumber { get; set; }
    public int Version { get; set; } = 1;
    public string Status { get; set; } = string.Empty;
    public DateTime? SubmittedAt { get; set; }
}

public sealed class WeeklyReportArchiveZipDto
{
    public byte[] Content { get; set; } = Array.Empty<byte>();
    public string FileName { get; set; } = string.Empty;
}