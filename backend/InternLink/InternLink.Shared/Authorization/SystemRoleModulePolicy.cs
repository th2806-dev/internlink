namespace InternLink.Shared.Authorization;

public static class SystemRoleModulePolicy
{
    private static readonly HashSet<string> SuperAdminModules = new(StringComparer.OrdinalIgnoreCase)
    {
        "DASHBOARD", "SYSTEM", "ACCOUNTS", "AUDIT", "TENANTS", "LICENSES",
        "API_GATEWAY", "OBSERVABILITY", "SSO_HUB", "COMPLIANCE", "BILLING",
        "ANNOUNCEMENTS", "SECURITY_SESSIONS"
    };

    private static readonly HashSet<string> DepartmentAdminModules = new(StringComparer.OrdinalIgnoreCase)
    {
        "DASHBOARD", "SEMESTERS", "STUDENTS", "LECTURER", "COMPANIES", "ASSIGNMENTS",
        "WEEKLY_REPORTS", "ATTENDANCE", "EVALUATIONS", "SUMMARY", "TEMPLATES", "NOTIFICATIONS"
    };

    public static bool IsModuleAllowed(string roleCode, string moduleCode)
    {
        if (roleCode.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase))
            return SuperAdminModules.Contains(moduleCode);

        if (roleCode.Equals("DepartmentAdmin", StringComparison.OrdinalIgnoreCase))
            return DepartmentAdminModules.Contains(moduleCode);

        return false;
    }

    public static bool IsScopedAdminRole(string roleCode) =>
        roleCode.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase)
        || roleCode.Equals("DepartmentAdmin", StringComparison.OrdinalIgnoreCase);
}
