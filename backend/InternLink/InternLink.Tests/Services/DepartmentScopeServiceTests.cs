using System.Security.Claims;
using FluentAssertions;
using InternLink.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace InternLink.Tests.Services;

public class DepartmentScopeServiceTests
{
    private readonly DepartmentScopeService _sut = new(NullLogger<DepartmentScopeService>.Instance);

    private static ClaimsPrincipal CreateUser(string? departmentId)
    {
        var claims = new List<Claim>();
        if (departmentId != null)
            claims.Add(new Claim("DepartmentId", departmentId));

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
    }

    [Fact]
    public void ResolveEffectiveDepartmentId_ForDepartmentAdmin_AlwaysReturnsOwnDepartment()
    {
        // DepartmentAdmin cannot widen (or narrow) their scope via the query param.
        var ownDept = Guid.NewGuid();
        var requested = Guid.NewGuid();
        var user = CreateUser(ownDept.ToString());

        var result = _sut.ResolveEffectiveDepartmentId(user, requested);

        result.Should().Be(ownDept);
    }

    [Fact]
    public void ResolveEffectiveDepartmentId_ForSuperAdmin_ReturnsRequestedDepartment()
    {
        var requested = Guid.NewGuid();
        var user = CreateUser(departmentId: null); // SuperAdmin has no DepartmentId claim

        var result = _sut.ResolveEffectiveDepartmentId(user, requested);

        result.Should().Be(requested);
    }

    [Fact]
    public void ResolveEffectiveDepartmentId_ForSuperAdmin_WithNullRequest_ReturnsNull_AllDepartments()
    {
        var user = CreateUser(departmentId: null);

        var result = _sut.ResolveEffectiveDepartmentId(user, null);

        result.Should().BeNull();
    }
}
