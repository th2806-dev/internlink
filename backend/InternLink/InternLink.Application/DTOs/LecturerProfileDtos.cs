namespace InternLink.Application.DTOs;

public class CreateLecturerRequest
{
    public string StaffCode { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Department { get; set; }
    public Guid? UserId { get; set; }
    public string? Username { get; set; }
    public bool GrantAccount { get; set; }
}

public class UpdateLecturerRequest
{
    public string FullName { get; set; } = null!;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Department { get; set; }
    public Guid? UserId { get; set; }
    /// <summary>
    /// Optional login username. Defaults to StaffCode when GrantAccount is true.
    /// </summary>
    public string? Username { get; set; }
    /// <summary>
    /// Grant login account when lecturer has no linked user yet.
    /// </summary>
    public bool GrantAccount { get; set; }
}

public class LecturerDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string StaffCode { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Department { get; set; }
    /// <summary>Department this lecturer belongs to (null = global/unassigned).</summary>
    public Guid? DepartmentId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class LecturerImportResultDto
{
    public int TotalRows { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public int SkippedDuplicateCount { get; set; }
    public int EmailSentCount { get; set; }
    public int EmailFailedCount { get; set; }
    public string DefaultPassword { get; set; } = null!;
    public IReadOnlyList<LecturerDto> CreatedLecturers { get; set; } = Array.Empty<LecturerDto>();
    public IReadOnlyList<LecturerImportErrorDto> Errors { get; set; } = Array.Empty<LecturerImportErrorDto>();
    public IReadOnlyList<LecturerImportErrorDto> EmailErrors { get; set; } = Array.Empty<LecturerImportErrorDto>();
}

public class LecturerImportErrorDto
{
    public int RowNumber { get; set; }
    public string? StaffCode { get; set; }
    public string? Username { get; set; }
    public string Message { get; set; } = null!;
}

public class LecturerOverviewDto
{
    public LecturerDto Lecturer { get; set; } = null!;
    public int TotalInternships { get; set; }
    public Dictionary<string, int> StatusCounts { get; set; } = new();
    public IReadOnlyList<LecturerInternshipSummaryDto> Internships { get; set; } = Array.Empty<LecturerInternshipSummaryDto>();
}

public class LecturerInternshipSummaryDto
{
    public Guid InternshipId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentCode { get; set; } = null!;
    public string StudentName { get; set; } = null!;
    public string? CompanyName { get; set; }
    public string Status { get; set; } = null!;
    public int SubmissionCount { get; set; }
    public int WeeklyReportCount { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}
