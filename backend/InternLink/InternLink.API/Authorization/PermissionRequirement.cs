using Microsoft.AspNetCore.Authorization;

namespace InternLink.API.Authorization;

public sealed record PermissionRequirement(string PermissionCode) : IAuthorizationRequirement;
