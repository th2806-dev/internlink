using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace InternLink.Tests.Services;

public class UserManagementServiceTests
{
    private static AppDbContext GetDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static UserManagementService CreateService(AppDbContext db, IEmailService? email = null)
    {
        return new UserManagementService(
            db,
            new PasswordHasher<User>(),
            email ?? Mock.Of<IEmailService>(),
            NullLogger<UserManagementService>.Instance);
    }

    [Fact]
    public async Task CreateUserAsync_WithEmail_ShouldSendInvitationAndSetMustChangePassword()
    {
        var db = GetDb();
        await db.Students.AddAsync(new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "SV100",
            FullName = "Test Student",
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var email = new Mock<IEmailService>();
        email.Setup(e => e.SendInvitationAsync(It.IsAny<InvitationEmailRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(SendEmailResult.Ok("new.sv@uni.edu.vn"));

        var service = CreateService(db, email.Object);
        var user = await service.CreateUserAsync(new CreateUserRequest
        {
            Username = "new.sv",
            FullName = "Test Student",
            Email = "new.sv@uni.edu.vn",
            Role = "Student",
            StudentCode = "SV100"
        });

        user.Username.Should().Be("new.sv");
        user.MustChangePassword.Should().BeTrue();
        user.LinkedStudentCode.Should().Be("SV100");

        email.Verify(e => e.SendInvitationAsync(
            It.Is<InvitationEmailRequest>(r =>
                r.ToEmail == "new.sv@uni.edu.vn" &&
                r.Username == "new.sv" &&
                !string.IsNullOrEmpty(r.TemporaryPassword)),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateUserAsync_DuplicateUsername_ShouldThrow()
    {
        var db = GetDb();
        await db.Users.AddAsync(new User
        {
            Id = Guid.NewGuid(),
            Username = "taken",
            PasswordHash = "hash",
            Role = Role.Student,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var act = () => service.CreateUserAsync(new CreateUserRequest
        {
            Username = "taken",
            FullName = "Duplicate",
            Role = "Student"
        });

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task CreateUserAsync_DepartmentAdmin_ShouldNotBeAbleToCreateAnotherDepartmentAdmin()
    {
        var db = GetDb();
        var deptId = Guid.NewGuid();

        var service = CreateService(db);
        var act = () => service.CreateUserAsync(new CreateUserRequest
        {
            Username = "dept.admin.2",
            FullName = "Department Admin 2",
            Role = "DepartmentAdmin"
        }, creatorDepartmentId: deptId);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*DepartmentAdmin*SuperAdmin*");
    }

    [Fact]
    public async Task ResetPasswordAsync_ShouldSetMustChangePasswordAndSendEmail()
    {
        var db = GetDb();
        var hasher = new PasswordHasher<User>();
        var entity = new User
        {
            Id = Guid.NewGuid(),
            Username = "reset.me",
            FullName = "Reset User",
            Email = "reset@uni.edu.vn",
            PasswordHash = hasher.HashPassword(null!, "OldPass123!"),
            Role = Role.Lecturer,
            MustChangePassword = false,
            CreatedAt = DateTime.UtcNow
        };
        await db.Users.AddAsync(entity);
        await db.SaveChangesAsync();

        var email = new Mock<IEmailService>();
        email.Setup(e => e.SendPasswordResetAsync(It.IsAny<PasswordResetEmailRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(SendEmailResult.Ok("reset@uni.edu.vn"));

        var service = CreateService(db, email.Object);
        var result = await service.ResetPasswordAsync(entity.Id);

        result.Should().NotBeNull();
        result!.EmailSent.Should().BeTrue();
        result.Username.Should().Be("reset.me");

        var updated = await db.Users.FindAsync(entity.Id);
        updated!.MustChangePassword.Should().BeTrue();

        email.Verify(e => e.SendPasswordResetAsync(
            It.Is<PasswordResetEmailRequest>(r =>
                r.Username == "reset.me" &&
                !string.IsNullOrEmpty(r.NewPassword)),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteUserAsync_ShouldSoftDeleteAndDeactivate()
    {
        var db = GetDb();
        var entity = new User
        {
            Id = Guid.NewGuid(),
            Username = "inactive.user",
            PasswordHash = "hash",
            Role = Role.Student,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await db.Users.AddAsync(entity);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var ok = await service.DeleteUserAsync(entity.Id);

        ok.Should().BeTrue();
        var updated = await db.Users.FindAsync(entity.Id);
        updated!.IsDeleted.Should().BeTrue();
        updated.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteUserAsync_SuperAdmin_ShouldThrow()
    {
        var db = GetDb();
        var entity = new User
        {
            Id = Guid.NewGuid(),
            Username = "superadmin",
            PasswordHash = "hash",
            Role = Role.SuperAdmin,
            CreatedAt = DateTime.UtcNow
        };
        await db.Users.AddAsync(entity);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var act = () => service.DeleteUserAsync(entity.Id);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*SuperAdmin*");
    }

    [Fact]
    public async Task GetUsersAsync_ShouldFilterByRoleAndActive()
    {
        var db = GetDb();
        await db.Users.AddRangeAsync(
            new User { Id = Guid.NewGuid(), Username = "s1", PasswordHash = "h", Role = Role.Student, IsActive = true, CreatedAt = DateTime.UtcNow },
            new User { Id = Guid.NewGuid(), Username = "l1", PasswordHash = "h", Role = Role.Lecturer, IsActive = true, CreatedAt = DateTime.UtcNow },
            new User { Id = Guid.NewGuid(), Username = "s2", PasswordHash = "h", Role = Role.Student, IsActive = false, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.GetUsersAsync(new UserFilterRequest
        {
            Role = "Student",
            IsActive = true,
            Skip = 0,
            Take = 10
        });

        result.Total.Should().Be(1);
        result.Items.Should().ContainSingle(u => u.Username == "s1");
    }
}
