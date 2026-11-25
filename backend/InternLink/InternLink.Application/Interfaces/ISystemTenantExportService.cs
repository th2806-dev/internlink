using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISystemTenantExportService
{
    Task<TenantDataExportArchive?> ExportAsync(
        Guid tenantId,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken);
}
