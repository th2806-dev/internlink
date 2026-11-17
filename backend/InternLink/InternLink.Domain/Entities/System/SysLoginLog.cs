using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.Rbac;

public class SysLoginLog : BaseEntity
{
    public DateTime LoginAt { get; set; }
    public string Username { get; set; } = null!;
    public string? IpAddress { get; set; }
    public string Status { get; set; } = null!;
}
