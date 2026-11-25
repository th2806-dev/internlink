namespace InternLink.Application.Interfaces;

public interface ITenantStorageQuotaService
{
    Task ReconcileUsageIfNeededAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task ReserveAsync(Guid tenantId, long bytes, CancellationToken cancellationToken = default);
    Task ReleaseAsync(Guid tenantId, long bytes, CancellationToken cancellationToken = default);
}
