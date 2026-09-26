# InternLink backup - DB (.bak) + uploads folder into one timestamped pair.
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/backup.ps1                     # default target
#   powershell -ExecutionPolicy Bypass -File scripts/backup.ps1 -BackupRoot D:\bk   # custom target
#   powershell -ExecutionPolicy Bypass -File scripts/backup.ps1 -Keep 10            # keep 10 newest pairs
# Restore the pair with scripts/restore.ps1 - DB and uploads must be restored together.
param(
    [string]$BackupRoot = (Join-Path (Split-Path -Parent $PSScriptRoot) "backups"),
    [string]$Server = "127.0.0.1",
    [string]$Database = "InternLink",
    [string]$User = "sa",
    [string]$Password = "sa",
    [string]$UploadsDir = "",
    [int]$Keep = 0
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$pairDir = Join-Path $BackupRoot "internlink_$timestamp"

# Uploads live next to the API project in dev (ContentRootPath/uploads); override with -UploadsDir.
if ([string]::IsNullOrWhiteSpace($UploadsDir)) {
    $UploadsDir = Join-Path (Split-Path -Parent $PSScriptRoot) "backend\InternLink\InternLink.API\uploads"
}

New-Item -ItemType Directory -Path $pairDir -Force | Out-Null

Write-Host "==> [1/3] Backing up database [$Database] on $Server ..."
$sqlcmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
if (-not $sqlcmd) { throw "sqlcmd not found in PATH. Install SQL Server command-line tools." }
$dbFile = Join-Path $pairDir "$Database.bak"
sqlcmd -S $Server -U $User -P $Password -Q "BACKUP DATABASE [$Database] TO DISK = N'$dbFile' WITH INIT, COMPRESSION, CHECKSUM" -b
if ($LASTEXITCODE -ne 0) { throw "Database backup failed (exit $LASTEXITCODE)." }
Write-Host "    DB  -> $dbFile ($([math]::Round((Get-Item $dbFile).Length / 1KB)) KB)"

Write-Host "==> [2/3] Backing up uploads folder ..."
$uploadsFile = Join-Path $pairDir "uploads.zip"
if (Test-Path $UploadsDir) {
    Compress-Archive -Path (Join-Path $UploadsDir "*") -DestinationPath $uploadsFile -Force
    Write-Host "    Files -> $uploadsFile ($([math]::Round((Get-Item $uploadsFile).Length / 1KB)) KB) from $UploadsDir"
}
else {
    Write-Warning "    Uploads dir not found at $UploadsDir - creating EMPTY marker. Metadata without files is incomplete!"
    New-Item -ItemType File -Path (Join-Path $pairDir "UPLOADS_DIR_MISSING.txt") | Out-Null
}

# Manifest so restore can verify the pair belongs together.
$manifest = @{
    database   = $Database
    server     = $Server
    createdAt  = (Get-Date).ToString("o")
    dbFile     = Split-Path -Leaf $dbFile
    uploadsZip = Split-Path -Leaf $uploadsFile
    uploadsDir = $UploadsDir
    uploadsDirExisted = (Test-Path $UploadsDir)
}
$manifest | ConvertTo-Json | Set-Content -Path (Join-Path $pairDir "manifest.json") -Encoding UTF8
Write-Host "    manifest.json written."

Write-Host "==> [3/3] Retention ..."
if ($Keep -gt 0) {
    $pairs = Get-ChildItem -Path $BackupRoot -Directory -Filter "internlink_*" | Sort-Object Name -Descending
    $old = $pairs | Select-Object -Skip $Keep
    foreach ($d in $old) {
        Remove-Item $d.FullName -Recurse -Force
        Write-Host "    Removed old pair $($d.Name)"
    }
    Write-Host "    Kept $($Keep) newest pair(s)."
}
else {
    Write-Host "    Skipped (pass -Keep N to auto-delete old pairs)."
}

Write-Host ""
Write-Host "BACKUP OK: $pairDir"
Write-Host ("Restore with: powershell -ExecutionPolicy Bypass -File scripts/restore.ps1 -PairDir {0}" -f $pairDir)
