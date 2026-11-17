using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.Rbac;

public class SysGridConfig : BaseEntity
{
    public string FeatureCode { get; set; } = null!;
    public string FieldCode { get; set; } = null!;
    public string HeaderTitle { get; set; } = null!;
    public int ColumnWidth { get; set; } = 120;
    public bool IsVisible { get; set; } = true;
    public bool IsFrozen { get; set; }
    public string FrozenSide { get; set; } = "left";
    public long? RoleId { get; set; }
    public string? TenantId { get; set; }
    public int SortOrder { get; set; }
    public string? HeaderBgColor { get; set; }
    public string? HeaderTextColor { get; set; }
    public string CellFormatType { get; set; } = "text";
    public string? CellColorRuleJson { get; set; }
}
