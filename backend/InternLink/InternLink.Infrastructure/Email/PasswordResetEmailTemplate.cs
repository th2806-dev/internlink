using System.Net;
using InternLink.Application.DTOs;

namespace InternLink.Infrastructure.Email;

/// <summary>
/// Builds password reset email for educational environment (Vietnamese).
/// </summary>
public static class PasswordResetEmailTemplate
{
    public sealed record RenderedEmail(string Subject, string HtmlBody, string PlainTextBody);

    public static RenderedEmail Build(PasswordResetEmailRequest request, EmailSettings settings)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(settings);

        var greeting = $"Kính gửi {request.FullName},";
        var subject = $"[{settings.AppName}] Mật khẩu tài khoản đã được đặt lại";
        var portalUrl = settings.PortalUrl.TrimEnd('/');

        var plain = $"""
            {greeting}

            Ban Quản lý Thực tập {settings.InstitutionName} thông báo mật khẩu tài khoản {settings.AppName} của bạn đã được đặt lại.

            Thông tin đăng nhập:
            - Địa chỉ hệ thống: {portalUrl}
            - Tên đăng nhập: {request.Username}
            - Mật khẩu mới: {request.NewPassword}

            Vui lòng đăng nhập và đổi mật khẩu ngay để bảo mật tài khoản.

            Nếu bạn không yêu cầu thay đổi này, vui lòng liên hệ ngay qua email {settings.SupportEmail}.

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
                thông báo mật khẩu tài khoản {WebUtility.HtmlEncode(settings.AppName)} của bạn đã được đặt lại.
              </p>
              <p><strong>Thông tin đăng nhập:</strong></p>
              <ul>
                <li>Địa chỉ hệ thống: <a href="{WebUtility.HtmlEncode(portalUrl)}">{WebUtility.HtmlEncode(portalUrl)}</a></li>
                <li>Tên đăng nhập: <code>{WebUtility.HtmlEncode(request.Username)}</code></li>
                <li>Mật khẩu mới: <code>{WebUtility.HtmlEncode(request.NewPassword)}</code></li>
              </ul>
              <p>Vui lòng đăng nhập và <strong>đổi mật khẩu ngay</strong> để bảo mật tài khoản.</p>
              <p>
                Nếu bạn không yêu cầu thay đổi này, vui lòng liên hệ ngay qua email
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
