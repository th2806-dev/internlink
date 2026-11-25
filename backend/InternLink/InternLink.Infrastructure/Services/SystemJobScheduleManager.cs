using Hangfire;
using Hangfire.Common;
using InternLink.Application.Interfaces;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InternLink.Infrastructure.Services;

public sealed class SystemJobScheduleManager(
    IRecurringJobManager recurringJobManager,
    IServiceScopeFactory scopeFactory) : ISystemJobScheduleManager
{
    private const string DatabaseBackupRecurringJobId = "system-database-backup";

    public void UpdateDatabaseBackupSchedule(bool isEnabled, string cronExpression)
    {
        if (!isEnabled)
        {
            recurringJobManager.RemoveIfExists(DatabaseBackupRecurringJobId);
            return;
        }

        var normalizedCron = DatabaseBackupScheduleCron.Normalize(cronExpression);
        recurringJobManager.AddOrUpdate(
            DatabaseBackupRecurringJobId,
            Job.FromExpression<ISystemJobsService>(
                service => service.TriggerAsync("DB_BACKUP", "scheduler", CancellationToken.None, true)),
            normalizedCron,
            new RecurringJobOptions { TimeZone = GetVietnamTimeZone() });
    }

    public async Task SynchronizeDatabaseBackupScheduleAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var job = await context.SysDailyJobs.AsNoTracking()
            .SingleOrDefaultAsync(item => item.JobCode == "DB_BACKUP" && !item.IsDeleted, cancellationToken);
        if (job == null)
        {
            recurringJobManager.RemoveIfExists(DatabaseBackupRecurringJobId);
            return;
        }

        UpdateDatabaseBackupSchedule(job.IsEnabled, job.CronExpression);
    }

    private static TimeZoneInfo GetVietnamTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        }
    }
}
