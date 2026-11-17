using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using InternLink.API.Authorization;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.Rbac;
using InternLink.Infrastructure.Persistence;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/v1/system/functions")]
[Authorize]
public sealed class SysFunctionsController : ControllerBase
{
    private static readonly TimeSpan MenuCacheDuration = TimeSpan.FromMinutes(30);
    private static int _menuCacheVersion;
    private readonly AppDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ISysFunctionService _functionService;

    public SysFunctionsController(
        AppDbContext context,
        IMemoryCache cache,
        ISysFunctionService functionService)
    {
        _context = context;
        _cache = cache;
        _functionService = functionService;
    }

    [HttpGet("my-menu")]
    public async Task<IActionResult> GetMyMenu(CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(userIdValue, out var userId))
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Không xác định được người dùng." }));

        var isActiveUser = await _context.SysUsers
            .AnyAsync(user => user.PublicId == userId
                && user.IsActive
                && user.LegacyUser.IsActive
                && !user.LegacyUser.IsDeleted, cancellationToken);
        if (!isActiveUser)
            return Forbid();

        var impersonatedRoleCode = User.IsInRole("SuperAdmin")
            ? Request.Headers["X-Impersonate-Role"].FirstOrDefault()
            : null;
        var menu = await _cache.GetOrCreateAsync(
            $"system-menu:{Volatile.Read(ref _menuCacheVersion)}:{userId:D}:{impersonatedRoleCode ?? "current"}",
            async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = MenuCacheDuration;
                return await BuildMenuAsync(userId, impersonatedRoleCode, cancellationToken);
            });

        return Ok(ApiResponse<IReadOnlyList<SystemMenuItemDto>>.Ok(menu ?? []));
    }

    [HttpGet("tree")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetTree(
        [FromQuery] bool includeHidden = false,
        CancellationToken cancellationToken = default)
    {
        var tree = await _functionService.GetTreeAsync(includeHidden, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<SysFunctionDto>>.Ok(tree));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var function = await _functionService.GetByPublicIdAsync(id, cancellationToken);
        return function == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy chức năng." }))
            : Ok(ApiResponse<SysFunctionDto>.Ok(function));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Create(
        [FromBody] CreateSysFunctionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var function = await _functionService.CreateAsync(request, cancellationToken);
            InvalidateMenuCache();
            return CreatedAtAction(
                nameof(GetById),
                new { id = function.Id },
                ApiResponse<SysFunctionDto>.Ok(function));
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateSysFunctionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var function = await _functionService.UpdateAsync(id, request, cancellationToken);
            if (function != null)
                InvalidateMenuCache();
            return function == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy chức năng." }))
                : Ok(ApiResponse<SysFunctionDto>.Ok(function));
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _functionService.DeleteAsync(id, cancellationToken);
            if (!deleted)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy chức năng." }));
            InvalidateMenuCache();
            return NoContent();
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    [HttpPut("reorder")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Reorder(
        [FromBody] ReorderFunctionsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _functionService.ReorderAsync(request, cancellationToken);
            InvalidateMenuCache();
            return NoContent();
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    private static void InvalidateMenuCache() => Interlocked.Increment(ref _menuCacheVersion);

    private async Task<IReadOnlyList<SystemMenuItemDto>> BuildMenuAsync(
        Guid userId,
        string? impersonatedRoleCode,
        CancellationToken cancellationToken)
    {
        var impersonatedRoleId = string.IsNullOrWhiteSpace(impersonatedRoleCode)
            ? null
            : await _context.SysRoles
                .Where(role => role.IsActive && !role.IsDeleted && role.Code == impersonatedRoleCode)
                .Select(role => (long?)role.AutoId)
                .FirstOrDefaultAsync(cancellationToken);
        var grantedIds = impersonatedRoleId.HasValue
            ? await _context.SysRolePermissions
                .Where(permission => permission.SysRoleId == impersonatedRoleId
                    && permission.IsGranted
                    && !permission.IsDeleted)
                .Select(permission => permission.SysFunctionId)
                .ToListAsync(cancellationToken)
            : User.IsInRole("SuperAdmin")
                ? await _context.SysFunctions
                    .Where(function => function.IsActive && !function.IsDeleted)
                    .Select(function => function.AutoId)
                    .ToListAsync(cancellationToken)
            : await _context.SysUsers
                .Where(user => user.PublicId == userId)
                .SelectMany(user => user.Roles)
                .SelectMany(userRole => userRole.Role.Permissions)
                .Where(permission => permission.IsGranted)
                .Select(permission => permission.SysFunctionId)
                .ToListAsync(cancellationToken);
        var granted = grantedIds.ToHashSet();
        var viewableModules = await _context.SysFunctions
            .AsNoTracking()
            .Where(function => function.IsActive
                && !function.IsDeleted
                && function.IsAction
                && function.Code.EndsWith(".VIEW")
                && granted.Contains(function.AutoId))
            .Select(function => function.ModuleCode)
            .Distinct()
            .ToListAsync(cancellationToken);
        var functions = await _context.SysFunctions
            .AsNoTracking()
            .Where(function => function.IsActive && !function.IsDeleted && function.IsVisibleInMenu)
            .OrderBy(function => function.SortOrder)
            .ThenBy(function => function.Name)
            .ToListAsync(cancellationToken);
        var childrenByParent = functions
            .Where(function => function.ParentId.HasValue)
            .GroupBy(function => function.ParentId!.Value)
            .ToDictionary(group => group.Key, group => group.ToArray());
        var roots = functions.Where(function => function.ParentId == null).ToArray();

        SystemMenuItemDto? BuildMenuItem(SysFunction function)
        {
            var children = childrenByParent.TryGetValue(function.AutoId, out var childrenForParent)
                ? childrenForParent
                    .Select(BuildMenuItem)
                    .Where(item => item != null)
                    .Cast<SystemMenuItemDto>()
                    .ToArray()
                : [];
            var hasPermission = granted.Contains(function.AutoId)
                || (!function.IsAction
                    && function.FuncUrl != null
                    && viewableModules.Contains(function.ModuleCode, StringComparer.OrdinalIgnoreCase));
            if (children.Length == 0 && !hasPermission)
                return null;

            return new SystemMenuItemDto(
                function.Code,
                function.Name,
                function.ModuleCode,
                function.SortOrder,
                function.FuncUrl,
                function.IconName,
                function.BadgeText,
                children);
        }

        return roots
            .Select(BuildMenuItem)
            .Where(item => item != null)
            .Cast<SystemMenuItemDto>()
            .ToArray();
    }
}

public sealed record SystemMenuItemDto(
    string Code,
    string Name,
    string ModuleCode,
    int SortOrder,
    string? FuncUrl,
    string? IconName,
    string? BadgeText,
    IReadOnlyList<SystemMenuItemDto> Children);
