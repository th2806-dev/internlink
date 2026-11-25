namespace InternLink.Application.DTOs;

/// <summary>Public application branding displayed across login and portal surfaces.</summary>
public sealed record AppBrandingResponse(
    string AppName,
    string AppShortName,
    string BrowserTitle,
    string CopyrightText,
    string AppUrl,
    string AppLogoUrl,
    string AppFaviconUrl,
    string AppPrimaryColor,
    string CompanyName,
    string CompanyTaxCode,
    string CompanyAddress,
    string CompanyHotline,
    string BillingEmail);
