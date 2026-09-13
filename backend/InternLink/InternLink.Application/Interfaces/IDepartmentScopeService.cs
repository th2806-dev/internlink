using System.Security.Claims;
using InternLink.Domain.Common;

namespace InternLink.Application.Interfaces;

/// <summary>
/// Provides department-based data scoping for multi-tenant access control.
/// SuperAdmin (DepartmentId = null) sees all departments.
/// DepartmentAdmin/Lecturer/Student sees only their assigned department.
/// </summary>
public interface IDepartmentScopeService
{
    /// <summary>
    /// Get the DepartmentId of the currently authenticated user.
    /// Returns null for SuperAdmin (full access to all departments).
    /// </summary>
    Guid? GetCurrentDepartmentId(ClaimsPrincipal user);

    /// <summary>
    /// Resolve the effective department filter for a list/query endpoint.
    /// DepartmentAdmin (has DepartmentId claim) is always locked to their own department,
    /// regardless of what the client requests.
    /// SuperAdmin (no claim) may narrow the view to a requested department via query param;
    /// a null/empty request means "all departments".
    /// </summary>
    Guid? ResolveEffectiveDepartmentId(ClaimsPrincipal user, Guid? requestedDepartmentId);

    /// <summary>
    /// Check if the current user has access to a resource belonging to the given department.
    /// SuperAdmin always has access. Others only if the department matches.
    /// </summary>
    bool HasAccess(ClaimsPrincipal user, Guid? resourceDepartmentId);

    /// <summary>
    /// Apply department filter to a queryable. Returns unfiltered for SuperAdmin.
    /// </summary>
    IQueryable<T> ApplyFilter<T>(IQueryable<T> query, ClaimsPrincipal user)
        where T : class, IDepartmentScoped;

    /// <summary>
    /// Ensure the entity's DepartmentId is set to the current user's department.
    /// For SuperAdmin, leaves it as-is (can be null or any value).
    /// For DepartmentAdmin, forces it to their department.
    /// </summary>
    void EnforceDepartment<T>(T entity, ClaimsPrincipal user)
        where T : class, IDepartmentScoped;
}
