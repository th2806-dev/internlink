using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using InternLink.API.Controllers;
using InternLink.API.Helpers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;

namespace InternLink.Tests.Controllers;

public class PublicPortalControllerTests
{
    private const string AcceptancePurpose = "InternLink.StudentInternshipAcceptance.v1";

    [Fact]
    public async Task AcceptanceVerify_ReturnsStudentAndCompanyForValidProtectedToken()
    {
        await using var db = CreateDb();
        var (student, company, semester, internship) = CreateInternship();
        db.Internships.Add(internship);
        await db.SaveChangesAsync();
        var provider = new EphemeralDataProtectionProvider();
        var controller = new PublicInternshipAcceptanceController(db, provider);
        var token = CreateAcceptanceToken(provider, internship.Id, student.Id, DateTimeOffset.UtcNow.AddDays(1));

        var result = await controller.Verify(token, CancellationToken.None);

        var response = result.Should().BeOfType<OkObjectResult>().Subject.Value
            .Should().BeOfType<InternshipAcceptancePreviewResponse>().Subject;
        response.StudentName.Should().Be(student.FullName);
        response.CompanyName.Should().Be(company.CompanyName);
        response.SemesterName.Should().Be(semester.Name);
        response.ReferenceCode.Should().Be(PublicReferenceCodes.CreateAcceptance(
            internship.Id,
            internship.StartDate!.Value.Year));
    }

    [Fact]
    public async Task AcceptanceConfirm_PersistsMentorDetailsAndMovesInternshipToInProgress()
    {
        await using var db = CreateDb();
        var (student, _, _, internship) = CreateInternship();
        db.Internships.Add(internship);
        await db.SaveChangesAsync();
        var provider = new EphemeralDataProtectionProvider();
        var controller = new PublicInternshipAcceptanceController(db, provider);
        var token = CreateAcceptanceToken(provider, internship.Id, student.Id, DateTimeOffset.UtcNow.AddDays(1));
        var request = new ConfirmInternshipAcceptanceRequest
        {
            Token = token,
            MentorName = "Trần Minh",
            MentorPhone = "0901234567",
            MentorEmail = "mentor@example.com",
            MentorDepartment = "Kỹ thuật",
            StartDate = new DateTimeOffset(2026, 12, 1, 0, 0, 0, TimeSpan.Zero),
            EndDate = new DateTimeOffset(2027, 3, 1, 0, 0, 0, TimeSpan.Zero)
        };

        var result = await controller.Confirm(request, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        var saved = await db.Internships.SingleAsync();
        saved.Status.Should().Be(InternshipStatus.InProgress);
        saved.SupervisorName.Should().Be("Trần Minh");
        saved.SupervisorPhone.Should().Be("0901234567");
        saved.SupervisorEmail.Should().Be("mentor@example.com");
        saved.SupervisorDepartment.Should().Be("Kỹ thuật");
    }

    [Fact]
    public async Task EmployerEvaluationVerify_ReturnsSemesterGradingRulesAndRubric()
    {
        await using var db = CreateDb();
        var (student, company, semester, internship) = CreateInternship();
        var rawToken = "public-evaluation-token";
        var token = new EmployerEvaluationToken
        {
            Id = Guid.NewGuid(),
            Token = HashToken(rawToken),
            InternshipId = internship.Id,
            Internship = internship,
            MentorEmail = "mentor@example.com",
            MentorName = "Trần Minh",
            ExpiredAt = DateTime.UtcNow.AddDays(1),
            CreatedAt = DateTime.UtcNow
        };
        var rubric = new EvaluationRubric
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            Semester = semester,
            Name = "Rubric HK1",
            Status = RubricStatus.Approved,
            CreatedAt = DateTime.UtcNow
        };
        rubric.Criteria.Add(new EvaluationRubricCriterion
        {
            Id = Guid.NewGuid(),
            RubricId = rubric.Id,
            Name = "Kỹ năng chuyên môn",
            Description = "Vận dụng kiến thức vào công việc",
            Weight = 40,
            MaxScore = 10,
            OrderIndex = 1,
            CreatedAt = DateTime.UtcNow
        });
        db.Internships.Add(internship);
        db.EmployerEvaluationTokens.Add(token);
        db.SysGradingRuleSets.Add(new SysGradingRuleSet
        {
            Id = Guid.NewGuid(),
            SemesterId = semester.Id,
            RuleSetName = "Quy chế HK1",
            EmployerScoreWeight = 0.2m,
            MinimumPassingScore = 5m,
            RequiredWeeklyReportsCount = 6,
            CreatedAt = DateTime.UtcNow
        });
        db.EvaluationRubrics.Add(rubric);
        await db.SaveChangesAsync();

        var controller = new EmployerPublicEvaluationController(
            db,
            Mock.Of<IEmailService>(),
            Mock.Of<ILecturerAccessService>(),
            Mock.Of<IDepartmentScopeService>(),
            new ConfigurationBuilder().Build());

        var result = await controller.Verify(rawToken, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var json = JsonSerializer.Serialize(ok.Value);
        using var document = JsonDocument.Parse(json);
        document.RootElement.GetProperty("company").GetString().Should().Be(company.CompanyName);
        document.RootElement.GetProperty("gradingRules").GetProperty("RuleSetName").GetString()
            .Should().Be("Quy chế HK1");
        document.RootElement.GetProperty("rubric").GetProperty("Criteria")[0].GetProperty("Name").GetString()
            .Should().Be("Kỹ năng chuyên môn");
    }

    [Fact]
    public void EmployerEvaluationScoreCalculator_UsesRubricWeightsAndExcludesNotApplicableCriteria()
    {
        var criteria = Enumerable.Range(0, 8)
            .Select(index => new EmployerEvaluationRubricCriterionSnapshot(
                Guid.NewGuid(),
                $"Tiêu chí {index + 1}",
                null,
                12.5m,
                index + 1))
            .ToList();
        var scores = criteria.Select((criterion, index) => new EmployerEvaluationCriterionScoreRequest(
                criterion.Id,
                index == 0 ? 4 : index == 1 ? 0 : index == 7 ? null : 3,
                index == 2 ? "Làm tốt phần này" : null))
            .ToDictionary(score => score.CriterionId, score => score.Score);

        EmployerEvaluationScoreCalculator.CalculateFinalScore(criteria, scores).Should().Be(6.79m);
    }

    [Fact]
    public async Task PublicVerification_ReturnsOnlySafeCompletionSummaryForValidCode()
    {
        await using var db = CreateDb();
        var (student, _, _, internship) = CreateInternship();
        internship.Status = InternshipStatus.Completed;
        var evaluation = new Evaluation
        {
            Id = Guid.NewGuid(),
            InternshipId = internship.Id,
            IsFinalized = true,
            FinalGrade = 8.5m,
            CreatedAt = DateTime.UtcNow
        };
        db.Internships.Add(internship);
        db.Evaluations.Add(evaluation);
        await db.SaveChangesAsync();
        var controller = new PublicVerificationController(
            db,
            new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Email:InstitutionName"] = "Khoa Công nghệ Thông tin"
                })
                .Build());
        var code = PublicReferenceCodes.CreateVerification(
            internship.Id,
            internship.StartDate!.Value.Year);

        var result = await controller.Verify(code, CancellationToken.None);

        var response = result.Should().BeOfType<OkObjectResult>().Subject.Value
            .Should().BeOfType<PublicVerificationResponse>().Subject;
        response.StudentName.Should().Be(student.FullName);
        response.ResultSummary.Should().Be("Đạt yêu cầu");
        response.InstitutionName.Should().Be("Khoa Công nghệ Thông tin");
        JsonSerializer.Serialize(response)
            .Should().NotContain("Email")
            .And.NotContain("Phone");
    }

    [Fact]
    public async Task AcceptanceVerify_RejectsExpiredAndMalformedTokens()
    {
        await using var db = CreateDb();
        var provider = new EphemeralDataProtectionProvider();
        var controller = new PublicInternshipAcceptanceController(db, provider);
        var expiredToken = CreateAcceptanceToken(
            provider,
            Guid.NewGuid(),
            Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddSeconds(-1));

        var malformedResult = await controller.Verify("not-a-protected-token", CancellationToken.None);
        var expiredResult = await controller.Verify(expiredToken, CancellationToken.None);

        malformedResult.Should().BeOfType<NotFoundObjectResult>();
        expiredResult.Should().BeOfType<NotFoundObjectResult>();
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new AppDbContext(options);
    }

    private static (Student Student, Company Company, Semester Semester, Internship Internship) CreateInternship()
    {
        var student = new Student
        {
            Id = Guid.NewGuid(),
            StudentCode = "P4-001",
            FullName = "Nguyễn An",
            Class = "CNTT01",
            Major = "Công nghệ thông tin",
            Department = "Khoa Kỹ thuật",
            CreatedAt = DateTime.UtcNow
        };
        var company = new Company
        {
            Id = Guid.NewGuid(),
            CompanyName = "Công ty ABC",
            CreatedAt = DateTime.UtcNow
        };
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Học kỳ I",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            TotalWeeks = 12,
            StartDate = new DateTime(2026, 9, 1),
            EndDate = new DateTime(2027, 1, 1),
            CreatedAt = DateTime.UtcNow
        };
        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = student.Id,
            Student = student,
            CompanyId = company.Id,
            Company = company,
            SemesterId = semester.Id,
            Semester = semester,
            StartDate = new DateTime(2026, 12, 1),
            EndDate = new DateTime(2027, 3, 1),
            Status = InternshipStatus.NotStarted,
            Position = "Thực tập sinh",
            CreatedAt = DateTime.UtcNow
        };
        return (student, company, semester, internship);
    }

    private static string CreateAcceptanceToken(
        IDataProtectionProvider provider,
        Guid internshipId,
        Guid studentId,
        DateTimeOffset expiresAt)
    {
        var payload = new StudentAcceptanceTokenPayload(
            internshipId,
            studentId,
            expiresAt.ToUnixTimeSeconds(),
            "test-nonce");
        var protectedToken = provider.CreateProtector(AcceptancePurpose)
            .Protect(JsonSerializer.Serialize(payload));
        return WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(protectedToken));
    }

    private static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
