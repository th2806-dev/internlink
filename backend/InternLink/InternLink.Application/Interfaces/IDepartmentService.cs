using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

/// <summary>
/// Service interface for Department management (CRUD + counts).
/// Department entities are global system data; only SuperAdmin may manage all departments.
/// DepartmentAdmin can view only departments they belong to via department scoping.
/// </summary>
public interface IDepartmentService
{
    /// <summary>
    /// Get all departments with basic counts.
    /// Optionally scope to a department id for DepartmentAdmin views.
    /// </summary>
    Task<IEnumerable<DepartmentDto>> GetAllAsync(Guid? departmentId = null);

    /// <summary>
    /// Get a department by id (respects department scoping for non-SuperAdmin callers).
    /// </summary>
    Task<DepartmentDto?> GetByIdAsync(Guid id, Guid? requesterDepartmentId = null);

    /// <summary>
    /// Create a new department. Allowed only for SuperAdmin or admins that can manage system departments.
    /// </summary>
    Task<DepartmentDto> CreateAsync(CreateDepartmentRequest request);

    /// <summary>
    /// Update an existing department.
    /// </summary>
    Task<DepartmentDto?> UpdateAsync(Guid id, UpdateDepartmentRequest request);

    /// <summary>
    /// Soft-delete a department (mark IsDeleted).
    /// </summary>
    Task<bool> DeleteAsync(Guid id);

    /// <summary>
    /// Check if a department code already exists (excluding a given id).
    /// </summary>
    Task<bool> CodeExistsAsync(string code, Guid? excludeId = null);
}
