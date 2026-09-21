namespace InternLink.Application.Common;

/// <summary>
/// ============================================================================
/// CORE BUSINESS LOGIC (C# mirror của frontend/src/lib/c23Grading.ts)
/// Quy định chấm điểm mới — Module Quản lý Thực tập Doanh nghiệp (Khóa C23):
///
/// Điểm QT = MIN(10, Nộp_Đủ(max 2) + Đúng_Hạn(max 2) + Chất_Lượng(max 5) + Sáng_Tạo(+1))
///   - Nộp đủ   = 2.0 - (số bài thiếu * 0.5)
///   - Đúng hạn = 2.0 - (số bài trễ * 0.5)
///   - Chất lượng: rubric 5 mức 1.0 / 2.0 / 3.5 / 4.0 / 5.0
/// Điểm TB = ROUND(QT * 0.4 + Thi * 0.6, 1)
/// Không đủ điều kiện (không nộp báo cáo cuối kỳ HOẶC vắng/thiếu >= 2 tuần)
///   → Điểm TB = 0, Xếp loại = "không thực tập"
/// Xếp loại: >= 9 Xuất sắc | >= 8 Giỏi | >= 6.5 Khá | >= 5 Trung bình | < 5 Không đạt
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
    public const int MaxMissingWeeks = 2;

    /// <summary>Rubric chất lượng 5 mức theo quy định.</summary>
    public static readonly decimal[] QualityLevels = { 1.0m, 2.0m, 3.5m, 4.0m, 5.0m };

    public const string IneligibleClassification = "không thực tập";
    public const string IneligibleCell = "Không đủ điều kiện";

    /// <summary>Làm tròn kiểu Excel ROUND (half away from zero) tới 1 chữ số.</summary>
    public static decimal Round1(decimal value) => Math.Round(value, 1, MidpointRounding.AwayFromZero);

    public static bool IsValidQualityLevel(decimal? level) =>
        level.HasValue && QualityLevels.Contains(level.Value);

    public static string Classify(decimal score) =>
        score >= 9.0m ? "Xuất sắc" :
        score >= 8.0m ? "Giỏi" :
        score >= 6.5m ? "Khá" :
        score >= 5.0m ? "Trung bình" : "Không đạt";

    /// <summary>Cột I — Điểm QT.</summary>
    public static decimal ComputeProcessScore(int missingCount, int lateCount, decimal? qualityLevel, bool hasCreativeProduct)
    {
        var submission = Math.Max(0m, SubmissionMax - missingCount * StepPenalty);
        var punctuality = Math.Max(0m, PunctualityMax - lateCount * StepPenalty);
        var quality = IsValidQualityLevel(qualityLevel) ? qualityLevel!.Value : 0m;
        var bonus = hasCreativeProduct ? CreativeBonus : 0m;
        return Round1(Math.Min(10m, submission + punctuality + quality + bonus));
    }

    /// <summary>
    /// Cột K & L. Không đủ điều kiện → TB = 0, "không thực tập".
    /// Đủ điều kiện nhưng chưa nhập Điểm Thi → TB = null (hiển thị "—").
    /// </summary>
    public static (decimal? Average, string Classification) ComputeAverage(bool isEligible, decimal processScore, decimal? oralExamScore)
    {
        if (!isEligible) return (0m, IneligibleClassification);
        if (!oralExamScore.HasValue) return (null, string.Empty);
        var average = Round1(processScore * ProcessWeight + Math.Clamp(oralExamScore.Value, 0m, 10m) * OralWeight);
        return (average, Classify(average));
    }

    /// <summary>Điều kiện dự thi (cột U).</summary>
    public static (bool IsEligible, List<string> Reasons) EvaluateEligibility(bool finalReportSubmitted, int missingCount)
    {
        var reasons = new List<string>();
        if (!finalReportSubmitted) reasons.Add("Chưa nộp báo cáo cuối kỳ");
        if (missingCount >= MaxMissingWeeks) reasons.Add("Vắng/Không nộp báo cáo tuần >= 2 tuần");
        return (reasons.Count == 0, reasons);
    }
}
