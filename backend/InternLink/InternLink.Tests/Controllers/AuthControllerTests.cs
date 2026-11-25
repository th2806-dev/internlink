using FluentAssertions;
using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Infrastructure.Persistence;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using System.Security.Claims;

namespace InternLink.Tests.Controllers;

public class AuthControllerTests
{
    [Fact]
    public async Task Login_WhenCredentialsAreInvalid_ShouldReturnUnauthorized()
    {
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var db = new AppDbContext(dbOptions);
        var authService = new Mock<IAuthService>();
        authService
            .Setup(service => service.LoginAsync(
                It.IsAny<LoginRequest>(),
                It.IsAny<string?>(),
                It.IsAny<string?>()))
            .ThrowsAsync(new UnauthorizedAccessException("Thông tin đăng nhập không chính xác."));
        var controller = new AuthController(authService.Object, db, Mock.Of<ITenantStorageQuotaService>())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        var result = await controller.Login(new LoginRequest
        {
            Username = "student",
            Password = "incorrect"
        });

        var unauthorized = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorized.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        var response = unauthorized.Value.Should().BeOfType<ApiResponse<object>>().Subject;
        response.Error!.Status.Should().Be(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public async Task Sessions_ShouldReturnDeviceAndBrowserFromStoredUserAgent()
    {
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var db = new AppDbContext(dbOptions);
        var userId = Guid.NewGuid();
        db.Users.Add(new User { Id = userId, Username = "admin", PasswordHash = "test-hash" });
        await db.RefreshTokens.AddAsync(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = "refresh-token",
            JwtId = "jwt-id",
            UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/133.0.0.0 Edg/133.0.0.0",
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var controller = new AuthController(Mock.Of<IAuthService>(), db, Mock.Of<ITenantStorageQuotaService>())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(ClaimTypes.NameIdentifier, userId.ToString())
                    ], "test"))
                }
            }
        };

        var result = await controller.Sessions();

        var response = result.Should().BeOfType<OkObjectResult>().Subject.Value
            .Should().BeOfType<ApiResponse<IReadOnlyList<AuthSessionDto>>>().Subject;
        var session = response.Data.Should().ContainSingle().Which;
        session.Device.Should().Be("Windows");
        session.Browser.Should().Be("Microsoft Edge");
    }

    [Fact]
    public async Task Activity_ShouldReturnLoginEventsForCurrentUser()
    {
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var db = new AppDbContext(dbOptions);
        var userId = Guid.NewGuid();
        db.Users.Add(new User { Id = userId, Username = "admin", PasswordHash = "test-hash" });
        db.SysLoginLogs.AddRange(
            new SysLoginLog
            {
                Id = Guid.NewGuid(),
                Username = "admin",
                Status = "SUCCESS",
                IpAddress = "192.0.2.1",
                LoginAt = DateTime.UtcNow
            },
            new SysLoginLog
            {
                Id = Guid.NewGuid(),
                Username = "another-user",
                Status = "FAILED",
                IpAddress = "192.0.2.2",
                LoginAt = DateTime.UtcNow
            });
        await db.SaveChangesAsync();

        var controller = new AuthController(Mock.Of<IAuthService>(), db, Mock.Of<ITenantStorageQuotaService>())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(ClaimTypes.NameIdentifier, userId.ToString())
                    ], "test"))
                }
            }
        };

        var result = await controller.Activity();

        var response = result.Should().BeOfType<OkObjectResult>().Subject.Value
            .Should().BeOfType<ApiResponse<IReadOnlyList<AuthActivityDto>>>().Subject;
        var activity = response.Data.Should().ContainSingle().Which;
        activity.Action.Should().Be("Đăng nhập thành công");
        activity.Ip.Should().Be("192.0.2.1");
    }
}
