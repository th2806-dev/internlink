using System.Text.Json;
using FluentAssertions;
using InternLink.Application.DTOs;

namespace InternLink.Tests.Email;

public class TestEmailRequestSerializationTests
{
    [Theory]
    [InlineData("Student", InvitationRole.Student)]
    [InlineData("Lecturer", InvitationRole.Lecturer)]
    public void Deserialize_AcceptsStringRoleFromFrontend(string role, InvitationRole expectedRole)
    {
        var request = JsonSerializer.Deserialize<TestEmailRequest>(
            $$"""{"ToEmail":"test@example.com","Role":"{{role}}"}""");

        request.Should().NotBeNull();
        request!.Role.Should().Be(expectedRole);
    }
}
