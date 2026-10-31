namespace InternLink.Application.DTOs.Export;

/// <summary>
/// DTO representing a single student internship record in Sheet 1 (DANH SÁCH THỰC TẬP).
/// </summary>
public class InternshipStudentExportDto
{
    public int Stt { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string Ho { get; set; } = string.Empty;
    public string Ten { get; set; } = string.Empty;
    public string Lop { get; set; } = string.Empty;
    public string PhuTrachCongTy { get; set; } = string.Empty;
    public string GvHuongDan { get; set; } = string.Empty;
    public string GhiChu { get; set; } = string.Empty;

    // Scores
    public decimal? DiemThamGia { get; set; }
    public decimal? DiemQT { get; set; }
    public decimal? Thi { get; set; }

    // Guidance & Progress
    public string HdChung { get; set; } = string.Empty;
    public string Tuan1 { get; set; } = string.Empty;
    public string Tuan2 { get; set; } = string.Empty;
    public string Tuan3 { get; set; } = string.Empty;
    public string Tuan4 { get; set; } = string.Empty;
    public string Tuan5 { get; set; } = string.Empty;
    public string Tuan6 { get; set; } = string.Empty;
    public List<string> WeeklyReportCells { get; set; } = new();

    // Report Submission ("Đã nộp" or "X" if missing/unsubmitted)
    public string NopBc { get; set; } = string.Empty;

    /// <summary>
    /// True khi vắng >= 2 buổi bắt buộc, trường hợp duy nhất làm điểm trung bình bằng 0.
    /// </summary>
    public bool IsDisqualifiedByAbsence { get; set; }
}
