using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class SystemTenantSsoService : ISystemTenantSsoService
{
    public const string DiscoveryHttpClientName = "system-sso-discovery";
    private const string SecretProtectorPurpose = "InternLink.SystemTenantSso.ClientSecret.v1";
    private const int MaxDiscoveryDocumentBytes = 1_048_576;
    private static readonly HashSet<string> SupportedProviders = new(StringComparer.OrdinalIgnoreCase)
    {
        "AzureAD",
        "GoogleWorkspace",
        "SAML2",
        "CAS_LDAP"
    };
    private static readonly HashSet<string> OidcProviders = new(StringComparer.OrdinalIgnoreCase)
    {
        "AzureAD",
        "GoogleWorkspace"
    };

    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IDataProtector _secretProtector;

    public SystemTenantSsoService(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        IDataProtectionProvider dataProtectionProvider)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _secretProtector = dataProtectionProvider.CreateProtector(SecretProtectorPurpose);
    }

    public async Task<TenantSsoConfigurationResponse?> GetConfigurationAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        if (!await TenantExistsAsync(tenantId, cancellationToken))
            return null;

        var config = await _context.SysTenantSsoConfigs.IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.TenantId == tenantId && !item.IsDeleted, cancellationToken);
        return config == null ? EmptyConfiguration(tenantId) : Map(config);
    }

    public async Task<TenantSsoConfigurationResponse?> SaveConfigurationAsync(
        Guid tenantId,
        UpdateTenantSsoConfigurationRequest request,
        CancellationToken cancellationToken)
    {
        if (!await TenantExistsAsync(tenantId, cancellationToken))
            return null;

        var provider = NormalizeProvider(request.ProviderType);
        var clientId = request.ClientId.Trim();
        var discoveryUrl = ValidateDiscoveryUrl(request.DiscoveryUrl);
        var domains = NormalizeAllowedDomains(request.AllowedEmailDomains);
        var config = await _context.SysTenantSsoConfigs.IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.TenantId == tenantId && !item.IsDeleted, cancellationToken);
        var hasStoredSecret = config != null && !string.IsNullOrWhiteSpace(config.EncryptedClientSecret);
        var hasSubmittedSecret = !string.IsNullOrWhiteSpace(request.ClientSecret);

        if (request.IsEnforced
            && (string.IsNullOrWhiteSpace(clientId)
                || domains.Count == 0
                || !(hasSubmittedSecret || hasStoredSecret)))
        {
            throw new ArgumentException("Cần có Client ID, Client Secret và ít nhất một domain email trước khi bắt buộc SSO.");
        }

        if (config == null)
        {
            config = new SysTenantSsoConfig { TenantId = tenantId };
            _context.SysTenantSsoConfigs.Add(config);
        }

        config.ProviderType = provider;
        config.ClientId = clientId;
        if (hasSubmittedSecret)
            config.EncryptedClientSecret = _secretProtector.Protect(request.ClientSecret!.Trim());
        else if (!hasStoredSecret)
            config.EncryptedClientSecret = string.Empty;
        config.DiscoveryUrl = discoveryUrl;
        config.AllowedEmailDomains = JsonSerializer.Serialize(domains);
        config.IsEnforced = request.IsEnforced;
        config.IsDeleted = false;
        config.DeletedAt = null;
        config.DeletedBy = null;
        await _context.SaveChangesAsync(cancellationToken);

        return Map(config);
    }

    public async Task<TenantSsoDiscoveryTestResponse?> TestDiscoveryAsync(
        Guid tenantId,
        TestTenantSsoDiscoveryRequest request,
        CancellationToken cancellationToken)
    {
        if (!await TenantExistsAsync(tenantId, cancellationToken))
            return null;

        var provider = NormalizeProvider(request.ProviderType);
        if (!OidcProviders.Contains(provider))
        {
            return new TenantSsoDiscoveryTestResponse(
                false,
                "Kiểm tra OIDC Discovery chỉ hỗ trợ Azure AD và Google Workspace.",
                null);
        }

        var discoveryUrl = ValidateDiscoveryUrl(request.DiscoveryUrl);
        using var httpRequest = new HttpRequestMessage(HttpMethod.Get, discoveryUrl);
        httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        try
        {
            using var response = await _httpClientFactory.CreateClient(DiscoveryHttpClientName)
                .SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return new TenantSsoDiscoveryTestResponse(
                    false,
                    $"Identity Provider trả về HTTP {(int)response.StatusCode}.",
                    null);
            }

            var document = await ReadDiscoveryDocumentAsync(response.Content, cancellationToken);
            using var json = JsonDocument.Parse(document);
            if (!TryGetHttpsEndpoint(json.RootElement, "issuer", out var issuer)
                || !TryGetHttpsEndpoint(json.RootElement, "authorization_endpoint", out _)
                || !TryGetHttpsEndpoint(json.RootElement, "token_endpoint", out _)
                || !TryGetHttpsEndpoint(json.RootElement, "jwks_uri", out _))
            {
                return new TenantSsoDiscoveryTestResponse(
                    false,
                    "Discovery document thiếu issuer hoặc endpoint OIDC HTTPS bắt buộc.",
                    null);
            }

            return new TenantSsoDiscoveryTestResponse(true, "OIDC Discovery kết nối thành công.", issuer);
        }
        catch (HttpRequestException)
        {
            return new TenantSsoDiscoveryTestResponse(
                false,
                "Không thể kết nối Identity Provider. Hãy kiểm tra URL và khả năng truy cập công khai.",
                null);
        }
        catch (JsonException)
        {
            return new TenantSsoDiscoveryTestResponse(
                false,
                "Identity Provider không trả về Discovery document JSON hợp lệ.",
                null);
        }
        catch (InvalidDataException)
        {
            return new TenantSsoDiscoveryTestResponse(
                false,
                "Discovery document vượt quá giới hạn kích thước cho phép.",
                null);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return new TenantSsoDiscoveryTestResponse(
                false,
                "Identity Provider phản hồi quá thời gian cho phép.",
                null);
        }
    }

    public async Task<bool?> DeleteConfigurationAsync(
        Guid tenantId,
        string? deletedBy,
        CancellationToken cancellationToken)
    {
        if (!await TenantExistsAsync(tenantId, cancellationToken))
            return null;

        var config = await _context.SysTenantSsoConfigs.IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.TenantId == tenantId && !item.IsDeleted, cancellationToken);
        if (config == null)
            return false;

        config.IsDeleted = true;
        config.DeletedAt = DateTime.UtcNow;
        config.DeletedBy = string.IsNullOrWhiteSpace(deletedBy) ? "system" : deletedBy.Trim();
        config.IsEnforced = false;
        config.EncryptedClientSecret = string.Empty;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<bool> TenantExistsAsync(Guid tenantId, CancellationToken cancellationToken) =>
        await _context.SysTenants.IgnoreQueryFilters()
            .AnyAsync(item => item.PublicId == tenantId && !item.IsDeleted, cancellationToken);

    private TenantSsoConfigurationResponse Map(SysTenantSsoConfig config)
    {
        var hasSecret = !string.IsNullOrWhiteSpace(config.EncryptedClientSecret);
        return new TenantSsoConfigurationResponse(
            config.TenantId,
            true,
            config.ProviderType,
            config.ClientId,
            hasSecret ? "••••••••" : string.Empty,
            hasSecret,
            config.DiscoveryUrl,
            DeserializeDomains(config.AllowedEmailDomains),
            config.IsEnforced,
            config.UpdatedAt.HasValue ? ToOffset(config.UpdatedAt.Value) : null);
    }

    private static TenantSsoConfigurationResponse EmptyConfiguration(Guid tenantId) =>
        new(tenantId, false, "AzureAD", string.Empty, string.Empty, false, string.Empty, [], false, null);

    private static string NormalizeProvider(string? providerType)
    {
        var provider = providerType?.Trim();
        if (string.IsNullOrWhiteSpace(provider)
            || !SupportedProviders.TryGetValue(provider, out var canonical))
        {
            throw new ArgumentException("ProviderType không được hỗ trợ.");
        }

        return canonical;
    }

    private static string ValidateDiscoveryUrl(string? discoveryUrl)
    {
        if (!Uri.TryCreate(discoveryUrl?.Trim(), UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || string.IsNullOrWhiteSpace(uri.Host)
            || !string.IsNullOrEmpty(uri.UserInfo)
            || !string.IsNullOrEmpty(uri.Fragment))
        {
            throw new ArgumentException("Discovery endpoint phải là URL HTTPS hợp lệ, không chứa thông tin đăng nhập hoặc fragment.");
        }

        return uri.AbsoluteUri;
    }

    private static IReadOnlyList<string> NormalizeAllowedDomains(IEnumerable<string>? domains)
    {
        if (domains == null)
            throw new ArgumentException("Cần khai báo ít nhất một domain email được phép.");

        var normalized = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var value in domains)
        {
            var domain = value.Trim().TrimStart('@').TrimEnd('.').ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(domain))
                continue;

            try
            {
                domain = new IdnMapping().GetAscii(domain);
            }
            catch (ArgumentException)
            {
                throw new ArgumentException($"Email domain '{value}' không hợp lệ.");
            }

            if (Uri.CheckHostName(domain) != UriHostNameType.Dns)
                throw new ArgumentException($"Email domain '{value}' không hợp lệ.");
            normalized.Add(domain);
        }

        if (normalized.Count == 0 || normalized.Sum(item => item.Length) + normalized.Count > 1000)
            throw new ArgumentException("Cần từ 1 đến 20 domain email hợp lệ.");
        if (normalized.Count > 20)
            throw new ArgumentException("Chỉ được khai báo tối đa 20 domain email.");

        return normalized.Order(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    private static IReadOnlyList<string> DeserializeDomains(string storedDomains)
    {
        try
        {
            return JsonSerializer.Deserialize<string[]>(storedDomains) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static async Task<byte[]> ReadDiscoveryDocumentAsync(
        HttpContent content,
        CancellationToken cancellationToken)
    {
        if (content.Headers.ContentLength > MaxDiscoveryDocumentBytes)
            throw new InvalidDataException();

        await using var source = await content.ReadAsStreamAsync(cancellationToken);
        using var destination = new MemoryStream();
        var buffer = new byte[8192];
        while (true)
        {
            var read = await source.ReadAsync(buffer, cancellationToken);
            if (read == 0)
                return destination.ToArray();
            if (destination.Length + read > MaxDiscoveryDocumentBytes)
                throw new InvalidDataException();
            await destination.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
        }
    }

    private static bool TryGetHttpsEndpoint(
        JsonElement document,
        string propertyName,
        out string value)
    {
        value = string.Empty;
        if (!document.TryGetProperty(propertyName, out var property)
            || property.ValueKind != JsonValueKind.String
            || string.IsNullOrWhiteSpace(property.GetString())
            || !Uri.TryCreate(property.GetString(), UriKind.Absolute, out var endpoint)
            || endpoint.Scheme != Uri.UriSchemeHttps
            || !string.IsNullOrEmpty(endpoint.UserInfo))
        {
            return false;
        }

        value = endpoint.AbsoluteUri;
        return true;
    }

    private static DateTimeOffset ToOffset(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
