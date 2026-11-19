using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISysFieldPolicyService
{
    Task<IReadOnlyList<SysFieldPolicyDto>> GetByFormAsync(
        string formCode,
        long? roleId,
        CancellationToken cancellationToken,
        string? tenantId = null);
    Task<IReadOnlyList<SysFieldPolicyDto>> GetByFormForRoleAsync(
        string formCode,
        string roleCode,
        CancellationToken cancellationToken,
        string? tenantId = null);

    Task<IReadOnlyList<SysFieldPolicyDto>> UpsertAsync(
        string formCode,
        long? roleId,
        UpsertSysFieldPoliciesRequest request,
        CancellationToken cancellationToken,
        string? tenantId = null);
}
