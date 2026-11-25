using InternLink.Domain.Common;

namespace InternLink.Domain.Entities;

public abstract class TenantScopedEntity : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
}
