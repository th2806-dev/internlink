using System.Security.Claims;

namespace InternLink.API.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid? GetUserId(this ClaimsPrincipal user)
    {
        var value =
            user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub")
            ?? user.FindFirstValue("nameid");

        return Guid.TryParse(value, out var id) ? id : null;
    }

    public static bool IsSuperAdmin(this ClaimsPrincipal user) =>
        user.IsInRole("SuperAdmin");

    public static bool IsDepartmentAdmin(this ClaimsPrincipal user) =>
        user.IsInRole("DepartmentAdmin");

    public static bool IsLecturer(this ClaimsPrincipal user) =>
        user.IsInRole("Lecturer");

    public static bool IsStudent(this ClaimsPrincipal user) =>
        user.IsInRole("Student");
}
