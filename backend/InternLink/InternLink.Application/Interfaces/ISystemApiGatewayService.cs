using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISystemApiGatewayService
{
    Task<IReadOnlyList<ApiKeyResponse>> GetApiKeysAsync(Guid tenantId, CancellationToken cancellationToken);
    Task<ApiKeyResponse?> GetApiKeyAsync(Guid tenantId, Guid id, CancellationToken cancellationToken);
    Task<ApiKeySecretResponse?> CreateApiKeyAsync(Guid tenantId, CreateApiKeyRequest request, CancellationToken cancellationToken);
    Task<ApiKeyResponse?> UpdateApiKeyAsync(Guid tenantId, Guid id, UpdateApiKeyRequest request, CancellationToken cancellationToken);
    Task<ApiKeySecretResponse?> RotateApiKeyAsync(Guid tenantId, Guid id, CancellationToken cancellationToken);
    Task<bool> DeleteApiKeyAsync(Guid tenantId, Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<WebhookResponse>> GetWebhooksAsync(Guid tenantId, CancellationToken cancellationToken);
    Task<WebhookResponse?> GetWebhookAsync(Guid tenantId, Guid id, CancellationToken cancellationToken);
    Task<CreateWebhookResponse?> CreateWebhookAsync(Guid tenantId, CreateWebhookRequest request, CancellationToken cancellationToken);
    Task<WebhookResponse?> UpdateWebhookAsync(Guid tenantId, Guid id, UpdateWebhookRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteWebhookAsync(Guid tenantId, Guid id, CancellationToken cancellationToken);
    Task<WebhookDeliveryResponse?> TestWebhookAsync(Guid tenantId, Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<WebhookDeliveryResponse>> GetDeadLettersAsync(Guid tenantId, CancellationToken cancellationToken);
    Task<WebhookDeliveryResponse?> RetryDeliveryAsync(Guid tenantId, Guid id, CancellationToken cancellationToken);
}
