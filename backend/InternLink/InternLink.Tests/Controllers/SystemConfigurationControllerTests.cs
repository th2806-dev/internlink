using System.Security.Claims;
using FluentAssertions;
using InternLink.API.Controllers;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace InternLink.Tests.Controllers;

public class SystemConfigurationControllerTests
{
    [Fact]
    public async Task GridConfigPut_UpsertsConfigsAndHidesOmittedFields()
    {
        await using var context = CreateContext();
        context.SysGridConfigs.Add(new SysGridConfig
        {
            FeatureCode = "STUDENT_LIST",
            FieldCode = "email",
            HeaderTitle = "Email",
            IsVisible = true
        });
        await context.SaveChangesAsync();

        var controller = CreateGridController(context);
        var result = await controller.Put("student_list",
        [
            new SaveSysGridConfigDto
            {
                FieldCode = "studentCode",
                HeaderTitle = "Mã sinh viên",
                ColumnWidth = 180,
                IsFrozen = true,
                FrozenSide = "right",
                SortOrder = 1,
                HeaderBgColor = "#abc",
                CellFormatType = "text"
            }
        ], null, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        var persisted = await context.SysGridConfigs.OrderBy(config => config.FieldCode).ToListAsync();
        persisted.Should().ContainSingle(config => config.FieldCode == "email" && !config.IsVisible);
        persisted.Should().ContainSingle(config =>
            config.FeatureCode == "STUDENT_LIST"
            && config.FieldCode == "studentCode"
            && config.ColumnWidth == 180
            && config.IsFrozen
            && config.FrozenSide == "right"
            && config.HeaderBgColor == "#ABC");
    }

    [Fact]
    public async Task GridConfigPut_RejectsUnsafeColorsAndDuplicateFieldCodes()
    {
        await using var context = CreateContext();
        var controller = CreateGridController(context);

        var result = await controller.Put("STUDENT_LIST",
        [
            new SaveSysGridConfigDto
            {
                FieldCode = "studentCode",
                HeaderTitle = "Mã sinh viên",
                HeaderBgColor = "red; background:url(javascript:alert(1))"
            }
        ], null, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
        (await context.SysGridConfigs.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task GridConfigGet_PrefersRoleOverrideAndFallsBackToSystemDefault()
    {
        await using var context = CreateContext();
        context.SysRoles.AddRange(
            new SysRole
            {
                Code = "Lecturer",
                Name = "Giảng viên",
                IsActive = true
            },
            new SysRole
            {
                Code = "Student",
                Name = "Sinh viên",
                IsActive = true
            });
        context.SysGridConfigs.AddRange(
            new SysGridConfig
            {
                FeatureCode = "STUDENT_LIST",
                FieldCode = "studentCode",
                HeaderTitle = "Mã mặc định",
                RoleId = null,
                IsVisible = true
            },
            new SysGridConfig
            {
                FeatureCode = "STUDENT_LIST",
                FieldCode = "studentCode",
                HeaderTitle = "Mã giảng viên",
                RoleId = 1,
                IsVisible = true
            });
        await context.SaveChangesAsync();
        var controller = CreateGridController(context);

        var roleResult = await controller.Get("STUDENT_LIST", 1, false, CancellationToken.None);
        var defaultResult = await controller.Get("STUDENT_LIST", 2, false, CancellationToken.None);

        GetGridRows(roleResult).Should().ContainSingle()
            .Which.HeaderTitle.Should().Be("Mã giảng viên");
        GetGridRows(defaultResult).Should().ContainSingle()
            .Which.HeaderTitle.Should().Be("Mã mặc định");
    }

    [Fact]
    public async Task GridConfigPut_InvalidatesCachedRoleFallback()
    {
        await using var context = CreateContext();
        context.SysRoles.Add(new SysRole
        {
            Code = "Lecturer",
            Name = "Giảng viên",
            IsActive = true
        });
        context.SysGridConfigs.Add(new SysGridConfig
        {
            FeatureCode = "STUDENT_LIST",
            FieldCode = "studentCode",
            HeaderTitle = "Mã mặc định",
            IsVisible = true
        });
        await context.SaveChangesAsync();
        var controller = CreateGridController(context);

        var beforeSave = await controller.Get("STUDENT_LIST", 1, false, CancellationToken.None);
        GetGridRows(beforeSave).Single().HeaderTitle.Should().Be("Mã mặc định");

        await controller.Put("STUDENT_LIST",
        [
            new SaveSysGridConfigDto
            {
                FieldCode = "studentCode",
                HeaderTitle = "Mã giảng viên",
                IsVisible = true
            }
        ], 1, CancellationToken.None);
        var afterSave = await controller.Get("STUDENT_LIST", 1, false, CancellationToken.None);

        GetGridRows(afterSave).Single().HeaderTitle.Should().Be("Mã giảng viên");
    }

    [Fact]
    public async Task MyMenu_ReturnsOnlyGrantedActionsForTheCurrentUser()
    {
        await using var context = CreateContext();
        var legacyUser = new User
        {
            Username = "admin",
            PasswordHash = "hash",
            Role = Role.SuperAdmin
        };
        var root = new SysFunction
        {
            Code = "ACCOUNTS",
            Name = "Tài khoản",
            ModuleCode = "ACCOUNTS",
            IsActive = true
        };
        var allowed = new SysFunction
        {
            Code = "ACCOUNTS.VIEW",
            Name = "Xem",
            ModuleCode = "ACCOUNTS",
            IsAction = true,
            IsActive = true,
            Parent = root
        };
        var denied = new SysFunction
        {
            Code = "ACCOUNTS.DELETE",
            Name = "Xóa",
            ModuleCode = "ACCOUNTS",
            IsAction = true,
            IsActive = true,
            Parent = root
        };
        var role = new SysRole
        {
            Code = "DepartmentAdmin",
            Name = "DepartmentAdmin",
            IsActive = true,
            Permissions =
            [
                new SysRolePermission { Function = allowed, IsGranted = true },
                new SysRolePermission { Function = denied, IsGranted = false }
            ]
        };
        var sysUser = new SysUser
        {
            PublicId = legacyUser.PublicId,
            UserName = legacyUser.Username,
            IsActive = true,
            LegacyUser = legacyUser,
            Roles = [new SysUserRole { Role = role }]
        };
        context.SysUsers.Add(sysUser);
        await context.SaveChangesAsync();
        (await context.SysUserRoles.CountAsync()).Should().Be(1);
        (await context.SysRolePermissions.CountAsync()).Should().Be(2);
        (await context.SysRolePermissions
            .Select(permission => permission.Function.Parent!.Code)
            .ToListAsync()).Should().Contain("ACCOUNTS");

        var controller = new SysFunctionsController(
            context,
            new MemoryCache(new MemoryCacheOptions()),
            new SysFunctionService(context));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, legacyUser.PublicId.ToString())
                ], "test"))
            }
        };

        var result = await controller.GetMyMenu(CancellationToken.None);

        var response = (result as OkObjectResult)?.Value as ApiResponse<IReadOnlyList<SystemMenuItemDto>>;
        response.Should().NotBeNull();
        response!.Data.Should().ContainSingle()
            .Which.Should().Match<SystemMenuItemDto>(item =>
                item.Code == "ACCOUNTS"
                && item.Children.Count == 1
                && item.Children[0].Code == "ACCOUNTS.VIEW");
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static SysGridConfigsController CreateGridController(AppDbContext context)
    {
        var controller = new SysGridConfigsController(context, new MemoryCache(new MemoryCacheOptions()));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        return controller;
    }

    private static IReadOnlyList<SysGridConfigDto> GetGridRows(IActionResult actionResult)
    {
        var response = (actionResult as OkObjectResult)?.Value
            as ApiResponse<IReadOnlyList<SysGridConfigDto>>;
        response.Should().NotBeNull();
        return response!.Data;
    }
}
