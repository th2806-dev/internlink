using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace InternLink.Infrastructure.Email;

/// <summary>
/// SMTP email sender using MailKit.
/// </summary>
public sealed class SmtpEmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<SmtpEmailService> _logger;
    private readonly AppDbContext _db;

    public SmtpEmailService(
        IOptions<EmailSettings> options,
        ILogger<SmtpEmailService> logger,
        AppDbContext db)
    {
        _settings = options.Value;
        _logger = logger;
        _db = db;
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

        var runtimeSettings = await LoadRuntimeSettingsAsync(cancellationToken);
        if (!runtimeSettings.Enabled)
            return SendEmailResult.Fail(toEmail, "Email sending is disabled");
        if (string.IsNullOrWhiteSpace(runtimeSettings.SmtpHost))
            return SendEmailResult.Fail(toEmail, "SMTP host is not configured");

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(runtimeSettings.FromName, runtimeSettings.FromAddress));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = subject;

            var builder = new BodyBuilder
            {
                HtmlBody = htmlBody,
                TextBody = plainTextBody ?? string.Empty
            };
            message.Body = builder.ToMessageBody();

            using var client = new SmtpClient();
            var secureSocket = runtimeSettings.UseSsl
                ? SecureSocketOptions.StartTls
                : SecureSocketOptions.None;

            await client.ConnectAsync(runtimeSettings.SmtpHost, runtimeSettings.SmtpPort, secureSocket, cancellationToken);

            if (!string.IsNullOrWhiteSpace(runtimeSettings.Username))
                await client.AuthenticateAsync(runtimeSettings.Username, runtimeSettings.Password ?? string.Empty, cancellationToken);

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

    private async Task<EmailSettings> LoadRuntimeSettingsAsync(CancellationToken cancellationToken)
    {
        var keys = new[]
        {
            "AppName", "AppUrl", "InstitutionName", "SupportEmail", "SupportPhone",
            "EmailEnabled", "SmtpHost", "SmtpPort", "SmtpUseSsl", "SmtpUsername",
            "SmtpPassword", "EmailFromAddress", "EmailFromName", "PasswordResetPath",
            "PasswordResetTokenExpiryHours"
        };
        var rows = await _db.SystemSettings
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(setting => !setting.IsDeleted && keys.Contains(setting.Key))
            .ToDictionaryAsync(setting => setting.Key, setting => setting.Value, cancellationToken);

        var runtime = JsonSerializer.Deserialize<EmailSettings>(
            JsonSerializer.Serialize(new
            {
                Enabled = Value(rows, "EmailEnabled", _settings.Enabled.ToString()) is "True",
                SmtpHost = Value(rows, "SmtpHost", _settings.SmtpHost),
                SmtpPort = int.TryParse(Value(rows, "SmtpPort", _settings.SmtpPort.ToString()), out var port) ? port : _settings.SmtpPort,
                UseSsl = Value(rows, "SmtpUseSsl", _settings.UseSsl.ToString()) is "True",
                Username = Value(rows, "SmtpUsername", _settings.Username),
                Password = Value(rows, "SmtpPassword", _settings.Password),
                FromAddress = Value(rows, "EmailFromAddress", _settings.FromAddress),
                FromName = Value(rows, "EmailFromName", _settings.FromName),
                PortalUrl = Value(rows, "AppUrl", _settings.PortalUrl),
                PasswordResetPath = Value(rows, "PasswordResetPath", _settings.PasswordResetPath),
                PasswordResetTokenExpiryHours = int.TryParse(Value(rows, "PasswordResetTokenExpiryHours", _settings.PasswordResetTokenExpiryHours.ToString()), out var expiry) ? expiry : _settings.PasswordResetTokenExpiryHours,
                InstitutionName = Value(rows, "DepartmentName", _settings.InstitutionName),
                SupportEmail = Value(rows, "SupportEmail", _settings.SupportEmail),
                SupportPhone = Value(rows, "Phone", _settings.SupportPhone),
                AppName = Value(rows, "AppName", _settings.AppName)
            })) ?? _settings;
        return runtime;
    }

    private static string Value(IReadOnlyDictionary<string, string> rows, string key, string? fallback)
    {
        return rows.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value)
            ? value
            : fallback ?? string.Empty;
    }
}
