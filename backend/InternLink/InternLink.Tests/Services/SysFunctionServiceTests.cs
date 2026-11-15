using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities.Rbac;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Tests.Services;

public sealed class SysFunctionServiceTests
{
    [Fact]
    public async Task GetTreeAsync_BuildsNestedTreeAndCanIncludeHiddenFunctions()
    {
        await using var db = CreateContext();
        var root = new SysFunction
        {
            Code = "MODULE",
            Name = "Phân hệ",
            ModuleCode = "SYSTEM",
            IsVisibleInMenu = true
        };
        var hiddenChild = new SysFunction
        {
            Code = "SCREEN",
            Name = "Màn hình",
            ModuleCode = "SYSTEM",
            Parent = root,
            IsVisibleInMenu = false
        };
        db.SysFunctions.AddRange(root, hiddenChild);
        await db.SaveChangesAsync();

        var service = new SysFunctionService(db);

        var visibleTree = await service.GetTreeAsync(false, CancellationToken.None);
        visibleTree.Should().ContainSingle()
            .Which.Children.Should().BeEmpty();

        var fullTree = await service.GetTreeAsync(true, CancellationToken.None);
        fullTree.Should().ContainSingle()
            .Which.Children.Should().ContainSingle()
            .Which.Code.Should().Be("SCREEN");
    }

    [Fact]
    public async Task ReorderAsync_RejectsParentCycles()
    {
        await using var db = CreateContext();
        var parent = new SysFunction
        {
            Code = "PARENT",
            Name = "Cha",
            ModuleCode = "SYSTEM"
        };
        var child = new SysFunction
        {
            Code = "CHILD",
            Name = "Con",
            ModuleCode = "SYSTEM",
            Parent = parent
        };
        db.SysFunctions.AddRange(parent, child);
        await db.SaveChangesAsync();

        var service = new SysFunctionService(db);
        var act = () => service.ReorderAsync(
            new ReorderFunctionsRequest(
            [
                new FunctionReorderItem(parent.PublicId, child.PublicId, 1)
            ]),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*vòng lặp*");
    }

    [Fact]
    public async Task GetByPublicIdAsync_ReturnsNestedFunction()
    {
        await using var db = CreateContext();
        var parent = new SysFunction
        {
            Code = "PARENT",
            Name = "Cha",
            ModuleCode = "SYSTEM"
        };
        var child = new SysFunction
        {
            Code = "CHILD",
            Name = "Con",
            ModuleCode = "SYSTEM",
            Parent = parent
        };
        db.SysFunctions.AddRange(parent, child);
        await db.SaveChangesAsync();

        var result = await new SysFunctionService(db)
            .GetByPublicIdAsync(child.PublicId, CancellationToken.None);

        result.Should().NotBeNull();
        result!.Code.Should().Be("CHILD");
        result.ParentId.Should().Be(parent.PublicId);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }
}
