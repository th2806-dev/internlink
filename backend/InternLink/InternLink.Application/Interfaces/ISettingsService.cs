using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISettingsService
{
    Task<AdminSettingsDto> GetSettingsAsync();
    Task<AdminSettingsDto> UpdateSettingsAsync(UpdateAdminSettingsRequest request);
    Task<AdminSettingsDto> ResetSettingsAsync();
    Task<AppBrandingResponse> GetBrandingAsync();
    Task UpdateBrandingAssetAsync(string key, string url);
}
