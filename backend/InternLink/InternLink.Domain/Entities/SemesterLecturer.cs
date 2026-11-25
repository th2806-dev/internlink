namespace InternLink.Domain.Entities;

/// <summary>
/// Links a lecturer to a semester (e.g. imported/registered for that term)
/// so a semester's lecturer roster is known even before students are assigned.
/// </summary>
public class SemesterLecturer : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Guid SemesterId { get; set; }
    public Semester Semester { get; set; } = null!;

    public Guid LecturerId { get; set; }
    public Lecturer Lecturer { get; set; } = null!;
}
