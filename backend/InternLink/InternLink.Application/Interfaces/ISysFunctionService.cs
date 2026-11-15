using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISysFunctionService
{
    Task<IReadOnlyList<SysFunctionDto>> GetTreeAsync(bool includeHidden, CancellationToken cancellationToken);
    Task<SysFunctionDto?> GetByPublicIdAsync(Guid id, CancellationToken cancellationToken);
    Task<SysFunctionDto> CreateAsync(CreateSysFunctionRequest request, CancellationToken cancellationToken);
    Task<SysFunctionDto?> UpdateAsync(Guid id, UpdateSysFunctionRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
    Task ReorderAsync(ReorderFunctionsRequest request, CancellationToken cancellationToken);
}
