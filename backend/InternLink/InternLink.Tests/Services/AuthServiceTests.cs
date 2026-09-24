using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Application.Mappings;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Email;
using InternLink.Infrastructure.Identity;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using InternLink.Shared.Interfaces;
using InternLink.Shared.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using AutoMapper;
using Moq;
using InternLink.API.Controllers;

namespace InternLink.Tests.Services;

public class AuthServiceTests
{
    private readonly IMapper _mapper;

    public AuthServiceTests()
    {
        _mapper = new MapperConfiguration(cfg => cfg.AddProfile<AuthProfile>()).CreateMapper();
    }

    private static AppDbContext GetDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private AuthService CreateService(AppDbContext db, IEmailService? email = null)
    {
        var jwt = new Mock<IJwtService>();
        jwt.Setup(j => j.CreateToken(It.IsAny<string>(), It.IsAny<IEnumerable<string>>()))
            .Returns("test-jwt");

        var emailSettings = Options.Create(new EmailSettings
        {
            PortalUrl = "http://localhost:5173",
            PasswordResetPath = "/reset-password",
            PasswordResetTokenExpiryHours = 24,
            InstitutionName = "Demo"
        });

        return new AuthService(
            db,
            jwt.Object,
            _mapper,
            new PasswordHasher<User>(),
            email ?? Mock.Of<IEmailService>(),
            emailSettings,
            NullLogger<AuthService>.Instance,
            Options.Create(new JwtSettings { ExpiresInMinutes = 60 }));
    }

    [Fact]
    public async Task ForgotPasswordAsync_WithValidEmail_ShouldCreateTokenAndSendEmail()
    {
        var db = GetDb();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "student1",
            Email = "student1@internlink.test",
            FullName = "Student An",
            PasswordHash = "hash",
            Role = Role.Student,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await db.Users.AddAsync(user);
        await db.SaveChangesAsync();

        var email = new Mock<IEmailService>();
        email.Setup(e => e.SendForgotPasswordAsync(It.IsAny<ForgotPasswordEmailRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(SendEmailResult.Ok("student1@internlink.test"));

        var service = CreateService(db, email.Object);
        await service.ForgotPasswordAsync("student1@internlink.test");

        var tokens = await db.PasswordResetTokens.Where(t => t.UserId == user.Id).ToListAsync();
        tokens.Should().ContainSingle();
        tokens[0].UsedAt.Should().BeNull();
        tokens[0].ExpiresAt.Should().BeAfter(DateTime.UtcNow);

        email.Verify(e => e.SendForgotPasswordAsync(
            It.Is<ForgotPasswordEmailRequest>(r =>
                r.ToEmail == "student1@internlink.test" &&
                r.ResetLink.Contains("token=")),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ForgotPasswordAsync_UnknownEmail_ShouldNotThrowOrSendEmail()
    {
        var db = GetDb();
        var email = new Mock<IEmailService>();
        var service = CreateService(db, email.Object);

        await service.Invoking(s => s.ForgotPasswordAsync("unknown@test.com"))
            .Should().NotThrowAsync();

        email.Verify(e => e.SendForgotPasswordAsync(It.IsAny<ForgotPasswordEmailRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ResetPasswordAsync_WithValidToken_ShouldUpdatePassword()
    {
        var db = GetDb();
        var hasher = new PasswordHasher<User>();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "reset.user",
            Email = "reset@test.com",
            PasswordHash = hasher.HashPassword(null!, "OldPass123!"),
            Role = Role.Student,
            MustChangePassword = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await db.Users.AddAsync(user);

        var rawToken = ResetTokenGenerator.GenerateToken();
        await db.PasswordResetTokens.AddAsync(new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = ResetTokenGenerator.HashToken(rawToken),
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        await service.ResetPasswordAsync(rawToken, "NewPass456!");

        var updated = await db.Users.FindAsync(user.Id);
        updated!.MustChangePassword.Should().BeFalse();

        var verification = hasher.VerifyHashedPassword(updated, updated.PasswordHash, "NewPass456!");
        verification.Should().NotBe(PasswordVerificationResult.Failed);

        var usedToken = await db.PasswordResetTokens.FirstAsync();
        usedToken.UsedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task ResetPasswordAsync_WithExpiredToken_ShouldThrow()
    {
        var db = GetDb();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "expired",
            PasswordHash = "hash",
            Role = Role.Student,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await db.Users.AddAsync(user);

        var rawToken = ResetTokenGenerator.GenerateToken();
        await db.PasswordResetTokens.AddAsync(new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = ResetTokenGenerator.HashToken(rawToken),
            ExpiresAt = DateTime.UtcNow.AddHours(-1),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var act = () => service.ResetPasswordAsync(rawToken, "NewPass456!");

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public void AdminSemestersController_ShouldRequireDepartmentAdminPolicyAtControllerLevel()
    {
        var attributes = typeof(AdminSemestersController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .ToList();

        attributes.Should().ContainSingle(attr => attr.Policy == AdminPolicies.DepartmentAdmin);
    }

    [Fact]
    public void SuperAdminSemestersController_ShouldRequireSuperAdminPolicyAtControllerLevel()
    {
        var attributes = typeof(SuperAdminSemestersController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .ToList();

        attributes.Should().ContainSingle(attr => attr.Policy == AdminPolicies.SuperAdmin);
    }

    [Fact]
    public void LecturerProfileController_ShouldUseLecturerOrAdminPolicyForReadAccessAndAdminPolicyForMutations()
    {
        var controllerAttributes = typeof(LecturerProfileController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .ToList();

        controllerAttributes.Should().Contain(attr => attr.Policy == "RequireLecturerOrAdmin");

        var createAttr = typeof(LecturerProfileController)
            .GetMethod(nameof(LecturerProfileController.Create))!
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .Single();

        createAttr.Policy.Should().Be("RequireDepartmentAdmin");
    }

    [Fact]
    public void AdminDepartmentsController_ShouldRequireSuperAdminForMutatingEndpoints()
    {
        var createAttr = typeof(AdminDepartmentsController)
            .GetMethod(nameof(AdminDepartmentsController.Create))!
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .Single();

        createAttr.Policy.Should().Be("RequireSuperAdmin");

        var updateAttr = typeof(AdminDepartmentsController)
            .GetMethod(nameof(AdminDepartmentsController.Update))!
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .Single();

        updateAttr.Policy.Should().Be("RequireSuperAdmin");

        var deleteAttr = typeof(AdminDepartmentsController)
            .GetMethod(nameof(AdminDepartmentsController.Delete))!
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .Single();

        deleteAttr.Policy.Should().Be("RequireSuperAdmin");
    }

    [Fact]
    public void AdminUsersController_ShouldRequireDepartmentAdminPolicyAtControllerLevel()
    {
        var attributes = typeof(AdminUsersController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .ToList();

        attributes.Should().ContainSingle(attr => attr.Policy == AdminPolicies.DepartmentAdmin);
    }

    [Fact]
    public void DepartmentNotificationsController_ShouldRequireDepartmentAdminAtControllerLevel()
    {
        var attributes = typeof(AdminNotificationsController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .ToList();

        attributes.Should().ContainSingle(attr => attr.Policy == AdminPolicies.DepartmentAdmin);
    }

    [Fact]
    public void LecturerOverview_ShouldRequireDepartmentAdminPolicy()
    {
        var overviewAttr = typeof(LecturerProfileController)
            .GetMethod(nameof(LecturerProfileController.GetOverview))!
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .Single();

        overviewAttr.Policy.Should().Be(AdminPolicies.DepartmentAdmin);
    }

    [Fact]
    public void AdminSettingsController_ShouldRequireSuperAdminPolicyAtControllerLevel()
    {
        var attributes = typeof(AdminSettingsController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .ToList();

        attributes.Should().ContainSingle(attr => attr.Policy == "RequireSuperAdmin");
    }

    [Fact]
    public void AdminAccountRequestsController_ShouldRequireSuperAdminPolicyAtControllerLevel()
    {
        var attributes = typeof(AdminAccountRequestsController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .ToList();

        attributes.Should().ContainSingle(attr => attr.Policy == "RequireSuperAdmin");
    }

    [Fact]
    public void PlatformControllers_ShouldRequireSuperAdminAtControllerLevel()
    {
        foreach (var controllerType in new[]
        {
            typeof(AdminDepartmentsController),
            typeof(AdminSettingsController),
            typeof(AdminAccountRequestsController),
            typeof(SuperAdminUsersController),
        })
        {
            var attributes = controllerType
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .ToList();

            attributes.Should().ContainSingle(attr => attr.Policy == AdminPolicies.SuperAdmin);
        }
    }

    [Fact]
    public void DepartmentAdminDepartmentsController_ShouldRequireDepartmentAdminPolicy()
    {
        var attributes = typeof(DepartmentAdminDepartmentsController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .ToList();

        attributes.Should().ContainSingle(attr => attr.Policy == AdminPolicies.DepartmentAdmin);
    }

    [Fact]
    public void DashboardAndEmailControllers_ShouldUseSeparateAdminPolicies()
    {
        var departmentDashboard = typeof(AdminController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .ToList();
        departmentDashboard.Should().ContainSingle(attr => attr.Policy == AdminPolicies.DepartmentAdmin);

        var superAdminDashboard = typeof(SuperAdminDashboardController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .ToList();
        superAdminDashboard.Should().ContainSingle(attr => attr.Policy == AdminPolicies.SuperAdmin);

        var email = typeof(SuperAdminEmailController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .ToList();
        email.Should().ContainSingle(attr => attr.Policy == AdminPolicies.SuperAdmin);
    }

    [Fact]
    public void LecturerOperationalWriteEndpoints_ShouldRequireLecturerOrDepartmentAdminPolicy()
    {
        // SuperAdmin must NOT be able to grade students, review weekly reports,
        // update submission status, manage documents or assign companies.
        var protectedActions = new[]
        {
            (typeof(EvaluationController), nameof(EvaluationController.CreateEvaluation)),
            (typeof(EvaluationController), nameof(EvaluationController.UpdateEvaluation)),
            (typeof(EvaluationController), nameof(EvaluationController.FinalizeEvaluation)),
            (typeof(EvaluationController), nameof(EvaluationController.DeleteEvaluation)),
            (typeof(WeeklyReportController), nameof(WeeklyReportController.Review)),
            (typeof(SubmissionController), nameof(SubmissionController.UpdateStatus)),
            (typeof(SubmissionController), nameof(SubmissionController.Delete)),
            (typeof(InternshipGradingController), nameof(InternshipGradingController.SaveGrade)),
            (typeof(InternshipController), nameof(InternshipController.AssignCompany)),
            (typeof(DocumentController), nameof(DocumentController.UploadDocument)),
            (typeof(DocumentController), nameof(DocumentController.UpdateDocument)),
            (typeof(DocumentController), nameof(DocumentController.DeleteDocument)),
            (typeof(SemesterReportScheduleController), nameof(SemesterReportScheduleController.GenerateDefaults)),
            (typeof(SemesterReportScheduleController), nameof(SemesterReportScheduleController.UpdateSchedule)),
            (typeof(LecturerController), nameof(LecturerController.CreateEvaluation)),
            (typeof(LecturerController), nameof(LecturerController.UpdateEvaluation)),
            (typeof(LecturerController), nameof(LecturerController.FinalizeEvaluation)),
            (typeof(LecturerController), nameof(LecturerController.UpdateDefense)),
            (typeof(LecturerController), nameof(LecturerController.ReviewWeeklyReport)),
            (typeof(LecturerController), nameof(LecturerController.AddFeedback)),
            (typeof(LecturerController), nameof(LecturerController.UpdateStudentNotes)),
            (typeof(LecturerController), nameof(LecturerController.NotifyStudents)),
            (typeof(LecturerController), nameof(LecturerController.RemindStudent)),
            (typeof(LecturerController), nameof(LecturerController.SaveSemesterSummary)),
            (typeof(LecturerController), nameof(LecturerController.UploadDocument)),
            (typeof(LecturerController), nameof(LecturerController.GenerateAiComment)),
        };

        foreach (var (controllerType, actionName) in protectedActions)
        {
            var policies = controllerType.GetMethod(actionName)!
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .Select(attribute => attribute.Policy)
                .ToList();

            policies.Should().Contain("RequireLecturerOrDepartmentAdmin",
                $"{controllerType.Name}.{actionName} is a lecturer operational write and must exclude SuperAdmin");
        }
    }

    [Fact]
    public void LecturerOperationalReadEndpoints_ShouldRemainOpenToSuperAdmin()
    {
        // Oversight reads stay on RequireLecturerOrAdmin so SuperAdmin can monitor.
        var readActions = new[]
        {
            (typeof(EvaluationController), nameof(EvaluationController.GetAllEvaluations)),
            (typeof(WeeklyReportController), nameof(WeeklyReportController.GetByInternship)),
            (typeof(InternshipGradingController), nameof(InternshipGradingController.GetSummary)),
            (typeof(LecturerController), nameof(LecturerController.GetDocuments)),
        };

        foreach (var (controllerType, actionName) in readActions)
        {
            var policies = controllerType.GetMethod(actionName)!
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .Select(attribute => attribute.Policy)
                .ToList();

            var effectivePolicies = policies.Count > 0
                ? policies
                : controllerType.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                    .Cast<AuthorizeAttribute>()
                    .Select(attribute => attribute.Policy)
                    .ToList();

            effectivePolicies.Should().Contain("RequireLecturerOrAdmin",
                $"{controllerType.Name}.{actionName} is a read/oversight endpoint and should stay available to SuperAdmin");
        }
    }

    [Fact]
    public void OperationalAdminWriteEndpoints_ShouldRequireDepartmentAdminPolicy()
    {
        var protectedActions = new[]
        {
            (typeof(AdminNotificationsController), nameof(AdminNotificationsController.Broadcast)),
            (typeof(AdminNotificationsController), nameof(AdminNotificationsController.DeleteCampaign)),
            (typeof(DocumentController), nameof(DocumentController.CreateTemplate)),
            (typeof(DocumentController), nameof(DocumentController.UpdateTemplate)),
            (typeof(DocumentController), nameof(DocumentController.DeleteTemplate)),
            (typeof(AttendanceController), nameof(AttendanceController.GetAdminAttendanceReport)),
        };

        foreach (var (controllerType, actionName) in protectedActions)
        {
            var policies = controllerType
                .GetMethod(actionName)!
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .Select(attribute => attribute.Policy)
                .ToList();

            policies.Should().Contain("RequireDepartmentAdmin", $"{controllerType.Name}.{actionName} is an operational department action");
        }
    }

    [Fact]
    public void DepartmentOperationalControllers_ShouldRequireDepartmentAdminAtControllerLevel()
    {
        foreach (var controllerType in new[]
        {
            typeof(AdminAssignmentsController),
            typeof(AdminCompaniesController),
            typeof(AdminStudentsController),
        })
        {
            var attributes = controllerType
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .ToList();

            attributes.Should().ContainSingle(attr => attr.Policy == AdminPolicies.DepartmentAdmin);
        }
    }

    [Fact]
    public void PlatformAdministrationEndpoints_ShouldRequireSuperAdminPolicy()
    {
        var protectedActions = new[]
        {
            (typeof(AdminDepartmentsController), nameof(AdminDepartmentsController.Create)),
            (typeof(AdminDepartmentsController), nameof(AdminDepartmentsController.Update)),
            (typeof(AdminDepartmentsController), nameof(AdminDepartmentsController.Delete)),
        };

        foreach (var (controllerType, actionName) in protectedActions)
        {
            var policies = controllerType
                .GetMethod(actionName)!
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .Select(attribute => attribute.Policy)
                .ToList();

            policies.Should().Contain("RequireSuperAdmin", $"{controllerType.Name}.{actionName} is a platform administration action");
        }

        foreach (var controllerType in new[] { typeof(AdminSettingsController), typeof(AdminAccountRequestsController) })
        {
            var policies = controllerType
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .Select(attribute => attribute.Policy)
                .ToList();

            policies.Should().Contain("RequireSuperAdmin", $"{controllerType.Name} is a platform administration controller");
        }
    }
}
