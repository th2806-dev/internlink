using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace InternLink.Infrastructure.Email;

/// <summary>
/// Dev/stub email sender: writes message content to logs instead of SMTP.
/// </summary>
public sealed class LoggingEmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<LoggingEmailService> _logger;

    public LoggingEmailService(IOptions<EmailSettings> options, ILogger<LoggingEmailService> logger)
    {
        _settings = options.Value;
        _logger = logger;
    }

    public async Task<SendEmailResult> SendInvitationAsync(InvitationEmailRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ToEmail))
            return SendEmailResult.Fail(request.ToEmail ?? string.Empty, "Recipient email is required");

        var rendered = InvitationEmailTemplate.Build(request, _settings);
        return await SendAsync(request.ToEmail, rendered.Subject, rendered.HtmlBody, rendered.PlainTextBody, cancellationToken);
    }

    public async Task<SendEmailResult> SendPasswordResetAsync(PasswordResetEmailRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ToEmail))
            return SendEmailResult.Fail(request.ToEmail ?? string.Empty, "Recipient email is required");

        var rendered = PasswordResetEmailTemplate.Build(request, _settings);
        return await SendAsync(request.ToEmail, rendered.Subject, rendered.HtmlBody, rendered.PlainTextBody, cancellationToken);
    }

    public async Task<SendEmailResult> SendForgotPasswordAsync(ForgotPasswordEmailRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ToEmail))
            return SendEmailResult.Fail(request.ToEmail ?? string.Empty, "Recipient email is required");

        var rendered = ForgotPasswordEmailTemplate.Build(request, _settings);
        return await SendAsync(request.ToEmail, rendered.Subject, rendered.HtmlBody, rendered.PlainTextBody, cancellationToken);
    }

    public Task<SendEmailResult> SendAsync(
        string toEmail,
        string subject,
        string htmlBody,
        string? plainTextBody = null,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(toEmail))
            return Task.FromResult(SendEmailResult.Fail(toEmail ?? string.Empty, "Recipient email is required"));

        _logger.LogInformation(
            "Email (LoggingEmailService) To={To} Subject={Subject} From={From} PortalUrl={PortalUrl}\n--- Plain text ---\n{Plain}\n--- HTML ---\n{Html}",
            toEmail,
            subject,
            $"{_settings.FromName} <{_settings.FromAddress}>",
            _settings.PortalUrl,
            plainTextBody ?? "(none)",
            htmlBody);

        return Task.FromResult(SendEmailResult.Fail(
            toEmail,
            "Email delivery is disabled; the message was logged but not sent."));
    }
}
