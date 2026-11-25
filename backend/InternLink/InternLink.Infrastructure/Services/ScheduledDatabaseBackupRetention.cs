namespace InternLink.Infrastructure.Services;

public static class ScheduledDatabaseBackupRetention
{
    public const int RetainedBackupCount = 14;

    public static IReadOnlyList<string> Prune(string backupDirectory, string databaseName)
    {
        var scheduledPrefix = $"{databaseName}_Scheduled_";
        var scheduledBackups = Directory
            .EnumerateFiles(backupDirectory, "*.bak", SearchOption.TopDirectoryOnly)
            .Select(path => new FileInfo(path))
            .Where(file => file.Name.StartsWith(scheduledPrefix, StringComparison.OrdinalIgnoreCase))
            .ToArray();
        var retainedBackups = scheduledBackups
            .OrderByDescending(file => file.LastWriteTimeUtc)
            .ThenByDescending(file => file.Name, StringComparer.OrdinalIgnoreCase)
            .Take(RetainedBackupCount)
            .Select(file => file.FullName)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var removedFileNames = new List<string>();

        foreach (var backup in scheduledBackups)
        {
            if (retainedBackups.Contains(backup.FullName))
                continue;

            File.Delete(backup.FullName);
            removedFileNames.Add(backup.Name);
        }

        return removedFileNames;
    }
}
