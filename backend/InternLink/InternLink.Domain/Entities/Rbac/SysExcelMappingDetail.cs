using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.Rbac;

public class SysExcelMappingDetail : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public long MappingId { get; set; }
    public SysExcelMapping Mapping { get; set; } = null!;
    public string SystemFieldCode { get; set; } = null!;
    public string ExcelColumnName { get; set; } = null!;
    public int ExcelColumnIndex { get; set; }
    public bool IsRequired { get; set; }
    public string? DefaultValue { get; set; }
    public string? TransformRule { get; set; }
}
