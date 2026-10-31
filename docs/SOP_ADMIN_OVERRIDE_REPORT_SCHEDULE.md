# QUY TRÌNH CAN THIỆP ADMIN: CẤU HÌNH & MỞ DEADLINE BÁO CÁO TUẦN (SOP)

> **Mục đích:** Tài liệu hướng dẫn thao tác trực tiếp trên máy chủ Production (AWS EC2 / Windows Server) để can thiệp cấu hình, gia hạn hoặc mở deadline báo cáo tuần cho sinh viên / giảng viên trong trường hợp giảng viên chưa kịp cấu hình hoặc cần xử lý khẩn cấp.  
> **Người thực hiện:** Tech Lead / DevOps Engineer / System Administrator.

---

## 1. NGUYÊN TẮC HỆ THỐNG & LƯU Ý SỐNG CÒN

1. **Kiến trúc Lịch Báo cáo (SemesterReportSchedules):**
   - Hệ thống hỗ trợ 2 tầng lịch:
     - **Lịch chung cấp Khoa:** `LecturerId = NULL` (áp dụng cho tất cả sinh viên chưa có lịch riêng).
     - **Lịch riêng của Giảng viên (Override):** `LecturerId = <ID_GIẢNG_VIÊN>`. Khi sinh viên truy cập, hệ thống ưu tiên lấy lịch riêng của giảng viên hướng dẫn.
2. **Quy tắc Múi Giờ (Timezone UTC vs GMT+7):**
   - **Database lưu trữ 100% theo giờ UTC (`DateTime.UtcNow`).**
   - **Frontend trình duyệt hiển thị theo giờ Việt Nam (GMT+7).**
   - **Công thức quy đổi bắt buộc:**
     $$\text{Giờ lưu DB (UTC)} = \text{Giờ Việt Nam (GMT+7)} - 7 \text{ giờ}$$
     - *Ví dụ 1:* Muốn mở lúc **07:00 AM ngày 02/11/2026** $\rightarrow$ Lưu DB: `'2026-11-02 00:00:00.000'`.
     - *Ví dụ 2:* Muốn hạn chót là **08:59 PM (20:59) ngày 05/11/2026** $\rightarrow$ Lưu DB: `'2026-11-05 13:59:00.000'`.
3. **Kết nối SQL trên EC2:**
   - SQL Server trên EC2 là instance `.\SQLEXPRESS`.
   - Kết nối qua PowerShell dùng cờ `-E` (Trusted Windows Authentication của Administrator) và cờ `-I` (Quoted Identifier).

---

## 2. QUY TRÌNH THỰC HIỆN TỪNG BƯỚC (POWERSHELL SCRIPTS)

### BƯỚC 1: Kiểm tra thông tin Giảng viên & Học kỳ

Mở **PowerShell (Run as Administrator)** trên máy chủ EC2 và chạy lệnh sau để lấy chính xác `LecturerId` và `SemesterId`:

```powershell
$checkQuery = @"
SET NOCOUNT ON;
SELECT 
    l.LecturerId, 
    l.FullName, 
    l.Email, 
    s.SemesterId, 
    s.Name AS SemesterName, 
    COUNT(i.InternshipId) AS TotalStudents
FROM Lecturers l
JOIN Internships i ON l.LecturerId = i.LecturerId
JOIN Semesters s ON i.SemesterId = s.SemesterId
WHERE l.Email LIKE '%ntthanh%' AND i.IsDeleted = 0
GROUP BY l.LecturerId, l.FullName, l.Email, s.SemesterId, s.Name;
"@

sqlcmd -S .\SQLEXPRESS -E -d InternLink -I -Q $checkQuery
```

---

### BƯỚC 2: Kiểm tra lịch các tuần hiện có của Giảng viên

```powershell
$viewSchedule = @"
SET NOCOUNT ON;
SELECT 
    WeekNumber,
    Title,
    CASE WHEN IsSubmissionOpen = 1 THEN N'ĐANG MỞ (Open)' ELSE N'ĐANG KHÓA (Closed)' END AS Status,
    StartDate,
    DueDate
FROM SemesterReportSchedules
WHERE SemesterId = '57654669-2532-4CD3-85A6-3634EA0AD2C0' 
  AND LecturerId = 'D6C40A2C-3666-48E3-98E6-33A676A91AEA'
  AND IsDeleted = 0
ORDER BY WeekNumber;
"@

sqlcmd -S .\SQLEXPRESS -E -d InternLink -I -Q $viewSchedule
```

---

### BƯỚC 3: Mở hoặc Tạo mới Deadline tuần (Upsert An Toàn)

Script dưới đây tự động kiểm tra:
- Nếu tuần đó **đã tồn tại** $\rightarrow$ Cập nhật `IsSubmissionOpen = 1` và gia hạn thời gian.
- Nếu tuần đó **chưa tồn tại** $\rightarrow$ Tự động tạo mới bản ghi cho Giảng viên.

> ⚠️ **Chú ý:** Thay đổi `@WeekNumber`, `@StartDateUTC`, và `@DueDateUTC` theo nhu cầu thực tế.

```powershell
$openScheduleScript = @"
SET NOCOUNT ON;
DECLARE @SemesterId UNIQUEIDENTIFIER = '57654669-2532-4CD3-85A6-3634EA0AD2C0'; -- Thay ID học kỳ
DECLARE @LecturerEmail NVARCHAR(100) = 'ntthanh@hcmct.edu.vn';                  -- Thay Email GV
DECLARE @WeekNumber INT = 6;                                                    -- Tuần cần mở

-- THỜI GIAN THEO GIỜ UTC (Đã trừ 7 tiếng từ giờ VN)
-- Muốn mở: 07:00 02/11/2026 VN -> UTC: 2026-11-02 00:00:00
DECLARE @StartDateUTC DATETIME = '2026-11-02 00:00:00.000';
-- Muốn hạn: 20:59 05/11/2026 VN -> UTC: 2026-11-05 13:59:00
DECLARE @DueDateUTC DATETIME   = '2026-11-05 13:59:00.000';

DECLARE @LecturerId UNIQUEIDENTIFIER;
SELECT @LecturerId = LecturerId FROM Lecturers WHERE Email = @LecturerEmail;

IF @LecturerId IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM SemesterReportSchedules WHERE SemesterId = @SemesterId AND LecturerId = @LecturerId AND WeekNumber = @WeekNumber)
    BEGIN
        -- Đã có bản ghi -> Cập nhật
        UPDATE SemesterReportSchedules
        SET StartDate = @StartDateUTC,
            DueDate = @DueDateUTC,
            IsSubmissionOpen = 1,
            AllowLateSubmission = 1,
            UpdatedAt = GETUTCDATE()
        WHERE SemesterId = @SemesterId AND LecturerId = @LecturerId AND WeekNumber = @WeekNumber;
        
        PRINT N'Thành công: Đã cập nhật gia hạn và mở deadline Tuần ' + CAST(@WeekNumber AS NVARCHAR) + N' cho GV: ' + @LecturerEmail;
    END
    ELSE
    BEGIN
        -- Chưa có bản ghi -> Thêm mới
        INSERT INTO SemesterReportSchedules (
            SemesterReportScheduleId, SemesterId, LecturerId, WeekNumber, Title, 
            StartDate, DueDate, IsSubmissionOpen, AllowLateSubmission, Description, 
            CreatedAt, UpdatedAt, IsDeleted
        ) VALUES (
            NEWID(), @SemesterId, @LecturerId, @WeekNumber, N'Báo cáo tuần ' + CAST(@WeekNumber AS NVARCHAR), 
            @StartDateUTC, @DueDateUTC, 1, 1, N'Báo cáo tuần ' + CAST(@WeekNumber AS NVARCHAR), 
            GETUTCDATE(), GETUTCDATE(), 0
        );
        
        PRINT N'Thành công: Đã tạo mới và mở deadline Tuần ' + CAST(@WeekNumber AS NVARCHAR) + N' cho GV: ' + @LecturerEmail;
    END
END
ELSE
BEGIN
    PRINT N'Lỗi: Không tìm thấy giảng viên có email ' + @LecturerEmail;
END
"@

sqlcmd -S .\SQLEXPRESS -E -d InternLink -I -Q $openScheduleScript
```

---

### BƯỚC 4: Kiểm tra xác nhận tiến độ nộp bài của Sinh viên

Chạy lệnh này để xem danh sách sinh viên đã nộp bài vào tuần đó chưa:

```powershell
$verifyStudents = @"
SET NOCOUNT ON;
SELECT 
    st.StudentCode, 
    st.FullName, 
    ISNULL(CONVERT(VARCHAR(20), DATEADD(HOUR, 7, wr.SubmittedAt), 120), N'Chưa nộp') AS NopLuc_GioVN,
    ISNULL(wr.Status, N'no_submission') AS TrangThai
FROM Internships i
JOIN Students st ON i.StudentId = st.StudentId
JOIN Lecturers l ON i.LecturerId = l.LecturerId
LEFT JOIN WeeklyReports wr ON wr.InternshipId = i.InternshipId AND wr.WeekNumber = 6 AND wr.IsDeleted = 0
WHERE l.Email LIKE '%ntthanh%' AND i.IsDeleted = 0;
"@

sqlcmd -S .\SQLEXPRESS -E -d InternLink -I -Q $verifyStudents
```

---

## 3. BẢNG TRA CỨU NHANH QUY ĐỔI GIỜ THÔNG DỤNG

| Mục tiêu hiển thị trên Web (Giờ VN - GMT+7) | Giá trị cần điền vào Script SQL (Giờ UTC) |
| :--- | :--- |
| **00:00 (Nửa đêm đầu ngày)** | `17:00:00 ngày hôm trước` |
| **07:00 AM (Đầu giờ sáng)** | `00:00:00 cùng ngày` |
| **12:00 PM (Buổi trưa)** | `05:00:00 cùng ngày` |
| **20:59 PM (8:59 tối)** | `13:59:00 cùng ngày` |
| **23:59 PM (Cuối ngày)** | `16:59:59 cùng ngày` |
