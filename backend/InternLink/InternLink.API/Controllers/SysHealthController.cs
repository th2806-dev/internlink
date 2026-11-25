using InternLink.API.Authorization;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>SuperAdmin health probes for infrastructure dependencies.</summary>
[ApiController]
[Route("api/v1/system/health")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public sealed class SysHealthController(ISystemHealthService healthService) : ControllerBase
{
    /// <summary>Gets SQL, Redis, S3, and SMTP probe results with graceful degradation.</summary>
    [HttpGet("probes")]
    [RequirePermission(SystemPermissionCodes.ObservabilityView)]
    public async Task<ActionResult<ApiResponse<SystemHealthResponse>>> GetProbes(
        CancellationToken cancellationToken)
    {
        var result = await healthService.GetHealthAsync(cancellationToken);
        return Ok(ApiResponse<SystemHealthResponse>.Ok(result));
    }
}
