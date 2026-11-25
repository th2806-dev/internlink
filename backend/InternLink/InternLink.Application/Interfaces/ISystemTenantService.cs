using InternLink.Application.DTOs;
using InternLink.Domain.Entities.System;

namespace InternLink.Application.Interfaces;

public interface ISystemTenantService
{
    Task<TenantDirectoryPage> GetTenantsAsync(
        TenantDirectoryQuery query,
        CancellationToken cancellationToken);

    Task<TenantDetailsResponse?> GetTenantAsync(Guid id, CancellationToken cancellationToken);
    Task<TenantDetailsResponse?> CreateTenantAsync(CreateTenantRequest request, CancellationToken cancellationToken);
    Task<TenantDetailsResponse?> UpdateTenantAsync(Guid id, UpdateTenantRequest request, CancellationToken cancellationToken);
    Task<TenantDetailsResponse?> UpdateStatusAsync(Guid id, TenantStatus status, CancellationToken cancellationToken);
    Task<TenantLicenseStudioResponse?> GetLicenseAsync(Guid tenantId, CancellationToken cancellationToken);
    Task<TenantLicenseStudioResponse?> UpdateLicenseAsync(
        Guid tenantId,
        UpdateTenantLicenseRequest request,
        CancellationToken cancellationToken);
}
