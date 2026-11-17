using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.Rbac;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class SysFunctionService : ISysFunctionService
{
    private readonly AppDbContext _db;

    public SysFunctionService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<SysFunctionDto>> GetTreeAsync(
        bool includeHidden,
        CancellationToken cancellationToken)
    {
        var functions = await _db.SysFunctions
            .AsNoTracking()
            .Where(item => item.IsActive && !item.IsDeleted && (includeHidden || item.IsVisibleInMenu))
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.Name)
            .ToListAsync(cancellationToken);

        return BuildTree(functions);
    }

    public async Task<SysFunctionDto?> GetByPublicIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var functions = await _db.SysFunctions
            .AsNoTracking()
            .Where(item => item.IsActive && !item.IsDeleted)
            .ToListAsync(cancellationToken);
        var entity = functions.FirstOrDefault(item => item.PublicId == id);
        if (entity == null)
            return null;

        return FindTreeItem(BuildTree(functions), id);
    }

    public async Task<SysFunctionDto> CreateAsync(
        CreateSysFunctionRequest request,
        CancellationToken cancellationToken)
    {
        ValidateText(request.Code, 100, nameof(request.Code));
        ValidateText(request.Name, 200, nameof(request.Name));
        ValidateText(request.ModuleCode, 100, nameof(request.ModuleCode));

        var code = request.Code.Trim();
        if (await _db.SysFunctions.AnyAsync(item => item.Code == code, cancellationToken))
            throw new InvalidOperationException("Mã chức năng đã tồn tại.");

        var parent = await FindParentAsync(request.ParentId, cancellationToken);
        var function = new SysFunction
        {
            Code = code,
            Name = request.Name.Trim(),
            ModuleCode = request.ModuleCode.Trim(),
            Description = Normalize(request.Description),
            Parent = parent,
            SortOrder = request.SortOrder,
            IsAction = request.IsAction,
            FuncUrl = Normalize(request.FuncUrl),
            IconName = Normalize(request.IconName) ?? "Folder",
            BadgeText = Normalize(request.BadgeText),
            IsVisibleInMenu = request.IsVisibleInMenu,
            IsView = request.IsView,
            IsNew = request.IsNew,
            IsEdit = request.IsEdit,
            IsDelete = request.IsDelete,
            IsExport = request.IsExport,
            IsActive = true
        };
        _db.SysFunctions.Add(function);
        await _db.SaveChangesAsync(cancellationToken);
        return Map(function, null, []);
    }

    public async Task<SysFunctionDto?> UpdateAsync(
        Guid id,
        UpdateSysFunctionRequest request,
        CancellationToken cancellationToken)
    {
        ValidateText(request.Name, 200, nameof(request.Name));
        ValidateText(request.ModuleCode, 100, nameof(request.ModuleCode));

        var function = await _db.SysFunctions
            .FirstOrDefaultAsync(item => item.PublicId == id && !item.IsDeleted, cancellationToken);
        if (function == null)
            return null;

        var parent = await FindParentAsync(request.ParentId, cancellationToken);
        if (parent?.AutoId == function.AutoId || await WouldCreateCycleAsync(function, parent, cancellationToken))
            throw new InvalidOperationException("Không thể đặt chức năng vào chính nó hoặc hậu duệ của nó.");

        function.Name = request.Name.Trim();
        function.ModuleCode = request.ModuleCode.Trim();
        function.Description = Normalize(request.Description);
        function.Parent = parent;
        function.SortOrder = request.SortOrder;
        function.IsAction = request.IsAction;
        function.IsActive = request.IsActive;
        function.FuncUrl = Normalize(request.FuncUrl);
        function.IconName = Normalize(request.IconName) ?? "Folder";
        function.BadgeText = Normalize(request.BadgeText);
        function.IsVisibleInMenu = request.IsVisibleInMenu;
        function.IsView = request.IsView;
        function.IsNew = request.IsNew;
        function.IsEdit = request.IsEdit;
        function.IsDelete = request.IsDelete;
        function.IsExport = request.IsExport;
        await _db.SaveChangesAsync(cancellationToken);

        return Map(function, parent?.PublicId, []);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var function = await _db.SysFunctions
            .FirstOrDefaultAsync(item => item.PublicId == id && !item.IsDeleted, cancellationToken);
        if (function == null)
            return false;

        if (await _db.SysFunctions.AnyAsync(
                item => item.ParentId == function.AutoId && !item.IsDeleted,
                cancellationToken))
            throw new InvalidOperationException("Hãy chuyển hoặc xóa các chức năng con trước.");

        function.IsDeleted = true;
        function.IsActive = false;
        function.IsVisibleInMenu = false;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task ReorderAsync(ReorderFunctionsRequest request, CancellationToken cancellationToken)
    {
        if (request.Items == null || request.Items.Count == 0 || request.Items.Count > 500)
            throw new InvalidOperationException("Danh sách sắp xếp không hợp lệ.");
        if (request.Items.Select(item => item.Id).Distinct().Count() != request.Items.Count)
            throw new InvalidOperationException("Danh sách chức năng bị trùng.");

        var functions = await _db.SysFunctions
            .Where(item => !item.IsDeleted)
            .ToListAsync(cancellationToken);
        var byPublicId = functions.ToDictionary(item => item.PublicId);
        var changes = request.Items.ToDictionary(item => item.Id);

        foreach (var item in request.Items)
        {
            if (!byPublicId.ContainsKey(item.Id))
                throw new InvalidOperationException("Có chức năng không còn tồn tại.");
            if (item.NewParentId is Guid parentId && !byPublicId.ContainsKey(parentId))
                throw new InvalidOperationException("Không tìm thấy chức năng cha.");
            if (item.NewParentId == item.Id)
                throw new InvalidOperationException("Chức năng không thể là cha của chính nó.");
        }

        foreach (var item in request.Items)
        {
            var seen = new HashSet<Guid> { item.Id };
            var parentId = item.NewParentId;
            while (parentId is Guid currentParentId)
            {
                if (!seen.Add(currentParentId))
                    throw new InvalidOperationException("Cấu trúc cha-con không được tạo vòng lặp.");
                parentId = changes.TryGetValue(currentParentId, out var changedParent)
                    ? changedParent.NewParentId
                    : GetPublicParentId(byPublicId[currentParentId], functions);
            }
        }

        foreach (var item in request.Items)
        {
            var function = byPublicId[item.Id];
            function.ParentId = item.NewParentId is Guid parentId
                ? byPublicId[parentId].AutoId
                : null;
            function.SortOrder = item.NewSortPriority;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<SysFunction?> FindParentAsync(Guid? parentId, CancellationToken cancellationToken)
    {
        if (parentId == null)
            return null;
        var parent = await _db.SysFunctions.FirstOrDefaultAsync(
            item => item.PublicId == parentId && item.IsActive && !item.IsDeleted,
            cancellationToken);
        return parent ?? throw new InvalidOperationException("Không tìm thấy chức năng cha đang hoạt động.");
    }

    private async Task<bool> WouldCreateCycleAsync(
        SysFunction function,
        SysFunction? parent,
        CancellationToken cancellationToken)
    {
        var visited = new HashSet<long>();
        while (parent != null)
        {
            if (!visited.Add(parent.AutoId) || parent.AutoId == function.AutoId)
                return true;
            parent = parent.ParentId is long parentId
                ? await _db.SysFunctions.FirstOrDefaultAsync(
                    item => item.AutoId == parentId && !item.IsDeleted,
                    cancellationToken)
                : null;
        }
        return false;
    }

    private static IReadOnlyList<SysFunctionDto> BuildTree(IReadOnlyCollection<SysFunction> functions)
    {
        var byId = functions.ToDictionary(item => item.AutoId);
        var childrenByParent = functions
            .Where(item => item.ParentId.HasValue)
            .GroupBy(item => item.ParentId)
            .ToDictionary(
                group => group.Key!.Value,
                group => group.OrderBy(item => item.SortOrder).ThenBy(item => item.Name).ToArray());
        var roots = functions
            .Where(item => item.ParentId == null)
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.Name)
            .ToArray();

        SysFunctionDto MapTree(SysFunction function)
        {
            var children = childrenByParent.TryGetValue(function.AutoId, out var values)
                ? values.Select(MapTree).ToArray()
                : [];
            Guid? parentId = function.ParentId is long parentAutoId
                && byId.TryGetValue(parentAutoId, out var parent)
                    ? parent.PublicId
                    : null;
            return Map(function, parentId, children);
        }

        return roots.Select(MapTree).ToArray();
    }

    private static Guid? GetPublicParentId(SysFunction function, IReadOnlyCollection<SysFunction> functions) =>
        function.ParentId is long parentId
            ? functions.FirstOrDefault(item => item.AutoId == parentId)?.PublicId
            : null;

    private static SysFunctionDto? FindTreeItem(IEnumerable<SysFunctionDto> items, Guid id)
    {
        foreach (var item in items)
        {
            if (item.Id == id)
                return item;
            var child = FindTreeItem(item.Children, id);
            if (child != null)
                return child;
        }
        return null;
    }

    private static SysFunctionDto Map(
        SysFunction function,
        Guid? parentId,
        IReadOnlyList<SysFunctionDto> children) =>
        new(
            function.PublicId,
            function.AutoId,
            function.Code,
            function.Name,
            function.Description,
            function.ParentId,
            parentId,
            function.ModuleCode,
            function.SortOrder,
            function.IsAction,
            function.IsActive,
            function.FuncUrl,
            function.IconName,
            function.BadgeText,
            function.IsVisibleInMenu,
            function.IsView,
            function.IsNew,
            function.IsEdit,
            function.IsDelete,
            function.IsExport,
            children);

    private static void ValidateText(string value, int maxLength, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Trim().Length > maxLength)
            throw new InvalidOperationException($"{fieldName} không hợp lệ.");
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
