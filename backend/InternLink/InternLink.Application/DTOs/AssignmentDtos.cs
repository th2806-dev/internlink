namespace InternLink.Application.DTOs;

public class BulkAssignRequest
{
    public Guid LecturerId { get; set; }
    public Guid? SemesterId { get; set; }
    public IList<Guid> StudentIds { get; set; } = Array.Empty<Guid>();
    public string? Note { get; set; }
}

public class UnassignRequest
{
    public Guid LecturerId { get; set; }
    public Guid StudentId { get; set; }
    public Guid? SemesterId { get; set; }
}

public class BulkAssignResultDto
{
    public int AssignedCount { get; set; }
    public int CreatedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int FailedCount { get; set; }
    public IList<AssignmentErrorDto> Errors { get; set; } = Array.Empty<AssignmentErrorDto>();
}

public class AssignmentErrorDto
{
    public Guid StudentId { get; set; }
    public string Message { get; set; } = null!;
}

public class LecturerAssignmentItemDto
{
    public Guid InternshipId { get; set; }
    public Guid? LecturerId { get; set; }
    public string? LecturerName { get; set; }
    public Guid StudentId { get; set; }
    public string StudentCode { get; set; } = null!;
    public string StudentName { get; set; } = null!;
    public string? Class { get; set; }
    public string? Major { get; set; }
    public string Status { get; set; } = null!;
    public Guid? CompanyId { get; set; } // Changed: nullable because company assigned later
    public string? CompanyName { get; set; }
    public bool CompanyAssigned { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AutoAssignRequest
{
    /// <summary>"department", "even", or "random".</summary>
    public string Strategy { get; set; } = "even";
    public Guid? SemesterId { get; set; }
}

public class AutoAssignResultDto
{
    public int TotalAssigned { get; set; }
    public int TotalFailed { get; set; }
    public int LecturersUsed { get; set; }
}

public class AssignmentHistoryItemDto
{
    public string Id { get; set; } = null!;
    public string LecturerName { get; set; } = null!;
    public int StudentCount { get; set; }
    public DateTime Timestamp { get; set; }
    public IList<string> ClassGroups { get; set; } = Array.Empty<string>();
    public string AssignedBy { get; set; } = null!;
}

public class CompanyAllocationImportResultDto
{
    public int TotalRows { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public IList<CompanyAllocationImportErrorDto> Errors { get; set; } = new List<CompanyAllocationImportErrorDto>();
    /// <summary>Non-fatal issues, e.g. a position code that matched no recruitment position (company still assigned).</summary>
    public IList<CompanyAllocationImportErrorDto> Warnings { get; set; } = new List<CompanyAllocationImportErrorDto>();
    public IList<CompanyAllocationItemDto> UpdatedAllocations { get; set; } = new List<CompanyAllocationItemDto>();
}

public class CompanyAllocationImportErrorDto
{
    public int RowNumber { get; set; }
    public string? StudentCode { get; set; }
    public string? StudentName { get; set; }
    public string? ClassName { get; set; }
    public string? CompanyName { get; set; }
    public string Message { get; set; } = null!;
}

public class CompanyAllocationItemDto
{
    public Guid InternshipId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentCode { get; set; } = null!;
    public string StudentName { get; set; } = null!;
    public string? Class { get; set; }
    public string? Major { get; set; }
    public Guid? CompanyId { get; set; }
    public string? CompanyName { get; set; }
    public Guid? LecturerId { get; set; }
    public string? LecturerName { get; set; }
    public string Status { get; set; } = null!;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class LecturerAssignmentImportResultDto
{
    public int TotalRows { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public IList<LecturerAssignmentImportErrorDto> Errors { get; set; } = new List<LecturerAssignmentImportErrorDto>();
}

public class LecturerAssignmentImportErrorDto
{
    public int RowNumber { get; set; }
    public string? StudentCode { get; set; }
    public string? StudentName { get; set; }
    public string? StaffCode { get; set; }
    public string? LecturerName { get; set; }
    public string Message { get; set; } = null!;
}

