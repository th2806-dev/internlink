using System.Net;
using System.Text;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace InternLink.Tests.Services;

public sealed class SystemTenantSsoServiceTests
{
    [Fact]
    public async Task SaveAndGet_ProtectsSecretAndReturnsOnlyMask()
    {
        await using var context = CreateContext();
        var tenantId = await AddTenantAsync(context);
        var service = CreateService(context);

        var saved = await service.SaveConfigurationAsync(tenantId, ValidRequest(), CancellationToken.None);
        var stored = await context.SysTenantSsoConfigs.IgnoreQueryFilters()
            .SingleAsync(item => item.TenantId == tenantId);
        var fetched = await service.GetConfigurationAsync(tenantId, CancellationToken.None);

        Assert.NotNull(saved);
        Assert.NotNull(fetched);
        Assert.NotEqual("plain-secret", stored.EncryptedClientSecret);
        Assert.DoesNotContain("plain-secret", stored.EncryptedClientSecret, StringComparison.Ordinal);
        Assert.Equal("••••••••", fetched.MaskedClientSecret);
        Assert.DoesNotContain("plain-secret", System.Text.Json.JsonSerializer.Serialize(fetched));
        Assert.Equal(["example.edu.vn", "student.example.edu.vn"], fetched.AllowedEmailDomains);
    }

    [Fact]
    public async Task Save_EmptySecretPreservesExistingProtectedSecret()
    {
        await using var context = CreateContext();
        var tenantId = await AddTenantAsync(context);
        var service = CreateService(context);
        await service.SaveConfigurationAsync(tenantId, ValidRequest(), CancellationToken.None);
        var stored = await context.SysTenantSsoConfigs.IgnoreQueryFilters()
            .SingleAsync(item => item.TenantId == tenantId);
        var encryptedSecret = stored.EncryptedClientSecret;

        await service.SaveConfigurationAsync(
            tenantId,
            ValidRequest() with { ClientSecret = string.Empty },
            CancellationToken.None);

        Assert.Equal(encryptedSecret, stored.EncryptedClientSecret);
    }

    [Fact]
    public async Task Save_RejectsHttpDiscoveryEndpoint()
    {
        await using var context = CreateContext();
        var tenantId = await AddTenantAsync(context);
        var service = CreateService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.SaveConfigurationAsync(
            tenantId,
            ValidRequest() with { DiscoveryUrl = "http://localhost/metadata" },
            CancellationToken.None));

        Assert.Empty(await context.SysTenantSsoConfigs.IgnoreQueryFilters().ToListAsync());
    }

    [Fact]
    public async Task TestDiscovery_RequiresStandardOidcMetadata()
    {
        await using var context = CreateContext();
        var tenantId = await AddTenantAsync(context);
        var handler = new StaticResponseHandler(
            """{"issuer":"https://idp.example/","authorization_endpoint":"https://idp.example/authorize","token_endpoint":"https://idp.example/token","jwks_uri":"https://idp.example/keys"}""");
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(item => item.CreateClient(SystemTenantSsoService.DiscoveryHttpClientName))
            .Returns(new HttpClient(handler));
        var service = new SystemTenantSsoService(
            context,
            factory.Object,
            new EphemeralDataProtectionProvider());

        var result = await service.TestDiscoveryAsync(
            tenantId,
            new TestTenantSsoDiscoveryRequest
            {
                ProviderType = "AzureAD",
                DiscoveryUrl = "https://idp.example/.well-known/openid-configuration"
            },
            CancellationToken.None);

        Assert.NotNull(result);
        Assert.True(result.IsSuccess);
        Assert.Equal("https://idp.example/", result.Issuer);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"tenant-sso-{Guid.NewGuid():N}")
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<Guid> AddTenantAsync(AppDbContext context)
    {
        var tenant = new SysTenant
        {
            TenantCode = "SSOTEST",
            Name = "SSO Test",
            LegalName = "SSO Test",
            Subdomain = $"sso-{Guid.NewGuid():N}"[..20],
            ContactEmail = string.Empty,
            ContactPhone = string.Empty
        };
        context.SysTenants.Add(tenant);
        await context.SaveChangesAsync();
        return tenant.PublicId;
    }

    private static SystemTenantSsoService CreateService(AppDbContext context) =>
        new(context, Mock.Of<IHttpClientFactory>(), new EphemeralDataProtectionProvider());

    private static UpdateTenantSsoConfigurationRequest ValidRequest() =>
        new()
        {
            ProviderType = "AzureAD",
            ClientId = "client-id",
            ClientSecret = "plain-secret",
            DiscoveryUrl = "https://idp.example/.well-known/openid-configuration",
            AllowedEmailDomains = ["@example.edu.vn", "student.example.edu.vn"],
            IsEnforced = true
        };

    private sealed class StaticResponseHandler(string responseBody) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseBody, Encoding.UTF8, "application/json")
            });
    }
}
