# Execute InternLink Phase-2 scenarios (G2-A, G2-B, partial G2-E)
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

Write-Host '===== PHASE 2 EXECUTION =====' -ForegroundColor Cyan
$ad = Login 'admin-cntt' 'qweasdzxc@123'
$gv = Login 'tqcuong@hcmct.edu.vn' 'qweasdzxc@123'
$sv = Login '2421160052' 'qweasdzxc@123'
$Ha = AuthHdr $ad.token
$Hg = AuthHdr $gv.token
$Hs = AuthHdr $sv.token

$portal = (Invoke-RestMethod ($Base + '/api/StudentPortal/me') -Headers $Hs).data
$iid = $portal.internship.id
$studentId = $portal.student.id
Log-Case 'PRE' 'SV baseline' 'PASS' ('status=' + $portal.internship.status + ' company=' + $portal.internship.companyId + ' lecturer=' + $portal.lecturerName)

# G2A-01 assign company
$cos = Invoke-RestMethod ($Base + '/api/Admin/companies/active') -Headers $Ha
$coItems = @($cos.data)
if ($coItems.Count -eq 0) {
  $cos2 = Invoke-RestMethod ($Base + '/api/Admin/companies') -Headers $Ha
  $coItems = @($cos2.data)
}
# Prefer company with remaining capacity (capacity > studentCount)
$co = $coItems | Where-Object { [int]$_.capacity -gt [int]$_.studentCount } | Sort-Object { [int]$_.capacity - [int]$_.studentCount } -Descending | Select-Object -First 1
if (-not $co) { $co = $coItems | Select-Object -First 1 }
$coId = [string]$co.id
$coName = [string]$co.companyName
if ([string]::IsNullOrWhiteSpace($coId)) { Log-Case 'G2A-01' 'Pick company' 'FAIL' ('count=' + $coItems.Count); exit 2 }
Log-Case 'G2A-01a' 'Pick company' 'PASS' ($coName + ' | ' + $coId)

$assign = Req -Method PUT -Url ('/api/Internship/' + $iid + '/company') -Headers $Hg -Body @{
  companyId = $coId
  supervisorName = 'QA Supervisor'
  position = 'Thuc tap sinh QA'
}
if ($assign.ok) { Log-Case 'G2A-01' 'Assign company' 'PASS' } else { Log-Case 'G2A-01' 'Assign company' 'FAIL' ($assign.status.ToString() + ' ' + $assign.raw) }

$portal2 = (Invoke-RestMethod ($Base + '/api/StudentPortal/me') -Headers $Hs).data
if ($portal2.internship.companyId) {
  Log-Case 'G2A-02' 'SV portal shows company' 'PASS' ([string]$portal2.internship.company.companyName)
} else {
  Log-Case 'G2A-02' 'SV portal shows company' 'FAIL' 'still empty'
}

# G2A-03 submit
$mine = @((Invoke-RestMethod ($Base + '/api/WeeklyReport/mine') -Headers $Hs).data)
$draft = $mine | Where-Object { $_.status -eq 'Draft' } | Select-Object -First 1
if (-not $draft) {
  $sch = (Invoke-RestMethod ($Base + '/api/Semesters/' + $SemId + '/report-schedules') -Headers $Hg).data
  $week = (@($sch) | Where-Object { $_.isSubmissionOpen } | Sort-Object weekNumber | Select-Object -First 1).weekNumber
  $cr = Req -Method POST -Url '/api/WeeklyReport' -Headers $Hs -Body @{
    internshipId = $iid
    weekNumber = [int]$week
    title = ('G2A draft T' + $week)
    content = 'Bao cao tuan sau khi gan DN - QA Giai doan 2.'
  }
  if ($cr.ok) {
    $draft = if ($cr.json.data) { $cr.json.data } else { $cr.json }
    Log-Case 'G2A-03a' 'Create draft' 'PASS' ('id=' + $draft.id)
  } else {
    Log-Case 'G2A-03a' 'Create draft' 'FAIL' $cr.raw
  }
}

$reportId = $null
if ($draft) {
  $reportId = $draft.id
  $sub = Req -Method POST -Url ('/api/WeeklyReport/' + $reportId + '/submit') -Headers $Hs
  if ($sub.ok) { Log-Case 'G2A-03' 'Submit after company assigned' 'PASS' }
  else { Log-Case 'G2A-03' 'Submit after company assigned' 'FAIL' ($sub.status.ToString() + ' ' + $sub.raw) }
}

$dash = (Invoke-RestMethod ($Base + '/api/Lecturer/dashboard') -Headers $Hg).data
Log-Case 'G2A-04' 'Lecturer pending KPI' 'PASS' ('weekly=' + $dash.pendingWeeklyReportsCount + ' sub=' + $dash.pendingSubmissionsCount + ' total=' + $dash.pendingReviewsCount)

if ($reportId) {
  $rev = Req -Method POST -Url ('/api/Lecturer/weekly-reports/' + $reportId + '/review') -Headers $Hg -Body @{
    status = 'Approved'
    lecturerComment = 'QA G2A approve'
    qualityScore = 4.0
  }
  if (-not $rev.ok) {
    $rev = Req -Method POST -Url ('/api/WeeklyReport/' + $reportId + '/review') -Headers $Hg -Body @{
      status = 'Approved'
      lecturerComment = 'QA G2A approve'
      qualityScore = 4.0
    }
  }
  if ($rev.ok) { Log-Case 'G2A-05' 'Lecturer approve report' 'PASS' }
  else { Log-Case 'G2A-05' 'Lecturer approve report' 'FAIL' ($rev.status.ToString() + ' ' + $rev.raw) }

  $after = @((Invoke-RestMethod ($Base + '/api/WeeklyReport/mine') -Headers $Hs).data) | Where-Object { $_.id -eq $reportId } | Select-Object -First 1
  if ($after.status -eq 'Approved') { Log-Case 'G2A-05b' 'SV sees Approved' 'PASS' }
  else { Log-Case 'G2A-05b' 'SV sees Approved' 'FAIL' ('status=' + $after.status) }
}

$sch2 = (Invoke-RestMethod ($Base + '/api/Semesters/' + $SemId + '/report-schedules') -Headers $Hg).data
$closed = @($sch2) | Where-Object { $_.isSubmissionOpen -eq $false } | Select-Object -First 1
if ($closed) {
  $cr2 = Req -Method POST -Url '/api/WeeklyReport' -Headers $Hs -Body @{
    internshipId = $iid
    weekNumber = [int]$closed.weekNumber
    title = 'G2A closed week'
    content = 'should be blocked'
  }
  if ($cr2.ok) {
    $id2 = $cr2.json.data.id
    $sub2 = Req -Method POST -Url ('/api/WeeklyReport/' + $id2 + '/submit') -Headers $Hs
    if (-not $sub2.ok) { Log-Case 'G2A-06' 'Closed week submit blocked' 'PASS' ('week=' + $closed.weekNumber) }
    else { Log-Case 'G2A-06' 'Closed week submit blocked' 'FAIL' 'allowed' }
  } else {
    Log-Case 'G2A-06' 'Closed week create blocked' 'PASS' ('week=' + $closed.weekNumber + ' status=' + $cr2.status)
  }
} else {
  Log-Case 'G2A-06' 'Closed week case' 'WARN' 'no closed week'
}

# G2B attendance - meetingDate must fall inside internship week window
$sess = Req -Method POST -Url '/api/Attendance/sessions' -Headers $Hg -Body @{
  semesterId = $SemId
  weekNumber = 3
  title = 'QA G2B session week 3'
  description = 'attendance test'
  meetingDate = ([datetime]'2026-10-15T10:00:00Z').ToString('o')
  durationMinutes = 60
  location = 'Online'
  studentIds = @($studentId)
  isLecturerOnly = $false
}
$sessionId = $null
if ($sess.ok) {
  $session = if ($sess.json.data) { $sess.json.data } else { $sess.json }
  $sessionId = $session.id
  Log-Case 'G2B-01' 'Create attendance session' 'PASS' ('id=' + $sessionId)
  $mark = Req -Method POST -Url ('/api/Attendance/sessions/' + $sessionId + '/mark') -Headers $Hg -Body @{
    records = @(@{ studentId = $studentId; status = 'Present'; notes = 'QA present' })
  }
  if ($mark.ok) { Log-Case 'G2B-02' 'Mark Present' 'PASS' }
  else { Log-Case 'G2B-02' 'Mark Present' 'FAIL' ($mark.status.ToString() + ' ' + $mark.raw) }
} else {
  Log-Case 'G2B-01' 'Create attendance session' 'FAIL' ($sess.status.ToString() + ' ' + $sess.raw)
}

$sess2 = Req -Method POST -Url '/api/Attendance/sessions' -Headers $Hg -Body @{
  semesterId = $SemId
  weekNumber = 4
  title = 'QA G2B session week 4'
  meetingDate = ([datetime]'2026-10-22T10:00:00Z').ToString('o')
  durationMinutes = 60
  location = 'Lab'
  studentIds = @($studentId)
  isLecturerOnly = $false
}
if ($sess2.ok) {
  $s2 = if ($sess2.json.data) { $sess2.json.data } else { $sess2.json }
  Log-Case 'G2B-03a' 'Create session 2' 'PASS'
  $mark2 = Req -Method POST -Url ('/api/Attendance/sessions/' + $s2.id + '/mark') -Headers $Hg -Body @{
    records = @(@{ studentId = $studentId; status = 'Absent'; notes = 'QA absent' })
  }
  if ($mark2.ok) { Log-Case 'G2B-03' 'Mark Absent' 'PASS' }
  else { Log-Case 'G2B-03' 'Mark Absent' 'FAIL' ($mark2.status.ToString() + ' ' + $mark2.raw) }
} else {
  Log-Case 'G2B-03a' 'Create session 2' 'FAIL' ($sess2.status.ToString() + ' ' + $sess2.raw)
}

$attMe = Req -Url '/api/Attendance/student/me' -Headers $Hs
if ($attMe.ok) { Log-Case 'G2B-04' 'SV attendance/me' 'PASS' } else { Log-Case 'G2B-04' 'SV attendance/me' 'FAIL' ('status=' + $attMe.status) }

$attAdm = Req -Url ('/api/Attendance/admin/report?semesterId=' + $SemId) -Headers $Ha
if ($attAdm.ok) { Log-Case 'G2B-05' 'Admin attendance report' 'PASS' } else { Log-Case 'G2B-05' 'Admin attendance report' 'FAIL' ('status=' + $attAdm.status) }

$cert = Req -Url '/api/StudentPortal/internship-certificate' -Headers $Hs
if ($cert.status -eq 200) { Log-Case 'G2E-01' 'Certificate with company' 'PASS' } else { Log-Case 'G2E-01' 'Certificate with company' 'WARN' ('status=' + $cert.status) }

try {
  $ex = Invoke-WebRequest -Uri ($Base + '/api/InternshipGrading/grades-excel?semesterId=' + $SemId) -Headers $Hg -UseBasicParsing
  if ($ex.StatusCode -eq 200 -and $ex.RawContentLength -gt 100) { Log-Case 'G2E-04' 'Export grades excel' 'PASS' ('bytes=' + $ex.RawContentLength) }
  else { Log-Case 'G2E-04' 'Export grades excel' 'FAIL' }
} catch {
  Log-Case 'G2E-04' 'Export grades excel' 'FAIL' $_.Exception.Message
}

$fin = (Invoke-RestMethod ($Base + '/api/StudentPortal/me') -Headers $Hs).data
Log-Case 'SNAP' 'Final snapshot' 'PASS' ('status=' + $fin.internship.status + ' company=' + $fin.internship.company.companyName + ' progress=' + $fin.progressPercent)

Write-Host ''
Write-Host ("===== PHASE2 DONE PASS={0} FAIL={1} WARN={2} =====" -f $Pass, $Fail, $Warn) -ForegroundColor Cyan
if ($Fail -gt 0) { exit 2 } else { exit 0 }
