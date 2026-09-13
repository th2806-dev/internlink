namespace InternLink.Application.DTOs;

/// <summary>
/// DTO for retrieving department details.
/// </summary>
public class DepartmentDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    /// <summary>Number of users (admin/lecturer/student) currently in this department.</summary>
    public int UserCount { get; set; }
    /// <summary>Number of students in this department.</summary>
    public int StudentCount { get; set; }
    /// <summary>Number of lecturers in this department.</summary>
    public int LecturerCount { get; set; }
    /// <summary>Number of active semesters for this department.</summary>
    public int SemesterCount { get; set; }
}
