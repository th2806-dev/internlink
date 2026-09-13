namespace InternLink.Application.DTOs;

/// <summary>
/// Pagination query parameters
/// </summary>
public class PaginationRequest
{
    /// <summary>
    /// Number of records to skip (default: 0)
    /// </summary>
    public int Skip { get; set; } = 0;

    /// <summary>
    /// Number of records to take (default: 100, max: 1000)
    /// </summary>
    public int Take { get; set; } = 100;
}

/// <summary>
/// Student filtering query parameters
/// </summary>
public class StudentFilterRequest : PaginationRequest
{
    /// <summary>
    /// Filter by class
    /// </summary>
    public string? Class { get; set; }

    /// <summary>
    /// Filter by major
    /// </summary>
    public string? Major { get; set; }

    /// <summary>
    /// Search by name or student number (contains match)
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Optional department filter for SuperAdmin narrowing the view to one department.
    /// DepartmentAdmins are always re-scoped to their own department server-side.
    /// </summary>
    public Guid? DepartmentId { get; set; }
}

/// <summary>
/// Company filtering query parameters
/// </summary>
public class CompanyFilterRequest : PaginationRequest
{
    /// <summary>
    /// Filter by industry
    /// </summary>
    public string? Industry { get; set; }

    /// <summary>
    /// Filter by active status
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// Search by name or contact name (contains match)
    /// </summary>
    public string? SearchTerm { get; set; }
}

public class WeeklyReportFilterRequest : PaginationRequest
{
    public Guid? SemesterId { get; set; }
    public string? Status { get; set; }
    public string? SearchTerm { get; set; }
}

/// <summary>
/// Generic paginated response wrapper
/// </summary>
public class PaginatedResponse<T>
{
    /// <summary>
    /// The data items
    /// </summary>
    public IEnumerable<T> Items { get; set; } = Array.Empty<T>();

    /// <summary>
    /// Total number of items (before pagination)
    /// </summary>
    public int Total { get; set; }

    /// <summary>
    /// Number of items skipped
    /// </summary>
    public int Skip { get; set; }

    /// <summary>
    /// Number of items taken
    /// </summary>
    public int Take { get; set; }

    /// <summary>
    /// Total number of pages
    /// </summary>
    public int TotalPages => (Total + Take - 1) / Take;

    /// <summary>
    /// Current page number (1-based)
    /// </summary>
    public int CurrentPage => (Skip / Take) + 1;
}
