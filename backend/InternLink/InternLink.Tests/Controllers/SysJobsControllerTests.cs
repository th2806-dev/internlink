using System.Security.Claims;
using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace InternLink.Tests.Controllers;

public sealed class SysJobsControllerTests
{
    [Fact]
    public async Task RunNow_RecordsAuthenticatedActor()
    {
        var expected = new JobExecutionResponse(
            Guid.NewGuid(),
            "REPORT_DEADLINE_SCAN",
            "Succeeded",
            "admin@example.edu.vn",
            DateTimeOffset.UtcNow,
            DateTimeOffset.UtcNow,
            12,
            "Scanned report schedules.",
            null);
        var service = new Mock<ISystemJobsService>();
        service.Setup(item => item.TriggerAsync(
                "REPORT_DEADLINE_SCAN",
                "admin@example.edu.vn",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);
        var controller = new SysJobsController(service.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        [new Claim(ClaimTypes.Name, "admin@example.edu.vn")],
                        "test"))
                }
            }
        };

        var result = await controller.RunNow("REPORT_DEADLINE_SCAN", CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<ApiResponse<JobExecutionResponse>>(ok.Value);
        Assert.Equal(expected.Id, response.Data?.Id);
        service.VerifyAll();
    }

    [Fact]
    public async Task SetEnabled_ReturnsNotFoundForUnknownJob()
    {
        var service = new Mock<ISystemJobsService>();
        service.Setup(item => item.SetEnabledAsync("UNKNOWN", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync((SystemJobResponse?)null);
        var controller = new SysJobsController(service.Object);

        var result = await controller.SetEnabled(
            "UNKNOWN",
            new SetSystemJobEnabledRequest(true),
            CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task SetSchedule_ReturnsBadRequestForUnsupportedCron()
    {
        var service = new Mock<ISystemJobsService>();
        service.Setup(item => item.SetScheduleAsync("DB_BACKUP", "*/5 * * * *", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ArgumentException("Unsupported backup schedule."));
        var controller = new SysJobsController(service.Object);

        var result = await controller.SetSchedule(
            "DB_BACKUP",
            new SetSystemJobScheduleRequest { CronExpression = "*/5 * * * *" },
            CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
