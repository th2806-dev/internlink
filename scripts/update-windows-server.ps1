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

function Read-PlainTextSecret {
    param([Parameter(Mandatory = $true)][string]$Prompt)

    $secureValue = Read-Host -Prompt $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $secureValue.Dispose()
    }
}

function Get-ApiErrorBody {
    param([Parameter(Mandatory = $true)]$ErrorRecord)

    $response = $ErrorRecord.Exception.Response
    if ($null -eq $response) {
        return $ErrorRecord.Exception.Message
    }

    $stream = $response.GetResponseStream()
    if ($null -eq $stream) {
        return $ErrorRecord.Exception.Message
    }

    $reader = New-Object System.IO.StreamReader($stream)
    try {
        $body = $reader.ReadToEnd()
        if ([string]::IsNullOrWhiteSpace($body)) {
            return $ErrorRecord.Exception.Message
        }
        return $body
    }
    finally {
        $reader.Dispose()
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
Write-Host 'Configure Gmail SMTP for this server.'
$smtpUsername = 'internlink.cntt@gmail.com'
Write-Host "SMTP sender is fixed to $smtpUsername."

$smtpPassword = Read-PlainTextSecret -Prompt 'New Gmail App Password (input is hidden)'
$smtpPassword = $smtpPassword -replace '\s', ''
if ([string]::IsNullOrWhiteSpace($smtpPassword)) {
    throw 'The Gmail App Password cannot be empty. SMTP has not been enabled.'
}

$adminUsername = Read-Host 'SuperAdmin username'
if ([string]::IsNullOrWhiteSpace($adminUsername)) {
    throw 'SuperAdmin username cannot be empty. SMTP has not been enabled.'
}
$adminPassword = Read-PlainTextSecret -Prompt 'SuperAdmin password (input is hidden)'
if ([string]::IsNullOrWhiteSpace($adminPassword)) {
    throw 'SuperAdmin password cannot be empty. SMTP has not been enabled.'
}

[Environment]::SetEnvironmentVariable('Email__Enabled', 'true', 'Machine')
[Environment]::SetEnvironmentVariable('Email__Username', $smtpUsername, 'Machine')
[Environment]::SetEnvironmentVariable('Email__Password', $smtpPassword, 'Machine')
[Environment]::SetEnvironmentVariable('Email__FromAddress', $smtpUsername, 'Machine')
[Environment]::SetEnvironmentVariable('Email__SupportEmail', $smtpUsername, 'Machine')
$smtpPassword = $null

Write-Warning 'Restarting Windows Process Activation Service to reload machine SMTP variables; all IIS sites may be briefly unavailable.'
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

Write-Host 'Signing in to read the configured test-recipient address...'
$apiBaseUrl = 'http://127.0.0.1:7109/api'
try {
    $loginResponse = Invoke-RestMethod -UseBasicParsing -Method Post `
        -Uri "$apiBaseUrl/Auth/login" `
        -ContentType 'application/json' `
        -Body (@{ username = $adminUsername; password = $adminPassword } | ConvertTo-Json -Compress)
}
catch {
    throw "Could not sign in to the API to run the SMTP test: $(Get-ApiErrorBody -ErrorRecord $_)"
}
finally {
    $adminPassword = $null
}

if (-not $loginResponse.success -or
    [string]::IsNullOrWhiteSpace($loginResponse.data.token) -or
    $loginResponse.data.role -ne 'SuperAdmin') {
    throw 'The supplied account must be an active SuperAdmin account to run the SMTP test.'
}

$authHeaders = @{ Authorization = "Bearer $($loginResponse.data.token)" }
try {
    $settingsResponse = Invoke-RestMethod -UseBasicParsing -Method Get `
        -Uri "$apiBaseUrl/SuperAdmin/settings" `
        -Headers $authHeaders
}
catch {
    throw "Could not read the saved system settings: $(Get-ApiErrorBody -ErrorRecord $_)"
}

$testRecipient = [string]$settingsResponse.data.supportEmail
if (-not $settingsResponse.success -or
    $testRecipient -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
    throw 'The saved support email is missing or invalid. Set a valid recipient in System Settings, then rerun the deployment script.'
}

Write-Host "SMTP test will send one diagnostic email to: $testRecipient"
$sendTest = Read-Host 'Send the test email now? (Y/N)'
$smtpTestSent = $false
if ($sendTest -match '^(?i)y(es)?$') {
    try {
        $testResponse = Invoke-RestMethod -UseBasicParsing -Method Post `
            -Uri "$apiBaseUrl/SuperAdmin/email/test" `
            -Headers $authHeaders `
            -ContentType 'application/json' `
            -Body (@{ toEmail = $testRecipient; fullName = 'InternLink Administrator'; role = 'Lecturer' } | ConvertTo-Json -Compress)
    }
    catch {
        throw "SMTP test failed: $(Get-ApiErrorBody -ErrorRecord $_)"
    }

    if (-not $testResponse.success) {
        throw "SMTP test failed: $($testResponse.error.title)"
    }
    $smtpTestSent = $true
}
else {
    Write-Warning 'SMTP is enabled, but the test email was skipped because it was not confirmed.'
}
$authHeaders = $null
$loginResponse = $null

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
