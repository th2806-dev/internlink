using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace InternLink.Infrastructure.Services;

public sealed class DatabaseBackupService : IDatabaseBackupService
{
    private static readonly SemaphoreSlim OperationLock = new(1, 1);
    private readonly string _backupDirectory;
    private readonly string _databaseName;
    private readonly string _connectionString;
    private readonly string? _sqlServerDataDirectory;
    private readonly string? _sqlServerLogDirectory;
    private readonly ILogger<DatabaseBackupService> _logger;

    public DatabaseBackupService(IConfiguration configuration, ILogger<DatabaseBackupService> logger)
    {
        var configuredConnection = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("The database connection string is not configured.");
        var connectionBuilder = new SqlConnectionStringBuilder(configuredConnection);
        _databaseName = connectionBuilder.InitialCatalog;
        if (string.IsNullOrWhiteSpace(_databaseName))
            throw new InvalidOperationException("The database name is not configured.");

        connectionBuilder.InitialCatalog = "master";
        _connectionString = connectionBuilder.ConnectionString;
        _sqlServerDataDirectory = configuration["Backups:SqlServerDataDirectory"];
        _sqlServerLogDirectory = configuration["Backups:SqlServerLogDirectory"];
        _backupDirectory = Path.GetFullPath(configuration["Backups:Directory"]
            ?? Path.Combine(AppContext.BaseDirectory, "App_Data", "backups"));
        _logger = logger;
    }

    public async Task<IReadOnlyList<BackupFileDto>> GetBackupsAsync(CancellationToken cancellationToken)
    {
        await OperationLock.WaitAsync(cancellationToken);
        try
        {
            EnsureBackupDirectory();

            return Directory
                .EnumerateFiles(_backupDirectory, "*.bak", SearchOption.TopDirectoryOnly)
                .Select(path => new FileInfo(path))
                .OrderByDescending(file => file.LastWriteTimeUtc)
                .Select(file => new BackupFileDto(
                    file.Name,
                    file.Length,
                    new DateTimeOffset(file.LastWriteTimeUtc, TimeSpan.Zero)))
                .ToArray();
        }
        finally
        {
            OperationLock.Release();
        }
    }

    public async Task<BackupFileDto> CreateBackupAsync(CancellationToken cancellationToken)
    {
        await OperationLock.WaitAsync(cancellationToken);
        try
        {
            EnsureBackupDirectory();
            var fileName = $"{_databaseName}_{DateTime.UtcNow:yyyyMMdd_HHmmss_fff}Z.bak";
            var destination = GetBackupPath(fileName);

            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);
            await BackupDatabaseAsync(connection, destination, cancellationToken);

            var file = new FileInfo(destination);
            _logger.LogInformation("Database backup created: {BackupFileName}", fileName);
            return new BackupFileDto(file.Name, file.Length, new DateTimeOffset(file.LastWriteTimeUtc, TimeSpan.Zero));
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Failed to create a database backup");
            throw;
        }
        finally
        {
            OperationLock.Release();
        }
    }

    public Task<FileStream?> OpenBackupAsync(string fileName, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        EnsureBackupDirectory();
        var path = GetBackupPath(fileName);
        if (!File.Exists(path))
            return Task.FromResult<FileStream?>(null);

        return Task.FromResult<FileStream?>(new FileStream(
            path,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            bufferSize: 1024 * 128,
            useAsync: true));
    }

    public async Task<bool> DeleteBackupAsync(string fileName, CancellationToken cancellationToken)
    {
        await OperationLock.WaitAsync(cancellationToken);
        try
        {
            EnsureBackupDirectory();
            var path = GetBackupPath(fileName);
            if (!File.Exists(path))
                return false;

            File.Delete(path);
            _logger.LogInformation("Database backup deleted: {BackupFileName}", fileName);
            return true;
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Failed to delete database backup {BackupFileName}", fileName);
            throw;
        }
        finally
        {
            OperationLock.Release();
        }
    }

    public async Task RestoreBackupAsync(string fileName, CancellationToken cancellationToken)
    {
        await OperationLock.WaitAsync(cancellationToken);
        try
        {
            EnsureBackupDirectory();
            var sourcePath = GetBackupPath(fileName);
            if (!File.Exists(sourcePath))
                throw new FileNotFoundException("Không tìm thấy tệp sao lưu.", fileName);

            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);
            await VerifyBackupAsync(connection, sourcePath, cancellationToken);
            var files = await ReadBackupFilesAsync(connection, sourcePath, cancellationToken);
            var (dataDirectory, logDirectory) = await GetSqlServerDirectoriesAsync(connection, cancellationToken);

            var safetyBackupName = $"{_databaseName}_BeforeRestore_{DateTime.UtcNow:yyyyMMdd_HHmmss_fff}Z.bak";
            await BackupDatabaseAsync(connection, GetBackupPath(safetyBackupName), cancellationToken);

            var moveClauses = BuildMoveClauses(files, dataDirectory, logDirectory);
            var database = QuoteIdentifier(_databaseName);
            var source = EscapeSqlString(sourcePath);
            var restoreCommand = $"""
                ALTER DATABASE {database} SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                RESTORE DATABASE {database}
                    FROM DISK = N'{source}'
                    WITH REPLACE, RECOVERY, CHECKSUM, {moveClauses};
                ALTER DATABASE {database} SET MULTI_USER;
                """;

            try
            {
                await using var command = new SqlCommand(restoreCommand, connection)
                {
                    CommandTimeout = 0
                };
                await command.ExecuteNonQueryAsync(cancellationToken);
            }
            catch
            {
                try
                {
                    await using var recoverAccess = new SqlCommand(
                        $"ALTER DATABASE {database} SET MULTI_USER;", connection)
                    {
                        CommandTimeout = 30
                    };
                    await recoverAccess.ExecuteNonQueryAsync(CancellationToken.None);
                }
                catch (Exception recoveryException)
                {
                    _logger.LogError(
                        recoveryException,
                        "Failed to return database {DatabaseName} to MULTI_USER after a restore error",
                        _databaseName);
                }

                throw;
            }

            _logger.LogWarning(
                "Database {DatabaseName} was restored from {BackupFileName}; safety backup: {SafetyBackupFileName}",
                _databaseName,
                fileName,
                safetyBackupName);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Failed to restore database from {BackupFileName}", fileName);
            throw;
        }
        finally
        {
            OperationLock.Release();
        }
    }

    private string GetBackupPath(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName)
            || fileName != Path.GetFileName(fileName)
            || fileName.Contains('/') || fileName.Contains('\\')
            || !fileName.EndsWith(".bak", StringComparison.OrdinalIgnoreCase)
            || fileName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
        {
            throw new ArgumentException("Tên tệp sao lưu không hợp lệ.", nameof(fileName));
        }

        var path = Path.GetFullPath(Path.Combine(_backupDirectory, fileName));
        if (!path.StartsWith(_backupDirectory + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Tên tệp sao lưu không hợp lệ.", nameof(fileName));

        return path;
    }

    private void EnsureBackupDirectory()
    {
        Directory.CreateDirectory(_backupDirectory);
        if (OperatingSystem.IsLinux())
        {
            File.SetUnixFileMode(
                _backupDirectory,
                UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute
                    | UnixFileMode.GroupRead | UnixFileMode.GroupWrite | UnixFileMode.GroupExecute
                    | UnixFileMode.OtherRead | UnixFileMode.OtherWrite | UnixFileMode.OtherExecute);
        }
    }

    private async Task BackupDatabaseAsync(
        SqlConnection connection,
        string destination,
        CancellationToken cancellationToken)
    {
        var commandText = $"""
            BACKUP DATABASE {QuoteIdentifier(_databaseName)}
            TO DISK = N'{EscapeSqlString(destination)}'
            WITH COPY_ONLY, INIT, COMPRESSION, CHECKSUM, STATS = 10;
            """;
        try
        {
            await using var command = new SqlCommand(commandText, connection) { CommandTimeout = 0 };
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        catch
        {
            try
            {
                if (File.Exists(destination))
                    File.Delete(destination);
            }
            catch (Exception cleanupException)
            {
                _logger.LogWarning(
                    cleanupException,
                    "Could not remove incomplete database backup file {BackupPath}",
                    destination);
            }

            throw;
        }
    }

    private async Task VerifyBackupAsync(
        SqlConnection connection,
        string sourcePath,
        CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand(
            $"RESTORE VERIFYONLY FROM DISK = N'{EscapeSqlString(sourcePath)}' WITH CHECKSUM;",
            connection)
        {
            CommandTimeout = 0
        };
        await command.ExecuteNonQueryAsync(cancellationToken);

        await using var headerCommand = new SqlCommand(
            $"RESTORE HEADERONLY FROM DISK = N'{EscapeSqlString(sourcePath)}';",
            connection)
        {
            CommandTimeout = 0
        };
        await using var reader = await headerCommand.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)
            || !string.Equals(
                reader.GetString(reader.GetOrdinal("DatabaseName")),
                _databaseName,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Tệp sao lưu không thuộc cơ sở dữ liệu InternLink hiện tại.");
        }
    }

    private static async Task<IReadOnlyList<BackupFileEntry>> ReadBackupFilesAsync(
        SqlConnection connection,
        string sourcePath,
        CancellationToken cancellationToken)
    {
        var files = new List<BackupFileEntry>();
        await using var command = new SqlCommand(
            $"RESTORE FILELISTONLY FROM DISK = N'{EscapeSqlString(sourcePath)}';",
            connection)
        {
            CommandTimeout = 0
        };
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            files.Add(new BackupFileEntry(
                reader.GetString(reader.GetOrdinal("LogicalName")),
                reader.GetString(reader.GetOrdinal("Type")),
                reader.GetInt32(reader.GetOrdinal("FileId"))));
        }

        if (files.Count == 0
            || files.Any(file => file.Type is not ("D" or "L"))
            || !files.Any(file => file.Type == "D")
            || !files.Any(file => file.Type == "L"))
            throw new InvalidOperationException("Tệp sao lưu chứa cấu trúc cơ sở dữ liệu không được hỗ trợ.");

        return files;
    }

    private async Task<(string DataDirectory, string LogDirectory)> GetSqlServerDirectoriesAsync(
        SqlConnection connection,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(_sqlServerDataDirectory)
            && !string.IsNullOrWhiteSpace(_sqlServerLogDirectory))
        {
            return (_sqlServerDataDirectory, _sqlServerLogDirectory);
        }

        await using var command = new SqlCommand(
            """
            SELECT
                CONVERT(nvarchar(4000), SERVERPROPERTY('InstanceDefaultDataPath')),
                CONVERT(nvarchar(4000), SERVERPROPERTY('InstanceDefaultLogPath'));
            """,
            connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            throw new InvalidOperationException("Không thể xác định thư mục dữ liệu của SQL Server.");

        var dataDirectory = _sqlServerDataDirectory
            ?? (reader.IsDBNull(0) ? null : reader.GetString(0));
        var logDirectory = _sqlServerLogDirectory
            ?? (reader.IsDBNull(1) ? null : reader.GetString(1));

        if (string.IsNullOrWhiteSpace(dataDirectory) || string.IsNullOrWhiteSpace(logDirectory))
            throw new InvalidOperationException(
                "SQL Server chưa cấu hình thư mục dữ liệu mặc định; hãy cấu hình Backups:SqlServerDataDirectory và Backups:SqlServerLogDirectory.");

        return (dataDirectory, logDirectory);
    }

    private static string BuildMoveClauses(
        IReadOnlyList<BackupFileEntry> files,
        string dataDirectory,
        string logDirectory)
    {
        var dataIndex = 0;
        var logIndex = 0;
        var clauses = new List<string>(files.Count);
        foreach (var file in files.OrderBy(item => item.FileId))
        {
            string targetPath;
            if (file.Type == "L")
            {
                targetPath = Path.Combine(logDirectory, logIndex == 0 ? "InternLink_Log.ldf" : $"InternLink_Log_{logIndex}.ldf");
                logIndex++;
            }
            else
            {
                targetPath = Path.Combine(dataDirectory, dataIndex == 0 ? "InternLink_Data.mdf" : $"InternLink_Data_{dataIndex}.ndf");
                dataIndex++;
            }

            clauses.Add($"MOVE N'{EscapeSqlString(file.LogicalName)}' TO N'{EscapeSqlString(targetPath)}'");
        }

        return string.Join(", ", clauses);
    }

    private static string QuoteIdentifier(string identifier) => $"[{identifier.Replace("]", "]]", StringComparison.Ordinal)}]";

    private static string EscapeSqlString(string value) => value.Replace("'", "''", StringComparison.Ordinal);

    private sealed record BackupFileEntry(string LogicalName, string Type, int FileId);
}
