namespace InternLink.Domain.Entities;

public class SchoolAcademicTerm : BaseEntity
{
    public string AcademicYear { get; set; } = null!;
    public string Term { get; set; } = null!;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}