namespace InternLink.Application.Interfaces;

public interface IScopedTenantContext
{
    Guid TenantId { get; }
    bool IsResolved { get; }
    bool IsPlatformAdmin { get; }
    void SetTenantId(Guid tenantId);
    void SetPlatformAdmin(bool isPlatformAdmin);
}
