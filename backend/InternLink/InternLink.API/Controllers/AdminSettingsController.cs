using System.Threading.Tasks;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>
/// Admin system & faculty settings management. Now backed by database via ISettingsService.
/// </summary>
[ApiController]
[Route("api/Admin/settings")]
[Route(AdminApiRoutes.SuperAdminPrefix + "/settings")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public class AdminSettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;

    public AdminSettingsController(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    /// <summary>
    /// Get current system settings
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _settingsService.GetSettingsAsync();
        return Ok(ApiResponse<AdminSettingsDto>.Ok(settings));
    }

    /// <summary>
    /// Update system settings
    /// </summary>
    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateAdminSettingsRequest request)
    {
        try
        {
            var settings = await _settingsService.UpdateSettingsAsync(request);
            return Ok(ApiResponse<AdminSettingsDto>.Ok(settings));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>
    /// Reset all settings to defaults
    /// </summary>
    [HttpPost("reset")]
    public async Task<IActionResult> ResetSettings()
    {
        var settings = await _settingsService.ResetSettingsAsync();
        return Ok(ApiResponse<AdminSettingsDto>.Ok(settings));
    }
}
