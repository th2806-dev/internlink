namespace InternLink.Shared.Authorization;

public static class AdminPolicies
{
    public const string SuperAdmin = "RequireSuperAdmin";
    public const string DepartmentAdmin = "RequireDepartmentAdmin";
    public const string LegacyAdmin = "RequireAdmin";
}

public static class AdminApiRoutes
{
    public const string LegacyPrefix = "api/Admin";
    public const string SuperAdminPrefix = "api/SuperAdmin";
    public const string DepartmentAdminPrefix = "api/DepartmentAdmin";
}
