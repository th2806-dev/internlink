using System.ComponentModel.DataAnnotations;

namespace InternLink.Application.DTOs;

/// <summary>Public metadata for an API key. The key hash is never returned.</summary>
public sealed record ApiKeyResponse(
    Guid Id,
    string Name,
    string KeyPrefix,
    IReadOnlyList<string> Scopes,
    int RateLimitPerMinute,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset? LastUsedAt,
    bool IsActive,
    DateTimeOffset CreatedAt);

/// <summary>One-time API key secret returned only at creation or rotation.</summary>
public sealed record ApiKeySecretResponse(ApiKeyResponse ApiKey, string Secret);

/// <summary>Fields required to issue an API key for a tenant.</summary>
public sealed record CreateApiKeyRequest
{
    [Required, MaxLength(200)]
    public required string Name { get; init; }

    [Required, MinLength(1), MaxLength(32)]
    public required string[] Scopes { get; init; }

    [Range(1, 100000)]
    public int RateLimitPerMinute { get; init; } = 120;

    public DateTimeOffset? ExpiresAt { get; init; }
}

/// <summary>Fields that can be changed without rotating an API key secret.</summary>
public sealed record UpdateApiKeyRequest
{
    [Required, MaxLength(200)]
    public required string Name { get; init; }

    [Required, MinLength(1), MaxLength(32)]
    public required string[] Scopes { get; init; }

    [Range(1, 100000)]
    public int RateLimitPerMinute { get; init; } = 120;

    public DateTimeOffset? ExpiresAt { get; init; }

    public bool IsActive { get; init; }
}

/// <summary>Public metadata for a webhook subscription.</summary>
public sealed record WebhookResponse(
    Guid Id,
    string Url,
    string EventType,
    bool IsActive,
    DateTimeOffset? LastTriggeredAt,
    string? LastStatus,
    DateTimeOffset CreatedAt);

/// <summary>New webhook metadata and its one-time signing secret.</summary>
public sealed record CreateWebhookResponse(WebhookResponse Webhook, string Secret);

/// <summary>Fields required to configure a webhook subscription.</summary>
public sealed record CreateWebhookRequest
{
    [Required, MaxLength(2048), Url]
    public required string Url { get; init; }

    [Required, MaxLength(100)]
    public required string EventType { get; init; }
}

/// <summary>Fields that can be changed on an existing webhook.</summary>
public sealed record UpdateWebhookRequest
{
    [Required, MaxLength(2048), Url]
    public required string Url { get; init; }

    [Required, MaxLength(100)]
    public required string EventType { get; init; }

    public bool IsActive { get; init; }
}

/// <summary>A single attempt to deliver a webhook event.</summary>
public sealed record WebhookDeliveryResponse(
    Guid Id,
    Guid DeliveryId,
    Guid WebhookId,
    string EventType,
    string Status,
    int AttemptNumber,
    int? HttpStatusCode,
    string? ResponseBody,
    string? ErrorMessage,
    DateTimeOffset StartedAt,
    DateTimeOffset? CompletedAt);

/// <summary>Infrastructure probe result with safe, non-secret diagnostic details.</summary>
public sealed record SystemHealthProbeResponse(
    string Name,
    string Label,
    string Status,
    double DurationMs,
    string Detail,
    IReadOnlyDictionary<string, string?> Metrics);

/// <summary>Current infrastructure health probe results.</summary>
public sealed record SystemHealthResponse(
    DateTimeOffset CheckedAt,
    IReadOnlyList<SystemHealthProbeResponse> Probes);

/// <summary>One background job definition and its latest execution.</summary>
public sealed record SystemJobResponse(
    string JobCode,
    string JobName,
    string CronExpression,
    string? Description,
    bool IsEnabled,
    string Status,
    DateTimeOffset? LastRunAt,
    DateTimeOffset? NextRunAt,
    long? LastDurationMs,
    string? LastErrorMessage,
    IReadOnlyList<JobExecutionResponse> RecentExecutions);

/// <summary>One execution of a system background job.</summary>
public sealed record JobExecutionResponse(
    Guid Id,
    string JobCode,
    string Status,
    string TriggeredBy,
    DateTimeOffset StartedAt,
    DateTimeOffset? CompletedAt,
    long? DurationMs,
    string? ResultSummary,
    string? ErrorMessage);

/// <summary>Background job catalog and recent execution history.</summary>
public sealed record SystemJobsDashboardResponse(
    IReadOnlyList<SystemJobResponse> Jobs,
    IReadOnlyList<JobExecutionResponse> RecentExecutions);

/// <summary>Changes whether a background job may be triggered.</summary>
public sealed record SetSystemJobEnabledRequest(bool IsEnabled);

/// <summary>Changes the supported recurring schedule for the database backup job.</summary>
public sealed record SetSystemJobScheduleRequest
{
    [Required, MaxLength(100)]
    public required string CronExpression { get; init; }
}
