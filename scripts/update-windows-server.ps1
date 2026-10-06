[CmdletBinding()]
param(
    [string]$RepositoryRoot = 'C:\src\InternLink'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-ExternalCommand {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE`: $FilePath $($Arguments -join ' ')"
    }
}

if (-not (Test-Administrator)) {
    throw 'Open Windows PowerShell with Run as administrator and run this script again.'
}

$sourceRoot = (Resolve-Path $RepositoryRoot).Path
$apiProject = Join-Path $sourceRoot 'backend\InternLink\InternLink.API\InternLink.API.csproj'
$frontendPackage = Join-Path $sourceRoot 'frontend\package.json'
if (-not (Test-Path $apiProject) -or -not (Test-Path $frontendPackage)) {
    throw "Repository not found or incomplete: $sourceRoot"
}

$git = (Get-Command git.exe -ErrorAction Stop).Source
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$dotnet = (Get-Command dotnet.exe -ErrorAction Stop).Source
$curl = (Get-Command curl.exe -ErrorAction Stop).Source

Write-Host 'Updating source from origin/main...'
Push-Location $sourceRoot
try {
    Invoke-ExternalCommand -FilePath $git -Arguments @('pull', '--ff-only', 'origin', 'main')
    $dirtyFiles = & $git status --porcelain --untracked-files=no
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to check the repository working tree.'
    }
    if ($dirtyFiles) {
        throw "Tracked server-side changes remain in the repository. Preserve or commit them before deploying:`n$($dirtyFiles -join "`n")"
    }

    Write-Host 'Building the frontend and publishing the API to a staging directory...'
    Invoke-ExternalCommand -FilePath $npm -Arguments @('ci')
    Invoke-ExternalCommand -FilePath $npm -Arguments @('run', 'build', '--workspace=frontend')

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $apiStage = Join-Path $env:TEMP "InternLink.Api.$stamp"
    Invoke-ExternalCommand -FilePath $dotnet -Arguments @(
        'publish',
        $apiProject,
        '-c', 'Release',
        '-o', $apiStage
    )
}
finally {
    Pop-Location
}

$appRoot = 'C:\Apps\InternLink'
$apiRoot = Join-Path $appRoot 'Api'
$webRoot = 'C:\inetpub\wwwroot\InternLink'
$backupRoot = Join-Path $appRoot 'Backups'
$frontendDist = Join-Path $sourceRoot 'frontend\dist'
if (-not (Test-Path (Join-Path $frontendDist 'index.html'))) {
    throw "Frontend build output is missing: $frontendDist"
}
New-Item -ItemType Directory -Force $apiRoot, $webRoot, $backupRoot | Out-Null

Write-Host 'Creating a non-compressed SQL Server backup before deployment...'
Import-Module SqlServer -ErrorAction Stop
$backupPath = Join-Path $backupRoot "InternLink-before-deploy-$stamp.bak"
$backupPathSql = $backupPath.Replace("'", "''")
Invoke-Sqlcmd -ServerInstance 'localhost\SQLEXPRESS' -Database master `
    -TrustServerCertificate `
    -Query "BACKUP DATABASE [InternLink] TO DISK = N'$backupPathSql' WITH COPY_ONLY, CHECKSUM" `
    -QueryTimeout 0
if (-not (Test-Path $backupPath) -or (Get-Item $backupPath).Length -eq 0) {
    throw "SQL backup was not created. Deployment has not started: $backupPath"
}

Import-Module WebAdministration -ErrorAction Stop
$apiSite = Get-Website -Name 'InternLinkApi' -ErrorAction Stop
$webSite = Get-Website -Name 'InternLink' -ErrorAction Stop
if ($apiSite.State -eq 'Started') {
    Stop-Website -Name 'InternLinkApi'
}
if ((Get-WebAppPoolState -Name 'InternLinkApi').Value -eq 'Started') {
    Stop-WebAppPool -Name 'InternLinkApi'
}
if ($webSite.State -eq 'Started') {
    Stop-Website -Name 'InternLink'
}

try {
    Write-Host 'Deploying files without deleting persistent uploads or web.config...'
    & robocopy.exe $apiStage $apiRoot /E `
        /XD (Join-Path $apiStage 'Logs') `
            (Join-Path $apiStage 'uploads') `
            (Join-Path $apiStage 'wwwroot\uploads') `
        /NFL /NDL /NJH /NJS /NP
    if ($LASTEXITCODE -ge 8) {
        throw "API file deployment failed with robocopy exit code $LASTEXITCODE."
    }

    & robocopy.exe $frontendDist $webRoot /E /XF 'web.config' /NFL /NDL /NJH /NJS /NP
    if ($LASTEXITCODE -ge 8) {
        throw "Frontend file deployment failed with robocopy exit code $LASTEXITCODE."
    }

    Set-ItemProperty 'IIS:\Sites\InternLinkApi' -Name physicalPath -Value $apiRoot
    Set-ItemProperty 'IIS:\Sites\InternLinkApi' -Name applicationPool -Value 'InternLinkApi'
    Remove-WebBinding -Name 'InternLink' -Protocol 'http' -Port 8000 `
        -ErrorAction SilentlyContinue
    if (-not (Get-WebBinding -Name 'InternLink' -Protocol 'http' |
            Where-Object { $_.bindingInformation -eq '*:80:internlink.duckdns.org' })) {
        New-WebBinding -Name 'InternLink' -Protocol 'http' -IPAddress '*' `
            -Port 80 -HostHeader 'internlink.duckdns.org'
    }

    [Environment]::SetEnvironmentVariable(
        'Email__PortalUrl', 'http://internlink.duckdns.org', 'Machine'
    )
    [Environment]::SetEnvironmentVariable(
        'Cors__AllowedOrigins__0', 'http://internlink.duckdns.org', 'Machine'
    )
    [Environment]::SetEnvironmentVariable('Cors__AllowedOrigins__1', $null, 'Machine')

    New-NetFirewallRule -DisplayName 'InternLink HTTP 80' `
        -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow `
        -ErrorAction SilentlyContinue | Out-Null
    Get-NetFirewallRule -DisplayName 'InternLink HTTP 8000' `
        -ErrorAction SilentlyContinue | Remove-NetFirewallRule

    Start-WebAppPool -Name 'InternLinkApi'
    Start-Website -Name 'InternLinkApi'
    Start-Website -Name 'InternLink'
}
catch {
    if ((Get-WebAppPoolState -Name 'InternLinkApi').Value -ne 'Started') {
        Start-WebAppPool -Name 'InternLinkApi'
    }
    if ((Get-Website -Name 'InternLinkApi').State -ne 'Started') {
        Start-Website -Name 'InternLinkApi'
    }
    if ((Get-Website -Name 'InternLink').State -ne 'Started') {
        Start-Website -Name 'InternLink'
    }
    throw
}

Write-Host 'Checking API readiness and the IIS frontend binding...'
$healthResponse = $null
for ($attempt = 1; $attempt -le 10; $attempt++) {
    try {
        $healthResponse = Invoke-WebRequest -UseBasicParsing `
            -Uri 'http://127.0.0.1:7109/health/ready' -TimeoutSec 15
        if ($healthResponse.StatusCode -eq 200) {
            break
        }
    }
    catch {
        if ($attempt -eq 10) {
            throw "API readiness check failed after deployment: $($_.Exception.Message)"
        }
        Start-Sleep -Seconds 3
    }
}
if ($healthResponse.StatusCode -ne 200) {
    throw "API readiness returned HTTP $($healthResponse.StatusCode)."
}

& $curl --fail --silent --show-error --resolve `
    'internlink.duckdns.org:80:127.0.0.1' `
    --output NUL 'http://internlink.duckdns.org/'
if ($LASTEXITCODE -ne 0) {
    throw "IIS frontend check failed with curl exit code $LASTEXITCODE."
}

Write-Host ''
Write-Host 'Update completed.'
Write-Host "  Public site: http://internlink.duckdns.org/"
Write-Host "  API health:  http://127.0.0.1:7109/health/ready"
Write-Host "  SQL backup:  $backupPath"
Write-Warning 'In the EC2 Security Group, allow inbound Custom TCP port 80. Keep ports 1433 and 7109 closed publicly.'
Write-Warning 'HTTP is not encrypted. Configure HTTPS before using real credentials over the Internet.'
