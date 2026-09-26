<!-- LEGACY: bộ tài liệu thiết kế ban đầu. Bản CẬP NHẬT theo code nằm ở docs/current/ — ưu tiên dùng docs/current/. -->
<!-- STATUS: LEGACY -->

# InternLink — Thiết Kế Cơ Sở Dữ Liệu SQL Server (Database Design)

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 4.0  
**Ngày cập nhật:** Tháng 9/2026

---

## 1. Công Nghệ & Chiến Lược CSDL

- **Hệ quản trị CSDL**: Microsoft SQL Server 2022
- **ORM / Data Access**: Entity Framework Core 8 (Code-First Migrations)
- **Quy ước đặt tên**:
  - Bảng: Tên tiếng Anh số nhiều, PascalCase (`Users`, `Semesters`, `Internships`)
  - Khóa chính (PK): `Id` kiểu `uniqueidentifier` (GUID v4)
  - Khóa ngoại (FK): `{Entity}Id`
  - Cột thời gian: `CreatedAt`, `UpdatedAt` — `datetime2` UTC

---

## 2. Chiến Lược Đánh Chỉ Mục (Indexing Strategy)

| Bảng | Tên Index | Loại | Cột | Mục đích |
|:---|:---|:---:|:---|:---|
| `Users` | `IX_Users_Username` | Unique | `Username` | Đăng nhập O(1) |
| `Students` | `IX_Students_StudentCode` | Unique | `StudentCode` | Tra cứu MSSV |
| `Lecturers` | `IX_Lecturers_StaffCode` | Unique | `StaffCode` | Tra cứu Mã GV |
| `Internships` | `IX_Internships_Semester_Student` | Unique | `(SemesterId, StudentId)` | 1 SV chỉ 1 đợt/kỳ |
| `Internships` | `IX_Internships_LecturerId` | NC | `LecturerId` | Lọc SV theo GV |
| `Internships` | `IX_Internships_SemesterId` | NC | `SemesterId` | Lọc theo học kỳ |
| `WeeklyReports` | `IX_WeeklyReports_Internship_Week` | Unique | `(InternshipId, WeekNumber)` | 1 SV chỉ 1 báo cáo/tuần |
| `Evaluations` | `IX_Evaluations_InternshipId` | Unique | `InternshipId` | Quan hệ 1:1 |
| `Submissions` | `IX_Submissions_InternshipId` | NC | `InternshipId` | Lọc bài nộp theo thực tập |
| `Feedbacks` | `IX_Feedbacks_SubmissionId` | NC | `SubmissionId` | Lọc feedback theo bài nộp |
| `Notifications` | `IX_Notifications_UserId` | NC | `UserId` | Lọc thông báo theo user |

---

## 3. Cơ Chế Xóa Mềm & Audit

### 3.1. Soft Delete

Tất cả các entity đều kế thừa `BaseEntity` với:
- `IsDeleted` (bit): Cờ xóa mềm
- `CreatedAt` (datetime2): Thời điểm tạo
- `UpdatedAt` (datetime2): Thời điểm cập nhật

### 3.2. Global Query Filter

```csharp
// AppDbContext.cs
modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
modelBuilder.Entity<Semester>().HasQueryFilter(s => !s.IsDeleted);
modelBuilder.Entity<Student>().HasQueryFilter(s => !s.IsDeleted);
modelBuilder.Entity<Lecturer>().HasQueryFilter(l => !l.IsDeleted);
modelBuilder.Entity<Company>().HasQueryFilter(c => !c.IsDeleted);
modelBuilder.Entity<Internship>().HasQueryFilter(i => !i.IsDeleted);
modelBuilder.Entity<WeeklyReport>().HasQueryFilter(w => !w.IsDeleted);
modelBuilder.Entity<Submission>().HasQueryFilter(s => !s.IsDeleted);
modelBuilder.Entity<Evaluation>().HasQueryFilter(e => !e.IsDeleted);
modelBuilder.Entity<Document>().HasQueryFilter(d => !d.IsDeleted);
```

---

## 4. Phân Vùng Dữ Liệu Theo Học Kỳ (Semester Scoping)

- Mọi thực thể tiến độ đều liên kết với `Internship`
- `Internship` bắt buộc gắn với `SemesterId`
- Khi bước sang học kỳ mới, hệ thống lọc đúng dữ liệu theo `SemesterId`

---

## 5. Danh Sách 18 Bảng

| # | Bảng | Mô tả | Soft Delete |
|:---:|:---|:---|:---:|
| 1 | `Users` | Tài khoản xác thực | ✅ |
| 2 | `RefreshTokens` | JWT Refresh Token | ❌ |
| 3 | `PasswordResetTokens` | Token reset password | ❌ |
| 4 | `Semesters` | Học kỳ thực tập | ✅ |
| 5 | `Students` | Hồ sơ sinh viên | ✅ |
| 6 | `Lecturers` | Hồ sơ giảng viên | ✅ |
| 7 | `Companies` | Doanh nghiệp | ✅ |
| 8 | `Internships` | Bản ghi thực tập | ✅ |
| 9 | `WeeklyReports` | Báo cáo tuần | ✅ |
| 10 | `Submissions` | Bài nộp | ✅ |
| 11 | `Feedbacks` | Nhận xét | ❌ (append-only) |
| 12 | `Evaluations` | Đánh giá | ✅ |
| 13 | `EvaluationRubrics` | Rubric | ✅ |
| 14 | `EvaluationRubricCriteria` | Tiêu chí rubric | ❌ |
| 15 | `Documents` | Tài liệu | ✅ |
| 16 | `Notifications` | Thông báo | ❌ |
| 17 | `AccountRequests` | Yêu cầu tài khoản | ✅ |
| 18 | `SystemSettings` | Cấu hình hệ thống | ❌ |
