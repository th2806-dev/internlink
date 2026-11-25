using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.System;

public sealed class SysComplianceLog : BaseEntity
{
    public string OperationCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int AffectedCount { get; set; }
    public int RetentionYears { get; set; }
    public DateTime CutoffAt { get; set; }
    public string TriggeredBy { get; set; } = string.Empty;
    public DateTime ExecutedAt { get; set; }
    public string? Details { get; set; }
}
