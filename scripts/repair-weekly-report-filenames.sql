/*
    Export weekly reports and their version rows for students whose names start
    with Vietnamese D-with-stroke. Save the result as CSV, then pass that CSV to
    repair-weekly-report-filenames.ps1.

    Optionally set @InternshipId to limit the export to one internship folder.
*/
SET NOCOUNT ON;

DECLARE @InternshipId uniqueidentifier = NULL;
-- Example:
-- SET @InternshipId = 'bf4d2665-4369-4eac-9746-5e463bc4eb99';

SELECT
    N'WeeklyReport' AS RecordType,
    CONVERT(nvarchar(36), wr.WeeklyReportId) AS RecordId,
    CONVERT(nvarchar(36), wr.InternshipId) AS InternshipId,
    wr.WeekNumber,
    wr.Version,
    s.FullName AS StudentFullName,
    wr.FileName,
    wr.FileUrl,
    CASE WHEN wr.Content = wr.FileName THEN wr.Content ELSE NULL END AS Content
FROM dbo.WeeklyReports AS wr
JOIN dbo.Internships AS i ON i.InternshipId = wr.InternshipId
JOIN dbo.Students AS s ON s.StudentId = i.StudentId
WHERE wr.IsDeleted = 0
  AND s.IsDeleted = 0
  AND UNICODE(LEFT(s.FullName, 1)) IN (272, 273)
  AND (@InternshipId IS NULL OR wr.InternshipId = @InternshipId)

UNION ALL

SELECT
    N'WeeklyReportVersion' AS RecordType,
    CONVERT(nvarchar(36), wrv.WeeklyReportVersionId) AS RecordId,
    CONVERT(nvarchar(36), wr.InternshipId) AS InternshipId,
    wr.WeekNumber,
    wrv.Version,
    s.FullName AS StudentFullName,
    wrv.FileName,
    wrv.FileUrl,
    CAST(NULL AS nvarchar(8000)) AS Content
FROM dbo.WeeklyReportVersions AS wrv
JOIN dbo.WeeklyReports AS wr ON wr.WeeklyReportId = wrv.WeeklyReportId
JOIN dbo.Internships AS i ON i.InternshipId = wr.InternshipId
JOIN dbo.Students AS s ON s.StudentId = i.StudentId
WHERE wrv.IsDeleted = 0
  AND wr.IsDeleted = 0
  AND s.IsDeleted = 0
  AND UNICODE(LEFT(s.FullName, 1)) IN (272, 273)
  AND (@InternshipId IS NULL OR wr.InternshipId = @InternshipId)
ORDER BY InternshipId, WeekNumber, Version, RecordType;
