using System.Data;
using System.Globalization;
using System.Text;
using System.Text.Json;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;

namespace InternLink.Infrastructure.Services;

public sealed class SystemBillingService(
    AppDbContext context,
    IVietQrPayloadGenerator vietQrGenerator,
    IOptions<VietQrSettings> vietQrOptions) : ISystemBillingService
{
    private const string VietQrSettingsKey = "Billing.VietQr.Config";
    private static readonly IReadOnlyDictionary<string, string> BillingPlanNames =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["STANDARD"] = "Tiêu chuẩn",
            ["PRO"] = "Chuyên nghiệp",
            ["ENTERPRISE"] = "Doanh nghiệp"
        };
    private static readonly int[] BillingCycleOptions = [12, 24, 36];

    public async Task<BillingPriceCatalogResponse> GetBillingPriceCatalogAsync(
        bool currentOnly,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var planEntities = await context.SysBillingPlans
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => !item.IsDeleted && item.IsActive)
            .OrderBy(item => item.LicenseTier)
            .ToListAsync(cancellationToken);
        var query = context.SysBillingPriceCatalogs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => !item.IsDeleted);
        if (currentOnly)
        {
            query = query.Where(item => item.IsActive
                && item.TaxRatePercent.HasValue
                && item.EffectiveFrom <= now
                && (!item.EffectiveTo.HasValue || item.EffectiveTo > now));
        }

        var items = await query
            .OrderBy(item => item.PlanCode)
            .ThenBy(item => item.BillingCycleMonths)
            .ThenByDescending(item => item.EffectiveFrom)
            .ToListAsync(cancellationToken);
        var itemIds = items.Select(item => item.PublicId).ToArray();
        var usedIds = itemIds.Length == 0
            ? new HashSet<Guid>()
            : await context.SysTenantBillingInvoices
                .IgnoreQueryFilters()
                .Where(invoice => !invoice.IsDeleted
                    && invoice.BillingPriceCatalogId.HasValue
                    && itemIds.Contains(invoice.BillingPriceCatalogId.Value))
                .Select(invoice => invoice.BillingPriceCatalogId!.Value)
                .Distinct()
                .ToHashSetAsync(cancellationToken);

        return new BillingPriceCatalogResponse(
            planEntities.Select(ToPlanResponse).ToArray(),
            BillingCycleOptions,
            items.Select(item => ToPriceResponse(
                item,
                usedIds.Contains(item.PublicId),
                BillingPlanNames.GetValueOrDefault(item.PlanCode, item.PlanCode))).ToArray());
    }

    public async Task<BillingPriceCatalogItemResponse?> GetBillingPriceCatalogItemAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var item = await context.SysBillingPriceCatalogs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(price => price.PublicId == id && !price.IsDeleted, cancellationToken);
        if (item == null)
            return null;

        var isUsed = await context.SysTenantBillingInvoices
            .IgnoreQueryFilters()
            .AnyAsync(invoice => !invoice.IsDeleted && invoice.BillingPriceCatalogId == id, cancellationToken);
        return ToPriceResponse(
            item,
            isUsed,
            BillingPlanNames.GetValueOrDefault(item.PlanCode, item.PlanCode));
    }

    public async Task<BillingPlanOptionResponse?> UpdateBillingPlanAsync(
        string planCodeValue,
        UpdateBillingPlanRequest request,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var planCode = planCodeValue.Trim().ToUpperInvariant();
        if (!BillingPlanNames.ContainsKey(planCode))
            throw new ArgumentException("Gói bản quyền không hợp lệ.");

        var plan = await context.SysBillingPlans
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.PlanCode == planCode && !item.IsDeleted, cancellationToken);
        if (plan == null)
            return null;

        var oldValues = new
        {
            plan.MaxStudentsQuota,
            plan.MaxLecturersQuota,
            plan.StorageQuotaBytes
        };
        plan.MaxStudentsQuota = request.MaxStudentsQuota;
        plan.MaxLecturersQuota = request.MaxLecturersQuota;
        plan.StorageQuotaBytes = request.StorageQuotaBytes;
        plan.UpdatedAt = DateTime.UtcNow;

        var actorName = await GetActorNameAsync(actorId, cancellationToken);
        context.SysAuditLogs.Add(new SysAuditLog
        {
            TenantId = SysTenant.DefaultTenantId,
            TableName = "Sys_BillingPlans",
            ActionType = "BILLING_PLAN_LIMITS_UPDATED",
            RecordId = plan.PublicId.ToString(),
            UserId = actorId,
            Username = actorName,
            FunctionCode = "BILLING.CONFIGURE",
            IpAddress = ipAddress,
            OldValuesJson = JsonSerializer.Serialize(oldValues),
            NewValuesJson = JsonSerializer.Serialize(new
            {
                plan.PlanCode,
                plan.MaxStudentsQuota,
                plan.MaxLecturersQuota,
                plan.StorageQuotaBytes
            }),
            CreatedAt = plan.UpdatedAt.Value
        });
        await context.SaveChangesAsync(cancellationToken);
        return ToPlanResponse(plan);
    }

    public async Task<BillingPriceCatalogItemResponse> CreateBillingPriceCatalogItemAsync(
        CreateBillingPriceCatalogRequest request,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var (planCode, baseAmount, taxRate, effectiveFrom, effectiveTo) = ValidatePrice(
            request.PlanCode,
            request.BillingCycleMonths,
            request.BaseAmountVnd,
            request.TaxRatePercent,
            request.EffectiveFrom,
            request.EffectiveTo);
        var price = new SysBillingPriceCatalog
        {
            PlanCode = planCode,
            BillingCycleMonths = request.BillingCycleMonths,
            BaseAmountVnd = baseAmount,
            TaxRatePercent = taxRate,
            EffectiveFrom = effectiveFrom,
            EffectiveTo = effectiveTo,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await using var transaction = context.Database.IsRelational()
            ? await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken)
            : null;
        await EnsureNoOverlappingPriceAsync(price, null, cancellationToken);

        var actorName = await GetActorNameAsync(actorId, cancellationToken);
        context.SysBillingPriceCatalogs.Add(price);
        context.SysAuditLogs.Add(new SysAuditLog
        {
            TenantId = SysTenant.DefaultTenantId,
            TableName = "Sys_BillingPriceCatalog",
            ActionType = "BILLING_PRICE_CREATED",
            RecordId = price.PublicId.ToString(),
            UserId = actorId,
            Username = actorName,
            FunctionCode = "BILLING.CONFIGURE",
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new
            {
                price.PlanCode,
                price.BillingCycleMonths,
                price.BaseAmountVnd,
                price.TaxRatePercent,
                price.EffectiveFrom,
                price.EffectiveTo
            }),
            CreatedAt = price.CreatedAt
        });
        await context.SaveChangesAsync(cancellationToken);
        if (transaction != null)
            await transaction.CommitAsync(cancellationToken);
        return ToPriceResponse(
            price,
            false,
            BillingPlanNames.GetValueOrDefault(price.PlanCode, price.PlanCode));
    }

    public async Task<BillingPriceCatalogItemResponse?> UpdateBillingPriceCatalogItemAsync(
        Guid id,
        UpdateBillingPriceCatalogRequest request,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var (planCode, baseAmount, taxRate, effectiveFrom, effectiveTo) = ValidatePrice(
            request.PlanCode,
            request.BillingCycleMonths,
            request.BaseAmountVnd,
            request.TaxRatePercent,
            request.EffectiveFrom,
            request.EffectiveTo);
        await using var transaction = context.Database.IsRelational()
            ? await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken)
            : null;
        var price = await context.SysBillingPriceCatalogs
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.PublicId == id && !item.IsDeleted, cancellationToken);
        if (price == null)
            return null;

        var isUsed = await context.SysTenantBillingInvoices
            .IgnoreQueryFilters()
            .AnyAsync(invoice => !invoice.IsDeleted && invoice.BillingPriceCatalogId == id, cancellationToken);
        if (isUsed && (price.PlanCode != planCode
            || price.BillingCycleMonths != request.BillingCycleMonths
            || price.BaseAmountVnd != baseAmount
            || price.TaxRatePercent != taxRate
            || price.EffectiveFrom != effectiveFrom))
            throw new InvalidOperationException(
                "Giá, thuế suất và ngày bắt đầu của phiên bản đã gắn với hóa đơn không thể thay đổi.");

        var oldValues = new
        {
            price.PlanCode,
            price.BillingCycleMonths,
            price.BaseAmountVnd,
            price.TaxRatePercent,
            price.EffectiveFrom,
            price.EffectiveTo,
            price.IsActive
        };
        var candidate = new SysBillingPriceCatalog
        {
            PublicId = price.PublicId,
            PlanCode = planCode,
            BillingCycleMonths = request.BillingCycleMonths,
            BaseAmountVnd = baseAmount,
            TaxRatePercent = taxRate,
            EffectiveFrom = effectiveFrom,
            EffectiveTo = effectiveTo,
            IsActive = request.IsActive
        };
        await EnsureNoOverlappingPriceAsync(candidate, id, cancellationToken);

        price.PlanCode = candidate.PlanCode;
        price.BillingCycleMonths = candidate.BillingCycleMonths;
        price.BaseAmountVnd = candidate.BaseAmountVnd;
        price.TaxRatePercent = candidate.TaxRatePercent;
        price.EffectiveFrom = candidate.EffectiveFrom;
        price.EffectiveTo = candidate.EffectiveTo;
        price.IsActive = candidate.IsActive;
        price.UpdatedAt = DateTime.UtcNow;

        var actorName = await GetActorNameAsync(actorId, cancellationToken);
        context.SysAuditLogs.Add(new SysAuditLog
        {
            TenantId = SysTenant.DefaultTenantId,
            TableName = "Sys_BillingPriceCatalog",
            ActionType = "BILLING_PRICE_UPDATED",
            RecordId = price.PublicId.ToString(),
            UserId = actorId,
            Username = actorName,
            FunctionCode = "BILLING.CONFIGURE",
            IpAddress = ipAddress,
            OldValuesJson = JsonSerializer.Serialize(oldValues),
            NewValuesJson = JsonSerializer.Serialize(new
            {
                price.PlanCode,
                price.BillingCycleMonths,
                price.BaseAmountVnd,
                price.TaxRatePercent,
                price.EffectiveFrom,
                price.EffectiveTo,
                price.IsActive
            }),
            CreatedAt = price.UpdatedAt.Value
        });
        await context.SaveChangesAsync(cancellationToken);
        if (transaction != null)
            await transaction.CommitAsync(cancellationToken);
        return ToPriceResponse(
            price,
            isUsed,
            BillingPlanNames.GetValueOrDefault(price.PlanCode, price.PlanCode));
    }

    public async Task<TenantBillingInvoicePageResponse> GetInvoicesAsync(
        Guid? tenantId,
        TenantBillingInvoiceStatusFilter? status,
        DateTimeOffset? fromDate,
        DateTimeOffset? toDate,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query = context.SysTenantBillingInvoices
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(invoice => invoice.Tenant)
            .Where(invoice => !invoice.IsDeleted);

        if (tenantId.HasValue)
            query = query.Where(invoice => invoice.TenantId == tenantId.Value);

        if (status.HasValue)
            query = query.Where(invoice => (int)invoice.Status == (int)status.Value);
        if (fromDate.HasValue)
            query = query.Where(invoice => invoice.CreatedAt >= fromDate.Value.UtcDateTime);
        if (toDate.HasValue)
        {
            var toEndOfDay = toDate.Value.UtcDateTime.Date.AddDays(1);
            query = query.Where(invoice => invoice.CreatedAt < toEndOfDay);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var invoices = await query
            .OrderByDescending(invoice => invoice.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var summaryQuery = context.SysTenantBillingInvoices
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(invoice => !invoice.IsDeleted);
        if (tenantId.HasValue)
            summaryQuery = summaryQuery.Where(invoice => invoice.TenantId == tenantId.Value);
        if (fromDate.HasValue)
            summaryQuery = summaryQuery.Where(invoice => invoice.CreatedAt >= fromDate.Value.UtcDateTime);
        if (toDate.HasValue)
        {
            var toEndOfDay = toDate.Value.UtcDateTime.Date.AddDays(1);
            summaryQuery = summaryQuery.Where(invoice => invoice.CreatedAt < toEndOfDay);
        }

        var summaryRows = await summaryQuery
            .Select(invoice => new
            {
                invoice.Status,
                invoice.AmountVnd
            })
            .ToListAsync(cancellationToken);
        var summary = new BillingInvoiceSummaryResponse(
            summaryRows.Count,
            summaryRows.Count(row => row.Status == TenantBillingInvoiceStatus.PendingPayment),
            summaryRows.Count(row => row.Status == TenantBillingInvoiceStatus.Paid),
            summaryRows.Count(row => row.Status == TenantBillingInvoiceStatus.Overdue),
            summaryRows.Count(row => row.Status == TenantBillingInvoiceStatus.Cancelled),
            summaryRows.Sum(row => row.AmountVnd),
            summaryRows.Where(row => row.Status == TenantBillingInvoiceStatus.Paid).Sum(row => row.AmountVnd),
            summaryRows.Where(row => row.Status is TenantBillingInvoiceStatus.PendingPayment or TenantBillingInvoiceStatus.Overdue)
                .Sum(row => row.AmountVnd));

        return new TenantBillingInvoicePageResponse(
            invoices.Select(ToResponse).ToArray(),
            page,
            pageSize,
            totalCount,
            summary);
    }

    public async Task<TenantBillingInvoiceResponse?> GetInvoiceAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var invoice = await context.SysTenantBillingInvoices
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(item => item.Tenant)
            .FirstOrDefaultAsync(item => item.PublicId == id && !item.IsDeleted, cancellationToken);
        return invoice == null ? null : ToResponse(invoice);
    }

    public async Task<TenantBillingInvoiceResponse> CreateInvoiceAsync(
        CreateTenantBillingInvoiceRequest request,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (request.BillingCycleMonths is not (12 or 24 or 36))
            throw new ArgumentException("Chu kỳ thanh toán chỉ được là 12, 24 hoặc 36 tháng.");

        var planCode = request.PlanCode.Trim().ToUpperInvariant();
        if (!TryParsePlan(planCode, out _))
            throw new ArgumentException("Gói bản quyền không hợp lệ.");

        var paymentMethod = request.PaymentMethod.Trim();
        if (!paymentMethod.Equals("VietQR", StringComparison.OrdinalIgnoreCase)
            && !paymentMethod.Equals("BankTransfer", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Phương thức thanh toán không hợp lệ.");

        var tenant = await context.SysTenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.PublicId == request.TenantId && !item.IsDeleted, cancellationToken);
        if (tenant == null)
            throw new KeyNotFoundException("Không tìm thấy đơn vị thanh toán.");

        var plan = await context.SysBillingPlans
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.PlanCode == planCode && item.IsActive && !item.IsDeleted, cancellationToken);
        if (plan == null)
            throw new InvalidOperationException("Gói bản quyền chưa được cấu hình.");

        if (request.DueDate.HasValue && request.DueDate.Value <= DateTimeOffset.UtcNow)
            throw new ArgumentException("Hạn thanh toán phải ở tương lai.");

        await using var transaction = context.Database.IsRelational()
            ? await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken)
            : null;
        var now = DateTime.UtcNow;
        var prices = await context.SysBillingPriceCatalogs
            .IgnoreQueryFilters()
            .Where(item => !item.IsDeleted
                && item.IsActive
                && item.PlanCode == planCode
                && item.BillingCycleMonths == request.BillingCycleMonths
                && item.EffectiveFrom <= now
                && (!item.EffectiveTo.HasValue || item.EffectiveTo > now))
            .ToListAsync(cancellationToken);
        if (prices.Count != 1)
            throw new InvalidOperationException(
                prices.Count == 0
                    ? "Không có giá đang hiệu lực cho gói và chu kỳ đã chọn."
                    : "Có nhiều mức giá đang hiệu lực cho gói và chu kỳ đã chọn; cần xử lý catalog trước.");

        var catalogPrice = prices[0];
        if (!catalogPrice.TaxRatePercent.HasValue)
            throw new InvalidOperationException(
                "Phiên bản giá chưa được cấu hình thuế suất VAT; hãy cập nhật catalog trước khi xuất hóa đơn.");
        var taxRate = catalogPrice.TaxRatePercent.Value;
        var taxAmount = CalculateTax(catalogPrice.BaseAmountVnd, taxRate);
        var totalAmount = catalogPrice.BaseAmountVnd + taxAmount;
        string invoiceNumber;
        do
        {
            invoiceNumber = $"INV-{now:yyyyMM}-{Guid.NewGuid():N}"[..19].ToUpperInvariant();
        }
        while (await context.SysTenantBillingInvoices
                   .IgnoreQueryFilters()
                   .AnyAsync(item => item.InvoiceNumber == invoiceNumber, cancellationToken));

        var invoice = new SysTenantBillingInvoice
        {
            TenantId = tenant.PublicId,
            BillingPriceCatalogId = catalogPrice.PublicId,
            InvoiceNumber = invoiceNumber,
            PlanCode = planCode,
            BaseAmountVnd = catalogPrice.BaseAmountVnd,
            TaxRatePercent = taxRate,
            TaxAmountVnd = taxAmount,
            AmountVnd = totalAmount,
            BillingCycleMonths = request.BillingCycleMonths,
            MaxStudentsQuota = plan.MaxStudentsQuota,
            MaxLecturersQuota = plan.MaxLecturersQuota,
            StorageQuotaBytes = plan.StorageQuotaBytes,
            Status = TenantBillingInvoiceStatus.PendingPayment,
            PaymentMethod = paymentMethod.Equals("VietQR", StringComparison.OrdinalIgnoreCase)
                ? "VietQR"
                : "BankTransfer",
            DueDate = request.DueDate?.UtcDateTime,
            CreatedAt = now
        };
        context.SysTenantBillingInvoices.Add(invoice);

        var actorName = await GetActorNameAsync(actorId, cancellationToken);
        context.SysAuditLogs.Add(new SysAuditLog
        {
            TenantId = tenant.PublicId,
            TableName = "Sys_TenantBillingInvoices",
            ActionType = "BILLING_INVOICE_CREATED",
            RecordId = invoice.PublicId.ToString(),
            UserId = actorId,
            Username = actorName,
            FunctionCode = "BILLING",
            IpAddress = ipAddress,
            NewValuesJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                invoice.InvoiceNumber,
                invoice.PlanCode,
                PlanName = BillingPlanNames.GetValueOrDefault(invoice.PlanCode, invoice.PlanCode),
                invoice.BaseAmountVnd,
                invoice.TaxRatePercent,
                invoice.TaxAmountVnd,
                invoice.AmountVnd,
                invoice.BillingCycleMonths,
                invoice.MaxStudentsQuota,
                invoice.MaxLecturersQuota,
                invoice.StorageQuotaBytes,
                invoice.PaymentMethod
            }),
            CreatedAt = now
        });

        await context.SaveChangesAsync(cancellationToken);
        if (transaction != null)
            await transaction.CommitAsync(cancellationToken);
        invoice.Tenant = tenant;
        return ToResponse(invoice);
    }

    public async Task<VietQrPaymentResponse?> GetVietQrAsync(
        Guid invoiceId,
        CancellationToken cancellationToken)
    {
        var invoice = await context.SysTenantBillingInvoices
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.PublicId == invoiceId && !item.IsDeleted, cancellationToken);
        if (invoice == null)
            return null;
        if (!invoice.PaymentMethod.Equals("VietQR", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Hóa đơn này không sử dụng phương thức VietQR.");
        if (invoice.Status is TenantBillingInvoiceStatus.Paid or TenantBillingInvoiceStatus.Cancelled)
            throw new InvalidOperationException("Hóa đơn không còn ở trạng thái có thể thanh toán.");

        var settings = await LoadVietQrSettingsAsync(cancellationToken);
        return vietQrGenerator.Generate(invoice.InvoiceNumber, invoice.AmountVnd, settings);
    }

    public async Task<VietQrSettingsResponse> GetVietQrSettingsAsync(
        CancellationToken cancellationToken)
    {
        var settings = await LoadVietQrSettingsAsync(cancellationToken);
        return ToResponse(settings);
    }

    public async Task<VietQrSettingsResponse> UpdateVietQrSettingsAsync(
        UpdateVietQrSettingsRequest request,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var settings = NormalizeAndValidateSettings(new VietQrSettings
        {
            BankId = request.BankId,
            AccountNo = request.AccountNo,
            AccountName = request.AccountName,
            MerchantCity = request.MerchantCity
        });
        var now = DateTime.UtcNow;
        var setting = await context.SystemSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.Key == VietQrSettingsKey, cancellationToken);

        if (setting == null)
        {
            setting = new SystemSetting
            {
                Id = Guid.NewGuid(),
                TenantId = SysTenant.DefaultTenantId,
                Key = VietQrSettingsKey,
                Category = "Billing",
                Description = "VietQR beneficiary account",
                CreatedAt = now
            };
            context.SystemSettings.Add(setting);
        }

        setting.Value = JsonSerializer.Serialize(settings);
        setting.TenantId = SysTenant.DefaultTenantId;
        setting.Category = "Billing";
        setting.Description = "VietQR beneficiary account";
        setting.IsDeleted = false;
        setting.DeletedAt = null;
        setting.DeletedBy = null;
        setting.UpdatedAt = now;
        var actorName = await GetActorNameAsync(actorId, cancellationToken);
        context.SysAuditLogs.Add(new SysAuditLog
        {
            TenantId = SysTenant.DefaultTenantId,
            TableName = "SystemSettings",
            ActionType = "VIETQR_SETTINGS_UPDATED",
            RecordId = setting.PublicId.ToString(),
            UserId = actorId,
            Username = actorName,
            FunctionCode = "BILLING.CONFIGURE",
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new { setting.Key }),
            CreatedAt = now
        });
        await context.SaveChangesAsync(cancellationToken);

        return ToResponse(settings);
    }

    public VietQrPaymentResponse PreviewVietQr(UpdateVietQrSettingsRequest request)
    {
        var settings = NormalizeAndValidateSettings(new VietQrSettings
        {
            BankId = request.BankId,
            AccountNo = request.AccountNo,
            AccountName = request.AccountName,
            MerchantCity = request.MerchantCity
        });
        return vietQrGenerator.Generate("TEST-10000", 10_000m, settings);
    }

    public async Task<TenantBillingInvoiceResponse?> MarkPaidAsync(
        Guid invoiceId,
        string paymentReference,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(paymentReference) || paymentReference.Trim().Length > 100)
            throw new ArgumentException("Mã tham chiếu thanh toán không hợp lệ.", nameof(paymentReference));

        var result = await ApplyInvoicePaymentAsync(
            invoiceId,
            null,
            null,
            paymentReference,
            actorId,
            ipAddress,
            allowDuplicate: false,
            cancellationToken);
        return result.Invoice;
    }

    public async Task<PaymentWebhookProcessResult> ProcessPaymentWebhookAsync(
        string invoiceNumber,
        decimal amountVnd,
        string paymentReference,
        CancellationToken cancellationToken)
    {
        if (amountVnd <= 0 || decimal.Truncate(amountVnd) != amountVnd)
            return new PaymentWebhookProcessResult("amount_mismatch", invoiceNumber, null);
        if (string.IsNullOrWhiteSpace(paymentReference) || paymentReference.Trim().Length > 100)
            throw new ArgumentException("Mã giao dịch ngân hàng không hợp lệ.", nameof(paymentReference));

        var result = await ApplyInvoicePaymentAsync(
            null,
            invoiceNumber,
            amountVnd,
            paymentReference,
            null,
            null,
            allowDuplicate: true,
            cancellationToken);
        return new PaymentWebhookProcessResult(result.Status, result.Invoice?.InvoiceNumber, result.Invoice);
    }

    private async Task<(string Status, TenantBillingInvoiceResponse? Invoice)> ApplyInvoicePaymentAsync(
        Guid? invoiceId,
        string? invoiceNumber,
        decimal? receivedAmountVnd,
        string paymentReference,
        Guid? actorId,
        string? ipAddress,
        bool allowDuplicate,
        CancellationToken cancellationToken)
    {
        IDbContextTransaction? transaction = null;
        if (context.Database.IsRelational())
            transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        try
        {
            var invoiceQuery = context.SysTenantBillingInvoices
                .IgnoreQueryFilters()
                .Include(item => item.Tenant)
                .Where(item => !item.IsDeleted);
            var invoice = invoiceId.HasValue
                ? await invoiceQuery.FirstOrDefaultAsync(item => item.PublicId == invoiceId.Value, cancellationToken)
                : await invoiceQuery.FirstOrDefaultAsync(item => item.InvoiceNumber == invoiceNumber, cancellationToken);

            if (invoice == null)
                return ("unmatched_invoice", null);

            if (invoice.Status == TenantBillingInvoiceStatus.Paid)
                return allowDuplicate
                    ? ("duplicate", ToResponse(invoice))
                    : throw new InvalidOperationException("Hóa đơn đã được xác nhận thanh toán.");

            if (invoice.Status is not (TenantBillingInvoiceStatus.PendingPayment or TenantBillingInvoiceStatus.Overdue))
                return allowDuplicate
                    ? ("invoice_not_payable", ToResponse(invoice))
                    : throw new InvalidOperationException("Chỉ hóa đơn đang chờ thanh toán hoặc quá hạn mới được xác nhận.");

            if (receivedAmountVnd.HasValue && receivedAmountVnd.Value < invoice.AmountVnd)
                return ("amount_mismatch", ToResponse(invoice));

            var now = DateTime.UtcNow;
            var reference = paymentReference.Trim();
            if (context.Database.IsRelational())
            {
                var claimed = await context.SysTenantBillingInvoices
                    .IgnoreQueryFilters()
                    .Where(item => item.PublicId == invoice.PublicId
                        && !item.IsDeleted
                        && (item.Status == TenantBillingInvoiceStatus.PendingPayment
                            || item.Status == TenantBillingInvoiceStatus.Overdue))
                    .ExecuteUpdateAsync(
                        setters => setters
                            .SetProperty(item => item.Status, TenantBillingInvoiceStatus.Paid)
                            .SetProperty(item => item.PaidAt, now)
                            .SetProperty(item => item.PaymentReference, reference),
                        cancellationToken);

                if (claimed == 0)
                {
                    context.Entry(invoice).State = EntityState.Detached;
                    var current = await context.SysTenantBillingInvoices
                        .IgnoreQueryFilters()
                        .AsNoTracking()
                        .Include(item => item.Tenant)
                        .FirstOrDefaultAsync(item => item.PublicId == invoice.PublicId && !item.IsDeleted, cancellationToken);
                    return current?.Status == TenantBillingInvoiceStatus.Paid && allowDuplicate
                        ? ("duplicate", ToResponse(current))
                        : allowDuplicate
                            ? ("invoice_not_payable", current == null ? null : ToResponse(current))
                            : throw new InvalidOperationException("Hóa đơn đã được cập nhật bởi một thao tác khác.");
                }

                context.Entry(invoice).State = EntityState.Detached;
                invoice = await invoiceQuery.FirstAsync(item => item.PublicId == invoice.PublicId, cancellationToken);
            }
            else
            {
                invoice.Status = TenantBillingInvoiceStatus.Paid;
                invoice.PaidAt = now;
                invoice.PaymentReference = reference;
            }

            var licenseTier = ParsePlan(invoice.PlanCode);
            var license = await context.SysTenantLicenses
                .IgnoreQueryFilters()
                .Where(item => item.TenantId == invoice.TenantId && !item.IsDeleted)
                .OrderByDescending(item => item.IsActive)
                .ThenByDescending(item => item.ValidFrom)
                .ThenByDescending(item => item.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (license == null)
            {
                license = new SysTenantLicense
                {
                    TenantId = invoice.TenantId,
                    LicenseTier = licenseTier,
                    MaxStudentsQuota = invoice.MaxStudentsQuota,
                    MaxLecturersQuota = invoice.MaxLecturersQuota,
                    StorageQuotaBytes = invoice.StorageQuotaBytes,
                    CurrentStorageBytes = 0,
                    ValidFrom = now,
                    ValidTo = now.AddMonths(invoice.BillingCycleMonths),
                    IsActive = true
                };
                context.SysTenantLicenses.Add(license);
            }
            else
            {
                var renewalAnchor = license.IsActive && license.ValidTo > now ? license.ValidTo : now;
                license.LicenseTier = licenseTier;
                license.MaxStudentsQuota = invoice.MaxStudentsQuota;
                license.MaxLecturersQuota = invoice.MaxLecturersQuota;
                license.StorageQuotaBytes = invoice.StorageQuotaBytes;
                license.ValidFrom = license.IsActive && license.ValidFrom < now ? license.ValidFrom : now;
                license.ValidTo = renewalAnchor.AddMonths(invoice.BillingCycleMonths);
                license.IsActive = true;
            }

            if (invoice.Tenant?.Status is TenantStatus.Expired or TenantStatus.Trial)
                invoice.Tenant.Status = TenantStatus.Active;

            var actorName = actorId.HasValue
                ? await GetActorNameAsync(actorId.Value, cancellationToken)
                : "BANK_WEBHOOK";
            context.SysAuditLogs.Add(new SysAuditLog
            {
                TenantId = invoice.TenantId,
                TableName = "Sys_TenantBillingInvoices",
                ActionType = "BILLING_INVOICE_PAID",
                RecordId = invoice.PublicId.ToString(),
                UserId = actorId,
                Username = actorName,
                FunctionCode = actorId.HasValue ? "BILLING" : "BILLING.WEBHOOK",
                IpAddress = ipAddress,
                NewValuesJson = JsonSerializer.Serialize(new
                {
                    invoice.InvoiceNumber,
                    invoice.PaymentReference,
                    invoice.PaidAt
                }),
                CreatedAt = now
            });

            await context.SaveChangesAsync(cancellationToken);
            if (transaction != null)
                await transaction.CommitAsync(cancellationToken);

            return ("paid", ToResponse(invoice));
        }
        finally
        {
            if (transaction != null)
                await transaction.DisposeAsync();
        }
    }

    private async Task<string?> GetActorNameAsync(Guid actorId, CancellationToken cancellationToken) =>
        await context.Users.IgnoreQueryFilters()
            .Where(user => user.PublicId == actorId)
            .Select(user => user.Username)
            .FirstOrDefaultAsync(cancellationToken);

    private async Task<VietQrSettings> LoadVietQrSettingsAsync(CancellationToken cancellationToken)
    {
        var storedValue = await context.SystemSettings
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => item.Key == VietQrSettingsKey && !item.IsDeleted)
            .Select(item => item.Value)
            .FirstOrDefaultAsync(cancellationToken);
        if (storedValue == null)
            return vietQrOptions.Value;

        return JsonSerializer.Deserialize<VietQrSettings>(storedValue)
            ?? throw new InvalidOperationException("Cấu hình VietQR trong SystemSettings không hợp lệ.");
    }

    private static VietQrSettings NormalizeAndValidateSettings(VietQrSettings settings)
    {
        var bankId = settings.BankId.Trim();
        var accountNo = settings.AccountNo.Trim();
        var accountName = NormalizeAsciiUpper(settings.AccountName);
        var merchantCity = NormalizeAsciiUpper(settings.MerchantCity);

        if (bankId.Length != 6 || !bankId.All(char.IsAsciiDigit))
            throw new ArgumentException("Mã BIN ngân hàng phải gồm đúng 6 chữ số.");
        if (accountNo.Length is < 1 or > 19 || !accountNo.All(char.IsAsciiLetterOrDigit))
            throw new ArgumentException("Số tài khoản phải có từ 1 đến 19 ký tự chữ hoặc số.");
        if (!IsValidAscii(accountName, 25))
            throw new ArgumentException("Tên chủ tài khoản phải có tối đa 25 ký tự ASCII.");
        if (!IsValidAscii(merchantCity, 15))
            throw new ArgumentException("Tỉnh/thành phố phải có tối đa 15 ký tự ASCII.");

        return new VietQrSettings
        {
            BankId = bankId,
            AccountNo = accountNo,
            AccountName = accountName,
            MerchantCity = merchantCity
        };
    }

    private static string NormalizeAsciiUpper(string value)
    {
        var decomposed = value.Trim()
            .Replace('đ', 'd')
            .Replace('Đ', 'D')
            .Normalize(NormalizationForm.FormD);
        var asciiBaseCharacters = decomposed
            .Where(character => CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
            .ToArray();
        return new string(asciiBaseCharacters).Normalize(NormalizationForm.FormC).ToUpperInvariant();
    }

    private static bool IsValidAscii(string value, int maxLength) =>
        !string.IsNullOrWhiteSpace(value)
        && value.Length <= maxLength
        && value.All(character => character is >= ' ' and <= '~');

    private static VietQrSettingsResponse ToResponse(VietQrSettings settings) =>
        new(settings.BankId, settings.AccountNo, settings.AccountName, settings.MerchantCity);

    private static TenantBillingInvoiceResponse ToResponse(SysTenantBillingInvoice invoice) =>
        new(
            invoice.PublicId,
            invoice.TenantId,
            invoice.Tenant?.Name ?? string.Empty,
            invoice.Tenant?.TenantCode ?? string.Empty,
            invoice.InvoiceNumber,
            invoice.PlanCode,
            BillingPlanNames.GetValueOrDefault(invoice.PlanCode, invoice.PlanCode),
            invoice.BaseAmountVnd,
            invoice.TaxRatePercent,
            invoice.TaxAmountVnd,
            invoice.AmountVnd,
            invoice.BillingCycleMonths,
            invoice.MaxStudentsQuota,
            invoice.MaxLecturersQuota,
            invoice.StorageQuotaBytes,
            invoice.Status.ToString(),
            invoice.PaymentMethod,
            ToOffset(invoice.CreatedAt),
            invoice.DueDate.HasValue ? ToOffset(invoice.DueDate.Value) : null,
            invoice.PaidAt.HasValue ? ToOffset(invoice.PaidAt.Value) : null,
            invoice.PaymentReference);

    private static BillingPlanOptionResponse ToPlanResponse(SysBillingPlan plan) =>
        new(
            plan.PlanCode,
            BillingPlanNames.GetValueOrDefault(plan.PlanCode, plan.PlanCode),
            (int)plan.LicenseTier,
            plan.MaxStudentsQuota,
            plan.MaxLecturersQuota,
            plan.StorageQuotaBytes);

    private static BillingPriceCatalogItemResponse ToPriceResponse(
        SysBillingPriceCatalog price,
        bool isUsedByInvoice,
        string planName)
    {
        var taxAmount = price.TaxRatePercent.HasValue
            ? CalculateTax(price.BaseAmountVnd, price.TaxRatePercent.Value)
            : (decimal?)null;
        return new BillingPriceCatalogItemResponse(
            price.PublicId,
            price.PlanCode,
            planName,
            price.BillingCycleMonths,
            price.BaseAmountVnd,
            price.TaxRatePercent,
            taxAmount,
            taxAmount.HasValue ? price.BaseAmountVnd + taxAmount.Value : null,
            ToOffset(price.EffectiveFrom),
            price.EffectiveTo.HasValue ? ToOffset(price.EffectiveTo.Value) : null,
            price.IsActive,
            isUsedByInvoice);
    }

    private async Task EnsureNoOverlappingPriceAsync(
        SysBillingPriceCatalog candidate,
        Guid? excludedId,
        CancellationToken cancellationToken)
    {
        if (!candidate.IsActive)
            return;

        var query = context.SysBillingPriceCatalogs
            .IgnoreQueryFilters()
            .Where(item => !item.IsDeleted
                && item.IsActive
                && item.PlanCode == candidate.PlanCode
                && item.BillingCycleMonths == candidate.BillingCycleMonths);
        if (excludedId.HasValue)
            query = query.Where(item => item.PublicId != excludedId.Value);

        var overlaps = await query.AnyAsync(item =>
            (!candidate.EffectiveTo.HasValue || item.EffectiveFrom < candidate.EffectiveTo.Value)
            && (!item.EffectiveTo.HasValue || item.EffectiveTo.Value > candidate.EffectiveFrom),
            cancellationToken);
        if (overlaps)
            throw new InvalidOperationException(
                "Khoảng hiệu lực bị trùng với một phiên bản giá đang hoạt động của cùng gói và chu kỳ.");
    }

    private static (string PlanCode, decimal BaseAmount, decimal TaxRate, DateTime EffectiveFrom, DateTime? EffectiveTo)
        ValidatePrice(
            string planCodeValue,
            int billingCycleMonths,
            decimal baseAmount,
            decimal taxRate,
            DateTimeOffset effectiveFromValue,
            DateTimeOffset? effectiveToValue)
    {
        var planCode = planCodeValue.Trim().ToUpperInvariant();
        if (!TryParsePlan(planCode, out _))
            throw new ArgumentException("Gói bản quyền không hợp lệ.");
        if (billingCycleMonths is not (12 or 24 or 36))
            throw new ArgumentException("Chu kỳ thanh toán chỉ được là 12, 24 hoặc 36 tháng.");
        if (baseAmount <= 0 || decimal.Truncate(baseAmount) != baseAmount)
            throw new ArgumentException("Đơn giá trước VAT phải là số VND nguyên dương.");
        if (taxRate is < 0 or > 100 || decimal.Round(taxRate, 2) != taxRate)
            throw new ArgumentException("Thuế suất VAT phải từ 0 đến 100 và tối đa 2 chữ số thập phân.");

        var effectiveFrom = effectiveFromValue.UtcDateTime;
        var effectiveTo = effectiveToValue?.UtcDateTime;
        if (effectiveTo.HasValue && effectiveTo.Value <= effectiveFrom)
            throw new ArgumentException("Ngày kết thúc hiệu lực phải sau ngày bắt đầu.");

        return (planCode, baseAmount, taxRate, effectiveFrom, effectiveTo);
    }

    private static decimal CalculateTax(decimal baseAmountVnd, decimal taxRatePercent) =>
        decimal.Round(baseAmountVnd * taxRatePercent / 100m, 0, MidpointRounding.AwayFromZero);

    private static DateTimeOffset ToOffset(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));

    private static bool TryParsePlan(string planCode, out LicenseTier tier)
    {
        tier = planCode switch
        {
            "STANDARD" => LicenseTier.Standard,
            "PRO" => LicenseTier.Professional,
            "ENTERPRISE" => LicenseTier.Enterprise,
            _ => (LicenseTier)0
        };
        return Enum.IsDefined(tier);
    }

    private static LicenseTier ParsePlan(string planCode) =>
        TryParsePlan(planCode.Trim().ToUpperInvariant(), out var tier)
            ? tier
            : throw new InvalidOperationException("Gói bản quyền của hóa đơn không hợp lệ.");
}

public sealed class VietQrPayloadGenerator : IVietQrPayloadGenerator
{
    private const string VietQrApplicationId = "A000000727";

    public VietQrPaymentResponse Generate(
        string invoiceNumber,
        decimal amountVnd,
        VietQrSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.BankId)
            || settings.BankId.Length != 6
            || !settings.BankId.All(char.IsAsciiDigit))
            throw new VietQrConfigurationException("Billing:VietQr:BankId phải là mã ngân hàng VietQR gồm 6 chữ số.");
        if (string.IsNullOrWhiteSpace(settings.AccountNo)
            || settings.AccountNo.Length > 19
            || !settings.AccountNo.All(char.IsAsciiLetterOrDigit))
            throw new VietQrConfigurationException("Billing:VietQr:AccountNo phải là mã tài khoản gồm tối đa 19 ký tự chữ hoặc số.");
        if (!IsValidAscii(settings.AccountName, 25))
            throw new VietQrConfigurationException("Billing:VietQr:AccountName phải có tối đa 25 ký tự ASCII.");
        if (!IsValidAscii(settings.MerchantCity, 15))
            throw new VietQrConfigurationException("Billing:VietQr:MerchantCity phải có tối đa 15 ký tự ASCII.");
        if (decimal.Truncate(amountVnd) != amountVnd || amountVnd <= 0)
            throw new ArgumentOutOfRangeException(nameof(amountVnd), "VietQR chỉ hỗ trợ số tiền VND nguyên dương.");

        var memo = $"ILPAY {invoiceNumber}";
        if (!IsValidAscii(invoiceNumber, 19) || memo.Length > 25)
            throw new ArgumentException("Mã hóa đơn không thể biểu diễn trong nội dung VietQR.", nameof(invoiceNumber));

        var beneficiaryAccount = Tlv("00", settings.BankId)
            + Tlv("01", settings.AccountNo);
        var merchantAccountInfo = Tlv("00", VietQrApplicationId)
            + Tlv("01", beneficiaryAccount)
            + Tlv("02", "QRIBFTTA");
        var additionalData = Tlv("08", memo);
        var payloadWithoutCrc = Tlv("00", "01")
            + Tlv("01", "12")
            + Tlv("38", merchantAccountInfo)
            + Tlv("52", "0000")
            + Tlv("53", "704")
            + Tlv("54", amountVnd.ToString("0", CultureInfo.InvariantCulture))
            + Tlv("58", "VN")
            + Tlv("59", settings.AccountName.Trim())
            + Tlv("60", settings.MerchantCity.Trim())
            + Tlv("62", additionalData)
            + "6304";
        var payload = payloadWithoutCrc + CalculateCrc16(payloadWithoutCrc).ToString("X4", CultureInfo.InvariantCulture);

        return new VietQrPaymentResponse(
            payload,
            settings.BankId,
            settings.AccountNo,
            settings.AccountName.Trim(),
            amountVnd,
            memo);
    }

    private static string Tlv(string tag, string value)
    {
        if (value.Length > 99)
            throw new ArgumentException($"EMVCo field {tag} exceeds the 99-character limit.", nameof(value));
        return tag + value.Length.ToString("D2", CultureInfo.InvariantCulture) + value;
    }

    private static bool IsValidAscii(string? value, int maxLength) =>
        !string.IsNullOrWhiteSpace(value)
        && value.Length <= maxLength
        && value.All(character => character is >= ' ' and <= '~');

    private static ushort CalculateCrc16(string value)
    {
        ushort crc = 0xFFFF;
        foreach (var character in Encoding.ASCII.GetBytes(value))
        {
            crc ^= (ushort)(character << 8);
            for (var bit = 0; bit < 8; bit++)
                crc = (ushort)((crc & 0x8000) != 0 ? (crc << 1) ^ 0x1021 : crc << 1);
        }

        return crc;
    }
}

public sealed class VietQrConfigurationException(string message) : InvalidOperationException(message);
