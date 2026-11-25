using System.Text.Json;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Entities.System;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Tests.Services;

public sealed class SystemComplianceServiceTests
{
    [Fact]
    public async Task PreviewAndExecute_AnonymizesEligibleIdentityAndRedactsAuditPii()
    {
        await using var context = CreateContext();
        var tenantId = Guid.NewGuid();
        var (eligibleStudent, eligibleUser, eligibleInternship, evaluation) =
            AddStudent(context, tenantId, "S001", completed: true, semesterEnd: DateTime.UtcNow.AddYears(-4));
        AddStudent(context, tenantId, "S002", completed: false, semesterEnd: DateTime.UtcNow.AddYears(-4));
        AddStudent(context, tenantId, "S003", completed: true, semesterEnd: DateTime.UtcNow.AddYears(-2));
        context.SysDataRetentionPolicies.Add(new SysDataRetentionPolicy
        {
            Code = "STUDENT_PII",
            Name = "Định danh hồ sơ sinh viên",
            Description = "Anonymization wait period",
            RetentionYears = 3,
            IsEnabled = true
        });
        await context.SaveChangesAsync();
        foreach (var semester in context.Semesters.Local)
            semester.Status = SemesterStatus.Completed;
        await context.SaveChangesAsync();
        AddHistoricalAuditLogs(context, tenantId, eligibleStudent, eligibleUser);
        await context.SaveChangesAsync();
        var service = new SystemComplianceService(context);

        var preview = await service.GetAnonymizationPreviewAsync(CancellationToken.None);
        var result = await service.ExecuteAnonymizationAsync(1, "platform-admin", CancellationToken.None);

        Assert.Equal(1, preview.EligibleStudentCount);
        Assert.True(preview.IsEnabled);
        Assert.Equal("S001", eligibleStudent.StudentCode);
        Assert.Equal("Sinh viên đã ẩn danh", eligibleStudent.FullName);
        Assert.Equal($"anonymized_{eligibleStudent.PublicId:N}@internlink.vn", eligibleStudent.Email);
        Assert.Null(eligibleStudent.Phone);
        Assert.Null(eligibleStudent.ResumeUrl);
        Assert.Equal("S001", eligibleUser.Username);
        Assert.Equal(eligibleStudent.Email, eligibleUser.Email);
        Assert.Equal("Sinh viên đã ẩn danh", eligibleUser.FullName);
        Assert.Null(eligibleUser.AvatarUrl);
        Assert.Equal("Sinh viên đã ẩn danh", await context.SysUsers.IgnoreQueryFilters()
            .Where(item => item.PublicId == eligibleUser.PublicId)
            .Select(item => item.DisplayName)
            .SingleAsync());
        Assert.Equal(8.5m, evaluation.FinalGrade);
        Assert.Equal(1, result.AffectedCount);
        Assert.Equal("platform-admin", result.TriggeredBy);
        Assert.Equal(1, await context.SysComplianceLogs.CountAsync());

        var historicalLogs = await context.SysAuditLogs.IgnoreQueryFilters()
            .Where(item => item.RecordId == eligibleStudent.PublicId.ToString()
                || item.RecordId == eligibleUser.PublicId.ToString())
            .ToListAsync();
        var auditJson = string.Join(" ", historicalLogs.SelectMany(item =>
            new[] { item.OldValuesJson, item.NewValuesJson }));
        Assert.DoesNotContain("person@example.edu.vn", auditJson, StringComparison.Ordinal);
        Assert.DoesNotContain("555-0101", auditJson, StringComparison.Ordinal);
        Assert.DoesNotContain("private-cv.pdf", auditJson, StringComparison.Ordinal);
        Assert.DoesNotContain("Ada Student", auditJson, StringComparison.Ordinal);
        Assert.Equal(InternshipStatus.Completed, eligibleInternship.Status);
    }

    [Fact]
    public async Task Execute_RejectsStalePreviewCountWithoutChangingRecords()
    {
        await using var context = CreateContext();
        var tenantId = Guid.NewGuid();
        var (student, _, _, _) = AddStudent(
            context, tenantId, "S101", completed: true, semesterEnd: DateTime.UtcNow.AddYears(-4));
        context.SysDataRetentionPolicies.Add(new SysDataRetentionPolicy
        {
            Code = "STUDENT_PII",
            Name = "Định danh hồ sơ sinh viên",
            Description = "Anonymization wait period",
            RetentionYears = 3,
            IsEnabled = true
        });
        await context.SaveChangesAsync();
        foreach (var semester in context.Semesters.Local)
            semester.Status = SemesterStatus.Completed;
        await context.SaveChangesAsync();
        var service = new SystemComplianceService(context);

        await Assert.ThrowsAsync<InternLink.Application.Exceptions.AnonymizationPreviewChangedException>(
            () => service.ExecuteAnonymizationAsync(2, "admin", CancellationToken.None));

        Assert.Equal("Ada Student", student.FullName);
        Assert.Equal("person@example.edu.vn", student.Email);
        Assert.Empty(await context.SysComplianceLogs.ToListAsync());
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"system-compliance-{Guid.NewGuid():N}")
            .Options;
        return new AppDbContext(options);
    }

    private static (Student Student, User User, Internship Internship, Evaluation Evaluation) AddStudent(
        AppDbContext context,
        Guid tenantId,
        string studentCode,
        bool completed,
        DateTime? semesterEnd)
    {
        var user = new User
        {
            TenantId = tenantId,
            Username = studentCode,
            PasswordHash = "password-hash",
            FullName = "Ada Student",
            Email = "person@example.edu.vn",
            AvatarUrl = "/uploads/ada.png",
            Role = Role.Student,
            IsActive = true
        };
        var semester = new Semester
        {
            TenantId = tenantId,
            Name = $"Semester {studentCode}",
            Term = "Học kỳ I",
            AcademicYear = "2018 - 2019",
            EndDate = semesterEnd,
            Status = SemesterStatus.Active
        };
        var student = new Student
        {
            TenantId = tenantId,
            User = user,
            UserId = user.PublicId,
            StudentCode = studentCode,
            FullName = "Ada Student",
            Email = "person@example.edu.vn",
            Phone = "555-0101",
            ResumeUrl = "https://files.example.edu/private-cv.pdf",
            Department = "Khoa Công nghệ",
            DepartmentId = Guid.NewGuid()
        };
        var internship = new Internship
        {
            TenantId = tenantId,
            Student = student,
            StudentId = student.PublicId,
            Semester = semester,
            SemesterId = semester.PublicId,
            Status = completed ? InternshipStatus.Completed : InternshipStatus.InProgress
        };
        student.Internships.Add(internship);
        var evaluation = new Evaluation
        {
            TenantId = tenantId,
            Internship = internship,
            InternshipId = internship.PublicId,
            TechnicalScore = 8,
            CommunicationScore = 9,
            TeamworkScore = 8,
            InitiativeScore = 9,
            FinalGrade = 8.5m,
            IsFinalized = true
        };

        context.Students.Add(student);
        context.Evaluations.Add(evaluation);
        context.SysUsers.Add(new SysUser
        {
            TenantId = tenantId,
            PublicId = user.PublicId,
            UserName = user.Username,
            DisplayName = user.FullName,
            LegacyUser = user
        });
        return (student, user, internship, evaluation);
    }

    private static void AddHistoricalAuditLogs(
        AppDbContext context,
        Guid tenantId,
        Student student,
        User user)
    {
        var previousValues = JsonSerializer.Serialize(new
        {
            FullName = "Ada Student",
            Email = "person@example.edu.vn",
            Phone = "555-0101",
            ResumeUrl = "https://files.example.edu/private-cv.pdf"
        });
        context.SysAuditLogs.AddRange(
            new SysAuditLog
            {
                TenantId = tenantId,
                TableName = "Students",
                RecordId = student.PublicId.ToString(),
                ActionType = "UPDATE",
                OldValuesJson = previousValues,
                NewValuesJson = previousValues
            },
            new SysAuditLog
            {
                TenantId = tenantId,
                TableName = "Users",
                RecordId = user.PublicId.ToString(),
                ActionType = "UPDATE",
                OldValuesJson = previousValues,
                NewValuesJson = previousValues
            },
            new SysAuditLog
            {
                TenantId = tenantId,
                TableName = "Sys_Users",
                RecordId = user.PublicId.ToString(),
                ActionType = "UPDATE",
                OldValuesJson = JsonSerializer.Serialize(new { DisplayName = "Ada Student" }),
                NewValuesJson = JsonSerializer.Serialize(new { DisplayName = "Ada Student" })
            });
    }
}
