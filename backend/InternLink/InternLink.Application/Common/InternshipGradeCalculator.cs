namespace InternLink.Application.Common;

/// <summary>
/// ============================================================================
/// CORE BUSINESS LOGIC (C# mirror của frontend/src/lib/gradingRules.ts)
/// Quy định chấm điểm — Module Quản lý Thực tập Doanh nghiệp:
///
/// ĐIỂM DANH và NỘP BÀI là HAI HỆ THỐNG ĐỘC LẬP:
///   - Nộp bài trễ/thiếu chỉ ảnh hưởng Điểm QT (không tính vắng).
///   - Vắng (V) chỉ được ghi nhận từ ĐIỂM DANH buổi hẹn tại trang Điểm danh.
///
/// Điểm QT = MIN(10, Nộp_Đủ(max 2) + Đúng_Hạn(max 2) + Chất_Lượng(max 5) + Sáng_Tạo(+1))
///   - Mức trừ bài thiếu/trễ được truyền từ quy chế điểm.
///   - Chất lượng: tổng mức rubric từng tuần chia cho tổng deadline tuần đang mở;
///     tuần chưa chấm được tính 0.
///   - Sáng tạo: +1.0 khi has_creative_product = true.
///
/// Điểm TB = ROUND(QT * trọng số QT + Thi * trọng số thi + điểm DN * trọng số DN, 1)
/// Trọng số mặc định: QT 0.4, thi 0.6, doanh nghiệp 0.
/// Không đủ điều kiện dự thi (vi phạm 1 trong 2):
///   1. Chưa nộp báo cáo cuối kỳ
///   2. Số buổi VẮNG theo điểm danh >= 2
///   → Chỉ khi vắng >= 2 buổi thì Điểm TB = 0, Xếp loại = "không thực tập".
///     Chưa nộp báo cáo cuối kỳ vẫn hiển thị Điểm TB tích lũy từ Điểm QT.
/// Xếp loại: >= 8.5 Xuất sắc | >= 8 Giỏi | >= 7 Khá | >= 6.5 Trung bình khá | >= 5 Trung bình | < 5 Không đạt
/// ============================================================================
/// </summary>
public static class InternshipGradeCalculator
{
    public const decimal SubmissionMax = 2.0m;
    public const decimal PunctualityMax = 2.0m;
    public const decimal QualityMax = 5.0m;
    public const decimal CreativeBonus = 1.0m;
    public const decimal StepPenalty = 0.5m;
    public const decimal MissingReportPenalty = 2.0m;
    public const decimal ProcessWeight = 0.4m;
    public const decimal OralWeight = 0.6m;
    public const int MaxAbsences = 2;

    /// <summary>Rubric chất lượng 5 mức theo thứ tự tăng dần.</summary>
    public static readonly decimal[] QualityLevels = { 1.0m, 2.0m, 3.5m, 4.0m, 5.0m };

    public const string IneligibleClassification = "không thực tập";
    public const string IneligibleCell = "Không đủ điều kiện";

    public const string ReasonNoFinalReport = "Chưa nộp báo cáo cuối kỳ";
    public const string ReasonAbsence = "Vắng buổi hẹn >= 2 buổi (theo điểm danh)";

    /// <summary>Làm tròn kiểu Excel ROUND (half away from zero) tới 1 chữ số.</summary>
    public static decimal Round1(decimal value) => Math.Round(value, 1, MidpointRounding.AwayFromZero);

    public static bool IsValidQualityLevel(decimal? level) =>
        level.HasValue && QualityLevels.Contains(level.Value);

    public static string Classify(decimal score, decimal minimumPassingScore = 5m) =>
        score < minimumPassingScore ? "Không đạt" :
        score >= 8.5m ? "Xuất sắc" :
        score >= 8.0m ? "Giỏi" :
        score >= 7.0m ? "Khá" :
        score >= 6.5m ? "Trung bình khá" :
        "Trung bình";

    public static (decimal Score4, string LetterGrade) ConvertToFourPointScale(decimal score)
    {
        var boundedScore = Math.Clamp(score, 0m, 10m);
        return boundedScore switch
        {
            >= 8.5m => (4.0m, "A"),
            >= 7.0m => (3.0m, "B"),
            >= 5.5m => (2.0m, "C"),
            >= 4.0m => (1.0m, "D"),
            _ => (0.0m, "F")
        };
    }
    /// <summary>
    /// Cột I — Điểm QT.
    /// missingCount/lateCount chỉ tính từ NỘP BÀI (không liên quan điểm danh).
    /// totalOpenWeeks: tổng deadline tuần đang mở; tuần chưa chấm được tính 0.
    /// </summary>
    public static decimal ComputeProcessScore(
        int missingCount, int lateCount, int submittedCount,
        IEnumerable<decimal?> weeklyQualityLevels, bool hasCreativeProduct, int totalOpenWeeks = 0,
        decimal missingReportPenalty = MissingReportPenalty,
        decimal lateReportPenalty = StepPenalty,
        int latePenaltyDays = 0,
        decimal latePenaltyPointsPerDay = 0m)
    {
        var submission = submittedCount > 0
            ? Math.Max(0m, SubmissionMax - missingCount * missingReportPenalty)
            : 0m;
        var punctuality = submittedCount > 0
            ? Math.Max(0m, PunctualityMax - (latePenaltyPointsPerDay > 0m
                ? latePenaltyDays * latePenaltyPointsPerDay
                : lateCount * lateReportPenalty))
            : 0m;

        var rated = weeklyQualityLevels?.Where(l => IsValidQualityLevel(l)).Select(l => l!.Value).ToList()
                    ?? new List<decimal>();
        var qualityDenominator = totalOpenWeeks > 0 ? totalOpenWeeks : rated.Count;
        var quality = qualityDenominator > 0 ? Round1(rated.Sum() / qualityDenominator) : 0m;

        var bonus = hasCreativeProduct ? CreativeBonus : 0m;
        return Round1(Math.Min(10m, submission + punctuality + quality + bonus));
    }

    /// <summary>
    /// Cột K &amp; L. Chỉ bị vắng >= 2 buổi mới ép TB = 0 và xếp loại "không thực tập".
    /// Chưa có điểm thi hoặc chưa nộp báo cáo cuối kỳ vẫn hiển thị điểm tích lũy QT * 40%.
    /// </summary>
    public static (decimal? Average, string Classification) ComputeAverage(
        decimal processScore,
        decimal? oralExamScore,
        bool isDisqualifiedByAbsence = false,
        decimal processWeight = ProcessWeight,
        decimal oralWeight = OralWeight,
        decimal? employerScore = null,
        decimal employerWeight = 0m,
        decimal minimumPassingScore = 5m)
    {
        if (isDisqualifiedByAbsence) return (0m, IneligibleClassification);
        var weightedScore = processScore * processWeight;
        if (oralExamScore.HasValue)
            weightedScore += Math.Clamp(oralExamScore.Value, 0m, 10m) * oralWeight;
        if (employerScore.HasValue)
            weightedScore += Math.Clamp(employerScore.Value, 0m, 10m) * employerWeight;
        var average = Round1(weightedScore);
        var classification = oralExamScore.HasValue
            ? Classify(average, minimumPassingScore)
            : "Chưa xếp loại";
        return (average, classification);
    }

    /// <summary>
    /// Điều kiện dự thi (cột U) — hai hệ thống độc lập:
    ///   - finalReportSubmitted: bắt buộc đã nộp báo cáo cuối kỳ
    ///   - absentSessionCount: số buổi điểm danh bắt buộc vắng (không tính "không nộp bài")
    /// </summary>
    public static (bool IsEligible, List<string> Reasons) EvaluateEligibility(
        bool finalReportSubmitted,
        int absentSessionCount,
        bool requireFinalReport = true)
    {
        var reasons = new List<string>();
        if (requireFinalReport && !finalReportSubmitted) reasons.Add(ReasonNoFinalReport);
        if (absentSessionCount >= MaxAbsences) reasons.Add(ReasonAbsence);
        return (reasons.Count == 0, reasons);
    }
}
