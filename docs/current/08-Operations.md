# InternLink - Operations Guide

## Compose startup

```powershell
cd E:\Downloads\internlink
docker compose up -d --build
docker compose ps
```

The normal entrypoint is `http://localhost:3000`. The backend and SQL Server ports are internal to the Compose network in the current configuration. Do not assume `localhost:7109` or `localhost:1433` are published unless those lines are explicitly enabled in `docker-compose.yml`.

## Service health

```powershell
docker compose ps
docker logs --tail 200 internlink_api
Invoke-WebRequest http://localhost:3000/
```

Health endpoints are `/health`, `/health/live` and `/health/ready`. The backend healthcheck uses `/health/live`; readiness also verifies database connectivity.

## Persistence

- `internlink_database_data` persists SQL Server files.
- `internlink_uploads_data` persists `/app/uploads`.
- `docker compose down` removes containers and the Compose network but keeps named volumes.
- `docker compose down -v` destroys named volumes and therefore destroys database/upload data. Use only for an intentional reset after backup.

## Backup and restore

Back up SQL Server with `BACKUP DATABASE` and copy the `.bak` file outside the container. Back up the upload volume separately. Restore both database and files as a pair; metadata without its physical files is incomplete.

### Runbook: standard backup/restore (Windows, local SQL Server)

The project ships two scripts that treat the database and the uploads folder as ONE pair:

- `scripts/backup.ps1` — backs up DB (`.bak` via `sqlcmd`, with COMPRESSION + CHECKSUM)
  and zips `backend/InternLink/InternLink.API/uploads` into one timestamped folder
  `backups/internlink_yyyyMMdd_HHmmss/` (contains `InternLink.bak`, `uploads.zip`, `manifest.json`).
- `scripts/restore.ps1` — restores that pair: preflight checks the `.bak`/`uploads.zip` match,
  asks for interactive confirmation (or `-Confirm`), stops the running API, `RESTORE DATABASE ... WITH REPLACE`,
  and swaps the uploads folder (existing files are kept beside as `uploads_pre_restore_<stamp>`).

```powershell
# Backup (keeps the 5 newest pairs)
powershell -ExecutionPolicy Bypass -File scripts/backup.ps1 -Keep 5

# Restore a pair (interactive; dangerous - overwrites live data)
powershell -ExecutionPolicy Bypass -File scripts/restore.ps1 -PairDir backups/internlink_20260926_161707

# Parameters both scripts accept: -Server 127.0.0.1 -Database InternLink -User sa -Password sa
# backup.ps1: -BackupRoot <dir> -UploadsDir <dir> -Keep <n>   restore.ps1: -SkipUploads -Confirm
```

Procedure rules:

1. Always restore DB and uploads together (the pair). `-SkipUploads` is an escape hatch, not the default.
2. Copy the pair folder off-machine after backup; `backups/` is local-only and gitignored.
3. After restore, restart the API manually and verify: admin login, one student portal, one uploaded file opens.
4. Schedule backups outside the app (Task Scheduler/cron). The app intentionally has no backup jobs -
   see 01-Architecture.md.
5. Docker deployment: the scripts target a local SQL Server; inside Docker run `BACKUP DATABASE` against
   the `internlink_database_data` volume (see 06-Storage.md) and zip the `internlink_uploads_data` volume,
   keeping the same pair discipline.

Verified round-trip on 2026-09-26: backup -> insert marker row -> restore -> marker gone, users intact,
uploads folder byte-identical, API restarts and admin login works.

## Logs

Serilog writes to console and the configured rolling file sink. Runtime logs belong outside source control. Keep production log levels intentional because request logging can be noisy when portal polling or duplicate fetches are present.

## Common failures

| Symptom | Check |
|:--|:--|
| Backend unhealthy | `docker logs internlink_api`; then check SQL Server health and connection string |
| Login invalid | Confirm database has seeded `admin`; check migration completed and use the current password |
| Frontend cannot call API | Check Nginx proxy paths, browser network tab and backend health |
| Migration fails | Inspect the failing migration and schema; do not edit an applied migration without a recovery plan |
| Upload missing | Verify `internlink_uploads_data` is mounted and the database relative path points to an existing file |
| Docker pull/build EOF | Retry registry download after checking Docker Desktop/network; this is not necessarily a source error |

## Runtime file policy

Uploads belong in the persistent volume or an external object store, not in the repository. Use server-generated names, validate content and size, enforce ownership checks, and periodically report orphaned files before deletion.
