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
    public bool IsLecturerOnly { get; set; }

    /// <summary>
    /// Buổi HƯỚNG DẪN CHUNG (kiểu sinh hoạt lớp/khoa) — điểm danh PHỤ, không bắt buộc:
    /// vắng buổi này KHÔNG tính vào số buổi Vắng ảnh hưởng điều kiện dự thi
    /// (khác với buổi gặp tuần bắt buộc). Vẫn lưu điểm danh để hiển thị ở cột HD CHUNG.
    /// </summary>
    public bool IsGeneralSession { get; set; }

    public ICollection<AttendanceRecord> Records { get; set; } = new List<AttendanceRecord>();
}
