using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.System;

public sealed class SysDataRetentionPolicy : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int RetentionYears { get; set; }
    public bool IsEnabled { get; set; } = true;
}
