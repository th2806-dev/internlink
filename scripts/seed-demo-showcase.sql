-- InternLink Demo Seed: Showcase data for 3 linked accounts:
-- Lecturer: tqcuong@hcmct.edu.vn
-- Student:  2421160052 (Thạch Hiền)
-- Admin:    admin-cntt (Khoa CNTT)
--
-- Safe, idempotent, non-destructive to existing system credentials and settings.
SET XACT_ABORT ON;
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRAN;

DECLARE @now datetime2 = SYSUTCDATETIME();
DECLARE @semesterId uniqueidentifier = '57654669-2532-4CD3-85A6-3634EA0AD2C0';
DECLARE @lecturerUserId uniqueidentifier;
DECLARE @lecturerId uniqueidentifier;
DECLARE @studentUserId uniqueidentifier;
DECLARE @studentId uniqueidentifier;
DECLARE @studentInternshipId uniqueidentifier;
DECLARE @cnttDeptId uniqueidentifier;

-- 1. Resolve Demo Accounts
SELECT @lecturerUserId = u.UserId, @lecturerId = l.LecturerId
FROM Users u
JOIN Lecturers l ON l.UserId = u.UserId
WHERE u.IsDeleted = 0 AND (LOWER(u.Email) = 'tqcuong@hcmct.edu.vn' OR u.Username = 'tqcuong@hcmct.edu.vn');

SELECT @studentUserId = u.UserId, @studentId = s.StudentId
FROM Users u
JOIN Students s ON s.UserId = u.UserId
WHERE u.IsDeleted = 0 AND (u.Username = '2421160052' OR s.StudentCode = '2421160052');

SELECT @cnttDeptId = DepartmentId FROM Departments WHERE Name LIKE N'%Công nghệ thông tin%' AND IsDeleted = 0;

IF @lecturerId IS NULL OR @studentId IS NULL
    THROW 51001, 'Required demo accounts (tqcuong@hcmct.edu.vn, 2421160052) not found.', 1;

-- 2. Find or Set Active Internship for Student 2421160052
SELECT @studentInternshipId = InternshipId
FROM Internships
WHERE StudentId = @studentId AND SemesterId = @semesterId AND IsDeleted = 0;

IF @studentInternshipId IS NULL
BEGIN
    SELECT TOP 1 @studentInternshipId = InternshipId
    FROM Internships
    WHERE StudentId = @studentId AND IsDeleted = 0;
END;

-- Ensure student is assigned to lecturer tqcuong and in active semester
IF @studentInternshipId IS NOT NULL
BEGIN
    UPDATE Internships
    SET LecturerId = @lecturerId,
        SemesterId = @semesterId,
        Status = 1 -- InProgress
    WHERE InternshipId = @studentInternshipId;
END;

-- 3. Ensure Past Semester for Admin Dashboard Comparison
IF NOT EXISTS (SELECT 1 FROM Semesters WHERE SemesterId = '11111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO Semesters (SemesterId, Name, Term, AcademicYear, StartDate, EndDate, Status, Description, MaxStudentsPerLecturer, DepartmentId, CreatedAt, IsDeleted)
    VALUES ('11111111-1111-1111-1111-111111111111', N'Thực tập Tốt nghiệp K20 (2025 - 2026)', N'Học kỳ I', N'2025 - 2026', DATEADD(YEAR, -1, @now), DATEADD(MONTH, -8, @now), 2, N'Kỳ đã hoàn tất tổng kết.', 30, @cnttDeptId, @now, 0);
END;

-- 4. Seed Rich Weekly Reports for all 8 students under lecturer tqcuong
-- First, list the other students in this lecturer group
DECLARE @otherInternships TABLE (
    Rn int IDENTITY(1,1),
    InternshipId uniqueidentifier,
    StudentId uniqueidentifier,
    FullName nvarchar(200)
);

INSERT INTO @otherInternships (InternshipId, StudentId, FullName)
SELECT i.InternshipId, i.StudentId, s.FullName
FROM Internships i
JOIN Students s ON s.StudentId = i.StudentId
WHERE i.SemesterId = @semesterId AND i.LecturerId = @lecturerId AND i.StudentId <> @studentId AND i.IsDeleted = 0;

-- 4.1 Tuần 1: Tạo báo cáo tuần 1 cho sinh viên Thạch Hiền và các bạn
IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @studentInternshipId AND WeekNumber = 1 AND IsDeleted = 0)
BEGIN
    INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
    VALUES (NEWID(), @studentInternshipId, 1, 1, N'Báo cáo tuần 1 - Tiếp nhận vị trí thực tập và khảo sát hệ thống', N'Đã làm quen với môi trường doanh nghiệp, tiếp nhận tài liệu kiến trúc hệ thống và cài đặt môi trường phát triển.', 4, DATEADD(DAY, -25, @now), N'Khởi đầu tốt, hãy bám sát hướng dẫn của mentor tại doanh nghiệp.', DATEADD(DAY, -25, @now), 0);
END;

-- 4.2 Tuần 2, 3, 4, 5 cho các bạn khác trong nhóm để biểu đồ cột lên dày dặn
-- Sinh viên 1: Trần Trọng Nghĩa (2421160010)
DECLARE @i1 uniqueidentifier;
SELECT @i1 = InternshipId FROM @otherInternships WHERE Rn = 1;
IF @i1 IS NOT NULL
BEGIN
    -- Tuần 2: Nộp đúng hạn, Đã duyệt
    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i1 AND WeekNumber = 2 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i1, 2, 1, N'Báo cáo tuần 2 - Thiết kế cơ sở dữ liệu', N'Hoàn thành thiết kế ERD và viết script migration cho module quản lý đơn hàng.', 4, '2026-10-09 14:00:00', N'Cơ sở dữ liệu thiết kế chuẩn chỉ.', '2026-10-09 14:00:00', 0);

    -- Tuần 3: Nộp đúng hạn, Đã duyệt
    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i1 AND WeekNumber = 3 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i1, 3, 1, N'Báo cáo tuần 3 - Xây dựng RESTful API', N'Xây dựng 8 endpoints cho module người dùng và phân quyền JWT.', 4, '2026-10-15 10:00:00', N'Tiến độ tốt, cần chú ý validation request.', '2026-10-15 10:00:00', 0);

    -- Tuần 4: Nộp đúng hạn, Đã duyệt
    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i1 AND WeekNumber = 4 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i1, 4, 1, N'Báo cáo tuần 4 - Tích hợp cổng thanh toán', N'Tích hợp VNPay sandbox và xử lý IPN callback.', 4, '2026-10-14 09:30:00', N'Xử lý bảo mật callback tốt.', '2026-10-14 09:30:00', 0);

    -- Tuần 5: Nộp sớm, Chờ duyệt
    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i1 AND WeekNumber = 5 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i1, 5, 1, N'Báo cáo tuần 5 - Viết Unit Test và tài liệu Swagger', N'Đạt 85% code coverage với xUnit cho service layer.', 1, DATEADD(HOUR, -2, @now), DATEADD(HOUR, -2, @now), 0);
END;

-- Sinh viên 2: Nguyễn Hữu Duy Thông (2421160047)
DECLARE @i2 uniqueidentifier;
SELECT @i2 = InternshipId FROM @otherInternships WHERE Rn = 2;
IF @i2 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i2 AND WeekNumber = 2 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i2, 2, 1, N'Báo cáo tuần 2 - Lập trình vi điều khiển ESP32', N'Kết nối cảm biến nhiệt độ DHT22 và truyền tin qua MQTT.', 4, '2026-10-10 11:20:00', N'Phần cứng hoạt động ổn định.', '2026-10-10 11:20:00', 0);

    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i2 AND WeekNumber = 3 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i2, 3, 1, N'Báo cáo tuần 3 - Thiết kế mạch in PCB', N'Sử dụng Altium Designer vẽ mạch 2 lớp cho gateway IoT.', 4, '2026-10-16 08:45:00', N'Bố trí linh kiện hợp lý.', '2026-10-16 08:45:00', 0);

    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i2 AND WeekNumber = 4 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i2, 4, 1, N'Báo cáo tuần 4 - Triển khai Firmware OTA', N'Tích hợp tính năng cập nhật firmware từ xa qua server HTTPS.', 4, '2026-10-15 16:15:00', N'Đã duyệt, cơ chế phục hồi khi lỗi tốt.', '2026-10-15 16:15:00', 0);

    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i2 AND WeekNumber = 5 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i2, 5, 1, N'Báo cáo tuần 5 - Thử nghiệm đóng gói sản phẩm IoT', N'Chạy thử nghiệm độ bền trong buồng nhiệt 48 giờ.', 1, DATEADD(HOUR, -5, @now), DATEADD(HOUR, -5, @now), 0);
END;

-- Sinh viên 3: Nguyễn Hoàng Trung Lập (2421160011)
DECLARE @i3 uniqueidentifier;
SELECT @i3 = InternshipId FROM @otherInternships WHERE Rn = 3;
IF @i3 IS NOT NULL
BEGIN
    -- Tuần 2: Nộp trễ (12/10 sau hạn 11/10), Đã duyệt -> Thử thách cho biểu đồ (cột cam nộp trễ)
    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i3 AND WeekNumber = 2 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i3, 2, 1, N'Báo cáo tuần 2 - Tìm hiểu quy trình CI/CD', N'Cấu hình GitHub Actions tự động build Docker image.', 4, '2026-10-12 10:00:00', N'Nhắc nhở nộp đúng hạn vào tuần sau.', '2026-10-12 10:00:00', 0);

    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i3 AND WeekNumber = 3 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i3, 3, 1, N'Báo cáo tuần 3 - Triển khai cụm Kubernetes', N'Cài đặt K3s trên 3 node server nội bộ.', 4, '2026-10-14 17:00:00', N'Đã nộp đúng hạn, cấu hình ingress tốt.', '2026-10-14 17:00:00', 0);

    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i3 AND WeekNumber = 4 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i3, 4, 1, N'Báo cáo tuần 4 - Giám sát hệ thống với Prometheus & Grafana', N'Xây dựng dashboard theo dõi CPU, RAM, Network traffic.', 1, DATEADD(DAY, -1, @now), DATEADD(DAY, -1, @now), 0);
END;

-- Sinh viên 4: Nguyễn Bùi Trọng Tú (2421160016)
DECLARE @i4 uniqueidentifier;
SELECT @i4 = InternshipId FROM @otherInternships WHERE Rn = 4;
IF @i4 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i4 AND WeekNumber = 2 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i4, 2, 1, N'Báo cáo tuần 2 - Lên kịch bản truyền thông kỹ thuật số', N'Phân tích đối tượng mục tiêu và xây dựng content calendar tháng 10.', 4, '2026-10-08 15:00:00', N'Kế hoạch bài bản.', '2026-10-08 15:00:00', 0);

    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i4 AND WeekNumber = 3 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i4, 3, 1, N'Báo cáo tuần 3 - Chạy chiến dịch Marketing Facebook & Google Ads', N'Tối ưu CPC và đo lường conversion rate trên landing page.', 4, '2026-10-13 14:30:00', N'Số liệu phân tích rõ ràng.', '2026-10-13 14:30:00', 0);

    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i4 AND WeekNumber = 4 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i4, 4, 1, N'Báo cáo tuần 4 - Sản xuất video ngắn quảng bá dịch vụ', N'Quay và dựng 4 video ngắn đạt hơn 50.000 lượt tương tác.', 4, '2026-10-15 11:00:00', N'Sáng tạo, nội dung thu hút.', '2026-10-15 11:00:00', 0);
END;

-- Sinh viên 5: Phạm Thanh Huyền (2421160036)
DECLARE @i5 uniqueidentifier;
SELECT @i5 = InternshipId FROM @otherInternships WHERE Rn = 5;
IF @i5 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i5 AND WeekNumber = 2 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i5, 2, 1, N'Báo cáo tuần 2 - Phân tích yêu cầu phần mềm CRM', N'Phỏng vấn các phòng ban và hoàn thành đặc tả Use Case.', 4, '2026-10-09 16:30:00', N'Đặc tả chặt chẽ.', '2026-10-09 16:30:00', 0);

    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i5 AND WeekNumber = 3 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i5, 3, 1, N'Báo cáo tuần 3 - Thiết kế giao diện UI/UX Figma', N'Hoàn thành bộ UI Kit và Prototype luồng quản lý khách hàng.', 4, '2026-10-14 11:20:00', N'Giao diện trực quan, đồng bộ nhận diện.', '2026-10-14 11:20:00', 0);

    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i5 AND WeekNumber = 4 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i5, 4, 1, N'Báo cáo tuần 4 - Kiểm thử người dùng Usability Testing', N'Tiến hành test luồng tương tác trên 10 người dùng nội bộ.', 1, DATEADD(HOUR, -12, @now), DATEADD(HOUR, -12, @now), 0);
END;

-- Sinh viên 6: Nguyễn Ngọc Minh Quân (2421160001)
DECLARE @i6 uniqueidentifier;
SELECT @i6 = InternshipId FROM @otherInternships WHERE Rn = 6;
IF @i6 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i6 AND WeekNumber = 2 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i6, 2, 1, N'Báo cáo tuần 2 - Cài đặt hệ thống mạng văn phòng', N'Bấm dây mạng CAT6, cấu hình VLAN và cấp phát IP qua DHCP Server.', 4, '2026-10-10 09:10:00', N'Kỹ năng thực hành tốt.', '2026-10-10 09:10:00', 0);

    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i6 AND WeekNumber = 3 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i6, 3, 1, N'Báo cáo tuần 3 - Thiết lập Firewall Fortinet', N'Cấu hình chính sách bảo mật mạng và kiểm soát truy cập trang web.', 1, '2026-10-16 11:00:00', '2026-10-16 11:00:00', 0);

    IF NOT EXISTS (SELECT 1 FROM WeeklyReports WHERE InternshipId = @i6 AND WeekNumber = 4 AND IsDeleted = 0)
        INSERT INTO WeeklyReports (WeeklyReportId, InternshipId, WeekNumber, Version, Title, Content, Status, SubmittedAt, LecturerComment, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i6, 4, 1, N'Báo cáo tuần 4 - Cấu hình VPN Site-to-Site', N'Kết nối an toàn giữa chi nhánh và trụ sở chính qua giao thức IPsec.', 4, '2026-10-15 15:40:00', N'VPN truyền dữ liệu mượt mà, latency thấp.', '2026-10-15 15:40:00', 0);
END;

-- 5. Submissions Đa Dạng (Báo cáo cuối kỳ, Sản phẩm sáng tạo, Đánh giá doanh nghiệp)
-- Thạch Hiền (2421160052)
IF NOT EXISTS (SELECT 1 FROM Submissions WHERE InternshipId = @studentInternshipId AND Type = 2 AND IsDeleted = 0)
    INSERT INTO Submissions (SubmissionId, InternshipId, Type, Status, Version, Title, Description, FileName, SubmittedAt, CreatedAt, IsDeleted)
    VALUES (NEWID(), @studentInternshipId, 2, 0, 1, N'Báo cáo thực tập tốt nghiệp toàn văn', N'Tài liệu hoàn chỉnh gồm 5 chương trình bày về kiến trúc và hiện thực giải pháp.', N'BaoCaoTotNghiep_ThachHien_2421160052.pdf', DATEADD(HOUR, -3, @now), DATEADD(HOUR, -3, @now), 0);

IF NOT EXISTS (SELECT 1 FROM Submissions WHERE InternshipId = @studentInternshipId AND Type = 3 AND IsDeleted = 0)
    INSERT INTO Submissions (SubmissionId, InternshipId, Type, Status, Version, Title, Description, FileName, SubmittedAt, CreatedAt, IsDeleted)
    VALUES (NEWID(), @studentInternshipId, 3, 3, 1, N'Hệ thống quản lý thực tập thông minh InternLink', N'Ứng dụng web tối ưu hóa việc giám sát và đánh giá thực tập.', N'SanPhamSangTao_InternLink.zip', DATEADD(DAY, -2, @now), DATEADD(DAY, -2, @now), 0);

IF NOT EXISTS (SELECT 1 FROM Submissions WHERE InternshipId = @studentInternshipId AND Type = 4 AND IsDeleted = 0)
    INSERT INTO Submissions (SubmissionId, InternshipId, Type, Status, Version, Title, Description, FileName, EmployerScore, SubmittedAt, CreatedAt, IsDeleted)
    VALUES (NEWID(), @studentInternshipId, 4, 3, 1, N'Phiếu đánh giá quá trình thực tập của doanh nghiệp', N'Đánh giá xếp loại Xuất sắc từ Mentor doanh nghiệp Tiên Khanh.', N'DanhGiaDoanhNghiep_TienKhanh_ThachHien.pdf', 9.5, DATEADD(DAY, -1, @now), DATEADD(DAY, -1, @now), 0);

-- Thêm submissions cho các bạn khác để danh sách "Bài nộp mới nhất" phong phú
IF @i1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Submissions WHERE InternshipId = @i1 AND Type = 3 AND IsDeleted = 0)
    INSERT INTO Submissions (SubmissionId, InternshipId, Type, Status, Version, Title, Description, FileName, SubmittedAt, CreatedAt, IsDeleted)
    VALUES (NEWID(), @i1, 3, 0, 1, N'Phần mềm Quản lý Kho hàng Thông minh', N'Sản phẩm mã nguồn mở viết bằng .NET & React.', N'KhoHangThongMinh_TranTrongNghia.zip', DATEADD(HOUR, -1, @now), DATEADD(HOUR, -1, @now), 0);

IF @i4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Submissions WHERE InternshipId = @i4 AND Type = 4 AND IsDeleted = 0)
    INSERT INTO Submissions (SubmissionId, InternshipId, Type, Status, Version, Title, Description, FileName, EmployerScore, SubmittedAt, CreatedAt, IsDeleted)
    VALUES (NEWID(), @i4, 4, 3, 1, N'Bản nhận xét thực tập sinh phòng Marketing', N'Đánh giá từ Trưởng phòng truyền thông Bright Star.', N'DanhGia_BrightStar_TrongTu.pdf', 9.0, DATEADD(DAY, -2, @now), DATEADD(DAY, -2, @now), 0);

-- 6. Evaluations: Bảng điểm, Nhận xét & Điểm Rubric hàng tuần cho Sinh viên & Nhóm
-- 6. Evaluations: Bảng điểm, Nhận xét & Điểm Rubric hàng tuần cho Sinh viên & Nhóm
-- Lưu ý: Backend yêu cầu điểm rubric tuần phải đúng một trong các mốc: 1.0, 2.0, 3.5, 4.0, 5.0

-- Thạch Hiền (2421160052): Điểm cao xuất sắc (Thang 5: 5.0, 4.0)
IF NOT EXISTS (SELECT 1 FROM Evaluations WHERE InternshipId = @studentInternshipId AND IsDeleted = 0)
BEGIN
    INSERT INTO Evaluations (
        EvaluationId, InternshipId, EvaluatedById, TechnicalScore, CommunicationScore,
        TeamworkScore, InitiativeScore, FinalGrade, Comments, Strengths, AreasForImprovement,
        EvaluatedAt, IsFinalized, HasCreativeProduct, OralExamScore, QualityLevel, WeeklyQualityJson, CreatedAt, IsDeleted
    ) VALUES (
        NEWID(), @studentInternshipId, @lecturerUserId, 10, 9, 9, 10, 9.20,
        N'Sinh viên thể hiện xuất sắc trong suốt kỳ thực tập. Tinh thần trách nhiệm cao, chủ động giải quyết bài toán phức tạp.',
        N'Kỹ năng lập trình kiến trúc phân tán rất tốt, tư duy logic nhạy bén.',
        N'Tiếp tục phát huy thế mạnh và mở rộng thêm kiến thức về an toàn thông tin.',
        DATEADD(DAY, -1, @now), 1, 1, 9.50, 5.0,
        N'{"1":5.0,"2":5.0,"3":4.0,"4":5.0,"5":5.0}',
        @now, 0
    );
END
ELSE
BEGIN
    UPDATE Evaluations
    SET TechnicalScore = 10, CommunicationScore = 9, TeamworkScore = 9, InitiativeScore = 10,
        FinalGrade = 9.20, QualityLevel = 5.0, WeeklyQualityJson = N'{"1":5.0,"2":5.0,"3":4.0,"4":5.0,"5":5.0}',
        Comments = N'Sinh viên thể hiện xuất sắc trong suốt kỳ thực tập. Tinh thần trách nhiệm cao, chủ động giải quyết bài toán phức tạp.',
        IsFinalized = 1
    WHERE InternshipId = @studentInternshipId;
END;

-- Tạo và cập nhật evaluation cho các bạn khác trong nhóm để điểm trung bình nhóm hiển thị đầy đủ trên chart
IF @i1 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Evaluations WHERE InternshipId = @i1 AND IsDeleted = 0)
        INSERT INTO Evaluations (EvaluationId, InternshipId, EvaluatedById, TechnicalScore, CommunicationScore, TeamworkScore, InitiativeScore, FinalGrade, QualityLevel, WeeklyQualityJson, IsFinalized, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i1, @lecturerUserId, 8, 8, 8, 8, 8.0, 4.0, N'{"1":4.0,"2":4.0,"3":3.5,"4":4.0,"5":4.0,"6":4.0}', 1, @now, 0);
    ELSE
        UPDATE Evaluations SET WeeklyQualityJson = N'{"1":4.0,"2":4.0,"3":3.5,"4":4.0,"5":4.0,"6":4.0}' WHERE InternshipId = @i1;
END;

IF @i2 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Evaluations WHERE InternshipId = @i2 AND IsDeleted = 0)
        INSERT INTO Evaluations (EvaluationId, InternshipId, EvaluatedById, TechnicalScore, CommunicationScore, TeamworkScore, InitiativeScore, FinalGrade, QualityLevel, WeeklyQualityJson, IsFinalized, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i2, @lecturerUserId, 9, 8, 8, 9, 8.5, 4.0, N'{"1":4.0,"2":4.0,"3":4.0,"4":5.0,"5":4.0,"6":4.0}', 1, @now, 0);
    ELSE
        UPDATE Evaluations SET WeeklyQualityJson = N'{"1":4.0,"2":4.0,"3":4.0,"4":5.0,"5":4.0,"6":4.0}' WHERE InternshipId = @i2;
END;

IF @i3 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Evaluations WHERE InternshipId = @i3 AND IsDeleted = 0)
        INSERT INTO Evaluations (EvaluationId, InternshipId, EvaluatedById, TechnicalScore, CommunicationScore, TeamworkScore, InitiativeScore, FinalGrade, QualityLevel, WeeklyQualityJson, IsFinalized, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i3, @lecturerUserId, 8, 8, 8, 8, 7.8, 3.5, N'{"1":3.5,"2":3.5,"3":4.0,"4":3.5,"5":4.0,"6":3.5}', 1, @now, 0);
    ELSE
        UPDATE Evaluations SET WeeklyQualityJson = N'{"1":3.5,"2":3.5,"3":4.0,"4":3.5,"5":4.0,"6":3.5}' WHERE InternshipId = @i3;
END;

IF @i4 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Evaluations WHERE InternshipId = @i4 AND IsDeleted = 0)
        INSERT INTO Evaluations (EvaluationId, InternshipId, EvaluatedById, TechnicalScore, CommunicationScore, TeamworkScore, InitiativeScore, FinalGrade, QualityLevel, WeeklyQualityJson, IsFinalized, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i4, @lecturerUserId, 8, 9, 9, 8, 8.5, 4.0, N'{"1":4.0,"2":4.0,"3":4.0,"4":4.0,"5":3.5,"6":4.0}', 1, @now, 0);
    ELSE
        UPDATE Evaluations SET WeeklyQualityJson = N'{"1":4.0,"2":4.0,"3":4.0,"4":4.0,"5":3.5,"6":4.0}' WHERE InternshipId = @i4;
END;

IF @i5 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Evaluations WHERE InternshipId = @i5 AND IsDeleted = 0)
        INSERT INTO Evaluations (EvaluationId, InternshipId, EvaluatedById, TechnicalScore, CommunicationScore, TeamworkScore, InitiativeScore, FinalGrade, QualityLevel, WeeklyQualityJson, IsFinalized, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i5, @lecturerUserId, 9, 9, 9, 9, 8.8, 4.0, N'{"1":4.0,"2":4.0,"3":4.0,"4":4.0,"5":4.0,"6":4.0}', 1, @now, 0);
    ELSE
        UPDATE Evaluations SET WeeklyQualityJson = N'{"1":4.0,"2":4.0,"3":4.0,"4":4.0,"5":4.0,"6":4.0}' WHERE InternshipId = @i5;
END;

IF @i6 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Evaluations WHERE InternshipId = @i6 AND IsDeleted = 0)
        INSERT INTO Evaluations (EvaluationId, InternshipId, EvaluatedById, TechnicalScore, CommunicationScore, TeamworkScore, InitiativeScore, FinalGrade, QualityLevel, WeeklyQualityJson, IsFinalized, CreatedAt, IsDeleted)
        VALUES (NEWID(), @i6, @lecturerUserId, 8, 8, 8, 8, 8.0, 4.0, N'{"1":3.5,"2":4.0,"3":3.5,"4":4.0,"5":4.0,"6":3.5}', 1, @now, 0);
    ELSE
        UPDATE Evaluations SET WeeklyQualityJson = N'{"1":3.5,"2":4.0,"3":3.5,"4":4.0,"5":4.0,"6":3.5}' WHERE InternshipId = @i6;
END;

COMMIT;

-- Kết quả kiểm tra tổng quan sau khi seed
SELECT 'WeeklyReports (Lecturer Group)' AS Metric, COUNT(*) AS Total FROM WeeklyReports wr JOIN Internships i ON i.InternshipId = wr.InternshipId WHERE i.SemesterId = '57654669-2532-4CD3-85A6-3634EA0AD2C0' AND i.LecturerId = @lecturerId AND wr.IsDeleted = 0
UNION ALL SELECT 'Submissions (Lecturer Group)', COUNT(*) FROM Submissions s JOIN Internships i ON i.InternshipId = s.InternshipId WHERE i.SemesterId = '57654669-2532-4CD3-85A6-3634EA0AD2C0' AND i.LecturerId = @lecturerId AND s.IsDeleted = 0
UNION ALL SELECT 'Evaluations (Lecturer Group)', COUNT(*) FROM Evaluations e JOIN Internships i ON i.InternshipId = e.InternshipId WHERE i.SemesterId = '57654669-2532-4CD3-85A6-3634EA0AD2C0' AND i.LecturerId = @lecturerId AND e.IsDeleted = 0;
