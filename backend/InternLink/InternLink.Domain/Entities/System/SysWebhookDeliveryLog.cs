using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.System;

public sealed class SysWebhookDeliveryLog : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Guid WebhookPublicId { get; set; }
    public Guid DeliveryId { get; set; } = Guid.NewGuid();
    public string EventType { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public int AttemptNumber { get; set; } = 1;
    public int? HttpStatusCode { get; set; }
    public string? ResponseBody { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
