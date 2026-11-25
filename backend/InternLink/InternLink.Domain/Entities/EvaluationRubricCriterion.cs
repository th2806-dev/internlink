namespace InternLink.Domain.Entities;

/// <summary>
/// A single criterion within an evaluation rubric.
/// Examples: "Chuyên môn" (40%), "Thái độ" (20%), "Kỹ năng mềm" (20%), "Báo cáo cuối kỳ" (20%)
/// </summary>
public class EvaluationRubricCriterion : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    /// <summary>
    /// The rubric this criterion belongs to
    /// </summary>
    public Guid RubricId { get; set; }
    public EvaluationRubric Rubric { get; set; } = null!;

    /// <summary>
    /// Display name, e.g. "Chuyên môn", "Thái độ làm việc"
    /// </summary>
    public string Name { get; set; } = null!;

    /// <summary>
    /// Optional description for clarity
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Weight percentage (e.g. 40 means 40%). Total of all criteria = 100.
    /// </summary>
    public decimal Weight { get; set; }

    /// <summary>
    /// Maximum score for this criterion (default 10)
    /// </summary>
    public int MaxScore { get; set; } = 10;

    /// <summary>
    /// Display ordering within the rubric
    /// </summary>
    public int OrderIndex { get; set; }
}
