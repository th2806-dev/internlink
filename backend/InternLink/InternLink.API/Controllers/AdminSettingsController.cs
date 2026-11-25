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

    /// <summary>Gets public application branding for login and portal surfaces.</summary>
    [AllowAnonymous]
    [HttpGet("branding")]
    public async Task<IActionResult> GetBranding()
    {
        var branding = await _settingsService.GetBrandingAsync();
        return Ok(ApiResponse<AppBrandingResponse>.Ok(branding));
    }

    /// <summary>Uploads a configured application logo or favicon.</summary>
    [HttpPost("branding/upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadBrandingAsset(
        IFormFile file,
        [FromForm] string type)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Vui lòng chọn tệp logo." }));

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension is not (".jpg" or ".jpeg" or ".png" or ".webp" or ".svg"))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Chỉ hỗ trợ JPG, PNG, WEBP hoặc SVG." }));

        var key = type?.Trim().ToLowerInvariant() switch
        {
            "favicon" => "AppFaviconUrl",
            "logo" => "AppLogoUrl",
            _ => null
        };
        if (key == null)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Loại tài sản thương hiệu không hợp lệ." }));

        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "branding");
        Directory.CreateDirectory(uploadsDir);
        var fileName = $"{(key == "AppLogoUrl" ? "logo" : "favicon")}-{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadsDir, fileName);
        await using (var stream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None))
            await file.CopyToAsync(stream);

        var url = $"/uploads/branding/{fileName}";
        await _settingsService.UpdateBrandingAssetAsync(key, url);
        return Ok(ApiResponse<AppBrandingResponse>.Ok(await _settingsService.GetBrandingAsync()));
    }
}
