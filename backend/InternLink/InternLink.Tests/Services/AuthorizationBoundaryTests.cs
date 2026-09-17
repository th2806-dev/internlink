using System.Security.Claims;
using FluentAssertions;
using InternLink.Shared.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;

namespace InternLink.Tests.Services;

public class AuthorizationBoundaryTests
{
    private readonly IAuthorizationService _authorizationService;

    public AuthorizationBoundaryTests()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorization(options =>
        {
            options.AddPolicy(AdminPolicies.SuperAdmin, policy => policy.RequireRole("SuperAdmin"));
            options.AddPolicy(AdminPolicies.DepartmentAdmin, policy => policy.RequireRole("DepartmentAdmin"));
        });

        _authorizationService = services.BuildServiceProvider()
            .GetRequiredService<IAuthorizationService>();
    }

    [Fact]
    public async Task DepartmentAdmin_CannotAuthorizeSuperAdminPolicy()
    {
        var result = await _authorizationService.AuthorizeAsync(
            CreateUser("DepartmentAdmin"),
            null,
            AdminPolicies.SuperAdmin);

        result.Succeeded.Should().BeFalse();
    }

    [Fact]
    public async Task SuperAdmin_CannotAuthorizeDepartmentAdminPolicy()
    {
        var result = await _authorizationService.AuthorizeAsync(
            CreateUser("SuperAdmin"),
            null,
            AdminPolicies.DepartmentAdmin);

        result.Succeeded.Should().BeFalse();
    }

    [Fact]
    public async Task EachAdminRole_CanAuthorizeOnlyItsOwnBoundaryPolicy()
    {
        var superAdmin = await _authorizationService.AuthorizeAsync(
            CreateUser("SuperAdmin"),
            null,
            AdminPolicies.SuperAdmin);
        var departmentAdmin = await _authorizationService.AuthorizeAsync(
            CreateUser("DepartmentAdmin"),
            null,
            AdminPolicies.DepartmentAdmin);

        superAdmin.Succeeded.Should().BeTrue();
        departmentAdmin.Succeeded.Should().BeTrue();
    }

    private static ClaimsPrincipal CreateUser(string role)
    {
        var identity = new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.Role, role) },
            "TestAuth");

        return new ClaimsPrincipal(identity);
    }
}
