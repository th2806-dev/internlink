-- Reset demo data completely: wipe all seeded business data and leave only the single SuperAdmin account.
-- Child tables first (FK order), then parents. Runs in one transaction — rolls back on error.
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
BEGIN TRAN;

DELETE FROM Feedbacks;
DELETE FROM WeeklyReportVersions;
IF OBJECT_ID(N'SubmissionAssets', N'U') IS NOT NULL DELETE FROM SubmissionAssets;
DELETE FROM WeeklyReports;
DELETE FROM DocumentVersions;
DELETE FROM Documents;
DELETE FROM AttendanceRecords;
DELETE FROM AttendanceSessions;
DELETE FROM Submissions;
DELETE FROM Evaluations;
DELETE FROM EvaluationRubricCriteria;
DELETE FROM EvaluationRubrics;
DELETE FROM SemesterReportSchedules;
DELETE FROM CompanyPositions;
DELETE FROM SemesterCompanies;
DELETE FROM SemesterLecturers;
DELETE FROM Internships;
DELETE FROM AccountRequests;
DELETE FROM Notifications;
DELETE FROM RefreshTokens;
DELETE FROM PasswordResetTokens;
DELETE FROM Students;
DELETE FROM Lecturers;
DELETE FROM Companies;
DELETE FROM Semesters;

-- Remove every user except the original SuperAdmin account so the environment starts clean.
DELETE FROM Users WHERE Username <> 'admin';

-- Remove seeded departments so the database starts from a blank state.
DELETE FROM Departments;

COMMIT;

-- Report what remains
SELECT 'Users' AS TableName, COUNT(*) AS Remaining FROM Users
UNION ALL SELECT 'Departments', COUNT(*) FROM Departments
UNION ALL SELECT 'Semesters', COUNT(*) FROM Semesters
UNION ALL SELECT 'Students', COUNT(*) FROM Students
UNION ALL SELECT 'Lecturers', COUNT(*) FROM Lecturers
UNION ALL SELECT 'Companies', COUNT(*) FROM Companies
UNION ALL SELECT 'Internships', COUNT(*) FROM Internships;
