using FluentAssertions;
using InternLink.Domain.Entities.Rbac;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Tests.Services;

public class AppDbContextAuditTests
{
    [Fact]
    public async Task SaveChangesAsync_LogsCreateUpdateAndSoftDeleteWithoutSecrets()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var db = new AppDbContext(options);
        var webhook = new SysWebhook
        {
            WebhookUrl = "https://example.test/events",
            EventType = "REPORT_SUBMITTED",
            SecretKey = "initial-secret"
        };

        db.SysWebhooks.Add(webhook);
        await db.SaveChangesAsync();

        webhook.WebhookUrl = "https://example.test/updated";
        webhook.SecretKey = "updated-secret";
        await db.SaveChangesAsync();

        db.SysWebhooks.Remove(webhook);
        await db.SaveChangesAsync();

        var auditLogs = await db.SysAuditLogs
            .Where(log => log.TableName == "Sys_Webhooks")
            .OrderBy(log => log.AutoId)
            .ToListAsync();

        auditLogs.Should().HaveCount(3);
        auditLogs.Select(log => log.ActionType).Should()
            .Equal("CREATE", "UPDATE", "SOFT_DELETE");
        auditLogs[0].RecordId.Should().Be(webhook.PublicId.ToString());
        auditLogs[0].NewValuesJson.Should().Contain("https://example.test/events");
        auditLogs[0].NewValuesJson.Should().NotContain("initial-secret");
        auditLogs[1].OldValuesJson.Should().Contain("https://example.test/events");
        auditLogs[1].NewValuesJson.Should().Contain("https://example.test/updated");
        auditLogs[1].OldValuesJson.Should().NotContain("initial-secret");
        auditLogs[1].NewValuesJson.Should().NotContain("updated-secret");
        (await db.SysAuditLogs.CountAsync()).Should().Be(3);
        (await db.SysWebhooks.CountAsync()).Should().Be(0);
    }
}
