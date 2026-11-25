namespace InternLink.Application.DTOs;

/// <summary>A display option from a platform-owned system catalog.</summary>
public sealed record SystemCatalogOption(
    string Value,
    string Label,
    string? LogoUrl = null);

/// <summary>Shared platform catalogs used by SuperAdmin comboboxes.</summary>
public sealed record SystemCatalogResponse(
    IReadOnlyList<SystemCatalogOption> VietQrBanks,
    IReadOnlyList<SystemCatalogOption> BillingPlans,
    IReadOnlyList<int> BillingCycles,
    IReadOnlyList<SystemCatalogOption> PaymentMethods,
    IReadOnlyList<SystemCatalogOption> AnnouncementTypes,
    IReadOnlyList<SystemCatalogOption> AnnouncementAudiences);
