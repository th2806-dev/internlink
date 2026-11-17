using System.Text.Json;
using InternLink.Application.DTOs;

namespace InternLink.Infrastructure.Services;

public sealed class ExcelImportFileStore
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromHours(2);
    private readonly string _rootPath;

    public ExcelImportFileStore(string? rootPath = null)
    {
        _rootPath = rootPath ?? Path.Combine(Path.GetTempPath(), "InternLink", "ExcelImports");
        Directory.CreateDirectory(_rootPath);
    }

    public async Task<Guid> SaveUploadAsync(
        Stream source,
        string fileName,
        string ownerKey,
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken)
    {
        CleanupExpiredFiles();
        var id = Guid.NewGuid();
        var extension = Path.GetExtension(fileName);
        var filePath = GetUploadPath(id, extension);
        await using (var destination = new FileStream(
            filePath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        {
            await source.CopyToAsync(destination, cancellationToken);
        }

        var metadata = new StoredFileMetadata(
            id,
            Path.GetFileName(fileName),
            ownerKey,
            departmentId,
            tenantId,
            DateTimeOffset.UtcNow.Add(Lifetime));
        await WriteMetadataAsync(GetUploadMetadataPath(id), metadata, cancellationToken);
        return id;
    }

    public async Task<StoredExcelFile?> GetUploadAsync(
        Guid id,
        string ownerKey,
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken)
    {
        var metadata = await ReadAuthorizedMetadataAsync(
            GetUploadMetadataPath(id), id, ownerKey, departmentId, tenantId, cancellationToken);
        if (metadata == null)
            return null;

        var path = GetUploadPath(id, Path.GetExtension(metadata.FileName));
        return File.Exists(path) ? new StoredExcelFile(path, metadata.FileName) : null;
    }

    public async Task<Guid> SaveErrorReportAsync(
        Stream contents,
        string ownerKey,
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken)
    {
        CleanupExpiredFiles();
        var id = Guid.NewGuid();
        await using (var destination = new FileStream(
            GetReportPath(id), FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        {
            await contents.CopyToAsync(destination, cancellationToken);
        }

        await WriteMetadataAsync(
            GetReportMetadataPath(id),
            new StoredFileMetadata(
                id,
                "excel-import-errors.xlsx",
                ownerKey,
                departmentId,
                tenantId,
                DateTimeOffset.UtcNow.Add(Lifetime)),
            cancellationToken);
        return id;
    }

    public async Task<ExcelErrorReportFile?> GetErrorReportAsync(
        Guid id,
        string ownerKey,
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken)
    {
        var metadata = await ReadAuthorizedMetadataAsync(
            GetReportMetadataPath(id), id, ownerKey, departmentId, tenantId, cancellationToken);
        var path = GetReportPath(id);
        return metadata != null && File.Exists(path)
            ? new ExcelErrorReportFile(path, metadata.FileName)
            : null;
    }

    public void DeleteUpload(Guid id, string fileName)
    {
        var path = GetUploadPath(id, Path.GetExtension(fileName));
        if (File.Exists(path))
            File.Delete(path);
        var metadataPath = GetUploadMetadataPath(id);
        if (File.Exists(metadataPath))
            File.Delete(metadataPath);
    }

    private async Task<StoredFileMetadata?> ReadAuthorizedMetadataAsync(
        string path,
        Guid id,
        string ownerKey,
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken)
    {
        if (!File.Exists(path))
            return null;

        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, useAsync: true);
        var metadata = await JsonSerializer.DeserializeAsync<StoredFileMetadata>(stream, cancellationToken: cancellationToken);
        if (metadata == null || metadata.Id != id || metadata.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            DeleteIfExists(path);
            DeleteIfExists(path == GetUploadMetadataPath(id)
                ? GetUploadPath(id, Path.GetExtension(metadata?.FileName ?? string.Empty))
                : GetReportPath(id));
            return null;
        }

        return string.Equals(metadata.OwnerKey, ownerKey, StringComparison.Ordinal)
            && metadata.DepartmentId == departmentId
            && string.Equals(metadata.TenantId, tenantId, StringComparison.Ordinal)
            ? metadata
            : null;
    }

    private async Task WriteMetadataAsync(
        string path,
        StoredFileMetadata metadata,
        CancellationToken cancellationToken)
    {
        await using var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 4096, useAsync: true);
        await JsonSerializer.SerializeAsync(stream, metadata, cancellationToken: cancellationToken);
    }

    private void CleanupExpiredFiles()
    {
        foreach (var metadataPath in Directory.EnumerateFiles(_rootPath, "*.json"))
        {
            if (File.GetLastWriteTimeUtc(metadataPath) >= DateTime.UtcNow.Subtract(Lifetime))
                continue;

            var fileName = Path.GetFileNameWithoutExtension(metadataPath);
            if (fileName.StartsWith("report_", StringComparison.Ordinal)
                && Guid.TryParseExact(fileName.Substring("report_".Length), "N", out var reportId))
                DeleteIfExists(GetReportPath(reportId));
            else if (Guid.TryParseExact(fileName, "N", out var uploadId))
            {
                var matchingUpload = Directory.EnumerateFiles(_rootPath, uploadId.ToString("N") + ".*")
                    .FirstOrDefault(candidate => !candidate.EndsWith(".json", StringComparison.OrdinalIgnoreCase));
                if (matchingUpload != null)
                    DeleteIfExists(matchingUpload);
            }

            DeleteIfExists(metadataPath);
        }
    }

    private string GetUploadPath(Guid id, string extension) =>
        Path.Combine(_rootPath, id.ToString("N") + extension);

    private string GetUploadMetadataPath(Guid id) =>
        Path.Combine(_rootPath, id.ToString("N") + ".json");

    private string GetReportPath(Guid id) =>
        Path.Combine(_rootPath, "report_" + id.ToString("N") + ".xlsx");

    private string GetReportMetadataPath(Guid id) =>
        Path.Combine(_rootPath, "report_" + id.ToString("N") + ".json");

    private static void DeleteIfExists(string path)
    {
        if (File.Exists(path))
            File.Delete(path);
    }

    private sealed record StoredFileMetadata(
        Guid Id,
        string FileName,
        string OwnerKey,
        Guid? DepartmentId,
        string? TenantId,
        DateTimeOffset ExpiresAt);
}

public sealed record StoredExcelFile(string FilePath, string FileName);
