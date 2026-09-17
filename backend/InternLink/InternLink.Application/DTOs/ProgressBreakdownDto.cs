namespace InternLink.Application.DTOs;

public sealed class ProgressBreakdownDto
{
    /// <summary>
    /// Thủ tục tài khoản; không cộng vào tiến độ (0%).
    /// </summary>
    public int AccountPercent { get; set; }

    /// <summary>
    /// Thủ tục hồ sơ; không cộng vào tiến độ (0%).
    /// </summary>
    public int ProfilePercent { get; set; }

    /// <summary>
    /// Điều kiện phân bổ doanh nghiệp; không cộng vào tiến độ (0%).
    /// </summary>
    public int CompanyPercent { get; set; }

    /// <summary>
    /// Tiến độ nộp báo cáo tuần theo thời khóa biểu học kỳ (tối đa 80%).
    /// </summary>
    public int ReportPercent { get; set; }

    /// <summary>
    /// Tiêu chí 5: Đánh giá và chấm điểm cuối kỳ từ giảng viên (tối đa 20%)
    /// </summary>
    public int EvaluationPercent { get; set; }

    /// <summary>
    /// Tổng điểm tiến độ thực tế (0 - 100%)
    /// </summary>
    public int TotalPercent { get; set; }

    /// <summary>
    /// Số tuần báo cáo đã nộp hoặc được duyệt (Submitted, Approved, RevisionSubmitted)
    /// </summary>
    public int SubmittedReportsCount { get; set; }

    /// <summary>
    /// Tổng số tuần yêu cầu của học kỳ
    /// </summary>
    public int RequiredWeeksCount { get; set; }

    /// <summary>
    /// Tóm tắt trạng thái tiến độ hiển thị trực quan
    /// </summary>
    public string SummaryText { get; set; } = string.Empty;
}
