using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISystemHealthService
{
    Task<SystemHealthResponse> GetHealthAsync(CancellationToken cancellationToken);
}
