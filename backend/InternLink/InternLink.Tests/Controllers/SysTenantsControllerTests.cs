using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Services;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;

namespace InternLink.Tests.Controllers;

public sealed class SysTenantsControllerTests
{
    [Fact]
    public async Task GetAll_RejectsInvalidPageSize()
    {
        var service = new Mock<ISystemTenantService>(MockBehavior.Strict);
        var controller = CreateController(service.Object);

        var result = await controller.GetAll(
            new TenantDirectoryQuery(null, null, null, Page: 1, PageSize: 101),
            CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        service.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Create_ReturnsCreatedResourceAndLocationAction()
    {
        var details = CreateTenantDetails();
        var service = new Mock<ISystemTenantService>();
        service.Setup(item => item.CreateTenantAsync(
                It.IsAny<CreateTenantRequest>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(details);
        var controller = CreateController(service.Object);
        var request = new CreateTenantRequest
        {
            TenantCode = "HCMUT",
            Name = "Đại học Bách Khoa",
            LegalName = "Trường Đại học Bách Khoa",
            Subdomain = "hcmut",
            TenantType = TenantType.University,
            ContactEmail = "admin@example.edu.vn",
            ContactPhone = "0281234567",
            PlanCode = "PRO",
            ValidTo = DateTimeOffset.UtcNow.AddYears(1)
        };

        var result = await controller.Create(request, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(SysTenantsController.GetById), created.ActionName);
        Assert.Equal(details.Tenant.Id, created.RouteValues?["id"]);
        Assert.Same(details, Assert.IsType<ApiResponse<TenantDetailsResponse>>(created.Value).Data);
    }

    [Fact]
    public async Task Create_ReturnsConflictWhenTenantCodeOrSubdomainIsTaken()
    {
        var service = new Mock<ISystemTenantService>();
        service.Setup(item => item.CreateTenantAsync(
                It.IsAny<CreateTenantRequest>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TenantConflictException("Mã đơn vị đã được sử dụng."));
        var controller = CreateController(service.Object);
        var request = new CreateTenantRequest
        {
            TenantCode = "HCMUT",
            Name = "Đại học Bách Khoa",
            Subdomain = "hcmut",
            TenantType = TenantType.University,
            PlanCode = "STANDARD",
            ValidTo = DateTimeOffset.UtcNow.AddYears(1)
        };

        var result = await controller.Create(request, CancellationToken.None);

        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public async Task Export_ReturnsZipAndPassesActorAndClientAddress()
    {
        var tenantId = Guid.NewGuid();
        var actorId = Guid.NewGuid();
        var content = new MemoryStream([1, 2, 3]);
        var exportService = new Mock<ISystemTenantExportService>(MockBehavior.Strict);
        exportService.Setup(item => item.ExportAsync(
                tenantId,
                actorId,
                "127.0.0.1",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TenantDataExportArchive(content, "campus-data.zip"));
        var controller = CreateController(
            Mock.Of<ISystemTenantService>(),
            exportService.Object,
            new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, actorId.ToString())],
                "Test")));
        controller.ControllerContext.HttpContext.Connection.RemoteIpAddress =
            System.Net.IPAddress.Loopback;

        var result = await controller.Export(tenantId, CancellationToken.None);

        var file = Assert.IsType<FileStreamResult>(result);
        Assert.Equal("application/zip", file.ContentType);
        Assert.Equal("campus-data.zip", file.FileDownloadName);
        Assert.Same(content, file.FileStream);
        exportService.VerifyAll();
        await content.DisposeAsync();
    }

    [Fact]
    public async Task Export_ReturnsUnauthorizedWithoutActorIdentity()
    {
        var exportService = new Mock<ISystemTenantExportService>(MockBehavior.Strict);
        var controller = CreateController(
            Mock.Of<ISystemTenantService>(),
            exportService.Object,
            new ClaimsPrincipal(new ClaimsIdentity()));

        var result = await controller.Export(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<UnauthorizedObjectResult>(result);
        exportService.VerifyNoOtherCalls();
    }

    private static SysTenantsController CreateController(
        ISystemTenantService service,
        ISystemTenantExportService? exportService = null,
        ClaimsPrincipal? user = null)
    {
        var controller = new SysTenantsController(
            service,
            exportService ?? Mock.Of<ISystemTenantExportService>());
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = user ?? new ClaimsPrincipal(new ClaimsIdentity())
            }
        };
        return controller;
    }

    private static TenantDetailsResponse CreateTenantDetails()
    {
        var tenantId = Guid.NewGuid();
        return new TenantDetailsResponse(
            new TenantDirectoryItem(
                tenantId,
                "HCMUT",
                "Đại học Bách Khoa",
                null,
                "hcmut",
                TenantType.University,
                null,
                "admin@example.edu.vn",
                "0281234567",
                TenantStatus.Trial,
                0,
                0,
                0,
                LicenseTier.Professional,
                10000,
                DateTimeOffset.UtcNow.AddYears(1)),
            "Trường Đại học Bách Khoa",
            DateTimeOffset.UtcNow);
    }
}
