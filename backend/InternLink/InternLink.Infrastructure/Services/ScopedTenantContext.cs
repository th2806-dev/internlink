using InternLink.Application.Interfaces;

namespace InternLink.Infrastructure.Services;

public sealed class ScopedTenantContext : IScopedTenantContext
{
    public Guid TenantId { get; private set; }
    public bool IsResolved => TenantId != Guid.Empty;
    public bool IsPlatformAdmin { get; private set; }

    public void SetTenantId(Guid tenantId)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("A resolved tenant ID cannot be empty.", nameof(tenantId));

        if (IsResolved && TenantId != tenantId)
            throw new InvalidOperationException("The tenant context has already been resolved for this request.");

        TenantId = tenantId;
    }

    public void SetPlatformAdmin(bool isPlatformAdmin)
    {
        if (isPlatformAdmin && !IsResolved)
            throw new InvalidOperationException("Resolve the tenant before enabling platform administration.");

        IsPlatformAdmin = isPlatformAdmin;
    }
}
