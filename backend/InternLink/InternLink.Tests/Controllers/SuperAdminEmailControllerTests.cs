using FluentAssertions;
using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Infrastructure.Email;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;

namespace InternLink.Tests.Controllers;

public class SuperAdminEmailControllerTests
{
    [Fact]
    public async Task TestEmail_SendsNeutralMessageToRequestedAddressWithConfiguredPortalUrl()
    {
        var emailService = new Mock<IEmailService>();
        emailService
            .Setup(service => service.SendAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(SendEmailResult.Ok("recipient@example.com"));

        var controller = new SuperAdminEmailController(
            emailService.Object,
            Options.Create(new EmailSettings { PortalUrl = "http://internlink.duckdns.org/" }));

        var result = await controller.TestEmail(
            new TestEmailRequest
            {
                ToEmail = " recipient@example.com ",
                FullName = "Test recipient",
                Role = InvitationRole.Lecturer
            },
            CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        emailService.Verify(service => service.SendAsync(
            "recipient@example.com",
            "[InternLink] Email kiểm tra gửi thư",
            It.Is<string>(body =>
                body.Contains("http://internlink.duckdns.org") &&
                !body.Contains("TempPass123!")),
            It.Is<string>(body => body.Contains("http://internlink.duckdns.org")),
            CancellationToken.None), Times.Once);
        emailService.Verify(service => service.SendInvitationAsync(
            It.IsAny<InvitationEmailRequest>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task TestEmail_WhenDeliveryFails_ReturnsBadGateway()
    {
        var emailService = new Mock<IEmailService>();
        emailService
            .Setup(service => service.SendAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(SendEmailResult.Fail(
                "test@example.com",
                "SMTP authentication failed"));

        var controller = new SuperAdminEmailController(
            emailService.Object,
            Options.Create(new EmailSettings()));

        var result = await controller.TestEmail(
            new TestEmailRequest { ToEmail = "test@example.com" },
            CancellationToken.None);

        result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(StatusCodes.Status502BadGateway);
    }
}
