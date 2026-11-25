using FluentAssertions;
using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace InternLink.Tests.Controllers;

public sealed class SuperAdminSemestersControllerTests
{
    [Fact]
    public async Task GetAll_WithoutTenantId_ReturnsEmptyListWithoutCallingService()
    {
        var semesterService = new Mock<ISemesterService>();
        var controller = new SuperAdminSemestersController(semesterService.Object);

        var result = await controller.GetAll();

        var response = result.Should().BeOfType<OkObjectResult>().Subject.Value
            .Should().BeOfType<ApiResponse<IEnumerable<SemesterDto>>>().Subject;
        response.Data.Should().BeEmpty();
        semesterService.Verify(
            service => service.GetAllSemestersAsync(
                It.IsAny<Guid?>(),
                It.IsAny<Guid?>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task GetAll_WithTenantId_ForwardsTenantScopeToService()
    {
        var tenantId = Guid.NewGuid();
        var semesterService = new Mock<ISemesterService>();
        semesterService
            .Setup(service => service.GetAllSemestersAsync(
                null,
                tenantId,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<SemesterDto>());
        var controller = new SuperAdminSemestersController(semesterService.Object);

        await controller.GetAll(tenantId);

        semesterService.Verify(
            service => service.GetAllSemestersAsync(
                null,
                tenantId,
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task GetById_WithoutTenantId_ReturnsNotFoundWithoutCallingService()
    {
        var semesterService = new Mock<ISemesterService>();
        var controller = new SuperAdminSemestersController(semesterService.Object);

        var result = await controller.GetById(Guid.NewGuid());

        result.Should().BeOfType<NotFoundObjectResult>();
        semesterService.Verify(
            service => service.GetSemesterByIdAsync(
                It.IsAny<Guid>(),
                It.IsAny<Guid?>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
