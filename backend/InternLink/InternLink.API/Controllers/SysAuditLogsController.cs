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
[Route("api/v1/system/audit-logs")]
[Authorize]
[RequirePermission(SystemPermissionCodes.AuditView)]
public sealed class SysAuditLogsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SysAuditLogsController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? actionType,
        [FromQuery] string? tableName,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        if (from.HasValue && to.HasValue && from.Value > to.Value)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Khoảng ngày không hợp lệ." }));
        if (page < 1 || pageSize is < 1 or > 250)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Thông số phân trang không hợp lệ." }));

        var query = _context.SysAuditLogs.AsNoTracking().AsQueryable();
        if (from.HasValue)
            query = query.Where(log => log.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(log => log.CreatedAt < to.Value);
        if (!string.IsNullOrWhiteSpace(actionType))
        {
            var normalizedAction = actionType.Trim().ToUpperInvariant();
            if (normalizedAction is not ("CREATE" or "UPDATE" or "SOFT_DELETE"))
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Loại thao tác không hợp lệ." }));
            query = query.Where(log => log.ActionType == normalizedAction);
        }
        if (!string.IsNullOrWhiteSpace(tableName))
        {
            var normalizedTable = tableName.Trim();
            query = query.Where(log => log.TableName.Contains(normalizedTable));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(log => log.CreatedAt)
            .ThenByDescending(log => log.AutoId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(log => new SysAuditLogDto(
                log.AutoId,
                log.CreatedAt,
                log.ActionType,
                log.TableName,
                log.RecordId,
                log.Username,
                log.UserId,
                log.FunctionCode,
                log.IpAddress,
                log.OldValuesJson,
                log.NewValuesJson))
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<SysAuditLogPageDto>.Ok(new SysAuditLogPageDto(items, totalCount, page, pageSize)));
    }
}

public sealed record SysAuditLogDto(
    long Id,
    DateTime CreatedAt,
    string ActionType,
    string TableName,
    string RecordId,
    string? Username,
    Guid? UserId,
    string? FunctionCode,
    string? IpAddress,
    string? OldValuesJson,
    string? NewValuesJson);

public sealed record SysAuditLogPageDto(
    IReadOnlyList<SysAuditLogDto> Items,
    int TotalCount,
    int Page,
    int PageSize);
