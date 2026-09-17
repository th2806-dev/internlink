namespace InternLink.Application.DTOs;

/// <summary>
/// DTO for creating a new company
/// </summary>
public class CreateCompanyRequest
{
    public string? CompanyCode { get; set; }
    public string CompanyName { get; set; } = null!;
    public string? Address { get; set; }
    public string? Website { get; set; }
    public string? Industry { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public int? Capacity { get; set; }
}

/// <summary>
/// DTO for updating an existing company
/// </summary>
public class UpdateCompanyRequest
{
    public string? CompanyCode { get; set; }
    public string CompanyName { get; set; } = null!;
    public string? Address { get; set; }
    public string? Website { get; set; }
    public string? Industry { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public int? Capacity { get; set; }
    public bool? IsActive { get; set; }
}

/// <summary>
/// DTO for retrieving company details (with full information)
/// </summary>
public class CompanyDto
{
    public Guid Id { get; set; }
    public string? CompanyCode { get; set; }
    public string CompanyName { get; set; } = null!;
    public string? Address { get; set; }
    public string? Website { get; set; }
    public string? Industry { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public int? Capacity { get; set; }
    public bool IsActive { get; set; }
    /// <summary>Number of internships hosted by the company (optionally scoped to the selected semester).</summary>
    public int StudentCount { get; set; }
    /// <summary>Number of active open positions currently offered.</summary>
    public int OpenPositionCount { get; set; }
    /// <summary>
    /// Link status for the requested semester. Null when no semester context.
    /// False = "ngưng liên kết" for that term (hidden from new assignments).
    /// </summary>
    public bool? IsSemesterLinked { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>Request body for linking/unlinking a company in a semester.</summary>
public class SetSemesterLinkRequest
{
    public bool IsLinked { get; set; }
}

/// <summary>
/// Admin company detail (master data + internships hosted + positions).
/// </summary>
public class AdminCompanyDetailDto
{
    public CompanyDto Company { get; set; } = null!;
    public IEnumerable<InternshipListItemDto> Internships { get; set; } = Array.Empty<InternshipListItemDto>();
    public IEnumerable<CompanyPositionDto> Positions { get; set; } = Array.Empty<CompanyPositionDto>();
}

/// <summary>
/// Result of importing companies from an Excel file.
/// </summary>
public class CompanyImportResultDto
{
    public int TotalRows { get; set; }
    public int SuccessCount { get; set; }
    public int CreatedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int FailedCount { get; set; }
    public int SkippedDuplicateCount { get; set; }
    /// <summary>Recruitment positions created from Mã Vị Trí/Tên vị trí columns.</summary>
    public int PositionsCreatedCount { get; set; }
    /// <summary>Recruitment positions refreshed from Mã Vị Trí/Tên vị trí columns.</summary>
    public int PositionsUpdatedCount { get; set; }
    public IReadOnlyList<CompanyDto> CreatedCompanies { get; set; } = Array.Empty<CompanyDto>();
    public IReadOnlyList<CompanyDto> UpdatedCompanies { get; set; } = Array.Empty<CompanyDto>();
    public IReadOnlyList<CompanyImportErrorDto> Errors { get; set; } = Array.Empty<CompanyImportErrorDto>();
}

public class CompanyImportErrorDto
{
    public int RowNumber { get; set; }
    public string? CompanyCode { get; set; }
    public string? CompanyName { get; set; }
    public string Message { get; set; } = null!;
}

/// <summary>
/// Recruitment position offered by a company.
/// </summary>
public class CompanyPositionDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string? CompanyName { get; set; }
    public Guid? SemesterId { get; set; }
    /// <summary>External position code from the import Excel, e.g. "VT_FPT_01".</summary>
    public string? PositionCode { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? RequiredMajor { get; set; }
    public string? RequiredSkills { get; set; }
    public string? Location { get; set; }
    public int Slots { get; set; } = 1;
    public int FilledSlots { get; set; }
    public decimal? Stipend { get; set; }
    public bool IsOpen { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Request to create a new recruitment position.
/// </summary>
public class CreateCompanyPositionRequest
{
    public Guid? SemesterId { get; set; }
    /// <summary>External position code from the import Excel, e.g. "VT_FPT_01".</summary>
    public string? PositionCode { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? RequiredMajor { get; set; }
    public string? RequiredSkills { get; set; }
    public string? Location { get; set; }
    public int Slots { get; set; } = 1;
    public decimal? Stipend { get; set; }
    public bool IsOpen { get; set; } = true;
}

/// <summary>
/// Request to update an existing recruitment position.
/// </summary>
public class UpdateCompanyPositionRequest
{
    public Guid? SemesterId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? RequiredMajor { get; set; }
    public string? RequiredSkills { get; set; }
    public string? Location { get; set; }
    public int Slots { get; set; } = 1;
    public decimal? Stipend { get; set; }
    public bool IsOpen { get; set; } = true;
}

/// <summary>
/// Company suggestion with match score and breakdown for student assignment.
/// </summary>
public class CompanySuggestionDto
{
    public Guid CompanyId { get; set; }
    public string CompanyName { get; set; } = null!;
    public string? Industry { get; set; }
    public string? Address { get; set; }
    public int Capacity { get; set; }
    public int CurrentStudentCount { get; set; }
    public int AvailableSlots { get; set; }
    public double MatchScore { get; set; }
    public string MatchReason { get; set; } = null!;
    public IEnumerable<CompanyPositionDto> OpenPositions { get; set; } = Array.Empty<CompanyPositionDto>();
}

/// <summary>
/// Request to suggest matching companies for a student or criteria.
/// </summary>
public class CompanySuggestionRequest
{
    public Guid SemesterId { get; set; }
    public Guid? StudentId { get; set; }
    public string? PreferredIndustry { get; set; }
    public string? PreferredLocation { get; set; }
    public int MaxResults { get; set; } = 10;
}

