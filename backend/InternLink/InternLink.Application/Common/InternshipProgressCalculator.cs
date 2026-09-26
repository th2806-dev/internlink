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
    /// Sinh viên đã hoàn thành đợt thực tập (để thống kê Word / danh sách chưa hoàn thành).
    /// Gồm status Graded/Completed, hoặc đã chốt đánh giá / đã có điểm thi (flow chấm điểm mới).
    /// </summary>
    public static bool IsInternshipFinished(InternshipStatus? status, Evaluation? evaluation)
    {
        if (status is InternshipStatus.Completed or InternshipStatus.Graded)
            return true;
        if (evaluation == null)
            return false;
        if (evaluation.IsFinalized)
            return true;
        return evaluation.OralExamScore.HasValue;
    }

    /// <summary>
    /// Tuần báo cáo tuần được yêu cầu cho tiến độ = các lịch trong
    /// «Cấu hình báo cáo» đang bật (<see cref="SemesterReportSchedule.IsSubmissionOpen"/>),
    /// loại trừ tuần báo cáo cuối kỳ (WeekNumber &gt; TotalWeeks).
    /// Nếu chưa có lịch tuần nào → fallback toàn bộ 1..TotalWeeks.
    /// </summary>
    public static IReadOnlyList<int> ResolveRequiredWeekNumbers(
        int totalWeeks,
        IEnumerable<SemesterReportSchedule>? schedules)
    {
        var maxWeekly = totalWeeks > 0 ? totalWeeks : 6;

        if (schedules == null)
            return Enumerable.Range(1, maxWeekly).ToList();

        var weeklySchedules = schedules
            .Where(s => !s.IsDeleted && s.WeekNumber >= 1 && s.WeekNumber <= maxWeekly)
            .ToList();

        if (weeklySchedules.Count == 0)
            return Enumerable.Range(1, maxWeekly).ToList();

        return weeklySchedules
            .Where(s => s.IsSubmissionOpen)
            .Select(s => s.WeekNumber)
            .Distinct()
            .OrderBy(w => w)
            .ToList();
    }

    /// <summary>
    /// Tính tiến độ thực tập:
    /// 1-3. Account / profile / company — thủ tục, 0%.
    /// 4. Report (80%): tỷ lệ báo cáo tuần đã nộp trên các tuần đang bật trong cấu hình deadline.
    /// 5. Evaluation (20%): đã có đánh giá / điểm cuối kỳ.
    /// </summary>
    public static ProgressBreakdownDto Calculate(
        User? user,
        Student student,
        Internship? internship,
        IEnumerable<WeeklyReport>? weeklyReports,
        Evaluation? evaluation,
        int? semesterTotalWeeks,
        IReadOnlyCollection<int>? requiredWeekNumbers = null)
    {
        int accountPercent = 0;
        int profilePercent = 0;
        int companyPercent = 0;

        int requiredWeeks;
        HashSet<int>? requiredSet = null;

        if (requiredWeekNumbers != null)
        {
            requiredSet = requiredWeekNumbers.ToHashSet();
            requiredWeeks = requiredSet.Count;
        }
        else
        {
            requiredWeeks = semesterTotalWeeks is > 0 ? semesterTotalWeeks.Value : 6;
        }

        int submittedReportsCount = 0;
        if (weeklyReports != null)
        {
            var submitted = weeklyReports.Where(r => !r.IsDeleted && r.Status != WeeklyReportStatus.Draft);

            if (requiredSet != null)
            {
                // Chỉ đếm tuần đang yêu cầu theo cấu hình; tuần đóng / tuần cuối kỳ không tính.
                submittedReportsCount = requiredSet.Count == 0
                    ? 0
                    : submitted.Count(r => requiredSet.Contains(r.WeekNumber));
            }
            else
            {
                var maxWeekly = semesterTotalWeeks is > 0 ? semesterTotalWeeks.Value : int.MaxValue;
                submittedReportsCount = submitted.Count(r => r.WeekNumber >= 1 && r.WeekNumber <= maxWeekly);
            }
        }

        int reportPercent = 0;
        if (requiredWeeks == 0)
        {
            // Không có tuần báo cáo tuần nào được bật → phần báo cáo coi như không yêu cầu.
            reportPercent = MaxReportPercent;
        }
        else if (submittedReportsCount > 0)
        {
            double ratio = Math.Min(1.0, (double)submittedReportsCount / requiredWeeks);
            reportPercent = (int)Math.Round(ratio * MaxReportPercent);
        }

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
            summaryText = requiredWeeks == 0
                ? "Không có tuần báo cáo tuần được cấu hình"
                : "Chưa có báo cáo tuần";
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
