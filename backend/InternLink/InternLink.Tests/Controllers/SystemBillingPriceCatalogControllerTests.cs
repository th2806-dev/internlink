using System.Security.Claims;
using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace InternLink.Tests.Controllers;

public sealed class SystemBillingPriceCatalogControllerTests
{
    [Fact]
    public async Task GetAll_ReturnsCatalogAndForwardsCurrentOnlyFilter()
    {
        var catalog = new BillingPriceCatalogResponse(
            [new BillingPlanOptionResponse("PRO", "Chuyên nghiệp", 2, 2000, 100, 100L * 1024 * 1024 * 1024)],
            [12, 24, 36],
            []);
        var billingService = new Mock<ISystemBillingService>();
        billingService.Setup(service => service.GetBillingPriceCatalogAsync(true, CancellationToken.None))
            .ReturnsAsync(catalog);
        var controller = new SystemBillingPriceCatalogController(billingService.Object);

        var result = await controller.GetAll(true, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result.Result);
        billingService.Verify(service => service.GetBillingPriceCatalogAsync(true, CancellationToken.None), Times.Once);
    }

    [Fact]
    public async Task Create_ReturnsCreatedAtActionForConfiguredPrice()
    {
        var actorId = Guid.NewGuid();
        var request = new CreateBillingPriceCatalogRequest
        {
            PlanCode = "PRO",
            BillingCycleMonths = 12,
            BaseAmountVnd = 25_000_000,
            TaxRatePercent = 10,
            EffectiveFrom = DateTimeOffset.UtcNow
        };
        var expected = new BillingPriceCatalogItemResponse(
            Guid.NewGuid(),
            "PRO",
            "Chuyên nghiệp",
            12,
            25_000_000,
            10,
            2_500_000,
            27_500_000,
            request.EffectiveFrom,
            null,
            true,
            false);
        var billingService = new Mock<ISystemBillingService>();
        billingService.Setup(service => service.CreateBillingPriceCatalogItemAsync(
                request,
                actorId,
                null,
                CancellationToken.None))
            .ReturnsAsync(expected);
        var controller = CreateController(billingService, actorId);

        var result = await controller.Create(request, CancellationToken.None);

        Assert.IsType<CreatedAtActionResult>(result.Result);
        billingService.Verify(service => service.CreateBillingPriceCatalogItemAsync(
            request,
            actorId,
            null,
            CancellationToken.None), Times.Once);
    }

    [Fact]
    public async Task Update_ReturnsConflictWhenPriceVersionOverlaps()
    {
        var actorId = Guid.NewGuid();
        var id = Guid.NewGuid();
        var request = new UpdateBillingPriceCatalogRequest
        {
            PlanCode = "PRO",
            BillingCycleMonths = 12,
            BaseAmountVnd = 25_000_000,
            TaxRatePercent = 10,
            EffectiveFrom = DateTimeOffset.UtcNow,
            IsActive = true
        };
        var billingService = new Mock<ISystemBillingService>();
        billingService.Setup(service => service.UpdateBillingPriceCatalogItemAsync(
                id,
                request,
                actorId,
                null,
                CancellationToken.None))
            .ThrowsAsync(new InvalidOperationException("Khoảng hiệu lực bị trùng."));
        var controller = CreateController(billingService, actorId);

        var result = await controller.Update(id, request, CancellationToken.None);

        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdatePlan_ReturnsUpdatedPlanLimits()
    {
        var actorId = Guid.NewGuid();
        var request = new UpdateBillingPlanRequest
        {
            MaxStudentsQuota = 4000,
            MaxLecturersQuota = 200,
            StorageQuotaBytes = 250L * 1024 * 1024 * 1024
        };
        var updated = new BillingPlanOptionResponse(
            "PRO",
            "Chuyên nghiệp",
            2,
            request.MaxStudentsQuota,
            request.MaxLecturersQuota,
            request.StorageQuotaBytes);
        var billingService = new Mock<ISystemBillingService>();
        billingService.Setup(service => service.UpdateBillingPlanAsync(
                "PRO",
                request,
                actorId,
                null,
                CancellationToken.None))
            .ReturnsAsync(updated);
        var controller = CreateController(billingService, actorId);

        var result = await controller.UpdatePlan("PRO", request, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result.Result);
        billingService.Verify(service => service.UpdateBillingPlanAsync(
            "PRO",
            request,
            actorId,
            null,
            CancellationToken.None), Times.Once);
    }

    private static SystemBillingPriceCatalogController CreateController(
        Mock<ISystemBillingService> billingService,
        Guid actorId)
    {
        var controller = new SystemBillingPriceCatalogController(billingService.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, actorId.ToString())],
                    "test"))
            }
        };
        return controller;
    }
}
