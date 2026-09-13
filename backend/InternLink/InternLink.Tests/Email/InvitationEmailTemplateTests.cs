using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Infrastructure.Email;

namespace InternLink.Tests.Email;

public class InvitationEmailTemplateTests
{
    private static EmailSettings CreateSettings() => new()
    {
        PortalUrl = "https://internlink.demo.edu.vn/",
        InstitutionName = "Trường Đại học Demo",
        SupportEmail = "daotao@demo.edu.vn",
        SupportPhone = "0123 456 789",
        FromAddress = "noreply@demo.edu.vn",
        FromName = "InternLink"
    };

    [Fact]
    public void Build_StudentInvitation_ContainsRequiredFields()
    {
        var request = new InvitationEmailRequest
        {
            ToEmail = "sv@demo.edu.vn",
            FullName = "Nguyen Van A",
            Role = InvitationRole.Student,
            Username = "2421160052",
            TemporaryPassword = "TempPass123!"
        };

        var rendered = InvitationEmailTemplate.Build(request, CreateSettings());

        rendered.Subject.Should().Contain("InternLink");
        rendered.Subject.Should().Contain("thực tập");

        rendered.PlainTextBody.Should().Contain("Nguyen Van A");
        rendered.PlainTextBody.Should().Contain("2421160052");
        rendered.PlainTextBody.Should().Contain("TempPass123!");
        rendered.PlainTextBody.Should().Contain("https://internlink.demo.edu.vn");
        rendered.PlainTextBody.Should().Contain("đổi mật khẩu");
        rendered.PlainTextBody.Should().Contain("daotao@demo.edu.vn");
        rendered.PlainTextBody.Should().Contain("Sinh viên");

        rendered.HtmlBody.Should().Contain("2421160052");
        rendered.HtmlBody.Should().Contain("https://internlink.demo.edu.vn");
        rendered.HtmlBody.Should().Contain("TempPass123!");
    }

    [Fact]
    public void Build_LecturerInvitation_UsesLecturerWording()
    {
        var request = new InvitationEmailRequest
        {
            ToEmail = "gv@demo.edu.vn",
            FullName = "Tran Thi B",
            Role = InvitationRole.Lecturer,
            Username = "lecturer.b",
            TemporaryPassword = "Welcome@2026"
        };

        var rendered = InvitationEmailTemplate.Build(request, CreateSettings());

        rendered.Subject.Should().Contain("hướng dẫn thực tập");
        rendered.PlainTextBody.Should().Contain("Giảng viên");
        rendered.PlainTextBody.Should().Contain("lecturer.b");
        rendered.PlainTextBody.Should().Contain("Welcome@2026");
        rendered.PlainTextBody.Should().Contain("sinh viên được phân công");
        rendered.HtmlBody.Should().Contain("Tran Thi B");
    }

    [Fact]
    public void Build_DepartmentAdminInvitation_UsesDepartmentAdminWording()
    {
        var request = new InvitationEmailRequest
        {
            ToEmail = "admin.cntt@demo.edu.vn",
            FullName = "Le Thi C",
            Role = InvitationRole.DepartmentAdmin,
            Username = "admin.cntt",
            TemporaryPassword = "Welcome@2026"
        };

        var rendered = InvitationEmailTemplate.Build(request, CreateSettings());

        rendered.Subject.Should().Contain("Admin khoa");
        rendered.PlainTextBody.Should().Contain("Admin khoa");
        rendered.PlainTextBody.Should().Contain("Quản lý thông tin khoa");
        rendered.PlainTextBody.Should().NotContain("Sinh viên thực tập");
        rendered.HtmlBody.Should().Contain("Admin khoa");
    }

    [Fact]
    public void Build_HtmlEncodesUserInput()
    {
        var request = new InvitationEmailRequest
        {
            ToEmail = "x@demo.edu.vn",
            FullName = "<script>alert(1)</script>",
            Role = InvitationRole.Student,
            Username = "user&name",
            TemporaryPassword = "a<b>"
        };

        var rendered = InvitationEmailTemplate.Build(request, CreateSettings());

        rendered.HtmlBody.Should().NotContain("<script>");
        rendered.HtmlBody.Should().Contain("&lt;script&gt;");
        rendered.HtmlBody.Should().Contain("user&amp;name");
    }
}
