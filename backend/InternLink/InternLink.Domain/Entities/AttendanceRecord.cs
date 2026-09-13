using InternLink.Domain.Enums;

namespace InternLink.Domain.Entities;

public class AttendanceRecord : BaseEntity
{
    public Guid AttendanceSessionId { get; set; }
    public AttendanceSession AttendanceSession { get; set; } = null!;

    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;

    public Guid? InternshipId { get; set; }
    public Internship? Internship { get; set; }

    public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
    public string? Notes { get; set; }
    public DateTime? MarkedAt { get; set; }
    public string? MarkedBy { get; set; }
}
