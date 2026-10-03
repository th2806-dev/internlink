using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface IDatabaseBackupService
{
    Task<IReadOnlyList<BackupFileDto>> GetBackupsAsync(CancellationToken cancellationToken);
    Task<BackupFileDto> CreateBackupAsync(CancellationToken cancellationToken);
    Task<FileStream?> OpenBackupAsync(string fileName, CancellationToken cancellationToken);
    Task<bool> DeleteBackupAsync(string fileName, CancellationToken cancellationToken);
    Task RestoreBackupAsync(string fileName, CancellationToken cancellationToken);
}
