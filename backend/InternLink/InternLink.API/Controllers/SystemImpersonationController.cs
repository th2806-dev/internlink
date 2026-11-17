using InternLink.Infrastructure.Persistence;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/v1/system/impersonation")]
[Authorize(Roles = "SuperAdmin")]
public sealed class SystemImpersonationController : ControllerBase
{
    private readonly AppDbContext _context;

    public SystemImpersonationController(AppDbContext context) => _context = context;

    [HttpGet("available-targets")]
    public async Task<IActionResult> GetAvailableTargets(CancellationToken cancellationToken)
    {
        var targets = await _context.SysRoles
            .AsNoTracking()
            .Where(role => role.IsActive
                && !role.IsDeleted
                && role.Code != "SuperAdmin")
            .OrderBy(role => role.Name)
            .Select(role => new ImpersonationTargetDto(role.AutoId, role.Code, role.Name))
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<IReadOnlyList<ImpersonationTargetDto>>.Ok(targets));
    }

    [HttpPost("token")]
    public async Task<IActionResult> StartPreview(
        [FromBody] StartImpersonationRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RoleCode))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Vai trò mô phỏng là bắt buộc." }));

        var role = await _context.SysRoles
            .AsNoTracking()
            .Where(item => item.IsActive && !item.IsDeleted && item.Code != "SuperAdmin")
            .FirstOrDefaultAsync(
                item => item.Code == request.RoleCode.Trim(),
                cancellationToken);
        if (role == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy vai trò mô phỏng." }));

        var result = new ImpersonationContextDto(
            role.AutoId,
            role.Code,
            role.Name,
            DateTimeOffset.UtcNow,
            true);
        return Ok(ApiResponse<ImpersonationContextDto>.Ok(result));
    }
}

public sealed record ImpersonationTargetDto(long RoleId, string RoleCode, string RoleName);

public sealed record StartImpersonationRequest(string RoleCode);

public sealed record ImpersonationContextDto(
    long RoleId,
    string RoleCode,
    string RoleName,
    DateTimeOffset StartedAt,
    bool IsVisualOnly);
