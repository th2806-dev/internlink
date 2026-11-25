namespace InternLink.Domain.Entities;

/// <summary>
/// Links a company to a semester for that term's partner roster.
/// Companies are master data (imported once globally); per semester an admin
/// can mark a company as "ngưng liên kết" (IsActive = false) so it no longer
/// appears for new assignments in that term, while existing internships keep
/// showing. Absence of a row means the company is linked by default.
/// </summary>
public class SemesterCompany : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Guid SemesterId { get; set; }
    public Semester Semester { get; set; } = null!;

    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    /// <summary>false = "Ngưng liên kết" for this semester.</summary>
    public bool IsActive { get; set; } = true;
}