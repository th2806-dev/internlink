using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace InternLink.Infrastructure.Email;

/// <summary>
/// SMTP email sender using MailKit.
/// </summary>
public sealed class SmtpEmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IOptions<EmailSettings> options, ILogger<SmtpEmailService> logger)
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

    public async Task<SendEmailResult> SendAsync(
        string toEmail,
        string subject,
        string htmlBody,
        string? plainTextBody = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(toEmail))
            return SendEmailResult.Fail(toEmail ?? string.Empty, "Recipient email is required");

        if (string.IsNullOrWhiteSpace(_settings.SmtpHost))
            return SendEmailResult.Fail(toEmail, "SMTP host is not configured");

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_settings.FromName, _settings.FromAddress));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = subject;

            var builder = new BodyBuilder
            {
                HtmlBody = htmlBody,
                TextBody = plainTextBody ?? string.Empty
            };
            message.Body = builder.ToMessageBody();

            using var client = new SmtpClient();
            var secureSocket = _settings.UseSsl
                ? SecureSocketOptions.StartTls
                : SecureSocketOptions.None;

            await client.ConnectAsync(_settings.SmtpHost, _settings.SmtpPort, secureSocket, cancellationToken);

            if (!string.IsNullOrWhiteSpace(_settings.Username))
                await client.AuthenticateAsync(_settings.Username, _settings.Password ?? string.Empty, cancellationToken);

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);

            _logger.LogInformation("Email sent to {To} with subject {Subject}", toEmail, subject);
            return SendEmailResult.Ok(toEmail, "Email sent via SMTP");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", toEmail);
            return SendEmailResult.Fail(toEmail, $"Failed to send email: {ex.Message}");
        }
    }
}
