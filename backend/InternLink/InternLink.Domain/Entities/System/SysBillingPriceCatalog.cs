using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.System;

public sealed class SysBillingPriceCatalog : BaseEntity
{
    public string PlanCode { get; set; } = string.Empty;
    public int BillingCycleMonths { get; set; }
    public decimal BaseAmountVnd { get; set; }
    public decimal? TaxRatePercent { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<SysTenantBillingInvoice> Invoices { get; set; } = new List<SysTenantBillingInvoice>();
}
