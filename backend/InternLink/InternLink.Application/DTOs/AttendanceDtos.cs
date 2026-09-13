namespace InternLink.Application.DTOs;

public class AttendanceRecordDto
{
    public Guid Id { get; set; }
    public Guid AttendanceSessionId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string StudentCode { get; set; } = string.Empty;
    public string? Class { get; set; }
    public string? Major { get; set; }
    public Guid? InternshipId { get; set; }
    public string? CompanyName { get; set; }
    public string Status { get; set; } = "Present";
    public string? Notes { get; set; }
    public DateTime? MarkedAt { get; set; }
    public string? MarkedBy { get; set; }
}

public class AttendanceSessionDto
{
    public Guid Id { get; set; }
    public Guid SemesterId { get; set; }
    public string SemesterName { get; set; } = string.Empty;
    public Guid LecturerId { get; set; }
    public string LecturerName { get; set; } = string.Empty;
    public int WeekNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime MeetingDate { get; set; }
    public int? DurationMinutes { get; set; }
    public string? Location { get; set; }
    public string Status { get; set; } = "Scheduled";
    public int TotalStudents { get; set; }
    public int PresentCount { get; set; }
    public int AbsentCount { get; set; }
    public double AttendanceRate { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AttendanceSessionDetailDto : AttendanceSessionDto
{
    public List<AttendanceRecordDto> Records { get; set; } = new();
}

public class CreateAttendanceSessionDto
{
    public Guid SemesterId { get; set; }
    public int WeekNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime MeetingDate { get; set; }
    public int? DurationMinutes { get; set; } = 60;
    public string? Location { get; set; }
    public List<Guid>? StudentIds { get; set; }
}

public class UpdateAttendanceSessionDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public DateTime? MeetingDate { get; set; }
    public int? DurationMinutes { get; set; }
    public string? Location { get; set; }
    public string? Status { get; set; }
}

public class MarkAttendanceDto
{
    public List<MarkStudentAttendanceItemDto> Records { get; set; } = new();
}

public class MarkStudentAttendanceItemDto
{
    public Guid StudentId { get; set; }
    public string Status { get; set; } = "Present";
    public string? Notes { get; set; }
}

public class StudentAttendanceOverviewDto
{
    public int TotalSessions { get; set; }
    public int PresentCount { get; set; }
    public int AbsentCount { get; set; }
    public double AttendanceRate { get; set; }
    public List<StudentAttendanceItemDto> Sessions { get; set; } = new();
}

public class StudentAttendanceItemDto
{
    public Guid SessionId { get; set; }
    public int WeekNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime MeetingDate { get; set; }
    public int? DurationMinutes { get; set; }
    public string? Location { get; set; }
    public string LecturerName { get; set; } = string.Empty;
    public string Status { get; set; } = "Present";
    public string? Notes { get; set; }
    public DateTime? MarkedAt { get; set; }
}

public class AdminAttendanceReportDto
{
    public Guid SemesterId { get; set; }
    public string SemesterName { get; set; } = string.Empty;
    public int TotalSessions { get; set; }
    public int TotalStudents { get; set; }
    public double OverallAttendanceRate { get; set; }
    public int HighAbsentStudentsCount { get; set; }
    public List<StudentAbsentSummaryDto> TopAbsentees { get; set; } = new();
    public List<AttendanceSessionDto> Sessions { get; set; } = new();
}

public class StudentAbsentSummaryDto
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string StudentCode { get; set; } = string.Empty;
    public string? Class { get; set; }
    public string? LecturerName { get; set; }
    public int TotalSessions { get; set; }
    public int AbsentCount { get; set; }
    public double AbsentRate { get; set; }
}
