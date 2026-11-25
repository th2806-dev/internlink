using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace InternLink.Tests.Controllers;

public sealed class SysHealthControllerTests
{
    [Fact]
    public async Task GetProbes_ReturnsAllInfrastructureStatuses()
    {
        var expected = new SystemHealthResponse(
            DateTimeOffset.UtcNow,
            [
                new("sql", "SQL Server", "Healthy", 4, "connected", new Dictionary<string, string?>()),
                new("redis", "Redis", "NotConfigured", 0, "not configured", new Dictionary<string, string?>()),
                new("s3", "S3 Storage", "NotConfigured", 0, "not configured", new Dictionary<string, string?>()),
                new("smtp", "SMTP", "NotConfigured", 0, "not configured", new Dictionary<string, string?>())
            ]);
        var service = new Mock<ISystemHealthService>();
        service.Setup(item => item.GetHealthAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);
        var controller = new SysHealthController(service.Object);

        var result = await controller.GetProbes(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<ApiResponse<SystemHealthResponse>>(ok.Value);
        Assert.Equal(4, response.Data?.Probes.Count);
        Assert.Equal("NotConfigured", response.Data?.Probes[1].Status);
        service.VerifyAll();
    }
}
