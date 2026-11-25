using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.Rbac;

public class SysDailyJob : BaseEntity
{
    public string JobCode { get; set; } = null!;
    public string JobName { get; set; } = null!;
    public string CronExpression { get; set; } = null!;
    public string? Description { get; set; }
    public DateTime? LastRunAt { get; set; }
    public DateTime? NextRunAt { get; set; }
    public string Status { get; set; } = null!;
    public long? LastDurationMs { get; set; }
    public string? LastErrorMessage { get; set; }
    public bool IsEnabled { get; set; } = true;
}
