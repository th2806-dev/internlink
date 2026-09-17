namespace InternLink.Application.Interfaces;

public sealed record GoogleDriveUploadResult(
    string FileId,
    string FileName,
    string WebViewLink,
    long Size,
    string ContentType);

public interface IGoogleDriveService
{
    string CreateAuthorizationUrl();
    Task ExchangeAuthorizationCodeAsync(string code, CancellationToken cancellationToken = default);

    Task<GoogleDriveUploadResult> UploadAsync(
        Stream content,
        string fileName,
        string? contentType = null,
        string? folderId = null,
        CancellationToken cancellationToken = default);

    Task<byte[]> DownloadAsync(string fileIdOrUrl, CancellationToken cancellationToken = default);
}
