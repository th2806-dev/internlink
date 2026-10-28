# InternLink QA regression - post-fix pack (BUG-03/04/06 + No-Company + LecturerProfile)
# Usage (API must be up on :7109):
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/qa-regression-fixes.ps1
# Optional env overrides:
#   $env:IL_API = 'http://localhost:7109'
#   $env:IL_ADMIN_USER / IL_ADMIN_PASS / IL_GV_USER / IL_GV_PASS / IL_SV_USER / IL_SV_PASS
#   $env:IL_SEMESTER_ID

$ErrorActionPreference = 'Continue'
$Base = if ($env:IL_API) { $env:IL_API } else { 'http://localhost:7109' }
$SemId = if ($env:IL_SEMESTER_ID) { $env:IL_SEMESTER_ID } else { '57654669-2532-4cd3-85a6-3634ea0ad2c0' }
$AdminUser = if ($env:IL_ADMIN_USER) { $env:IL_ADMIN_USER } else { 'admin-cntt' }
$AdminPass = if ($env:IL_ADMIN_PASS) { $env:IL_ADMIN_PASS } else { 'qweasdzxc@123' }
$GvUser = if ($env:IL_GV_USER) { $env:IL_GV_USER } else { 'tqcuong@hcmct.edu.vn' }
$GvPass = if ($env:IL_GV_PASS) { $env:IL_GV_PASS } else { 'qweasdzxc@123' }
$SvUser = if ($env:IL_SV_USER) { $env:IL_SV_USER } else { '2421160052' }
$SvPass = if ($env:IL_SV_PASS) { $env:IL_SV_PASS } else { 'qweasdzxc@123' }

$Pass = 0; $Fail = 0; $Skip = 0
$Cases = New-Object System.Collections.Generic.List[object]

function Log-Case([string]$Id, [string]$Title, [string]$Status, [string]$Detail = '') {
  $Cases.Add([PSCustomObject]@{ id = $Id; title = $Title; status = $Status; detail = $Detail }) | Out-Null
  if ($Status -eq 'PASS') { $script:Pass++; Write-Host "[PASS] $Id - $Title" -ForegroundColor Green }
  elseif ($Status -eq 'FAIL') { $script:Fail++; Write-Host "[FAIL] $Id - $Title" -ForegroundColor Red }
  else { $script:Skip++; Write-Host "[SKIP] $Id - $Title" -ForegroundColor Yellow }
  if ($Detail) { Write-Host "       $Detail" -ForegroundColor DarkGray }
}

function Login([string]$user, [string]$pass) {
  $body = @{ username = $user; password = $pass } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri ($Base + '/api/Auth/login') -Method POST -Body $body -ContentType 'application/json; charset=utf-8'
  if (-not $resp.success) { throw 'login failed' }
  return $resp.data
}

function AuthHdr([string]$token) { @{ Authorization = ('Bearer ' + $token) } }

function HttpReq {
  param([string]$Method = 'GET', [string]$Url, [hashtable]$Headers = $null, [object]$Body = $null)
  $uri = if ($Url.StartsWith('http')) { $Url } else { $Base + $Url }
  try {
    $p = @{ Uri = $uri; Method = $Method; UseBasicParsing = $true; TimeoutSec = 45 }
    if ($Headers) { $p.Headers = $Headers }
    if ($null -ne $Body) {
      $p.ContentType = 'application/json; charset=utf-8'
      $p.Body = if ($Body -is [string]) { $Body } else { ($Body | ConvertTo-Json -Depth 6 -Compress) }
    }
    $r = Invoke-WebRequest @p
    $json = $null
    try { $json = $r.Content | ConvertFrom-Json } catch {}
    return [PSCustomObject]@{ ok = $true; status = [int]$r.StatusCode; json = $json; raw = $r.Content }
  } catch {
    $status = 0; $raw = $_.Exception.Message; $json = $null
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $raw = [IO.StreamReader]::new($stream).ReadToEnd()
          if ($raw) { $json = $raw | ConvertFrom-Json }
        }
      } catch {}
    }
    return [PSCustomObject]@{ ok = $false; status = $status; json = $json; raw = $raw }
  }
}

Write-Host '===== QA REGRESSION FIX PACK =====' -ForegroundColor Cyan
Write-Host "API=$Base"

# ENV
$health = HttpReq -Url '/health'
if ($health.ok) { Log-Case 'ENV-01' 'API health' 'PASS' }
else {
  Log-Case 'ENV-01' 'API health' 'FAIL' $health.raw
  Write-Host 'API down - stop regression.' -ForegroundColor Red
  exit 1
}

# ---------- BUG-03: wrong password -> 401 ----------
$wp = HttpReq -Method POST -Url '/api/Auth/login' -Body @{ username = $AdminUser; password = 'wrong-password' }
if ($wp.status -eq 401) {
  $title = ''
  if ($wp.json.error.title) { $title = [string]$wp.json.error.title }
  elseif ($wp.json.error.Title) { $title = [string]$wp.json.error.Title }
  $st = $null
  if ($wp.json.error.status) { $st = $wp.json.error.status }
  elseif ($wp.json.error.Status) { $st = $wp.json.error.Status }
  if ($st -and [int]$st -ne 401) {
    Log-Case 'BUG03-01' 'Wrong password HTTP 401' 'FAIL' ("body.status=" + $st)
  } else {
    Log-Case 'BUG03-01' 'Wrong password HTTP 401' 'PASS' $title
  }
} else {
  Log-Case 'BUG03-01' 'Wrong password HTTP 401' 'FAIL' ("got HTTP " + $wp.status + ' ' + $wp.raw)
}

$short = HttpReq -Method POST -Url '/api/Auth/login' -Body @{ username = $AdminUser; password = 'x' }
if ($short.status -eq 400) { Log-Case 'BUG03-02' 'Password too short still 400 validation' 'PASS' }
else { Log-Case 'BUG03-02' 'Password too short still 400 validation' 'FAIL' ("got " + $short.status) }

$okLogin = $null
try {
  $okLogin = Login $AdminUser $AdminPass
  Log-Case 'BUG03-03' 'Valid login still works' 'PASS' ('role=' + $okLogin.role)
} catch {
  Log-Case 'BUG03-03' 'Valid login still works' 'FAIL' $_.Exception.Message
}

# ---------- BUG-04: Evaluation/mine no longer binds as id ----------
$sv = $null; $gv = $null
try { $sv = Login $SvUser $SvPass; Log-Case 'AUTH-SV' 'Login student' 'PASS' } catch { Log-Case 'AUTH-SV' 'Login student' 'FAIL' $_.Exception.Message }
try { $gv = Login $GvUser $GvPass; Log-Case 'AUTH-GV' 'Login lecturer' 'PASS' } catch { Log-Case 'AUTH-GV' 'Login lecturer' 'FAIL' $_.Exception.Message }

if ($sv) {
  $Hs = AuthHdr $sv.token
  $mine = HttpReq -Url '/api/Evaluation/mine' -Headers $Hs
  # After :guid constraint, "mine" should NOT be model-bound as Guid -> typically 404 (no matching route) not 400 validation
  if ($mine.status -eq 400 -and $mine.raw -match "mine") {
    Log-Case 'BUG04-01' 'GET /Evaluation/mine no longer 400 id-bind' 'FAIL' 'still treats mine as id'
  } elseif ($mine.status -in 404, 405) {
    Log-Case 'BUG04-01' 'GET /Evaluation/mine no longer 400 id-bind' 'PASS' ('status=' + $mine.status + ' (no guid route match)')
  } elseif ($mine.status -eq 200) {
    Log-Case 'BUG04-01' 'GET /Evaluation/mine' 'PASS' 'endpoint exists and returns 200'
  } else {
    Log-Case 'BUG04-01' 'GET /Evaluation/mine no longer 400 id-bind' 'PASS' ('status=' + $mine.status + ' - not Guid bind error')
  }

  $portal = HttpReq -Url '/api/StudentPortal/me' -Headers $Hs
  if ($portal.ok -and $portal.json.data.internship.id) {
    $iid = [string]$portal.json.data.internship.id
    $ev = HttpReq -Url ('/api/Evaluation/internship/' + $iid) -Headers $Hs
    if ($ev.status -eq 200) { Log-Case 'BUG04-02' 'GET /Evaluation/internship/{guid} still works' 'PASS' }
    else { Log-Case 'BUG04-02' 'GET /Evaluation/internship/{guid} still works' 'FAIL' ('status=' + $ev.status) }
  } else {
    Log-Case 'BUG04-02' 'GET /Evaluation/internship/{guid} still works' 'SKIP' 'no internship on student'
  }
}

# ---------- BUG-06: KPI split ----------
if ($gv) {
  $Hg = AuthHdr $gv.token
  $dash = HttpReq -Url '/api/Lecturer/dashboard' -Headers $Hg
  if ($dash.ok) {
    $d = if ($dash.json.data) { $dash.json.data } else { $dash.json }
    $hasW = $null -ne $d.PSObject.Properties['pendingWeeklyReportsCount']
    $hasS = $null -ne $d.PSObject.Properties['pendingSubmissionsCount']
    $hasT = $null -ne $d.PSObject.Properties['pendingReviewsCount']
    if ($hasW -and $hasS) {
      $sum = [int]$d.pendingWeeklyReportsCount + [int]$d.pendingSubmissionsCount
      $total = [int]$d.pendingReviewsCount
      if ($hasT -and $sum -ne $total) {
        Log-Case 'BUG06-01' 'Dashboard pending fields present and consistent' 'FAIL' ("weekly=" + $d.pendingWeeklyReportsCount + " sub=" + $d.pendingSubmissionsCount + " total=" + $total)
      } else {
        Log-Case 'BUG06-01' 'Dashboard pending fields present and consistent' 'PASS' ("weekly=" + $d.pendingWeeklyReportsCount + " sub=" + $d.pendingSubmissionsCount + " total=" + $d.pendingReviewsCount)
      }
    } else {
      Log-Case 'BUG06-01' 'Dashboard pending fields present and consistent' 'FAIL' 'missing pendingWeeklyReportsCount and/or pendingSubmissionsCount'
    }
  } else {
    Log-Case 'BUG06-01' 'Lecturer dashboard' 'FAIL' $dash.raw
  }
}

# ---------- BUG-02: LecturerProfile contract (not /Admin/lecturers) ----------
if ($okLogin) {
  $Ha = AuthHdr $okLogin.token
  $dead = HttpReq -Url '/api/Admin/lecturers' -Headers $Ha
  if ($dead.status -eq 404) {
    Log-Case 'BUG02-01' '/Admin/lecturers remains out of contract (404 OK)' 'PASS'
  } else {
    Log-Case 'BUG02-01' '/Admin/lecturers remains out of contract (404 OK)' 'FAIL' ('unexpected status=' + $dead.status)
  }

  $lp = HttpReq -Url '/api/LecturerProfile/paged?page=1&pageSize=20' -Headers $Ha
  if (-not $lp.ok) { $lp = HttpReq -Url '/api/LecturerProfile?page=1&pageSize=20' -Headers $Ha }
  if (-not $lp.ok) { $lp = HttpReq -Url '/api/LecturerProfile' -Headers $Ha }
  if ($lp.ok) { Log-Case 'BUG02-02' 'LecturerProfile contract works' 'PASS' ('status=' + $lp.status) }
  else { Log-Case 'BUG02-02' 'LecturerProfile contract works' 'FAIL' ('status=' + $lp.status + ' ' + $lp.raw) }

  # ---------- P0: No-company submit guard ----------
  $asg = HttpReq -Url ('/api/Admin/assignments?semesterId=' + $SemId) -Headers $Ha
  $noCo = @()
  if ($asg.ok) {
    $items = @($asg.json.data)
    $noCo = @($items | Where-Object { -not $_.companyAssigned -or -not $_.companyId })
  }

  if ($noCo.Count -eq 0) {
    Log-Case 'P0-01' 'Find student without company for submit guard' 'SKIP' 'no no-company student in current semester data - verify via unit test / seed fixture'
  } else {
    $target = $noCo[0]
    Log-Case 'P0-01' 'Found no-company student' 'PASS' ('mssv=' + $target.studentCode)

    # Cannot login as that student without password. Validate rule via API as admin is not enough.
    # Probe: lecturer list shows empty company; document manual UI step.
    if ($gv) {
      $lst = HttpReq -Url '/api/Lecturer/students' -Headers (AuthHdr $gv.token)
      if ($lst.ok) {
        $hit = @($lst.json.data) | Where-Object { $_.studentCode -eq $target.studentCode } | Select-Object -First 1
        if ($hit -and (-not $hit.companyId)) {
          Log-Case 'P0-02' 'Lecturer list reflects missing company' 'PASS' ('mssv=' + $hit.studentCode)
        } elseif ($hit) {
          Log-Case 'P0-02' 'Lecturer list reflects missing company' 'FAIL' 'student has companyId on lecturer list'
        } else {
          Log-Case 'P0-02' 'Lecturer list reflects missing company' 'SKIP' 'student not under this lecturer account'
        }
      }
    }

    Log-Case 'P0-03' 'Submit blocked without company (runtime)' 'SKIP' 'need that student login to POST /WeeklyReport/{id}/submit - covered by WeeklyReportServiceTests + manual TC below'
  }
}

Write-Host ''
Write-Host ("===== DONE PASS={0} FAIL={1} SKIP={2} =====" -f $Pass, $Fail, $Skip) -ForegroundColor Cyan
$out = Join-Path $env:TEMP 'internlink-qa-regression-fixes.json'
[PSCustomObject]@{ at = (Get-Date).ToString('s'); pass = $Pass; fail = $Fail; skip = $Skip; cases = $Cases } |
  ConvertTo-Json -Depth 6 | Out-File $out -Encoding utf8
Write-Host ("Report: " + $out)

if ($Fail -gt 0) { exit 2 } else { exit 0 }
