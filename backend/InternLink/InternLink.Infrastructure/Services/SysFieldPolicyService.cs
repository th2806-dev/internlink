using System.Text.RegularExpressions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class SysFieldPolicyService : ISysFieldPolicyService
{
    private readonly AppDbContext _db;

    public SysFieldPolicyService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<SysFieldPolicyDto>> GetByFormAsync(
        string formCode,
        long? roleId,
        CancellationToken cancellationToken)
    {
        ValidateFormCode(formCode);
        var normalizedFormCode = formCode.Trim();
        var policies = await _db.SysFieldPolicies
            .AsNoTracking()
            .Where(item => !item.IsDeleted
                && item.FormCode == normalizedFormCode
                && (item.RoleId == null || item.RoleId == roleId))
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.FieldKey)
            .ToListAsync(cancellationToken);

        return policies
            .GroupBy(item => item.FieldKey, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.FirstOrDefault(item => item.RoleId == roleId)
                ?? group.First(item => item.RoleId == null))
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.FieldKey)
            .Select(Map)
            .ToArray();
    }

    public async Task<IReadOnlyList<SysFieldPolicyDto>> GetByFormForRoleAsync(
        string formCode,
        string roleCode,
        CancellationToken cancellationToken)
    {
        var roleId = await _db.SysRoles.AsNoTracking()
            .Where(role => !role.IsDeleted && role.IsActive && role.Code == roleCode)
            .Select(role => (long?)role.AutoId)
            .FirstOrDefaultAsync(cancellationToken);

        return await GetByFormAsync(formCode, roleId, cancellationToken);
    }

    public async Task<IReadOnlyList<SysFieldPolicyDto>> UpsertAsync(
        string formCode,
        long? roleId,
        UpsertSysFieldPoliciesRequest request,
        CancellationToken cancellationToken)
    {
        ValidateFormCode(formCode);
        if (request.Policies == null || request.Policies.Count > 500)
            throw new InvalidOperationException("Danh sách chính sách trường không hợp lệ.");
        if (request.Policies.Any(item => string.IsNullOrWhiteSpace(item.FieldKey)
                || item.FieldKey.Trim().Length > 100))
            throw new InvalidOperationException("Mã trường không được để trống và tối đa 100 ký tự.");
        if (request.Policies.Select(item => item.FieldKey.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase).Count() != request.Policies.Count)
            throw new InvalidOperationException("Danh sách chính sách có mã trường bị trùng.");
        if (roleId is long selectedRoleId
            && !await _db.SysRoles.AnyAsync(
                role => role.AutoId == selectedRoleId && role.IsActive && !role.IsDeleted,
                cancellationToken))
            throw new InvalidOperationException("Không tìm thấy vai trò đang hoạt động.");

        var normalizedFormCode = formCode.Trim();
        var fieldKeys = request.Policies.Select(item => item.FieldKey.Trim()).ToArray();
        var existing = await _db.SysFieldPolicies
            .Where(item => !item.IsDeleted
                && item.FormCode == normalizedFormCode
                && item.RoleId == roleId
                && fieldKeys.Contains(item.FieldKey))
            .ToDictionaryAsync(item => item.FieldKey, StringComparer.OrdinalIgnoreCase, cancellationToken);

        foreach (var item in request.Policies)
        {
            ValidatePolicy(item);
            var fieldKey = item.FieldKey.Trim();
            if (!existing.TryGetValue(fieldKey, out var entity))
            {
                entity = new SysFieldPolicy
                {
                    FormCode = normalizedFormCode,
                    FieldKey = fieldKey,
                    RoleId = roleId
                };
                _db.SysFieldPolicies.Add(entity);
                existing.Add(fieldKey, entity);
            }

            entity.IsVisible = item.IsVisible;
            entity.IsRequired = item.IsRequired;
            entity.IsReadOnly = item.IsReadOnly;
            entity.CustomLabel = Normalize(item.CustomLabel);
            entity.DefaultValue = Normalize(item.DefaultValue);
            entity.ValidationRegex = Normalize(item.ValidationRegex);
            entity.ErrorMessage = Normalize(item.ErrorMessage);
            entity.SortOrder = item.SortOrder;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return await GetByFormAsync(normalizedFormCode, roleId, cancellationToken);
    }

    private static void ValidatePolicy(UpsertSysFieldPolicyItem item)
    {
        ValidateLength(item.CustomLabel, 200, "Nhãn tùy chỉnh");
        ValidateLength(item.DefaultValue, 1000, "Giá trị mặc định");
        ValidateLength(item.ValidationRegex, 500, "Biểu thức kiểm tra");
        ValidateLength(item.ErrorMessage, 500, "Thông báo lỗi");
        if (string.IsNullOrWhiteSpace(item.ValidationRegex))
            return;

        try
        {
            _ = new Regex(item.ValidationRegex, RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(100));
        }
        catch (ArgumentException)
        {
            throw new InvalidOperationException($"Regex không hợp lệ cho trường {item.FieldKey.Trim()}.");
        }
    }

    private static void ValidateFormCode(string formCode)
    {
        if (string.IsNullOrWhiteSpace(formCode) || formCode.Trim().Length > 100)
            throw new InvalidOperationException("Mã biểu mẫu không hợp lệ.");
    }

    private static void ValidateLength(string? value, int maxLength, string label)
    {
        if (value?.Length > maxLength)
            throw new InvalidOperationException($"{label} không được vượt quá {maxLength} ký tự.");
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static SysFieldPolicyDto Map(SysFieldPolicy item) =>
        new(
            item.PublicId,
            item.FormCode,
            item.FieldKey,
            item.RoleId,
            item.IsVisible,
            item.IsRequired,
            item.IsReadOnly,
            item.CustomLabel,
            item.DefaultValue,
            item.ValidationRegex,
            item.ErrorMessage,
            item.SortOrder);
}
