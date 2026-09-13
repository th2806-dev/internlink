using InternLink.Domain.Common;

namespace InternLink.Domain.Entities;

public class Student : BaseEntity, IDepartmentScoped
{
    public Guid? UserId { get; set; }
    public User? User { get; set; }

    public string StudentCode { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string? Class { get; set; }
    public string? Major { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }

    public string? Department { get; set; }
    public string? DesiredPosition { get; set; }
    public string? AlternativePosition { get; set; }
    public string? DesiredLocation { get; set; }
    public string? WorkPreference { get; set; }
    public string? PreferredIndustry { get; set; }
    public string? Skills { get; set; }
    public string? ResumeUrl { get; set; }

    /// <summary>
    /// Department this student belongs to.
    /// </summary>
    public Guid? DepartmentId { get; set; }
    public Department? DepartmentRef { get; set; }

    /// <summary>
    /// Collection of internships across multiple semesters
    /// One student can have multiple internships (1:N per semester)
    /// </summary>
    public ICollection<Internship> Internships { get; set; } = new List<Internship>();

    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
}
