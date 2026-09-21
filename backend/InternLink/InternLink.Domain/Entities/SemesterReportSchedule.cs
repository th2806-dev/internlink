using InternLink.Domain.Enums;

namespace InternLink.Domain.Entities;

public class SemesterReportSchedule : BaseEntity
{
    public Guid SemesterId { get; set; }
    public Semester Semester { get; set; } = null!;

    public int WeekNumber { get; set; }
    public string Title { get; set; } = null!;

    /// <summary>
    /// Ngày mở nộp báo cáo (start_date). Null = kế thừa tuần kế trước / mặc định của kỳ.
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// Hạn chót nộp báo cáo (deadline).
    /// </summary>
    public DateTime DueDate { get; set; }

    /// <summary>
    /// Toggle kích hoạt bài nộp cho kỳ báo cáo này (cấu hình màn hình 1).
    /// </summary>
    public bool IsSubmissionOpen { get; set; } = true;

    public bool AllowLateSubmission { get; set; } = true;
    public string? Description { get; set; }
}
