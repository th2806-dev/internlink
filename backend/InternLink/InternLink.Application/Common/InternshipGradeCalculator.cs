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
///   - Nộp đủ   = 2.0 - (số bài thiếu * 0.5)          [chỉ từ nộp bài]
///   - Đúng hạn = 2.0 - (số bài trễ * 0.5)            [chỉ từ nộp bài]
///   - Chất lượng: GV chọn rubric từng tuần (1.0/2.0/3.5/4.0/5.0),
///     Điểm chất lượng = TRUNG BÌNH các tuần đã chấm.
///   - Sáng tạo: +1.0 khi has_creative_product = true.
///
/// Điểm TB = ROUND(QT * 0.4 + Thi * 0.6, 1)
/// Không đủ điều kiện (vi phạm 1 trong 2):
///   1. Không nộp báo cáo cuối kỳ
///   2. Số buổi VẮNG theo điểm danh >= 2
///   → Điểm TB = 0, Xếp loại = "không thực tập"
/// Xếp loại: >= 8.5 Xuất sắc | >= 8 Giỏi | >= 6.5 Khá | >= 5 Trung bình | < 5 Không đạt
/// ============================================================================
/// </summary>
public static class InternshipGradeCalculator
{
    public const decimal SubmissionMax = 2.0m;
    public const decimal PunctualityMax = 2.0m;
    public const decimal QualityMax = 5.0m;
    public const decimal CreativeBonus = 1.0m;
    public const decimal StepPenalty = 0.5m;
    public const decimal ProcessWeight = 0.4m;
    public const decimal OralWeight = 0.6m;
    public const int MaxAbsentWeeks = 2;

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

    public static string Classify(decimal score) =>
        score >= 8.5m ? "Xuất sắc" :
        score >= 8.0m ? "Giỏi" :
        score >= 6.5m ? "Khá" :
        score >= 5.0m ? "Trung bình" : "Không đạt";

    /// <summary>
    /// Cột I — Điểm QT.
    /// missingCount/lateCount chỉ tính từ NỘP BÀI (không liên quan điểm danh).
    /// weeklyQualityLevels: mức rubric GV chọn cho từng tuần — điểm chất lượng là trung bình các tuần đã chấm.
    /// </summary>
    public static decimal ComputeProcessScore(
        int missingCount, int lateCount, int submittedCount,
        IEnumerable<decimal?> weeklyQualityLevels, bool hasCreativeProduct)
    {
        var submission = submittedCount > 0
            ? Math.Max(0m, SubmissionMax - missingCount * StepPenalty)
            : 0m;
        var punctuality = submittedCount > 0
            ? Math.Max(0m, PunctualityMax - lateCount * StepPenalty)
            : 0m;

        var rated = weeklyQualityLevels?.Where(l => IsValidQualityLevel(l)).Select(l => l!.Value).ToList()
                    ?? new List<decimal>();
        var quality = rated.Count > 0 ? Round1(rated.Average()) : 0m;

        var bonus = hasCreativeProduct ? CreativeBonus : 0m;
        return Round1(Math.Min(10m, submission + punctuality + quality + bonus));
    }

    /// <summary>
    /// Cột K &amp; L. Không đủ điều kiện → TB = 0, "không thực tập".
    /// Đủ điều kiện nhưng chưa nhập Điểm Thi → TB = null (hiển thị "—").
    /// </summary>
    public static (decimal? Average, string Classification) ComputeAverage(bool isEligible, decimal processScore, decimal? oralExamScore)
    {
        if (!isEligible) return (0m, IneligibleClassification);
        if (!oralExamScore.HasValue) return (null, string.Empty);
        var average = Round1(processScore * ProcessWeight + Math.Clamp(oralExamScore.Value, 0m, 10m) * OralWeight);
        return (average, Classify(average));
    }

    /// <summary>
    /// Điều kiện dự thi (cột U) — hai hệ thống độc lập:
    ///   - finalReportSubmitted: từ NỘP BÀI (báo cáo cuối kỳ)
    ///   - absentWeekCount: từ ĐIỂM DANH buổi hẹn (không tính "không nộp bài")
    /// </summary>
    public static (bool IsEligible, List<string> Reasons) EvaluateEligibility(bool finalReportSubmitted, int absentWeekCount)
    {
        var reasons = new List<string>();
        if (!finalReportSubmitted) reasons.Add(ReasonNoFinalReport);
        if (absentWeekCount >= MaxAbsentWeeks) reasons.Add(ReasonAbsence);
        return (reasons.Count == 0, reasons);
    }
}
