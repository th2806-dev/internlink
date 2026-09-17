using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Google.Apis.Upload;
using Google.Apis.Download;
using Google.Apis.Util.Store;
using InternLink.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace InternLink.Infrastructure.Services;

public sealed class GoogleDriveService : IGoogleDriveService
{
    private const string DefaultFolderId = "1am-bFNANQSN07C8Qmb5UR9GvhzKzHLRx";
    private readonly IConfiguration _configuration;
    private Lazy<Task<DriveService>> _drive;
    private readonly string _defaultFolderId;

    public GoogleDriveService(IConfiguration configuration)
    {
        _configuration = configuration;
        _drive = new Lazy<Task<DriveService>>(CreateDriveServiceAsync, LazyThreadSafetyMode.ExecutionAndPublication);
        _defaultFolderId = configuration["GoogleDrive:FolderId"] ?? DefaultFolderId;
    }

    public string CreateAuthorizationUrl()
    {
        var flow = CreateOAuthFlow();
        return flow.CreateAuthorizationCodeRequest(GetRedirectUri()).Build().ToString();
    }

    public async Task ExchangeAuthorizationCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        var flow = CreateOAuthFlow();
        await flow.ExchangeCodeForTokenAsync("internlink-admin", code, GetRedirectUri(), cancellationToken);
        _drive = new Lazy<Task<DriveService>>(CreateDriveServiceAsync, LazyThreadSafetyMode.ExecutionAndPublication);
    }

    public async Task<GoogleDriveUploadResult> UploadAsync(
        Stream content,
        string fileName,
        string? contentType = null,
        string? folderId = null,
        CancellationToken cancellationToken = default)
    {
        if (content == null || !content.CanRead)
            throw new ArgumentException("A readable file stream is required.", nameof(content));
        if (string.IsNullOrWhiteSpace(fileName))
            throw new ArgumentException("A file name is required.", nameof(fileName));

        var metadata = new Google.Apis.Drive.v3.Data.File
        {
            Name = Path.GetFileName(fileName),
            Parents = new[] { string.IsNullOrWhiteSpace(folderId) ? _defaultFolderId : folderId }
        };

        var request = (await _drive.Value).Files.Create(metadata, content, contentType ?? "application/octet-stream");
        request.Fields = "id,name,size,mimeType,webViewLink";
        request.SupportsAllDrives = true;
        var progress = await request.UploadAsync(cancellationToken);
        if (progress.Status != UploadStatus.Completed || request.ResponseBody == null)
        {
            var detail = progress.Exception?.Message ?? progress.Status.ToString();
            if (detail.Contains("storage quota", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Google Drive upload failed: Service Account không có storage quota. " +
                    "Hãy đặt folder trong Shared Drive (và cấp quyền Content manager) hoặc cấu hình OAuth user/delegation.");
            }

            throw new InvalidOperationException($"Google Drive upload failed: {detail}");
        }

        var uploaded = request.ResponseBody;
        return new GoogleDriveUploadResult(
            uploaded.Id,
            uploaded.Name ?? Path.GetFileName(fileName),
            uploaded.WebViewLink ?? $"https://drive.google.com/file/d/{uploaded.Id}/view",
            uploaded.Size ?? content.Length,
            uploaded.MimeType ?? contentType ?? "application/octet-stream");
    }

    public async Task<byte[]> DownloadAsync(string fileIdOrUrl, CancellationToken cancellationToken = default)
    {
        var fileId = ExtractFileId(fileIdOrUrl);
        await using var output = new MemoryStream();
        var request = (await _drive.Value).Files.Get(fileId);
        request.SupportsAllDrives = true;
        var progress = await request.DownloadAsync(output, cancellationToken);
        if (progress.Status != DownloadStatus.Completed)
            throw new InvalidOperationException($"Google Drive download failed: {progress.Exception?.Message ?? progress.Status.ToString()}");
        return output.ToArray();
    }

    private static string ExtractFileId(string value)
    {
        var marker = "/d/";
        var start = value.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (start >= 0)
        {
            var id = value[(start + marker.Length)..];
            var end = id.IndexOfAny(new[] { '/', '?', '&' });
            return end >= 0 ? id[..end] : id;
        }
        return value.Trim();
    }

    private async Task<DriveService> CreateDriveServiceAsync()
    {
        var clientId = _configuration["GoogleDrive:OAuth:ClientId"];
        var clientSecret = _configuration["GoogleDrive:OAuth:ClientSecret"];
        if (!string.IsNullOrWhiteSpace(clientId) && !string.IsNullOrWhiteSpace(clientSecret))
        {
            var flow = CreateOAuthFlow();
            var token = await flow.DataStore.GetAsync<TokenResponse>("internlink-admin");
            if (token != null && !string.IsNullOrWhiteSpace(token.RefreshToken))
            {
                var userCredential = new UserCredential(flow, "internlink-admin", token);
                return new DriveService(new BaseClientService.Initializer
                {
                    HttpClientInitializer = userCredential,
                    ApplicationName = _configuration["GoogleDrive:ApplicationName"] ?? "InternLink"
                });
            }

            throw new InvalidOperationException("Google Drive chưa được cấp quyền OAuth. Mở /api/google-drive/oauth/start trước.");
        }

        var credentialsPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "google-credentials.json");
        if (!File.Exists(credentialsPath))
            throw new FileNotFoundException(
                "Google Drive credentials file was not found. Place google-credentials.json beside the API binaries.",
                credentialsPath);

        var credential = GoogleCredential.FromJson(File.ReadAllText(credentialsPath))
            .CreateScoped(DriveService.Scope.DriveFile);

        return new DriveService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = _configuration["GoogleDrive:ApplicationName"] ?? "InternLink"
        });
    }

    private GoogleAuthorizationCodeFlow CreateOAuthFlow()
    {
        var clientId = _configuration["GoogleDrive:OAuth:ClientId"]
            ?? throw new InvalidOperationException("GoogleDrive:OAuth:ClientId chưa được cấu hình.");
        var clientSecret = _configuration["GoogleDrive:OAuth:ClientSecret"]
            ?? throw new InvalidOperationException("GoogleDrive:OAuth:ClientSecret chưa được cấu hình.");

        return new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = new ClientSecrets { ClientId = clientId, ClientSecret = clientSecret },
            Scopes = new[] { DriveService.Scope.DriveFile },
            DataStore = new FileDataStore(GetOAuthTokenStorePath())
        });
    }

    private string GetRedirectUri() =>
        _configuration["GoogleDrive:OAuth:RedirectUri"]
        ?? "http://localhost:7109/api/google-drive/oauth/callback";

    private static string GetOAuthTokenStorePath() =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "InternLink", "GoogleDriveOAuth");
}
