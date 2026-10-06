[CmdletBinding()]
param(
    [switch]$AllowLowMemory
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

$os = Get-CimInstance Win32_OperatingSystem
if ($os.Caption -notmatch 'Windows Server 2019') {
    Write-Warning "This runbook targets Windows Server 2019; detected: $($os.Caption)"
}

$memoryGb = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
if ($memoryGb -lt 4 -and -not $AllowLowMemory) {
    throw "Detected $memoryGb GiB RAM. This server needs at least 4 GiB (8 GiB recommended) to run IIS, .NET and SQL Server together. Resize the EC2 instance, then rerun. -AllowLowMemory is not recommended."
}
if ($memoryGb -lt 8) {
    Write-Warning "Detected $memoryGb GiB RAM. SQL Server Express and builds may be slow; 8 GiB is recommended."
}

$sourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$apiProject = Join-Path $sourceRoot 'backend\InternLink\InternLink.API\InternLink.API.csproj'
$frontendPackage = Join-Path $sourceRoot 'frontend\package.json'
if (-not (Test-Path $apiProject) -or -not (Test-Path $frontendPackage)) {
    throw "Run this script from the cloned InternLink repository. Source root: $sourceRoot"
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host 'Installing IIS features...'
$features = Install-WindowsFeature Web-Server, Web-WebSockets, Web-Mgmt-Tools, Web-Scripting-Tools
if (-not $features.Success) {
    throw 'Failed to install required IIS Windows features.'
}

if (-not (Get-Command choco.exe -ErrorAction SilentlyContinue)) {
    Write-Host 'Installing Chocolatey...'
    $installChocolatey = (New-Object Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1')
    Invoke-Expression $installChocolatey
    $env:ChocolateyInstall = Join-Path $env:ProgramData 'chocolatey'
    $env:Path = "$env:ChocolateyInstall\bin;$env:Path"
}

$choco = (Get-Command choco.exe -ErrorAction Stop).Source
Write-Host 'Installing Git, Node.js LTS, .NET 10 SDK, SQL Server Express, IIS URL Rewrite and ARR...'
Invoke-ExternalCommand -FilePath $choco -Arguments @(
    'install', 'git', 'nodejs-lts', 'dotnet-10.0-sdk',
    'sql-server-express', 'urlrewrite', 'iis-arr',
    '--yes', '--accept-license', '--no-progress'
)

$hostingBundle = Join-Path $env:TEMP 'dotnet-hosting-10.exe'
Write-Host 'Installing the official ASP.NET Core 10 Hosting Bundle...'
Invoke-WebRequest `
    -Uri 'https://aka.ms/dotnet/10.0/dotnet-hosting-win.exe' `
    -OutFile $hostingBundle `
    -UseBasicParsing
$hostingInstall = Start-Process -FilePath $hostingBundle `
    -ArgumentList '/install', '/quiet', '/norestart' `
    -Wait -PassThru
Remove-Item $hostingBundle -Force -ErrorAction SilentlyContinue
if ($hostingInstall.ExitCode -notin @(0, 3010)) {
    throw "ASP.NET Core Hosting Bundle installation failed with exit code $($hostingInstall.ExitCode)."
}

# Refresh PATH for software installed in this PowerShell process.
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
    [Environment]::GetEnvironmentVariable('Path', 'User')

$git = (Get-Command git.exe -ErrorAction Stop).Source
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$dotnet = (Get-Command dotnet.exe -ErrorAction Stop).Source

$appRoot = 'C:\Apps\InternLink'
$apiRoot = Join-Path $appRoot 'Api'
$webRoot = 'C:\inetpub\wwwroot\InternLink'
New-Item -ItemType Directory -Force $apiRoot, $webRoot | Out-Null

Write-Host 'Building the frontend and publishing the API...'
Push-Location $sourceRoot
try {
    Invoke-ExternalCommand -FilePath $npm -Arguments @('ci')
    Invoke-ExternalCommand -FilePath $npm -Arguments @('run', 'build', '--workspace=frontend')
    Invoke-ExternalCommand -FilePath $dotnet -Arguments @(
        'publish',
        $apiProject,
        '-c', 'Release',
        '-o', $apiRoot
    )
}
finally {
    Pop-Location
}

Copy-Item (Join-Path $sourceRoot 'frontend\dist\*') $webRoot -Recurse -Force

$webConfig = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Proxy API, SignalR and health checks" stopProcessing="true">
          <match url="^(api|hubs|health)(/.*)?$" />
          <action type="Rewrite" url="http://127.0.0.1:7109/{R:0}" appendQueryString="true" />
        </rule>
        <rule name="React SPA fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
'@
Set-Content -Path (Join-Path $webRoot 'web.config') -Value $webConfig -Encoding UTF8

Write-Host 'Configuring the IIS application pool and sites...'
Import-Module WebAdministration
if (-not (Test-Path 'IIS:\AppPools\InternLinkApi')) {
    New-WebAppPool -Name 'InternLinkApi' | Out-Null
}
Set-ItemProperty 'IIS:\AppPools\InternLinkApi' -Name managedRuntimeVersion -Value ''
Set-ItemProperty 'IIS:\AppPools\InternLinkApi' -Name processModel.identityType -Value ApplicationPoolIdentity

if (-not (Get-Website -Name 'InternLinkApi' -ErrorAction SilentlyContinue)) {
    New-Website -Name 'InternLinkApi' -PhysicalPath $apiRoot `
        -IPAddress '127.0.0.1' -Port 7109 -ApplicationPool 'InternLinkApi' | Out-Null
}
else {
    Set-ItemProperty 'IIS:\Sites\InternLinkApi' -Name physicalPath -Value $apiRoot
}
Set-ItemProperty 'IIS:\Sites\InternLinkApi' -Name applicationPool -Value 'InternLinkApi'

if (-not (Get-Website -Name 'InternLink' -ErrorAction SilentlyContinue)) {
    New-Website -Name 'InternLink' -PhysicalPath $webRoot -IPAddress '*' `
        -Port 80 -HostHeader 'internlink.duckdns.org' | Out-Null
}
else {
    Set-ItemProperty 'IIS:\Sites\InternLink' -Name physicalPath -Value $webRoot
}
Remove-WebBinding -Name 'InternLink' -Protocol 'http' -Port 8000 `
    -ErrorAction SilentlyContinue
if (-not (Get-WebBinding -Name 'InternLink' -Protocol 'http' |
        Where-Object { $_.bindingInformation -eq '*:80:internlink.duckdns.org' })) {
    New-WebBinding -Name 'InternLink' -Protocol 'http' -IPAddress '*' `
        -Port 80 -HostHeader 'internlink.duckdns.org'
}

$appcmd = Join-Path $env:windir 'System32\inetsrv\appcmd.exe'
Invoke-ExternalCommand -FilePath $appcmd -Arguments @(
    'set', 'config', '-section:system.webServer/proxy',
    '/enabled:true', '/commit:apphost'
)
Invoke-ExternalCommand -FilePath $appcmd -Arguments @(
    'set', 'config', '-section:system.webServer/webSocket',
    '/enabled:true', '/commit:apphost'
)

Write-Host 'Preparing persistent uploads and log folders...'
New-Item -ItemType Directory -Force `
    (Join-Path $apiRoot 'Logs'), `
    (Join-Path $apiRoot 'uploads'), `
    (Join-Path $apiRoot 'wwwroot\uploads') | Out-Null
foreach ($folder in @(
    (Join-Path $apiRoot 'Logs'),
    (Join-Path $apiRoot 'uploads'),
    (Join-Path $apiRoot 'wwwroot\uploads')
)) {
    & icacls.exe $folder /grant 'IIS AppPool\InternLinkApi:(OI)(CI)M' /T | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not grant IIS write permission to $folder"
    }
}

Write-Host 'Creating the application database and granting the IIS app pool access...'
$sqlServiceName = 'MSSQL$SQLEXPRESS'
Set-Service -Name $sqlServiceName -StartupType Automatic
Start-Service -Name $sqlServiceName
if (-not (Get-Module -ListAvailable -Name SqlServer)) {
    Install-Module SqlServer -Repository PSGallery -Scope AllUsers -Force -AllowClobber
}
Import-Module SqlServer
$sqlInstance = 'localhost\SQLEXPRESS'
Invoke-Sqlcmd -ServerInstance $sqlInstance -TrustServerCertificate -Query @'
IF DB_ID(N'InternLink') IS NULL
    CREATE DATABASE [InternLink];
'@
Invoke-Sqlcmd -ServerInstance $sqlInstance -Database 'InternLink' -TrustServerCertificate -Query @'
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'IIS APPPOOL\InternLinkApi')
    CREATE LOGIN [IIS APPPOOL\InternLinkApi] FROM WINDOWS;
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'IIS APPPOOL\InternLinkApi')
    CREATE USER [IIS APPPOOL\InternLinkApi] FOR LOGIN [IIS APPPOOL\InternLinkApi];
ALTER ROLE [db_owner] ADD MEMBER [IIS APPPOOL\InternLinkApi];
'@

$backupRoot = Join-Path $appRoot 'Backups'
New-Item -ItemType Directory -Force $backupRoot | Out-Null
foreach ($principal in @(
    'IIS AppPool\InternLinkApi',
    'NT SERVICE\MSSQL$SQLEXPRESS'
)) {
    & icacls.exe $backupRoot /grant "${principal}:(OI)(CI)M" /T | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not grant backup folder permission to $principal"
    }
}

$connectionString = 'Server=localhost\SQLEXPRESS;Database=InternLink;Integrated Security=True;TrustServerCertificate=True;MultipleActiveResultSets=true'
[Environment]::SetEnvironmentVariable(
    'ConnectionStrings__DefaultConnection', $connectionString, 'Machine'
)
[Environment]::SetEnvironmentVariable('Backups__Directory', $backupRoot, 'Machine')
[Environment]::SetEnvironmentVariable('ASPNETCORE_ENVIRONMENT', 'Production', 'Machine')
[Environment]::SetEnvironmentVariable('Email__Enabled', 'false', 'Machine')
[Environment]::SetEnvironmentVariable(
    'Email__PortalUrl', 'http://internlink.duckdns.org', 'Machine'
)
[Environment]::SetEnvironmentVariable(
    'Cors__AllowedOrigins__0', 'http://internlink.duckdns.org', 'Machine'
)
[Environment]::SetEnvironmentVariable('Cors__AllowedOrigins__1', $null, 'Machine')

if (-not [Environment]::GetEnvironmentVariable('Jwt__Secret', 'Machine')) {
    $secretBytes = New-Object byte[] 64
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($secretBytes)
    }
    finally {
        $rng.Dispose()
    }
    $jwtSecret = [Convert]::ToBase64String($secretBytes)
    [Environment]::SetEnvironmentVariable('Jwt__Secret', $jwtSecret, 'Machine')
    $jwtSecret = $null
    $secretBytes = $null
}

New-NetFirewallRule -DisplayName 'InternLink HTTP 80' `
    -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow `
    -ErrorAction SilentlyContinue | Out-Null
Get-NetFirewallRule -DisplayName 'InternLink HTTP 8000' `
    -ErrorAction SilentlyContinue | Remove-NetFirewallRule

Write-Host 'Restarting IIS to load the installed Hosting Bundle and settings...'
iisreset

Write-Host ''
Write-Host 'Deployment finished. Verify SQL migrations and site health before first login:'
Write-Host '  http://internlink.duckdns.org/'
Write-Host '  http://127.0.0.1:7109/health/ready'
Write-Host ''
Write-Warning 'Add inbound Custom TCP port 80 to the EC2 Security Group. Keep ports 1433 and 7109 closed publicly.'
Write-Warning 'HTTP is not encrypted. Configure HTTPS before using real credentials over the Internet.'
