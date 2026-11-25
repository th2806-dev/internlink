using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Moq;

namespace InternLink.Tests.Services;

public sealed class SystemBillingServiceTests
{
    [Fact]
    public async Task MarkPaid_UpdatesLicenseAndRejectsDuplicateConfirmation()
    {
        await using var db = CreateContext();
        var tenant = CreateTenant();
        db.SysTenants.Add(tenant);
        await db.SaveChangesAsync();
        await AddPriceAsync(db, "PRO", 12, 125000000m, 0m);

        var service = new SystemBillingService(
            db,
            Mock.Of<IVietQrPayloadGenerator>(),
            Options.Create(new VietQrSettings()));
        var invoice = await service.CreateInvoiceAsync(
            new CreateTenantBillingInvoiceRequest
            {
                TenantId = tenant.PublicId,
                PlanCode = "PRO",
                BillingCycleMonths = 12,
                PaymentMethod = "BankTransfer"
            },
            Guid.NewGuid(),
            "127.0.0.1",
            CancellationToken.None);

        var paid = await service.MarkPaidAsync(
            invoice.Id,
            "BANK-REF-001",
            Guid.NewGuid(),
            "127.0.0.1",
            CancellationToken.None);

        Assert.NotNull(paid);
        Assert.Equal("Paid", paid.Status);
        Assert.Equal("BANK-REF-001", paid.PaymentReference);
        var license = await db.SysTenantLicenses.IgnoreQueryFilters()
            .SingleAsync(item => item.TenantId == tenant.PublicId);
        Assert.Equal(LicenseTier.Professional, license.LicenseTier);
        Assert.Equal(2000, license.MaxStudentsQuota);
        Assert.Equal(100, license.MaxLecturersQuota);
        Assert.Equal(100L * 1024 * 1024 * 1024, license.StorageQuotaBytes);
        Assert.True(license.IsActive);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.MarkPaidAsync(
            invoice.Id,
            "BANK-REF-SECOND",
            Guid.NewGuid(),
            null,
            CancellationToken.None));
        Assert.Single(await db.SysTenantLicenses.IgnoreQueryFilters().ToListAsync());
    }

    [Fact]
    public async Task MarkPaid_PreservesReconciledStorageUsageWhenRenewingLicense()
    {
        await using var db = CreateContext();
        var tenant = CreateTenant();
        db.SysTenants.Add(tenant);
        await db.SaveChangesAsync();
        await AddPriceAsync(db, "PRO", 12, 125000000m, 0m);
        var storageUsageInitializedAt = DateTime.UtcNow.AddMinutes(-1);
        db.SysTenantLicenses.Add(new SysTenantLicense
        {
            TenantId = tenant.PublicId,
            CurrentStorageBytes = 4321,
            StorageUsageInitializedAt = storageUsageInitializedAt,
            ValidFrom = DateTime.UtcNow.AddMonths(-12),
            ValidTo = DateTime.UtcNow.AddDays(1),
            IsActive = true
        });
        await db.SaveChangesAsync();

        var service = new SystemBillingService(
            db,
            Mock.Of<IVietQrPayloadGenerator>(),
            Options.Create(new VietQrSettings()));
        var invoice = await service.CreateInvoiceAsync(
            new CreateTenantBillingInvoiceRequest
            {
                TenantId = tenant.PublicId,
                PlanCode = "PRO",
                BillingCycleMonths = 12,
                PaymentMethod = "BankTransfer"
            },
            Guid.NewGuid(),
            "127.0.0.1",
            CancellationToken.None);

        await service.MarkPaidAsync(
            invoice.Id,
            "BANK-REF-STORAGE",
            Guid.NewGuid(),
            "127.0.0.1",
            CancellationToken.None);

        var license = await db.SysTenantLicenses.IgnoreQueryFilters()
            .SingleAsync(item => item.TenantId == tenant.PublicId);
        Assert.Equal(4321L, license.CurrentStorageBytes);
        Assert.Equal(storageUsageInitializedAt, license.StorageUsageInitializedAt);
    }

    [Fact]
    public async Task PaymentWebhook_RejectsShortPaymentAndAppliesAnOverpaymentOnlyOnce()
    {
        await using var db = CreateContext();
        var tenant = CreateTenant();
        db.SysTenants.Add(tenant);
        await db.SaveChangesAsync();
        await AddPriceAsync(db, "PRO", 12, 125000000m, 0m);

        var service = new SystemBillingService(
            db,
            Mock.Of<IVietQrPayloadGenerator>(),
            Options.Create(new VietQrSettings()));
        var invoice = await service.CreateInvoiceAsync(
            new CreateTenantBillingInvoiceRequest
            {
                TenantId = tenant.PublicId,
                PlanCode = "PRO",
                BillingCycleMonths = 12,
                PaymentMethod = "BankTransfer"
            },
            Guid.NewGuid(),
            "127.0.0.1",
            CancellationToken.None);

        var shortPayment = await service.ProcessPaymentWebhookAsync(
            invoice.InvoiceNumber,
            124999999,
            "BANK-TXN-001",
            CancellationToken.None);
        Assert.Equal("amount_mismatch", shortPayment.Status);
        Assert.Empty(await db.SysTenantLicenses.IgnoreQueryFilters().ToListAsync());

        var paid = await service.ProcessPaymentWebhookAsync(
            invoice.InvoiceNumber,
            125000001,
            "BANK-TXN-002",
            CancellationToken.None);
        var duplicate = await service.ProcessPaymentWebhookAsync(
            invoice.InvoiceNumber,
            125000001,
            "BANK-TXN-002",
            CancellationToken.None);

        Assert.Equal("paid", paid.Status);
        Assert.Equal("duplicate", duplicate.Status);
        Assert.Equal("BANK-TXN-002", paid.Invoice?.PaymentReference);
        Assert.Single(await db.SysTenantLicenses.IgnoreQueryFilters().ToListAsync());
        Assert.Single(await db.SysAuditLogs.IgnoreQueryFilters()
            .Where(item => item.ActionType == "BILLING_INVOICE_PAID")
            .ToListAsync());
    }

    [Fact]
    public void VietQrGenerator_ProducesInvoiceMemoAndRejectsMissingBankConfiguration()
    {
        var generator = new VietQrPayloadGenerator();
        var settings = new VietQrSettings
        {
            BankId = "970422",
            AccountNo = "123456789",
            AccountName = "INTERNLINK JSC",
            MerchantCity = "HOCHIMINH"
        };

        var payment = generator.Generate("INV-202611-12345678", 125000000, settings);

        Assert.Equal("ILPAY INV-202611-12345678", payment.Memo);
        Assert.Contains(
            "38530010A0000007270123000697042201091234567890208QRIBFTTA",
            payment.Payload);
        Assert.Contains("62290825ILPAY INV-202611-12345678", payment.Payload);
        Assert.Contains("5409125000000", payment.Payload);
        Assert.Throws<VietQrConfigurationException>(() => generator.Generate(
            "INV-202611-1234567890",
            125000000,
            new VietQrSettings()));
    }

    [Fact]
    public async Task GetVietQrSettings_UsesAppsettingsWhenDatabaseHasNoValue()
    {
        await using var db = CreateContext();
        var fallback = new VietQrSettings
        {
            BankId = "970436",
            AccountNo = "123456789",
            AccountName = "FALLBACK ACCOUNT",
            MerchantCity = "HANOI"
        };
        var service = new SystemBillingService(
            db,
            Mock.Of<IVietQrPayloadGenerator>(),
            Options.Create(fallback));

        var result = await service.GetVietQrSettingsAsync(CancellationToken.None);

        Assert.Equal(fallback.BankId, result.BankId);
        Assert.Equal(fallback.AccountNo, result.AccountNo);
        Assert.Equal(fallback.AccountName, result.AccountName);
        Assert.Equal(fallback.MerchantCity, result.MerchantCity);
    }

    [Fact]
    public async Task UpdateVietQrSettings_NormalizesValuesAndPersistsPlatformSetting()
    {
        await using var db = CreateContext();
        var service = new SystemBillingService(
            db,
            Mock.Of<IVietQrPayloadGenerator>(),
            Options.Create(new VietQrSettings()));

        var result = await service.UpdateVietQrSettingsAsync(
            new UpdateVietQrSettingsRequest
            {
                BankId = "970415",
                AccountNo = " 0123456789 ",
                AccountName = "Nguyễn Ánh Đào",
                MerchantCity = "Hồ Chí Minh"
            },
            Guid.NewGuid(),
            "127.0.0.1",
            CancellationToken.None);

        Assert.Equal("970415", result.BankId);
        Assert.Equal("0123456789", result.AccountNo);
        Assert.Equal("NGUYEN ANH DAO", result.AccountName);
        Assert.Equal("HO CHI MINH", result.MerchantCity);
        var stored = await db.SystemSettings.IgnoreQueryFilters()
            .SingleAsync(setting => setting.Key == "Billing.VietQr.Config");
        Assert.Equal(SysTenant.DefaultTenantId, stored.TenantId);
        Assert.Contains("NGUYEN ANH DAO", stored.Value);
        var audit = await db.SysAuditLogs.IgnoreQueryFilters()
            .SingleAsync(entry => entry.ActionType == "VIETQR_SETTINGS_UPDATED");
        Assert.Equal("BILLING.CONFIGURE", audit.FunctionCode);
        Assert.DoesNotContain("0123456789", audit.NewValuesJson);
    }

    [Fact]
    public async Task PreviewVietQr_UsesUnsavedSettingsForTenThousandVnd()
    {
        await using var db = CreateContext();
        var generator = new Mock<IVietQrPayloadGenerator>();
        VietQrSettings? generatedWith = null;
        generator.Setup(item => item.Generate(
                It.IsAny<string>(),
                It.IsAny<decimal>(),
                It.IsAny<VietQrSettings>()))
            .Callback<string, decimal, VietQrSettings>((_, amount, settings) =>
            {
                Assert.Equal(10_000m, amount);
                generatedWith = settings;
            })
            .Returns(new VietQrPaymentResponse(
                "sample-payload",
                "970415",
                "0123456789",
                "NGUYEN VAN A",
                10_000m,
                "ILPAY TEST-10000"));
        var service = new SystemBillingService(
            db,
            generator.Object,
            Options.Create(new VietQrSettings()));

        var preview = service.PreviewVietQr(new UpdateVietQrSettingsRequest
        {
            BankId = "970415",
            AccountNo = "0123456789",
            AccountName = "Nguyễn Văn A",
            MerchantCity = "Hồ Chí Minh"
        });

        Assert.Equal(10_000m, preview.AmountVnd);
        Assert.Equal("NGUYEN VAN A", preview.AccountName);
        Assert.Equal("970415", generatedWith?.BankId);
        Assert.Empty(await db.SystemSettings.IgnoreQueryFilters().ToListAsync());
    }

    [Fact]
    public async Task GetVietQr_UsesDatabaseSettingsBeforeAppsettingsFallback()
    {
        await using var db = CreateContext();
        var tenant = CreateTenant();
        db.SysTenants.Add(tenant);
        db.SysTenantBillingInvoices.Add(new SysTenantBillingInvoice
        {
            TenantId = tenant.PublicId,
            InvoiceNumber = "INV-202611-12345678",
            PlanCode = "STANDARD",
            AmountVnd = 125000,
            BillingCycleMonths = 12,
            MaxStudentsQuota = 100,
            MaxLecturersQuota = 10,
            StorageQuotaBytes = 1024,
            Status = TenantBillingInvoiceStatus.PendingPayment,
            PaymentMethod = "VietQR",
            CreatedAt = DateTime.UtcNow
        });
        db.SystemSettings.Add(new SystemSetting
        {
            Id = Guid.NewGuid(),
            TenantId = SysTenant.DefaultTenantId,
            Key = "Billing.VietQr.Config",
            Value = """{"BankId":"970415","AccountNo":"123456789","AccountName":"DB ACCOUNT","MerchantCity":"HANOI"}""",
            Category = "Billing",
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var generator = new Mock<IVietQrPayloadGenerator>();
        VietQrSettings? generatedWith = null;
        generator.Setup(item => item.Generate(
                It.IsAny<string>(),
                It.IsAny<decimal>(),
                It.IsAny<VietQrSettings>()))
            .Callback<string, decimal, VietQrSettings>((_, _, settings) => generatedWith = settings)
            .Returns(new VietQrPaymentResponse("payload", "970415", "123456789", "DB ACCOUNT", 125000, "memo"));
        var service = new SystemBillingService(
            db,
            generator.Object,
            Options.Create(new VietQrSettings { BankId = "970436", AccountNo = "fallback" }));

        var invoice = await db.SysTenantBillingInvoices.IgnoreQueryFilters().SingleAsync();
        await service.GetVietQrAsync(invoice.PublicId, CancellationToken.None);

        Assert.NotNull(generatedWith);
        Assert.Equal("970415", generatedWith.BankId);
        Assert.Equal("DB ACCOUNT", generatedWith.AccountName);
    }

    [Fact]
    public async Task CreateInvoice_SnapshotsCatalogPriceAndTaxAndUsesNewVersionForLaterInvoices()
    {
        await using var db = CreateContext();
        var tenant = CreateTenant();
        db.SysTenants.Add(tenant);
        await db.SaveChangesAsync();
        var effectiveFrom = DateTime.UtcNow.AddDays(-1);
        var originalPrice = new SysBillingPriceCatalog
        {
            PlanCode = "PRO",
            BillingCycleMonths = 12,
            BaseAmountVnd = 25_000_000,
            TaxRatePercent = 10,
            EffectiveFrom = effectiveFrom,
            IsActive = true,
            CreatedAt = effectiveFrom
        };
        db.SysBillingPriceCatalogs.Add(originalPrice);
        await db.SaveChangesAsync();

        var service = new SystemBillingService(
            db,
            Mock.Of<IVietQrPayloadGenerator>(),
            Options.Create(new VietQrSettings()));
        var request = new CreateTenantBillingInvoiceRequest
        {
            TenantId = tenant.PublicId,
            PlanCode = "PRO",
            BillingCycleMonths = 12,
            PaymentMethod = "VietQR"
        };

        var firstInvoice = await service.CreateInvoiceAsync(
            request, Guid.NewGuid(), null, CancellationToken.None);
        Assert.Equal(25_000_000m, firstInvoice.BaseAmountVnd);
        Assert.Equal(10m, firstInvoice.TaxRatePercent);
        Assert.Equal(2_500_000m, firstInvoice.TaxAmountVnd);
        Assert.Equal(27_500_000m, firstInvoice.AmountVnd);

        var newEffectiveFrom = DateTime.UtcNow.AddSeconds(-1);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateBillingPriceCatalogItemAsync(
            originalPrice.PublicId,
            new UpdateBillingPriceCatalogRequest
            {
                PlanCode = "PRO",
                BillingCycleMonths = 12,
                BaseAmountVnd = 26_000_000,
                TaxRatePercent = 10,
                EffectiveFrom = new DateTimeOffset(effectiveFrom),
                EffectiveTo = null,
                IsActive = true
            },
            Guid.NewGuid(),
            null,
            CancellationToken.None));

        var actorId = Guid.NewGuid();
        await service.UpdateBillingPriceCatalogItemAsync(
            originalPrice.PublicId,
            new UpdateBillingPriceCatalogRequest
            {
                PlanCode = "PRO",
                BillingCycleMonths = 12,
                BaseAmountVnd = 25_000_000,
                TaxRatePercent = 10,
                EffectiveFrom = new DateTimeOffset(effectiveFrom),
                EffectiveTo = new DateTimeOffset(newEffectiveFrom),
                IsActive = true
            },
            actorId,
            null,
            CancellationToken.None);
        var updatedPrice = await service.CreateBillingPriceCatalogItemAsync(
            new CreateBillingPriceCatalogRequest
            {
                PlanCode = "PRO",
                BillingCycleMonths = 12,
                BaseAmountVnd = 30_000_000,
                TaxRatePercent = 8,
                EffectiveFrom = new DateTimeOffset(newEffectiveFrom),
                EffectiveTo = null
            },
            actorId,
            null,
            CancellationToken.None);

        var secondInvoice = await service.CreateInvoiceAsync(
            request, Guid.NewGuid(), null, CancellationToken.None);

        Assert.Equal(27_500_000m, firstInvoice.AmountVnd);
        Assert.Equal(25_000_000m, (await db.SysTenantBillingInvoices
            .IgnoreQueryFilters()
            .SingleAsync(item => item.PublicId == firstInvoice.Id)).BaseAmountVnd);
        Assert.Equal(30_000_000m, secondInvoice.BaseAmountVnd);
        Assert.Equal(8m, secondInvoice.TaxRatePercent);
        Assert.Equal(2_400_000m, secondInvoice.TaxAmountVnd);
        Assert.Equal(32_400_000m, secondInvoice.AmountVnd);
        Assert.Equal(updatedPrice.Id, (await db.SysTenantBillingInvoices
            .IgnoreQueryFilters()
            .SingleAsync(item => item.PublicId == secondInvoice.Id)).BillingPriceCatalogId);
    }

    [Fact]
    public async Task GetBillingPriceCatalog_CurrentOnlyReturnsActivePricesWithConfiguredTax()
    {
        await using var db = CreateContext();
        var now = DateTime.UtcNow;
        var current = new SysBillingPriceCatalog
        {
            PlanCode = "PRO",
            BillingCycleMonths = 12,
            BaseAmountVnd = 25_000_000,
            TaxRatePercent = 0,
            EffectiveFrom = now.AddDays(-1),
            IsActive = true,
            CreatedAt = now
        };
        db.SysBillingPriceCatalogs.AddRange(
            current,
            new SysBillingPriceCatalog
            {
                PlanCode = "STANDARD",
                BillingCycleMonths = 12,
                BaseAmountVnd = 10_000_000,
                TaxRatePercent = null,
                EffectiveFrom = now.AddDays(-1),
                IsActive = true,
                CreatedAt = now
            },
            new SysBillingPriceCatalog
            {
                PlanCode = "PRO",
                BillingCycleMonths = 24,
                BaseAmountVnd = 45_000_000,
                TaxRatePercent = 10,
                EffectiveFrom = now.AddDays(-2),
                EffectiveTo = now.AddDays(-1),
                IsActive = true,
                CreatedAt = now
            },
            new SysBillingPriceCatalog
            {
                PlanCode = "PRO",
                BillingCycleMonths = 36,
                BaseAmountVnd = 60_000_000,
                TaxRatePercent = 10,
                EffectiveFrom = now.AddDays(-1),
                IsActive = false,
                CreatedAt = now
            },
            new SysBillingPriceCatalog
            {
                PlanCode = "ENTERPRISE",
                BillingCycleMonths = 12,
                BaseAmountVnd = 50_000_000,
                TaxRatePercent = 10,
                EffectiveFrom = now.AddDays(1),
                IsActive = true,
                CreatedAt = now
            });
        await db.SaveChangesAsync();

        var service = new SystemBillingService(
            db,
            Mock.Of<IVietQrPayloadGenerator>(),
            Options.Create(new VietQrSettings()));

        var currentCatalog = await service.GetBillingPriceCatalogAsync(true, CancellationToken.None);
        var fullCatalog = await service.GetBillingPriceCatalogAsync(false, CancellationToken.None);

        Assert.Collection(currentCatalog.Items, item =>
        {
            Assert.Equal(current.PublicId, item.Id);
            Assert.Equal(0m, item.TaxRatePercent);
            Assert.Equal(25_000_000m, item.TotalAmountVnd);
        });
        Assert.Equal(5, fullCatalog.Items.Count);
        Assert.Equal(new[] { "STANDARD", "PRO", "ENTERPRISE" }, fullCatalog.Plans.Select(plan => plan.Code));
        Assert.Equal(new[] { 12, 24, 36 }, fullCatalog.BillingCycleOptions);
    }

    [Fact]
    public async Task UpdatingPlanLimitsOnlyChangesNewInvoicesAndPreservesExistingInvoiceSnapshot()
    {
        await using var db = CreateContext();
        var tenant = CreateTenant();
        db.SysTenants.Add(tenant);
        await db.SaveChangesAsync();
        await AddPriceAsync(db, "PRO", 12, 25_000_000m, 0m);
        var service = new SystemBillingService(
            db,
            Mock.Of<IVietQrPayloadGenerator>(),
            Options.Create(new VietQrSettings()));

        var firstInvoice = await service.CreateInvoiceAsync(
            new CreateTenantBillingInvoiceRequest
            {
                TenantId = tenant.PublicId,
                PlanCode = "PRO",
                BillingCycleMonths = 12,
                PaymentMethod = "BankTransfer"
            },
            Guid.NewGuid(),
            null,
            CancellationToken.None);

        Assert.Equal(2000, firstInvoice.MaxStudentsQuota);
        Assert.Equal(100, firstInvoice.MaxLecturersQuota);
        Assert.Equal(100L * 1024 * 1024 * 1024, firstInvoice.StorageQuotaBytes);

        await service.UpdateBillingPlanAsync(
            "PRO",
            new UpdateBillingPlanRequest
            {
                MaxStudentsQuota = 4000,
                MaxLecturersQuota = 200,
                StorageQuotaBytes = 250L * 1024 * 1024 * 1024
            },
            Guid.NewGuid(),
            null,
            CancellationToken.None);

        var storedFirstInvoice = await db.SysTenantBillingInvoices
            .IgnoreQueryFilters()
            .SingleAsync(item => item.PublicId == firstInvoice.Id);
        Assert.Equal(2000, storedFirstInvoice.MaxStudentsQuota);
        Assert.Equal(100, storedFirstInvoice.MaxLecturersQuota);
        Assert.Equal(100L * 1024 * 1024 * 1024, storedFirstInvoice.StorageQuotaBytes);

        var secondInvoice = await service.CreateInvoiceAsync(
            new CreateTenantBillingInvoiceRequest
            {
                TenantId = tenant.PublicId,
                PlanCode = "PRO",
                BillingCycleMonths = 12,
                PaymentMethod = "BankTransfer"
            },
            Guid.NewGuid(),
            null,
            CancellationToken.None);
        Assert.Equal(4000, secondInvoice.MaxStudentsQuota);
        Assert.Equal(200, secondInvoice.MaxLecturersQuota);
        Assert.Equal(250L * 1024 * 1024 * 1024, secondInvoice.StorageQuotaBytes);

        await service.MarkPaidAsync(
            firstInvoice.Id,
            "BANK-REF-OLD-PLAN",
            Guid.NewGuid(),
            null,
            CancellationToken.None);
        var license = await db.SysTenantLicenses.IgnoreQueryFilters()
            .SingleAsync(item => item.TenantId == tenant.PublicId);
        Assert.Equal(2000, license.MaxStudentsQuota);
        Assert.Equal(100, license.MaxLecturersQuota);
        Assert.Equal(100L * 1024 * 1024 * 1024, license.StorageQuotaBytes);
    }

    [Fact]
    public async Task CreateInvoice_RejectsMissingPriceOrUnconfiguredTaxRate()
    {
        await using var db = CreateContext();
        var tenant = CreateTenant();
        db.SysTenants.Add(tenant);
        await db.SaveChangesAsync();
        var service = new SystemBillingService(
            db,
            Mock.Of<IVietQrPayloadGenerator>(),
            Options.Create(new VietQrSettings()));
        var request = new CreateTenantBillingInvoiceRequest
        {
            TenantId = tenant.PublicId,
            PlanCode = "STANDARD",
            BillingCycleMonths = 12,
            PaymentMethod = "VietQR"
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateInvoiceAsync(
            request, Guid.NewGuid(), null, CancellationToken.None));

        await AddPriceAsync(db, "STANDARD", 12, 10_000_000m, null);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateInvoiceAsync(
            request, Guid.NewGuid(), null, CancellationToken.None));
        Assert.Empty(await db.SysTenantBillingInvoices.IgnoreQueryFilters().ToListAsync());
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var tenantContext = new ScopedTenantContext();
        tenantContext.SetTenantId(SysTenant.DefaultTenantId);
        tenantContext.SetPlatformAdmin(true);
        var db = new AppDbContext(options, tenantContext);
        db.Database.EnsureCreated();
        return db;
    }

    private static async Task AddPriceAsync(
        AppDbContext db,
        string planCode,
        int billingCycleMonths,
        decimal baseAmountVnd,
        decimal? taxRatePercent)
    {
        var now = DateTime.UtcNow;
        db.SysBillingPriceCatalogs.Add(new SysBillingPriceCatalog
        {
            PlanCode = planCode,
            BillingCycleMonths = billingCycleMonths,
            BaseAmountVnd = baseAmountVnd,
            TaxRatePercent = taxRatePercent,
            EffectiveFrom = now.AddDays(-1),
            IsActive = true,
            CreatedAt = now
        });
        await db.SaveChangesAsync();
    }

    private static SysTenant CreateTenant() => new()
    {
        TenantCode = $"T{Guid.NewGuid():N}"[..10],
        Name = "Billing Test Tenant",
        LegalName = "Billing Test Tenant Ltd.",
        Subdomain = $"t{Guid.NewGuid():N}"[..12],
        ContactEmail = string.Empty,
        ContactPhone = string.Empty,
        Status = TenantStatus.Active
    };
}
