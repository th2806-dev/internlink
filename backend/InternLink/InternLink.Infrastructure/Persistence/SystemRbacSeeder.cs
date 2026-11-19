using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Enums;
using InternLink.Shared.Authorization;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Persistence;

public static class SystemRbacSeeder
{
    private sealed record FunctionDefinition(
        string Code,
        string Name,
        string ModuleCode,
        int SortOrder,
        bool IsAction,
        string? ParentCode = null,
        string? FuncUrl = null,
        string? IconName = null,
        string? BadgeText = null,
        bool IsMenuEntry = false,
        string? Description = null);

    private static readonly FunctionDefinition[] Functions =
    new FunctionDefinition[]
    {
        new("LECTURER", "Giảng viên", "LECTURER", 0, false, Description: "GIAI ĐOẠN 1 · CHUẨN BỊ KỲ"),
        new(SystemPermissionCodes.LecturerExport, "Xuất báo cáo", "LECTURER", 1, true, "LECTURER"),
        new("SYSTEM", "Hệ thống", "SYSTEM", 1, false, Description: "QUẢN TRỊ NỀN TẢNG"),
        new(SystemPermissionCodes.SystemView, "Xem", "SYSTEM", 1, true, "SYSTEM"),
        new(SystemPermissionCodes.SystemManage, "Quản lý", "SYSTEM", 2, true, "SYSTEM"),

        new("ACCOUNTS", "Tài khoản", "ACCOUNTS", 2, false, Description: "QUẢN TRỊ NỀN TẢNG"),
        new(SystemPermissionCodes.AccountsView, "Xem", "ACCOUNTS", 1, true, "ACCOUNTS"),
        new(SystemPermissionCodes.AccountsCreate, "Tạo", "ACCOUNTS", 2, true, "ACCOUNTS"),
        new(SystemPermissionCodes.AccountsUpdate, "Cập nhật", "ACCOUNTS", 3, true, "ACCOUNTS"),
        new(SystemPermissionCodes.AccountsDelete, "Xóa", "ACCOUNTS", 4, true, "ACCOUNTS"),
        new(SystemPermissionCodes.AccountsResetPassword, "Cấp lại mật khẩu", "ACCOUNTS", 5, true, "ACCOUNTS"),
        new(SystemPermissionCodes.AccountsAssignRole, "Gán vai trò", "ACCOUNTS", 6, true, "ACCOUNTS"),

        new("CONFIG", "Cấu hình", "CONFIG", 3, false, Description: "QUẢN TRỊ NỀN TẢNG"),
        new(SystemPermissionCodes.ConfigurationView, "Xem", "CONFIG", 1, true, "CONFIG"),
        new(SystemPermissionCodes.ConfigurationUpdate, "Cập nhật", "CONFIG", 2, true, "CONFIG"),

        new("AUDIT", "Nhật ký", "AUDIT", 4, false, Description: "QUẢN TRỊ NỀN TẢNG"),
        new(SystemPermissionCodes.AuditView, "Xem", "AUDIT", 1, true, "AUDIT"),
        new(SystemPermissionCodes.AuditExport, "Xuất", "AUDIT", 2, true, "AUDIT"),

        new("IT_CONFIG", "Cấu hình IT", "IT_CONFIG", 5, false, Description: "QUẢN TRỊ NỀN TẢNG"),
        new(SystemPermissionCodes.ItConfigurationView, "Xem", "IT_CONFIG", 1, true, "IT_CONFIG"),
        new(SystemPermissionCodes.ItConfigurationUpdate, "Cập nhật", "IT_CONFIG", 2, true, "IT_CONFIG"),
        new(SystemPermissionCodes.ItConfigurationTestConnection, "Kiểm tra kết nối", "IT_CONFIG", 3, true, "IT_CONFIG"),

        new("API_WEBHOOK", "API / Webhook", "API_WEBHOOK", 6, false, Description: "QUẢN TRỊ NỀN TẢNG"),
        new(SystemPermissionCodes.ApiWebhookView, "Xem", "API_WEBHOOK", 1, true, "API_WEBHOOK"),
        new(SystemPermissionCodes.ApiWebhookCreate, "Tạo", "API_WEBHOOK", 2, true, "API_WEBHOOK"),
        new(SystemPermissionCodes.ApiWebhookUpdate, "Cập nhật", "API_WEBHOOK", 3, true, "API_WEBHOOK"),
        new(SystemPermissionCodes.ApiWebhookDelete, "Xóa", "API_WEBHOOK", 4, true, "API_WEBHOOK"),
        new(SystemPermissionCodes.ApiWebhookTest, "Kiểm tra", "API_WEBHOOK", 5, true, "API_WEBHOOK"),
        new(SystemPermissionCodes.ApiWebhookRotateSecret, "Đổi khóa bí mật", "API_WEBHOOK", 6, true, "API_WEBHOOK"),
        new("DASHBOARD", "Tổng quan", "DASHBOARD", 0, false, FuncUrl: "/admin/dashboard", IconName: "LayoutDashboard", Description: "TỔNG QUAN"),
        new("SEMESTERS", "Kỳ thực tập", "SEMESTERS", 10, false, Description: "GIAI ĐOẠN 1 · CHUẨN BỊ KỲ"),
        new("STUDENTS", "Sinh viên", "STUDENTS", 11, false, Description: "GIAI ĐOẠN 1 · CHUẨN BỊ KỲ"),
        new("COMPANIES", "Doanh nghiệp", "COMPANIES", 12, false, Description: "GIAI ĐOẠN 1 · CHUẨN BỊ KỲ"),
        new("ASSIGNMENTS", "Phân công", "ASSIGNMENTS", 13, false, Description: "GIAI ĐOẠN 1 · CHUẨN BỊ KỲ"),
        new("WEEKLY_REPORTS", "Báo cáo tuần", "WEEKLY_REPORTS", 20, false, Description: "GIAI ĐOẠN 2 · THEO DÕI VẬN HÀNH"),
        new("ATTENDANCE", "Điểm danh", "ATTENDANCE", 21, false, Description: "GIAI ĐOẠN 2 · THEO DÕI VẬN HÀNH"),
        new("EVALUATIONS", "Chấm điểm", "EVALUATIONS", 30, false, Description: "GIAI ĐOẠN 3 · TỔNG KẾT KỲ"),
        new("SUMMARY", "Bảng điểm tổng hợp", "SUMMARY", 31, false, Description: "GIAI ĐOẠN 3 · TỔNG KẾT KỲ"),
        new("TEMPLATES", "Biểu mẫu", "TEMPLATES", 14, false, Description: "GIAI ĐOẠN 1 · CHUẨN BỊ KỲ"),
        new("DEPARTMENTS", "Khoa", "DEPARTMENTS", 7, false, Description: "QUẢN TRỊ NỀN TẢNG"),
        new("GRID_CONFIG", "Cấu hình bảng", "GRID_CONFIG", 8, false, Description: "QUẢN TRỊ NỀN TẢNG"),
        new("FIELD_POLICIES", "Chính sách trường", "FIELD_POLICIES", 9, false, Description: "QUẢN TRỊ NỀN TẢNG"),
        new("NOTIFICATIONS", "Thông báo", "NOTIFICATIONS", 22, false, Description: "GIAI ĐOẠN 2 · THEO DÕI VẬN HÀNH"),
    }.Concat(BuildMatrixActionFunctions())
        .Concat(BuildMenuFunctions())
        .DistinctBy(function => function.Code, StringComparer.OrdinalIgnoreCase)
        .ToArray();

    private static IEnumerable<FunctionDefinition> BuildMenuFunctions()
    {
        yield return new("SYSTEM.FUNCTIONS", "Chức năng", "SYSTEM", 10, false, "SYSTEM", "/admin/functions", "Settings", IsMenuEntry: true);
        yield return new("SYSTEM.PERMISSIONS", "Phân quyền chức năng", "SYSTEM", 11, false, "SYSTEM", "/admin/system/permissions", "Shield", IsMenuEntry: true);
        yield return new("SYSTEM.BACKUPS", "Sao lưu & Khôi phục", "SYSTEM", 12, false, "SYSTEM", "/admin/backups", "DatabaseBackup", IsMenuEntry: true);
        yield return new("ACCOUNTS.USERS", "Thành viên", "ACCOUNTS", 10, false, "ACCOUNTS", "/admin/users", "Users", IsMenuEntry: true);
        yield return new("CONFIG.GRID", "Cấu hình bảng", "GRID_CONFIG", 10, false, "GRID_CONFIG", "/admin/config/grid", "Columns3", IsMenuEntry: true);
        yield return new("CONFIG.FIELD_POLICIES", "Chính sách trường dữ liệu", "FIELD_POLICIES", 10, false, "FIELD_POLICIES", "/admin/config/field-policies", "FileSliders", IsMenuEntry: true);
        yield return new("CONFIG.GRADING_RULES", "Quy chế điểm & deadline", "CONFIG", 12, false, "CONFIG", "/admin/config/grading-rules", "ClipboardList", IsMenuEntry: true);
        yield return new("AUDIT.LOGS", "Nhật ký kiểm toán", "AUDIT", 10, false, "AUDIT", "/admin/logs/audit", "ScrollText", IsMenuEntry: true);
        yield return new(SystemPermissionCodes.ExcelImport, "Nhập sinh viên từ Excel", "IT_CONFIG", 10, false, "IT_CONFIG", "/admin/config/import-excel", "FileSpreadsheet", IsMenuEntry: true);
        yield return new("API_WEBHOOK.SETTINGS", "Cấu hình kết nối", "API_WEBHOOK", 10, false, "API_WEBHOOK", "/admin/settings", "Settings", IsMenuEntry: true);
        yield return new("DEPARTMENTS.LIST", "Quản lý Khoa", "DEPARTMENTS", 10, false, "DEPARTMENTS", "/admin/departments", "Building2", IsMenuEntry: true);
        yield return new("SEMESTERS.LIST", "Kỳ thực tập", "SEMESTERS", 10, false, "SEMESTERS", "/admin/semesters", "Calendar", IsMenuEntry: true);
        yield return new("STUDENTS.LIST", "Sinh viên", "STUDENTS", 10, false, "STUDENTS", "/admin/students", "Users", IsMenuEntry: true);
        yield return new("LECTURER.LIST", "Giảng viên", "LECTURER", 10, false, "LECTURER", "/admin/lecturers", "UserRound", IsMenuEntry: true);
        yield return new("COMPANIES.LIST", "Doanh nghiệp", "COMPANIES", 10, false, "COMPANIES", "/admin/companies", "Building2", IsMenuEntry: true);
        yield return new("ASSIGNMENTS.LIST", "Phân công GVHD", "ASSIGNMENTS", 10, false, "ASSIGNMENTS", "/admin/assignments", "UserRoundPlus", IsMenuEntry: true);
        yield return new("WEEKLY_REPORTS.ARCHIVE", "Báo cáo tuần", "WEEKLY_REPORTS", 10, false, "WEEKLY_REPORTS", "/admin/report-archive", "FileText", IsMenuEntry: true);
        yield return new("ATTENDANCE.LOG", "Điểm danh & Nhật ký", "ATTENDANCE", 10, false, "ATTENDANCE", "/admin/attendance", "CalendarCheck", IsMenuEntry: true);
        yield return new("NOTIFICATIONS.LIST", "Thông báo", "NOTIFICATIONS", 10, false, "NOTIFICATIONS", "/admin/notifications", "Bell", IsMenuEntry: true);
        yield return new("TEMPLATES.LIST", "Biểu mẫu & Tài liệu", "TEMPLATES", 10, false, "TEMPLATES", "/admin/templates", "FileText", IsMenuEntry: true);
        yield return new("SUMMARY.REPORT", "Bảng điểm tổng hợp & Hồ sơ kỳ", "SUMMARY", 10, false, "SUMMARY", "/admin/summary", "ClipboardList", IsMenuEntry: true);
    }

    private static IEnumerable<FunctionDefinition> BuildMatrixActionFunctions()
    {
        var modules = new[]
        {
            ("SYSTEM", "Hệ thống"),
            ("ACCOUNTS", "Tài khoản"),
            ("LECTURER", "Giảng viên"),
            ("CONFIG", "Cấu hình"),
            ("AUDIT", "Nhật ký"),
            ("IT_CONFIG", "Cấu hình IT"),
            ("API_WEBHOOK", "API / Webhook"),
            ("SEMESTERS", "Kỳ thực tập"),
            ("STUDENTS", "Sinh viên"),
            ("COMPANIES", "Doanh nghiệp"),
            ("ASSIGNMENTS", "Phân công"),
            ("WEEKLY_REPORTS", "Báo cáo tuần"),
            ("ATTENDANCE", "Điểm danh"),
            ("EVALUATIONS", "Chấm điểm"),
            ("SUMMARY", "Báo cáo tổng kết"),
            ("TEMPLATES", "Biểu mẫu"),
            ("DEPARTMENTS", "Khoa"),
            ("GRID_CONFIG", "Cấu hình bảng"),
            ("FIELD_POLICIES", "Chính sách trường"),
            ("DASHBOARD", "Tổng quan"),
            ("NOTIFICATIONS", "Thông báo")
        };
        var actions = new[]
        {
            ("VIEW", "Xem"),
            ("CREATE", "Thêm"),
            ("UPDATE", "Sửa"),
            ("DELETE", "Xóa"),
            ("EXPORT", "Xuất Excel"),
            ("IMPORT", "Nhập Excel"),
            ("PRINT", "In phiếu"),
            ("APPROVE", "Phê duyệt")
        };

        return modules.SelectMany(module => actions.Select((action, index) =>
            new FunctionDefinition(
                $"{module.Item1}.{action.Item1}",
                action.Item2,
                module.Item1,
                index + 1,
                true,
                module.Item1)));
    }

    public static async Task SeedAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        await EnsureRolesAsync(context, cancellationToken);
        await EnsureFunctionsAsync(context, cancellationToken);
        await EnsureDefaultFieldPoliciesAsync(context, cancellationToken);
        await EnsureDefaultLecturerGridConfigsAsync(context, cancellationToken);
        await EnsureDefaultPermissionsAsync(context, cancellationToken);

        var users = await context.Users
            .IgnoreQueryFilters()
            .ToListAsync(cancellationToken);
        var sysUsers = await context.SysUsers
            .IgnoreQueryFilters()
            .Include(item => item.Roles)
            .ToDictionaryAsync(item => item.PublicId, cancellationToken);
        var roles = await context.SysRoles
            .ToDictionaryAsync(item => item.Code, cancellationToken);

        foreach (var user in users.Where(user => user.IsDeleted))
            EnsureUserMapping(context, user, sysUsers, roles);

        await context.SaveChangesAsync(cancellationToken);

        foreach (var user in users.Where(user => !user.IsDeleted))
            EnsureUserMapping(context, user, sysUsers, roles);

        await context.SaveChangesAsync(cancellationToken);
    }

    public static async Task EnsureUserMappingAsync(
        AppDbContext context,
        User user,
        CancellationToken cancellationToken = default)
    {
        var sysUsers = await context.SysUsers
            .IgnoreQueryFilters()
            .Include(item => item.Roles)
            .ToDictionaryAsync(item => item.PublicId, cancellationToken);
        var roles = await context.SysRoles
            .ToDictionaryAsync(item => item.Code, cancellationToken);
        EnsureUserMapping(context, user, sysUsers, roles);
    }

    private static void EnsureUserMapping(
        AppDbContext context,
        User user,
        IDictionary<Guid, SysUser> sysUsers,
        IDictionary<string, SysRole> roles)
    {
        sysUsers.TryGetValue(user.PublicId, out var sysUser);

        if (user.IsDeleted && sysUser == null)
            return;

        if (sysUser == null)
        {
            sysUser = new SysUser
            {
                PublicId = user.PublicId,
                UserName = user.Username,
                DisplayName = user.FullName,
                IsActive = user.IsActive && !user.IsDeleted,
                IsDeleted = user.IsDeleted,
                LegacyUser = user
            };
            context.SysUsers.Add(sysUser);
            sysUsers.Add(user.PublicId, sysUser);
        }
        else
        {
            sysUser.UserName = user.Username;
            sysUser.DisplayName = user.FullName;
            sysUser.IsActive = user.IsActive && !user.IsDeleted;
            sysUser.IsDeleted = user.IsDeleted;
        }

        if (!user.IsDeleted)
        {
            var roleCode = user.Role.ToString();
            if (!roles.TryGetValue(roleCode, out var role))
            {
                role = new SysRole
                {
                    Code = roleCode,
                    Name = roleCode,
                    Description = $"System role: {roleCode}",
                    IsSystem = true,
                    IsActive = true
                };
                context.SysRoles.Add(role);
                roles.Add(roleCode, role);
            }

            var userRole = sysUser.Roles.FirstOrDefault(item => item.SysRoleId == role.AutoId);
            if (userRole == null)
                sysUser.Roles.Add(new SysUserRole { Role = role });
            else
                userRole.IsDeleted = false;
        }
    }

    private static async Task EnsureRolesAsync(AppDbContext context, CancellationToken cancellationToken)
    {
        var existingRoles = await context.SysRoles
            .IgnoreQueryFilters()
            .ToDictionaryAsync(role => role.Code, cancellationToken);

        foreach (var roleCode in Enum.GetNames<Role>())
        {
            if (existingRoles.TryGetValue(roleCode, out var existingRole))
            {
                existingRole.IsActive = true;
                existingRole.IsDeleted = false;
                continue;
            }

            await context.SysRoles.AddAsync(new SysRole
            {
                Code = roleCode,
                Name = roleCode,
                Description = $"System role: {roleCode}",
                IsSystem = true,
                IsActive = true
            }, cancellationToken);
        }

        await context.SaveChangesAsync(cancellationToken);
    }

    private static async Task EnsureFunctionsAsync(AppDbContext context, CancellationToken cancellationToken)
    {
        var functionsByCode = await context.SysFunctions
            .IgnoreQueryFilters()
            .ToDictionaryAsync(function => function.Code, cancellationToken);

        foreach (var definition in Functions.Where(item => item.ParentCode == null))
        {
            if (functionsByCode.TryGetValue(definition.Code, out var existingFunction))
            {
                if (definition.IsMenuEntry)
                {
                    existingFunction.ModuleCode = definition.ModuleCode;
                    existingFunction.ParentId = functionsByCode[definition.ParentCode!].AutoId;
                    existingFunction.SortOrder = definition.SortOrder;
                    existingFunction.IsAction = false;
                    existingFunction.IsActive = true;
                    existingFunction.IsDeleted = false;
                    existingFunction.FuncUrl ??= definition.FuncUrl;
                    if ((existingFunction.IconName is null or "Folder") && definition.IconName != null)
                        existingFunction.IconName = definition.IconName;
                    existingFunction.BadgeText ??= definition.BadgeText;
                }
                else
                {
                    existingFunction.Name = definition.Name;
                    existingFunction.ModuleCode = definition.ModuleCode;
                    existingFunction.SortOrder = definition.SortOrder;
                    existingFunction.IsAction = definition.IsAction;
                    existingFunction.IsActive = true;
                    existingFunction.IsDeleted = false;
                    existingFunction.Description ??= definition.Description;
                    existingFunction.FuncUrl ??= definition.FuncUrl;
                    if ((existingFunction.IconName is null or "Folder") && definition.IconName != null)
                        existingFunction.IconName = definition.IconName;
                }
                continue;
            }

            var function = new SysFunction
            {
                Code = definition.Code,
                Name = definition.Name,
                ModuleCode = definition.ModuleCode,
                SortOrder = definition.SortOrder,
                IsAction = definition.IsAction,
                FuncUrl = definition.FuncUrl,
                IconName = definition.IconName ?? "Folder",
                BadgeText = definition.BadgeText,
                IsActive = true
            };
            await context.SysFunctions.AddAsync(function, cancellationToken);
            functionsByCode.Add(definition.Code, function);
        }

        await context.SaveChangesAsync(cancellationToken);

        foreach (var definition in Functions.Where(item => item.ParentCode != null))
        {
            if (functionsByCode.TryGetValue(definition.Code, out var existingFunction))
            {
                if (definition.IsMenuEntry)
                {
                    existingFunction.ModuleCode = definition.ModuleCode;
                    existingFunction.ParentId = functionsByCode[definition.ParentCode!].AutoId;
                    existingFunction.SortOrder = definition.SortOrder;
                    existingFunction.IsAction = false;
                    existingFunction.IsActive = true;
                    existingFunction.IsDeleted = false;
                    existingFunction.FuncUrl ??= definition.FuncUrl;
                    if ((existingFunction.IconName is null or "Folder") && definition.IconName != null)
                        existingFunction.IconName = definition.IconName;
                    existingFunction.BadgeText ??= definition.BadgeText;
                }
                else
                {
                    existingFunction.Name = definition.Name;
                    existingFunction.ModuleCode = definition.ModuleCode;
                    existingFunction.ParentId = functionsByCode[definition.ParentCode!].AutoId;
                    existingFunction.SortOrder = definition.SortOrder;
                    existingFunction.IsAction = definition.IsAction;
                    existingFunction.IsActive = true;
                    existingFunction.IsDeleted = false;
                    existingFunction.Description ??= definition.Description;
                    existingFunction.FuncUrl ??= definition.FuncUrl;
                    if ((existingFunction.IconName is null or "Folder") && definition.IconName != null)
                        existingFunction.IconName = definition.IconName;
                }
                continue;
            }

            if (!functionsByCode.TryGetValue(definition.ParentCode!, out var parent))
                throw new InvalidOperationException($"System RBAC parent function '{definition.ParentCode}' is missing.");

            var function = new SysFunction
            {
                Code = definition.Code,
                Name = definition.Name,
                ModuleCode = definition.ModuleCode,
                Parent = parent,
                SortOrder = definition.SortOrder,
                IsAction = definition.IsAction,
                FuncUrl = definition.FuncUrl,
                IconName = definition.IconName ?? "Folder",
                BadgeText = definition.BadgeText,
                IsActive = true
            };
            await context.SysFunctions.AddAsync(function, cancellationToken);
            functionsByCode.Add(definition.Code, function);
        }

        await context.SaveChangesAsync(cancellationToken);
    }

    private static async Task EnsureDefaultPermissionsAsync(
        AppDbContext context,
        CancellationToken cancellationToken)
    {
        var roles = await context.SysRoles.ToListAsync(cancellationToken);
        var functions = await context.SysFunctions
            .Where(function => function.IsActive)
            .ToListAsync(cancellationToken);
        var operationalModules = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "DASHBOARD", "SEMESTERS", "STUDENTS", "LECTURER", "COMPANIES", "ASSIGNMENTS",
            "WEEKLY_REPORTS", "ATTENDANCE", "EVALUATIONS", "SUMMARY", "TEMPLATES", "NOTIFICATIONS"
        };
        var platformModules = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "SYSTEM", "ACCOUNTS", "CONFIG", "AUDIT", "IT_CONFIG", "API_WEBHOOK",
            "DEPARTMENTS", "GRID_CONFIG", "FIELD_POLICIES"
        };
        var permissionsByRoleAndFunction = await context.SysRolePermissions
            .IgnoreQueryFilters()
            .ToDictionaryAsync(
                permission => (permission.SysRoleId, permission.SysFunctionId),
                cancellationToken);

        void EnsurePermission(SysRole role, SysFunction function, bool isGranted = true)
        {
            var key = (role.AutoId, function.AutoId);
            if (!permissionsByRoleAndFunction.TryGetValue(key, out var permission))
            {
                permission = new SysRolePermission
                {
                    SysRoleId = role.AutoId,
                    SysFunctionId = function.AutoId,
                    IsGranted = isGranted
                };
                context.SysRolePermissions.Add(permission);
                permissionsByRoleAndFunction.Add(key, permission);
            }
            else if (permission.IsDeleted)
            {
                permission.IsDeleted = false;
                permission.IsGranted = isGranted;
            }
        }

        foreach (var role in roles.Where(item => !item.DefaultPermissionsApplied))
        {
            var grantedFunctions = role.Code switch
            {
                nameof(Role.SuperAdmin) => functions,
                nameof(Role.DepartmentAdmin) => functions.Where(function =>
                    operationalModules.Contains(function.ModuleCode)
                    && (function.IsAction || function.Code == "DASHBOARD")),
                _ => []
            };

            foreach (var function in grantedFunctions)
                EnsurePermission(role, function);

            role.DefaultPermissionsApplied = true;
        }

        var superAdmin = roles.FirstOrDefault(role =>
            role.Code.Equals(nameof(Role.SuperAdmin), StringComparison.OrdinalIgnoreCase));
        if (superAdmin != null)
        {
            foreach (var function in functions)
            {
                EnsurePermission(superAdmin, function);
                permissionsByRoleAndFunction[(superAdmin.AutoId, function.AutoId)].IsGranted = true;
            }
        }

        var departmentAdmin = roles.FirstOrDefault(role =>
            role.Code.Equals(nameof(Role.DepartmentAdmin), StringComparison.OrdinalIgnoreCase));
        if (departmentAdmin != null)
        {
            foreach (var function in functions.Where(function =>
                         operationalModules.Contains(function.ModuleCode) && function.IsAction))
                EnsurePermission(departmentAdmin, function);

            foreach (var function in functions.Where(function => platformModules.Contains(function.ModuleCode)))
            {
                EnsurePermission(departmentAdmin, function, isGranted: false);
                var permission = permissionsByRoleAndFunction[(departmentAdmin.AutoId, function.AutoId)];
                permission.IsGranted = false;
            }
        }

        var exportPermission = functions.FirstOrDefault(function =>
            function.Code == SystemPermissionCodes.LecturerExport);
        if (exportPermission != null)
        {
            foreach (var role in roles.Where(role =>
                         role.Code.Equals(nameof(Role.Lecturer), StringComparison.OrdinalIgnoreCase)
                         || role.Code.Equals(nameof(Role.DepartmentAdmin), StringComparison.OrdinalIgnoreCase)))
            {
                EnsurePermission(role, exportPermission);
            }
        }

        await context.SaveChangesAsync(cancellationToken);
    }

    private static async Task EnsureDefaultFieldPoliciesAsync(
        AppDbContext context,
        CancellationToken cancellationToken)
    {
        var defaults = new (string FormCode, string FieldKey, string Label)[]
        {
            ("FORM_STUDENT_PROFILE", "StudentCode", "Mã sinh viên"),
            ("FORM_STUDENT_PROFILE", "FullName", "Họ và tên"),
            ("FORM_STUDENT_PROFILE", "Class", "Lớp"),
            ("FORM_STUDENT_PROFILE", "Major", "Ngành"),
            ("FORM_STUDENT_PROFILE", "Email", "Email"),
            ("FORM_STUDENT_PROFILE", "Phone", "Điện thoại"),
            ("FORM_COMPANY_REGISTRATION", "CompanyName", "Tên doanh nghiệp"),
            ("FORM_COMPANY_REGISTRATION", "CompanyCode", "Mã doanh nghiệp"),
            ("FORM_COMPANY_REGISTRATION", "Address", "Địa chỉ"),
            ("FORM_COMPANY_REGISTRATION", "ContactPerson", "Người liên hệ"),
            ("FORM_COMPANY_REGISTRATION", "ContactEmail", "Email liên hệ"),
            ("FORM_COMPANY_REGISTRATION", "ContactPhone", "Số điện thoại"),
            ("FORM_WEEKLY_REPORT", "Title", "Tiêu đề"),
            ("FORM_WEEKLY_REPORT", "WeekNumber", "Tuần báo cáo"),
            ("FORM_WEEKLY_REPORT", "Content", "Nội dung"),
            ("FORM_WEEKLY_REPORT", "Attachment", "Tệp đính kèm"),
            ("FORM_WEEKLY_REPORT", "QualityScore", "Điểm chất lượng"),
            ("FORM_WEEKLY_REPORT", "LecturerComment", "Nhận xét của giảng viên"),
            ("FORM_EMPLOYER_EVALUATION", "AttendanceScore", "Điểm chuyên cần"),
            ("FORM_EMPLOYER_EVALUATION", "SkillsScore", "Điểm kỹ năng"),
            ("FORM_EMPLOYER_EVALUATION", "AttitudeScore", "Điểm thái độ"),
            ("FORM_EMPLOYER_EVALUATION", "FinalScore", "Điểm tổng kết"),
            ("FORM_EMPLOYER_EVALUATION", "Comments", "Nhận xét")
        };
        var existingPolicies = await context.SysFieldPolicies
            .IgnoreQueryFilters()
            .Where(item => item.RoleId == null)
            .ToDictionaryAsync(
                item => $"{item.FormCode}:{item.FieldKey}",
                StringComparer.OrdinalIgnoreCase,
                cancellationToken);

        foreach (var (formCode, fieldKey, label) in defaults)
        {
            var key = $"{formCode}:{fieldKey}";
            if (existingPolicies.TryGetValue(key, out var existing))
            {
                existing.IsDeleted = false;
                existing.CustomLabel ??= label;
                continue;
            }

            var policy = new SysFieldPolicy
            {
                FormCode = formCode,
                FieldKey = fieldKey,
                CustomLabel = label,
                IsVisible = true,
                IsRequired = fieldKey == "QualityScore",
                SortOrder = Array.IndexOf(defaults, (formCode, fieldKey, label))
            };
            await context.SysFieldPolicies.AddAsync(policy, cancellationToken);
            existingPolicies.Add(key, policy);
        }

        await context.SaveChangesAsync(cancellationToken);
    }

    private static async Task EnsureDefaultLecturerGridConfigsAsync(
        AppDbContext context,
        CancellationToken cancellationToken)
    {
        var defaults = new (string FieldCode, string HeaderTitle, int Width, bool Frozen, string FrozenSide)[]
        {
            ("studentCode", "Mã sinh viên", 120, true, "left"),
            ("fullName", "Họ và tên", 180, true, "left"),
            ("className", "Lớp sinh hoạt", 110, false, "left"),
            ("companyName", "Doanh nghiệp thực tập", 200, false, "left"),
            ("progressWeeks", "Tiến độ báo cáo", 130, false, "left"),
            ("employerScore", "Điểm DN", 100, false, "left"),
            ("lecturerScore", "Điểm GV", 100, false, "left"),
            ("finalGrade", "Điểm tổng kết", 110, false, "left"),
            ("actions", "Thao tác", 160, true, "right")
        };
        var lecturerRoleId = await context.SysRoles
            .Where(role => role.Code == nameof(Role.Lecturer) && role.IsActive)
            .Select(role => (long?)role.AutoId)
            .FirstOrDefaultAsync(cancellationToken);
        var roleScopes = new long?[] { null, lecturerRoleId }
            .Distinct()
            .ToArray();

        foreach (var roleId in roleScopes)
        {
            var hasConfig = await context.SysGridConfigs
                .IgnoreQueryFilters()
                .AnyAsync(config =>
                    config.FeatureCode == "LECTURER_STUDENTS"
                    && config.RoleId == roleId
                    && config.TenantId == null,
                    cancellationToken);
            if (hasConfig)
                continue;

            foreach (var (fieldCode, headerTitle, width, frozen, frozenSide) in defaults)
            {
                context.SysGridConfigs.Add(new SysGridConfig
                {
                    FeatureCode = "LECTURER_STUDENTS",
                    FieldCode = fieldCode,
                    HeaderTitle = headerTitle,
                    ColumnWidth = width,
                    IsVisible = true,
                    IsFrozen = frozen,
                    FrozenSide = frozenSide,
                    RoleId = roleId,
                    SortOrder = Array.IndexOf(defaults, (fieldCode, headerTitle, width, frozen, frozenSide))
                });
            }
        }

        var adminGrids = new Dictionary<string, (string FieldCode, string HeaderTitle, int Width, bool Frozen, string FrozenSide)[]>
        {
            ["STUDENTS"] =
            [
                ("select", "Chọn", 42, true, "left"),
                ("fullName", "Họ & tên", 210, true, "left"),
                ("studentCode", "MSSV & Lớp", 150, false, "left"),
                ("assignedLecturer", "GVHD", 170, false, "left"),
                ("companyName", "Doanh nghiệp", 190, false, "left"),
                ("accountStatus", "Trạng thái tài khoản", 150, false, "left"),
                ("actions", "Thao tác", 160, true, "right")
            ],
            ["LECTURERS"] =
            [
                ("select", "Chọn", 42, true, "left"),
                ("fullName", "Giảng viên", 210, true, "left"),
                ("staffCode", "MSGV", 120, false, "left"),
                ("department", "Khoa / Bộ môn", 170, false, "left"),
                ("contact", "Liên hệ", 220, false, "left"),
                ("assignedCount", "SV phân công", 120, false, "left"),
                ("accountStatus", "Trạng thái tài khoản", 150, false, "left"),
                ("actions", "Thao tác", 160, true, "right")
            ],
            ["COMPANIES"] =
            [
                ("name", "Doanh nghiệp", 240, true, "left"),
                ("industry", "Lĩnh vực", 180, false, "left"),
                ("contact", "Liên hệ", 220, false, "left"),
                ("openPositions", "Vị trí tuyển dụng", 150, false, "left"),
                ("capacity", "SV / Sức chứa", 130, false, "left"),
                ("status", "Trạng thái", 150, false, "left"),
                ("actions", "Thao tác", 180, true, "right")
            ]
        };
        foreach (var (featureCode, columns) in adminGrids)
        {
            var existing = await context.SysGridConfigs
                .IgnoreQueryFilters()
                .Where(config => config.FeatureCode == featureCode
                    && config.RoleId == null
                    && config.TenantId == null)
                .ToListAsync(cancellationToken);
            var existingByField = existing.ToDictionary(config => config.FieldCode, StringComparer.OrdinalIgnoreCase);
            for (var index = 0; index < columns.Length; index++)
            {
                var (fieldCode, headerTitle, width, frozen, frozenSide) = columns[index];
                if (existingByField.TryGetValue(fieldCode, out var config))
                {
                    config.IsDeleted = false;
                    continue;
                }

                context.SysGridConfigs.Add(new SysGridConfig
                {
                    FeatureCode = featureCode,
                    FieldCode = fieldCode,
                    HeaderTitle = headerTitle,
                    ColumnWidth = width,
                    IsVisible = true,
                    IsFrozen = frozen,
                    FrozenSide = frozenSide,
                    SortOrder = index
                });
            }
        }

        await context.SaveChangesAsync(cancellationToken);
    }
}
