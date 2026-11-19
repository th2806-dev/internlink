using System.Security.Claims;
using FluentAssertions;
using InternLink.API.Authorization;
using InternLink.API.Controllers;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using InternLink.Shared.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace InternLink.Tests.Authorization;

public class SystemRbacTests
{
    [Fact]
    public async Task SeedAsync_CreatesFunctionTreeAndMapsLegacyUsersIdempotently()
    {
        await using var context = CreateContext();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "root",
            PasswordHash = "hash",
            Role = Role.SuperAdmin
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        await SystemRbacSeeder.SeedAsync(context);
        await SystemRbacSeeder.SeedAsync(context);

        var superAdmin = await context.SysRoles.SingleAsync(role => role.Code == nameof(Role.SuperAdmin));
        var studentView = await context.SysFunctions.SingleAsync(function => function.Code == "STUDENTS.VIEW");
        var superAdminStudentView = await context.SysRolePermissions.SingleAsync(permission =>
            permission.SysRoleId == superAdmin.AutoId && permission.SysFunctionId == studentView.AutoId);
        superAdminStudentView.IsGranted = false;
        await context.SaveChangesAsync();
        await SystemRbacSeeder.SeedAsync(context);
        superAdminStudentView.IsGranted.Should().BeTrue();

        (await context.SysFunctions.CountAsync(function => function.ParentId == null)).Should().Be(21);
        (await context.SysFunctions.CountAsync(function => function.IsAction)).Should().Be(174);
        (await context.SysFunctions
            .Where(function => function.ModuleCode == "LECTURER" && function.IsAction)
            .Select(function => function.Code)
            .ToArrayAsync())
            .Should().BeEquivalentTo(
                "LECTURER.VIEW", "LECTURER.CREATE", "LECTURER.UPDATE", "LECTURER.DELETE",
                "LECTURER.EXPORT", "LECTURER.IMPORT", "LECTURER.PRINT", "LECTURER.APPROVE");
        (await context.SysRoles.CountAsync()).Should().Be(4);
        (await context.SysUsers.CountAsync()).Should().Be(1);
        (await context.SysUserRoles.CountAsync()).Should().Be(1);
        (await context.SysRolePermissions.CountAsync(permission => permission.IsGranted)).Should().BeGreaterThan(20);
        var departmentAdmin = await context.SysRoles.SingleAsync(role => role.Code == nameof(Role.DepartmentAdmin));
        var departmentPermissionMap = await context.SysRolePermissions
            .Where(permission => permission.SysRoleId == departmentAdmin.AutoId)
            .Join(context.SysFunctions, permission => permission.SysFunctionId, function => function.AutoId,
                (permission, function) => new { function.ModuleCode, function.Code, permission.IsGranted })
            .ToListAsync();
        departmentPermissionMap.Should().Contain(permission =>
            permission.ModuleCode == "STUDENTS" && permission.Code == "STUDENTS.VIEW" && permission.IsGranted);
        departmentPermissionMap.Should().Contain(permission =>
            permission.ModuleCode == "COMPANIES" && permission.Code == "COMPANIES.VIEW" && permission.IsGranted);
        departmentPermissionMap.Should().Contain(permission =>
            permission.ModuleCode == "CONFIG" && permission.Code == "CONFIG.VIEW" && !permission.IsGranted);
        departmentPermissionMap.Should().Contain(permission =>
            permission.ModuleCode == "IT_CONFIG" && permission.Code == SystemPermissionCodes.ExcelImport && !permission.IsGranted);
        (await context.SysRolePermissions
            .GroupBy(permission => new { permission.SysRoleId, permission.SysFunctionId })
            .AnyAsync(group => group.Count() > 1)).Should().BeFalse();
        (await context.SysFieldPolicies.CountAsync()).Should().Be(23);
        var lecturerRole = await context.SysRoles.SingleAsync(role => role.Code == nameof(Role.Lecturer));
        var lecturerGrid = await context.SysGridConfigs
            .Where(config => config.FeatureCode == "LECTURER_STUDENTS" && config.RoleId == lecturerRole.AutoId)
            .ToListAsync();
        lecturerGrid.Should().HaveCount(9);
        var studentCodeColumn = lecturerGrid.Single(config => config.FieldCode == "studentCode");
        studentCodeColumn.IsFrozen.Should().BeTrue();
        studentCodeColumn.FrozenSide.Should().Be("left");
        var actionsColumn = lecturerGrid.Single(config => config.FieldCode == "actions");
        actionsColumn.IsFrozen.Should().BeTrue();
        actionsColumn.FrozenSide.Should().Be("right");
        (await context.SysGridConfigs.CountAsync(config =>
            config.FeatureCode == "LECTURER_STUDENTS" && config.RoleId == null)).Should().Be(9);
        (await context.SysGridConfigs.CountAsync(config =>
            config.FeatureCode == "STUDENTS" && config.RoleId == null && config.TenantId == null))
            .Should().Be(7);
        (await context.SysGridConfigs.CountAsync(config =>
            config.FeatureCode == "LECTURERS" && config.RoleId == null && config.TenantId == null))
            .Should().Be(8);
        (await context.SysGridConfigs.CountAsync(config =>
            config.FeatureCode == "COMPANIES" && config.RoleId == null && config.TenantId == null))
            .Should().Be(7);

        var gridMenuItem = await context.SysFunctions.SingleAsync(function => function.Code == "CONFIG.GRID");
        gridMenuItem.FuncUrl.Should().Be("/admin/config/grid");
        gridMenuItem.IconName.Should().Be("Columns3");
        gridMenuItem.IsVisibleInMenu = false;
        gridMenuItem.Name = "Bảng cấu hình riêng";
        gridMenuItem.FuncUrl = "/admin/custom-grid";
        gridMenuItem.IconName = "Star";
        var studentCodePolicy = await context.SysFieldPolicies.SingleAsync(policy =>
            policy.FormCode == "FORM_STUDENT_PROFILE" && policy.FieldKey == "StudentCode");
        studentCodePolicy.IsRequired = true;
        studentCodePolicy.CustomLabel = "MSSV tùy chỉnh";
        var lecturerNameColumn = lecturerGrid.Single(config => config.FieldCode == "fullName");
        lecturerNameColumn.HeaderTitle = "Tên sinh viên tùy chỉnh";
        await context.SaveChangesAsync();

        await SystemRbacSeeder.SeedAsync(context);

        var persistedGridMenuItem = await context.SysFunctions.SingleAsync(function =>
            function.Code == "CONFIG.GRID");
        persistedGridMenuItem.IsVisibleInMenu.Should().BeFalse();
        persistedGridMenuItem.Name.Should().Be("Bảng cấu hình riêng");
        persistedGridMenuItem.FuncUrl.Should().Be("/admin/custom-grid");
        persistedGridMenuItem.IconName.Should().Be("Star");
        var persistedStudentCodePolicy = await context.SysFieldPolicies.SingleAsync(policy =>
            policy.FormCode == "FORM_STUDENT_PROFILE" && policy.FieldKey == "StudentCode");
        persistedStudentCodePolicy.IsRequired.Should().BeTrue();
        persistedStudentCodePolicy.CustomLabel.Should().Be("MSSV tùy chỉnh");
        (await context.SysGridConfigs.SingleAsync(config =>
            config.FeatureCode == "LECTURER_STUDENTS"
            && config.RoleId == lecturerRole.AutoId
            && config.FieldCode == "fullName"))
            .HeaderTitle.Should().Be("Tên sinh viên tùy chỉnh");

        var mappedUser = await context.SysUsers
            .Include(item => item.Roles)
                .ThenInclude(item => item.Role)
            .SingleAsync(item => item.PublicId == user.PublicId);
        mappedUser.Roles.Should().ContainSingle()
            .Which.Role.Code.Should().Be(nameof(Role.SuperAdmin));
    }

    [Fact]
    public async Task GetMyMenu_ChangesImmediatelyWhenDepartmentAdminViewPermissionChanges()
    {
        await using var context = CreateContext();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "department-admin",
            PasswordHash = "hash",
            Role = Role.DepartmentAdmin
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        await SystemRbacSeeder.SeedAsync(context);

        var departmentRole = await context.SysRoles.SingleAsync(role => role.Code == nameof(Role.DepartmentAdmin));
        var companyView = await context.SysFunctions.SingleAsync(function => function.Code == "COMPANIES.VIEW");
        var permission = await context.SysRolePermissions.SingleAsync(item =>
            item.SysRoleId == departmentRole.AutoId && item.SysFunctionId == companyView.AutoId);
        permission.IsGranted = false;
        await context.SaveChangesAsync();

        var controller = new SysFunctionsController(context, new SysFunctionService(context));
        controller.ControllerContext = CreateMenuControllerContext(user.PublicId, nameof(Role.DepartmentAdmin));

        var hiddenMenu = GetMenu(await controller.GetMyMenu(CancellationToken.None));
        hiddenMenu.Should().Contain(item => item.FuncUrl == "/admin/students")
            .And.NotContain(item => item.FuncUrl == "/admin/companies");

        permission.IsGranted = true;
        await context.SaveChangesAsync();
        var visibleMenu = GetMenu(await controller.GetMyMenu(CancellationToken.None));
        visibleMenu.Should().Contain(item => item.FuncUrl == "/admin/companies");
    }

    [Fact]
    public async Task SeedAsync_DoesNotMapDeletedLegacyUserWhenUsernameHasBeenReused()
    {
        await using var context = CreateContext();
        var activeUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "2421160043",
            PasswordHash = "active-hash",
            Role = Role.Student
        };
        var deletedUser = new User
        {
            Id = Guid.NewGuid(),
            Username = activeUser.Username,
            PasswordHash = "deleted-hash",
            Role = Role.Student
        };
        context.Users.AddRange(activeUser, deletedUser);
        await context.SaveChangesAsync();

        deletedUser.IsDeleted = true;
        await context.SaveChangesAsync();

        await SystemRbacSeeder.SeedAsync(context);

        var mappedUsers = await context.SysUsers
            .IgnoreQueryFilters()
            .ToListAsync();
        mappedUsers.Should().ContainSingle()
            .Which.PublicId.Should().Be(activeUser.PublicId);

        var userNameIndex = context.Model.FindEntityType(typeof(InternLink.Domain.Entities.Rbac.SysUser))!
            .GetIndexes()
            .Single(index => index.Properties.Select(property => property.Name)
                .SequenceEqual([nameof(InternLink.Domain.Entities.Rbac.SysUser.UserName)]));
        userNameIndex.IsUnique.Should().BeTrue();
        userNameIndex.GetFilter().Should().Be("[IsDeleted] = 0");
    }

    [Fact]
    public async Task SavePermissions_SkipsMatrixActionsThatAreNotDefinedForModule()
    {
        await using var context = CreateContext();
        var role = new SysRole { Code = "TEST", Name = "Test" };
        var root = new SysFunction
        {
            Code = "LECTURER",
            Name = "Giảng viên",
            ModuleCode = "LECTURER",
            IsAction = false
        };
        context.SysRoles.Add(role);
        context.SysFunctions.Add(root);
        await context.SaveChangesAsync();

        var export = new SysFunction
        {
            Code = "LECTURER.EXPORT",
            Name = "Xuất báo cáo",
            ModuleCode = "LECTURER",
            ParentId = root.AutoId,
            IsAction = true
        };
        context.SysFunctions.Add(export);
        await context.SaveChangesAsync();

        var matrix = new[]
        {
            new SaveSysRolePermissionMatrixRowDto("LECTURER", true, false, false, false, true, false, false, false)
        };
        var result = await new SysRolesController(context)
            .SavePermissions(role.AutoId, matrix, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        var permission = await context.SysRolePermissions.SingleAsync();
        permission.SysFunctionId.Should().Be(export.AutoId);
        permission.IsGranted.Should().BeTrue();
    }

    [Fact]
    public async Task PermissionAuthorizationHandler_GrantsOperationalPermissionsAndDeniesPlatformImportForDepartmentAdmin()
    {
        await using var context = CreateContext();
        var admin = new User
        {
            Id = Guid.NewGuid(),
            Username = "root",
            PasswordHash = "hash",
            Role = Role.SuperAdmin
        };
        var student = new User
        {
            Id = Guid.NewGuid(),
            Username = "student",
            PasswordHash = "hash",
            Role = Role.Student
        };
        var lecturer = new User
        {
            Id = Guid.NewGuid(),
            Username = "lecturer",
            PasswordHash = "hash",
            Role = Role.Lecturer
        };
        var departmentAdmin = new User
        {
            Id = Guid.NewGuid(),
            Username = "department-admin",
            PasswordHash = "hash",
            Role = Role.DepartmentAdmin
        };
        context.Users.AddRange(admin, student, lecturer, departmentAdmin);
        await context.SaveChangesAsync();
        await SystemRbacSeeder.SeedAsync(context);

        var handler = new PermissionAuthorizationHandler(context, new HttpContextAccessor());
        var requirement = new PermissionRequirement(SystemPermissionCodes.AccountsView);

        var adminContext = CreateAuthorizationContext(admin.Id, requirement);
        await handler.HandleAsync(adminContext);
        adminContext.HasSucceeded.Should().BeTrue();

        var studentContext = CreateAuthorizationContext(student.Id, requirement);
        await handler.HandleAsync(studentContext);
        studentContext.HasSucceeded.Should().BeFalse();

        var exportRequirement = new PermissionRequirement(SystemPermissionCodes.LecturerExport);
        var lecturerContext = CreateAuthorizationContext(lecturer.Id, exportRequirement);
        await handler.HandleAsync(lecturerContext);
        lecturerContext.HasSucceeded.Should().BeTrue();

        var studentExportContext = CreateAuthorizationContext(student.Id, exportRequirement);
        await handler.HandleAsync(studentExportContext);
        studentExportContext.HasSucceeded.Should().BeFalse();

        var excelImportRequirement = new PermissionRequirement(SystemPermissionCodes.ExcelImport);
        var departmentAdminContext = CreateAuthorizationContext(departmentAdmin.Id, excelImportRequirement);
        await handler.HandleAsync(departmentAdminContext);
        departmentAdminContext.HasSucceeded.Should().BeFalse();

        var studentImportContext = CreateAuthorizationContext(student.Id, excelImportRequirement);
        await handler.HandleAsync(studentImportContext);
        studentImportContext.HasSucceeded.Should().BeFalse();
    }

    [Fact]
    public async Task PermissionPolicyProvider_CreatesAuthenticatedPermissionPolicy()
    {
        var provider = new PermissionAuthorizationPolicyProvider(Options.Create(new AuthorizationOptions()));

        var policy = await provider.GetPolicyAsync(
            $"{RequirePermissionAttribute.PolicyPrefix}{SystemPermissionCodes.AccountsView}");

        policy.Should().NotBeNull();
        policy!.Requirements.OfType<PermissionRequirement>().Should().ContainSingle()
            .Which.Should().Be(new PermissionRequirement(SystemPermissionCodes.AccountsView));
        policy.Requirements.Should().ContainSingle(item => item is DenyAnonymousAuthorizationRequirement);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static AuthorizationHandlerContext CreateAuthorizationContext(
        Guid userId,
        IAuthorizationRequirement requirement)
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ], "test"));
        return new AuthorizationHandlerContext([requirement], principal, resource: null);
    }

    private static ControllerContext CreateMenuControllerContext(Guid userId, string roleCode) =>
        new()
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                    new Claim(ClaimTypes.Role, roleCode)
                ], "test"))
            }
        };

    private static IReadOnlyList<SystemMenuItemDto> GetMenu(IActionResult actionResult)
    {
        var response = (actionResult as OkObjectResult)?.Value
            as InternLink.Shared.Responses.ApiResponse<IReadOnlyList<SystemMenuItemDto>>;
        response.Should().NotBeNull();
        return FlattenMenu(response!.Data);
    }

    private static IReadOnlyList<SystemMenuItemDto> FlattenMenu(IEnumerable<SystemMenuItemDto> items) =>
        items.SelectMany(item => new[] { item }.Concat(FlattenMenu(item.Children))).ToArray();
}
