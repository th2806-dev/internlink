using InternLink.Domain.Enums;

namespace InternLink.Domain.Entities;

/// <summary>
/// Defines the evaluation rubric (criteria + weights) for a semester.
/// Each semester can have at most one rubric, with a lifecycle:
/// Admin save → Approved → Locked
/// </summary>
public class EvaluationRubric : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    /// <summary>
    /// The semester and optional department this rubric belongs to.
    /// </summary>
    public Guid SemesterId { get; set; }
    public Semester Semester { get; set; } = null!;
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }

    /// <summary>
    /// Human-readable name, e.g. "Rubric thực tập Tốt nghiệp K20"
    /// </summary>
    public string Name { get; set; } = null!;
    public int Version { get; set; } = 1;
    public string? RatingLevelsJson { get; set; }

    /// <summary>
    /// Whether this rubric is required for all lecturers, or lecturer may customize.
    /// "Required" = all lecturers must use this rubric
    /// "LecturerCustom" = admin provides a template, lecturers may modify weights
    /// </summary>
    public RubricApplicationMode ApplicationMode { get; set; } = RubricApplicationMode.Required;

    /// <summary>
    /// Lifecycle status of this rubric
    /// </summary>
    public RubricStatus Status { get; set; } = RubricStatus.Draft;

    /// <summary>
    /// Who submitted for approval (SuperAdmin user ID)
    /// </summary>
    public Guid? SubmittedById { get; set; }
    public User? SubmittedBy { get; set; }

    public DateTime? SubmittedAt { get; set; }

    /// <summary>
    /// Who approved (SuperAdmin = DepartmentHead role for Phase 1)
    /// </summary>
    public Guid? ApprovedById { get; set; }
    public User? ApprovedBy { get; set; }

    public DateTime? ApprovedAt { get; set; }

    /// <summary>
    /// Rejection reason (when status = Rejected)
    /// </summary>
    public string? RejectionReason { get; set; }

    /// <summary>
    /// Criteria items belonging to this rubric, ordered by OrderIndex
    /// </summary>
    public ICollection<EvaluationRubricCriterion> Criteria { get; set; } = new List<EvaluationRubricCriterion>();
}
