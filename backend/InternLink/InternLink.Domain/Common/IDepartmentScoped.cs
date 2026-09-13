namespace InternLink.Domain.Common;

/// <summary>
/// Marker interface for entities that support department-based scoping (multi-tenancy).
/// DepartmentId = null means the entity is global (visible to all departments).
/// Implemented by entities that carry a DepartmentId FK.
/// </summary>
public interface IDepartmentScoped
{
    Guid? DepartmentId { get; set; }
}
