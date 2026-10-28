using System.Security.Claims;
using FluentAssertions;
using InternLink.API.Middleware;
using InternLink.Application.Interfaces;
using InternLink.Domain.Enums;
using Microsoft.AspNetCore.Http;
using Moq;

namespace InternLink.Tests.Middleware;

public sealed class StudentArchiveReadOnlyMiddlewareTests
{
    [Theory]
    [InlineData("/api/Auth/refresh-token")]
    [InlineData("/api/Auth/logout")]
    public async Task InvokeAsync_AuthExemptPostRequests_ContinueWithoutArchiveCheck(string path)
    {
        var studentService = new Mock<IStudentService>();
        var nextCalled = false;
        var middleware = new StudentArchiveReadOnlyMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        });
        var context = CreateStudentContext(HttpMethods.Post, path);

        await middleware.InvokeAsync(context, studentService.Object);

        nextCalled.Should().BeTrue();
        context.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
        studentService.Verify(service => service.IsArchiveReadOnlyAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task InvokeAsync_ArchiveReadOnlyStudentPostRequest_ReturnsForbidden()
    {
        var studentService = new Mock<IStudentService>();
        studentService.Setup(service => service.IsArchiveReadOnlyAsync(It.IsAny<Guid>()))
            .ReturnsAsync(true);
        var nextCalled = false;
        var middleware = new StudentArchiveReadOnlyMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        });
        var context = CreateStudentContext(HttpMethods.Post, "/api/WeeklyReport");

        await middleware.InvokeAsync(context, studentService.Object);

        nextCalled.Should().BeFalse();
        context.Response.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        studentService.Verify(service => service.IsArchiveReadOnlyAsync(It.IsAny<Guid>()), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_StudentGetRequest_ContinuesWithoutArchiveCheck()
    {
        var studentService = new Mock<IStudentService>();
        var nextCalled = false;
        var middleware = new StudentArchiveReadOnlyMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        });
        var context = CreateStudentContext(HttpMethods.Get, "/api/Evaluation");

        await middleware.InvokeAsync(context, studentService.Object);

        nextCalled.Should().BeTrue();
        context.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
        studentService.Verify(service => service.IsArchiveReadOnlyAsync(It.IsAny<Guid>()), Times.Never);
    }

    private static DefaultHttpContext CreateStudentContext(string method, string path)
    {
        var userId = Guid.NewGuid();
        var context = new DefaultHttpContext();
        context.Request.Method = method;
        context.Request.Path = path;
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, Role.Student.ToString()),
        ], "test"));
        return context;
    }
}
