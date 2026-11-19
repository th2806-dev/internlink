using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Tests.Services;

public sealed class SysFieldPolicyServiceTests
{
    [Fact]
    public async Task GetByFormAsync_PrefersRolePolicyAndFallsBackToDefault()
    {
        await using var db = CreateContext();
        var role = new SysRole { Code = "Lecturer", Name = "Giảng viên", IsActive = true };
        db.SysRoles.Add(role);
        db.SysFieldPolicies.AddRange(
            new SysFieldPolicy
            {
                FormCode = "FORM_WEEKLY_REPORT",
                FieldKey = "Title",
                IsVisible = true,
                CustomLabel = "Tiêu đề"
            },
            new SysFieldPolicy
            {
                FormCode = "FORM_WEEKLY_REPORT",
                FieldKey = "Body",
                Role = role,
                IsVisible = false
            });
        await db.SaveChangesAsync();

        var policies = await new SysFieldPolicyService(db)
            .GetByFormAsync("FORM_WEEKLY_REPORT", role.AutoId, CancellationToken.None);

        policies.Should().HaveCount(2);
        policies.Single(item => item.FieldKey == "Title").CustomLabel.Should().Be("Tiêu đề");
        policies.Single(item => item.FieldKey == "Body").IsVisible.Should().BeFalse();
    }

    [Fact]
    public async Task GetByFormForRoleAsync_ResolvesRoleCodeAndUsesRoleOverrides()
    {
        await using var db = CreateContext();
        var role = new SysRole { Code = "Student", Name = "Sinh viên", IsActive = true };
        db.SysRoles.Add(role);
        db.SysFieldPolicies.AddRange(
            new SysFieldPolicy
            {
                FormCode = "STUDENT_WEEKLY_REPORT",
                FieldKey = "keyResults",
                IsRequired = false
            },
            new SysFieldPolicy
            {
                FormCode = "STUDENT_WEEKLY_REPORT",
                FieldKey = "keyResults",
                Role = role,
                IsRequired = true
            });
        await db.SaveChangesAsync();

        var policies = await new SysFieldPolicyService(db)
            .GetByFormForRoleAsync("STUDENT_WEEKLY_REPORT", "Student", CancellationToken.None);

        policies.Should().ContainSingle();
        policies[0].IsRequired.Should().BeTrue();
    }

    [Fact]
    public async Task GetByFormAsync_PrefersTenantPolicyAndFallsBackToGeneralBaseline()
    {
        await using var db = CreateContext();
        db.SysFieldPolicies.AddRange(
            new SysFieldPolicy
            {
                FormCode = "FORM_STUDENT_PROFILE",
                FieldKey = "Email",
                TenantId = null,
                CustomLabel = "Email"
            },
            new SysFieldPolicy
            {
                FormCode = "FORM_STUDENT_PROFILE",
                FieldKey = "Email",
                TenantId = "faculty-a",
                CustomLabel = "Email trường A"
            },
            new SysFieldPolicy
            {
                FormCode = "FORM_STUDENT_PROFILE",
                FieldKey = "Phone",
                TenantId = "faculty-b",
                CustomLabel = "Riêng khoa B"
            });
        await db.SaveChangesAsync();

        var service = new SysFieldPolicyService(db);
        var facultyA = await service.GetByFormAsync(
            "FORM_STUDENT_PROFILE", null, CancellationToken.None, "faculty-a");
        var facultyC = await service.GetByFormAsync(
            "FORM_STUDENT_PROFILE", null, CancellationToken.None, "faculty-c");

        facultyA.Should().ContainSingle()
            .Which.CustomLabel.Should().Be("Email trường A");
        facultyC.Should().ContainSingle()
            .Which.CustomLabel.Should().Be("Email");
    }

    [Fact]
    public async Task UpsertAsync_RejectsInvalidRegularExpression()
    {
        await using var db = CreateContext();
        var request = new UpsertSysFieldPoliciesRequest(
        [
            new UpsertSysFieldPolicyItem(
                "Email",
                true,
                false,
                false,
                null,
                null,
                "[",
                "Sai định dạng",
                1)
        ]);

        var act = () => new SysFieldPolicyService(db)
            .UpsertAsync("FORM_STUDENT_PROFILE", null, request, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Regex không hợp lệ*");
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }
}
