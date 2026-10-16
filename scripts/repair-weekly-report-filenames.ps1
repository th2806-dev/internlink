[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
param(
    [Parameter(Mandatory = $true)]
    [string]$InputCsv,

    [string]$UploadRoot = "C:\Apps\InternLink\Api\uploads\weekly-reports",

    [string]$OutputSql = (Join-Path (Get-Location) "repair-weekly-report-filenames.generated.sql"),

    [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertTo-ReportNamePart {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StudentName,

        [switch]$MapVietnameseD
    )

    $name = $StudentName
    if ($MapVietnameseD) {
        $name = $name.Replace([char]0x0110, [char]'D').Replace([char]0x0111, [char]'d')
    }

    $normalized = $name.Normalize([Text.NormalizationForm]::FormD)
    $builder = New-Object System.Text.StringBuilder
    foreach ($character in $normalized.ToCharArray()) {
        if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($character) -ne
            [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$builder.Append($character)
        }
    }

    $withoutMarks = $builder.ToString().Normalize([Text.NormalizationForm]::FormC)
    return [regex]::Replace($withoutMarks, "[^A-Za-z0-9]", "")
}

function ConvertTo-SqlLiteral {
    param([AllowEmptyString()][string]$Value)
    if ($null -eq $Value) {
        return "NULL"
    }
    return "N'" + $Value.Replace("'", "''") + "'"
}

function Get-SafePhysicalPath {
    param(
        [string]$FileUrl,
        [string]$InternshipId,
        [string]$CanonicalRoot
    )

    if ([string]::IsNullOrWhiteSpace($FileUrl)) {
        throw "FileUrl is empty."
    }

    $normalizedUrl = $FileUrl.Replace('\', '/').TrimStart('/')
    $managedPrefix = "uploads/weekly-reports/"
    if (-not $normalizedUrl.StartsWith($managedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "FileUrl is outside '$managedPrefix'."
    }

    $relativePath = $normalizedUrl.Substring($managedPrefix.Length)
    if (-not $relativePath.StartsWith("$InternshipId/", [StringComparison]::OrdinalIgnoreCase)) {
        throw "FileUrl does not point to the row's InternshipId folder."
    }
    if ($relativePath.Split('/') -contains '..') {
        throw "FileUrl contains a path traversal segment."
    }

    $physicalPath = [IO.Path]::GetFullPath((Join-Path $CanonicalRoot ($relativePath.Replace('/', [IO.Path]::DirectorySeparatorChar))))
    $rootWithSeparator = $CanonicalRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (-not $physicalPath.StartsWith($rootWithSeparator, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Resolved path is outside the upload root."
    }
    return $physicalPath
}

$requiredColumns = @(
    "RecordType",
    "RecordId",
    "InternshipId",
    "WeekNumber",
    "Version",
    "StudentFullName",
    "FileName",
    "FileUrl",
    "Content"
)

if (-not (Test-Path -LiteralPath $InputCsv -PathType Leaf)) {
    throw "Input CSV not found: $InputCsv"
}
if (-not (Test-Path -LiteralPath $UploadRoot -PathType Container)) {
    throw "Upload root not found: $UploadRoot"
}

$canonicalRoot = [IO.Path]::GetFullPath($UploadRoot)
$records = @(Import-Csv -LiteralPath $InputCsv -Encoding UTF8)
if ($records.Count -eq 0) {
    Write-Output "CSV is empty. No candidate records."
    return
}

$actualColumns = @($records[0].PSObject.Properties.Name)
$missingColumns = @($requiredColumns | Where-Object { $_ -notin $actualColumns })
if ($missingColumns.Count -gt 0) {
    throw "CSV is missing columns: $($missingColumns -join ', '). Export the result of repair-weekly-report-filenames.sql."
}

$candidateRows = New-Object System.Collections.Generic.List[object]
$skippedCount = 0
foreach ($record in $records) {
    if ([string]::IsNullOrWhiteSpace($record.StudentFullName) -or
        ($record.StudentFullName.IndexOf([char]0x0110) -lt 0 -and
         $record.StudentFullName.IndexOf([char]0x0111) -lt 0 -and
         $record.StudentFullName.IndexOf([char]0x00D0) -lt 0 -and
         $record.StudentFullName.IndexOf([char]0x00F0) -lt 0)) {
        Write-Verbose "Skipping row $($record.RecordId): student name does not contain Đ/đ."
        $skippedCount++
        continue
    }

    try {
        $weekNumber = [int]$record.WeekNumber
        $version = [int]$record.Version
        $recordId = [guid]$record.RecordId
        $internshipId = [guid]$record.InternshipId
        if ($weekNumber -lt 1 -or $version -lt 1) {
            throw "WeekNumber and Version must be positive."
        }

        $legacyNamePart = ConvertTo-ReportNamePart -StudentName $record.StudentFullName
        $correctNamePart = ConvertTo-ReportNamePart -StudentName $record.StudentFullName -MapVietnameseD
        if ([string]::IsNullOrWhiteSpace($legacyNamePart) -or
            [string]::IsNullOrWhiteSpace($correctNamePart) -or
            $legacyNamePart -eq $correctNamePart) {
            Write-Verbose "Skipping row ${recordId}: expected names are empty or unchanged after the fix."
            $skippedCount++
            continue
        }

        $expectedLegacyName = "Tuan{0:D2}_{1}_V{2}.pdf" -f $weekNumber, $legacyNamePart, $version
        $expectedCorrectName = "Tuan{0:D2}_{1}_V{2}.pdf" -f $weekNumber, $correctNamePart, $version
        if (-not [string]::Equals($record.FileName, $expectedLegacyName, [StringComparison]::Ordinal)) {
            Write-Verbose "Skipping row ${recordId}: FileName '$($record.FileName)' does not match legacy name '$expectedLegacyName'."
            $skippedCount++
            continue
        }

        $sourcePath = Get-SafePhysicalPath -FileUrl $record.FileUrl -InternshipId $internshipId.ToString() -CanonicalRoot $canonicalRoot
        $sourceFileName = [IO.Path]::GetFileName($sourcePath)
        if (-not [string]::Equals($sourceFileName, $record.FileName, [StringComparison]::Ordinal)) {
            throw "FileUrl filename does not match the database FileName."
        }
        $targetPath = Join-Path ([IO.Path]::GetDirectoryName($sourcePath)) $expectedCorrectName
        $newFileUrl = $record.FileUrl.Replace('\', '/')
        $slash = $newFileUrl.LastIndexOf('/')
        $newFileUrl = $newFileUrl.Substring(0, $slash + 1) + $expectedCorrectName

        $candidateRows.Add([pscustomobject]@{
            RecordType = $record.RecordType
            RecordId = $recordId
            InternshipId = $internshipId
            WeekNumber = $weekNumber
            Version = $version
            StudentFullName = $record.StudentFullName
            OldFileName = $record.FileName
            NewFileName = $expectedCorrectName
            OldFileUrl = $record.FileUrl
            NewFileUrl = $newFileUrl
            Content = $record.Content
            SourcePath = $sourcePath
            TargetPath = $targetPath
            Error = ""
        })
    }
    catch {
        $candidateRows.Add([pscustomobject]@{
            RecordType = $record.RecordType
            RecordId = $record.RecordId
            InternshipId = $record.InternshipId
            WeekNumber = $record.WeekNumber
            Version = $record.Version
            StudentFullName = $record.StudentFullName
            OldFileName = $record.FileName
            NewFileName = ""
            OldFileUrl = $record.FileUrl
            NewFileUrl = ""
            Content = $record.Content
            SourcePath = ""
            TargetPath = ""
            Error = $_.Exception.Message
        })
    }
}

if ($candidateRows.Count -eq 0) {
    Write-Output "No malformed weekly report filenames found. Skipped rows: $skippedCount."
    return
}

$fileOperations = @{}
foreach ($row in $candidateRows) {
    if ($row.Error) { continue }
    $key = $row.SourcePath.ToLowerInvariant()
    if (-not $fileOperations.ContainsKey($key)) {
        $fileOperations[$key] = [pscustomobject]@{
            SourcePath = $row.SourcePath
            TargetPath = $row.TargetPath
            Rows = New-Object System.Collections.Generic.List[object]
            Error = ""
        }
    }
    $operation = $fileOperations[$key]
    if (-not [string]::Equals($operation.TargetPath, $row.TargetPath, [StringComparison]::OrdinalIgnoreCase)) {
        $operation.Error = "Multiple rows map this physical file to different target names."
    }
    $operation.Rows.Add($row)
}

foreach ($operation in $fileOperations.Values) {
    if (-not (Test-Path -LiteralPath $operation.SourcePath -PathType Leaf)) {
        $operation.Error = "Source file is missing."
    }
    elseif (Test-Path -LiteralPath $operation.TargetPath) {
        $operation.Error = "Target file already exists; refusing to overwrite."
    }
    foreach ($row in $operation.Rows) {
        if ($operation.Error) {
            $row | Add-Member -NotePropertyName Error -NotePropertyValue $operation.Error -Force
        }
    }
}

$candidateRows |
    Select-Object RecordType, RecordId, StudentFullName, OldFileName, NewFileName, OldFileUrl, Error |
    Format-Table -AutoSize
Write-Output "Physical files: $($fileOperations.Count); database rows: $($candidateRows.Count); skipped rows: $skippedCount."

$errors = @($candidateRows | Where-Object { $_.Error })
if ($errors.Count -gt 0) {
    Write-Error "At least one candidate is blocked. No files were changed. Resolve the listed issue and rerun."
    return
}

if (-not $Apply) {
    Write-Output "Dry run only. No files or database records were changed. Review the plan, then rerun with -Apply."
    return
}

if (Test-Path -LiteralPath $OutputSql) {
    throw "Output SQL already exists; choose another path or move it first: $OutputSql"
}

$sqlBuilder = New-Object System.Text.StringBuilder
[void]$sqlBuilder.AppendLine("SET XACT_ABORT ON;")
[void]$sqlBuilder.AppendLine("BEGIN TRANSACTION;")
[void]$sqlBuilder.AppendLine("")
foreach ($row in $candidateRows) {
    $table = if ($row.RecordType -eq "WeeklyReport") { "dbo.WeeklyReports" }
        elseif ($row.RecordType -eq "WeeklyReportVersion") { "dbo.WeeklyReportVersions" }
        else { throw "Unknown RecordType '$($row.RecordType)'." }
    $idColumn = if ($row.RecordType -eq "WeeklyReport") { "WeeklyReportId" } else { "WeeklyReportVersionId" }
    $newFileName = ConvertTo-SqlLiteral $row.NewFileName
    $newFileUrl = ConvertTo-SqlLiteral $row.NewFileUrl
    $oldFileName = ConvertTo-SqlLiteral $row.OldFileName
    $recordIdText = $row.RecordId.ToString()

    if ($row.RecordType -eq "WeeklyReport") {
        $contentOld = ConvertTo-SqlLiteral $row.OldFileName
        $contentNew = ConvertTo-SqlLiteral $row.NewFileName
        [void]$sqlBuilder.AppendLine("UPDATE $table")
        [void]$sqlBuilder.AppendLine("SET FileName = $newFileName,")
        [void]$sqlBuilder.AppendLine("    FileUrl = $newFileUrl,")
        [void]$sqlBuilder.AppendLine("    Content = CASE WHEN Content = $contentOld THEN $contentNew ELSE Content END")
        [void]$sqlBuilder.AppendLine("WHERE $idColumn = '$recordIdText' AND FileName = $oldFileName;")
    }
    else {
        [void]$sqlBuilder.AppendLine("UPDATE $table")
        [void]$sqlBuilder.AppendLine("SET FileName = $newFileName, FileUrl = $newFileUrl")
        [void]$sqlBuilder.AppendLine("WHERE $idColumn = '$recordIdText' AND FileName = $oldFileName;")
    }
    [void]$sqlBuilder.AppendLine("IF @@ROWCOUNT <> 1 THROW 51000, 'Expected exactly one filename row to update; transaction rolled back.', 1;")
    [void]$sqlBuilder.AppendLine("")
}
[void]$sqlBuilder.AppendLine("COMMIT TRANSACTION;")
[void]$sqlBuilder.AppendLine("PRINT 'Weekly report filename repair committed.';")

if (-not $PSCmdlet.ShouldProcess("$($fileOperations.Count) files and $($candidateRows.Count) database rows", "Rename files and generate SQL update script")) {
    return
}

$renamed = New-Object System.Collections.Generic.List[object]
try {
    foreach ($operation in $fileOperations.Values) {
        [IO.File]::Move($operation.SourcePath, $operation.TargetPath)
        $renamed.Add($operation)
    }

    $utf8WithBom = New-Object System.Text.UTF8Encoding -ArgumentList $true
    [IO.File]::WriteAllText($OutputSql, $sqlBuilder.ToString(), $utf8WithBom)
}
catch {
    $rollbackOperations = $renamed.ToArray()
    [array]::Reverse($rollbackOperations)
    foreach ($operation in $rollbackOperations) {
        if ((Test-Path -LiteralPath $operation.TargetPath -PathType Leaf) -and
            -not (Test-Path -LiteralPath $operation.SourcePath)) {
            [IO.File]::Move($operation.TargetPath, $operation.SourcePath)
        }
    }
    if (Test-Path -LiteralPath $OutputSql -PathType Leaf) {
        Remove-Item -LiteralPath $OutputSql -Force
    }
    throw
}

Write-Output "Renamed $($renamed.Count) physical files."
Write-Output "Generated database update script: $OutputSql"
Write-Output "Review and run the generated SQL script against the same database before restarting or allowing further uploads."
