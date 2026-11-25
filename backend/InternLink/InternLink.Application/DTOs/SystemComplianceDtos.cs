using System.ComponentModel.DataAnnotations;

namespace InternLink.Application.DTOs;

/// <summary>A data-retention policy managed by the platform operator.</summary>
public sealed record DataRetentionPolicyResponse(
    string Code,
    string Name,
    string Description,
    int RetentionYears,
    bool IsEnabled,
    DateTimeOffset? UpdatedAt);

/// <summary>Updates the retention period and activation state of a policy.</summary>
public sealed record UpdateDataRetentionPolicyRequest
{
    [Range(1, 100)]
    public int RetentionYears { get; init; }

    public bool IsEnabled { get; init; }
}

/// <summary>Preview of student profiles eligible for anonymization.</summary>
public sealed record AnonymizationPreviewResponse(
    int EligibleStudentCount,
    int RetentionYears,
    DateTimeOffset EligibleBefore,
    bool IsEnabled);

/// <summary>Explicit confirmation and preview count required for anonymization.</summary>
public sealed record ExecuteAnonymizationRequest
{
    [Range(1, int.MaxValue)]
    public int ExpectedEligibleCount { get; init; }

    [Required, MaxLength(32)]
    public required string ConfirmationPhrase { get; init; }
}

/// <summary>Result of a completed student-profile anonymization operation.</summary>
public sealed record ComplianceExecutionResponse(
    Guid Id,
    string OperationCode,
    string Status,
    int AffectedCount,
    int RetentionYears,
    DateTimeOffset CutoffAt,
    DateTimeOffset ExecutedAt,
    string TriggeredBy);

/// <summary>A historical compliance operation without personal student data.</summary>
public sealed record ComplianceLogResponse(
    Guid Id,
    string OperationCode,
    string Status,
    int AffectedCount,
    int RetentionYears,
    DateTimeOffset CutoffAt,
    DateTimeOffset ExecutedAt,
    string TriggeredBy,
    string? Details);
