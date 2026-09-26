# InternLink restore - restores DB + uploads as a PAIR produced by scripts/backup.ps1.
# DANGEROUS: overwrites the live database and upload files. API is stopped automatically
# and must be restarted manually afterwards.
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/restore.ps1 -PairDir "backups\internlink_20260926_153000"
#   powershell -File scripts/restore.ps1 -PairDir ... -SkipUploads        # DB only (not recommended)
#   powershell -File scripts/restore.ps1 -PairDir ... -Confirm:$true      # skip interactive prompt
param(
    [Parameter(Mandatory = $true)][string]$PairDir,
    [string]$Server = "127.0.0.1",
    [string]$Database = "InternLink",
    [string]$User = "sa",
    [string]$Password = "sa",
    [string]$UploadsDir = "",
    [switch]$SkipUploads,
    [switch]$Confirm
)

$ErrorActionPreference = "Stop"
$PairDir = (Resolve-Path $PairDir).Path
$manifestPath = Join-Path $PairDir "manifest.json"
$dbFile = Join-Path $PairDir "$Database.bak"
$uploadsZip = Join-Path $PairDir "uploads.zip"

# ── Preflight ─────────────────────────────────────────────────────────────
if (-not (Test-Path $dbFile)) { throw "DB backup not found: $dbFile" }
if (-not (Test-Path $manifestPath)) { Write-Warning "manifest.json missing - pair may be incomplete." }
elseif (-not (Test-Path $uploadsZip) -and -not $SkipUploads) {
    $m = Get-Content $manifestPath -Raw | ConvertFrom-Json
    if ($m.uploadsDirExisted) { throw "uploads.zip missing but source backup had uploads. Refusing partial restore (use -SkipUploads to force)." }
}

if ([string]::IsNullOrWhiteSpace($UploadsDir)) {
    $UploadsDir = Join-Path (Split-Path -Parent $PSScriptRoot) "backend\InternLink\InternLink.API\uploads"
}

Write-Host "=============================================="
Write-Host " RESTORE InternLink"
Write-Host "   Pair   : $PairDir"
Write-Host "   DB     : $Database @ $Server  (OVERWRITE!)"
Write-Host "   Uploads: $(if ($SkipUploads) { 'SKIPPED' } else { $UploadsDir + '  (OVERWRITE!)' })"
Write-Host "=============================================="
if (-not $Confirm) {
    $answer = Read-Host "Type RESTORE to continue"
    if ($answer -ne "RESTORE") { Write-Host "Aborted."; exit 1 }
}

# ── Stop API (locks DB files / uploaded DLLs) ────────────────────────────
Write-Host "==> [1/4] Stopping InternLink.API if running ..."
$procs = Get-Process -Name "InternLink.API" -ErrorAction SilentlyContinue
if ($procs) {
    $procs | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "    Stopped $($procs.Count) process(es). Remember to restart the API after restore."
}
else { Write-Host "    Not running." }

# ── Restore database ──────────────────────────────────────────────────────
Write-Host "==> [2/4] Restoring database [$Database] ..."
# Move data/log files to SQL Server's default location by using MOVE with just filenames.
$sqlcmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
if (-not $sqlcmd) { throw "sqlcmd not found in PATH." }

# Get logical file names from the backup.
$fileListJson = sqlcmd -S $Server -U $User -P $Password -Q "RESTORE FILELISTONLY FROM DISK = N'$dbFile'" -s"|" -W
if ($LASTEXITCODE -ne 0) { throw "RESTORE FILELISTONLY failed." }

sqlcmd -S $Server -U $User -P $Password -Q "RESTORE DATABASE [$Database] FROM DISK = N'$dbFile' WITH REPLACE, RECOVERY" -b
if ($LASTEXITCODE -ne 0) { throw "RESTORE DATABASE failed (exit $LASTEXITCODE)." }
Write-Host "    Database restored from $dbFile."

# ── Restore uploads ───────────────────────────────────────────────────────
if (-not $SkipUploads) {
    Write-Host "==> [3/4] Restoring uploads ..."
    if (Test-Path $uploadsZip) {
        if (Test-Path $UploadsDir) {
            $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
            $moved = "${UploadsDir}_pre_restore_$stamp"
            Move-Item $UploadsDir $moved
            Write-Host "    Existing uploads moved to $moved"
        }
        New-Item -ItemType Directory -Path $UploadsDir -Force | Out-Null
        Expand-Archive -Path $uploadsZip -DestinationPath $UploadsDir -Force
        Write-Host "    Uploads extracted to $UploadsDir"
    }
    else {
        Write-Warning "    uploads.zip not found in pair - uploads left untouched."
    }
}
else {
    Write-Host "==> [3/4] Skipping uploads (-SkipUploads)."
}

# ── Post-restore note ─────────────────────────────────────────────────────
Write-Host "==> [4/4] Done."
Write-Host ""
Write-Host "RESTORE OK."
Write-Host "Next steps:"
Write-Host "  1. Start the API:  cd backend/InternLink/InternLink.API && dotnet run"
Write-Host "     (dev fresh DB will NOT re-seed because data already exists - expected)"
Write-Host "  2. Verify: login admin / check a few student portals / open one uploaded file."
