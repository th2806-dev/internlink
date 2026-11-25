namespace InternLink.Domain.Entities.Rbac;

public class SysUserRole : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public long SysUserId { get; set; }
    public SysUser User { get; set; } = null!;

    public long SysRoleId { get; set; }
    public SysRole Role { get; set; } = null!;

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}
