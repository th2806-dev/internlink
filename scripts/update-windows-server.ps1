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

    $defaultSettingsPath = Join-Path $sourceRoot 'backend\InternLink\InternLink.API\appsettings.json'
    if (-not (Test-Path $defaultSettingsPath)) {
        throw "Configuration file not found: $defaultSettingsPath"
    }
    try {
        $defaultSettings = Get-Content $defaultSettingsPath -Raw | ConvertFrom-Json
    }
    catch {
        throw "Could not read appsettings.json: $($_.Exception.Message)"
    }

    $sourceLocalSettingsPath = Join-Path $sourceRoot 'backend\InternLink\InternLink.API\appsettings.local.json'
    $apiRoot = 'C:\Apps\InternLink\Api'
    $deployedLocalSettingsPath = Join-Path $apiRoot 'appsettings.local.json'
    $localSettingsPath = $null
    $localSettings = $null

    if (Test-Path $sourceLocalSettingsPath) {
        $localSettingsPath = $sourceLocalSettingsPath
    }
    elseif (Test-Path $deployedLocalSettingsPath) {
        $localSettingsPath = $deployedLocalSettingsPath
        Write-Host "Using server-local settings: $localSettingsPath"
    }

    if ($localSettingsPath) {
        try {
            $localSettings = Get-Content $localSettingsPath -Raw | ConvertFrom-Json
        }
        catch {
            Write-Warning "Could not read local settings JSON: $($_.Exception.Message)"
        }
    }

    $defaultEmail = $defaultSettings.Email
    $localEmail = if ($localSettings) { $localSettings.Email } else { $null }

    $smtpUsername = [string]$defaultEmail.Username
    if ($localEmail -and -not [string]::IsNullOrWhiteSpace($localEmail.Username)) {
        $smtpUsername = [string]$localEmail.Username
    }
    if ([string]::IsNullOrWhiteSpace($smtpUsername)) {
        $smtpUsername = [Environment]::GetEnvironmentVariable('Email__Username', 'Machine')
    }

    $smtpPassword = [string]$defaultEmail.Password
    if ($localEmail -and -not [string]::IsNullOrWhiteSpace($localEmail.Password)) {
        $smtpPassword = [string]$localEmail.Password
    }
    $smtpPassword = $smtpPassword -replace '\s', ''

    $smtpEnabled = $null -ne $defaultEmail.Enabled -and [bool]$defaultEmail.Enabled
    if ($localEmail -and $null -ne $localEmail.Enabled) {
        $smtpEnabled = [bool]$localEmail.Enabled
    }

    if (-not $smtpEnabled -or [string]::IsNullOrWhiteSpace($smtpPassword)) {
        throw 'SMTP must be enabled (Email.Enabled = true) and Email.Password must contain a valid Gmail App Password in appsettings.json.'
    }
    if ($smtpUsername -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
        throw 'Email.Username in appsettings.json (or environment) is missing or invalid.'
    }

    $smtpHost = [string]$defaultEmail.SmtpHost
    if ($localEmail -and -not [string]::IsNullOrWhiteSpace($localEmail.SmtpHost)) { $smtpHost = [string]$localEmail.SmtpHost }
    if ([string]::IsNullOrWhiteSpace($smtpHost)) { $smtpHost = 'smtp.gmail.com' }

    $smtpPort = [int]$defaultEmail.SmtpPort
    if ($localEmail -and $null -ne $localEmail.SmtpPort) { $smtpPort = [int]$localEmail.SmtpPort }
    if ($smtpPort -le 0) { $smtpPort = 587 }

    $smtpFrom = [string]$defaultEmail.FromAddress
    if ($localEmail -and -not [string]::IsNullOrWhiteSpace($localEmail.FromAddress)) { $smtpFrom = [string]$localEmail.FromAddress }
    if ([string]::IsNullOrWhiteSpace($smtpFrom)) { $smtpFrom = $smtpUsername }

    $smtpFromName = [string]$defaultEmail.FromName
    if ($localEmail -and -not [string]::IsNullOrWhiteSpace($localEmail.FromName)) { $smtpFromName = [string]$localEmail.FromName }

    $testRecipient = [string]$defaultEmail.SupportEmail
    if ($localEmail -and -not [string]::IsNullOrWhiteSpace($localEmail.SupportEmail)) { $testRecipient = [string]$localEmail.SupportEmail }
    if ([string]::IsNullOrWhiteSpace($testRecipient)) {
        $testRecipient = [Environment]::GetEnvironmentVariable('Email__SupportEmail', 'Machine')
    }
    if ($testRecipient -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
        throw 'Email.SupportEmail in appsettings.json is missing or invalid.'
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
    Remove-Item (Join-Path $apiStage 'appsettings.local.json') `
        -Force -ErrorAction SilentlyContinue
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
$otherPort80Bindings = @(
    Get-Website | Where-Object { $_.Name -ne 'InternLink' -and $_.State -eq 'Started' } |
        ForEach-Object {
            $siteName = $_.Name
            $_.Bindings.Collection |
                Where-Object {
                    $_.protocol -eq 'http' -and
                    $_.bindingInformation -match '^\*:80:(.*)$' -and
                    ($Matches[1] -eq '' -or $Matches[1] -eq 'internlink.duckdns.org')
                } |
                ForEach-Object { "$siteName ($($_.bindingInformation))" }
        }
)
if ($otherPort80Bindings.Count -gt 0) {
    throw "Port 80 conflicts with another started IIS site: $($otherPort80Bindings -join ', '). Resolve this binding before deploying."
}

$webWasStarted = $webSite.State -eq 'Started'
$offlinePath = Join-Path $apiRoot 'app_offline.htm'
Set-Content -Path $offlinePath -Value 'InternLink update in progress.' -Encoding ASCII
if ($apiSite.State -eq 'Started') {
    Stop-Website -Name 'InternLinkApi'
}
if ((Get-WebAppPoolState -Name 'InternLinkApi').Value -eq 'Started') {
    Stop-WebAppPool -Name 'InternLinkApi'
}

$workerDeadline = (Get-Date).AddSeconds(90)
do {
    $apiWorkers = @(
        Get-CimInstance Win32_Process -Filter "Name = 'w3wp.exe'" |
            Where-Object { $_.CommandLine -match '(?i)-ap\s+"?InternLinkApi"?' }
    )
    if ($apiWorkers.Count -eq 0) {
        break
    }
    if ((Get-Date) -ge $workerDeadline) {
        throw "IIS worker process for InternLinkApi is still running (PID $($apiWorkers.ProcessId -join ', ')); deployment stopped before copying API files."
    }
    Start-Sleep -Seconds 2
} while ($true)

if ((Get-WebAppPoolState -Name 'InternLinkApi').Value -ne 'Stopped') {
    throw 'InternLinkApi application pool did not stop; deployment stopped before copying API files.'
}

Write-Host 'Deploying API files while the application is offline; persistent folders are excluded...'
& robocopy.exe $apiStage $apiRoot /E `
    /XD (Join-Path $apiStage 'Logs') `
        (Join-Path $apiStage 'uploads') `
        (Join-Path $apiStage 'wwwroot\uploads') `
    /NFL /NDL /NJH /NJS /NP
if ($LASTEXITCODE -ge 8) {
    throw "API file deployment failed with robocopy exit code $LASTEXITCODE. The API remains stopped and app_offline.htm is retained; rerun this script after resolving the file lock."
}

if ($localSettingsPath -and (Test-Path $localSettingsPath)) {
    $deployedSettingsPath = Join-Path $apiRoot 'appsettings.local.json'
    if ([IO.Path]::GetFullPath($localSettingsPath) -ne [IO.Path]::GetFullPath($deployedSettingsPath)) {
        Copy-Item -LiteralPath $localSettingsPath -Destination $deployedSettingsPath -Force
    }
    $runtimeSettings = Get-Content $deployedSettingsPath -Raw | ConvertFrom-Json
    $runtimeSettings.Email.Password = $smtpPassword
    $runtimeSettings | ConvertTo-Json -Depth 100 |
        Set-Content -LiteralPath $deployedSettingsPath -Encoding UTF8
    & icacls.exe $deployedSettingsPath /inheritance:r `
        /grant:r '*S-1-5-18:F' '*S-1-5-32-544:F' 'IIS AppPool\InternLinkApi:R' | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning 'Could not restrict access to the deployed appsettings.local.json secret file.'
    }
}

Write-Host 'Ensuring upload directories exist on the server...'
$uploadDirs = @(
    (Join-Path $apiRoot 'uploads\documents'),
    (Join-Path $apiRoot 'uploads\submissions'),
    (Join-Path $apiRoot 'uploads\weekly-reports')
)
foreach ($dir in $uploadDirs) {
    New-Item -ItemType Directory -Force $dir | Out-Null
}
& icacls.exe (Join-Path $apiRoot 'uploads') /grant 'IIS AppPool\InternLinkApi:(OI)(CI)M' /T | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Warning 'Could not grant IIS write access to the uploads directory.'
}

$deployedAppSettings = Join-Path $apiRoot 'appsettings.json'
if (Test-Path $deployedAppSettings) {
    & icacls.exe $deployedAppSettings /grant 'IIS AppPool\InternLinkApi:R' | Out-Null
}

Write-Host 'Deploying frontend files while preserving web.config...'
& robocopy.exe $frontendDist $webRoot /E /XF 'web.config' /NFL /NDL /NJH /NJS /NP
if ($LASTEXITCODE -ge 8) {
    throw "Frontend file deployment failed with robocopy exit code $LASTEXITCODE. The API remains stopped and app_offline.htm is retained; rerun this script after resolving the file copy error."
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

Write-Host ''
[Environment]::SetEnvironmentVariable('Email__Enabled', $null, 'Machine')
[Environment]::SetEnvironmentVariable('Email__Username', $null, 'Machine')
[Environment]::SetEnvironmentVariable('Email__Password', $null, 'Machine')
[Environment]::SetEnvironmentVariable('Email__FromAddress', $null, 'Machine')
[Environment]::SetEnvironmentVariable('Email__SupportEmail', $null, 'Machine')

Write-Warning 'Restarting Windows Process Activation Service so IIS reloads configuration; all IIS sites may be briefly unavailable.'
Restart-Service -Name WAS -Force
Start-Service -Name W3SVC

New-NetFirewallRule -DisplayName 'InternLink HTTP 80' `
    -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow `
    -ErrorAction SilentlyContinue | Out-Null
Get-NetFirewallRule -DisplayName 'InternLink HTTP 8000' `
    -ErrorAction SilentlyContinue | Remove-NetFirewallRule

Remove-Item $offlinePath -Force
if ((Get-WebAppPoolState -Name 'InternLinkApi').Value -ne 'Started') {
    Start-WebAppPool -Name 'InternLinkApi'
}
if ((Get-Website -Name 'InternLinkApi').State -ne 'Started') {
    Start-Website -Name 'InternLinkApi'
}
if ($webWasStarted -and (Get-Website -Name 'InternLink').State -ne 'Started') {
    Start-Website -Name 'InternLink'
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

Write-Host "Sending SMTP diagnostic email to $testRecipient..."
$smtpClient = [System.Net.Mail.SmtpClient]::new($smtpHost, $smtpPort)
$smtpClient.EnableSsl = $true
$smtpClient.Credentials = [System.Net.NetworkCredential]::new($smtpUsername, $smtpPassword)
$smtpMessage = [System.Net.Mail.MailMessage]::new()
$smtpMessage.From = [System.Net.Mail.MailAddress]::new($smtpFrom, $smtpFromName)
$smtpMessage.To.Add($testRecipient)
$smtpMessage.Subject = '[InternLink] SMTP configuration test'
$smtpMessage.Body = 'This is an SMTP delivery test for http://internlink.duckdns.org/'
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
} catch {}

try {
    $smtpClient.Send($smtpMessage)
    $smtpTestSent = $true
}
catch {
    $errDetail = $_.Exception.Message
    if ($_.Exception.InnerException) {
        $errDetail += " Inner: $($_.Exception.InnerException.Message)"
    }
    Write-Warning "SMTP test email could not be sent: $errDetail"
}
finally {
    $smtpMessage.Dispose()
    $smtpClient.Dispose()
    $smtpPassword = $null
    $localSettings = $null
    $localEmail = $null
    $runtimeSettings = $null
}

& $curl --fail --silent --show-error --resolve `
    'internlink.duckdns.org:80:127.0.0.1' `
    --output NUL 'http://internlink.duckdns.org/'
if ($LASTEXITCODE -ne 0) {
    throw "IIS frontend check failed with curl exit code $LASTEXITCODE."
}

Write-Host ''
Write-Host 'Update completed.'
if ($smtpTestSent) {
    Write-Host "SMTP test email was accepted by the SMTP server for: $testRecipient"
}
Write-Host "  Public site: http://internlink.duckdns.org/"
Write-Host "  API health:  http://127.0.0.1:7109/health/ready"
Write-Host "  SQL backup:  $backupPath"
Write-Warning 'In the EC2 Security Group, allow inbound Custom TCP port 80. Keep ports 1433 and 7109 closed publicly.'
Write-Warning 'HTTP is not encrypted. Configure HTTPS before using real credentials over the Internet.'
