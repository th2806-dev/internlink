using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Infrastructure.Email;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace InternLink.Tests.Services;

public class EmailServiceTests
{
    private static LoggingEmailService CreateService()
    {
        var options = Options.Create(new EmailSettings
        {
            Enabled = false,
            PortalUrl = "http://localhost:5173",
            FromName = "InternLink",
            FromAddress = "no-reply@internlink.edu",
            PasswordResetPath = "/reset-password",
            PasswordResetTokenExpiryHours = 24,
            InstitutionName = "Test University"
        });

        return new LoggingEmailService(options, NullLogger<LoggingEmailService>.Instance);
    }

    [Fact]
    public async Task SendInvitationAsync_EmailDisabled_ShouldReportNotSent()
    {
        var service = CreateService();
        var request = new InvitationEmailRequest
        {
            ToEmail = "student@test.com",
            FullName = "Student 1",
            Role = InvitationRole.Student,
            Username = "student1",
            TemporaryPassword = "TempPassword123!"
        };

        var result = await service.SendInvitationAsync(request);

        result.Success.Should().BeFalse();
        result.To.Should().Be("student@test.com");
        result.Message.Should().Contain("logged but not sent");
    }

    [Fact]
    public async Task SendInvitationAsync_EmptyRecipient_ShouldReturnFail()
    {
        var service = CreateService();
        var request = new InvitationEmailRequest
        {
            ToEmail = "",
            FullName = "Student 1",
            Role = InvitationRole.Student,
            Username = "student1",
            TemporaryPassword = "TempPassword123!"
        };

        var result = await service.SendInvitationAsync(request);

        result.Success.Should().BeFalse();
        result.Message.Should().Contain("Recipient email is required");
    }

    [Fact]
    public async Task SendPasswordResetAsync_EmailDisabled_ShouldReportNotSent()
    {
        var service = CreateService();
        var request = new PasswordResetEmailRequest
        {
            ToEmail = "student@test.com",
            FullName = "Student 1",
            Username = "student1",
            NewPassword = "NewPassword123!"
        };

        var result = await service.SendPasswordResetAsync(request);

        result.Success.Should().BeFalse();
        result.Message.Should().Contain("logged but not sent");
    }
}
