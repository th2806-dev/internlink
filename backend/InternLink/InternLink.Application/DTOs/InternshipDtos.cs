namespace InternLink.Application.DTOs;

/// <summary>
/// DTO for creating a new internship
/// </summary>
public class CreateInternshipRequest
{
    public Guid StudentId { get; set; }
    public Guid? CompanyId { get; set; } // Changed: nullable for initial enrollment (company assigned later)
    public Guid? LecturerId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Position { get; set; }
    public string? SupervisorName { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO for updating an internship
/// </summary>
public class UpdateInternshipRequest
{
    public Guid? CompanyId { get; set; }
    public Guid? LecturerId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Position { get; set; }
    public string? SupervisorName { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO for updating internship status
/// </summary>
public class UpdateInternshipStatusRequest
{
    public string Status { get; set; } = null!;
}

/// <summary>
/// DTO for assigning a company to internship
/// </summary>
public class AssignCompanyRequest
{
    public Guid CompanyId { get; set; }
    public string? SupervisorName { get; set; }
    public string? Position { get; set; }
}

/// <summary>
/// DTO for retrieving internship details (with submissions)
/// </summary>
public class InternshipDetailFullDto
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public Guid? CompanyId { get; set; } // Changed: nullable because company assigned later
    public Guid? LecturerId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Status { get; set; } = null!;
    public string? Position { get; set; }
    public string? SupervisorName { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public StudentSummaryDto? Student { get; set; }
    public CompanySummaryDto? Company { get; set; }
    public IEnumerable<SubmissionDto> Submissions { get; set; } = Array.Empty<SubmissionDto>();
}

/// <summary>
/// Internship filtering query parameters
/// </summary>
public class InternshipFilterRequest : PaginationRequest
{
    public Guid? StudentId { get; set; }
    public Guid? CompanyId { get; set; }
    public Guid? LecturerId { get; set; }
    public string? Status { get; set; }
    public string? SearchTerm { get; set; }
    public DateTime? StartDateFrom { get; set; }
    public DateTime? StartDateTo { get; set; }
    public DateTime? EndDateFrom { get; set; }
    public DateTime? EndDateTo { get; set; }
    public string? SortBy { get; set; } = "CreatedAt";
    public string? SortDirection { get; set; } = "desc";
}

/// <summary>
/// Summary DTO for listing internships
/// </summary>
public class InternshipListItemDto
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public string? StudentName { get; set; }
    public string? StudentCode { get; set; }
    public Guid? CompanyId { get; set; } // Changed: nullable because company assigned later
    public string? CompanyName { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Status { get; set; } = null!;
    public string? Position { get; set; }
    public int SubmissionCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Summary DTO for internship overview
/// </summary>
public class InternshipStatsDto
{
    public int Total { get; set; }
    public int NotStarted { get; set; }
    public int InProgress { get; set; }
    public int BehindSchedule { get; set; }
    public int AwaitingFeedback { get; set; }
    public int RequiresRevision { get; set; }
    public int Completed { get; set; }
    public int Graded { get; set; }
}

public class AdminOverviewDto
{
    public int LecturerCount { get; set; }
    public int StudentCount { get; set; }
    public int ActiveStudents { get; set; }
    public int CompanyCount { get; set; }
    public int ActiveCompanies { get; set; }
    public int InternshipTotal { get; set; }
    public InternshipStatsDto InternshipStats { get; set; } = new();
}

/// <summary>
/// Summary DTO for User (lecturer, supervisor)
/// </summary>
public class UserSummaryDto
{
    public Guid Id { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
}

/// <summary>
/// Summary DTO for Internship (for nested in other DTOs)
/// </summary>
public class InternshipSummaryDto
{
    public Guid Id { get; set; }
    public string? StudentName { get; set; }
    public string? CompanyName { get; set; }
    public string? Position { get; set; }
    public string Status { get; set; } = null!;
}
