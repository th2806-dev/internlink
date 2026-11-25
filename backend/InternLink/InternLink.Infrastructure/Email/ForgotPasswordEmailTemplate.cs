using System.Net;
using InternLink.Application.DTOs;

namespace InternLink.Infrastructure.Email;

/// <summary>
/// Builds forgot-password email with a secure reset link (Vietnamese).
/// </summary>
public static class ForgotPasswordEmailTemplate
{
    public sealed record RenderedEmail(string Subject, string HtmlBody, string PlainTextBody);

    public static RenderedEmail Build(ForgotPasswordEmailRequest request, EmailSettings settings)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(settings);

        var greeting = $"Kính gửi {request.FullName},";
        var subject = $"[{settings.AppName}] Yêu cầu đặt lại mật khẩu";
        var expiryHours = settings.PasswordResetTokenExpiryHours;

        var plain = $"""
            {greeting}

            Ban Quản lý Thực tập {settings.InstitutionName} nhận được yêu cầu đặt lại mật khẩu tài khoản {settings.AppName} của bạn.

            Nhấn vào liên kết sau để đặt mật khẩu mới (hiệu lực {expiryHours} giờ):
            {request.ResetLink}

            Nếu bạn không yêu cầu thay đổi này, vui lòng bỏ qua email này hoặc liên hệ {settings.SupportEmail}.

            Trân trọng,
            Ban Quản lý Thực tập
            {settings.InstitutionName}
            """;

        var html = $"""
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="utf-8" /></head>
            <body style="font-family: Segoe UI, Arial, sans-serif; color: #222; line-height: 1.55;">
              <p>{WebUtility.HtmlEncode(greeting)}</p>
              <p>
                Ban Quản lý Thực tập <strong>{WebUtility.HtmlEncode(settings.InstitutionName)}</strong>
                nhận được yêu cầu đặt lại mật khẩu tài khoản {WebUtility.HtmlEncode(settings.AppName)} của bạn.
              </p>
              <p>
                <a href="{WebUtility.HtmlEncode(request.ResetLink)}">Nhấn vào đây để đặt mật khẩu mới</a>
                (hiệu lực {expiryHours} giờ).
              </p>
              <p style="word-break: break-all; font-size: 0.9em; color: #555;">
                {WebUtility.HtmlEncode(request.ResetLink)}
              </p>
              <p>
                Nếu bạn không yêu cầu thay đổi này, vui lòng bỏ qua email này hoặc liên hệ
                <a href="mailto:{WebUtility.HtmlEncode(settings.SupportEmail)}">{WebUtility.HtmlEncode(settings.SupportEmail)}</a>.
              </p>
              <p>
                Trân trọng,<br/>
                Ban Quản lý Thực tập<br/>
                {WebUtility.HtmlEncode(settings.InstitutionName)}
              </p>
            </body>
            </html>
            """;

        return new RenderedEmail(subject, html, plain.Trim());
    }
}
