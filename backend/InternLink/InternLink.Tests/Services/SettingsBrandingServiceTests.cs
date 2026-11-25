using InternLink.Application.DTOs;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Tests.Services;

public sealed class SettingsBrandingServiceTests
{
    [Fact]
    public async Task UpdateBrandingAsset_PersistsLogoAndBrandingResponse()
    {
        await using var db = CreateContext();
        var service = new SettingsService(db);

        await service.UpdateBrandingAssetAsync("AppLogoUrl", "/uploads/branding/logo-test.png");
        var branding = await service.GetBrandingAsync();

        Assert.Equal("/uploads/branding/logo-test.png", branding.AppLogoUrl);
        Assert.Equal("InternLink", branding.AppName);
    }

    [Fact]
    public async Task UpdateSettings_PersistsAppNameAndPrimaryColor()
    {
        await using var db = CreateContext();
        var service = new SettingsService(db);
        var request = new UpdateAdminSettingsRequest
        {
            DepartmentName = "Đơn vị thử nghiệm",
            SupportEmail = "support@example.test",
            Address = "Hà Nội",
            AppName = "Campus ERP",
            AppShortName = "Campus",
            BrowserTitle = "{appName} | Cổng thực tập",
            CopyrightText = "© {year} {companyName}",
            AppLogoUrl = "/uploads/branding/logo-test.png",
            AppFaviconUrl = "/uploads/branding/favicon-test.png",
            AppPrimaryColor = "#123abc",
            CompanyName = "CÔNG TY TEST",
            CompanyTaxCode = "0123456789",
            CompanyAddress = "TP Hà Nội",
            BillingEmail = "billing@example.test"
        };

        var settings = await service.UpdateSettingsAsync(request);

        Assert.Equal("Campus ERP", settings.AppName);
        Assert.Equal("Campus", settings.AppShortName);
        Assert.Equal("{appName} | Cổng thực tập", settings.BrowserTitle);
        Assert.Equal("© {year} {companyName}", settings.CopyrightText);
        Assert.Equal("#123abc", settings.AppPrimaryColor);
        Assert.Equal("CÔNG TY TEST", settings.CompanyName);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }
}
