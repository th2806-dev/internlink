<!-- LEGACY: bộ tài liệu thiết kế ban đầu. Bản CẬP NHẬT theo code nằm ở docs/current/ — ưu tiên dùng docs/current/. -->
<!-- STATUS: LEGACY -->

# InternLink — Từ Điển Dữ Liệu (Data Dictionary)

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 4.0  
**Ngày cập nhật:** Tháng 9/2026

---

## 1. Bảng `Users` (Người dùng hệ thống)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | Khóa chính (PK) |
| `Username` | `nvarchar(50)` | No | Tên đăng nhập (MSSV / Mã GV / admin), Unique |
| `PasswordHash` | `nvarchar(500)` | No | Chuỗi mã hóa PBKDF2 |
| `Email` | `nvarchar(150)` | No | Email liên hệ |
| `FullName` | `nvarchar(150)` | No | Họ và tên đầy đủ |
| `Role` | `int` | No | Vai trò: 0=Student, 1=Lecturer, 2=SuperAdmin |
| `MustChangePassword` | `bit` | No | Bắt buộc đổi mật khẩu lần đầu |
| `IsActive` | `bit` | No | Trạng thái kích hoạt (0=Locked, 1=Active) |
| `LastLoginAt` | `datetime2` | Yes | Thời điểm đăng nhập gần nhất |
| `IsDeleted` | `bit` | No | Xóa mềm |
| `CreatedAt` | `datetime2` | No | Thời điểm tạo (UTC) |
| `UpdatedAt` | `datetime2` | Yes | Thời điểm cập nhật |

---

## 2. Bảng `RefreshTokens`

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `UserId` | `uniqueidentifier` | No | FK → Users |
| `Token` | `nvarchar(500)` | No | JWT Refresh Token |
| `ExpiresAt` | `datetime2` | No | Thời hạn Token |
| `IsRevoked` | `bit` | No | Đã thu hồi chưa |
| `CreatedAt` | `datetime2` | No | Thời điểm tạo |

---

## 3. Bảng `PasswordResetTokens`

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `UserId` | `uniqueidentifier` | No | FK → Users |
| `Token` | `nvarchar(500)` | No | Mã đặt lại mật khẩu |
| `ExpiresAt` | `datetime2` | No | Thời hạn Token |
| `IsUsed` | `bit` | No | Đã sử dụng chưa |
| `CreatedAt` | `datetime2` | No | Thời điểm tạo |

---

## 4. Bảng `Semesters` (Học kỳ thực tập)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `Name` | `nvarchar(100)` | No | Tên hiển thị |
| `Term` | `nvarchar(50)` | No | Học kỳ (VD: Học kỳ I) |
| `AcademicYear` | `nvarchar(20)` | No | Niên khóa (VD: 2025-2026) |
| `StartDate` | `datetime2` | Yes | Ngày bắt đầu |
| `EndDate` | `datetime2` | Yes | Ngày kết thúc |
| `Status` | `int` | No | 0=Upcoming, 1=Active, 2=Completed, 3=Draft |
| `Description` | `nvarchar(500)` | Yes | Mô tả |
| `MaxStudentsPerLecturer` | `int` | No | Số SV tối đa mỗi GV (mặc định 15) |
| `IsDeleted` | `bit` | No | Xóa mềm |
| `CreatedAt` | `datetime2` | No | Thời điểm tạo |
| `UpdatedAt` | `datetime2` | Yes | Thời điểm cập nhật |

---

## 5. Bảng `Students` (Hồ sơ Sinh viên)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `UserId` | `uniqueidentifier` | Yes | FK → Users |
| `StudentCode` | `nvarchar(20)` | No | MSSV, Unique |
| `FullName` | `nvarchar(150)` | No | Họ tên |
| `Email` | `nvarchar(150)` | Yes | Email |
| `Phone` | `nvarchar(20)` | Yes | Số điện thoại |
| `Class` | `nvarchar(50)` | Yes | Lớp |
| `Major` | `nvarchar(100)` | Yes | Chuyên ngành |
| `IsDeleted` | `bit` | No | Xóa mềm |

---

## 6. Bảng `Lecturers` (Hồ sơ Giảng viên)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `UserId` | `uniqueidentifier` | Yes | FK → Users |
| `StaffCode` | `nvarchar(20)` | No | Mã GV, Unique |
| `FullName` | `nvarchar(150)` | No | Họ tên |
| `Email` | `nvarchar(150)` | Yes | Email |
| `Phone` | `nvarchar(20)` | Yes | Số điện thoại |
| `Department` | `nvarchar(100)` | Yes | Bộ môn/Khoa |
| `IsDeleted` | `bit` | No | Xóa mềm |

---

## 7. Bảng `Companies` (Doanh nghiệp)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `CompanyName` | `nvarchar(200)` | No | Tên DN |
| `Address` | `nvarchar(500)` | Yes | Địa chỉ |
| `Industry` | `nvarchar(100)` | Yes | Lĩnh vực |
| `Website` | `nvarchar(200)` | Yes | Website |
| `ContactPerson` | `nvarchar(100)` | Yes | Người liên hệ |
| `ContactEmail` | `nvarchar(150)` | Yes | Email liên hệ |
| `ContactPhone` | `nvarchar(20)` | Yes | SĐT liên hệ |
| `Capacity` | `int` | Yes | Số lượng SV tiếp nhận |
| `IsActive` | `bit` | No | Đang hoạt động |
| `IsDeleted` | `bit` | No | Xóa mềm |

---

## 8. Bảng `Internships` (Đợt Thực tập)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `StudentId` | `uniqueidentifier` | No | FK → Students |
| `CompanyId` | `uniqueidentifier` | Yes | FK → Companies |
| `LecturerId` | `uniqueidentifier` | Yes | FK → Lecturers |
| `SemesterId` | `uniqueidentifier` | Yes | FK → Semesters |
| `StartDate` | `datetime2` | Yes | Ngày bắt đầu |
| `EndDate` | `datetime2` | Yes | Ngày kết thúc |
| `Status` | `int` | No | InternshipStatus enum |
| `Position` | `nvarchar(100)` | Yes | Vị trí thực tập |
| `SupervisorName` | `nvarchar(150)` | Yes | Tên Mentor DN |
| `Notes` | `nvarchar(max)` | Yes | **Ghi chú của GV về SV** |
| `IsDeleted` | `bit` | No | Xóa mềm |

---

## 9. Bảng `WeeklyReports` (Báo cáo Tuần)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `InternshipId` | `uniqueidentifier` | No | FK → Internships |
| `WeekNumber` | `int` | No | Số tuần (1-16) |
| `Title` | `nvarchar(200)` | No | Tiêu đề |
| `Content` | `nvarchar(max)` | No | Nội dung |
| `Status` | `int` | No | WeeklyReportStatus enum |
| `LecturerComment` | `nvarchar(max)` | Yes | Nhận xét của GV |
| `SubmittedAt` | `datetime2` | Yes | Thời điểm nộp |
| `IsDeleted` | `bit` | No | Xóa mềm |

---

## 10. Bảng `Submissions` (Bài nộp)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `InternshipId` | `uniqueidentifier` | No | FK → Internships |
| `Type` | `int` | No | Loại bài nộp |
| `Title` | `nvarchar(200)` | Yes | Tiêu đề |
| `Description` | `nvarchar(max)` | Yes | Mô tả |
| `Version` | `int` | No | Phiên bản |
| `FileName` | `nvarchar(255)` | Yes | Tên file gốc |
| `FileUrl` | `nvarchar(500)` | Yes | Đường dẫn file |
| `FileSize` | `bigint` | Yes | Dung lượng (bytes) |
| `Status` | `int` | No | SubmissionStatus enum |
| `SubmittedAt` | `datetime2` | Yes | Thời điểm nộp |
| `IsDeleted` | `bit` | No | Xóa mềm |

---

## 11. Bảng `Feedbacks` (Nhận xét)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `SubmissionId` | `uniqueidentifier` | No | FK → Submissions |
| `LecturerId` | `uniqueidentifier` | Yes | FK → Lecturers (**null = phản hồi từ SV**) |
| `Comment` | `nvarchar(max)` | No | Nội dung nhận xét |
| `IsPublic` | `bit` | No | Công khai |
| `CreatedAt` | `datetime2` | No | Thời điểm tạo |

---

## 12. Bảng `Evaluations` (Đánh giá)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `InternshipId` | `uniqueidentifier` | No | FK → Internships |
| `EvaluatedById` | `uniqueidentifier` | Yes | FK → Users (GV chấm) |
| `TechnicalScore` | `int` | No | Điểm chuyên môn (0-10) |
| `CommunicationScore` | `int` | No | Điểm giao tiếp (0-10) |
| `TeamworkScore` | `int` | No | Điểm làm việc nhóm (0-10) |
| `InitiativeScore` | `int` | No | Điểm chủ động (0-10) |
| `FinalGrade` | `decimal(4,2)` | No | Điểm tổng kết |
| `Comments` | `nvarchar(max)` | Yes | Nhận xét |
| `Strengths` | `nvarchar(max)` | Yes | Điểm mạnh |
| `AreasForImprovement` | `nvarchar(max)` | Yes | Điểm cần cải thiện |
| `IsFinalized` | `bit` | No | Đã khóa điểm |
| `RubricId` | `uniqueidentifier` | Yes | FK → EvaluationRubrics |
| `CriteriaScoresJson` | `nvarchar(max)` | Yes | JSON điểm rubric chi tiết |
| `IsDeleted` | `bit` | No | Xóa mềm |

---

## 13. Bảng `EvaluationRubrics` (Rubric đánh giá)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `SemesterId` | `uniqueidentifier` | No | FK → Semesters |
| `Name` | `nvarchar(200)` | No | Tên rubric |
| `ApplicationMode` | `int` | No | 0=PerStudent, 1=PerSemester |
| `Status` | `int` | No | RubricStatus enum |
| `RejectionReason` | `nvarchar(max)` | Yes | Lý do từ chối |
| `SubmittedByName` | `nvarchar(150)` | Yes | Người gửi |
| `SubmittedAt` | `datetime2` | Yes | Thời điểm gửi |
| `ApprovedByName` | `nvarchar(150)` | Yes | Người duyệt |
| `ApprovedAt` | `datetime2` | Yes | Thời điểm duyệt |
| `IsDeleted` | `bit` | No | Xóa mềm |

---

## 14. Bảng `EvaluationRubricCriteria` (Tiêu chí Rubric)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `RubricId` | `uniqueidentifier` | No | FK → EvaluationRubrics |
| `Name` | `nvarchar(200)` | No | Tên tiêu chí |
| `Description` | `nvarchar(500)` | Yes | Mô tả |
| `Weight` | `decimal(5,2)` | No | Trọng số (%) |
| `MaxScore` | `int` | No | Điểm tối đa |
| `OrderIndex` | `int` | No | Thứ tự hiển thị |

---

## 15. Bảng `Documents` (Tài liệu)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `InternshipId` | `uniqueidentifier` | Yes | FK → Internships |
| `UploadedById` | `uniqueidentifier` | Yes | FK → Users |
| `Title` | `nvarchar(255)` | No | Tên tài liệu |
| `Description` | `nvarchar(500)` | Yes | Mô tả |
| `Category` | `nvarchar(50)` | No | Danh mục |
| `FileName` | `nvarchar(255)` | No | Tên file gốc |
| `FilePath` | `nvarchar(500)` | No | Đường dẫn lưu trữ |
| `MimeType` | `nvarchar(100)` | No | Định dạng MIME |
| `FileSize` | `bigint` | No | Dung lượng (bytes) |
| `IsRequired` | `bit` | No | Bắt buộc nộp |
| `IsArchived` | `bit` | No | Đã lưu trữ |
| `IsDeleted` | `bit` | No | Xóa mềm |

---

## 16. Bảng `Notifications` (Thông báo)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `UserId` | `uniqueidentifier` | No | FK → Users (người nhận) |
| `Title` | `nvarchar(200)` | No | Tiêu đề |
| `Content` | `nvarchar(max)` | No | Nội dung |
| `Link` | `nvarchar(500)` | Yes | Link điều hướng |
| `IsRead` | `bit` | No | Đã đọc |
| `ReadAt` | `datetime2` | Yes | Thời điểm đọc |
| `SenderName` | `nvarchar(150)` | Yes | Tên người gửi |
| `CreatedAt` | `datetime2` | No | Thời điểm tạo |

---

## 17. Bảng `AccountRequests` (Yêu cầu Tài khoản)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `RequesterUserId` | `uniqueidentifier` | Yes | FK → Users |
| `RequesterName` | `nvarchar(150)` | No | Tên người yêu cầu |
| `RequesterCode` | `nvarchar(50)` | No | Mã (MSSV/Mã GV) |
| `RequesterEmail` | `nvarchar(150)` | Yes | Email |
| `RequesterRole` | `nvarchar(50)` | No | Vai trò |
| `RequestType` | `nvarchar(100)` | No | Loại yêu cầu |
| `Description` | `nvarchar(500)` | Yes | Mô tả |
| `Priority` | `nvarchar(20)` | No | Mức ưu tiên |
| `Status` | `nvarchar(20)` | No | Trạng thái xử lý |
| `ProcessorName` | `nvarchar(150)` | Yes | Người xử lý |
| `ProcessedAt` | `datetime2` | Yes | Thời điểm xử lý |
| `AdminNote` | `nvarchar(500)` | Yes | Ghi chú admin |
| `IsDeleted` | `bit` | No | Xóa mềm |

---

## 18. Bảng `SystemSettings` (Cấu hình Hệ thống)

| Tên Cột | Kiểu Dữ Liệu | Nullable | Mô Tả |
|:---|:---|:---:|:---|
| `Id` | `uniqueidentifier` | No | PK |
| `Key` | `nvarchar(100)` | No | Tên thiết lập, Unique |
| `Value` | `nvarchar(max)` | No | Giá trị (JSON) |
| `Description` | `nvarchar(500)` | Yes | Mô tả |
| `UpdatedAt` | `datetime2` | Yes | Thời điểm cập nhật |

---

## 19. Danh Mục Enums

| Enum | Giá trị |
|:---|:---|
| `UserRole` | Student=0, Lecturer=1, SuperAdmin=2 |
| `InternshipStatus` | NotStarted, InProgress, BehindSchedule, AwaitingFeedback, RequiresRevision, Completed, Graded |
| `SubmissionStatus` | Submitted, Reviewed, RevisionRequested, Approved, Rejected |
| `WeeklyReportStatus` | Draft, Submitted, Reviewed, RevisionRequested, Approved |
| `RubricStatus` | Draft, PendingApproval, Approved, Rejected, Locked |

> Ghi chú: Luồng active hiện tại của admin save/apply là tạo/cập nhật rubric rồi giữ ngay ở trạng thái `Approved`; các trạng thái legacy như `PendingApproval`, `Rejected`, `Locked` vẫn có thể tồn tại trong schema để tương thích với dữ liệu cũ hoặc flow trước đó.
| `RubricApplicationMode` | PerStudent, PerSemester |
| `AccountRequestStatus` | Pending, Approved, Rejected, NeedInfo |
| `AccountRequestPriority` | Low, Medium, High, Urgent |
