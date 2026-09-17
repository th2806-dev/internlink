using System.Security.Claims;
using FluentAssertions;
using InternLink.Domain.Common;
using InternLink.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace InternLink.Tests.Services;

public class DepartmentScopeServiceTests
{
    private readonly DepartmentScopeService _sut = new(NullLogger<DepartmentScopeService>.Instance);

    private static ClaimsPrincipal CreateUser(string? departmentId, string role = "DepartmentAdmin")
    {
        var claims = new List<Claim> { new(ClaimTypes.Role, role) };
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
        var user = CreateUser(departmentId: null, role: "SuperAdmin");

        var result = _sut.ResolveEffectiveDepartmentId(user, null);

        result.Should().BeNull();
    }

    [Fact]
    public void HasAccess_ForDepartmentAdmin_DeniesAnotherDepartment()
    {
        var ownDepartment = Guid.NewGuid();
        var otherDepartment = Guid.NewGuid();
        var user = CreateUser(ownDepartment.ToString());

        _sut.HasAccess(user, ownDepartment).Should().BeTrue();
        _sut.HasAccess(user, otherDepartment).Should().BeFalse();
    }

    [Fact]
    public void HasAccess_ForSuperAdmin_AllowsAnyDepartment()
    {
        var user = CreateUser(departmentId: null, role: "SuperAdmin");

        _sut.HasAccess(user, Guid.NewGuid()).Should().BeTrue();
    }

    [Fact]
    public void ApplyFilter_ForDepartmentAdmin_ReturnsOnlyOwnDepartmentRecords()
    {
        var ownDepartment = Guid.NewGuid();
        var user = CreateUser(ownDepartment.ToString());
        var records = new[]
        {
            new ScopedRecord { DepartmentId = ownDepartment },
            new ScopedRecord { DepartmentId = Guid.NewGuid() },
            new ScopedRecord { DepartmentId = ownDepartment },
        }.AsQueryable();

        var filtered = _sut.ApplyFilter(records, user).ToList();

        filtered.Should().HaveCount(2);
        filtered.Should().OnlyContain(record => record.DepartmentId == ownDepartment);
    }

    private sealed class ScopedRecord : IDepartmentScoped
    {
        public Guid? DepartmentId { get; set; }
    }
}
