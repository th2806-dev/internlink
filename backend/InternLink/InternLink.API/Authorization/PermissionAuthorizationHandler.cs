using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Authorization;

public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly AppDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public PermissionAuthorizationHandler(AppDbContext context, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var userIdValue = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(userIdValue, out var userId))
            return;

        var cancellationToken = _httpContextAccessor.HttpContext?.RequestAborted ?? CancellationToken.None;
        var hasPermission = await _context.SysUsers
            .Where(user => user.PublicId == userId
                && user.IsActive
                && user.LegacyUser.IsActive
                && !user.LegacyUser.IsDeleted)
            .SelectMany(user => user.Roles)
            .SelectMany(userRole => userRole.Role.Permissions.Where(permission => permission.IsGranted))
            .AnyAsync(permission =>
                permission.Function.Code == requirement.PermissionCode &&
                permission.Function.IsActive,
                cancellationToken);

        if (hasPermission)
            context.Succeed(requirement);
    }
}
