using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Exceptions;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace InternLink.Tests.Controllers;

public sealed class SysComplianceControllerTests
{
    [Fact]
    public async Task ExecuteAnonymization_RejectsMissingConfirmationWithoutCallingService()
    {
        var service = new Mock<ISystemComplianceService>(MockBehavior.Strict);
        var controller = new SysComplianceController(service.Object);

        var result = await controller.ExecuteAnonymization(
            new ExecuteAnonymizationRequest
            {
                ExpectedEligibleCount = 4,
                ConfirmationPhrase = "yes"
            },
            CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        service.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ExecuteAnonymization_RequiresFreshPreviewCount()
    {
        var service = new Mock<ISystemComplianceService>();
        service.Setup(item => item.ExecuteAnonymizationAsync(4, "system", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AnonymizationPreviewChangedException());
        var controller = new SysComplianceController(service.Object);

        var result = await controller.ExecuteAnonymization(
            new ExecuteAnonymizationRequest
            {
                ExpectedEligibleCount = 4,
                ConfirmationPhrase = "ANONYMIZE"
            },
            CancellationToken.None);

        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public async Task ExecuteAnonymization_ReturnsExecutionSummary()
    {
        var execution = new ComplianceExecutionResponse(
            Guid.NewGuid(), "STUDENT_PII_ANONYMIZATION", "Completed", 4, 3,
            DateTimeOffset.UtcNow.AddYears(-3), DateTimeOffset.UtcNow, "system");
        var service = new Mock<ISystemComplianceService>();
        service.Setup(item => item.ExecuteAnonymizationAsync(4, "system", It.IsAny<CancellationToken>()))
            .ReturnsAsync(execution);
        var controller = new SysComplianceController(service.Object);

        var result = await controller.ExecuteAnonymization(
            new ExecuteAnonymizationRequest
            {
                ExpectedEligibleCount = 4,
                ConfirmationPhrase = "ANONYMIZE"
            },
            CancellationToken.None);

        var response = Assert.IsType<OkObjectResult>(result.Result);
        var actual = Assert.IsType<ApiResponse<ComplianceExecutionResponse>>(response.Value).Data;
        Assert.Same(execution, actual);
    }

    [Fact]
    public async Task GetAuditLogs_RejectsInvalidPageSize()
    {
        var service = new Mock<ISystemComplianceService>(MockBehavior.Strict);
        var controller = new SysComplianceController(service.Object);

        var result = await controller.GetAuditLogs(1, 101, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        service.VerifyNoOtherCalls();
    }
}
