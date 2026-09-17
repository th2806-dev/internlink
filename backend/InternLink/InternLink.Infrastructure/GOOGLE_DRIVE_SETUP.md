# Google Drive storage setup

1. Create a Google service account and enable the Google Drive API.
2. Download its JSON key as `google-credentials.json` and place it at the root of `InternLink.Infrastructure`.
3. Share folder `1am-bFNANQSN07C8Qmb5UR9GvhzKzHLRx` with the service account email as Editor.
4. The project copies the credential file beside the API binaries during build. The file is ignored by git.
5. Apply migrations before starting the API. New document, template, submission, weekly report, and avatar uploads stream to Drive and store the Drive file ID plus view link.

For a personal My Drive, use OAuth instead of the Service Account. Configure the client ID and redirect URI in appsettings, and keep the client secret in User Secrets:

```powershell
dotnet user-secrets set "GoogleDrive:OAuth:ClientSecret" "<rotated-secret>" --project backend/InternLink/InternLink.API/InternLink.API.csproj
```

Start the API, sign in as an admin, and open:
`http://localhost:7109/api/google-drive/oauth/start`

The refresh token is stored under the current user's local application data, not in the repository. The credential files supplied during development must be revoked and replaced if exposed.
