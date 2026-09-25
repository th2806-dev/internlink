using InternLink.Domain.Enums;

namespace InternLink.Domain.Entities;

public class Internship : BaseEntity
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;

    /// <summary>
    /// Company can be null initially (assigned later by lecturer)
    /// </summary>
    public Guid? CompanyId { get; set; }
    public Company? Company { get; set; }

    public Guid? LecturerId { get; set; }
    public Lecturer? Lecturer { get; set; }

    /// <summary>
    /// Thời điểm được phân công giảng viên gần nhất (đề xuất P2: tách khỏi UpdatedAt —
    /// UpdatedAt đổi khi sửa bất kỳ trường nào, không phản ánh "Ngày phân công").
    /// </summary>
    public DateTime? AssignedAt { get; set; }

    public Guid? SemesterId { get; set; }
    public Semester? Semester { get; set; }

    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public InternshipStatus Status { get; set; } = InternshipStatus.NotStarted;
    public string? Position { get; set; }
    public string? SupervisorName { get; set; }
    public string? Notes { get; set; }

    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
    public ICollection<WeeklyReport> WeeklyReports { get; set; } = new List<WeeklyReport>();
    public ICollection<Document> Documents { get; set; } = new List<Document>();
}
