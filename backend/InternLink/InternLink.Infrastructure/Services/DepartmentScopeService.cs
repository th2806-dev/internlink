using System.Security.Claims;
using InternLink.Application.Interfaces;
using InternLink.Domain.Common;
using Microsoft.Extensions.Logging;

namespace InternLink.Infrastructure.Services;

/// <summary>
/// Implements department-based data scoping.
/// Reads DepartmentId from JWT claims.
/// SuperAdmin (no DepartmentId claim) sees all data.
/// DepartmentAdmin/Lecturer/Student sees only their department's data.
/// </summary>
public sealed class DepartmentScopeService : IDepartmentScopeService
{
    private readonly ILogger<DepartmentScopeService> _logger;

    public DepartmentScopeService(ILogger<DepartmentScopeService> logger)
    {
        _logger = logger;
    }

    public Guid? GetCurrentDepartmentId(ClaimsPrincipal user)
    {
        // SuperAdmin has no DepartmentId claim → sees all
        var deptClaim = user.FindFirst("DepartmentId")?.Value;
        if (string.IsNullOrEmpty(deptClaim))
            return null;

        if (Guid.TryParse(deptClaim, out var deptId))
            return deptId;

        _logger.LogWarning("Invalid DepartmentId claim: {Value}", deptClaim);
        return null;
    }

    public Guid? ResolveEffectiveDepartmentId(ClaimsPrincipal user, Guid? requestedDepartmentId)
    {
        var userDeptId = GetCurrentDepartmentId(user);

        // DepartmentAdmin is always locked to their own department,
        // even if the client sends another departmentId.
        if (userDeptId.HasValue)
            return userDeptId.Value;

        // SuperAdmin: use the requested department filter (null = all departments).
        return requestedDepartmentId;
    }

    public bool HasAccess(ClaimsPrincipal user, Guid? resourceDepartmentId)
    {
        var userDeptId = GetCurrentDepartmentId(user);

        // SuperAdmin sees everything
        if (userDeptId == null)
            return true;

        // If resource has no department, allow (e.g. global data)
        if (resourceDepartmentId == null)
            return true;

        // DepartmentAdmin/Lecturer/Student can only see their own department
        return userDeptId.Value == resourceDepartmentId.Value;
    }

    public IQueryable<T> ApplyFilter<T>(IQueryable<T> query, ClaimsPrincipal user)
        where T : class, IDepartmentScoped
    {
        var deptId = GetCurrentDepartmentId(user);

        // SuperAdmin sees all
        if (deptId == null)
            return query;

        // Filter by DepartmentId
        return query.Where(e => e.DepartmentId == deptId.Value);
    }

    public void EnforceDepartment<T>(T entity, ClaimsPrincipal user)
        where T : class, IDepartmentScoped
    {
        var deptId = GetCurrentDepartmentId(user);

        // SuperAdmin can set any DepartmentId (or leave null)
        if (deptId == null)
            return;

        // DepartmentAdmin: force to their department
        entity.DepartmentId = deptId.Value;
    }
}
