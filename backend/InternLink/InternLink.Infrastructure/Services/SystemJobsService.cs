using System.Collections.Concurrent;
using System.Diagnostics;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Entities.System;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InternLink.Infrastructure.Services;

public sealed class SystemJobsService : ISystemJobsService
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> JobLocks =
        new(StringComparer.OrdinalIgnoreCase);

    private readonly AppDbContext _context;
    private readonly IDatabaseBackupService _databaseBackupService;
    private readonly ISystemJobScheduleManager _scheduleManager;
    private readonly ILogger<SystemJobsService> _logger;

    public SystemJobsService(
        AppDbContext context,
        IDatabaseBackupService databaseBackupService,
        ISystemJobScheduleManager scheduleManager,
        ILogger<SystemJobsService> logger)
    {
        _context = context;
        _databaseBackupService = databaseBackupService;
        _scheduleManager = scheduleManager;
        _logger = logger;
    }

    public async Task<SystemJobsDashboardResponse> GetJobsAsync(CancellationToken cancellationToken)
    {
        var jobs = await _context.SysDailyJobs.AsNoTracking()
            .Where(item => !item.IsDeleted)
            .OrderBy(item => item.JobName)
            .ToListAsync(cancellationToken);
        var executions = await _context.SysJobExecutions.AsNoTracking()
            .Where(item => !item.IsDeleted)
            .OrderByDescending(item => item.StartedAt)
            .Take(100)
            .ToListAsync(cancellationToken);
        var executionsByJob = executions
            .GroupBy(item => item.JobCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.Select(MapExecution).ToArray(),
                StringComparer.OrdinalIgnoreCase);

        return new SystemJobsDashboardResponse(
            jobs.Select(job => MapJob(job, executionsByJob.GetValueOrDefault(job.JobCode) ?? [])).ToArray(),
            executions.Select(MapExecution).ToArray());
    }

    public async Task<JobExecutionResponse?> TriggerAsync(
        string jobCode,
        string triggeredBy,
        CancellationToken cancellationToken,
        bool isScheduled = false)
    {
        var normalizedCode = jobCode.Trim().ToUpperInvariant();
        var jobLock = JobLocks.GetOrAdd(normalizedCode, _ => new SemaphoreSlim(1, 1));
        await jobLock.WaitAsync(cancellationToken);
        try
        {
            var job = await _context.SysDailyJobs
                .SingleOrDefaultAsync(item => item.JobCode == normalizedCode && !item.IsDeleted, cancellationToken);
            if (job == null || !job.IsEnabled)
                return null;

            var startedAt = DateTime.UtcNow;
            var stopwatch = Stopwatch.StartNew();
            var execution = new SysJobExecution
            {
                JobCode = job.JobCode,
                Status = "Running",
                TriggeredBy = string.IsNullOrWhiteSpace(triggeredBy) ? "system" : triggeredBy,
                StartedAt = startedAt,
                CreatedAt = startedAt
            };
            job.Status = "Running";
            job.LastRunAt = startedAt;
            job.LastErrorMessage = null;
            _context.SysJobExecutions.Add(execution);
            await _context.SaveChangesAsync(cancellationToken);

            try
            {
                execution.ResultSummary = await ExecuteJobAsync(job.JobCode, isScheduled, cancellationToken);
                execution.Status = "Succeeded";
                job.Status = "Succeeded";
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                execution.Status = "Cancelled";
                execution.ErrorMessage = "Job execution was cancelled.";
                job.Status = "Cancelled";
                job.LastErrorMessage = execution.ErrorMessage;
                CompleteExecution(job, execution, stopwatch);
                await _context.SaveChangesAsync(CancellationToken.None);
                throw;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "System job {JobCode} failed", job.JobCode);
                execution.Status = "Failed";
                execution.ErrorMessage = "Job execution failed. Check server logs for details.";
                job.Status = "Failed";
                job.LastErrorMessage = execution.ErrorMessage;
            }

            CompleteExecution(job, execution, stopwatch);
            await _context.SaveChangesAsync(cancellationToken);
            return MapExecution(execution);
        }
        finally
        {
            jobLock.Release();
        }
    }

    public async Task<SystemJobResponse?> SetEnabledAsync(
        string jobCode,
        bool isEnabled,
        CancellationToken cancellationToken)
    {
        var normalizedCode = jobCode.Trim().ToUpperInvariant();
        var job = await _context.SysDailyJobs
            .SingleOrDefaultAsync(item => item.JobCode == normalizedCode && !item.IsDeleted, cancellationToken);
        if (job == null)
            return null;

        job.IsEnabled = isEnabled;
        if (job.Status is not ("Running" or "Succeeded" or "Failed" or "Cancelled"))
            job.Status = isEnabled ? "Ready" : "Disabled";
        else if (!isEnabled)
            job.Status = "Disabled";
        job.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        if (job.JobCode == "DB_BACKUP")
            _scheduleManager.UpdateDatabaseBackupSchedule(job.IsEnabled, job.CronExpression);

        var executions = await _context.SysJobExecutions.AsNoTracking()
            .Where(item => item.JobCode == job.JobCode && !item.IsDeleted)
            .OrderByDescending(item => item.StartedAt)
            .Take(5)
            .ToListAsync(cancellationToken);
        return MapJob(job, executions.Select(MapExecution).ToArray());
    }

    public async Task<SystemJobResponse?> SetScheduleAsync(
        string jobCode,
        string cronExpression,
        CancellationToken cancellationToken)
    {
        var normalizedCode = jobCode.Trim().ToUpperInvariant();
        if (normalizedCode != "DB_BACKUP")
            throw new ArgumentException("Chỉ hỗ trợ cấu hình lịch tự động cho tác vụ sao lưu dữ liệu.", nameof(jobCode));

        var normalizedCron = DatabaseBackupScheduleCron.Normalize(cronExpression);
        var job = await _context.SysDailyJobs
            .SingleOrDefaultAsync(item => item.JobCode == normalizedCode && !item.IsDeleted, cancellationToken);
        if (job == null)
            return null;

        job.CronExpression = normalizedCron;
        job.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        _scheduleManager.UpdateDatabaseBackupSchedule(job.IsEnabled, job.CronExpression);

        var executions = await _context.SysJobExecutions.AsNoTracking()
            .Where(item => item.JobCode == job.JobCode && !item.IsDeleted)
            .OrderByDescending(item => item.StartedAt)
            .Take(5)
            .ToListAsync(cancellationToken);
        return MapJob(job, executions.Select(MapExecution).ToArray());
    }

    private async Task<string> ExecuteJobAsync(
        string jobCode,
        bool isScheduled,
        CancellationToken cancellationToken) =>
        jobCode switch
        {
            "DB_BACKUP" => await ExecuteBackupAsync(isScheduled, cancellationToken),
            "REPORT_DEADLINE_SCAN" => await ExecuteDeadlineScanAsync(cancellationToken),
            "ACCOUNT_EXPIRY_SCAN" => await ExecuteAccountExpiryScanAsync(cancellationToken),
            "KPI_WEEKLY_AGGREGATE" => await ExecuteWeeklyAggregateAsync(cancellationToken),
            _ => throw new InvalidOperationException($"No execution handler is registered for job '{jobCode}'.")
        };

    private async Task<string> ExecuteBackupAsync(bool isScheduled, CancellationToken cancellationToken)
    {
        var backup = isScheduled
            ? await _databaseBackupService.CreateScheduledBackupAsync(cancellationToken)
            : await _databaseBackupService.CreateBackupAsync(cancellationToken);
        return $"Backup created: {backup.FileName} ({backup.SizeBytes} bytes).";
    }

    private async Task<string> ExecuteDeadlineScanAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var overdueCount = await _context.SemesterReportSchedules.IgnoreQueryFilters()
            .CountAsync(item => !item.IsDeleted && item.IsSubmissionOpen && item.DueDate < now, cancellationToken);
        return $"Scanned report schedules; {overdueCount} open schedule(s) have passed their deadline.";
    }

    private async Task<string> ExecuteAccountExpiryScanAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var expiredLicenses = await _context.SysTenantLicenses.IgnoreQueryFilters()
            .Where(item => !item.IsDeleted && item.IsActive && item.ValidTo <= now)
            .ToListAsync(cancellationToken);
        if (expiredLicenses.Count == 0)
            return "Scanned active tenant licenses; none have expired.";

        var tenantIds = expiredLicenses.Select(item => item.TenantId).Distinct().ToArray();
        var tenants = await _context.SysTenants.IgnoreQueryFilters()
            .Where(item => tenantIds.Contains(item.PublicId)
                && !item.IsDeleted
                && item.Status != TenantStatus.Suspended
                && item.Status != TenantStatus.Expired)
            .ToListAsync(cancellationToken);
        foreach (var license in expiredLicenses)
        {
            license.IsActive = false;
            license.UpdatedAt = now;
        }
        foreach (var tenant in tenants)
        {
            tenant.Status = TenantStatus.Expired;
            tenant.UpdatedAt = now;
        }
        await _context.SaveChangesAsync(cancellationToken);
        return $"Expired {expiredLicenses.Count} license(s) and updated {tenants.Count} tenant status(es).";
    }

    private async Task<string> ExecuteWeeklyAggregateAsync(CancellationToken cancellationToken)
    {
        var since = DateTime.UtcNow.AddDays(-7);
        var aggregate = await _context.WeeklyReports.IgnoreQueryFilters()
            .Where(item => !item.IsDeleted && item.CreatedAt >= since)
            .GroupBy(item => item.TenantId)
            .Select(group => new { TenantId = group.Key, ReportCount = group.Count() })
            .ToListAsync(cancellationToken);
        var reportCount = aggregate.Sum(item => item.ReportCount);
        return $"Aggregated {reportCount} report(s) across {aggregate.Count} tenant(s) for the last 7 days.";
    }

    private static void CompleteExecution(SysDailyJob job, SysJobExecution execution, Stopwatch stopwatch)
    {
        stopwatch.Stop();
        var completedAt = DateTime.UtcNow;
        execution.CompletedAt = completedAt;
        execution.DurationMs = (long)stopwatch.Elapsed.TotalMilliseconds;
        job.LastDurationMs = execution.DurationMs;
        job.UpdatedAt = completedAt;
    }

    private static SystemJobResponse MapJob(
        SysDailyJob item,
        IReadOnlyList<JobExecutionResponse> executions) => new(
        item.JobCode,
        item.JobName,
        item.CronExpression,
        item.Description,
        item.IsEnabled,
        item.Status,
        item.LastRunAt.HasValue ? ToOffset(item.LastRunAt.Value) : null,
        item.NextRunAt.HasValue ? ToOffset(item.NextRunAt.Value) : null,
        item.LastDurationMs,
        item.LastErrorMessage,
        executions);

    private static JobExecutionResponse MapExecution(SysJobExecution item) => new(
        item.PublicId,
        item.JobCode,
        item.Status,
        item.TriggeredBy,
        ToOffset(item.StartedAt),
        item.CompletedAt.HasValue ? ToOffset(item.CompletedAt.Value) : null,
        item.DurationMs,
        item.ResultSummary,
        item.ErrorMessage);

    private static DateTimeOffset ToOffset(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
