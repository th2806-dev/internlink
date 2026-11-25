namespace InternLink.Application.Interfaces;

public interface ISystemJobScheduleManager
{
    void UpdateDatabaseBackupSchedule(bool isEnabled, string cronExpression);
    Task SynchronizeDatabaseBackupScheduleAsync(CancellationToken cancellationToken);
}
