using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISystemTenantSsoService
{
    Task<TenantSsoConfigurationResponse?> GetConfigurationAsync(
        Guid tenantId,
        CancellationToken cancellationToken);

    Task<TenantSsoConfigurationResponse?> SaveConfigurationAsync(
        Guid tenantId,
        UpdateTenantSsoConfigurationRequest request,
        CancellationToken cancellationToken);

    Task<TenantSsoDiscoveryTestResponse?> TestDiscoveryAsync(
        Guid tenantId,
        TestTenantSsoDiscoveryRequest request,
        CancellationToken cancellationToken);

    Task<bool?> DeleteConfigurationAsync(
        Guid tenantId,
        string? deletedBy,
        CancellationToken cancellationToken);
}
