using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.Rbac;

public class SysWebhook : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public string WebhookUrl { get; set; } = null!;
    public string EventType { get; set; } = null!;
    public string SecretKey { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime? LastTriggeredAt { get; set; }
    public string? LastStatus { get; set; }
}
