using System.Net;
using InternLink.Application.DTOs;

namespace InternLink.Infrastructure.Email;

/// <summary>
/// Builds invitation email subject/body for educational use (Vietnamese).
/// </summary>
public static class InvitationEmailTemplate
{
    public sealed record RenderedEmail(string Subject, string HtmlBody, string PlainTextBody);

    public static RenderedEmail Build(InvitationEmailRequest request, EmailSettings settings)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(settings);

        var isLecturer = request.Role == InvitationRole.Lecturer;
        var isDepartmentAdmin = request.Role == InvitationRole.DepartmentAdmin;

        var roleLabel = request.Role switch
        {
            InvitationRole.Lecturer => "Giảng viên hướng dẫn",
            InvitationRole.DepartmentAdmin => "Admin khoa",
            _ => "Sinh viên thực tập"
        };

        var greeting = request.Role switch
        {
            InvitationRole.Lecturer => $"Kính gửi Giảng viên {request.FullName},",
            InvitationRole.DepartmentAdmin => $"Kính gửi Admin khoa {request.FullName},",
            _ => $"Kính gửi Sinh viên {request.FullName},"
        };

        var subject = request.Role switch
        {
            InvitationRole.Lecturer => "[InternLink] Thư mời tham gia hệ thống hướng dẫn thực tập",
            InvitationRole.DepartmentAdmin => "[InternLink] Thư mời tham gia hệ thống với vai trò Admin khoa",
            _ => "[InternLink] Thư mời tham gia hệ thống quản lý thực tập"
        };

        var capabilities = request.Role switch
        {
            InvitationRole.Lecturer => """
              Sau khi đăng nhập, Anh/Chị có thể:
              - Theo dõi sinh viên được phân công hướng dẫn
              - Nhận xét, duyệt báo cáo và chấm điểm
              - Xuất báo cáo tổng kết cuối kỳ
              """,
            InvitationRole.DepartmentAdmin => """
              Sau khi đăng nhập, Anh/Chị có thể:
              - Quản lý thông tin khoa, sinh viên và giảng viên thuộc đơn vị
              - Theo dõi tiến độ thực tập và báo cáo theo kỳ
              - Duyệt, kiểm tra và xuất dữ liệu phục vụ quản lý khoa
              """,
            _ => """
              Sau khi đăng nhập, bạn có thể:
              - Xem tài liệu và biểu mẫu hướng dẫn thực tập
              - Nộp báo cáo tuần và sản phẩm cuối kỳ
              - Theo dõi phản hồi từ giảng viên hướng dẫn
              """
        };

        var supportPhoneLine = string.IsNullOrWhiteSpace(settings.SupportPhone)
            ? string.Empty
            : $" hoặc số điện thoại {settings.SupportPhone}";

        var portalUrl = settings.PortalUrl.TrimEnd('/');
        var institution = settings.InstitutionName;
        var supportEmail = settings.SupportEmail;

        var plain = $"""
            {greeting}

            {institution} trân trọng mời bạn tham gia Hệ thống Quản lý Thực tập InternLink
            với vai trò {roleLabel}.

            Thông tin đăng nhập:
            - Địa chỉ hệ thống: {portalUrl}
            - Tên đăng nhập: {request.Username}
            - Mật khẩu tạm thời: {request.TemporaryPassword}

            Vui lòng đăng nhập và đổi mật khẩu ngay sau lần đăng nhập đầu tiên để bảo mật tài khoản.

            {capabilities.Trim()}

            Nếu gặp khó khăn, vui lòng liên hệ qua email {supportEmail}{supportPhoneLine}.

            Trân trọng,
            Ban Quản lý Thực tập
            {institution}
            """;

        var html = $"""
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="utf-8" /></head>
            <body style="font-family: Segoe UI, Arial, sans-serif; color: #222; line-height: 1.55;">
              <p>{WebUtility.HtmlEncode(greeting)}</p>
              <p>
                <strong>{WebUtility.HtmlEncode(institution)}</strong> trân trọng mời bạn tham gia
                <strong>Hệ thống Quản lý Thực tập InternLink</strong>
                với vai trò <strong>{WebUtility.HtmlEncode(roleLabel)}</strong>.
              </p>
              <p><strong>Thông tin đăng nhập:</strong></p>
              <ul>
                <li>Địa chỉ hệ thống: <a href="{WebUtility.HtmlEncode(portalUrl)}">{WebUtility.HtmlEncode(portalUrl)}</a></li>
                <li>Tên đăng nhập: <code>{WebUtility.HtmlEncode(request.Username)}</code></li>
                <li>Mật khẩu tạm thời: <code>{WebUtility.HtmlEncode(request.TemporaryPassword)}</code></li>
              </ul>
              <p>
                Vui lòng đăng nhập và <strong>đổi mật khẩu ngay sau lần đăng nhập đầu tiên</strong>
                để bảo mật tài khoản.
              </p>
              <p>{FormatCapabilitiesHtml(capabilities)}</p>
              <p>
                Nếu gặp khó khăn, vui lòng liên hệ qua email
                <a href="mailto:{WebUtility.HtmlEncode(supportEmail)}">{WebUtility.HtmlEncode(supportEmail)}</a>{WebUtility.HtmlEncode(supportPhoneLine)}.
              </p>
              <p>
                Trân trọng,<br/>
                Ban Quản lý Thực tập<br/>
                {WebUtility.HtmlEncode(institution)}
              </p>
            </body>
            </html>
            """;

        return new RenderedEmail(subject, html, plain.Trim());
    }

    private static string FormatCapabilitiesHtml(string capabilities)
    {
        var lines = capabilities
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(l => l.StartsWith('-'))
            .Select(l => $"<li>{WebUtility.HtmlEncode(l.TrimStart('-', ' '))}</li>");

        var intro = capabilities.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault(l => !l.StartsWith('-')) ?? string.Empty;

        return $"{WebUtility.HtmlEncode(intro)}<ul>{string.Join(string.Empty, lines)}</ul>";
    }
}
