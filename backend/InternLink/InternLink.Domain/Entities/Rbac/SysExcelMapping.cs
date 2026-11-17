using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.Rbac;

public class SysExcelMapping : BaseEntity
{
    public string MappingCode { get; set; } = null!;
    public string MappingName { get; set; } = null!;
    public string TargetEntity { get; set; } = null!;
    public int StartRowIndex { get; set; } = 2;
    public string? TenantId { get; set; }
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public ICollection<SysExcelMappingDetail> Details { get; set; } = new List<SysExcelMappingDetail>();
}
