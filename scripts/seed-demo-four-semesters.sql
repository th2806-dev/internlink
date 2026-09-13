-- InternLink demo seed: four semesters with realistic cross-portal data.
-- Idempotent and additive: does not delete existing business data.
-- Demo credentials already present in the database are preserved.
SET XACT_ABORT ON;
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
BEGIN TRAN;

DECLARE @now datetime2 = SYSUTCDATETIME();
DECLARE @studentUserId uniqueidentifier;
DECLARE @lecturerUserId uniqueidentifier;
DECLARE @studentId uniqueidentifier;
DECLARE @lecturerId uniqueidentifier;

SELECT @studentUserId = UserId
FROM Users
WHERE IsDeleted = 0 AND LOWER(Email) = 'thachhien2000@gmail.com';

SELECT @lecturerUserId = UserId
FROM Users
WHERE IsDeleted = 0 AND LOWER(Email) = 'htbin2806@gmail.com';

IF @studentUserId IS NULL OR @lecturerUserId IS NULL
    THROW 51000, 'Demo accounts thachhien2000@gmail.com and htbin2806@gmail.com are required.', 1;

SELECT @studentId = StudentId FROM Students WHERE UserId = @studentUserId AND IsDeleted = 0;
SELECT @lecturerId = LecturerId FROM Lecturers WHERE UserId = @lecturerUserId AND IsDeleted = 0;

IF @studentId IS NULL OR @lecturerId IS NULL
    THROW 51001, 'Demo accounts must have Student and Lecturer profiles.', 1;

-- Ensure the four named demo semesters exist. Existing rows with these IDs are kept.
IF NOT EXISTS (SELECT 1 FROM Semesters WHERE SemesterId = '11111111-1111-1111-1111-111111111111')
INSERT INTO Semesters (SemesterId, Name, Term, AcademicYear, StartDate, EndDate, Status, Description, MaxStudentsPerLecturer, CreatedAt, IsDeleted)
VALUES ('11111111-1111-1111-1111-111111111111', N'Thực tập Tốt nghiệp K20 (2025 - 2026)', N'Học kỳ I', N'2025 - 2026', DATEADD(MONTH, -2, @now), DATEADD(MONTH, 2, @now), 1, N'Kỳ thực tập chính thức K20.', 30, @now, 0);

IF NOT EXISTS (SELECT 1 FROM Semesters WHERE SemesterId = '22222222-2222-2222-2222-222222222222')
INSERT INTO Semesters (SemesterId, Name, Term, AcademicYear, StartDate, EndDate, Status, Description, MaxStudentsPerLecturer, CreatedAt, IsDeleted)
VALUES ('22222222-2222-2222-2222-222222222222', N'Thực tập Doanh nghiệp K20 (2025 - 2026)', N'Học kỳ II', N'2025 - 2026', DATEADD(MONTH, 3, @now), DATEADD(MONTH, 7, @now), 0, N'Kỳ thực tập doanh nghiệp K20.', 30, @now, 0);

IF NOT EXISTS (SELECT 1 FROM Semesters WHERE SemesterId = '33333333-3333-3333-3333-333333333333')
INSERT INTO Semesters (SemesterId, Name, Term, AcademicYear, StartDate, EndDate, Status, Description, MaxStudentsPerLecturer, CreatedAt, IsDeleted)
VALUES ('33333333-3333-3333-3333-333333333333', N'Thực tập Tốt nghiệp K19 (2024 - 2025)', N'Học kỳ I', N'2024 - 2025', DATEADD(YEAR, -1, @now), DATEADD(MONTH, -8, @now), 2, N'Kỳ đã hoàn tất tổng kết.', 30, @now, 0);

IF NOT EXISTS (SELECT 1 FROM Semesters WHERE SemesterId = '12F1CE87-23BC-4AC3-B8C5-0172C0681218')
INSERT INTO Semesters (SemesterId, Name, Term, AcademicYear, StartDate, EndDate, Status, Description, MaxStudentsPerLecturer, CreatedAt, IsDeleted)
VALUES ('12F1CE87-23BC-4AC3-B8C5-0172C0681218', N'Thực tập Tốt nghiệp C24 - Khoa CNTT (2026 - 2027)', N'Học kỳ I', N'2026 - 2027', DATEADD(MONTH, -1, @now), DATEADD(MONTH, 3, @now), 1, N'Kỳ demo phục vụ trình diễn dashboard.', 30, @now, 0);

-- Every lecturer and company is visible in every semester roster.
INSERT INTO SemesterLecturers (SemesterLecturerId, SemesterId, LecturerId, CreatedAt, IsDeleted)
SELECT NEWID(), sem.SemesterId, lec.LecturerId, @now, 0
FROM Semesters sem
CROSS JOIN Lecturers lec
WHERE sem.IsDeleted = 0 AND lec.IsDeleted = 0
  AND NOT EXISTS (
      SELECT 1 FROM SemesterLecturers x
      WHERE x.SemesterId = sem.SemesterId AND x.LecturerId = lec.LecturerId AND x.IsDeleted = 0
  );

INSERT INTO SemesterCompanies (SemesterCompanyId, SemesterId, CompanyId, IsActive, CreatedAt, IsDeleted)
SELECT NEWID(), sem.SemesterId, company.CompanyId, 1, @now, 0
FROM Semesters sem
CROSS JOIN Companies company
WHERE sem.IsDeleted = 0 AND company.IsDeleted = 0
  AND NOT EXISTS (
      SELECT 1 FROM SemesterCompanies x
      WHERE x.SemesterId = sem.SemesterId AND x.CompanyId = company.CompanyId AND x.IsDeleted = 0
  );

-- Fill every student into every semester with deterministic variety.
;WITH StudentRows AS (
    SELECT StudentId, ROW_NUMBER() OVER (ORDER BY StudentId) - 1 AS rn
    FROM Students WHERE IsDeleted = 0
), LecturerRows AS (
    SELECT LecturerId, ROW_NUMBER() OVER (ORDER BY LecturerId) - 1 AS rn
    FROM Lecturers WHERE IsDeleted = 0
), CompanyRows AS (
    SELECT CompanyId, ROW_NUMBER() OVER (ORDER BY CompanyId) - 1 AS rn
    FROM Companies WHERE IsDeleted = 0
), SemesterRows AS (
    SELECT SemesterId, ROW_NUMBER() OVER (ORDER BY CreatedAt, SemesterId) - 1 AS rn
    FROM Semesters WHERE IsDeleted = 0
)
INSERT INTO Internships (InternshipId, StudentId, CompanyId, LecturerId, SemesterId, StartDate, EndDate, Status, Position, SupervisorName, Notes, CreatedAt, IsDeleted)
SELECT
    NEWID(),
    st.StudentId,
    CASE WHEN ABS(CONVERT(bigint, CHECKSUM(st.StudentId, se.SemesterId))) % 5 = 0 THEN NULL ELSE co.CompanyId END,
    le.LecturerId,
    se.SemesterId,
    DATEADD(DAY, -30 + (ABS(CONVERT(bigint, CHECKSUM(st.StudentId))) % 20), @now),
    DATEADD(MONTH, 4, @now),
    ABS(CONVERT(bigint, CHECKSUM(st.StudentId, se.SemesterId))) % 7,
    CASE ABS(CONVERT(bigint, CHECKSUM(st.StudentId, se.SemesterId))) % 4
        WHEN 0 THEN N'Frontend Developer'
        WHEN 1 THEN N'Backend Developer'
        WHEN 2 THEN N'QA Intern'
        ELSE N'Data Analyst Intern'
    END,
    N'Nguyễn Minh Anh',
    N'Dữ liệu demo được tạo tự động cho mục đích trình diễn.',
    @now,
    0
FROM StudentRows st
CROSS JOIN SemesterRows se
JOIN LecturerRows le ON le.rn = ABS(CONVERT(bigint, CHECKSUM(st.StudentId, se.SemesterId))) % (SELECT COUNT(*) FROM LecturerRows)
JOIN CompanyRows co ON co.rn = ABS(CONVERT(bigint, CHECKSUM(st.StudentId, se.SemesterId))) % (SELECT COUNT(*) FROM CompanyRows)
WHERE NOT EXISTS (
    SELECT 1 FROM Internships i
    WHERE i.StudentId = st.StudentId AND i.SemesterId = se.SemesterId
);

-- The requested demo pair stays connected in all four semesters.
UPDATE i
SET i.LecturerId = @lecturerId,
    i.CompanyId = company.CompanyId,
    i.Status = CASE sem.SemesterId
        WHEN '33333333-3333-3333-3333-333333333333' THEN 6
        WHEN '12F1CE87-23BC-4AC3-B8C5-0172C0681218' THEN 5
        WHEN '11111111-1111-1111-1111-111111111111' THEN 1
        ELSE 0
    END,
    i.Position = N'Full-stack Developer Intern',
    i.SupervisorName = N'ThS. Lê Hoàng Nam',
    i.UpdatedAt = @now
FROM Internships i
JOIN Semesters sem ON sem.SemesterId = i.SemesterId
CROSS APPLY (SELECT TOP 1 CompanyId FROM Companies WHERE IsDeleted = 0 ORDER BY CompanyName) company
WHERE i.StudentId = @studentId AND i.IsDeleted = 0;

-- Add one visible student -> lecturer interaction on the active demo internship.
DECLARE @activeInternshipId uniqueidentifier;
SELECT TOP 1 @activeInternshipId = i.InternshipId
FROM Internships i
JOIN Semesters sem ON sem.SemesterId = i.SemesterId
WHERE i.StudentId = @studentId AND sem.Status = 1 AND i.IsDeleted = 0
ORDER BY sem.StartDate DESC;

IF @activeInternshipId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @activeInternshipId AND WeekNumber = 1 AND IsDeleted = 0)
    INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
    VALUES (NEWID(), @activeInternshipId, 1, 1, N'Báo cáo tuần 1 - Làm quen dự án', N'Đã hoàn thành onboarding, đọc tài liệu hệ thống và tạo kế hoạch công việc tuần đầu tiên.', 2, DATEADD(DAY, -2, @now), N'Tiến độ tốt. Tiếp tục cập nhật kết quả theo từng đầu việc.', @now, 0);

    DECLARE @reportId uniqueidentifier;
    SELECT TOP 1 @reportId = WeeklyReportId FROM WeeklyReports WHERE InternshipId = @activeInternshipId AND WeekNumber = 1 AND IsDeleted = 0;

    IF @reportId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Feedbacks WHERE WeeklyReportId = @reportId AND LecturerId = @lecturerId AND IsDeleted = 0)
    INSERT INTO Feedbacks (FeedbackId, WeeklyReportId, LecturerId, Comment, IsPublic, LecturerReadAt, CreatedAt, IsDeleted)
    VALUES (NEWID(), @reportId, @lecturerId, N'Đã xem báo cáo. Nội dung rõ ràng, cần bổ sung ảnh chụp kết quả vào tuần sau.', 1, @now, @now, 0);

    IF NOT EXISTS (SELECT 1 FROM Notifications WHERE UserId = @studentUserId AND Link = N'/student/weekly-reports' AND Title = N'GVHD đã phản hồi báo cáo tuần 1' AND IsDeleted = 0)
    INSERT INTO Notifications (NotificationId, UserId, Title, Content, Link, IsRead, CreatedAt, IsDeleted)
    VALUES (NEWID(), @studentUserId, N'GVHD đã phản hồi báo cáo tuần 1', N'ThS. Lê Hoàng Nam đã gửi nhận xét cho báo cáo tuần đầu tiên của bạn.', N'/student/weekly-reports', 0, @now, 0);

    IF NOT EXISTS (SELECT 1 FROM Notifications WHERE UserId = @lecturerUserId AND Link = N'/lecturer/reports' AND Title = N'Sinh viên đã nộp báo cáo tuần 1' AND IsDeleted = 0)
    INSERT INTO Notifications (NotificationId, UserId, Title, Content, Link, IsRead, CreatedAt, IsDeleted)
    VALUES (NEWID(), @lecturerUserId, N'Sinh viên đã nộp báo cáo tuần 1', N'Thạch Hiền đã nộp báo cáo tuần đầu tiên để bạn xem xét.', N'/lecturer/reports', 0, @now, 0);
END;

-- Give the demo lecturer a realistic six-week reporting trend in every semester.
;WITH DemoLecturerInternships AS (
    SELECT i.InternshipId,
           ROW_NUMBER() OVER (PARTITION BY i.SemesterId ORDER BY i.InternshipId) - 1 AS rn
    FROM Internships i
    JOIN Lecturers l ON l.LecturerId = i.LecturerId
    JOIN Users u ON u.UserId = l.UserId
    WHERE LOWER(u.Email) = 'htbin2806@gmail.com' AND i.IsDeleted = 0
), Weeks AS (
    SELECT 1 AS WeekNumber UNION ALL SELECT 2 UNION ALL SELECT 3
    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
)
INSERT INTO WeeklyReports
    (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
SELECT
    NEWID(),
    demo.InternshipId,
    weeks.WeekNumber,
    1,
    CONCAT(N'Báo cáo tuần ', weeks.WeekNumber, N' - Tiến độ thực tập'),
    CONCAT(N'Đã cập nhật tiến độ công việc tuần ', weeks.WeekNumber, N' và kết quả phối hợp với doanh nghiệp.'),
    CASE
        WHEN weeks.WeekNumber = 5 AND demo.rn % 3 = 0 THEN 3 -- RevisionRequested = trễ / cần sửa
        ELSE 1 -- Submitted = đúng hạn / đã nộp
    END,
    DATEADD(DAY, -(6 - weeks.WeekNumber) * 5, @now),
    CASE WHEN weeks.WeekNumber = 5 AND demo.rn % 3 = 0 THEN N'Cần bổ sung minh chứng và cập nhật phần kết quả.' ELSE NULL END,
    @now,
    0
FROM DemoLecturerInternships demo
CROSS JOIN Weeks weeks
WHERE NOT EXISTS (
    SELECT 1 FROM WeeklyReports existing
    WHERE existing.InternshipId = demo.InternshipId
      AND existing.WeekNumber = weeks.WeekNumber
      AND existing.IsDeleted = 0
);

-- Normalize Vietnamese text with code points so sqlcmd code pages cannot corrupt the UI.
UPDATE wr
SET wr.Title = N'B' + NCHAR(0x00E1) + N'o c' + NCHAR(0x00E1) + N'o tu' + NCHAR(0x1EA7) + N'n '
    + CONVERT(nvarchar(10), wr.WeekNumber) + N' - Ti' + NCHAR(0x1EBF) + N'n '
    + NCHAR(0x0111) + NCHAR(0x1ED9) + N' th' + NCHAR(0x1EF1) + N'c t' + NCHAR(0x1EAD) + N'p',
    wr.Content = N'N' + NCHAR(0x1ED9) + N'p c' + NCHAR(0x1EAD) + N'p ti' + NCHAR(0x1EBF) + N'n '
    + NCHAR(0x0111) + NCHAR(0x1ED9) + N' c' + NCHAR(0x00F4) + N'ng vi' + NCHAR(0x1EC7) + N'c tu' + NCHAR(0x1EA7) + N'n '
    + CONVERT(nvarchar(10), wr.WeekNumber) + N' v' + NCHAR(0x00E0) + N' k' + NCHAR(0x1EBF) + N't qu' + NCHAR(0x1EA3) + N' ph' + NCHAR(0x1ED1) + N'i h' + NCHAR(0x1EE3) + N'p v' + NCHAR(0x1EDB) + N'i doanh nghi' + NCHAR(0x1EC7) + N'p.',
    wr.LecturerComment = CASE
        WHEN wr.Status = 3 THEN N'C' + NCHAR(0x1EA7) + N'n b' + NCHAR(0x1ED5) + N'sung minh ch' + NCHAR(0x1EE9) + N'ng v' + NCHAR(0x00E0) + N' c' + NCHAR(0x1EAD) + N'p nh' + NCHAR(0x1EAD) + N't ph' + NCHAR(0x1EA7) + N'n k' + NCHAR(0x1EBF) + N't qu' + NCHAR(0x1EA3) + N'.'
        WHEN wr.WeekNumber = 1 THEN N'Ti' + NCHAR(0x1EBF) + N'n ' + NCHAR(0x0111) + NCHAR(0x1ED9) + N' t' + NCHAR(0x1ED1) + N't. Ti' + NCHAR(0x1EBF) + N'p t' + NCHAR(0x1EE5) + N'c c' + NCHAR(0x1EAD) + N'p nh' + NCHAR(0x1EAD) + N't k' + NCHAR(0x1EBF) + N't qu' + NCHAR(0x1EA3) + N' theo t' + NCHAR(0x1EEB) + N'ng tu' + NCHAR(0x1EA7) + N'n.'
        ELSE NULL
    END
FROM WeeklyReports wr
JOIN Internships i ON i.InternshipId = wr.InternshipId
JOIN Lecturers l ON l.LecturerId = i.LecturerId
JOIN Users u ON u.UserId = l.UserId
WHERE LOWER(u.Email) = 'htbin2806@gmail.com' AND wr.IsDeleted = 0;

UPDATE f
SET f.Comment = N'Ti' + NCHAR(0x1EBF) + N'n ' + NCHAR(0x0111) + NCHAR(0x1ED9) + N' t' + NCHAR(0x1ED1) + N't. C' + NCHAR(0x1EA7) + N'n b' + NCHAR(0x1ED5) + N'sung th' + NCHAR(0x00EA) + N'm minh ch' + NCHAR(0x1EE9) + N'ng cho tu' + NCHAR(0x1EA7) + N'n sau.'
FROM Feedbacks f
JOIN WeeklyReports wr ON wr.WeeklyReportId = f.WeeklyReportId
JOIN Internships i ON i.InternshipId = wr.InternshipId
JOIN Lecturers l ON l.LecturerId = i.LecturerId
JOIN Users u ON u.UserId = l.UserId
WHERE LOWER(u.Email) = 'htbin2806@gmail.com' AND f.IsDeleted = 0;

-- Add final evaluations for the demo pair in completed semesters.
INSERT INTO Evaluations (EvaluationId, InternshipId, EvaluatedById, TechnicalScore, CommunicationScore, TeamworkScore, InitiativeScore, FinalGrade, Comments, Strengths, AreasForImprovement, EvaluatedAt, IsFinalized, DefenseStatus, CreatedAt, IsDeleted)
SELECT NEWID(), i.InternshipId, @lecturerUserId, 9, 8, 9, 8, 8.50,
       N'Hoàn thành tốt kỳ thực tập.', N'Chủ động, phối hợp tốt với doanh nghiệp.', N'Cần trình bày kết quả kỹ thuật sâu hơn.', @now, 1, 0, @now, 0
FROM Internships i
WHERE i.StudentId = @studentId AND i.Status IN (5, 6) AND i.IsDeleted = 0
  AND NOT EXISTS (SELECT 1 FROM Evaluations e WHERE e.InternshipId = i.InternshipId AND e.IsDeleted = 0);

COMMIT;

SELECT 'Users' AS TableName, COUNT(*) AS Total FROM Users WHERE IsDeleted = 0
UNION ALL SELECT 'Semesters', COUNT(*) FROM Semesters WHERE IsDeleted = 0
UNION ALL SELECT 'Students', COUNT(*) FROM Students WHERE IsDeleted = 0
UNION ALL SELECT 'Lecturers', COUNT(*) FROM Lecturers WHERE IsDeleted = 0
UNION ALL SELECT 'Companies', COUNT(*) FROM Companies WHERE IsDeleted = 0
UNION ALL SELECT 'Internships', COUNT(*) FROM Internships WHERE IsDeleted = 0
UNION ALL SELECT 'WeeklyReports', COUNT(*) FROM WeeklyReports WHERE IsDeleted = 0
UNION ALL SELECT 'Feedbacks', COUNT(*) FROM Feedbacks WHERE IsDeleted = 0
UNION ALL SELECT 'Evaluations', COUNT(*) FROM Evaluations WHERE IsDeleted = 0;

SELECT sem.Name, COUNT(i.InternshipId) AS InternshipCount
FROM Semesters sem
LEFT JOIN Internships i ON i.SemesterId = sem.SemesterId AND i.IsDeleted = 0
WHERE sem.IsDeleted = 0
GROUP BY sem.Name
ORDER BY sem.Name;

SELECT su.Email AS StudentEmail, lu.Email AS LecturerEmail, sem.Name AS SemesterName, c.CompanyName, i.Status
FROM Internships i
JOIN Students s ON s.StudentId = i.StudentId
JOIN Users su ON su.UserId = s.UserId
LEFT JOIN Lecturers l ON l.LecturerId = i.LecturerId
LEFT JOIN Users lu ON lu.UserId = l.UserId
JOIN Semesters sem ON sem.SemesterId = i.SemesterId
LEFT JOIN Companies c ON c.CompanyId = i.CompanyId
WHERE LOWER(su.Email) = 'thachhien2000@gmail.com'
ORDER BY sem.StartDate;
