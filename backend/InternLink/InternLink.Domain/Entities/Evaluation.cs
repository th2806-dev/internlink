using InternLink.Domain.Enums;

namespace InternLink.Domain.Entities;

/// <summary>
/// Represents an evaluation/grading of a student's internship performance
/// </summary>
public class Evaluation : BaseEntity
{
    /// <summary>
    /// The internship being evaluated
    /// </summary>
    public Guid InternshipId { get; set; }
    public Internship Internship { get; set; } = null!;

    /// <summary>
    /// The lecturer who performed the evaluation
    /// </summary>
    public Guid? EvaluatedById { get; set; }
    public User? EvaluatedBy { get; set; }

    /// <summary>
    /// Technical Skills score (0-10)
    /// </summary>
    public int TechnicalScore { get; set; }

    /// <summary>
    /// Communication Skills score (0-10)
    /// </summary>
    public int CommunicationScore { get; set; }

    /// <summary>
    /// Teamwork/Collaboration score (0-10)
    /// </summary>
    public int TeamworkScore { get; set; }

    /// <summary>
    /// Initiative/Proactivity score (0-10)
    /// </summary>
    public int InitiativeScore { get; set; }

    /// <summary>
    /// Overall final grade (calculated from 4 criteria)
    /// </summary>
    public decimal FinalGrade { get; set; }

    /// <summary>
    /// Lecturer's comments on student performance
    /// </summary>
    public string? Comments { get; set; }

    /// <summary>
    /// Strengths demonstrated by the student
    /// </summary>
    public string? Strengths { get; set; }

    /// <summary>
    /// Areas for improvement
    /// </summary>
    public string? AreasForImprovement { get; set; }

    /// <summary>
    /// Date when the evaluation was created
    /// </summary>
    public DateTime EvaluatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Flag indicating if this evaluation has been finalized
    /// </summary>
    public bool IsFinalized { get; set; } = false;

    public DateTime? DefenseDate { get; set; }
    public DefenseStatus DefenseStatus { get; set; } = DefenseStatus.NotScheduled;
    public string? DefenseCouncilName { get; set; }
    public string? DefenseExaminerName { get; set; }

    /// <summary>
    /// The rubric used when this evaluation was created.
    /// Null for legacy evaluations or when lecturer uses custom criteria.
    /// </summary>
    public Guid? RubricId { get; set; }
    public EvaluationRubric? Rubric { get; set; }

    // ─── C23 grading (Quy định chấm điểm mới) ───

    /// <summary>
    /// Điểm chất lượng bài báo cáo theo Rubric 5 mức: 1.0 / 2.0 / 3.5 / 4.0 / 5.0.
    /// Null = giảng viên chưa chấm chất lượng.
    /// </summary>
    public decimal? QualityLevel { get; set; }

    /// <summary>
    /// Mức rubric chất lượng theo TỪNG TUẦN (JSON: {"1": 4.0, "2": 3.5, ...}).
    /// Null/{} = giảng viên chưa chấm theo tuần. Điểm chất lượng cuối = trung bình các tuần đã chấm.
    /// </summary>
    public string? WeeklyQualityJson { get; set; }

    /// <summary>
    /// Sinh viên có sản phẩm sáng tạo (+1.0 điểm cộng vào Điểm QT).
    /// </summary>
    public bool HasCreativeProduct { get; set; } = false;

    /// <summary>
    /// Điểm thi vấn đáp nhập tay (cột J, thang 10). Null = chưa nhập.
    /// </summary>
    public decimal? OralExamScore { get; set; }

    /// <summary>
    /// JSON-serialized criteria scores.
    /// Format: [{ "criterionId": "...", "criterionName": "...", "weight": 40, "maxScore": 10, "score": 8, "comment": "..." }]
    /// Used when rubric is configured; null for legacy 4-field evaluations.
    /// </summary>
    public string? CriteriaScoresJson { get; set; }

    /// <summary>
    /// Calculate overall grade as average of 4 scores (legacy mode)
    /// </summary>
    public void CalculateFinalGrade()
    {
        FinalGrade = Math.Round((TechnicalScore + CommunicationScore + TeamworkScore + InitiativeScore) / 4.0m, 2);
    }

    /// <summary>
    /// Calculate final grade from criteria JSON using rubric weights.
    /// Called when CriteriaScoresJson is populated.
    /// </summary>
    public void CalculateFinalGradeFromCriteria()
    {
        if (string.IsNullOrWhiteSpace(CriteriaScoresJson))
        {
            CalculateFinalGrade();
            return;
        }

        try
        {
            var scores = System.Text.Json.JsonSerializer.Deserialize<List<CriteriaScoreEntry>>(CriteriaScoresJson);
            if (scores == null || scores.Count == 0)
            {
                CalculateFinalGrade();
                return;
            }

            decimal totalWeight = scores.Sum(s => s.Weight);
            if (totalWeight <= 0) totalWeight = 100;

            decimal weightedSum = scores.Sum(s =>
            {
                decimal normalizedScore = s.MaxScore > 0 ? s.Score / (decimal)s.MaxScore : 0;
                return normalizedScore * s.Weight;
            });

            FinalGrade = Math.Round(weightedSum / totalWeight * 10, 2);
        }
        catch
        {
            CalculateFinalGrade();
        }
    }

    /// <summary>
    /// Helper model for JSON deserialization of criteria scores
    /// </summary>
    private class CriteriaScoreEntry
    {
        public Guid? CriterionId { get; set; }
        public string CriterionName { get; set; } = "";
        public decimal Weight { get; set; }
        public int MaxScore { get; set; } = 10;
        public int Score { get; set; }
        public string? Comment { get; set; }
    }
}
