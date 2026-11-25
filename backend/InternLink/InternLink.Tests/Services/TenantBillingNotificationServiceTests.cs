using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace InternLink.Tests.Services;

public sealed class TenantBillingNotificationServiceTests
{
    [Fact]
    public async Task SendPaymentReceiptAsync_SendsToTenantContactWithPaymentAndLicenseDetails()
    {
        await using var context = CreateContext();
        var tenant = new SysTenant
        {
            TenantCode = "MAIL001",
            Name = "Mail Test Tenant",
            LegalName = "Mail Test Tenant Ltd.",
            Subdomain = "mail-test",
            ContactEmail = "billing@example.edu.vn",
            ContactPhone = string.Empty,
            Status = TenantStatus.Active
        };
        var invoice = new SysTenantBillingInvoice
        {
            TenantId = tenant.PublicId,
            InvoiceNumber = "INV-202611-89ABCDEF",
            PlanCode = "PRO",
            AmountVnd = 125000000,
            BillingCycleMonths = 12,
            MaxStudentsQuota = 1000,
            MaxLecturersQuota = 100,
            StorageQuotaBytes = 1024,
            Status = TenantBillingInvoiceStatus.Paid,
            PaymentMethod = "VietQR",
            PaidAt = DateTime.UtcNow,
            PaymentReference = "BANK-TXN-001",
            CreatedAt = DateTime.UtcNow
        };
        context.SysTenants.Add(tenant);
        context.SysTenantBillingInvoices.Add(invoice);
        context.SysTenantLicenses.Add(new SysTenantLicense
        {
            TenantId = tenant.PublicId,
            LicenseTier = LicenseTier.Professional,
            MaxStudentsQuota = 1000,
            MaxLecturersQuota = 100,
            StorageQuotaBytes = 1024,
            CurrentStorageBytes = 0,
            ValidFrom = DateTime.UtcNow,
            ValidTo = new DateTime(2027, 11, 23, 0, 0, 0, DateTimeKind.Utc),
            IsActive = true
        });
        await context.SaveChangesAsync();

        var emailService = new Mock<IEmailService>();
        emailService.Setup(service => service.SendAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((string to, string _, string _, string? _, CancellationToken _) => SendEmailResult.Ok(to));
        var service = new TenantBillingNotificationService(
            context,
            emailService.Object,
            Mock.Of<ILogger<TenantBillingNotificationService>>());

        await service.SendPaymentReceiptAsync(invoice.PublicId, CancellationToken.None);

        emailService.Verify(mail => mail.SendAsync(
            "billing@example.edu.vn",
            It.Is<string>(subject => subject.Contains(invoice.InvoiceNumber)),
            It.Is<string>(html => html.Contains(invoice.InvoiceNumber)
                && html.Contains("BANK-TXN-001")
                && html.Contains("125.000.000")),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var tenantContext = new ScopedTenantContext();
        tenantContext.SetTenantId(SysTenant.DefaultTenantId);
        tenantContext.SetPlatformAdmin(true);
        return new AppDbContext(options, tenantContext);
    }
}
