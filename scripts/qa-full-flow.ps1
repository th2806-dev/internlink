# InternLink QA full-flow smoke
$ErrorActionPreference = 'Continue'
$Base = 'http://localhost:7109'
$SemId = '57654669-2532-4cd3-85a6-3634ea0ad2c0'
$OutDir = Join-Path $env:TEMP 'internlink-qa'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$Report = New-Object System.Collections.Generic.List[object]
$script:Pass = 0; $script:Fail = 0; $script:Warn = 0
$script:semName = $null
$script:asgData = $null
$script:svInternshipId = $null
$script:svStudentId = $null
$script:pendingReportId = $null
$script:cuongLecturerId = $null

function Add-Case {
  param([string]$Module,[string]$Id,[string]$Title,[string]$Status,[string]$Severity='',[string]$Detail='')
  $Report.Add([PSCustomObject]@{
    module=$Module; id=$Id; title=$Title; status=$Status; severity=$Severity; detail=$Detail
  }) | Out-Null
  switch ($Status) {
    'PASS' { $script:Pass++ }
    'FAIL' { $script:Fail++ }
    'WARN' { $script:Warn++ }
  }
  $line = "[{0}] {1} - {2}" -f $Status, $Id, $Title
  if ($Status -eq 'PASS') { Write-Host $line -ForegroundColor Green }
  elseif ($Status -eq 'FAIL') { Write-Host $line -ForegroundColor Red }
  else { Write-Host $line -ForegroundColor Yellow }
  if ($Detail) { Write-Host ("         {0}" -f $Detail) -ForegroundColor DarkGray }
}

function Login([string]$user,[string]$pass) {
  $body = @{ username = $user; password = $pass } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri ($Base + '/api/Auth/login') -Method POST -Body $body -ContentType 'application/json; charset=utf-8'
  if (-not $resp.success) { throw 'login failed' }
  return $resp.data
}

function AuthHdr([string]$token) { @{ Authorization = ('Bearer ' + $token) } }

function Req {
  param([string]$Method='GET',[string]$Url,[hashtable]$Headers=$null,[object]$Body=$null)
  $uri = if ($Url.StartsWith('http')) { $Url } else { $Base + $Url }
  try {
    $params = @{ Uri = $uri; Method = $Method; UseBasicParsing = $true; TimeoutSec = 60 }
    if ($Headers) { $params.Headers = $Headers }
    if ($null -ne $Body) {
      $params.ContentType = 'application/json; charset=utf-8'
      $params.Body = if ($Body -is [string]) { $Body } else { ($Body | ConvertTo-Json -Depth 8 -Compress) }
    }
    $r = Invoke-WebRequest @params
    $json = $null
    try { $json = $r.Content | ConvertFrom-Json } catch {}
    return [PSCustomObject]@{ ok=$true; status=[int]$r.StatusCode; json=$json; raw=$r.Content }
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
    return [PSCustomObject]@{ ok=$false; status=$status; json=$json; raw=$raw }
  }
}

function Clip([string]$s,[int]$n=280) {
  if (-not $s) { return '' }
  if ($s.Length -le $n) { return $s }
  return $s.Substring(0, $n)
}

Write-Host '===== INTERNLINK FULL FLOW QA =====' -ForegroundColor Cyan

# AUTH
$admin = $null; $gv = $null; $sv = $null
try {
  $admin = Login 'admin-cntt' 'qweasdzxc@123'
  Add-Case 'AUTH' 'AUTH-01' 'Login Admin khoa' 'PASS' '' ('role=' + $admin.role)
} catch { Add-Case 'AUTH' 'AUTH-01' 'Login Admin khoa' 'FAIL' 'P0' $_.Exception.Message }

try {
  $gv = Login 'tqcuong@hcmct.edu.vn' 'qweasdzxc@123'
  Add-Case 'AUTH' 'AUTH-02' 'Login Lecturer' 'PASS' '' ('role=' + $gv.role)
} catch { Add-Case 'AUTH' 'AUTH-02' 'Login Lecturer' 'FAIL' 'P0' $_.Exception.Message }

try {
  $sv = Login '2421160052' 'qweasdzxc@123'
  Add-Case 'AUTH' 'AUTH-03' 'Login Student' 'PASS' '' ('role=' + $sv.role)
} catch { Add-Case 'AUTH' 'AUTH-03' 'Login Student' 'FAIL' 'P0' $_.Exception.Message }

$bad = Req -Method POST -Url '/api/Auth/login' -Body @{ username='admin-cntt'; password='wrong-password' }
if ($bad.status -eq 401) { Add-Case 'AUTH' 'AUTH-04' 'Wrong password returns 401' 'PASS' }
else { Add-Case 'AUTH' 'AUTH-04' 'Wrong password returns 401' 'FAIL' 'P0' ('status=' + $bad.status) }

if ($admin) {
  $me = Req -Url '/api/Auth/me' -Headers (AuthHdr $admin.token)
  if ($me.ok) { Add-Case 'AUTH' 'AUTH-05' 'GET Auth/me' 'PASS' }
  else { Add-Case 'AUTH' 'AUTH-05' 'GET Auth/me' 'FAIL' 'P0' (Clip $me.raw) }
}

if ($sv) {
  $deny = Req -Url '/api/Admin/semesters' -Headers (AuthHdr $sv.token)
  if ($deny.status -in 401,403) { Add-Case 'AUTH' 'AUTH-06' 'Student blocked from Admin/semesters' 'PASS' '' ('status=' + $deny.status) }
  else { Add-Case 'AUTH' 'AUTH-06' 'Student blocked from Admin/semesters' 'FAIL' 'P0' ('status=' + $deny.status) }
}
if ($gv) {
  $deny2 = Req -Url '/api/Admin/assignments' -Headers (AuthHdr $gv.token)
  if ($deny2.status -in 401,403) { Add-Case 'AUTH' 'AUTH-07' 'Lecturer blocked from Admin/assignments' 'PASS' '' ('status=' + $deny2.status) }
  else { Add-Case 'AUTH' 'AUTH-07' 'Lecturer blocked from Admin/assignments' 'FAIL' 'P0' ('status=' + $deny2.status) }
}

$Ha = if ($admin) { AuthHdr $admin.token } else { $null }
$Hg = if ($gv) { AuthHdr $gv.token } else { $null }
$Hs = if ($sv) { AuthHdr $sv.token } else { $null }

# ADMIN
if ($Ha) {
  $sem = Req -Url '/api/Admin/semesters' -Headers $Ha
  if ($sem.ok) {
    $items = @($sem.json.data)
    $t = @($items | Where-Object { $_.id -eq $SemId })
    if ($t.Count -gt 0) {
      $script:semName = [string]$t[0].name
      Add-Case 'ADMIN' 'ADM-01' 'Semester C24A.TH exists' 'PASS' '' $script:semName
    } else {
      Add-Case 'ADMIN' 'ADM-01' 'Semester C24A.TH exists' 'FAIL' 'P0' 'semester id not found'
    }
  } else {
    Add-Case 'ADMIN' 'ADM-01' 'List semesters' 'FAIL' 'P0' (Clip $sem.raw)
  }

  $stu = Req -Url '/api/Admin/students' -Headers $Ha
  if ($stu.ok) {
    $items = if ($stu.json.data.items) { @($stu.json.data.items) } elseif ($stu.json.data -is [array]) { @($stu.json.data) } else { @() }
    $n = $items.Count
    if ($stu.json.data.totalCount) { $n = [int]$stu.json.data.totalCount }
    if ($n -ge 27 -or $items.Count -ge 27) { Add-Case 'ADMIN' 'ADM-02' 'Students list >=27' 'PASS' '' ('count=' + $items.Count + ' total=' + $n) }
    else { Add-Case 'ADMIN' 'ADM-02' 'Students list >=27' 'FAIL' 'P0' ('count=' + $items.Count + ' total=' + $n) }
  } else { Add-Case 'ADMIN' 'ADM-02' 'Students list' 'FAIL' 'P0' (Clip $stu.raw) }

  $cls = Req -Url '/api/Admin/students/classes' -Headers $Ha
  if ($cls.ok) { Add-Case 'ADMIN' 'ADM-03' 'Student classes' 'PASS' } else { Add-Case 'ADMIN' 'ADM-03' 'Student classes' 'FAIL' 'P1' (Clip $cls.raw) }

  $co = Req -Url '/api/Admin/companies' -Headers $Ha
  if ($co.ok) {
    $items = if ($co.json.data.items) { @($co.json.data.items) } elseif ($co.json.data -is [array]) { @($co.json.data) } else { @() }
    if ($items.Count -ge 1) { Add-Case 'ADMIN' 'ADM-04' 'Companies list' 'PASS' '' ('count=' + $items.Count) }
    else { Add-Case 'ADMIN' 'ADM-04' 'Companies list' 'FAIL' 'P1' 'empty' }
  } else { Add-Case 'ADMIN' 'ADM-04' 'Companies list' 'FAIL' 'P0' (Clip $co.raw) }

  $asg = Req -Url ('/api/Admin/assignments?semesterId=' + $SemId) -Headers $Ha
  if ($asg.ok) {
    $items = @($asg.json.data)
    $script:asgData = $items
    if ($items.Count -eq 27) { Add-Case 'ADMIN' 'ADM-05' 'Assignments count = 27' 'PASS' }
    else { Add-Case 'ADMIN' 'ADM-05' 'Assignments count = 27' 'FAIL' 'P0' ('got=' + $items.Count) }

    $byGv = $items | Group-Object lecturerName | Sort-Object Count -Descending
    $dist = ($byGv | ForEach-Object { ([string]$_.Count) + 'x' + $_.Name }) -join '; '
    Add-Case 'ADMIN' 'ADM-06' 'Lecturer workload distribution' 'PASS' '' $dist

    $noCo = @($items | Where-Object { -not $_.companyAssigned -or -not $_.companyId })
    if ($noCo.Count -gt 0) {
      $codes = ($noCo | ForEach-Object { $_.studentCode }) -join ', '
      Add-Case 'ADMIN' 'ADM-07' 'Students missing company' 'FAIL' 'P0' (($noCo.Count.ToString()) + ' SV: ' + $codes)
    } else {
      Add-Case 'ADMIN' 'ADM-07' 'All students have company' 'PASS'
    }

    $noGv = @($items | Where-Object { -not $_.lecturerId })
    if ($noGv.Count -gt 0) {
      Add-Case 'ADMIN' 'ADM-08' 'Students missing lecturer' 'FAIL' 'P0' (($noGv | ForEach-Object { $_.studentCode }) -join ', ')
    } else {
      Add-Case 'ADMIN' 'ADM-08' 'All students have lecturer' 'PASS'
    }

    $st = $items | Group-Object status
    Add-Case 'ADMIN' 'ADM-09' 'Internship status distribution' 'PASS' '' (($st | ForEach-Object { $_.Name + '=' + $_.Count }) -join ', ')

    $mine = @($items | Where-Object { $_.studentCode -eq '2421160052' }) | Select-Object -First 1
    if ($mine) { $script:cuongLecturerId = $mine.lecturerId }
  } else {
    Add-Case 'ADMIN' 'ADM-05' 'Assignments list' 'FAIL' 'P0' (Clip $asg.raw)
  }

  $lec404 = Req -Url '/api/Admin/lecturers' -Headers $Ha
  if ($lec404.status -eq 404) {
    Add-Case 'ADMIN' 'ADM-10' 'GET /Admin/lecturers returns 404' 'FAIL' 'P1' 'dead route; use LecturerProfile'
  } else {
    Add-Case 'ADMIN' 'ADM-10' 'GET /Admin/lecturers' 'PASS' '' ('status=' + $lec404.status)
  }

  $lp = Req -Url '/api/LecturerProfile' -Headers $Ha
  if ($lp.ok) {
    $items = if ($lp.json.data -is [array]) { @($lp.json.data) } else { @($lp.json.data) }
    if ($items.Count -ge 4) { Add-Case 'ADMIN' 'ADM-11' 'LecturerProfile count >=4' 'PASS' '' ('count=' + $items.Count) }
    else { Add-Case 'ADMIN' 'ADM-11' 'LecturerProfile count >=4' 'FAIL' 'P1' ('count=' + $items.Count) }
  } else { Add-Case 'ADMIN' 'ADM-11' 'LecturerProfile' 'FAIL' 'P1' (Clip $lp.raw) }

  $attAdm = Req -Url ('/api/Attendance/admin/report?semesterId=' + $SemId) -Headers $Ha
  if ($attAdm.status -in 200,204) { Add-Case 'ADMIN' 'ADM-12' 'Attendance admin report' 'PASS' }
  else { Add-Case 'ADMIN' 'ADM-12' 'Attendance admin report' 'FAIL' 'P1' ('status=' + $attAdm.status + ' ' + (Clip $attAdm.raw 160)) }

  $n2 = Req -Url '/api/Admin/notifications' -Headers $Ha
  if ($n2.ok -or $n2.status -eq 200) { Add-Case 'ADMIN' 'ADM-13' 'Admin notifications' 'PASS' }
  else {
    $n3 = Req -Url '/api/Notification' -Headers $Ha
    if ($n3.ok -or $n3.status -eq 200) { Add-Case 'ADMIN' 'ADM-13' 'Notifications' 'PASS' }
    else { Add-Case 'ADMIN' 'ADM-13' 'Notifications endpoints' 'WARN' 'P2' ('admin=' + $n2.status + ' notif=' + $n3.status) }
  }

  $backup = Req -Url '/api/SuperAdmin/backups' -Headers $Ha
  if ($backup.status -in 401,403,404) { Add-Case 'ADMIN' 'ADM-14' 'Dept admin blocked from SuperAdmin backups' 'PASS' '' ('status=' + $backup.status) }
  else { Add-Case 'ADMIN' 'ADM-14' 'Dept admin blocked from SuperAdmin backups' 'FAIL' 'P0' ('status=' + $backup.status) }

  $tplCo = Req -Url '/api/Admin/companies/import/template' -Headers $Ha
  if ($tplCo.status -eq 200) { Add-Case 'ADMIN' 'ADM-15' 'Company import template download' 'PASS' }
  else {
    try {
      $b = Invoke-WebRequest -Uri ($Base + '/api/Admin/companies/import/template') -Headers $Ha -UseBasicParsing
      if ($b.StatusCode -eq 200) { Add-Case 'ADMIN' 'ADM-15' 'Company import template download' 'PASS' '' ('bytes=' + $b.RawContentLength) }
      else { Add-Case 'ADMIN' 'ADM-15' 'Company import template' 'FAIL' 'P2' ('status=' + $b.StatusCode) }
    } catch { Add-Case 'ADMIN' 'ADM-15' 'Company import template' 'WARN' 'P2' $_.Exception.Message }
  }
}

# STUDENT
if ($Hs) {
  $portal = Req -Url '/api/StudentPortal/me' -Headers $Hs
  if ($portal.ok) {
    $d = $portal.json.data
    if ($d.student.studentCode -eq '2421160052' -and $d.internship) {
      $script:svInternshipId = $d.internship.id
      $script:svStudentId = $d.student.id
      Add-Case 'STUDENT' 'STU-01' 'StudentPortal/me profile' 'PASS' '' ('status=' + $d.internship.status + ' progress=' + $d.progressPercent)
      if ($d.internship.status -eq 'Graded') { Add-Case 'STUDENT' 'STU-02' 'Internship status Graded' 'PASS' }
      else { Add-Case 'STUDENT' 'STU-02' 'Internship status Graded' 'FAIL' 'P1' ('got=' + $d.internship.status) }
      if ($d.internship.company) { Add-Case 'STUDENT' 'STU-03' 'Company linked on internship' 'PASS' '' ([string]$d.internship.company.companyName) }
      else { Add-Case 'STUDENT' 'STU-03' 'Company linked on internship' 'FAIL' 'P0' 'missing company' }
      if ($d.lecturerName) { Add-Case 'STUDENT' 'STU-04' 'Lecturer name present' 'PASS' '' ([string]$d.lecturerName) }
      else { Add-Case 'STUDENT' 'STU-04' 'Lecturer name present' 'FAIL' 'P1' 'missing' }
      Add-Case 'STUDENT' 'STU-05' 'Archive readonly flag' 'PASS' '' ('isArchiveReadOnly=' + $d.isArchiveReadOnly)
    } else {
      Add-Case 'STUDENT' 'STU-01' 'StudentPortal/me profile' 'FAIL' 'P0' 'incomplete payload'
    }
  } else {
    Add-Case 'STUDENT' 'STU-01' 'StudentPortal/me' 'FAIL' 'P0' (Clip $portal.raw)
  }

  $wr = Req -Url '/api/WeeklyReport/mine' -Headers $Hs
  if ($wr.ok) {
    $items = @($wr.json.data)
    $bySt = $items | Group-Object status
    Add-Case 'STUDENT' 'STU-06' 'WeeklyReport/mine' 'PASS' '' (('n=' + $items.Count + '; ') + (($bySt | ForEach-Object { $_.Name + '=' + $_.Count }) -join ', '))
    $badSt = @($items | Where-Object { $_.status -notin @('Approved','Reviewed') })
    if ($badSt.Count -gt 0) {
      Add-Case 'STUDENT' 'STU-07' 'Graded student has non-approved weekly reports' 'WARN' 'P1' (($badSt | ForEach-Object { 'T' + $_.weekNumber + ':' + $_.status }) -join ', ')
    } else {
      Add-Case 'STUDENT' 'STU-07' 'All weekly reports Approved/Reviewed' 'PASS'
    }
  } else {
    Add-Case 'STUDENT' 'STU-06' 'WeeklyReport/mine' 'FAIL' 'P0' (Clip $wr.raw)
  }

  $sub = Req -Url '/api/Submission/mine' -Headers $Hs
  if ($sub.ok) {
    $items = @($sub.json.data)
    if ($items.Count -eq 0) {
      Add-Case 'STUDENT' 'STU-08' 'Submission/mine for Graded student' 'FAIL' 'P0' 'empty submissions while Graded'
    } else {
      $types = ($items | ForEach-Object { ([string]$_.type) + ':' + ([string]$_.status) }) -join ', '
      Add-Case 'STUDENT' 'STU-08' 'Submission/mine has final work' 'PASS' '' $types
    }
  } else {
    Add-Case 'STUDENT' 'STU-08' 'Submission/mine' 'FAIL' 'P0' (Clip $sub.raw)
  }

  $attMe = Req -Url '/api/Attendance/student/me' -Headers $Hs
  if ($attMe.ok) { Add-Case 'STUDENT' 'STU-09' 'Attendance student/me' 'PASS' }
  else { Add-Case 'STUDENT' 'STU-09' 'Attendance student/me' 'FAIL' 'P1' (Clip $attMe.raw) }

  try {
    $bytes = Invoke-WebRequest -Uri ($Base + '/api/StudentPortal/internship-certificate') -Headers $Hs -UseBasicParsing -TimeoutSec 60
    if ($bytes.StatusCode -eq 200 -and $bytes.RawContentLength -gt 100) {
      Add-Case 'STUDENT' 'STU-10' 'Internship certificate PDF' 'PASS' '' ('bytes=' + $bytes.RawContentLength)
    } else {
      Add-Case 'STUDENT' 'STU-10' 'Internship certificate PDF' 'FAIL' 'P1' ('status=' + $bytes.StatusCode + ' len=' + $bytes.RawContentLength)
    }
  } catch {
    Add-Case 'STUDENT' 'STU-10' 'Internship certificate PDF' 'FAIL' 'P1' $_.Exception.Message
  }

  if ($script:svInternshipId) {
    $ev = Req -Url ('/api/Evaluation/internship/' + $script:svInternshipId) -Headers $Hs
    if ($ev.status -eq 200) {
      Add-Case 'STUDENT' 'STU-11' 'Evaluation by internship' 'PASS'
      ($ev.json | ConvertTo-Json -Depth 8) | Out-File (Join-Path $OutDir 'sv-evaluation.json') -Encoding utf8
    } else {
      Add-Case 'STUDENT' 'STU-11' 'Evaluation by internship' 'FAIL' 'P0' ('status=' + $ev.status + ' ' + (Clip $ev.raw 200))
    }
  }

  $evMine = Req -Url '/api/Evaluation/mine' -Headers $Hs
  if ($evMine.status -eq 400) {
    Add-Case 'STUDENT' 'STU-12' 'GET Evaluation/mine route conflict' 'FAIL' 'P2' 'treats mine as id'
  } else {
    Add-Case 'STUDENT' 'STU-12' 'GET Evaluation/mine' 'WARN' 'P2' ('status=' + $evMine.status)
  }

  $idor = Req -Url '/api/Admin/students' -Headers $Hs
  if ($idor.status -in 401,403) { Add-Case 'STUDENT' 'STU-13' 'Student cannot list Admin students' 'PASS' }
  else { Add-Case 'STUDENT' 'STU-13' 'Student cannot list Admin students' 'FAIL' 'P0' ('status=' + $idor.status) }
}

# LECTURER
if ($Hg) {
  $dash = Req -Url '/api/Lecturer/dashboard' -Headers $Hg
  if ($dash.ok) {
    $d = if ($dash.json.data) { $dash.json.data } else { $dash.json }
    Add-Case 'LECTURER' 'LEC-01' 'Dashboard KPI' 'PASS' '' ('total=' + $d.totalStudents + ' pending=' + $d.pendingReviewsCount + ' avg=' + $d.averageGrade)
  } else {
    Add-Case 'LECTURER' 'LEC-01' 'Dashboard KPI' 'FAIL' 'P0' (Clip $dash.raw)
  }

  $lst = Req -Url '/api/Lecturer/students' -Headers $Hg
  if ($lst.ok) {
    $items = @($lst.json.data)
    if ($items.Count -eq 8) { Add-Case 'LECTURER' 'LEC-02' 'Assigned students = 8' 'PASS' }
    else { Add-Case 'LECTURER' 'LEC-02' 'Assigned students = 8' 'FAIL' 'P1' ('got=' + $items.Count) }

    $noCo = @($items | Where-Object { -not $_.companyId -or [string]::IsNullOrWhiteSpace([string]$_.companyName) })
    if ($noCo.Count -gt 0) {
      Add-Case 'LECTURER' 'LEC-03' 'Lecturer sees students without company' 'FAIL' 'P0' (($noCo | ForEach-Object { $_.studentCode }) -join ', ')
    } else {
      Add-Case 'LECTURER' 'LEC-03' 'All lecturer students have company' 'PASS'
    }

    $zero = @($items | Where-Object { [int]$_.progressPercent -eq 0 })
    if ($zero.Count -gt 0) {
      Add-Case 'LECTURER' 'LEC-04' 'Students with 0% progress' 'WARN' 'P1' (($zero | ForEach-Object { $_.studentCode }) -join ', ')
    } else {
      Add-Case 'LECTURER' 'LEC-04' 'No zero-progress students' 'PASS'
    }
  } else {
    Add-Case 'LECTURER' 'LEC-02' 'Lecturer students' 'FAIL' 'P0' (Clip $lst.raw)
  }

  $wrs = Req -Url ('/api/Lecturer/weekly-reports?semesterId=' + $SemId) -Headers $Hg
  if (-not $wrs.ok) { $wrs = Req -Url '/api/Lecturer/weekly-reports' -Headers $Hg }
  if ($wrs.ok) {
    $items = if ($wrs.json.data.items) { @($wrs.json.data.items) } elseif ($wrs.json.data -is [array]) { @($wrs.json.data) } else { @() }
    $pending = @($items | Where-Object { $_.status -eq 'Submitted' })
    Add-Case 'LECTURER' 'LEC-05' 'Weekly reports list' 'PASS' '' ('total=' + $items.Count + ' submitted=' + $pending.Count)
    if ($pending.Count -gt 0) { $script:pendingReportId = $pending[0].id }
  } else {
    Add-Case 'LECTURER' 'LEC-05' 'Weekly reports list' 'FAIL' 'P1' (Clip $wrs.raw)
  }

  if ($script:svInternshipId) {
    $detail = Req -Url ('/api/Lecturer/internships/' + $script:svInternshipId) -Headers $Hg
    if ($detail.ok) { Add-Case 'LECTURER' 'LEC-06' 'Internship workspace Graded SV' 'PASS' }
    else { Add-Case 'LECTURER' 'LEC-06' 'Internship workspace Graded SV' 'FAIL' 'P0' (Clip $detail.raw) }

    $evL = Req -Url ('/api/Lecturer/evaluations/internship/' + $script:svInternshipId) -Headers $Hg
    if ($evL.status -eq 200) {
      Add-Case 'LECTURER' 'LEC-07' 'Lecturer evaluation by internship' 'PASS'
      ($evL.json | ConvertTo-Json -Depth 8) | Out-File (Join-Path $OutDir 'gv-evaluation.json') -Encoding utf8
    } else {
      $ev2 = Req -Url ('/api/Evaluation/internship/' + $script:svInternshipId) -Headers $Hg
      if ($ev2.status -eq 200) { Add-Case 'LECTURER' 'LEC-07' 'Evaluation via /Evaluation/internship' 'PASS' }
      else { Add-Case 'LECTURER' 'LEC-07' 'Evaluation by internship (lecturer)' 'FAIL' 'P0' ('status=' + $evL.status + '/' + $ev2.status) }
    }
  }

  $grd = Req -Url ('/api/InternshipGrading/summary?semesterId=' + $SemId) -Headers $Hg
  if ($grd.ok) {
    $rows = @()
    if ($grd.json.data.students) { $rows = @($grd.json.data.students) }
    elseif ($grd.json.data.items) { $rows = @($grd.json.data.items) }
    elseif ($grd.json.data -is [array]) { $rows = @($grd.json.data) }
    if ($rows.Count -eq 0) {
      Add-Case 'LECTURER' 'LEC-08' 'Grading summary has rows' 'FAIL' 'P0' 'empty summary for lecturer'
    } else {
      Add-Case 'LECTURER' 'LEC-08' 'Grading summary has rows' 'PASS' '' ('rows=' + $rows.Count)
      $hit = $rows | Where-Object { $_.studentCode -eq '2421160052' -or $_.StudentCode -eq '2421160052' } | Select-Object -First 1
      if ($hit) {
        $snap = ($hit | ConvertTo-Json -Compress -Depth 5)
        Add-Case 'LECTURER' 'LEC-09' 'Graded student present in summary' 'PASS' '' (Clip $snap 320)
        $snap | Out-File (Join-Path $OutDir 'grade-2421160052.json') -Encoding utf8
      } else {
        Add-Case 'LECTURER' 'LEC-09' 'Graded student present in summary' 'FAIL' 'P0' ('rows=' + $rows.Count + ' but MSSV missing')
      }
    }
  } else {
    Add-Case 'LECTURER' 'LEC-08' 'InternshipGrading summary' 'FAIL' 'P0' (Clip $grd.raw)
  }

  $sess = Req -Url ('/api/Attendance/sessions?semesterId=' + $SemId) -Headers $Hg
  if (-not $sess.ok) { $sess = Req -Url '/api/Attendance/sessions' -Headers $Hg }
  if ($sess.status -eq 200) {
    $items = if ($sess.json.data -is [array]) { @($sess.json.data) } elseif ($sess.json.data.items) { @($sess.json.data.items) } else { @() }
    Add-Case 'LECTURER' 'LEC-10' 'Attendance sessions' 'PASS' '' ('count=' + $items.Count)
  } else {
    Add-Case 'LECTURER' 'LEC-10' 'Attendance sessions' 'FAIL' 'P1' ('status=' + $sess.status + ' ' + (Clip $sess.raw 160))
  }

  $abs = Req -Url ('/api/Attendance/absence-summary?semesterId=' + $SemId) -Headers $Hg
  if ($abs.status -eq 200) { Add-Case 'LECTURER' 'LEC-11' 'Absence summary' 'PASS' }
  else { Add-Case 'LECTURER' 'LEC-11' 'Absence summary' 'WARN' 'P2' ('status=' + $abs.status) }

  $subs = Req -Url '/api/Lecturer/submissions' -Headers $Hg
  if ($subs.ok) { Add-Case 'LECTURER' 'LEC-12' 'Lecturer submissions list' 'PASS' }
  else { Add-Case 'LECTURER' 'LEC-12' 'Lecturer submissions list' 'FAIL' 'P1' (Clip $subs.raw) }

  try {
    $ex = Invoke-WebRequest -Uri ($Base + '/api/InternshipGrading/grades-excel?semesterId=' + $SemId) -Headers $Hg -UseBasicParsing -TimeoutSec 90
    if ($ex.StatusCode -eq 200 -and $ex.RawContentLength -gt 100) {
      Add-Case 'LECTURER' 'LEC-13' 'Export grades Excel' 'PASS' '' ('bytes=' + $ex.RawContentLength)
    } else {
      Add-Case 'LECTURER' 'LEC-13' 'Export grades Excel' 'FAIL' 'P1' ('status=' + $ex.StatusCode + ' len=' + $ex.RawContentLength)
    }
  } catch {
    $msg = $_.Exception.Message
    if ($_.ErrorDetails.Message) { $msg = $_.ErrorDetails.Message }
    Add-Case 'LECTURER' 'LEC-13' 'Export grades Excel' 'FAIL' 'P1' (Clip $msg)
  }

  $sch = Req -Url ('/api/Semesters/' + $SemId + '/report-schedules') -Headers $Hg
  if ($sch.status -eq 200) {
    $items = if ($sch.json.data) { @($sch.json.data) } else { @($sch.json) }
    Add-Case 'LECTURER' 'LEC-14' 'Report schedules' 'PASS' '' ('n=' + @($items).Count)
  } else {
    Add-Case 'LECTURER' 'LEC-14' 'Report schedules' 'WARN' 'P2' ('status=' + $sch.status)
  }

  if ($script:asgData -and $script:cuongLecturerId) {
    $other = $script:asgData | Where-Object { $_.lecturerId -ne $script:cuongLecturerId } | Select-Object -First 1
    if ($other) {
      $idor = Req -Url ('/api/Lecturer/internships/' + $other.internshipId) -Headers $Hg
      if ($idor.status -in 401,403,404) {
        Add-Case 'LECTURER' 'LEC-15' 'IDOR other lecturer internship blocked' 'PASS' '' ('status=' + $idor.status + ' sv=' + $other.studentCode)
      } elseif ($idor.status -eq 200) {
        Add-Case 'LECTURER' 'LEC-15' 'IDOR other lecturer internship blocked' 'FAIL' 'P0' ('LEAK sv=' + $other.studentCode)
      } else {
        Add-Case 'LECTURER' 'LEC-15' 'IDOR other lecturer internship blocked' 'WARN' 'P1' ('status=' + $idor.status)
      }
    }
  }

  if ($script:pendingReportId) {
    $prd = Req -Url ('/api/Lecturer/weekly-reports/' + $script:pendingReportId) -Headers $Hg
    if ($prd.ok) { Add-Case 'FLOW' 'FLOW-01' 'Pending weekly report detail readable' 'PASS' '' ('id=' + $script:pendingReportId) }
    else { Add-Case 'FLOW' 'FLOW-01' 'Pending weekly report detail readable' 'FAIL' 'P1' (Clip $prd.raw) }
  } else {
    Add-Case 'FLOW' 'FLOW-01' 'No Submitted weekly report to inspect' 'WARN' 'P2' 'dashboard pending may use other statuses'
  }
}

# Cross-check graded student consistency
if ($Hs -and $Hg -and $script:svInternshipId) {
  $p = (Req -Url '/api/StudentPortal/me' -Headers $Hs).json.data
  $gRows = $null
  $grd2 = Req -Url ('/api/InternshipGrading/summary?semesterId=' + $SemId) -Headers $Hg
  if ($grd2.ok) {
    if ($grd2.json.data.students) { $gRows = @($grd2.json.data.students) }
    elseif ($grd2.json.data.items) { $gRows = @($grd2.json.data.items) }
    elseif ($grd2.json.data -is [array]) { $gRows = @($grd2.json.data) }
  }
  $hit = $null
  if ($gRows) { $hit = $gRows | Where-Object { $_.studentCode -eq '2421160052' } | Select-Object -First 1 }
  if ($p.internship.status -eq 'Graded' -and $hit) {
    Add-Case 'FLOW' 'FLOW-02' 'Graded status visible to both SV and GV summary' 'PASS'
  } elseif ($p.internship.status -eq 'Graded' -and -not $hit) {
    Add-Case 'FLOW' 'FLOW-02' 'Graded status visible to both SV and GV summary' 'FAIL' 'P0' 'SV Graded but missing in GV grading summary'
  } else {
    Add-Case 'FLOW' 'FLOW-02' 'Graded cross-check' 'WARN' 'P1' ('svStatus=' + $p.internship.status)
  }
}

# ENV
try {
  $fe = Invoke-WebRequest 'http://localhost:3000' -UseBasicParsing -TimeoutSec 10
  Add-Case 'ENV' 'ENV-01' 'Frontend :3000' 'PASS' '' ('status=' + $fe.StatusCode)
} catch { Add-Case 'ENV' 'ENV-01' 'Frontend :3000' 'FAIL' 'P0' $_.Exception.Message }

$proxy = Req -Url 'http://localhost:3000/api/Auth/me'
if ($proxy.status -in 401,403) { Add-Case 'ENV' 'ENV-02' 'Vite proxy /api to backend' 'PASS' '' ('status=' + $proxy.status) }
elseif ($proxy.status -eq 0) { Add-Case 'ENV' 'ENV-02' 'Vite proxy /api to backend' 'FAIL' 'P0' (Clip $proxy.raw) }
else { Add-Case 'ENV' 'ENV-02' 'Vite proxy /api to backend' 'WARN' 'P2' ('status=' + $proxy.status) }

$health = Req -Url '/health'
if ($health.ok) { Add-Case 'ENV' 'ENV-03' 'API health' 'PASS' }
else { Add-Case 'ENV' 'ENV-03' 'API health' 'FAIL' 'P0' (Clip $health.raw) }

$summary = [PSCustomObject]@{
  generatedAt = (Get-Date).ToString('s')
  semesterId = $SemId
  semesterName = $script:semName
  pass = $Pass
  fail = $Fail
  warn = $Warn
  total = ($Pass + $Fail + $Warn)
  cases = $Report
}
$path = Join-Path $OutDir 'full-flow-report.json'
($summary | ConvertTo-Json -Depth 8) | Out-File $path -Encoding utf8
Write-Host ''
Write-Host ('===== DONE PASS={0} FAIL={1} WARN={2} TOTAL={3} =====' -f $Pass,$Fail,$Warn,$summary.total) -ForegroundColor Cyan
Write-Host ('Report: ' + $path)
Write-Host ''
Write-Host '--- FAILURES ---' -ForegroundColor Red
$Report | Where-Object { $_.status -eq 'FAIL' } | ForEach-Object { Write-Host ('[{0}] {1} {2} :: {3}' -f $_.severity,$_.id,$_.title,$_.detail) }
Write-Host ''
Write-Host '--- WARNINGS ---' -ForegroundColor Yellow
$Report | Where-Object { $_.status -eq 'WARN' } | ForEach-Object { Write-Host ('[{0}] {1} {2} :: {3}' -f $_.severity,$_.id,$_.title,$_.detail) }

