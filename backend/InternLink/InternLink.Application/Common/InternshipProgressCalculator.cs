using InternLink.Application.DTOs;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;

namespace InternLink.Application.Common;

public static class InternshipProgressCalculator
{
    // Account, profile, and company assignment are prerequisites, not progress.
    public const int MaxAccountPercent = 0;
    public const int MaxProfilePercent = 0;
    public const int MaxCompanyPercent = 0;
    public const int MaxReportPercent = 80;
    public const int MaxEvaluationPercent = 20;

    /// <summary>
    /// Tính toán chi tiết tiến độ thực tập dựa trên 5 nguồn dữ liệu thực tế:
    /// 1-3. Account, profile, and company assignment are procedural prerequisites and contribute 0%.
    /// 4. Report (80%): Tỷ lệ báo cáo tuần đã nộp / số tuần yêu cầu.
    /// 5. Evaluation (20%): Đã hoàn tất đánh giá cuối kỳ.
    /// </summary>
    public static ProgressBreakdownDto Calculate(
        User? user,
        Student student,
        Internship? internship,
        IEnumerable<WeeklyReport>? weeklyReports,
        Evaluation? evaluation,
        int? semesterTotalWeeks)
    {
        // Account activation is a prerequisite only; it does not advance internship progress.
        int accountPercent = 0;

        // Profile completion is a prerequisite only; it does not advance internship progress.
        int profilePercent = 0;

        // Company assignment is a prerequisite only; it does not advance internship progress.
        int companyPercent = 0;

        // Report Progress (80%)
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
        else
        {
            summaryText = "Chưa có báo cáo tuần";
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
