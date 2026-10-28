# QA smoke for reset student 2421160052 (assigned lecturer, no company)
$ErrorActionPreference = 'Continue'
$Base = 'http://localhost:7109'
$SemId = '57654669-2532-4cd3-85a6-3634ea0ad2c0'
$Pass = 0; $Fail = 0; $Warn = 0
$Cases = New-Object System.Collections.Generic.List[object]

function Log-Case([string]$Id, [string]$Title, [string]$Status, [string]$Detail = '') {
  $Cases.Add([PSCustomObject]@{ id = $Id; title = $Title; status = $Status; detail = $Detail }) | Out-Null
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
function Req([string]$Method = 'GET', [string]$Url, [hashtable]$Headers = $null, [object]$Body = $null) {
  $uri = if ($Url.StartsWith('http')) { $Url } else { $Base + $Url }
  try {
    $p = @{ Uri = $uri; Method = $Method; UseBasicParsing = $true; TimeoutSec = 45 }
    if ($Headers) { $p.Headers = $Headers }
    if ($null -ne $Body) {
      $p.ContentType = 'application/json; charset=utf-8'
      $p.Body = if ($Body -is [string]) { $Body } else { ($Body | ConvertTo-Json -Depth 8 -Compress) }
    }
    $r = Invoke-WebRequest @p
    $json = $null; try { $json = $r.Content | ConvertFrom-Json } catch {}
    return [PSCustomObject]@{ ok = $true; status = [int]$r.StatusCode; json = $json; raw = $r.Content }
  } catch {
    $status = 0; $raw = $_.Exception.Message; $json = $null
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) { $raw = [IO.StreamReader]::new($stream).ReadToEnd(); if ($raw) { $json = $raw | ConvertFrom-Json } }
      } catch {}
    }
    return [PSCustomObject]@{ ok = $false; status = $status; json = $json; raw = $raw }
  }
}

Write-Host '===== QA SV 2421160052 RESET + FIX PACK =====' -ForegroundColor Cyan

$health = Req -Url '/health'
if ($health.ok) { Log-Case 'ENV-01' 'API health' 'PASS' } else { Log-Case 'ENV-01' 'API health' 'FAIL' $health.raw; exit 1 }
$fe = Req -Url 'http://localhost:3000'
if ($fe.ok) { Log-Case 'ENV-02' 'FE :3000' 'PASS' } else { Log-Case 'ENV-02' 'FE :3000' 'FAIL' $fe.raw }

# AUTH fix pack
$wp = Req -Method POST -Url '/api/Auth/login' -Body @{ username = 'admin-cntt'; password = 'wrong-password' }
if ($wp.status -eq 401) { Log-Case 'BUG03-01' 'Wrong password -> 401' 'PASS' } else { Log-Case 'BUG03-01' 'Wrong password -> 401' 'FAIL' ('status=' + $wp.status) }

$admin = $null; $gv = $null; $sv = $null
try { $admin = Login 'admin-cntt' 'qweasdzxc@123'; Log-Case 'AUTH-01' 'Login admin-cntt' 'PASS' } catch { Log-Case 'AUTH-01' 'Login admin-cntt' 'FAIL' $_.Exception.Message }
try { $gv = Login 'tqcuong@hcmct.edu.vn' 'qweasdzxc@123'; Log-Case 'AUTH-02' 'Login lecturer' 'PASS' } catch { Log-Case 'AUTH-02' 'Login lecturer' 'FAIL' $_.Exception.Message }
try { $sv = Login '2421160052' 'qweasdzxc@123'; Log-Case 'AUTH-03' 'Login SV 2421160052' 'PASS' } catch { Log-Case 'AUTH-03' 'Login SV 2421160052' 'FAIL' $_.Exception.Message }

$Ha = if ($admin) { AuthHdr $admin.token } else { $null }
$Hg = if ($gv) { AuthHdr $gv.token } else { $null }
$Hs = if ($sv) { AuthHdr $sv.token } else { $null }

# Reset-state expectations
$portal = $null; $iid = $null
if ($Hs) {
  $p = Req -Url '/api/StudentPortal/me' -Headers $Hs
  if ($p.ok) {
    $portal = $p.json.data
    $iid = $portal.internship.id
    if ($portal.student.studentCode -eq '2421160052') { Log-Case 'STU-01' 'Portal identity' 'PASS' $portal.student.fullName }
    else { Log-Case 'STU-01' 'Portal identity' 'FAIL' }
    if ($portal.internship.lecturerId -and $portal.lecturerName) { Log-Case 'STU-02' 'Has lecturer assigned' 'PASS' ([string]$portal.lecturerName) }
    else { Log-Case 'STU-02' 'Has lecturer assigned' 'FAIL' 'missing lecturer' }
    if (-not $portal.internship.companyId) { Log-Case 'STU-03' 'No company yet (reset state)' 'PASS' }
    else { Log-Case 'STU-03' 'No company yet (reset state)' 'FAIL' ('companyId=' + $portal.internship.companyId) }
    if ($portal.internship.status -in @('NotStarted', 'InProgress')) { Log-Case 'STU-04' 'Internship early status' 'PASS' ([string]$portal.internship.status) }
    else { Log-Case 'STU-04' 'Internship early status' 'WARN' ('status=' + $portal.internship.status) }
    if ([int]$portal.progressPercent -eq 0) { Log-Case 'STU-05' 'Progress 0%' 'PASS' }
    else { Log-Case 'STU-05' 'Progress 0%' 'WARN' ('progress=' + $portal.progressPercent) }
    if (-not $portal.isArchiveReadOnly) { Log-Case 'STU-06' 'Not archive readonly' 'PASS' }
    else { Log-Case 'STU-06' 'Not archive readonly' 'FAIL' 'archive locked' }
  } else { Log-Case 'STU-01' 'Portal /me' 'FAIL' $p.raw }
}

if ($Hs) {
  $wr = Req -Url '/api/WeeklyReport/mine' -Headers $Hs
  if ($wr.ok) {
    $items = @($wr.json.data)
    $n = $items.Count
    # may have leftover QA draft from previous test
    Log-Case 'STU-07' 'WeeklyReport/mine reachable' 'PASS' ('count=' + $n)
    $submitted = @($items | Where-Object { $_.status -eq 'Submitted' -or $_.status -eq 'Approved' })
    if ($submitted.Count -eq 0) { Log-Case 'STU-08' 'No submitted/approved reports after reset' 'PASS' }
    else { Log-Case 'STU-08' 'No submitted/approved reports after reset' 'FAIL' (($submitted | ForEach-Object { 'T' + $_.weekNumber + ':' + $_.status }) -join ', ') }
  } else { Log-Case 'STU-07' 'WeeklyReport/mine' 'FAIL' $wr.raw }

  $sub = Req -Url '/api/Submission/mine' -Headers $Hs
  if ($sub.ok) {
    $items = @($sub.json.data)
    if ($items.Count -eq 0) { Log-Case 'STU-09' 'No final submissions after reset' 'PASS' }
    else { Log-Case 'STU-09' 'No final submissions after reset' 'FAIL' ('count=' + $items.Count) }
  } else { Log-Case 'STU-09' 'Submission/mine' 'FAIL' $sub.raw }

  $att = Req -Url '/api/Attendance/student/me' -Headers $Hs
  if ($att.ok) { Log-Case 'STU-10' 'Attendance student/me' 'PASS' } else { Log-Case 'STU-10' 'Attendance student/me' 'FAIL' ('status=' + $att.status) }

  $mine = Req -Url '/api/Evaluation/mine' -Headers $Hs
  if ($mine.status -eq 400 -and $mine.raw -match 'mine') { Log-Case 'BUG04-01' '/Evaluation/mine no Guid bind error' 'FAIL' 'still 400 mine' }
  elseif ($mine.status -in 404, 405) { Log-Case 'BUG04-01' '/Evaluation/mine no Guid bind error' 'PASS' ('status=' + $mine.status) }
  else { Log-Case 'BUG04-01' '/Evaluation/mine no Guid bind error' 'PASS' ('status=' + $mine.status) }

  if ($iid) {
    $ev = Req -Url ('/api/Evaluation/internship/' + $iid) -Headers $Hs
    if ($ev.status -in 404, 204) { Log-Case 'STU-11' 'No evaluation yet' 'PASS' ('status=' + $ev.status) }
    elseif ($ev.status -eq 200 -and $ev.json) {
      $final = $false
      if ($ev.json.isFinalized) { $final = [bool]$ev.json.isFinalized }
      elseif ($ev.json.data.isFinalized) { $final = [bool]$ev.json.data.isFinalized }
      if ($final) { Log-Case 'STU-11' 'No evaluation yet' 'FAIL' 'still finalized after reset' }
      else { Log-Case 'STU-11' 'Evaluation exists but not finalized' 'WARN' 'status=200' }
    } else { Log-Case 'STU-11' 'No evaluation yet' 'WARN' ('status=' + $ev.status) }
  }

  # RBAC
  $deny = Req -Url '/api/Admin/semesters' -Headers $Hs
  if ($deny.status -in 401, 403) { Log-Case 'STU-12' 'SV blocked from Admin' 'PASS' } else { Log-Case 'STU-12' 'SV blocked from Admin' 'FAIL' ('status=' + $deny.status) }
}

# Admin assignment consistency
if ($Ha) {
  $asg = Req -Url ('/api/Admin/assignments?semesterId=' + $SemId) -Headers $Ha
  if ($asg.ok) {
    $row = @($asg.json.data) | Where-Object { $_.studentCode -eq '2421160052' } | Select-Object -First 1
    if ($row) {
      if ($row.lecturerId) { Log-Case 'ADM-01' 'Assignment has lecturer' 'PASS' ([string]$row.lecturerName) } else { Log-Case 'ADM-01' 'Assignment has lecturer' 'FAIL' }
      if (-not $row.companyAssigned -and -not $row.companyId) { Log-Case 'ADM-02' 'Assignment has no company' 'PASS' } else { Log-Case 'ADM-02' 'Assignment has no company' 'FAIL' ('company=' + $row.companyName) }
      Log-Case 'ADM-03' 'Assignment status' 'PASS' ([string]$row.status)
    } else { Log-Case 'ADM-01' 'Find assignment row' 'FAIL' 'not in list' }
  } else { Log-Case 'ADM-01' 'Assignments list' 'FAIL' $asg.raw }

  $dead = Req -Url '/api/Admin/lecturers' -Headers $Ha
  if ($dead.status -eq 404) { Log-Case 'BUG02-01' '/Admin/lecturers out of contract' 'PASS' } else { Log-Case 'BUG02-01' '/Admin/lecturers out of contract' 'FAIL' ('status=' + $dead.status) }
  $lp = Req -Url '/api/LecturerProfile/paged?page=1&pageSize=20' -Headers $Ha
  if (-not $lp.ok) { $lp = Req -Url '/api/LecturerProfile' -Headers $Ha }
  if ($lp.ok) { Log-Case 'BUG02-02' 'LecturerProfile OK' 'PASS' } else { Log-Case 'BUG02-02' 'LecturerProfile OK' 'FAIL' ('status=' + $lp.status) }
}

# Lecturer view
if ($Hg) {
  $dash = Req -Url '/api/Lecturer/dashboard' -Headers $Hg
  if ($dash.ok) {
    $d = $dash.json.data
    $w = [int]$d.pendingWeeklyReportsCount; $s = [int]$d.pendingSubmissionsCount; $t = [int]$d.pendingReviewsCount
    if (($w + $s) -eq $t) { Log-Case 'BUG06-01' 'Pending KPI split consistent' 'PASS' ("weekly=$w sub=$s total=$t") }
    else { Log-Case 'BUG06-01' 'Pending KPI split consistent' 'FAIL' ("weekly=$w sub=$s total=$t") }
  } else { Log-Case 'BUG06-01' 'Dashboard' 'FAIL' $dash.raw }

  $lst = Req -Url '/api/Lecturer/students' -Headers $Hg
  if ($lst.ok) {
    $hit = @($lst.json.data) | Where-Object { $_.studentCode -eq '2421160052' } | Select-Object -First 1
    if ($hit) {
      Log-Case 'LEC-01' 'GV sees SV 2421160052' 'PASS'
      if (-not $hit.companyId) { Log-Case 'LEC-02' 'GV sees missing company' 'PASS' } else { Log-Case 'LEC-02' 'GV sees missing company' 'FAIL' }
      if ([int]$hit.progressPercent -eq 0) { Log-Case 'LEC-03' 'GV progress 0%' 'PASS' } else { Log-Case 'LEC-03' 'GV progress 0%' 'WARN' ('p=' + $hit.progressPercent) }
      if (-not $hit.hasEvaluation) { Log-Case 'LEC-04' 'No evaluation flag' 'PASS' } else { Log-Case 'LEC-04' 'No evaluation flag' 'WARN' 'hasEvaluation=true' }
    } else { Log-Case 'LEC-01' 'GV sees SV 2421160052' 'FAIL' 'not in lecturer list' }
  } else { Log-Case 'LEC-01' 'Lecturer students' 'FAIL' $lst.raw }

  if ($iid) {
    $detail = Req -Url ('/api/Lecturer/internships/' + $iid) -Headers $Hg
    if ($detail.ok) { Log-Case 'LEC-05' 'Internship workspace opens' 'PASS' } else { Log-Case 'LEC-05' 'Internship workspace opens' 'FAIL' ('status=' + $detail.status) }
  }
}

# P0 draft + submit guard
if ($Hs -and $iid -and $Hg) {
  $sch = Req -Url ('/api/Semesters/' + $SemId + '/report-schedules') -Headers $Hg
  $items = if ($sch.json.data) { @($sch.json.data) } else { @() }
  $open = @($items | Where-Object { $_.isSubmissionOpen -eq $true } | Sort-Object weekNumber | Select-Object -First 1)
  if ($open.Count -eq 0) { Log-Case 'P0-01' 'Find open week' 'FAIL' 'no open schedule' }
  else {
    $week = [int]$open[0].weekNumber
    Log-Case 'P0-01' 'Find open week' 'PASS' ('week=' + $week)

    # reuse existing draft for that week if any
    $mine = @( (Req -Url '/api/WeeklyReport/mine' -Headers $Hs).json.data )
    $draft = $mine | Where-Object { [int]$_.weekNumber -eq $week -and $_.status -eq 'Draft' } | Select-Object -First 1
    if (-not $draft) {
      $cr = Req -Method POST -Url '/api/WeeklyReport' -Headers $Hs -Body @{
        internshipId = $iid
        weekNumber = $week
        title = ('QA reset draft T' + $week)
        content = 'Draft test no-company submit guard after reset.'
      }
      if ($cr.ok) {
        $draft = if ($cr.json.data) { $cr.json.data } else { $cr.json }
        Log-Case 'P0-02' 'Create draft without company allowed' 'PASS' ('id=' + $draft.id)
      } else {
        Log-Case 'P0-02' 'Create draft without company allowed' 'FAIL' ('status=' + $cr.status + ' ' + $cr.raw)
      }
    } else {
      Log-Case 'P0-02' 'Existing draft reusable' 'PASS' ('id=' + $draft.id)
    }

    if ($draft -and $draft.id) {
      $sub = Req -Method POST -Url ('/api/WeeklyReport/' + $draft.id + '/submit') -Headers $Hs
      $msg = ''
      if ($sub.json -and $sub.json.error -and $sub.json.error.title) { $msg = [string]$sub.json.error.title }
      elseif ($sub.raw) { $msg = [string]$sub.raw }
      if ($sub.status -ge 400 -and $msg.Length -gt 0) {
        Log-Case 'P0-03' 'Submit blocked without company' 'PASS' ('status=' + $sub.status + ' msg=' + $msg)
      } elseif ($sub.ok) {
        Log-Case 'P0-03' 'Submit blocked without company' 'FAIL' 'submit succeeded without company'
      } else {
        Log-Case 'P0-03' 'Submit blocked without company' 'FAIL' ('status=' + $sub.status)
      }

      $after = @( (Req -Url '/api/WeeklyReport/mine' -Headers $Hs).json.data )
      $still = $after | Where-Object { $_.id -eq $draft.id } | Select-Object -First 1
      if ($still -and $still.status -eq 'Draft') { Log-Case 'P0-04' 'Remains Draft after blocked submit' 'PASS' }
      else { Log-Case 'P0-04' 'Remains Draft after blocked submit' 'FAIL' ('status=' + $still.status) }
    }
  }
}

# Certificate while no company
if ($Hs) {
  $cert = Req -Url '/api/StudentPortal/internship-certificate' -Headers $Hs
  if ($cert.status -eq 200) { Log-Case 'STU-13' 'Certificate without company' 'WARN' 'PDF 200 even without company - check content' }
  elseif ($cert.status -in 400, 404, 409, 422) { Log-Case 'STU-13' 'Certificate without company blocked/handled' 'PASS' ('status=' + $cert.status) }
  else { Log-Case 'STU-13' 'Certificate without company' 'WARN' ('status=' + $cert.status) }
}

Write-Host ''
Write-Host ("===== DONE PASS={0} FAIL={1} WARN={2} TOTAL={3} =====" -f $Pass, $Fail, $Warn, ($Pass + $Fail + $Warn)) -ForegroundColor Cyan
Write-Host '--- FAILURES ---' -ForegroundColor Red
$Cases | Where-Object { $_.status -eq 'FAIL' } | ForEach-Object { Write-Host ("[{0}] {1} :: {2}" -f $_.id, $_.title, $_.detail) }
Write-Host '--- WARNINGS ---' -ForegroundColor Yellow
$Cases | Where-Object { $_.status -eq 'WARN' } | ForEach-Object { Write-Host ("[{0}] {1} :: {2}" -f $_.id, $_.title, $_.detail) }

$out = Join-Path $env:TEMP 'internlink-qa-sv-reset.json'
[PSCustomObject]@{ at = (Get-Date).ToString('s'); pass = $Pass; fail = $Fail; warn = $Warn; cases = $Cases } | ConvertTo-Json -Depth 6 | Out-File $out -Encoding utf8
Write-Host ('Report: ' + $out)
if ($Fail -gt 0) { exit 2 } else { exit 0 }
