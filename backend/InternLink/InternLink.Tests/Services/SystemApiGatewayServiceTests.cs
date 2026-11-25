using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace InternLink.Tests.Services;

public sealed class SystemApiGatewayServiceTests
{
    [Fact]
    public async Task CreateApiKey_StoresOnlySha256HashAndNeverReturnsItFromList()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"system-api-gateway-{Guid.NewGuid():N}")
            .Options;
        await using var context = new AppDbContext(options);
        var tenantId = Guid.NewGuid();
        context.SysTenants.Add(new SysTenant
        {
            PublicId = tenantId,
            TenantCode = "ERPTEST",
            Name = "ERP test",
            LegalName = "ERP test",
            Subdomain = "erptest",
            ContactEmail = string.Empty,
            ContactPhone = string.Empty
        });
        await context.SaveChangesAsync();

        var service = new SystemApiGatewayService(
            context,
            Mock.Of<IHttpClientFactory>(),
            new EphemeralDataProtectionProvider(),
            NullLogger<SystemApiGatewayService>.Instance);
        var created = await service.CreateApiKeyAsync(
            tenantId,
            new CreateApiKeyRequest
            {
                Name = "SIS integration",
                Scopes = ["students.read"],
                RateLimitPerMinute = 120
            },
            CancellationToken.None);

        Assert.NotNull(created);
        var storedKey = await context.SysApiKeys.IgnoreQueryFilters()
            .SingleAsync(item => item.PublicId == created.ApiKey.Id);
        var expectedHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(created.Secret)));
        Assert.Equal(expectedHash, storedKey.KeyHash);

        var listedKeys = await service.GetApiKeysAsync(tenantId, CancellationToken.None);
        var serializedList = JsonSerializer.Serialize(listedKeys);
        Assert.DoesNotContain(created.Secret, serializedList, StringComparison.Ordinal);
        Assert.DoesNotContain(storedKey.KeyHash, serializedList, StringComparison.Ordinal);
    }
}
