namespace InternLink.Domain.Entities.Rbac;

public class SysUser : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public string UserName { get; set; } = null!;
    public string? DisplayName { get; set; }
    public bool IsActive { get; set; } = true;

    public User LegacyUser { get; set; } = null!;
    public ICollection<SysUserRole> Roles { get; set; } = new List<SysUserRole>();
}
