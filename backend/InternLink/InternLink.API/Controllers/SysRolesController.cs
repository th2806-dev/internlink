using InternLink.API.Authorization;
using InternLink.Domain.Entities.Rbac;
using InternLink.Infrastructure.Persistence;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/v1/system/roles")]
[Authorize]
[RequirePermission(SystemPermissionCodes.SystemManage)]
public sealed class SysRolesController : ControllerBase
{
    private static readonly HashSet<string> DepartmentAdminModules = new(StringComparer.OrdinalIgnoreCase)
    {
        "DASHBOARD", "SEMESTERS", "STUDENTS", "LECTURER", "COMPANIES", "ASSIGNMENTS",
        "WEEKLY_REPORTS", "ATTENDANCE", "EVALUATIONS", "SUMMARY", "TEMPLATES", "NOTIFICATIONS"
    };

    private static readonly (string Suffix, string Name)[] Actions =
    [
        ("VIEW", "Xem"),
        ("CREATE", "Thêm"),
        ("UPDATE", "Sửa"),
        ("DELETE", "Xóa"),
        ("EXPORT", "Xuất Excel"),
        ("IMPORT", "Nhập Excel"),
        ("PRINT", "In phiếu"),
        ("APPROVE", "Phê duyệt")
    ];

    private readonly AppDbContext _context;

    public SysRolesController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetRoles(CancellationToken cancellationToken)
    {
        var roles = await _context.SysRoles
            .AsNoTracking()
            .Where(role => role.IsActive)
            .OrderBy(role => role.Name)
            .Select(role => new SysRoleDto(role.AutoId, role.Code, role.Name, role.Description))
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<IReadOnlyList<SysRoleDto>>.Ok(roles));
    }

    [HttpGet("{roleId:long}/permissions")]
    public async Task<IActionResult> GetPermissions(long roleId, CancellationToken cancellationToken)
    {
        if (!await _context.SysRoles.AnyAsync(role => role.AutoId == roleId && role.IsActive, cancellationToken))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy vai trò." }));

        var roots = await _context.SysFunctions
            .AsNoTracking()
            .Where(function => function.IsActive && function.ParentId == null)
            .OrderBy(function => function.SortOrder)
            .Select(function => new { function.ModuleCode, function.Code, function.Name, function.SortOrder })
            .ToListAsync(cancellationToken);
        var actions = await _context.SysFunctions
            .AsNoTracking()
            .Where(function => function.IsActive && function.IsAction)
            .Select(function => new
            {
                function.AutoId,
                function.ModuleCode,
                function.Code,
                function.Name,
                Granted = function.RolePermissions
                    .Where(permission => permission.SysRoleId == roleId)
                    .Select(permission => (bool?)permission.IsGranted)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);
        var actionByCode = actions.ToDictionary(item => item.Code, StringComparer.OrdinalIgnoreCase);

        var matrix = roots.Select(root =>
        {
            bool Granted(string suffix) =>
                actionByCode.TryGetValue($"{root.ModuleCode}.{suffix}", out var action)
                && action.Granted == true;

            return new SysRolePermissionMatrixRowDto(
                root.ModuleCode,
                root.Code,
                root.Name,
                root.SortOrder,
                Granted("VIEW"),
                Granted("CREATE"),
                Granted("UPDATE"),
                Granted("DELETE"),
                Granted("EXPORT"),
                Granted("IMPORT"),
                Granted("PRINT"),
                Granted("APPROVE"));
        }).ToArray();

        return Ok(ApiResponse<IReadOnlyList<SysRolePermissionMatrixRowDto>>.Ok(matrix));
    }

    [HttpPut("{roleId:long}/permissions")]
    public async Task<IActionResult> SavePermissions(
        long roleId,
        [FromBody] IReadOnlyList<SaveSysRolePermissionMatrixRowDto> matrix,
        CancellationToken cancellationToken)
    {
        var role = await _context.SysRoles
            .FirstOrDefaultAsync(item => item.AutoId == roleId && item.IsActive, cancellationToken);
        if (role == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy vai trò." }));
        if (matrix == null || matrix.Count > 100)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Ma trận quyền không hợp lệ." }));
        if (matrix.Any(row => row is null || string.IsNullOrWhiteSpace(row.ModuleCode)))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Phân hệ trong ma trận không hợp lệ." }));
        if (matrix.Select(row => row.ModuleCode).Distinct(StringComparer.OrdinalIgnoreCase).Count() != matrix.Count)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Phân hệ trong ma trận bị trùng." }));

        var moduleCodes = (await _context.SysFunctions
                .Where(function => function.IsActive && function.ParentId == null)
                .Select(function => function.ModuleCode)
                .Distinct()
                .ToListAsync(cancellationToken))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (matrix.Count != moduleCodes.Count
            || matrix.Any(row => !moduleCodes.Contains(row.ModuleCode.Trim())))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Ma trận phải bao gồm đầy đủ các phân hệ hiện có." }));

        var functions = await _context.SysFunctions
            .Where(function => function.IsActive && function.IsAction)
            .ToListAsync(cancellationToken);
        var byCode = functions.ToDictionary(function => function.Code, StringComparer.OrdinalIgnoreCase);
        var permissions = await _context.SysRolePermissions
            .Where(permission => permission.SysRoleId == roleId)
            .ToDictionaryAsync(permission => permission.SysFunctionId, cancellationToken);

        foreach (var row in matrix)
        {
            var moduleCode = row.ModuleCode.Trim().ToUpperInvariant();
            var values = new[]
            {
                row.CanView, row.CanCreate, row.CanEdit, row.CanDelete,
                row.CanExport, row.CanImport, row.CanPrint, row.CanApprove
            };
            for (var index = 0; index < Actions.Length; index++)
            {
                if (!byCode.TryGetValue($"{moduleCode}.{Actions[index].Suffix}", out var function))
                    continue;

                var isGranted = role.Code.Equals("DepartmentAdmin", StringComparison.OrdinalIgnoreCase)
                    && !DepartmentAdminModules.Contains(moduleCode)
                    ? false
                    : values[index];
                if (permissions.TryGetValue(function.AutoId, out var permission))
                {
                    permission.IsGranted = isGranted;
                }
                else
                {
                    permission = new SysRolePermission
                    {
                        SysRoleId = roleId,
                        SysFunctionId = function.AutoId,
                        IsGranted = isGranted
                    };
                    _context.SysRolePermissions.Add(permission);
                    permissions.Add(function.AutoId, permission);
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return await GetPermissions(roleId, cancellationToken);
    }

    [HttpPost("{roleId:long}/permissions/reset")]
    public async Task<IActionResult> ResetPermissions(long roleId, CancellationToken cancellationToken)
    {
        var role = await _context.SysRoles
            .FirstOrDefaultAsync(item => item.AutoId == roleId && item.IsActive, cancellationToken);
        if (role == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy vai trò." }));

        var functions = await _context.SysFunctions
            .Where(function => function.IsActive && function.IsAction)
            .ToListAsync(cancellationToken);
        var permissions = await _context.SysRolePermissions
            .Where(permission => permission.SysRoleId == roleId)
            .ToDictionaryAsync(permission => permission.SysFunctionId, cancellationToken);
        foreach (var function in functions)
        {
            var granted = role.Code.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase)
                || role.Code.Equals("DepartmentAdmin", StringComparison.OrdinalIgnoreCase)
                    && DepartmentAdminModules.Contains(function.ModuleCode);
            if (permissions.TryGetValue(function.AutoId, out var permission))
                permission.IsGranted = granted;
            else
                _context.SysRolePermissions.Add(new SysRolePermission
                {
                    SysRoleId = roleId,
                    SysFunctionId = function.AutoId,
                    IsGranted = granted
                });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return await GetPermissions(roleId, cancellationToken);
    }
}

public sealed record SysRoleDto(long Id, string Code, string Name, string? Description);

public sealed record SysRolePermissionMatrixRowDto(
    string ModuleCode,
    string FeatureCode,
    string FunctionName,
    int SortOrder,
    bool CanView,
    bool CanCreate,
    bool CanEdit,
    bool CanDelete,
    bool CanExport,
    bool CanImport,
    bool CanPrint,
    bool CanApprove);

public sealed record SaveSysRolePermissionMatrixRowDto(
    string ModuleCode,
    bool CanView,
    bool CanCreate,
    bool CanEdit,
    bool CanDelete,
    bool CanExport,
    bool CanImport,
    bool CanPrint,
    bool CanApprove);
