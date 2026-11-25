using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISystemJobsService
{
    Task<SystemJobsDashboardResponse> GetJobsAsync(CancellationToken cancellationToken);
    Task<JobExecutionResponse?> TriggerAsync(
        string jobCode,
        string triggeredBy,
        CancellationToken cancellationToken,
        bool isScheduled = false);
    Task<SystemJobResponse?> SetEnabledAsync(string jobCode, bool isEnabled, CancellationToken cancellationToken);
    Task<SystemJobResponse?> SetScheduleAsync(
        string jobCode,
        string cronExpression,
        CancellationToken cancellationToken);
}
