namespace InternLink.Domain.Entities;

public class SchoolAcademicTerm : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public string AcademicYear { get; set; } = null!;
    public string Term { get; set; } = null!;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}