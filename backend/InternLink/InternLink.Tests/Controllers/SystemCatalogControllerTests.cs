using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace InternLink.Tests.Controllers;

public sealed class SystemCatalogControllerTests
{
    [Fact]
    public void Get_ReturnsCompleteVietQrBankCatalog()
    {
        var service = new SystemCatalogService();

        var catalog = service.GetCatalog();

        Assert.True(catalog.VietQrBanks.Count >= 35);
        Assert.Contains(catalog.VietQrBanks, bank => bank.Value == "970415" && bank.Label.Contains("VietinBank"));
        Assert.Contains(catalog.VietQrBanks, bank => bank.Value == "970436" && bank.Label.Contains("Vietcombank"));
        Assert.Contains(catalog.VietQrBanks, bank => bank.Value == "970423" && bank.Label.Contains("TPBank"));
    }

    [Fact]
    public void Get_ReturnsCanonicalCatalogOptions()
    {
        var catalog = new SystemCatalogResponse(
            [new SystemCatalogOption("970415", "VietinBank")],
            [new SystemCatalogOption("PRO", "Chuyên nghiệp")],
            [12, 24, 36],
            [new SystemCatalogOption("VietQR", "VietQR")],
            [new SystemCatalogOption("Maintenance", "Bảo trì")],
            [new SystemCatalogOption("AllUsers", "Tất cả người dùng")]);
        var service = new Mock<ISystemCatalogService>();
        service.Setup(item => item.GetCatalog()).Returns(catalog);
        var controller = new SystemCatalogController(service.Object);

        var result = controller.Get();

        Assert.IsType<OkObjectResult>(result.Result);
        service.Verify(item => item.GetCatalog(), Times.Once);
    }
}
