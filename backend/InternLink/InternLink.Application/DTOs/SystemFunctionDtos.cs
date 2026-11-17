namespace InternLink.Application.DTOs;

public sealed record SysFunctionDto(
    Guid Id,
    long AutoId,
    string Code,
    string Name,
    string? Description,
    long? ParentAutoId,
    Guid? ParentId,
    string ModuleCode,
    int SortOrder,
    bool IsAction,
    bool IsActive,
    string? FuncUrl,
    string? IconName,
    string? BadgeText,
    bool IsVisibleInMenu,
    bool IsView,
    bool IsNew,
    bool IsEdit,
    bool IsDelete,
    bool IsExport,
    IReadOnlyList<SysFunctionDto> Children);

public sealed record CreateSysFunctionRequest(
    string Code,
    string Name,
    string ModuleCode,
    string? Description,
    Guid? ParentId,
    int SortOrder,
    bool IsAction,
    string? FuncUrl,
    string? IconName,
    string? BadgeText,
    bool IsVisibleInMenu,
    bool IsView,
    bool IsNew,
    bool IsEdit,
    bool IsDelete,
    bool IsExport);

public sealed record UpdateSysFunctionRequest(
    string Name,
    string ModuleCode,
    string? Description,
    Guid? ParentId,
    int SortOrder,
    bool IsAction,
    bool IsActive,
    string? FuncUrl,
    string? IconName,
    string? BadgeText,
    bool IsVisibleInMenu,
    bool IsView,
    bool IsNew,
    bool IsEdit,
    bool IsDelete,
    bool IsExport);

public sealed record ReorderFunctionsRequest(IReadOnlyList<FunctionReorderItem> Items);

public sealed record FunctionReorderItem(Guid Id, Guid? NewParentId, int NewSortPriority);
