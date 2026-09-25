using InternLink.Domain.Common;

namespace InternLink.Domain.Entities;

/// <summary>
/// Nội dung soạn thảo báo cáo tổng kết công tác thực tập cấp KHOA cho một học kỳ.
/// Tách khỏi LecturerSemesterSummary (theo giảng viên) để admin khoa lưu/phát hành
/// báo cáo của toàn khoa và hệ thống inject vào template Word C22A khi admin xuất.
/// DepartmentId = null nghĩa là báo cáo toàn hệ thống (SuperAdmin).
/// </summary>
public class SemesterFacultySummary : BaseEntity
{
    public Guid SemesterId { get; set; }
    public Semester Semester { get; set; } = null!;

    /// <summary>Khoa sở hữu báo cáo. Null = báo cáo toàn hệ thống (SuperAdmin).</summary>
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }

    public string Results { get; set; } = string.Empty;
    public string Difficulties { get; set; } = string.Empty;
    public string Recommendations { get; set; } = string.Empty;
    public string Conclusion { get; set; } = string.Empty;
}
