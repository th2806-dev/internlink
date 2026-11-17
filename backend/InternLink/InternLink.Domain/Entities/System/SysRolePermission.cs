namespace InternLink.Domain.Entities.Rbac;

public class SysRolePermission : BaseEntity
{
    public long SysRoleId { get; set; }
    public SysRole Role { get; set; } = null!;

    public long SysFunctionId { get; set; }
    public SysFunction Function { get; set; } = null!;

    public bool IsGranted { get; set; }
}
