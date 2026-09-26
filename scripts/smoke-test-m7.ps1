# InternLink smoke test — end-to-end API flows (backend :7109)
# Matches current demo seed: admin / admin-cntt / gvcntt01 / cnttsv0003 (Password123!)
# Run AFTER reset-demo.sql + API restart so demo data exists.
$Base = "http://localhost:7109"
$Pass = "Password123!"
$results = @()

function Record {
  param($step, $ok, $detail)
  $script:results += [pscustomobject]@{ Step = $step; OK = $ok; Detail = $detail }
  $icon = if ($ok) { "PASS" } else { "FAIL" }
  Write-Host "[$icon] $step - $detail"
}

function Login {
  param($user)
  $body = @{ username = $user; password = $Pass } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$Base/api/Auth/login" -Method Post -Body $body -ContentType "application/json"
  if (-not $r.success -or -not $r.data.token) { throw "Login failed for $user" }
  return $r.data.token
}

function Get-Auth {
  param($token, $path)
  Invoke-RestMethod -Uri "$Base$path" -Headers @{ Authorization = "Bearer $token" }
}

function Post-Auth {
  param($token, $path, $bodyObj)
  $body = $bodyObj | ConvertTo-Json -Depth 6
  Invoke-RestMethod -Uri "$Base$path" -Method Post -Headers @{ Authorization = "Bearer $token" } -Body $body -ContentType "application/json"
}

function New-ZipTemp {
  param($name = "smoke-product.zip")
  $path = Join-Path $env:TEMP $name
  [IO.File]::WriteAllBytes($path, [byte[]](0x50, 0x4B, 0x05, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0))
  return $path
}

function New-PdfTemp {
  param($name = "smoke-template.pdf")
  $path = Join-Path $env:TEMP $name
  # Minimal PDF header bytes
  [IO.File]::WriteAllBytes($path, [Text.Encoding]::ASCII.GetBytes("%PDF-1.4`n1 0 obj<<>>endobj`ntrailer<<>>`n%%EOF"))
  return $path
}

try {
  # --- Flow 1: Login 4 portals ---
  $adminTok = Login "admin-cntt"
  $superTok = Login "admin"
  $lecTok   = Login "gvcntt01"
  $stuTok   = Login "cnttsv0003"
  Record "F1 Login 4 portal" $true "admin-cntt, admin, gvcntt01, cnttsv0003"

  # --- Flow 2: Admin students + assignment visibility ---
  $students = (Get-Auth $adminTok "/api/Admin/students?skip=0&take=10").data
  $assignments = (Get-Auth $adminTok "/api/Admin/assignments").data
  Record "F2 Admin students+assignments" (($students | Measure-Object).Count -gt 0) "students=$($students.Count)"

  # Shared context: student portal profile
  $me = (Get-Auth $stuTok "/api/StudentPortal/me").data
  $internshipId = $me.internship.id
  if (-not $internshipId) { throw "cnttsv0003 has no internship" }
  Record "F2b Student portal profile" ($me.progressPercent -ge 0) "progress=$($me.progressPercent)% internship=$internshipId"

  $lecInternships = (Get-Auth $lecTok "/api/Lecturer/internships").data
  $lecHasInternship = @($lecInternships | Where-Object { $_.id -eq $internshipId }).Count -gt 0
  Record "F2c Lecturer sees own internship" $lecHasInternship "internshipId=$internshipId"

  # --- Flow 3: GV upload template -> SV download ---
  # Endpoint nhận field "Files" (số nhiều, cho phép nhiều file) và trả { count, documents }.
  $pdfTmp = New-PdfTemp
  $docJson = curl.exe -s -X POST "$Base/api/Document/upload" `
    -H "Authorization: Bearer $lecTok" `
    -F "InternshipId=$internshipId" `
    -F "Title=Smoke template" `
    -F "Category=Template" `
    -F "IsRequired=true" `
    -F "Files=@$pdfTmp;type=application/pdf"
  $docUpload = $docJson | ConvertFrom-Json
  $docId = $docUpload.data.documents[0].id
  $docDl = curl.exe -s -o NUL -w "%{http_code} %{size_download}" "$Base/api/Document/$docId/download" -H "Authorization: Bearer $stuTok"
  $docParts = $docDl -split ' '
  Record "F3 Doc upload+download" (($docUpload.success -and $docId) -and ($docParts[0] -eq '200')) "docId=$docId status=$($docParts[0])"

  # --- Flow 4: SV weekly report -> GV review -> SV notification ---
  # Chỉ chọn tuần ĐANG MỞ theo "Cấu hình báo cáo" (tuần đóng/bảo vệ bị chặn là đúng nghiệp vụ).
  # Admin lấy kỳ active của khoa, rồi đọc report-schedules theo kỳ đó.
  $semesters = (Get-Auth $adminTok "/api/Admin/semesters").data
  $activeSemesterId = @($semesters | Where-Object { $_.status -eq 1 } | Select-Object -First 1).id
  $sched = (Get-Auth $stuTok "/api/Semesters/$activeSemesterId/report-schedules").data
  $existingWeeks = @((Get-Auth $stuTok "/api/WeeklyReport/mine").data | ForEach-Object { [int]$_.weekNumber })
  # Loại tuần báo cáo cuối kỳ (mở nộp nhưng không phải BC tuần)
  $openWeeks = @($sched | Where-Object { $_.isSubmissionOpen -and [int]$_.weekNumber -ge 1 -and $_.title -notlike "*cuối kỳ*" } | ForEach-Object { [int]$_.weekNumber })
  $weekNum = 3
  while (($existingWeeks -contains $weekNum -or $openWeeks -notcontains $weekNum) -and $weekNum -le 60) { $weekNum++ }
  if ($weekNum -gt 60) { throw "No open week available without an existing report" }
  $draftBody = @{
    internshipId = $internshipId
    weekNumber   = $weekNum
    title        = "Smoke week $weekNum"
    content      = "Smoke test weekly report content."
  }
  $draft = (Post-Auth $stuTok "/api/WeeklyReport" $draftBody).data
  $submitted = (Post-Auth $stuTok "/api/WeeklyReport/$($draft.id)/submit" @{}).data
  $reviewBody = @{ status = "Approved"; lecturerComment = "Smoke OK" }
  $reviewed = (Post-Auth $lecTok "/api/WeeklyReport/$($draft.id)/review" $reviewBody).data
  Record "F4 Weekly submit+review" ($submitted.status -eq "Submitted" -and $reviewed.status -eq "Approved") "week=$weekNum status=$($reviewed.status)"

  # --- Flow 5: SV product -> GV feedback -> resubmit ---
  $zipTmp = New-ZipTemp "smoke-product.zip"
  $subJson = curl.exe -s -X POST "$Base/api/Submission/upload" `
    -H "Authorization: Bearer $stuTok" `
    -F "InternshipId=$internshipId" `
    -F "Type=Product" `
    -F "Title=Smoke product v1" `
    -F "File=@$zipTmp;type=application/zip"
  $subUpload = $subJson | ConvertFrom-Json
  if (-not $subUpload.success) {
    # Product requires FinalReport first — submit final report then retry product.
    $zipFr = New-ZipTemp "smoke-finalreport.zip"
    $frJson = curl.exe -s -X POST "$Base/api/Submission/upload" `
      -H "Authorization: Bearer $stuTok" `
      -F "InternshipId=$internshipId" `
      -F "Type=FinalReport" `
      -F "Title=Smoke final report" `
      -F "File=@$zipFr;type=application/zip"
    $fr = $frJson | ConvertFrom-Json
    $subJson = curl.exe -s -X POST "$Base/api/Submission/upload" `
      -H "Authorization: Bearer $stuTok" `
      -F "InternshipId=$internshipId" `
      -F "Type=Product" `
      -F "Title=Smoke product v1" `
      -F "File=@$zipTmp;type=application/zip"
    $subUpload = $subJson | ConvertFrom-Json
  }
  $subId = $subUpload.data.id
  $fbBody = @{ comment = "Please revise section 2"; isPublic = $true; newStatus = "RevisionRequested" }
  $feedback = (Post-Auth $lecTok "/api/Submission/$subId/feedback" $fbBody).data
  $zipTmp2 = New-ZipTemp "smoke-product-v2.zip"
  $resubJson = curl.exe -s -X POST "$Base/api/Submission/$subId/resubmit-upload" `
    -H "Authorization: Bearer $stuTok" `
    -F "Title=Smoke product v2" `
    -F "File=@$zipTmp2;type=application/zip"
  $resub = $resubJson | ConvertFrom-Json
  Record "F5 Submit+feedback+resubmit" ($subId -and $feedback.id -and $resub.success) "orig=$subId resub=$($resub.data.id)"

  # --- Flow 6: Lecturer grading summary + Excel export (C23 + C22A) ---
  $grading = (Get-Auth $lecTok "/api/InternshipGrading/summary?semesterId=$activeSemesterId").data
  Record "F6a Grading summary" (($grading.students | Measure-Object).Count -gt 0) "students=$($grading.students.Count)"

  $expExcel = curl.exe -s -o NUL -w "%{http_code}" "$Base/api/Lecturer/export/end-of-term" -H "Authorization: Bearer $lecTok"
  Record "F6b Lecturer Excel export" ($expExcel -eq '200') "status=$expExcel"

  # --- Flow 7: Notifications for student (SignalR-backed store) ---
  $noti = (Get-Auth $stuTok "/api/Notification/mine").data
  Record "F7 Student notifications" ($null -ne $noti) "count=$(@($noti).Count)"

  Remove-Item $pdfTmp, $zipTmp, $zipTmp2 -ErrorAction SilentlyContinue
}
catch {
  Record "SMOKE ABORT" $false $_.Exception.Message
}

Write-Host ""
Write-Host "=== Smoke Summary ==="
$passed = @($results | Where-Object { $_.OK }).Count
$total = $results.Count
Write-Host ("{0} / {1} passed" -f $passed, $total)
if (@($results | Where-Object { -not $_.OK }).Count -gt 0) { exit 1 }
