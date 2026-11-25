using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Infrastructure.Email;

namespace InternLink.Tests.Email;

public class PasswordResetEmailTemplateTests
{
    private static EmailSettings CreateSettings() => new()
    {
        PortalUrl = "https://internlink.demo.edu.vn/",
        InstitutionName = "Trường Đại học Demo",
        SupportEmail = "daotao@demo.edu.vn",
        FromAddress = "noreply@demo.edu.vn",
        FromName = "InternLink",
        AppName = "CampusERP"
    };

    [Fact]
    public void Build_ContainsRequiredFields()
    {
        var request = new PasswordResetEmailRequest
        {
            ToEmail = "user@demo.edu.vn",
            FullName = "Nguyen Van A",
            Username = "2421160052",
            NewPassword = "NewTemp123!"
        };

        var rendered = PasswordResetEmailTemplate.Build(request, CreateSettings());

        rendered.Subject.Should().Contain("Mật khẩu");
        rendered.Subject.Should().Contain("CampusERP");
        rendered.PlainTextBody.Should().Contain("Nguyen Van A");
        rendered.PlainTextBody.Should().Contain("2421160052");
        rendered.PlainTextBody.Should().Contain("NewTemp123!");
        rendered.PlainTextBody.Should().Contain("https://internlink.demo.edu.vn");
        rendered.PlainTextBody.Should().Contain("đổi mật khẩu");
        rendered.HtmlBody.Should().Contain("2421160052");
    }

    [Fact]
    public void Build_HtmlEncodesUserInput()
    {
        var request = new PasswordResetEmailRequest
        {
            ToEmail = "x@demo.edu.vn",
            FullName = "<script>alert(1)</script>",
            Username = "user&name",
            NewPassword = "a<b>"
        };

        var rendered = PasswordResetEmailTemplate.Build(request, CreateSettings());

        rendered.HtmlBody.Should().NotContain("<script>");
        rendered.HtmlBody.Should().Contain("&lt;script&gt;");
        rendered.HtmlBody.Should().Contain("user&amp;name");
    }
}
