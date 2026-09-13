using System;
using InternLink.Domain.Enums;

namespace InternLink.Application.DTOs;

public class SemesterDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string Term { get; set; } = null!;
    public string AcademicYear { get; set; } = null!;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public SemesterStatus Status { get; set; }
    public string? Description { get; set; }
    public int MaxStudentsPerLecturer { get; set; }
    public int TotalWeeks { get; set; } = 6;
    public int StudentsCount { get; set; }
    public int LecturersCount { get; set; }
    public int PlacedStudents { get; set; }
    public int CompaniesCount { get; set; }
    public int ProgressPercent { get; set; }
    public string CurrentPhase { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    /// <summary>Department owning this semester (null = shared/global).</summary>
    public Guid? DepartmentId { get; set; }
}

public class CreateSemesterDto
{
    public string Name { get; set; } = null!;
    public string Term { get; set; } = null!;
    public string AcademicYear { get; set; } = null!;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public SemesterStatus Status { get; set; } = SemesterStatus.Upcoming;
    public string? Description { get; set; }
    public int MaxStudentsPerLecturer { get; set; } = 30;
    public int TotalWeeks { get; set; } = 6;
    public int TargetStudents { get; set; } = 0;
    /// <summary>Department owning this semester. SuperAdmin may set it; DepartmentAdmin is forced to their own.</summary>
    public Guid? DepartmentId { get; set; }
}

public class UpdateSemesterDto
{
    public string? Name { get; set; }
    public string? Term { get; set; }
    public string? AcademicYear { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public SemesterStatus? Status { get; set; }
    public string? Description { get; set; }
    public int? MaxStudentsPerLecturer { get; set; }
    public int? TotalWeeks { get; set; }
}
