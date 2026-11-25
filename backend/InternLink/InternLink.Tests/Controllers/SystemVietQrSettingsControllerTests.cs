using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace InternLink.Tests.Controllers;

public sealed class SystemVietQrSettingsControllerTests
{
    [Fact]
    public async Task Get_ReturnsCurrentVietQrSettings()
    {
        var cancellationToken = new CancellationTokenSource().Token;
        var expected = new VietQrSettingsResponse("970415", "123456789", "ACCOUNT NAME", "HANOI");
        var billingService = new Mock<ISystemBillingService>();
        billingService.Setup(service => service.GetVietQrSettingsAsync(cancellationToken))
            .ReturnsAsync(expected);
        var controller = new SystemVietQrSettingsController(billingService.Object);

        var result = await controller.Get(cancellationToken);

        Assert.IsType<OkObjectResult>(result.Result);
        billingService.Verify(service => service.GetVietQrSettingsAsync(cancellationToken), Times.Once);
    }

    [Fact]
    public async Task Update_PersistsValidatedVietQrSettings()
    {
        var cancellationToken = new CancellationTokenSource().Token;
        var actorId = Guid.NewGuid();
        var request = new UpdateVietQrSettingsRequest
        {
            BankId = "970415",
            AccountNo = "123456789",
            AccountName = "ACCOUNT NAME",
            MerchantCity = "HANOI"
        };
        var expected = new VietQrSettingsResponse(
            request.BankId,
            request.AccountNo,
            request.AccountName,
            request.MerchantCity);
        var billingService = new Mock<ISystemBillingService>();
        billingService.Setup(service => service.UpdateVietQrSettingsAsync(
                request,
                actorId,
                null,
                cancellationToken))
            .ReturnsAsync(expected);
        var controller = new SystemVietQrSettingsController(billingService.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[] { new Claim(ClaimTypes.NameIdentifier, actorId.ToString()) },
                    "test"))
            }
        };

        var result = await controller.Update(request, cancellationToken);

        Assert.IsType<OkObjectResult>(result.Result);
        billingService.Verify(service => service.UpdateVietQrSettingsAsync(
            request,
            actorId,
            null,
            cancellationToken), Times.Once);
    }

    [Fact]
    public async Task Update_ReturnsBadRequestForInvalidConfiguration()
    {
        var request = new UpdateVietQrSettingsRequest
        {
            BankId = "invalid",
            AccountNo = "123456789",
            AccountName = "ACCOUNT NAME",
            MerchantCity = "HANOI"
        };
        var billingService = new Mock<ISystemBillingService>();
        billingService.Setup(service => service.UpdateVietQrSettingsAsync(
                request,
                It.IsAny<Guid>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ArgumentException("Mã BIN ngân hàng không hợp lệ."));
        var controller = new SystemVietQrSettingsController(billingService.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[] { new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()) },
                    "test"))
            }
        };

        var result = await controller.Update(request, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
