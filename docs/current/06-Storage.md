# InternLink - Storage and Files

**Verified:** 2026-09-26

## Storage model

Uploaded bytes are stored only on the backend local filesystem. SQL Server stores metadata and relative paths. The API does not connect to Google Drive or store file contents in database columns.

| Content | Runtime directory |
|:--|:--|
| General documents | `/app/uploads/documents` |
| Weekly report files | `/app/uploads/weekly-reports` |
| Submission files/assets | `/app/uploads/submissions` |

The current Compose file mounts `/app/uploads` to the named volume `internlink_uploads_data`. The API writes under its content root, so this volume persists uploaded files when containers are recreated. Keep the volume and database backups together.

## Database metadata

Documents, weekly reports, submissions and submission assets retain file name/path, MIME type and related ownership/entity identifiers. Physical files are addressed by generated identifiers and relative paths, not by trusting a client-provided path. Legacy `GoogleDriveFileId` columns are retained for schema compatibility but are not read or written by the current application.

Existing rows whose file path is an HTTP(S) Google Drive URL are not available through the local-only runtime. Copy those files into the local upload volume and update their database paths before relying on them; retain backups of both sources during migration.

## Limits and validation

- Weekly report uploads have a 20 MB limit.
- Documents and submissions use extension/MIME allowlists in their respective services/controllers.
- Submission bundles may include uploaded files and external links.
- Download endpoints enforce the authorization rules of the owning entity.
- Document deletion soft-deletes the database row and attempts to remove the physical file.

The exact allowlists are implementation-owned by `DocumentController`, `SubmissionController`, `WeeklyReportController` and the corresponding services. Update this document when those constants change.

## Local development storage

Do not keep runtime uploads under a tracked source directory. Local API runs may use `InternLink.API/uploads`; this directory is ignored and should be treated as disposable test data. Before deleting it, compare metadata and archive any files that are still needed.

## Recommended production policy

- Keep uploads outside the source tree.
- Use a persistent volume or object storage with a backup policy.
- Store only relative paths and metadata in SQL Server.
- Generate a UUID-based server-side file name.
- Validate size, extension and detected content type.
- Prevent path traversal and never concatenate an unchecked client path.
- Run a periodic orphan-file report before deletion.
- Back up database and upload storage together because metadata without bytes is incomplete data.

## Backup example

```powershell
docker exec internlink_database /opt/mssql-tools18/bin/sqlcmd `
  -S localhost -U sa -P $env:MSSQL_SA_PASSWORD -C `
  -Q "BACKUP DATABASE [InternLink] TO DISK = N'/var/opt/mssql/data/InternLink.bak' WITH INIT, COPY_ONLY, COMPRESSION"

docker cp internlink_database:/var/opt/mssql/data/InternLink.bak .\InternLink.bak
```

The upload volume must be backed up separately. Do not use `docker compose down -v` unless database and uploads are intentionally being destroyed.
