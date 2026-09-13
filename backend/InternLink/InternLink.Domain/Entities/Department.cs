namespace InternLink.Domain.Entities;

/// <summary>
/// Academic department (khoa). Each department has its own admin, students, lecturers, and semesters.
/// SuperAdmin (DepartmentId = null) sees all departments.
/// DepartmentAdmin sees only their assigned department.
/// </summary>
public class Department : BaseEntity
{
    /// <summary>
    /// Short code, e.g. "CNTT", "QTKD", "KT".
    /// </summary>
    public string Code { get; set; } = null!;

    /// <summary>
    /// Full name, e.g. "Khoa Công nghệ Thông tin".
    /// </summary>
    public string Name { get; set; } = null!;

    /// <summary>
    /// Optional description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Whether this department is active in the system.
    /// </summary>
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Student> Students { get; set; } = new List<Student>();
    public ICollection<Lecturer> Lecturers { get; set; } = new List<Lecturer>();
}
