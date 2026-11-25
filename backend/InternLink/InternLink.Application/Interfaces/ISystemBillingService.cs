using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISystemBillingService
{
    Task<BillingPriceCatalogResponse> GetBillingPriceCatalogAsync(
        bool currentOnly,
        CancellationToken cancellationToken);

    Task<BillingPriceCatalogItemResponse?> GetBillingPriceCatalogItemAsync(
        Guid id,
        CancellationToken cancellationToken);

    Task<BillingPlanOptionResponse?> UpdateBillingPlanAsync(
        string planCode,
        UpdateBillingPlanRequest request,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken);

    Task<BillingPriceCatalogItemResponse> CreateBillingPriceCatalogItemAsync(
        CreateBillingPriceCatalogRequest request,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken);

    Task<BillingPriceCatalogItemResponse?> UpdateBillingPriceCatalogItemAsync(
        Guid id,
        UpdateBillingPriceCatalogRequest request,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken);

    Task<TenantBillingInvoicePageResponse> GetInvoicesAsync(
        Guid? tenantId,
        TenantBillingInvoiceStatusFilter? status,
        DateTimeOffset? fromDate,
        DateTimeOffset? toDate,
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<TenantBillingInvoiceResponse?> GetInvoiceAsync(Guid id, CancellationToken cancellationToken);

    Task<TenantBillingInvoiceResponse> CreateInvoiceAsync(
        CreateTenantBillingInvoiceRequest request,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken);

    Task<VietQrPaymentResponse?> GetVietQrAsync(Guid invoiceId, CancellationToken cancellationToken);

    Task<VietQrSettingsResponse> GetVietQrSettingsAsync(CancellationToken cancellationToken);

    Task<VietQrSettingsResponse> UpdateVietQrSettingsAsync(
        UpdateVietQrSettingsRequest request,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken);

    VietQrPaymentResponse PreviewVietQr(UpdateVietQrSettingsRequest request);

    Task<TenantBillingInvoiceResponse?> MarkPaidAsync(
        Guid invoiceId,
        string paymentReference,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken);

    Task<PaymentWebhookProcessResult> ProcessPaymentWebhookAsync(
        string invoiceNumber,
        decimal amountVnd,
        string paymentReference,
        CancellationToken cancellationToken);
}

public interface ITenantBillingNotificationService
{
    Task SendPaymentReceiptAsync(Guid invoiceId, CancellationToken cancellationToken);

    Task SendTenantAlertAsync(
        Guid tenantId,
        string title,
        string content,
        CancellationToken cancellationToken);
}

public interface IBillingPaymentReceiptQueue
{
    void QueuePaymentReceipt(Guid invoiceId);
}

public enum TenantBillingInvoiceStatusFilter
{
    PendingPayment = 0,
    Paid = 1,
    Cancelled = 2,
    Overdue = 3
}

public interface IVietQrPayloadGenerator
{
    VietQrPaymentResponse Generate(
        string invoiceNumber,
        decimal amountVnd,
        VietQrSettings settings);
}

public sealed class VietQrSettings
{
    public const string SectionName = "Billing:VietQr";

    public string BankId { get; set; } = string.Empty;
    public string AccountNo { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string MerchantCity { get; set; } = string.Empty;
}

public interface ITenantImpersonationService
{
    Task<TenantImpersonationResponse?> StartAsync(
        Guid tenantId,
        Guid actorId,
        string reason,
        string? ipAddress,
        CancellationToken cancellationToken);

    Task<EndTenantImpersonationResponse?> EndAsync(
        Guid sessionId,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken);

    Task<bool> IsSessionActiveAsync(Guid sessionId, Guid tenantId, CancellationToken cancellationToken);
}
