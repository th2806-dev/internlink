namespace InternLink.Domain.Entities;

/// <summary>
/// A recruitment position offered by a company, optionally scoped to a semester.
/// One company can have many positions; each position tracks slots and hiring status.
/// </summary>
public class CompanyPosition : BaseEntity
{
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    /// <summary>Semester scope — null means the position is available across all semesters.</summary>
    public Guid? SemesterId { get; set; }
    public Semester? Semester { get; set; }

    /// <summary>Position title, e.g. "Backend Developer Intern".</summary>
    public string Title { get; set; } = null!;

    /// <summary>Job description.</summary>
    public string? Description { get; set; }

    /// <summary>Preferred major, e.g. "CNTT", "QTKD".</summary>
    public string? RequiredMajor { get; set; }

    /// <summary>Required skills (comma-separated or free text).</summary>
    public string? RequiredSkills { get; set; }

    /// <summary>Work location / branch.</summary>
    public string? Location { get; set; }

    /// <summary>Number of interns this position can accept.</summary>
    public int Slots { get; set; } = 1;

    /// <summary>Monthly stipend (VND), nullable.</summary>
    public decimal? Stipend { get; set; }

    /// <summary>Whether the position is currently accepting applications.</summary>
    public bool IsOpen { get; set; } = true;
}
