using InternLink.Domain.Common;

namespace InternLink.Domain.Entities;

public class Lecturer : BaseEntity, IDepartmentScoped
{
    public Guid? UserId { get; set; }
    public User? User { get; set; }

    public string StaffCode { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Department { get; set; }

    /// <summary>
    /// Department this lecturer belongs to (FK to Department entity).
    /// </summary>
    public Guid? DepartmentId { get; set; }
    public Department? DepartmentRef { get; set; }

    public ICollection<Internship> Internships { get; set; } = new List<Internship>();

    /// <summary>
    /// Semester memberships (imported/registered for a term).
    /// </summary>
    public ICollection<SemesterLecturer> SemesterLecturers { get; set; } = new List<SemesterLecturer>();

    public ICollection<AttendanceSession> AttendanceSessions { get; set; } = new List<AttendanceSession>();
}
