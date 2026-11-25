using InternLink.Domain.Entities.Rbac;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using InternLink.Application.Interfaces;

namespace InternLink.Tests.Services;

public sealed class DatabaseBackupScheduleCronTests
{
    [Theory]
    [InlineData("0 0 2 * * *", "00 02 * * *")]
    [InlineData("30 1 * * 1", "30 01 * * 1")]
    [InlineData("0 3 15 * *", "00 03 15 * *")]
    [InlineData("0 4 * * 7", "00 04 * * 0")]
    public void Normalize_ConvertsSupportedSchedule(string input, string expected)
    {
        Assert.Equal(expected, DatabaseBackupScheduleCron.Normalize(input));
    }

    [Theory]
    [InlineData("*/15 2 * * *")]
    [InlineData("60 2 * * *")]
    [InlineData("0 24 * * *")]
    [InlineData("0 2 31 * *")]
    [InlineData("0 2 * 1 *")]
    public void Normalize_RejectsUnsupportedSchedule(string input)
    {
        Assert.Throws<ArgumentException>(() => DatabaseBackupScheduleCron.Normalize(input));
    }

    [Fact]
    public async Task SetScheduleAsync_PersistsNormalizedCronAndUpdatesRecurringSchedule()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"system-jobs-{Guid.NewGuid():N}")
            .Options;
        await using var context = new AppDbContext(options);
        context.SysDailyJobs.Add(new SysDailyJob
        {
            JobCode = "DB_BACKUP",
            JobName = "Database backup",
            CronExpression = "0 0 2 * * *",
            Status = "Ready"
        });
        await context.SaveChangesAsync();

        var scheduler = new Mock<ISystemJobScheduleManager>();
        var service = new SystemJobsService(
            context,
            Mock.Of<IDatabaseBackupService>(),
            scheduler.Object,
            NullLogger<SystemJobsService>.Instance);

        var result = await service.SetScheduleAsync("db_backup", "30 1 * * 1", CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("30 01 * * 1", result.CronExpression);
        scheduler.Verify(manager => manager.UpdateDatabaseBackupSchedule(true, "30 01 * * 1"), Times.Once);
    }

    [Fact]
    public async Task SetScheduleAsync_RejectsNonBackupJobs()
    {
        await using var context = new AppDbContext(
            new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase($"system-jobs-{Guid.NewGuid():N}")
                .Options);
        var service = new SystemJobsService(
            context,
            Mock.Of<IDatabaseBackupService>(),
            Mock.Of<ISystemJobScheduleManager>(),
            NullLogger<SystemJobsService>.Instance);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.SetScheduleAsync("REPORT_DEADLINE_SCAN", "0 2 * * *", CancellationToken.None));
    }

    [Fact]
    public void ScheduledBackupRetention_KeepsFourteenNewestScheduledFilesOnly()
    {
        var directory = Path.Combine(Path.GetTempPath(), $"internlink-backups-{Guid.NewGuid():N}");
        Directory.CreateDirectory(directory);
        try
        {
            var firstCreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            for (var index = 0; index < 15; index++)
            {
                var path = Path.Combine(directory, $"InternLink_Scheduled_{index:D2}.bak");
                File.WriteAllText(path, "backup");
                File.SetLastWriteTimeUtc(path, firstCreatedAt.AddMinutes(index));
            }

            var manualPath = Path.Combine(directory, "InternLink_Manual.bak");
            File.WriteAllText(manualPath, "manual backup");

            var removed = ScheduledDatabaseBackupRetention.Prune(directory, "InternLink");

            var remainingScheduled = Directory.GetFiles(directory, "InternLink_Scheduled_*.bak");
            Assert.Equal(14, remainingScheduled.Length);
            Assert.Contains("InternLink_Scheduled_00.bak", removed);
            Assert.DoesNotContain(remainingScheduled, path => Path.GetFileName(path) == "InternLink_Scheduled_00.bak");
            Assert.True(File.Exists(manualPath));
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }
}
