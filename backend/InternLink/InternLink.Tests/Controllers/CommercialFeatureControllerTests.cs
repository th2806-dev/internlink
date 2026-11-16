using System.Security.Claims;
using FluentAssertions;
using InternLink.API.Controllers;
using InternLink.Application.Interfaces;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace InternLink.Tests.Controllers;

public class CommercialFeatureControllerTests
{
    [Fact]
    public void EmployerEvaluationMigration_IsRegisteredWithTheContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=localhost;Database=InternLinkTest;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;
        using var db = new AppDbContext(options);

        db.Database.GetMigrations().Should().Contain("20261108170000_AddEmployerEvaluationTokens");
        db.Database.HasPendingModelChanges().Should().BeFalse();
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task EmployerEvaluationVerify_UnknownTokenReturnsNotFound()
    {
        var controller = new EmployerPublicEvaluationController(
            CreateDb(),
            Mock.Of<IEmailService>(),
            Mock.Of<ILecturerAccessService>(),
            Mock.Of<IDepartmentScopeService>(),
            new ConfigurationBuilder().Build());

        var result = await controller.Verify("unknown-token", CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task EmployerEvaluationSubmit_RejectsOutOfRangeScoreBeforePersistence()
    {
        var controller = new EmployerPublicEvaluationController(
            CreateDb(),
            Mock.Of<IEmailService>(),
            Mock.Of<ILecturerAccessService>(),
            Mock.Of<IDepartmentScopeService>(),
            new ConfigurationBuilder().Build());

        var result = await controller.Submit(new SubmitEmployerEvaluationRequest
        {
            Token = "valid-shaped-token",
            CriterionScores = [new EmployerEvaluationCriterionScoreRequest(Guid.NewGuid(), 5, null)],
            ConfirmedMentorName = "Mentor",
            Confirmed = true
        }, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task ExcelPreview_RejectsUnsupportedFileExtension()
    {
        var controller = new ExcelImportController(
            CreateDb(),
            Mock.Of<IDepartmentScopeService>());
        var file = new FormFile(new MemoryStream([1, 2, 3]), 0, 3, "file", "students.csv");

        var result = await controller.Preview(file, null, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task C22AndC23Exports_ReturnServiceFiles()
    {
        var semesterId = Guid.NewGuid();
        var c22Bytes = new byte[] { 1, 2, 3 };
        var c23Bytes = new byte[] { 4, 5, 6 };
        var reportService = new Mock<IInternshipReportService>();
        reportService
            .Setup(service => service.ExportC22BatchZipAsync(
                semesterId, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(c22Bytes);
        var excelExportService = new Mock<IExcelExportService>();
        excelExportService
            .Setup(service => service.GenerateC23AccreditationExcelAsync(
                semesterId, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(c23Bytes);
        var departmentScope = new Mock<IDepartmentScopeService>();
        departmentScope
            .Setup(service => service.ResolveEffectiveDepartmentId(
                It.IsAny<ClaimsPrincipal>(), null))
            .Returns((Guid?)null);
        var controller = new AccreditationReportsController(
            reportService.Object,
            excelExportService.Object,
            Mock.Of<ILecturerAccessService>(),
            departmentScope.Object,
            NullLogger<AccreditationReportsController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity())
                }
            }
        };

        var c22Result = await controller.ExportC22Batch(semesterId, null, CancellationToken.None);
        var c23Result = await controller.ExportC23Excel(semesterId, null, CancellationToken.None);

        c22Result.Should().BeOfType<FileContentResult>().Which.FileContents.Should().Equal(c22Bytes);
        c23Result.Should().BeOfType<FileContentResult>().Which.FileContents.Should().Equal(c23Bytes);
    }
}
