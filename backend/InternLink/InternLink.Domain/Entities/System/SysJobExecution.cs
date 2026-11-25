using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.System;

public sealed class SysJobExecution : BaseEntity
{
    public string JobCode { get; set; } = string.Empty;
    public string Status { get; set; } = "Queued";
    public string TriggeredBy { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public long? DurationMs { get; set; }
    public string? ResultSummary { get; set; }
    public string? ErrorMessage { get; set; }
}
