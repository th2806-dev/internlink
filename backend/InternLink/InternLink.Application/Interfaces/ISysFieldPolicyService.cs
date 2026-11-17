using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISysFieldPolicyService
{
    Task<IReadOnlyList<SysFieldPolicyDto>> GetByFormAsync(
        string formCode,
        long? roleId,
        CancellationToken cancellationToken);
    Task<IReadOnlyList<SysFieldPolicyDto>> GetByFormForRoleAsync(
        string formCode,
        string roleCode,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<SysFieldPolicyDto>> UpsertAsync(
        string formCode,
        long? roleId,
        UpsertSysFieldPoliciesRequest request,
        CancellationToken cancellationToken);
}
