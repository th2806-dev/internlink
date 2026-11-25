using System.ComponentModel.DataAnnotations;

namespace InternLink.Application.DTOs;

/// <summary>Payload for creating a tenant license invoice.</summary>
public sealed record CreateTenantBillingInvoiceRequest
{
    [Required]
    public required Guid TenantId { get; init; }

    [Required, RegularExpression("(?i)^(STANDARD|PRO|ENTERPRISE)$")]
    public required string PlanCode { get; init; }

    [Range(1, 36)]
    public required int BillingCycleMonths { get; init; }

    [Required, RegularExpression("(?i)^(VietQR|BankTransfer)$")]
    public required string PaymentMethod { get; init; }

    public DateTimeOffset? DueDate { get; init; }
}

/// <summary>Payload for creating a new effective-dated license price.</summary>
public sealed record CreateBillingPriceCatalogRequest
{
    [Required, RegularExpression("(?i)^(STANDARD|PRO|ENTERPRISE)$")]
    public required string PlanCode { get; init; }

    [Range(12, 36)]
    public required int BillingCycleMonths { get; init; }

    [Range(typeof(decimal), "1", "999999999999999")]
    public required decimal BaseAmountVnd { get; init; }

    [Range(typeof(decimal), "0", "100")]
    public required decimal TaxRatePercent { get; init; }

    /// <summary>Inclusive UTC start of the price's effective period.</summary>
    public required DateTimeOffset EffectiveFrom { get; init; }

    /// <summary>Exclusive UTC end of the effective period; null means no end.</summary>
    public DateTimeOffset? EffectiveTo { get; init; }
}

/// <summary>Payload for updating a price version without altering issued invoice snapshots.</summary>
public sealed record UpdateBillingPriceCatalogRequest
{
    [Required, RegularExpression("(?i)^(STANDARD|PRO|ENTERPRISE)$")]
    public required string PlanCode { get; init; }

    [Range(12, 36)]
    public required int BillingCycleMonths { get; init; }

    [Range(typeof(decimal), "1", "999999999999999")]
    public required decimal BaseAmountVnd { get; init; }

    [Range(typeof(decimal), "0", "100")]
    public required decimal TaxRatePercent { get; init; }

    /// <summary>Inclusive UTC start of the price's effective period.</summary>
    public required DateTimeOffset EffectiveFrom { get; init; }

    /// <summary>Exclusive UTC end of the effective period; null means no end.</summary>
    public DateTimeOffset? EffectiveTo { get; init; }
    public required bool IsActive { get; init; }
}

/// <summary>One platform plan and its standard license quotas.</summary>
public sealed record BillingPlanOptionResponse(
    string Code,
    string Name,
    int LicenseTier,
    int MaxStudentsQuota,
    int MaxLecturersQuota,
    long StorageQuotaBytes);

/// <summary>Plan quota values that apply to invoices created after the update.</summary>
public sealed record UpdateBillingPlanRequest
{
    [Range(1, int.MaxValue)]
    public required int MaxStudentsQuota { get; init; }

    [Range(1, int.MaxValue)]
    public required int MaxLecturersQuota { get; init; }

    [Range(1, long.MaxValue)]
    public required long StorageQuotaBytes { get; init; }
}

/// <summary>A configured price version and its effective tax-inclusive total.</summary>
public sealed record BillingPriceCatalogItemResponse(
    Guid Id,
    string PlanCode,
    string PlanName,
    int BillingCycleMonths,
    decimal BaseAmountVnd,
    decimal? TaxRatePercent,
    decimal? TaxAmountVnd,
    decimal? TotalAmountVnd,
    DateTimeOffset EffectiveFrom,
    DateTimeOffset? EffectiveTo,
    bool IsActive,
    bool IsUsedByInvoice);

/// <summary>Pricing catalog, plan options, and supported billing cycles.</summary>
public sealed record BillingPriceCatalogResponse(
    IReadOnlyList<BillingPlanOptionResponse> Plans,
    IReadOnlyList<int> BillingCycleOptions,
    IReadOnlyList<BillingPriceCatalogItemResponse> Items);

/// <summary>Request to mark a tenant invoice as paid.</summary>
public sealed record MarkTenantBillingInvoicePaidRequest
{
    [Required, MaxLength(100)]
    public required string PaymentReference { get; init; }
}

/// <summary>Invoice details shown in the platform billing console.</summary>
public sealed record TenantBillingInvoiceResponse(
    Guid Id,
    Guid TenantId,
    string TenantName,
    string TenantCode,
    string InvoiceNumber,
    string PlanCode,
    string PlanName,
    decimal BaseAmountVnd,
    decimal TaxRatePercent,
    decimal TaxAmountVnd,
    decimal AmountVnd,
    int BillingCycleMonths,
    int MaxStudentsQuota,
    int MaxLecturersQuota,
    long StorageQuotaBytes,
    string Status,
    string PaymentMethod,
    DateTimeOffset CreatedAt,
    DateTimeOffset? DueDate,
    DateTimeOffset? PaidAt,
    string? PaymentReference);

/// <summary>A page of tenant billing invoices.</summary>
public sealed record TenantBillingInvoicePageResponse(
    IReadOnlyList<TenantBillingInvoiceResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    BillingInvoiceSummaryResponse Summary);

/// <summary>Aggregated invoice metrics for the billing console.</summary>
public sealed record BillingInvoiceSummaryResponse(
    int TotalCount,
    int PendingCount,
    int PaidCount,
    int OverdueCount,
    int CancelledCount,
    decimal TotalAmountVnd,
    decimal PaidAmountVnd,
    decimal OutstandingAmountVnd);

/// <summary>Normalized incoming bank transfer event used by the billing service.</summary>
public sealed record PaymentWebhookTransaction(
    string TransactionId,
    decimal AmountVnd,
    string Content,
    bool IsIncoming);

/// <summary>Invoice matching and payment result for one webhook transaction.</summary>
public sealed record PaymentWebhookProcessResult(
    string Status,
    string? InvoiceNumber,
    TenantBillingInvoiceResponse? Invoice);

/// <summary>One transaction result returned to the banking webhook provider.</summary>
public sealed record PaymentWebhookTransactionResult(
    string TransactionId,
    string Status,
    string? InvoiceNumber,
    bool ReceiptQueued = false);

/// <summary>Results for the transactions supplied by a bank webhook request.</summary>
public sealed record PaymentWebhookResponse(
    IReadOnlyList<PaymentWebhookTransactionResult> Results);

/// <summary>VietQR payment instructions generated for an invoice.</summary>
public sealed record VietQrPaymentResponse(
    string Payload,
    string BankId,
    string AccountNo,
    string AccountName,
    decimal AmountVnd,
    string Memo);

/// <summary>VietQR beneficiary account settings displayed to platform administrators.</summary>
public sealed record VietQrSettingsResponse(
    string BankId,
    string AccountNo,
    string AccountName,
    string MerchantCity);

/// <summary>Validated VietQR beneficiary account settings to persist.</summary>
public sealed record UpdateVietQrSettingsRequest
{
    [Required, RegularExpression(@"^\d{6}$")]
    public required string BankId { get; init; }

    [Required, RegularExpression(@"^[A-Za-z0-9]{1,19}$")]
    public required string AccountNo { get; init; }

    [Required, MaxLength(25)]
    public required string AccountName { get; init; }

    [Required, MaxLength(15)]
    public required string MerchantCity { get; init; }
}

/// <summary>Payload for opening a time-limited tenant support session.</summary>
public sealed record StartTenantImpersonationRequest
{
    [Required, MaxLength(1000)]
    public required string Reason { get; init; }
}

/// <summary>Temporary tenant support token and verified tenant identity.</summary>
public sealed record TenantImpersonationResponse(
    Guid SessionId,
    string Token,
    DateTimeOffset ExpiresAt,
    Guid TenantId,
    string TenantName,
    string TenantCode);

/// <summary>Confirmation that a tenant support session was ended.</summary>
public sealed record EndTenantImpersonationResponse(
    Guid SessionId,
    DateTimeOffset EndedAt);
