using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.System;

public enum TenantBillingInvoiceStatus
{
    PendingPayment = 0,
    Paid = 1,
    Cancelled = 2,
    Overdue = 3
}

public sealed class SysTenantBillingInvoice : TenantScopedEntity
{
    public SysTenant? Tenant { get; set; }
    public SysBillingPriceCatalog? BillingPriceCatalog { get; set; }
    public Guid? BillingPriceCatalogId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string PlanCode { get; set; } = string.Empty;
    public decimal BaseAmountVnd { get; set; }
    public decimal TaxRatePercent { get; set; }
    public decimal TaxAmountVnd { get; set; }
    public decimal AmountVnd { get; set; }
    public int BillingCycleMonths { get; set; }
    public int MaxStudentsQuota { get; set; }
    public int MaxLecturersQuota { get; set; }
    public long StorageQuotaBytes { get; set; }
    public TenantBillingInvoiceStatus Status { get; set; } = TenantBillingInvoiceStatus.PendingPayment;
    public string PaymentMethod { get; set; } = "VietQR";
    public DateTime? PaidAt { get; set; }
    public string? PaymentReference { get; set; }
    public DateTime? DueDate { get; set; }
}
