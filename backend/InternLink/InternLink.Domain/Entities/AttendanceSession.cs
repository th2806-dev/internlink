using InternLink.Domain.Enums;

namespace InternLink.Domain.Entities;

public class AttendanceSession : BaseEntity
{
    public Guid SemesterId { get; set; }
    public Semester Semester { get; set; } = null!;

    public Guid LecturerId { get; set; }
    public Lecturer Lecturer { get; set; } = null!;

    public int WeekNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime MeetingDate { get; set; }
    public int? DurationMinutes { get; set; } = 60;
    public string? Location { get; set; }
    public AttendanceSessionStatus Status { get; set; } = AttendanceSessionStatus.Scheduled;

    public ICollection<AttendanceRecord> Records { get; set; } = new List<AttendanceRecord>();
}
