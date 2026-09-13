using InternLink.Application.DTOs;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;

namespace InternLink.Application.Common;

public static class InternshipProgressCalculator
{
    public const int MaxAccountPercent = 10;
    public const int MaxProfilePercent = 15;
    public const int MaxCompanyPercent = 20;
    public const int MaxReportPercent = 35;
    public const int MaxEvaluationPercent = 20;

    /// <summary>
    /// Tính toán chi tiết tiến độ thực tập dựa trên 5 nguồn dữ liệu thực tế:
    /// 1. Account (10%): Đã kích hoạt và đăng nhập / đổi mật khẩu
    /// 2. Profile (15%): Đã cập nhật đầy đủ hồ sơ (SĐT, Khoa, Nguyện vọng / Kỹ năng / CV)
    /// 3. Company (20%): Đã được phân bổ vào doanh nghiệp
    /// 4. Report (35%): Tỷ lệ báo cáo tuần đã nộp (Submitted, Approved, RevisionSubmitted) / số tuần yêu cầu
    /// 5. Evaluation (20%): Đã hoàn tất đánh giá cuối kỳ (IsFinalized == true hoặc có FinalGrade)
    /// </summary>
    public static ProgressBreakdownDto Calculate(
        User? user,
        Student student,
        Internship? internship,
        IEnumerable<WeeklyReport>? weeklyReports,
        Evaluation? evaluation,
        int? semesterTotalWeeks)
    {
        // 1. Account Progress (10%)
        // Chỉ tính điểm khi tài khoản đã được kích hoạt và người dùng đã thực sự đăng nhập hoặc đổi pass.
        // Nếu user == null hoặc (user.LastLoginAt == null && user.MustChangePassword), sinh viên chưa từng đăng nhập -> 0%.
        int accountPercent = 0;
        if (user != null && (user.LastLoginAt.HasValue || !user.MustChangePassword))
        {
            accountPercent = MaxAccountPercent;
        }

        // 2. Profile Progress (15%)
        // Cần có SĐT liên lạc và ít nhất 1 thông tin chuyên môn / nguyện vọng nâng cao.
        int profilePercent = 0;
        bool hasPhone = !string.IsNullOrWhiteSpace(student.Phone) && student.Phone != "—";
        bool hasSkillsOrPreferences = !string.IsNullOrWhiteSpace(student.DesiredPosition)
            || !string.IsNullOrWhiteSpace(student.Skills)
            || !string.IsNullOrWhiteSpace(student.ResumeUrl)
            || !string.IsNullOrWhiteSpace(student.Department)
            || !string.IsNullOrWhiteSpace(student.DesiredLocation);

        if (hasPhone && hasSkillsOrPreferences)
        {
            profilePercent = MaxProfilePercent;
        }
        else if (hasPhone || hasSkillsOrPreferences)
        {
            // Điền một phần hồ sơ
            profilePercent = 8;
        }

        // 3. Company Progress (20%)
        // Đã được phân bổ vào doanh nghiệp tiếp nhận thực tập
        int companyPercent = 0;
        if (internship != null && internship.CompanyId.HasValue)
        {
            companyPercent = MaxCompanyPercent;
        }

        // 4. Report Progress (35%)
        // Chỉ tính các báo cáo tuần không bị xóa và đã nộp (Status: Submitted, Approved, RevisionSubmitted).
        // Báo cáo Draft tuyệt đối không tính.
        int reportPercent = 0;
        int requiredWeeks = semesterTotalWeeks.HasValue && semesterTotalWeeks.Value > 0
            ? semesterTotalWeeks.Value
            : 6;

        int submittedReportsCount = 0;
        if (weeklyReports != null)
        {
            submittedReportsCount = weeklyReports.Count(r => !r.IsDeleted && r.Status != WeeklyReportStatus.Draft);
        }

        if (requiredWeeks > 0 && submittedReportsCount > 0)
        {
            double ratio = Math.Min(1.0, (double)submittedReportsCount / requiredWeeks);
            reportPercent = (int)Math.Round(ratio * MaxReportPercent);
        }

        // 5. Evaluation Progress (20%)
        // Đã hoàn tất đánh giá cuối kỳ
        int evaluationPercent = 0;
        bool isInternshipCompleted = internship != null && (
            internship.Status == InternshipStatus.Completed ||
            internship.Status == InternshipStatus.Graded);

        if (isInternshipCompleted || (evaluation != null && (evaluation.IsFinalized || evaluation.FinalGrade > 0)))
        {
            evaluationPercent = MaxEvaluationPercent;
        }

        int totalPercent = Math.Clamp(
            accountPercent + profilePercent + companyPercent + reportPercent + evaluationPercent,
            0,
            100);

        string summaryText;
        if (totalPercent >= 100)
        {
            summaryText = "Hoàn thành toàn bộ thực tập";
        }
        else if (evaluationPercent > 0)
        {
            summaryText = "Đã đánh giá cuối kỳ";
        }
        else if (reportPercent > 0)
        {
            summaryText = $"Đã nộp {submittedReportsCount}/{requiredWeeks} tuần báo cáo";
        }
        else if (companyPercent > 0)
        {
            summaryText = "Đã phân bổ doanh nghiệp thực tập";
        }
        else if (profilePercent > 0)
        {
            summaryText = "Đã hoàn thiện hồ sơ & nguyện vọng";
        }
        else if (accountPercent > 0)
        {
            summaryText = "Tài khoản đã kích hoạt";
        }
        else
        {
            summaryText = "Chưa kích hoạt tài khoản";
        }

        return new ProgressBreakdownDto
        {
            AccountPercent = accountPercent,
            ProfilePercent = profilePercent,
            CompanyPercent = companyPercent,
            ReportPercent = reportPercent,
            EvaluationPercent = evaluationPercent,
            TotalPercent = totalPercent,
            SubmittedReportsCount = submittedReportsCount,
            RequiredWeeksCount = requiredWeeks,
            SummaryText = summaryText
        };
    }
}
