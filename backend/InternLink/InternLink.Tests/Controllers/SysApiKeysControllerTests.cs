using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace InternLink.Tests.Controllers;

public sealed class SysApiKeysControllerTests
{
    [Fact]
    public async Task Create_ReturnsSecretOnceWithCreatedLocation()
    {
        var tenantId = Guid.NewGuid();
        var apiKey = new ApiKeyResponse(
            Guid.NewGuid(),
            "SIS integration",
            "ilk_live_abc123",
            ["students.read"],
            120,
            null,
            null,
            true,
            DateTimeOffset.UtcNow);
        var resultPayload = new ApiKeySecretResponse(apiKey, "ilk_live_one-time-secret");
        var service = new Mock<ISystemApiGatewayService>();
        service.Setup(item => item.CreateApiKeyAsync(
                tenantId,
                It.IsAny<CreateApiKeyRequest>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(resultPayload);
        var controller = new SysApiKeysController(service.Object);

        var result = await controller.Create(
            tenantId,
            new CreateApiKeyRequest { Name = "SIS integration", Scopes = ["students.read"] },
            CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(SysApiKeysController.GetById), created.ActionName);
        Assert.Equal(apiKey.Id, created.RouteValues?["id"]);
        var response = Assert.IsType<ApiResponse<ApiKeySecretResponse>>(created.Value);
        Assert.Equal(resultPayload.Secret, response.Data?.Secret);
        service.VerifyAll();
    }

    [Fact]
    public async Task GetById_ReturnsNotFoundForUnknownKey()
    {
        var tenantId = Guid.NewGuid();
        var service = new Mock<ISystemApiGatewayService>();
        service.Setup(item => item.GetApiKeyAsync(tenantId, It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ApiKeyResponse?)null);
        var controller = new SysApiKeysController(service.Object);

        var result = await controller.GetById(tenantId, Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }
}
