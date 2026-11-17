namespace InternLink.Domain.Entities.Rbac;

public class SysRole : BaseEntity
{
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; } = true;
    public bool DefaultPermissionsApplied { get; set; }

    public ICollection<SysUserRole> Users { get; set; } = new List<SysUserRole>();
    public ICollection<SysRolePermission> Permissions { get; set; } = new List<SysRolePermission>();
}
