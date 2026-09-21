using InternLink.Application.Common;

namespace InternLink.Application.DTOs;

/// <summary>Trạng thái nộp 1 tuần: on_time | late | missing | pending</summary>
public class InternshipWeekStatusDto
{
    public int WeekNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime? StartDate { get; set; }
    public DateTime? Deadline { get; set; }
    public DateTime? SubmittedAt { get; set; }
    /// <summary>Trạng thái nộp báo cáo tuần: on_time | late | missing | pending</summary>
    public string Status { get; set; } = "pending";
    /// <summary>Điểm danh buổi hẹn tuần đó (nguồn sự thật: trang Điểm danh): present | absent | no_session</summary>
    public string AttendanceStatus { get; set; } = "no_session";
    public bool IsAttendanceAbsent { get; set; }
}

/// <summary>Chi tiết điểm 1 sinh viên theo đúng các cột Excel A→U.</summary>
public class InternshipStudentGradeDto
{
    public Guid StudentId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;

    // Cột E-H: đếm
    public int MissingCount { get; set; }
    public int LateCount { get; set; }
    public int AbsentCount { get; set; }

    // Cột I: Điểm QT
    public decimal SubmissionScore { get; set; }
    public decimal PunctualityScore { get; set; }
    public decimal? QualityScore { get; set; }
    public bool HasCreativeProduct { get; set; }
    public decimal ProcessScore { get; set; }

    // Cột J-K: Thi & TB
    public decimal? OralExamScore { get; set; }
    public decimal? AverageScore { get; set; }

    // Cột L: Xếp loại
    public string Classification { get; set; } = string.Empty;

    // Cột M-T: chi tiết T1..T6 + NỘP BC
    public List<InternshipWeekStatusDto> Weeks { get; set; } = new();
    public string FinalReportStatus { get; set; } = "pending"; // on_time | late | missing | pending
    public bool FinalReportSubmitted => FinalReportStatus != "missing" && FinalReportStatus != "pending";

    // Cột U: điều kiện dự thi
    public bool IsEligible { get; set; }
    public List<string> IneligibleReasons { get; set; } = new();
}

public class InternshipSummaryResponseDto
{
    public Guid SemesterId { get; set; }
    public string SemesterName { get; set; } = string.Empty;
    public List<InternshipWeekStatusDto> Schedule { get; set; } = new(); // khung 6 tuần + cuối kỳ
    public List<InternshipStudentGradeDto> Students { get; set; } = new();
    public DateTime GeneratedAt { get; set; }
}

/// <summary>Body lưu điểm cho 1 sinh viên (Cụm 1/2 màn hình 2 + cột J màn hình 4).</summary>
public class SaveInternshipGradeRequestDto
{
    public Guid StudentId { get; set; }
    /// <summary>1 trong 5 mức rubric: 1.0 / 2.0 / 3.5 / 4.0 / 5.0 (null = chưa chấm).</summary>
    public decimal? QualityScore { get; set; }
    public bool HasCreativeProduct { get; set; }
    /// <summary>Cột J — Điểm thi vấn đáp nhập tay (thang 10).</summary>
    public decimal? OralExamScore { get; set; }
    public string? Note { get; set; }
}
