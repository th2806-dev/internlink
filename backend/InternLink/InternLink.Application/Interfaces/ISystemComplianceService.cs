using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISystemComplianceService
{
    Task<IReadOnlyList<DataRetentionPolicyResponse>> GetPoliciesAsync(
        CancellationToken cancellationToken);

    Task<DataRetentionPolicyResponse?> UpdatePolicyAsync(
        string code,
        UpdateDataRetentionPolicyRequest request,
        CancellationToken cancellationToken);

    Task<AnonymizationPreviewResponse> GetAnonymizationPreviewAsync(
        CancellationToken cancellationToken);

    Task<ComplianceExecutionResponse> ExecuteAnonymizationAsync(
        int expectedEligibleCount,
        string triggeredBy,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<ComplianceLogResponse>> GetAuditLogsAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken);
}
