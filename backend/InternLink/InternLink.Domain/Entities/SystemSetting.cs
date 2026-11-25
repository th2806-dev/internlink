namespace InternLink.Domain.Entities;

/// <summary>
/// Key-value system settings persisted in the database.
/// Used by AdminSettingsController instead of in-memory storage.
/// </summary>
public class SystemSetting : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    /// <summary>
    /// Unique key for the setting (e.g., "DepartmentName", "SupportEmail")
    /// </summary>
    public string Key { get; set; } = null!;

    /// <summary>
    /// JSON-serialized value of the setting
    /// </summary>
    public string Value { get; set; } = null!;

    /// <summary>
    /// Optional category for grouping (e.g., "General", "Grading", "Email")
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Human-readable description of what this setting controls
    /// </summary>
    public string? Description { get; set; }
}
