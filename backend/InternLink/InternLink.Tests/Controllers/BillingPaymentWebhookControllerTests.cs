using System.Text.Json;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.API.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;

namespace InternLink.Tests.Controllers;

public sealed class BillingPaymentWebhookControllerTests
{
    [Theory]
    [InlineData("IL BILLING INV-202611-89ABCDEF", "INV-202611-89ABCDEF")]
    [InlineData("Transfer ILPAY INV-202611-89ABCDEF", "INV-202611-89ABCDEF")]
    public void TryExtractInvoiceNumber_AcceptsSupportedMemos(string memo, string expectedInvoiceNumber)
    {
        var found = BillingPaymentWebhookParser.TryExtractInvoiceNumber(memo, out var invoiceNumber);

        Assert.True(found);
        Assert.Equal(expectedInvoiceNumber, invoiceNumber);
    }

    [Fact]
    public void TryExtractInvoiceNumber_RejectsAmbiguousAndUnrelatedMemos()
    {
        Assert.False(BillingPaymentWebhookParser.TryExtractInvoiceNumber(
            "IL BILLING INV-202611-89ABCDEF ILPAY INV-202612-01234567",
            out _));
        Assert.False(BillingPaymentWebhookParser.TryExtractInvoiceNumber("Khoản thanh toán", out _));
    }

    [Fact]
    public void TryParse_AcceptsSePayStyleIncomingTransactionAndRejectsUnknownDirection()
    {
        using var validDocument = JsonDocument.Parse(
            """{"id":123,"referenceCode":"TX-1","transferType":"in","transferAmount":150000,"content":"IL BILLING INV-202611-89ABCDEF"}""");
        var parsed = BillingPaymentWebhookParser.TryParse(
            validDocument.RootElement,
            out var transactions,
            out var error);

        Assert.True(parsed, error);
        Assert.Single(transactions);
        Assert.True(transactions[0].IsIncoming);
        Assert.Equal(150000, transactions[0].AmountVnd);
        Assert.Equal("TX-1", transactions[0].TransactionId);

        using var unknownDirectionDocument = JsonDocument.Parse(
            """{"id":"TX-2","amount":150000,"description":"IL BILLING INV-202611-89ABCDEF"}""");
        Assert.False(BillingPaymentWebhookParser.TryParse(
            unknownDirectionDocument.RootElement,
            out _,
            out _));
    }

    [Fact]
    public void TryParse_AcceptsCassoTransactionBatch()
    {
        using var document = JsonDocument.Parse(
            """{"data":[{"tid":"CASSO-TX-1","amount":150000,"description":"IL BILLING INV-202611-89ABCDEF"}]}""");

        var parsed = BillingPaymentWebhookParser.TryParse(
            document.RootElement,
            out var transactions,
            out var error);

        Assert.True(parsed, error);
        Assert.Single(transactions);
        Assert.True(transactions[0].IsIncoming);
        Assert.Equal("CASSO-TX-1", transactions[0].TransactionId);
    }

    [Fact]
    public void TokenValidator_RequiresConfiguredSecretAndRejectsInvalidToken()
    {
        Assert.False(BillingWebhookTokenValidator.IsValid(null, "token"));
        Assert.False(BillingWebhookTokenValidator.IsValid("configured-secret", null));
        Assert.False(BillingWebhookTokenValidator.IsValid("configured-secret", "wrong-secret"));
        Assert.True(BillingWebhookTokenValidator.IsValid("configured-secret", "configured-secret"));
    }

    [Fact]
    public async Task Receive_DoesNotProcessTransactionsWithoutAValidToken()
    {
        var billingService = new Mock<ISystemBillingService>();
        var controller = CreateController(billingService, new Mock<IBillingPaymentReceiptQueue>());
        controller.ControllerContext.HttpContext.Request.Headers["X-Webhook-Token"] = "wrong-token";
        using var document = JsonDocument.Parse(
            """{"id":"TX-1","transferType":"in","transferAmount":150000,"content":"IL BILLING INV-202611-89ABCDEF"}""");

        var result = await controller.Receive(document.RootElement, CancellationToken.None);

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
        billingService.Verify(service => service.ProcessPaymentWebhookAsync(
            It.IsAny<string>(),
            It.IsAny<decimal>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Receive_FailsClosedWhenWebhookSecretIsNotConfigured()
    {
        var billingService = new Mock<ISystemBillingService>();
        var controller = CreateController(
            billingService,
            new Mock<IBillingPaymentReceiptQueue>(),
            configuredSecret: null);
        controller.ControllerContext.HttpContext.Request.Headers["X-Webhook-Token"] = "some-token";
        using var document = JsonDocument.Parse("{}");

        var result = await controller.Receive(document.RootElement, CancellationToken.None);

        Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, ((ObjectResult)result.Result!).StatusCode);
        billingService.Verify(service => service.ProcessPaymentWebhookAsync(
            It.IsAny<string>(),
            It.IsAny<decimal>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Receive_AppliesVerifiedPaymentAndQueuesReceipt()
    {
        var invoiceId = Guid.NewGuid();
        var invoice = new TenantBillingInvoiceResponse(
            invoiceId,
            Guid.NewGuid(),
            "Test Tenant",
            "TEST01",
            "INV-202611-89ABCDEF",
            "PRO",
            "Chuyên nghiệp",
            150000,
            0,
            0,
            150000,
            12,
            100,
            10,
            1024,
            "Paid",
            "VietQR",
            DateTimeOffset.UtcNow,
            null,
            DateTimeOffset.UtcNow,
            "TX-1");
        var billingService = new Mock<ISystemBillingService>();
        billingService.Setup(service => service.ProcessPaymentWebhookAsync(
                "INV-202611-89ABCDEF",
                150000,
                "TX-1",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PaymentWebhookProcessResult("paid", invoice.InvoiceNumber, invoice));
        var receiptQueue = new Mock<IBillingPaymentReceiptQueue>();
        var controller = CreateController(billingService, receiptQueue);
        controller.ControllerContext.HttpContext.Request.Headers["X-Webhook-Token"] = "configured-secret";
        using var document = JsonDocument.Parse(
            """{"id":"TX-1","transferType":"in","transferAmount":150000,"content":"IL BILLING INV-202611-89ABCDEF"}""");

        var result = await controller.Receive(document.RootElement, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result.Result);
        billingService.Verify(service => service.ProcessPaymentWebhookAsync(
            "INV-202611-89ABCDEF",
            150000,
            "TX-1",
            It.IsAny<CancellationToken>()), Times.Once);
        receiptQueue.Verify(queue => queue.QueuePaymentReceipt(invoiceId), Times.Once);
    }

    private static BillingPaymentWebhookController CreateController(
        Mock<ISystemBillingService> billingService,
        Mock<IBillingPaymentReceiptQueue> receiptQueue,
        string? configuredSecret = "configured-secret")
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Billing:Webhook:Secret"] = configuredSecret
            })
            .Build();
        var controller = new BillingPaymentWebhookController(
            configuration,
            billingService.Object,
            receiptQueue.Object,
            Mock.Of<ILogger<BillingPaymentWebhookController>>());
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        return controller;
    }
}
