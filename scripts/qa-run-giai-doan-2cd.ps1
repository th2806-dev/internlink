# Phase 2 C+D: final submission + grading for SV 2421160052
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

Write-Host '===== PHASE 2C+2D =====' -ForegroundColor Cyan
$sv = Login '2421160052' 'qweasdzxc@123'
$gv = Login 'tqcuong@hcmct.edu.vn' 'qweasdzxc@123'
$Hs = AuthHdr $sv.token
$Hg = AuthHdr $gv.token

$portal = (Invoke-RestMethod ($Base + '/api/StudentPortal/me') -Headers $Hs).data
$iid = $portal.internship.id
$studentId = $portal.student.id
Log-Case 'PRE' 'SV ready for final flow' 'PASS' ('status=' + $portal.internship.status + ' company=' + $portal.internship.company.companyName)

# --- G2C-01 FinalReport ---
$subs = @((Invoke-RestMethod ($Base + '/api/Submission/mine') -Headers $Hs).data)
$final = $subs | Where-Object { $_.type -eq 'FinalReport' -and $_.status -in @('Submitted', 'Approved') } | Select-Object -First 1
if (-not $final) {
  $cr = Req -Method POST -Url '/api/Submission' -Headers $Hs -Body @{
    internshipId = $iid
    type = 'FinalReport'
    title = 'Bao cao cuoi ky QA G2C'
    description = 'Nop bao cao tot nghiep - kiem thu Giai doan 2C'
    fileName = 'BaoCaoCuoiKy_2421160052_QA.pdf'
    fileUrl = 'uploads/qa/BaoCaoCuoiKy_2421160052_QA.pdf'
  }
  if ($cr.ok) {
    $final = if ($cr.json.data) { $cr.json.data } else { $cr.json }
    Log-Case 'G2C-01' 'Submit FinalReport' 'PASS' ('id=' + $final.id + ' status=' + $final.status)
  } else {
    Log-Case 'G2C-01' 'Submit FinalReport' 'FAIL' ($cr.status.ToString() + ' ' + $cr.raw)
  }
} else {
  Log-Case 'G2C-01' 'FinalReport already present' 'PASS' ('id=' + $final.id + ' status=' + $final.status)
}

# --- G2C-03 Product (creative) ---
$subs2 = @((Invoke-RestMethod ($Base + '/api/Submission/mine') -Headers $Hs).data)
$product = $subs2 | Where-Object { $_.type -eq 'Product' -and $_.status -in @('Submitted', 'Approved') } | Select-Object -First 1
if (-not $product) {
  $pr = Req -Method POST -Url '/api/Submission' -Headers $Hs -Body @{
    internshipId = $iid
    type = 'Product'
    title = 'San pham thuc tap QA G2C'
    description = 'San pham demo QA'
    fileName = 'Product_2421160052_QA.zip'
    fileUrl = 'uploads/qa/Product_2421160052_QA.zip'
  }
  if ($pr.ok) {
    $product = if ($pr.json.data) { $pr.json.data } else { $pr.json }
    Log-Case 'G2C-03' 'Submit Product' 'PASS' ('id=' + $product.id)
  } else {
    Log-Case 'G2C-03' 'Submit Product' 'WARN' ($pr.status.ToString() + ' ' + $pr.raw)
  }
} else {
  Log-Case 'G2C-03' 'Product already present' 'PASS' ('id=' + $product.id)
}

# --- G2C-02 Approve FinalReport ---
if ($final -and $final.id) {
  $cur = @((Invoke-RestMethod ($Base + '/api/Submission/mine') -Headers $Hs).data) | Where-Object { $_.id -eq $final.id } | Select-Object -First 1
  if ($cur.status -eq 'Approved') {
    Log-Case 'G2C-02' 'FinalReport already Approved' 'PASS'
  } else {
    $ap = Req -Method PATCH -Url ('/api/Submission/' + $final.id + '/status') -Headers $Hg -Body @{ status = 'Approved' }
    if ($ap.ok) { Log-Case 'G2C-02' 'Lecturer approve FinalReport' 'PASS' }
    else { Log-Case 'G2C-02' 'Lecturer approve FinalReport' 'FAIL' ($ap.status.ToString() + ' ' + $ap.raw) }
  }
}

if ($product -and $product.id) {
  $curP = @((Invoke-RestMethod ($Base + '/api/Submission/mine') -Headers $Hs).data) | Where-Object { $_.id -eq $product.id } | Select-Object -First 1
  if ($curP -and $curP.status -ne 'Approved') {
    $apP = Req -Method PATCH -Url ('/api/Submission/' + $product.id + '/status') -Headers $Hg -Body @{ status = 'Approved' }
    if ($apP.ok) { Log-Case 'G2C-03b' 'Lecturer approve Product' 'PASS' }
    else { Log-Case 'G2C-03b' 'Lecturer approve Product' 'WARN' ($apP.status.ToString() + ' ' + $apP.raw) }
  } elseif ($curP.status -eq 'Approved') {
    Log-Case 'G2C-03b' 'Product already Approved' 'PASS'
  }
}

$subsAfter = @((Invoke-RestMethod ($Base + '/api/Submission/mine') -Headers $Hs).data)
Log-Case 'G2C-SNAP' 'Submissions snapshot' 'PASS' (($subsAfter | ForEach-Object { $_.type + ':' + $_.status }) -join ', ')

# --- G2D-01 grading summary ---
$grd = Req -Url ('/api/InternshipGrading/summary?semesterId=' + $SemId) -Headers $Hg
$rows = @()
if ($grd.ok) {
  if ($grd.json.data.students) { $rows = @($grd.json.data.students) }
  elseif ($grd.json.data.items) { $rows = @($grd.json.data.items) }
  elseif ($grd.json.data -is [array]) { $rows = @($grd.json.data) }
}
$hit = $rows | Where-Object { $_.studentCode -eq '2421160052' } | Select-Object -First 1
if ($hit) {
  Log-Case 'G2D-01' 'SV in grading summary' 'PASS' ('eligible=' + $hit.isEligible + ' status=' + $hit.internshipStatus)
} else {
  Log-Case 'G2D-01' 'SV in grading summary' 'FAIL' ('rows=' + $rows.Count)
}

# --- G2D-02 save grade ---
$save = Req -Method POST -Url ('/api/InternshipGrading/save?semesterId=' + $SemId) -Headers $Hg -Body @{
  studentId = $studentId
  weeklyQualityScores = @{ '2' = 4.0; '5' = 4.0 }
  qualityScore = 4.0
  hasCreativeProduct = $true
  oralExamScore = 8.0
  note = 'QA G2D cham diem'
}
if ($save.ok) {
  $saved = if ($save.json.data) { $save.json.data } else { $save.json }
  Log-Case 'G2D-02' 'Save grade QT + oral' 'PASS' ('process=' + $saved.processScore + ' oral=' + $saved.oralExamScore + ' avg=' + $saved.averageScore + ' class=' + $saved.classification)
} else {
  Log-Case 'G2D-02' 'Save grade QT + oral' 'FAIL' ($save.status.ToString() + ' ' + $save.raw)
}

# re-read summary row
$grd2 = Req -Url ('/api/InternshipGrading/summary?semesterId=' + $SemId) -Headers $Hg
$rows2 = @()
if ($grd2.json.data.students) { $rows2 = @($grd2.json.data.students) }
elseif ($grd2.json.data.items) { $rows2 = @($grd2.json.data.items) }
elseif ($grd2.json.data -is [array]) { $rows2 = @($grd2.json.data) }
$hit2 = $rows2 | Where-Object { $_.studentCode -eq '2421160052' } | Select-Object -First 1
if ($hit2) {
  Log-Case 'G2D-02b' 'Summary reflects scores' 'PASS' ('QT=' + $hit2.processScore + ' oral=' + $hit2.oralExamScore + ' avg=' + $hit2.averageScore + ' status=' + $hit2.internshipStatus)
} else {
  Log-Case 'G2D-02b' 'Summary reflects scores' 'WARN' 'row missing after save'
}

# --- G2D-03 student evaluation ---
$ev = Req -Url ('/api/Evaluation/internship/' + $iid) -Headers $Hs
if ($ev.status -eq 200) {
  $e = if ($ev.json.data) { $ev.json.data } else { $ev.json }
  Log-Case 'G2D-03' 'SV view evaluation' 'PASS' ('finalGrade=' + $e.finalGrade + ' oral=' + $e.oralExamScore + ' finalized=' + $e.isFinalized)
} elseif ($ev.status -eq 204) {
  Log-Case 'G2D-03' 'SV view evaluation' 'FAIL' '204 empty after grading'
} else {
  Log-Case 'G2D-03' 'SV view evaluation' 'FAIL' ('status=' + $ev.status + ' ' + $ev.raw)
}

$portal2 = (Invoke-RestMethod ($Base + '/api/StudentPortal/me') -Headers $Hs).data
Log-Case 'SNAP' 'Portal after grading' 'PASS' ('status=' + $portal2.internship.status + ' progress=' + $portal2.progressPercent)

Write-Host ''
Write-Host ("===== 2C+2D DONE PASS={0} FAIL={1} WARN={2} =====" -f $Pass, $Fail, $Warn) -ForegroundColor Cyan
if ($Fail -gt 0) { exit 2 } else { exit 0 }
