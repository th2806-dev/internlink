<!-- LEGACY: bộ tài liệu thiết kế ban đầu. Bản CẬP NHẬT theo code nằm ở docs/current/ — ưu tiên dùng docs/current/. -->
<!-- STATUS: LEGACY -->

# InternLink — Mô Hình Miền Nghiệp Vụ (Domain Model)

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 4.0  
**Ngày cập nhật:** Tháng 9/2026

---

## 1. Danh Sách 18 Thực Thể Nghiệp Vụ (Domain Entities)

Hệ thống được thiết kế theo mô hình Clean Architecture (DDD-lite) với **18 thực thể miền**:

| STT | Thực Thể (Entity) | Bảng SQL | Ý Nghĩa Nghiệp Vụ |
| :---: | :--- | :--- | :--- |
| **01** | `User` | Users | Tài khoản xác thực trung tâm (Username, PasswordHash, Role, Email, MustChangePassword, IsActive). |
| **02** | `RefreshToken` | RefreshTokens | Quản lý token làm mới phiên đăng nhập JWT. |
| **03** | `PasswordResetToken` | PasswordResetTokens | Mã xác thực đặt lại mật khẩu khi người dùng quên mật khẩu. |
| **04** | `Semester` | Semesters | Học kỳ thực tập (Name, Term, AcademicYear, StartDate, EndDate, Status, MaxStudentsPerLecturer). Là ngữ cảnh phân chia dữ liệu toàn hệ thống. |
| **05** | `Student` | Students | Hồ sơ sinh viên (StudentCode - MSSV, FullName, Class, Major, Phone, UserId). |
| **06** | `Lecturer` | Lecturers | Hồ sơ giảng viên hướng dẫn (StaffCode, FullName, Department, Phone, UserId). |
| **07** | `Company` | Companies | Doanh nghiệp tiếp nhận thực tập (CompanyName, Address, Industry, ContactPerson, ContactEmail, ContactPhone, Capacity, IsActive). |
| **08** | `Internship` | Internships | Bản ghi đợt thực tập liên kết Student, Lecturer, Company và Semester (Status, Position, SupervisorName, Notes, StartDate, EndDate). |
| **09** | `WeeklyReport` | WeeklyReports | Nhật ký báo cáo tiến độ tuần (WeekNumber 1-16, Title, Content, Status, LecturerComment). |
| **10** | `Submission` | Submissions | Bài nộp đồ án / báo cáo cuối kỳ (Title, Type, Version, FileName, FileUrl, Status, SubmittedAt). |
| **11** | `Feedback` | Feedbacks | Nhận xét bài nộp. `LecturerId` nullable — null nghĩa là phản hồi từ sinh viên, có giá trị nghĩa là nhận xét từ giảng viên. |
| **12** | `Evaluation` | Evaluations | Bảng điểm đánh giá (TechnicalScore, CommunicationScore, TeamworkScore, InitiativeScore, FinalGrade, Comments, IsFinalized, CriteriaScoresJson). |
| **13** | `EvaluationRubric` | EvaluationRubrics | Rubric đánh giá (Name, ApplicationMode, Status: Draft/PendingApproval/Approved/Rejected/Locked; flow hiện tại của admin save/apply luôn giữ Approved). |
| **14** | `EvaluationRubricCriterion` | EvaluationRubricCriteria | Tiêu chí rubric (Name, Description, Weight, MaxScore, OrderIndex). |
| **15** | `Document` | Documents | Tài liệu biểu mẫu (Title, Category, FileName, FilePath, MimeType, FileSize, IsRequired, IsArchived). |
| **16** | `Notification` | Notifications | Thông báo hệ thống (Title, Content, Link, IsRead, ReadAt). |
| **17** | `AccountRequest` | AccountRequests | Yêu cầu cấp tài khoản (RequesterName, RequesterCode, RequestType, Priority, Status, AdminNote). |
| **18** | `SystemSetting` | SystemSettings | Cấu hình hệ thống (Key-Value pairs cho các thiết lập khoa). |

---

## 2. Mối Quan Hệ Giữa Các Thực Thể (Entity Relationships)

```mermaid
erDiagram
    User ||--o{ RefreshToken : "has"
    User ||--o{ PasswordResetToken : "has"
    User ||--o| Student : "links to"
    User ||--o| Lecturer : "links to"
    User ||--o{ Notification : "receives"
    User ||--o{ AccountRequest : "submits"

    Semester ||--o{ Internship : "contains"
    Semester ||--o{ EvaluationRubric : "has"

    Student ||--o{ Internship : "participates in"
    Lecturer ||--o{ Internship : "supervises"
    Company ||--o{ Internship : "hosts"

    Internship ||--o{ WeeklyReport : "has"
    Internship ||--o{ Submission : "has"
    Internship ||--o| Evaluation : "evaluated by"
    Internship ||--o{ Document : "has"
    Internship ||--o|| Internship : "Notes field"

    Submission ||--o{ Feedback : "receives"
    Feedback }o--o| Lecturer : "created by (nullable)"

    EvaluationRubric ||--o{ EvaluationRubricCriterion : "contains"

    SystemSetting ||--|| SystemSetting : "key-value"
```

---

## 3. Các Quy Tắc Nghiệp Vụ Bất Biến (Domain Invariants)

1. **Một sinh viên chỉ có 1 đợt thực tập hoạt động trong 1 học kỳ**: Cặp `(StudentId, SemesterId)` là duy nhất.
2. **Khóa điểm bất biến**: Khi `Evaluation.IsFinalized = true`, điểm số không thể bị thay đổi trừ khi SuperAdmin mở khóa.
3. **Tuần báo cáo hợp lệ**: `WeeklyReport.WeekNumber` nhận giá trị từ `1` đến `16` (tùy cấu hình học kỳ).
4. **Rubric Application Modes**:
   - `PerStudent`: Mỗi sinh viên có rubric riêng.
   - `PerSemester`: Tất cả sinh viên trong học kỳ dùng chung rubric.
5. **Feedback 2 chiều**: `Feedback.LecturerId` nullable:
   - `null` → Phản hồi từ sinh viên (Student Reply).
   - Có giá trị → Nhận xét từ giảng viên.
6. **Soft Delete chuẩn hóa**: Tất cả các thực thể đều kế thừa `BaseEntity` với cờ `IsDeleted`, `CreatedAt`, `UpdatedAt` để bảo đảm truy vết lịch sử.
7. **Internship Notes**: Trường `Internship.Notes` lưu nhận xét tổng quát của giảng viên về sinh viên trong suốt quá trình thực tập.

---

## 4. Các Enum Nghiệp Vụ

| Enum | Giá trị | Mô tả |
|:---|:---|:---|
| `UserRole` | `Student`, `Lecturer`, `SuperAdmin` | Vai trò người dùng |
| `InternshipStatus` | `NotStarted`, `InProgress`, `BehindSchedule`, `AwaitingFeedback`, `RequiresRevision`, `Completed`, `Graded` | Trạng thái thực tập |
| `SubmissionStatus` | `Submitted`, `Reviewed`, `RevisionRequested`, `Approved`, `Rejected` | Trạng thái bài nộp |
| `WeeklyReportStatus` | `Draft`, `Submitted`, `Reviewed`, `RevisionRequested`, `Approved` | Trạng thái báo cáo tuần |
| `RubricStatus` | `Draft`, `PendingApproval`, `Approved`, `Rejected`, `Locked` | Trạng thái rubric |
| `RubricApplicationMode` | `PerStudent`, `PerSemester` | Phạm vi áp dụng rubric |
| `AccountRequestStatus` | `Pending`, `Approved`, `Rejected`, `NeedInfo` | Trạng thái yêu cầu tài khoản |
| `AccountRequestPriority` | `Low`, `Medium`, `High`, `Urgent` | Mức ưu tiên yêu cầu |
