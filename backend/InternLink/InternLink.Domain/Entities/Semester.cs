using InternLink.Domain.Common;
using InternLink.Domain.Enums;

namespace InternLink.Domain.Entities;

public class Semester : BaseEntity, IDepartmentScoped
{
    public string Name { get; set; } = null!;
    public string Term { get; set; } = null!; // "Học kỳ I", "Học kỳ II", "Học kỳ Hè"
    public string AcademicYear { get; set; } = null!; // "2025 - 2026"
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public SemesterStatus Status { get; set; } = SemesterStatus.Upcoming;
    public string? Description { get; set; }
    public int MaxStudentsPerLecturer { get; set; } = 30;
    public int TotalWeeks { get; set; } = 6;

    /// <summary>
    /// Tuần TUYỆT ĐỐI trong học kỳ của trường mà Tuần thực tập 1 bắt đầu.
    /// Thực tập là một học phần liên tiếp, ví dụ thực tập tuần 1..6 tương ứng
    /// tuần 14..19 của học kỳ ⇒ InternshipStartWeek = 14 (offset = 13).
    /// Giá trị 1 (mặc định) nghĩa là không lệch: tuần thực tập = tuần học kỳ.
    /// Tuần âm trong AttendanceSession (chuẩn bị) cũng quy đổi theo công thức này:
    /// tuần học kỳ = InternshipStartWeek + (tuần tương đối - 1) ⇒ 14 + (-3 - 1) = 10.
    /// </summary>
    public int InternshipStartWeek { get; set; } = 1;

    /// <summary>
    /// Department this semester belongs to.
    /// SuperAdmin-created semesters may be null (visible to all departments).
    /// </summary>
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }

    public ICollection<Internship> Internships { get; set; } = new List<Internship>();

    /// <summary>
    /// Lecturers imported/registered for this semester (before they are assigned students).
    /// </summary>
    public ICollection<SemesterLecturer> SemesterLecturers { get; set; } = new List<SemesterLecturer>();

    /// <summary>
    /// Partner companies linked to this semester (IsActive = false means "ngưng liên kết").
    /// Absence of a row means the company is linked by default.
    /// </summary>
    public ICollection<SemesterCompany> SemesterCompanies { get; set; } = new List<SemesterCompany>();

    /// <summary>
    /// The evaluation rubric configured for this semester (at most one)
    /// </summary>
    public EvaluationRubric? EvaluationRubric { get; set; }

    /// <summary>
    /// Weekly report schedules and deadlines configured for this semester
    /// </summary>
    public ICollection<SemesterReportSchedule> ReportSchedules { get; set; } = new List<SemesterReportSchedule>();

    /// <summary>
    /// Attendance and meeting sessions in this semester
    /// </summary>
    public ICollection<AttendanceSession> AttendanceSessions { get; set; } = new List<AttendanceSession>();
}
