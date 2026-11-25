using System.Security.Claims;
using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace InternLink.Tests.Controllers;

public sealed class SysTenantSsoControllerTests
{
    [Fact]
    public async Task Get_ReturnsMaskedSecretAndNeverReturnsPlaintext()
    {
        var tenantId = Guid.NewGuid();
        var service = new Mock<ISystemTenantSsoService>(MockBehavior.Strict);
        service.Setup(item => item.GetConfigurationAsync(tenantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Configuration(tenantId));
        var controller = new SysTenantSsoController(service.Object);

        var result = await controller.Get(tenantId, CancellationToken.None);

        var response = Assert.IsType<OkObjectResult>(result.Result);
        var config = Assert.IsType<ApiResponse<TenantSsoConfigurationResponse>>(response.Value).Data!;
        Assert.Equal("••••••••", config.MaskedClientSecret);
        Assert.True(config.HasClientSecret);
        Assert.DoesNotContain("plain-secret", System.Text.Json.JsonSerializer.Serialize(config));
        service.VerifyAll();
    }

    [Fact]
    public async Task Save_MapsInvalidConfigurationToBadRequest()
    {
        var service = new Mock<ISystemTenantSsoService>();
        service.Setup(item => item.SaveConfigurationAsync(
                It.IsAny<Guid>(),
                It.IsAny<UpdateTenantSsoConfigurationRequest>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ArgumentException("Discovery endpoint không hợp lệ."));
        var controller = new SysTenantSsoController(service.Object);

        var result = await controller.Save(
            Guid.NewGuid(),
            new UpdateTenantSsoConfigurationRequest
            {
                ProviderType = "AzureAD",
                ClientId = "client",
                DiscoveryUrl = "http://localhost",
                AllowedEmailDomains = ["example.edu.vn"]
            },
            CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task TestDiscovery_ReturnsResultFromService()
    {
        var tenantId = Guid.NewGuid();
        var service = new Mock<ISystemTenantSsoService>();
        service.Setup(item => item.TestDiscoveryAsync(
                tenantId,
                It.IsAny<TestTenantSsoDiscoveryRequest>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TenantSsoDiscoveryTestResponse(true, "OIDC Discovery kết nối thành công.", "https://idp.example/"));
        var controller = new SysTenantSsoController(service.Object);

        var result = await controller.TestDiscovery(
            tenantId,
            new TestTenantSsoDiscoveryRequest
            {
                ProviderType = "AzureAD",
                DiscoveryUrl = "https://idp.example/.well-known/openid-configuration"
            },
            CancellationToken.None);

        var response = Assert.IsType<OkObjectResult>(result.Result);
        var discovery = Assert.IsType<ApiResponse<TenantSsoDiscoveryTestResponse>>(response.Value).Data!;
        Assert.True(discovery.IsSuccess);
        Assert.Equal("https://idp.example/", discovery.Issuer);
    }

    [Fact]
    public async Task Delete_ReturnsNoContentAndPassesActor()
    {
        var tenantId = Guid.NewGuid();
        var service = new Mock<ISystemTenantSsoService>();
        service.Setup(item => item.DeleteConfigurationAsync(tenantId, "platform-admin", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var controller = new SysTenantSsoController(service.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        [new Claim(ClaimTypes.Name, "platform-admin")], "test"))
                }
            }
        };

        var result = await controller.Delete(tenantId, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        service.VerifyAll();
    }

    private static TenantSsoConfigurationResponse Configuration(Guid tenantId) =>
        new(tenantId, true, "AzureAD", "client-id", "••••••••", true,
            "https://idp.example/.well-known/openid-configuration", ["example.edu.vn"], false, DateTimeOffset.UtcNow);
}
