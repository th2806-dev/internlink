using InternLink.Domain.Common;

namespace InternLink.Domain.Entities;

public class LecturerSemesterSummary : BaseEntity
{
    public Guid SemesterId { get; set; }
    public Semester Semester { get; set; } = null!;
    public Guid LecturerId { get; set; }
    public Lecturer Lecturer { get; set; } = null!;
    public string Results { get; set; } = string.Empty;
    public string Difficulties { get; set; } = string.Empty;
    public string Recommendations { get; set; } = string.Empty;
    public string Conclusion { get; set; } = string.Empty;
}