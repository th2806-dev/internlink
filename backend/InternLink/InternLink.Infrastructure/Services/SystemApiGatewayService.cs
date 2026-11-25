using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InternLink.Infrastructure.Services;

public sealed class SystemApiGatewayService : ISystemApiGatewayService
{
    public const string WebhookHttpClientName = "system-webhook";
    private const int MaxResponsePreviewLength = 4000;
    private const int MaxDeliveryAttempts = 10;

    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IDataProtector _webhookSecretProtector;
    private readonly ILogger<SystemApiGatewayService> _logger;

    public SystemApiGatewayService(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        IDataProtectionProvider dataProtectionProvider,
        ILogger<SystemApiGatewayService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _webhookSecretProtector = dataProtectionProvider.CreateProtector("InternLink.SystemApiGateway.WebhookSecret.v1");
        _logger = logger;
    }

    public async Task<IReadOnlyList<ApiKeyResponse>> GetApiKeysAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var keys = await _context.SysApiKeys.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted)
            .OrderByDescending(item => item.CreatedAt)
            .ToListAsync(cancellationToken);
        return keys.Select(MapApiKey).ToArray();
    }

    public async Task<ApiKeyResponse?> GetApiKeyAsync(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        var key = await FindApiKeyAsync(tenantId, id, cancellationToken);
        return key == null ? null : MapApiKey(key);
    }

    public async Task<ApiKeySecretResponse?> CreateApiKeyAsync(
        Guid tenantId,
        CreateApiKeyRequest request,
        CancellationToken cancellationToken)
    {
        if (!await TenantExistsAsync(tenantId, cancellationToken))
            return null;

        var scopes = NormalizeScopes(request.Scopes);
        ValidateApiKeyDetails(request.Name, scopes, request.RateLimitPerMinute, request.ExpiresAt);
        var (prefix, secret, hash) = CreateApiSecret();
        var now = DateTime.UtcNow;
        var key = new SysApiKey
        {
            TenantId = tenantId,
            Name = request.Name.Trim(),
            KeyPrefix = prefix,
            KeyHash = hash,
            ScopesJson = JsonSerializer.Serialize(scopes),
            RateLimitPerMinute = request.RateLimitPerMinute,
            ExpiresAt = request.ExpiresAt?.UtcDateTime,
            IsActive = true,
            CreatedAt = now
        };
        _context.SysApiKeys.Add(key);
        await _context.SaveChangesAsync(cancellationToken);
        return new ApiKeySecretResponse(MapApiKey(key), secret);
    }

    public async Task<ApiKeyResponse?> UpdateApiKeyAsync(
        Guid tenantId,
        Guid id,
        UpdateApiKeyRequest request,
        CancellationToken cancellationToken)
    {
        var key = await FindApiKeyAsync(tenantId, id, cancellationToken);
        if (key == null)
            return null;

        var scopes = NormalizeScopes(request.Scopes);
        ValidateApiKeyDetails(request.Name, scopes, request.RateLimitPerMinute, request.ExpiresAt);
        key.Name = request.Name.Trim();
        key.ScopesJson = JsonSerializer.Serialize(scopes);
        key.RateLimitPerMinute = request.RateLimitPerMinute;
        key.ExpiresAt = request.ExpiresAt?.UtcDateTime;
        key.IsActive = request.IsActive;
        key.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return MapApiKey(key);
    }

    public async Task<ApiKeySecretResponse?> RotateApiKeyAsync(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        var key = await FindApiKeyAsync(tenantId, id, cancellationToken);
        if (key == null)
            return null;

        var (prefix, secret, hash) = CreateApiSecret();
        key.KeyPrefix = prefix;
        key.KeyHash = hash;
        key.IsActive = true;
        key.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return new ApiKeySecretResponse(MapApiKey(key), secret);
    }

    public async Task<bool> DeleteApiKeyAsync(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        var key = await FindApiKeyAsync(tenantId, id, cancellationToken);
        if (key == null)
            return false;

        key.IsActive = false;
        key.IsDeleted = true;
        key.DeletedAt = DateTime.UtcNow;
        key.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<WebhookResponse>> GetWebhooksAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var webhooks = await _context.SysWebhooks.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted)
            .OrderByDescending(item => item.CreatedAt)
            .ToListAsync(cancellationToken);
        return webhooks.Select(MapWebhook).ToArray();
    }

    public async Task<WebhookResponse?> GetWebhookAsync(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        var webhook = await FindWebhookAsync(tenantId, id, cancellationToken);
        return webhook == null ? null : MapWebhook(webhook);
    }

    public async Task<CreateWebhookResponse?> CreateWebhookAsync(
        Guid tenantId,
        CreateWebhookRequest request,
        CancellationToken cancellationToken)
    {
        if (!await TenantExistsAsync(tenantId, cancellationToken))
            return null;

        var uri = await ValidateWebhookTargetAsync(request.Url, cancellationToken);
        var secret = $"whsec_{EncodeBase64Url(RandomNumberGenerator.GetBytes(32))}";
        var webhook = new SysWebhook
        {
            TenantId = tenantId,
            WebhookUrl = uri.AbsoluteUri,
            EventType = request.EventType.Trim(),
            SecretKey = _webhookSecretProtector.Protect(secret),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _context.SysWebhooks.Add(webhook);
        await _context.SaveChangesAsync(cancellationToken);
        return new CreateWebhookResponse(MapWebhook(webhook), secret);
    }

    public async Task<WebhookResponse?> UpdateWebhookAsync(
        Guid tenantId,
        Guid id,
        UpdateWebhookRequest request,
        CancellationToken cancellationToken)
    {
        var webhook = await FindWebhookAsync(tenantId, id, cancellationToken);
        if (webhook == null)
            return null;

        var uri = await ValidateWebhookTargetAsync(request.Url, cancellationToken);
        webhook.WebhookUrl = uri.AbsoluteUri;
        webhook.EventType = request.EventType.Trim();
        webhook.IsActive = request.IsActive;
        webhook.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return MapWebhook(webhook);
    }

    public async Task<bool> DeleteWebhookAsync(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        var webhook = await FindWebhookAsync(tenantId, id, cancellationToken);
        if (webhook == null)
            return false;

        _context.SysWebhooks.Remove(webhook);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<WebhookDeliveryResponse?> TestWebhookAsync(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        var webhook = await FindWebhookAsync(tenantId, id, cancellationToken);
        if (webhook == null)
            return null;
        if (!webhook.IsActive)
            throw new InvalidOperationException("Webhook đang bị tạm dừng.");

        await ValidateWebhookTargetAsync(webhook.WebhookUrl, cancellationToken);
        var deliveryId = Guid.NewGuid();
        var payload = JsonSerializer.Serialize(new
        {
            eventType = webhook.EventType,
            deliveryId,
            sentAt = DateTimeOffset.UtcNow,
            data = new { test = true }
        });
        return await DeliverAsync(webhook, deliveryId, 1, payload, cancellationToken);
    }

    public async Task<IReadOnlyList<WebhookDeliveryResponse>> GetDeadLettersAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var recentAttempts = await _context.SysWebhookDeliveryLogs.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted)
            .OrderByDescending(item => item.StartedAt)
            .Take(1000)
            .ToListAsync(cancellationToken);

        return recentAttempts
            .GroupBy(item => item.DeliveryId)
            .Select(group => group.OrderByDescending(item => item.AttemptNumber).First())
            .Where(item => item.Status == "Failed")
            .OrderByDescending(item => item.StartedAt)
            .Take(100)
            .Select(MapDelivery)
            .ToArray();
    }

    public async Task<WebhookDeliveryResponse?> RetryDeliveryAsync(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        var previousAttempt = await _context.SysWebhookDeliveryLogs.IgnoreQueryFilters()
            .AsNoTracking()
            .SingleOrDefaultAsync(item =>
                item.PublicId == id && item.TenantId == tenantId && !item.IsDeleted,
                cancellationToken);
        if (previousAttempt == null)
            return null;

        var latestAttempt = await _context.SysWebhookDeliveryLogs.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => item.TenantId == tenantId
                && item.DeliveryId == previousAttempt.DeliveryId
                && !item.IsDeleted)
            .OrderByDescending(item => item.AttemptNumber)
            .FirstOrDefaultAsync(cancellationToken);
        if (latestAttempt == null || latestAttempt.Status != "Failed")
            throw new InvalidOperationException("Chỉ có thể thử lại lần giao webhook thất bại gần nhất.");
        if (latestAttempt.AttemptNumber >= MaxDeliveryAttempts)
            throw new InvalidOperationException($"Delivery đã đạt giới hạn {MaxDeliveryAttempts} lần thử.");

        var webhook = await FindWebhookAsync(tenantId, latestAttempt.WebhookPublicId, cancellationToken);
        if (webhook == null)
            throw new InvalidOperationException("Webhook đã bị xóa hoặc không còn thuộc đơn vị này.");
        if (!webhook.IsActive)
            throw new InvalidOperationException("Webhook đang bị tạm dừng.");

        await ValidateWebhookTargetAsync(webhook.WebhookUrl, cancellationToken);
        return await DeliverAsync(
            webhook,
            latestAttempt.DeliveryId,
            latestAttempt.AttemptNumber + 1,
            latestAttempt.PayloadJson,
            cancellationToken);
    }

    internal static SocketsHttpHandler CreateWebhookHttpHandler() => new()
    {
        AllowAutoRedirect = false,
        PooledConnectionLifetime = TimeSpan.FromMinutes(1),
        ConnectCallback = ConnectToPublicAddressAsync
    };

    private async Task<WebhookDeliveryResponse> DeliverAsync(
        SysWebhook webhook,
        Guid deliveryId,
        int attemptNumber,
        string payload,
        CancellationToken cancellationToken)
    {
        var log = new SysWebhookDeliveryLog
        {
            TenantId = webhook.TenantId,
            WebhookPublicId = webhook.PublicId,
            DeliveryId = deliveryId,
            EventType = webhook.EventType,
            PayloadJson = payload,
            Status = "Pending",
            AttemptNumber = attemptNumber,
            StartedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        _context.SysWebhookDeliveryLogs.Add(log);
        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, webhook.WebhookUrl)
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json")
            };
            request.Headers.Add("X-InternLink-Event", webhook.EventType);
            request.Headers.Add("X-InternLink-Delivery", deliveryId.ToString("D"));
            var signature = ComputeSignature(UnprotectWebhookSecret(webhook.SecretKey), payload);
            request.Headers.Add("X-InternLink-Signature", $"sha256={signature}");

            var client = _httpClientFactory.CreateClient(WebhookHttpClientName);
            using var response = await client.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
            log.HttpStatusCode = (int)response.StatusCode;
            log.ResponseBody = await ReadResponsePreviewAsync(response, cancellationToken);
            log.Status = response.IsSuccessStatusCode ? "Delivered" : "Failed";
            if (!response.IsSuccessStatusCode)
                log.ErrorMessage = $"Webhook endpoint returned HTTP {(int)response.StatusCode}.";
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Webhook delivery {DeliveryId} attempt {AttemptNumber} failed",
                deliveryId, attemptNumber);
            log.Status = "Failed";
            log.ErrorMessage = "Delivery failed. Check the endpoint and server logs.";
        }

        log.CompletedAt = DateTime.UtcNow;
        webhook.LastTriggeredAt = log.CompletedAt;
        webhook.LastStatus = log.Status == "Delivered"
            ? $"Delivered (HTTP {log.HttpStatusCode})"
            : log.ErrorMessage;
        await _context.SaveChangesAsync(cancellationToken);
        return MapDelivery(log);
    }

    private async Task<SysApiKey?> FindApiKeyAsync(Guid tenantId, Guid id, CancellationToken cancellationToken) =>
        await _context.SysApiKeys.IgnoreQueryFilters()
            .SingleOrDefaultAsync(item =>
                item.PublicId == id && item.TenantId == tenantId && !item.IsDeleted,
                cancellationToken);

    private async Task<SysWebhook?> FindWebhookAsync(Guid tenantId, Guid id, CancellationToken cancellationToken) =>
        await _context.SysWebhooks.IgnoreQueryFilters()
            .SingleOrDefaultAsync(item =>
                item.PublicId == id && item.TenantId == tenantId && !item.IsDeleted,
                cancellationToken);

    private async Task<bool> TenantExistsAsync(Guid tenantId, CancellationToken cancellationToken) =>
        await _context.SysTenants.IgnoreQueryFilters()
            .AnyAsync(item => item.PublicId == tenantId && !item.IsDeleted, cancellationToken);

    private async Task<Uri> ValidateWebhookTargetAsync(string url, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || !string.IsNullOrEmpty(uri.UserInfo)
            || !string.IsNullOrEmpty(uri.Fragment))
        {
            throw new ArgumentException("Webhook URL phải là địa chỉ HTTPS hợp lệ, không chứa thông tin đăng nhập hoặc fragment.");
        }

        var addresses = await ResolvePublicAddressesAsync(uri.DnsSafeHost, cancellationToken);
        if (addresses.Length == 0 || addresses.Any(address => !IsPublicAddress(address)))
            throw new ArgumentException("Webhook URL phải trỏ tới địa chỉ IP công khai.");

        return uri;
    }

    private static async ValueTask<Stream> ConnectToPublicAddressAsync(
        SocketsHttpConnectionContext context,
        CancellationToken cancellationToken)
    {
        var addresses = await ResolvePublicAddressesAsync(context.DnsEndPoint.Host, cancellationToken);
        if (addresses.Length == 0 || addresses.Any(address => !IsPublicAddress(address)))
            throw new HttpRequestException("Webhook target did not resolve exclusively to public IP addresses.");

        foreach (var address in addresses)
        {
            var socket = new Socket(address.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
            try
            {
                await socket.ConnectAsync(new IPEndPoint(address, context.DnsEndPoint.Port), cancellationToken);
                return new NetworkStream(socket, ownsSocket: true);
            }
            catch (Exception) when (!cancellationToken.IsCancellationRequested)
            {
                socket.Dispose();
            }
        }

        throw new HttpRequestException("Webhook target could not be reached.");
    }

    private static async Task<IPAddress[]> ResolvePublicAddressesAsync(
        string host,
        CancellationToken cancellationToken)
    {
        if (IPAddress.TryParse(host, out var address))
            return [address];
        return await Dns.GetHostAddressesAsync(host, cancellationToken);
    }

    private static bool IsPublicAddress(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6)
            address = address.MapToIPv4();

        var bytes = address.GetAddressBytes();
        if (address.AddressFamily == AddressFamily.InterNetworkV6)
        {
            return (bytes[0] & 0xE0) == 0x20
                && !(bytes[0] == 0x20 && bytes[1] == 0x01 && bytes[2] == 0x0D && bytes[3] == 0xB8);
        }

        if (address.AddressFamily != AddressFamily.InterNetwork)
            return false;

        var first = bytes[0];
        var second = bytes[1];
        var third = bytes[2];
        return first != 0
            && first != 10
            && first != 127
            && !(first == 100 && second is >= 64 and <= 127)
            && !(first == 169 && second == 254)
            && !(first == 172 && second is >= 16 and <= 31)
            && !(first == 192 && (second == 168
                || second == 0
                || second == 88 && third == 99))
            && !(first == 198 && (second == 18 || second == 19 || second == 51 && third == 100))
            && !(first == 203 && second == 0 && third == 113)
            && first < 224;
    }

    private string UnprotectWebhookSecret(string storedSecret)
    {
        try
        {
            return _webhookSecretProtector.Unprotect(storedSecret);
        }
        catch (CryptographicException)
        {
            return storedSecret;
        }
    }

    private static string ComputeSignature(string secret, string payload)
    {
        var signature = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(secret),
            Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(signature).ToLowerInvariant();
    }

    private static async Task<string?> ReadResponsePreviewAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        if (response.Content.Headers.ContentLength == 0)
            return null;

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);
        var buffer = new char[MaxResponsePreviewLength];
        var count = await reader.ReadAsync(buffer.AsMemory(), cancellationToken);
        return count == 0 ? null : new string(buffer, 0, count);
    }

    private static string[] NormalizeScopes(string[] scopes)
    {
        if (scopes == null)
            throw new ArgumentException("Phải chọn ít nhất một scope.");
        var normalized = scopes
            .Where(scope => !string.IsNullOrWhiteSpace(scope))
            .Select(scope => scope.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        if (normalized.Length is 0 or > 32 || normalized.Any(scope => scope.Length > 100))
            throw new ArgumentException("Scope phải có từ 1 đến 32 giá trị, mỗi giá trị tối đa 100 ký tự.");
        return normalized;
    }

    private static void ValidateApiKeyDetails(
        string name,
        IReadOnlyCollection<string> scopes,
        int rateLimitPerMinute,
        DateTimeOffset? expiresAt)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 200)
            throw new ArgumentException("Tên API key là bắt buộc và tối đa 200 ký tự.");
        if (scopes.Count == 0)
            throw new ArgumentException("Phải chọn ít nhất một scope.");
        if (rateLimitPerMinute is < 1 or > 100000)
            throw new ArgumentException("Rate limit phải nằm trong khoảng 1 đến 100000 request/phút.");
        if (expiresAt.HasValue && expiresAt.Value <= DateTimeOffset.UtcNow)
            throw new ArgumentException("Thời điểm hết hạn phải ở tương lai.");
    }

    private static (string Prefix, string Secret, string Hash) CreateApiSecret()
    {
        var secret = $"ilk_live_{EncodeBase64Url(RandomNumberGenerator.GetBytes(32))}";
        var prefix = secret[..16];
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(secret)));
        return (prefix, secret, hash);
    }

    private static string EncodeBase64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static ApiKeyResponse MapApiKey(SysApiKey item) => new(
        item.PublicId,
        item.Name,
        item.KeyPrefix,
        JsonSerializer.Deserialize<string[]>(item.ScopesJson) ?? [],
        item.RateLimitPerMinute,
        item.ExpiresAt.HasValue ? ToOffset(item.ExpiresAt.Value) : null,
        item.LastUsedAt.HasValue ? ToOffset(item.LastUsedAt.Value) : null,
        item.IsActive,
        ToOffset(item.CreatedAt));

    private static WebhookResponse MapWebhook(SysWebhook item) => new(
        item.PublicId,
        item.WebhookUrl,
        item.EventType,
        item.IsActive,
        item.LastTriggeredAt.HasValue ? ToOffset(item.LastTriggeredAt.Value) : null,
        item.LastStatus,
        ToOffset(item.CreatedAt));

    private static WebhookDeliveryResponse MapDelivery(SysWebhookDeliveryLog item) => new(
        item.PublicId,
        item.DeliveryId,
        item.WebhookPublicId,
        item.EventType,
        item.Status,
        item.AttemptNumber,
        item.HttpStatusCode,
        item.ResponseBody,
        item.ErrorMessage,
        ToOffset(item.StartedAt),
        item.CompletedAt.HasValue ? ToOffset(item.CompletedAt.Value) : null);

    private static DateTimeOffset ToOffset(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
