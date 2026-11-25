using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.Rbac;

public class SysAuditLog : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public string TableName { get; set; } = null!;
    public string ActionType { get; set; } = null!;
    public string RecordId { get; set; } = null!;
    public string? OldValuesJson { get; set; }
    public string? NewValuesJson { get; set; }
    public Guid? UserId { get; set; }
    public string? Username { get; set; }
    public string? FunctionCode { get; set; }
    public string? IpAddress { get; set; }
}
