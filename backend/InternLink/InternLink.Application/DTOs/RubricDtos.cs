namespace InternLink.Application.DTOs;

// --- Criterion DTOs ---

public class RubricCriterionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public decimal Weight { get; set; }
    public int MaxScore { get; set; } = 10;
    public int OrderIndex { get; set; }
}

public class CreateRubricCriterionRequest
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public decimal Weight { get; set; }
    public int MaxScore { get; set; } = 10;
    public int OrderIndex { get; set; }
}

public class UpdateRubricCriterionRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal? Weight { get; set; }
    public int? MaxScore { get; set; }
    public int? OrderIndex { get; set; }
}

// --- Rubric DTOs ---

public class RubricDto
{
    public Guid Id { get; set; }
    public Guid SemesterId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string Name { get; set; } = null!;
    public int Version { get; set; } = 1;
    public List<EmployerRatingLevelDto> RatingLevels { get; set; } = new();
    public string ApplicationMode { get; set; } = "Required";
    public string Status { get; set; } = "Draft";
    public List<RubricCriterionDto> Criteria { get; set; } = new();
    public string? RejectionReason { get; set; }
    public string? SubmittedByName { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public sealed record EmployerRatingLevelDto(int Value, string Label, string Description);

public sealed record EmployerRubricCriterionDto(
    Guid Id,
    string Name,
    string? Description,
    decimal Weight,
    int OrderIndex);

public sealed record EmployerRubricConfigDto(
    Guid? Id,
    Guid SemesterId,
    Guid? DepartmentId,
    string Name,
    int Version,
    bool IsInherited,
    IReadOnlyList<EmployerRatingLevelDto> RatingLevels,
    IReadOnlyList<EmployerRubricCriterionDto> Criteria);

public sealed record SaveEmployerRubricRequest
{
    public required string Name { get; init; }
    public required IReadOnlyList<EmployerRatingLevelDto> RatingLevels { get; init; }
    public required IReadOnlyList<SaveEmployerRubricCriterionRequest> Criteria { get; init; }
}

public sealed record SaveEmployerRubricCriterionRequest
{
    public required string Name { get; init; }
    public string? Description { get; init; }
    public required decimal Weight { get; init; }
}

public class CreateRubricRequest
{
    public string Name { get; set; } = null!;
    public string ApplicationMode { get; set; } = "Required";
    public List<CreateRubricCriterionRequest> Criteria { get; set; } = new();
}

public class UpdateRubricRequest
{
    public string? Name { get; set; }
    public string? ApplicationMode { get; set; }
    public List<UpdateRubricCriterionRequest>? Criteria { get; set; }
}

public class SubmitRubricRequest
{
    public string? Note { get; set; }
}

public class ApproveRubricRequest
{
    public string? Note { get; set; }
}

public class RejectRubricRequest
{
    public string RejectionReason { get; set; } = null!;
}

// --- Evaluation Criteria Score DTOs (for Lecturer scoring) ---

public class CriterionScoreInput
{
    public Guid CriterionId { get; set; }
    public string CriterionName { get; set; } = null!;
    public decimal Weight { get; set; }
    public int MaxScore { get; set; } = 10;
    public int Score { get; set; }
    public string? Comment { get; set; }
}

public class EvaluationScoresRequest
{
    public List<CriterionScoreInput> CriteriaScores { get; set; } = new();
    public string? Comments { get; set; }
}

public class EvaluationScoresResponse
{
    public Guid EvaluationId { get; set; }
    public List<CriterionScoreDto> CriteriaScores { get; set; } = new();
    public decimal FinalGrade { get; set; }
    public bool IsFinalized { get; set; }
}

public class SaveRubricScoresRequest
{
    public Guid? InternshipId { get; set; }
    public List<CriterionScoreInput> CriteriaScores { get; set; } = new();
    public string? Comments { get; set; }
    public bool? Finalize { get; set; }
}

public class CriterionScoreDto
{
    public Guid? CriterionId { get; set; }
    public string CriterionName { get; set; } = null!;
    public string? CriterionDescription { get; set; }
    public decimal Weight { get; set; }
    public int MaxScore { get; set; }
    public int Score { get; set; }
    public string? Comment { get; set; }
    public int OrderIndex { get; set; }
}
