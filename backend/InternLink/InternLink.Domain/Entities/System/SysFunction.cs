namespace InternLink.Domain.Entities.Rbac;

public class SysFunction : BaseEntity
{
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string ModuleCode { get; set; } = null!;
    public string? Description { get; set; }
    public long? ParentId { get; set; }
    public SysFunction? Parent { get; set; }
    public ICollection<SysFunction> Children { get; set; } = new List<SysFunction>();
    public ICollection<SysRolePermission> RolePermissions { get; set; } = new List<SysRolePermission>();
    public int SortOrder { get; set; }
    public bool IsAction { get; set; }
    public bool IsActive { get; set; } = true;
    public string? FuncUrl { get; set; }
    public string? IconName { get; set; } = "Folder";
    public string? BadgeText { get; set; }
    public bool IsVisibleInMenu { get; set; } = true;
    public bool IsView { get; set; } = true;
    public bool IsNew { get; set; } = true;
    public bool IsEdit { get; set; } = true;
    public bool IsDelete { get; set; } = true;
    public bool IsExport { get; set; } = true;
}
