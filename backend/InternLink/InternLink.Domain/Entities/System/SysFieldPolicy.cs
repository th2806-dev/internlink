using InternLink.Domain.Entities.Rbac;

namespace InternLink.Domain.Entities;

public class SysFieldPolicy : BaseEntity
{
    public string FormCode { get; set; } = string.Empty;
    public string FieldKey { get; set; } = string.Empty;
    public long? RoleId { get; set; }
    public SysRole? Role { get; set; }
    public bool IsVisible { get; set; } = true;
    public bool IsRequired { get; set; }
    public bool IsReadOnly { get; set; }
    public string? CustomLabel { get; set; }
    public string? DefaultValue { get; set; }
    public string? ValidationRegex { get; set; }
    public string? ErrorMessage { get; set; }
    public int SortOrder { get; set; }
}
