using System.Text.Json;
using System.Text.RegularExpressions;
using System.Security.Claims;
using InternLink.API.Authorization;
using InternLink.Domain.Entities.Rbac;
using InternLink.Infrastructure.Persistence;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/v1/system/grid-configs")]
[Authorize]
public sealed partial class SysGridConfigsController : ControllerBase
{
    private static readonly HashSet<string> SupportedFormats =
        new(StringComparer.OrdinalIgnoreCase) { "text", "date", "number", "percent", "currency" };
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(60);
    private readonly AppDbContext _context;
    private readonly IMemoryCache _cache;

    public SysGridConfigsController(AppDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    [HttpGet("{featureCode}")]
    public async Task<IActionResult> Get(
        string featureCode,
        [FromQuery] long? roleId,
        [FromQuery] bool currentUser,
        CancellationToken cancellationToken)
    {
        if (!IsValidFeatureCode(featureCode))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Mã màn hình không hợp lệ." }));
        if (roleId is <= 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Vai trò không hợp lệ." }));

        var normalizedFeatureCode = featureCode.Trim().ToUpperInvariant();
        var tenantId = GetTenantId();
        if (tenantId?.Length > 50)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Mã đơn vị không được vượt quá 50 ký tự." }));

        var effectiveRoleId = roleId;
        if (currentUser && !effectiveRoleId.HasValue)
        {
            var impersonatedRoleCode = User.IsInRole("SuperAdmin")
                ? Request.Headers["X-Impersonate-Role"].FirstOrDefault()
                : null;
            effectiveRoleId = !string.IsNullOrWhiteSpace(impersonatedRoleCode)
                ? await GetRoleIdAsync(impersonatedRoleCode, cancellationToken)
                : await GetCurrentRoleIdAsync(cancellationToken);
        }
        if (effectiveRoleId.HasValue
            && !await IsActiveRoleAsync(effectiveRoleId.Value, cancellationToken))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy vai trò." }));

        var cacheKey = CacheKey(
            normalizedFeatureCode,
            effectiveRoleId,
            tenantId,
            _cache.Get<string>(CacheVersionKey(normalizedFeatureCode)) ?? string.Empty);
        if (!_cache.TryGetValue<IReadOnlyList<SysGridConfigDto>>(cacheKey, out var configs) || configs == null)
        {
            configs = await LoadConfigsAsync(normalizedFeatureCode, effectiveRoleId, tenantId, cancellationToken);
            _cache.Set(cacheKey, configs, CacheDuration);
        }

        return Ok(ApiResponse<IReadOnlyList<SysGridConfigDto>>.Ok(configs));
    }

    [HttpPut("{featureCode}")]
    [RequirePermission(SystemPermissionCodes.ConfigurationUpdate)]
    public async Task<IActionResult> Put(
        string featureCode,
        [FromBody] IReadOnlyList<SaveSysGridConfigDto> configs,
        [FromQuery] long? roleId,
        CancellationToken cancellationToken)
    {
        if (!IsValidFeatureCode(featureCode))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Mã màn hình không hợp lệ." }));
        if (configs == null)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Danh sách cột là bắt buộc." }));
        if (roleId is <= 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Vai trò không hợp lệ." }));

        var normalizedFeatureCode = featureCode.Trim().ToUpperInvariant();
        var tenantId = GetTenantId();
        if (tenantId?.Length > 50)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Mã đơn vị không được vượt quá 50 ký tự." }));
        if (roleId.HasValue
            && !await _context.SysRoles.AnyAsync(role => role.AutoId == roleId && role.IsActive, cancellationToken))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy vai trò." }));

        var validationError = ValidateConfigs(configs);
        if (validationError != null)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = validationError }));

        var existing = await _context.SysGridConfigs
            .Where(config => config.FeatureCode == normalizedFeatureCode
                && config.RoleId == roleId
                && config.TenantId == tenantId)
            .ToListAsync(cancellationToken);
        var byFieldCode = existing.ToDictionary(config => config.FieldCode, StringComparer.OrdinalIgnoreCase);
        var submittedFields = configs.Select(config => config.FieldCode.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var config in existing.Where(config => !submittedFields.Contains(config.FieldCode)))
            config.IsVisible = false;

        foreach (var config in configs)
        {
            var fieldCode = config.FieldCode.Trim();
            if (!byFieldCode.TryGetValue(fieldCode, out var entity))
            {
                entity = new SysGridConfig
                {
                    FeatureCode = normalizedFeatureCode,
                    FieldCode = fieldCode,
                    RoleId = roleId,
                    TenantId = tenantId
                };
                _context.SysGridConfigs.Add(entity);
                byFieldCode.Add(fieldCode, entity);
            }

            entity.HeaderTitle = config.HeaderTitle.Trim();
            entity.ColumnWidth = config.ColumnWidth;
            entity.IsVisible = config.IsVisible;
            entity.IsFrozen = config.IsFrozen;
            entity.FrozenSide = NormalizeFrozenSide(config.FrozenSide);
            entity.SortOrder = config.SortOrder;
            entity.HeaderBgColor = NormalizeColor(config.HeaderBgColor);
            entity.HeaderTextColor = NormalizeColor(config.HeaderTextColor);
            entity.CellFormatType = config.CellFormatType.Trim().ToLowerInvariant();
            entity.CellColorRuleJson = config.CellColorRuleJson;
        }

        await _context.SaveChangesAsync(cancellationToken);
        InvalidateFeatureCache(normalizedFeatureCode);

        var result = byFieldCode.Values
            .OrderBy(config => config.SortOrder)
            .Select(ToDto)
            .ToArray();
        return Ok(ApiResponse<IReadOnlyList<SysGridConfigDto>>.Ok(result));
    }

    private static string? ValidateConfigs(IReadOnlyList<SaveSysGridConfigDto> configs)
    {
        if (configs.Count > 200)
            return "Mỗi màn hình chỉ được cấu hình tối đa 200 cột.";
        if (configs.Any(config => config is null))
            return "Danh sách cột có phần tử không hợp lệ.";
        if (configs.Any(config => string.IsNullOrWhiteSpace(config.FieldCode)
                || !FieldCodeRegex().IsMatch(config.FieldCode.Trim())))
            return "Mã cột phải bắt đầu bằng chữ cái và chỉ chứa chữ, số, dấu gạch dưới hoặc dấu chấm.";
        if (configs.GroupBy(config => config.FieldCode.Trim(), StringComparer.OrdinalIgnoreCase)
            .Any(group => group.Count() > 1))
            return "Danh sách có mã cột bị trùng.";
        if (configs.Any(config => string.IsNullOrWhiteSpace(config.HeaderTitle) || config.HeaderTitle.Trim().Length > 200))
            return "Tiêu đề cột bắt buộc và không được vượt quá 200 ký tự.";
        if (configs.Any(config => config.ColumnWidth is < 40 or > 1000))
            return "Độ rộng cột phải nằm trong khoảng 40 đến 1000 pixel.";
        if (configs.Any(config => !SupportedFormats.Contains(config.CellFormatType)))
            return "Kiểu định dạng ô không được hỗ trợ.";
        if (configs.Any(config =>
                !string.Equals(config.FrozenSide, "left", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(config.FrozenSide, "right", StringComparison.OrdinalIgnoreCase)))
            return "Vị trí ghim cột phải là bên trái hoặc bên phải.";
        if (configs.Any(config => !IsValidColor(config.HeaderBgColor) || !IsValidColor(config.HeaderTextColor)))
            return "Màu cột phải có định dạng hex #RGB, #RRGGBB hoặc #RRGGBBAA.";
        if (configs.Any(config => config.CellColorRuleJson is { Length: > 4000 }))
            return "Quy tắc màu ô không được vượt quá 4000 ký tự.";
        if (configs.Any(config => !IsValidJson(config.CellColorRuleJson)))
            return "Quy tắc màu ô phải là JSON hợp lệ.";

        return null;
    }

    private static bool IsValidFeatureCode(string? featureCode) =>
        featureCode != null && FeatureCodeRegex().IsMatch(featureCode.Trim());

    private static bool IsValidColor(string? color) =>
        string.IsNullOrWhiteSpace(color) || ColorRegex().IsMatch(color.Trim());

    private static string? NormalizeColor(string? color) =>
        string.IsNullOrWhiteSpace(color) ? null : color.Trim().ToUpperInvariant();

    private static string NormalizeFrozenSide(string? frozenSide) =>
        string.Equals(frozenSide, "right", StringComparison.OrdinalIgnoreCase) ? "right" : "left";

    private string? GetTenantId()
    {
        var tenantId = User.FindFirst("tenantId")?.Value
            ?? User.FindFirst("departmentId")?.Value
            ?? User.FindFirst("department_id")?.Value;
        return string.IsNullOrWhiteSpace(tenantId) ? null : tenantId.Trim();
    }

    private async Task<long?> GetCurrentRoleIdAsync(CancellationToken cancellationToken)
    {
        var roleCode = User.FindFirst(ClaimTypes.Role)?.Value
            ?? User.FindFirst("role")?.Value;
        if (string.IsNullOrWhiteSpace(roleCode))
            return null;

        var cacheKey = $"grid-role-id:{roleCode}";
        if (_cache.TryGetValue(cacheKey, out long? cachedRoleId))
            return cachedRoleId;

        var roleId = await _context.SysRoles
            .Where(role => role.IsActive && role.Code == roleCode)
            .Select(role => (long?)role.AutoId)
            .FirstOrDefaultAsync(cancellationToken);
        _cache.Set(cacheKey, roleId, CacheDuration);
        return roleId;
    }

    private async Task<long?> GetRoleIdAsync(string roleCode, CancellationToken cancellationToken)
    {
        var normalizedRoleCode = roleCode.Trim();
        if (normalizedRoleCode.Length > 100)
            return null;
        return await _context.SysRoles
            .Where(role => role.IsActive && role.Code == normalizedRoleCode)
            .Select(role => (long?)role.AutoId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<bool> IsActiveRoleAsync(long roleId, CancellationToken cancellationToken)
    {
        var cacheKey = $"grid-active-role:{roleId}";
        if (_cache.TryGetValue(cacheKey, out bool isActive))
            return isActive;

        isActive = await _context.SysRoles
            .AnyAsync(role => role.AutoId == roleId && role.IsActive, cancellationToken);
        _cache.Set(cacheKey, isActive, CacheDuration);
        return isActive;
    }

    private async Task<IReadOnlyList<SysGridConfigDto>> LoadConfigsAsync(
        string featureCode,
        long? roleId,
        string? tenantId,
        CancellationToken cancellationToken)
    {
        var scoped = await LoadScopedConfigsAsync(featureCode, roleId, tenantId, cancellationToken);
        if (scoped.Count > 0 || tenantId == null)
            return scoped;

        return await LoadScopedConfigsAsync(featureCode, roleId, null, cancellationToken);
    }

    private async Task<IReadOnlyList<SysGridConfigDto>> LoadScopedConfigsAsync(
        string featureCode,
        long? roleId,
        string? tenantId,
        CancellationToken cancellationToken)
    {
        var query = _context.SysGridConfigs.AsNoTracking()
            .Where(config => config.FeatureCode == featureCode && config.TenantId == tenantId);

        if (roleId.HasValue)
        {
            var roleConfigs = await query
                .Where(config => config.RoleId == roleId)
                .OrderBy(config => config.SortOrder)
                .Select(config => ToDto(config))
                .ToListAsync(cancellationToken);
            if (roleConfigs.Count > 0)
                return roleConfigs;
        }

        return await query
            .Where(config => config.RoleId == null)
            .OrderBy(config => config.SortOrder)
            .Select(config => ToDto(config))
            .ToListAsync(cancellationToken);
    }

    private void InvalidateFeatureCache(string featureCode) =>
        _cache.Set(CacheVersionKey(featureCode), Guid.NewGuid().ToString("N"));

    private static string CacheVersionKey(string featureCode) => $"grid-config-version:{featureCode}";

    private static string CacheKey(string featureCode, long? roleId, string? tenantId, string version) =>
        $"grid-config:{featureCode}:{version}:{roleId?.ToString() ?? "default"}:{(tenantId == null ? "global" : $"tenant-{Uri.EscapeDataString(tenantId)}")}";

    private static bool IsValidJson(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return true;

        try
        {
            using var _ = JsonDocument.Parse(value);
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static SysGridConfigDto ToDto(SysGridConfig config) => new(
        config.FieldCode,
        config.HeaderTitle,
        config.ColumnWidth,
        config.IsVisible,
        config.IsFrozen,
        config.FrozenSide,
        config.SortOrder,
        config.HeaderBgColor,
        config.HeaderTextColor,
        config.CellFormatType,
        config.CellColorRuleJson);

    [GeneratedRegex("^[A-Z][A-Z0-9_]{0,99}$", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase)]
    private static partial Regex FeatureCodeRegex();

    [GeneratedRegex("^[A-Za-z][A-Za-z0-9_.]{0,99}$", RegexOptions.CultureInvariant)]
    private static partial Regex FieldCodeRegex();

    [GeneratedRegex("^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$", RegexOptions.CultureInvariant)]
    private static partial Regex ColorRegex();
}

public sealed record SysGridConfigDto(
    string FieldCode,
    string HeaderTitle,
    int ColumnWidth,
    bool IsVisible,
    bool IsFrozen,
    string FrozenSide,
    int SortOrder,
    string? HeaderBgColor,
    string? HeaderTextColor,
    string CellFormatType,
    string? CellColorRuleJson);

public sealed class SaveSysGridConfigDto
{
    public string FieldCode { get; init; } = string.Empty;
    public string HeaderTitle { get; init; } = string.Empty;
    public int ColumnWidth { get; init; } = 120;
    public bool IsVisible { get; init; } = true;
    public bool IsFrozen { get; init; }
    public string FrozenSide { get; init; } = "left";
    public int SortOrder { get; init; }
    public string? HeaderBgColor { get; init; }
    public string? HeaderTextColor { get; init; }
    public string CellFormatType { get; init; } = "text";
    public string? CellColorRuleJson { get; init; }
}
