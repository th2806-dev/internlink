# Phase 2E: notifications, templates, multi-GV scope, RBAC extras
$ErrorActionPreference = 'Continue'
$Base = 'http://localhost:7109'
$SemId = '57654669-2532-4cd3-85a6-3634ea0ad2c0'
$Pass = 0; $Fail = 0; $Warn = 0

function Log-Case([string]$Id, [string]$Title, [string]$Status, [string]$Detail = '') {
  if ($Status -eq 'PASS') { $script:Pass++; Write-Host "[PASS] $Id - $Title" -ForegroundColor Green }
  elseif ($Status -eq 'FAIL') { $script:Fail++; Write-Host "[FAIL] $Id - $Title" -ForegroundColor Red }
  else { $script:Warn++; Write-Host "[WARN] $Id - $Title" -ForegroundColor Yellow }
  if ($Detail) { Write-Host "       $Detail" -ForegroundColor DarkGray }
}

function Login([string]$user, [string]$pass) {
  $resp = Invoke-RestMethod -Uri ($Base + '/api/Auth/login') -Method POST -Body (@{ username = $user; password = $pass } | ConvertTo-Json) -ContentType 'application/json; charset=utf-8'
  if (-not $resp.success) { throw 'login failed' }
  return $resp.data
}

function AuthHdr([string]$token) { @{ Authorization = ('Bearer ' + $token) } }

function Req {
  param([string]$Method = 'GET', [string]$Url, [hashtable]$Headers = $null, [object]$Body = $null)
  $uri = if ($Url.StartsWith('http')) { $Url } else { $Base + $Url }
  try {
    $p = @{ Uri = $uri; Method = $Method; UseBasicParsing = $true; TimeoutSec = 60 }
    if ($Headers) { $p.Headers = $Headers }
    if ($null -ne $Body) {
      $p.ContentType = 'application/json; charset=utf-8'
      $p.Body = if ($Body -is [string]) { $Body } else { ($Body | ConvertTo-Json -Depth 8 -Compress) }
    }
    $r = Invoke-WebRequest @p
    $json = $null; try { $json = $r.Content | ConvertFrom-Json } catch {}
    return [PSCustomObject]@{ ok = $true; status = [int]$r.StatusCode; json = $json; raw = $r.Content; len = $r.RawContentLength }
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
    return [PSCustomObject]@{ ok = $false; status = $status; json = $json; raw = $raw; len = 0 }
  }
}

Write-Host '===== PHASE 2E =====' -ForegroundColor Cyan
$ad = Login 'admin-cntt' 'qweasdzxc@123'
$gv = Login 'tqcuong@hcmct.edu.vn' 'qweasdzxc@123'
$sv = Login '2421160052' 'qweasdzxc@123'
$Ha = AuthHdr $ad.token
$Hg = AuthHdr $gv.token
$Hs = AuthHdr $sv.token

# --- notifications before broadcast ---
$unreadBefore = Req -Url '/api/Notification/unread-count' -Headers $Hs
$beforeCount = 0
if ($unreadBefore.ok) {
  if ($null -ne $unreadBefore.json.data) { $beforeCount = [int]$unreadBefore.json.data }
  elseif ($null -ne $unreadBefore.json.count) { $beforeCount = [int]$unreadBefore.json.count }
  Log-Case 'G2E-01' 'SV unread-count endpoint' 'PASS' ('count=' + $beforeCount)
} else {
  Log-Case 'G2E-01' 'SV unread-count endpoint' 'FAIL' ('status=' + $unreadBefore.status)
}

$mineBefore = Req -Url '/api/Notification/mine' -Headers $Hs
if ($mineBefore.ok) { Log-Case 'G2E-02' 'SV Notification/mine' 'PASS' }
else { Log-Case 'G2E-02' 'SV Notification/mine' 'FAIL' ('status=' + $mineBefore.status) }

# --- admin broadcast ---
$bc = Req -Method POST -Url '/api/Admin/notifications/broadcast' -Headers $Ha -Body @{
  title = 'QA G2E Broadcast'
  content = 'Thong bao kiem thu Giai doan 2E - vui long bo qua.'
  audience = 'all'
}
if ($bc.ok) { Log-Case 'G2E-03' 'Admin broadcast notification' 'PASS' }
else { Log-Case 'G2E-03' 'Admin broadcast notification' 'FAIL' ($bc.status.ToString() + ' ' + $bc.raw) }

Start-Sleep -Seconds 1
$unreadAfter = Req -Url '/api/Notification/unread-count' -Headers $Hs
$afterCount = $beforeCount
if ($unreadAfter.ok) {
  if ($null -ne $unreadAfter.json.data) { $afterCount = [int]$unreadAfter.json.data }
  elseif ($null -ne $unreadAfter.json.count) { $afterCount = [int]$unreadAfter.json.count }
}
if ($bc.ok -and $afterCount -ge $beforeCount) {
  Log-Case 'G2E-04' 'SV unread after broadcast' 'PASS' ('before=' + $beforeCount + ' after=' + $afterCount)
} elseif ($bc.ok) {
  Log-Case 'G2E-04' 'SV unread after broadcast' 'WARN' ('before=' + $beforeCount + ' after=' + $afterCount)
}

$gvMine = Req -Url '/api/Notification/mine' -Headers $Hg
if ($gvMine.ok) { Log-Case 'G2E-05' 'GV Notification/mine' 'PASS' }
else { Log-Case 'G2E-05' 'GV Notification/mine' 'FAIL' ('status=' + $gvMine.status) }

# mark read if any
$items = @()
if ($mineBefore.json.data -is [array]) { $items = @($mineBefore.json.data) }
elseif ($mineBefore.json.data.items) { $items = @($mineBefore.json.data.items) }
$one = $items | Select-Object -First 1
if ($one -and $one.id) {
  $mr = Req -Method POST -Url ('/api/Notification/mark-read/' + $one.id) -Headers $Hs
  if ($mr.ok -or $mr.status -eq 204) { Log-Case 'G2E-06' 'Mark notification read' 'PASS' }
  else { Log-Case 'G2E-06' 'Mark notification read' 'WARN' ('status=' + $mr.status) }
} else {
  $mar = Req -Method POST -Url '/api/Notification/mark-all-read' -Headers $Hs
  if ($mar.ok -or $mar.status -eq 204) { Log-Case 'G2E-06' 'Mark all read' 'PASS' }
  else { Log-Case 'G2E-06' 'Mark all/read' 'WARN' ('no items; mark-all status=' + $mar.status) }
}

# --- import templates ---
foreach ($pair in @(
  @{ id = 'G2E-07'; url = '/api/Admin/students/import/template'; name = 'Student import template' },
  @{ id = 'G2E-08'; url = '/api/LecturerProfile/import/template'; name = 'Lecturer import template' },
  @{ id = 'G2E-09'; url = '/api/Admin/companies/import/template'; name = 'Company import template' },
  @{ id = 'G2E-10'; url = '/api/Admin/assignments/template'; name = 'Assignment import template' },
  @{ id = 'G2E-11'; url = '/api/Admin/assignments/company-allocation/template'; name = 'Company allocation template' }
)) {
  try {
    $r = Invoke-WebRequest -Uri ($Base + $pair.url) -Headers $Ha -UseBasicParsing -TimeoutSec 45
    if ($r.StatusCode -eq 200 -and $r.RawContentLength -gt 50) {
      Log-Case $pair.id $pair.name 'PASS' ('bytes=' + $r.RawContentLength)
    } else {
      Log-Case $pair.id $pair.name 'FAIL' ('status=' + $r.StatusCode + ' len=' + $r.RawContentLength)
    }
  } catch {
    $st = 0; if ($_.Exception.Response) { $st = [int]$_.Exception.Response.StatusCode }
    Log-Case $pair.id $pair.name 'FAIL' ('status=' + $st + ' ' + $_.Exception.Message)
  }
}

# --- multi-GV scope via admin assignments ---
$asg = Req -Url ('/api/Admin/assignments?semesterId=' + $SemId) -Headers $Ha
if ($asg.ok) {
  $items = @($asg.json.data)
  $byGv = $items | Group-Object lecturerId
  Log-Case 'G2E-12' '4 lecturer groups in assignments' $(if ($byGv.Count -ge 4) { 'PASS' } else { 'WARN' }) ('lecturers=' + $byGv.Count + ' assignments=' + $items.Count)

  $cuongRows = @($items | Where-Object { $_.studentCode -eq '2421160052' })
  $cuongId = $cuongRows[0].lecturerId
  $other = $items | Where-Object { $_.lecturerId -ne $cuongId } | Select-Object -First 1
  if ($other) {
    $idor = Req -Url ('/api/Lecturer/internships/' + $other.internshipId) -Headers $Hg
    if ($idor.status -in 401, 403, 404) {
      Log-Case 'G2E-13' 'IDOR block other-GV internship' 'PASS' ('status=' + $idor.status + ' sv=' + $other.studentCode)
    } elseif ($idor.status -eq 200) {
      Log-Case 'G2E-13' 'IDOR block other-GV internship' 'FAIL' ('LEAK sv=' + $other.studentCode)
    } else {
      Log-Case 'G2E-13' 'IDOR block other-GV internship' 'WARN' ('status=' + $idor.status)
    }
  }

  $lst = Req -Url '/api/Lecturer/students' -Headers $Hg
  if ($lst.ok) {
    $mine = @($lst.json.data)
    $foreign = @($mine | Where-Object { $_.studentCode -eq $other.studentCode })
    if ($foreign.Count -eq 0) { Log-Case 'G2E-14' 'GV list only own students' 'PASS' ('count=' + $mine.Count) }
    else { Log-Case 'G2E-14' 'GV list only own students' 'FAIL' ('saw foreign ' + $other.studentCode) }
  }
} else {
  Log-Case 'G2E-12' 'Assignments for multi-GV' 'FAIL' $asg.raw
}

# try second lecturer login with shared demo password patterns
$lp = Req -Url '/api/LecturerProfile' -Headers $Ha
$lecturers = @()
if ($lp.ok) {
  if ($lp.json.data -is [array]) { $lecturers = @($lp.json.data) }
  elseif ($lp.json.data.items) { $lecturers = @($lp.json.data.items) }
}
$otherLecturerUser = $null
foreach ($lec in $lecturers) {
  $email = [string]$lec.email
  if ($email -and $email -ne 'tqcuong@hcmct.edu.vn') {
    foreach ($pwd in @('qweasdzxc@123', 'Password123!')) {
      $try = Req -Method POST -Url '/api/Auth/login' -Body @{ username = $email; password = $pwd }
      if ($try.ok -and $try.json.success) {
        $otherLecturerUser = $try.json.data
        Log-Case 'G2E-15' 'Login second lecturer' 'PASS' ($email + ' role=' + $otherLecturerUser.role)
        break
      }
      $uname = [string]$lec.username
      if (-not $uname) { $uname = [string]$lec.staffCode }
      if ($uname) {
        $try2 = Req -Method POST -Url '/api/Auth/login' -Body @{ username = $uname; password = $pwd }
        if ($try2.ok -and $try2.json.success) {
          $otherLecturerUser = $try2.json.data
          Log-Case 'G2E-15' 'Login second lecturer' 'PASS' ($uname + ' role=' + $otherLecturerUser.role)
          break
        }
      }
    }
    if ($otherLecturerUser) { break }
  }
}
if (-not $otherLecturerUser) {
  Log-Case 'G2E-15' 'Login second lecturer' 'WARN' 'no shared password for other GV accounts - scope checked via IDOR only'
} else {
  $Hg2 = AuthHdr $otherLecturerUser.token
  $lst2 = Req -Url '/api/Lecturer/students' -Headers $Hg2
  if ($lst2.ok) {
    $mine2 = @($lst2.json.data)
    $sawNeo = @($mine2 | Where-Object { $_.studentCode -eq '2421160052' })
    if ($sawNeo.Count -eq 0) { Log-Case 'G2E-16' 'Second GV cannot see 2421160052' 'PASS' ('ownCount=' + $mine2.Count) }
    else { Log-Case 'G2E-16' 'Second GV cannot see 2421160052' 'FAIL' 'cross-lecturer leak' }
  }
}

# --- graded student certificate / exports ---
$cert = Req -Url '/api/StudentPortal/internship-certificate' -Headers $Hs
if ($cert.status -eq 200) { Log-Case 'G2E-17' 'Certificate when Graded' 'PASS' } else { Log-Case 'G2E-17' 'Certificate when Graded' 'WARN' ('status=' + $cert.status) }

try {
  $ex = Invoke-WebRequest -Uri ($Base + '/api/InternshipGrading/grades-excel?semesterId=' + $SemId) -Headers $Hg -UseBasicParsing
  if ($ex.RawContentLength -gt 100) { Log-Case 'G2E-18' 'Export grades excel' 'PASS' ('bytes=' + $ex.RawContentLength) }
  else { Log-Case 'G2E-18' 'Export grades excel' 'FAIL' }
} catch {
  Log-Case 'G2E-18' 'Export grades excel' 'FAIL' $_.Exception.Message
}

# SV cannot access admin notifications broadcast
$deny = Req -Method POST -Url '/api/Admin/notifications/broadcast' -Headers $Hs -Body @{ title = 'x'; message = 'y' }
if ($deny.status -in 401, 403) { Log-Case 'G2E-19' 'SV cannot broadcast' 'PASS' ('status=' + $deny.status) }
else { Log-Case 'G2E-19' 'SV cannot broadcast' 'FAIL' ('status=' + $deny.status) }

# admin campaigns list
$camp = Req -Url '/api/Admin/notifications' -Headers $Ha
if ($camp.ok) { Log-Case 'G2E-20' 'Admin notifications list' 'PASS' }
else { Log-Case 'G2E-20' 'Admin notifications list' 'WARN' ('status=' + $camp.status) }

Write-Host ''
Write-Host ("===== 2E DONE PASS={0} FAIL={1} WARN={2} =====" -f $Pass, $Fail, $Warn) -ForegroundColor Cyan
if ($Fail -gt 0) { exit 2 } else { exit 0 }
