namespace InternLink.Application.DTOs;

public sealed record SysFieldPolicyDto(
    Guid Id,
    string FormCode,
    string FieldKey,
    long? RoleId,
    bool IsVisible,
    bool IsRequired,
    bool IsReadOnly,
    string? CustomLabel,
    string? DefaultValue,
    string? ValidationRegex,
    string? ErrorMessage,
    int SortOrder);

public sealed record UpsertSysFieldPoliciesRequest(IReadOnlyList<UpsertSysFieldPolicyItem> Policies);

public sealed record UpsertSysFieldPolicyItem(
    string FieldKey,
    bool IsVisible,
    bool IsRequired,
    bool IsReadOnly,
    string? CustomLabel,
    string? DefaultValue,
    string? ValidationRegex,
    string? ErrorMessage,
    int SortOrder);
