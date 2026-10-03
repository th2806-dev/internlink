namespace InternLink.Application.DTOs;

/// <summary>Metadata for a SQL Server database backup file.</summary>
public sealed record BackupFileDto(
    string FileName,
    long SizeBytes,
    DateTimeOffset CreatedAt);

/// <summary>Confirms a destructive database restore operation.</summary>
public sealed record RestoreBackupRequest
{
    /// <summary>Must be the exact text RESTORE to authorize replacing the current database.</summary>
    public required string Confirmation { get; init; }
}
