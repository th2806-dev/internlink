namespace InternLink.Application.DTOs;

public sealed class StudentPortalProfileDto
{
    public StudentDto Student { get; set; } = null!;
    public InternshipDto? Internship { get; set; }
    public string? LecturerName { get; set; }
    public int ProgressPercent { get; set; }
    public ProgressBreakdownDto? ProgressBreakdown { get; set; }
}
