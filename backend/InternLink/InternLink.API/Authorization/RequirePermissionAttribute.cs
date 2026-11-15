using Microsoft.AspNetCore.Authorization;

namespace InternLink.API.Authorization;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    public const string PolicyPrefix = "Permission:";

    public RequirePermissionAttribute(string permissionCode)
    {
        if (string.IsNullOrWhiteSpace(permissionCode))
            throw new ArgumentException("Permission code is required.", nameof(permissionCode));

        Policy = PolicyPrefix + permissionCode;
    }
}
