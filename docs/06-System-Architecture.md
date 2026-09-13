# InternLink — Kiến Trúc Hệ Thống (System Architecture)

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 4.0  
**Ngày cập nhật:** Tháng 9/2026

---

## 1. Sơ Đồ Kiến Trúc Tổng Thể (High-Level Architecture)

Hệ thống được thiết kế theo mô hình **Client - Server Phân Tầng Hiện Đại (SPA + RESTful API)** kết hợp giao tiếp thời gian thực qua SignalR:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND PRESENTATION LAYER                     │
│            React 19 + TypeScript + Vite + Tailwind CSS 4               │
├────────────────────────────────────────────────────────────────────────┤
│  [ Admin Portal ]     │   [ Lecturer Portal ]   │  [ Student Portal ] │
│  - Quản lý Học kỳ    │   - Duyệt Báo cáo tuần  │  - Nhật ký tuần     │
│  - Import/Export Excel │   - Chấm điểm Rubric    │  - Nộp đồ án        │
│  - Phân công & Notify │   - Xuất PDF / Excel     │  - Tra cứu điểm     │
│  - Account Requests   │   - Ghi chú SV           │  - Phản hồi bài nộp │
│  - Rubric Management  │   - Bulk Notify SV       │  - Tải PDF chứng nhận│
└───────────────────▲──────────────────────────────────────▲─────────────┘
                    │ HTTPS / RESTful API (JSON)           │ WSS / SignalR
┌───────────────────▼──────────────────────────────────────▼─────────────┐
│                         BACKEND APPLICATION LAYER                       │
│                    ASP.NET Core 8 Web API (Clean Architecture)          │
├────────────────────────────────────────────────────────────────────────┤
│  [ Controllers / API Layer ]  — 25 REST Controllers                    │
│  - Auth, Admin(12), Lecturer, StudentPortal, Submission,               │
│    WeeklyReport, Evaluation, Document, Export, Notification,            │
│    Company, Student, Internship, Feedback                               │
├────────────────────────────────────────────────────────────────────────┤
│  [ Application Core / Business Logic ]                                 │
│  - Services, DTOs, AutoMapper, FluentValidation, Exceptions            │
├────────────────────────────────────────────────────────────────────────┤
│  [ Infrastructure Layer ]                                              │
│  - EF Core 8 DbContext & Entity Configurations                         │
│  - Server-side PDF Engine (IPdfExportService)                          │
│  - ClosedXML Excel Processing Engine                                   │
│  - MailKit SMTP Client (Gmail Email Dispatcher)                        │
│  - SignalR Hubs (/hubs/notifications)                                  │
│  - Local Server File Storage Provider (uploads/)                       │
│  - IExcelService for Import/Export operations                          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                          DATA PERSISTENCE LAYER                        │
├────────────────────────────────────────────────────────────────────────┤
│  [ Microsoft SQL Server 2022 ]      │  [ Docker Persistent Storage ]  │
│  - 18 Bảng dữ liệu quan hệ          │  - Volume: internlink_uploads   │
│  - Soft Delete & Audit Fields        │  - Báo cáo, Minh chứng, Đồ án  │
│  - EF Core Code-First Migrations     │                                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Kiến Trúc Backend: Clean Architecture 5 Phân Tầng

Mã nguồn Backend được tổ chức nghiêm ngặt theo mô hình Clean Architecture trong `backend/InternLink/`:

```
InternLink.slnx
├── InternLink.Domain/         # Thực thể cốt lõi (18 Entities), Enums, BaseEntity
├── InternLink.Application/    # DTOs, Service Interfaces (IXxxService), Mappings
├── InternLink.Infrastructure/ # Persistence (AppDbContext), EF Configurations,
│                              #   Email (MailKit), PDF Engine, Excel (ClosedXML),
│                              #   SignalR Hubs, File Storage
├── InternLink.API/            # 25 Controllers, Middlewares, Extensions, Hubs,
│                              #   Startup config, Program.cs
├── InternLink.Shared/         # ApiResponse<T> wrapper, Error codes, Pagination
└── InternLink.Tests/          # Unit Tests (xUnit + Moq)
```

### 2.1. Nguyên tắc phân tầng

| Tầng | Nhiệm vụ | Quy tắc |
|:---|:---|:---|
| **Domain** | Định nghĩa thực thể nghiệp vụ, Enums, BaseEntity | Không phụ thuộc tầng nào |
| **Application** | Định nghĩa Interface Service, DTOs, Validation | Chỉ phụ thuộc Domain |
| **Infrastructure** | Triển khai Service, DbContext, External Libs | Phụ thuộc Application + Domain |
| **API** | Controllers, Middleware, Startup | Phụ thuộc Application (không import Infrastructure trực tiếp) |
| **Shared** | ApiResponse, Error codes | Không phụ thuộc tầng nào |

---

## 3. Kiến Trúc Bảo Mật & Xác Thực (Security & Authentication)

### 3.1. JWT Authentication & Token Lifecycle

- **Access Token**: Thời hạn 60 phút, chứa Claims (`sub`, `name`, `role`, `userId`).
- **Refresh Token**: Thời hạn 7 ngày, lưu trong CSDL (`RefreshTokens` table) để cấp lại AccessToken mà không cần đăng nhập lại.
- **Mechanism**: Khi Access Token hết hạn, Frontend gọi `POST /api/Auth/refresh-token` với Refresh Token để nhận cặp Token mới.

### 3.2. Role-Based Access Control (RBAC)

Các API Endpoint được bảo vệ bằng Policy-Based Authorization:

| Policy | Vai trò | Mô tả |
|:---|:---|:---|
| `RequireAdmin` | SuperAdmin | Toàn quyền quản trị hệ thống |
| `RequireLecturer` | Lecturer | Giảng viên hướng dẫn |
| `RequireLecturerOrAdmin` | Lecturer + SuperAdmin | Giảng viên hoặc Admin |
| `RequireStudent` | Student | Sinh viên thực tập |

### 3.3. Mã Hóa Mật Khẩu

Sử dụng giải thuật **PBKDF2** (Password-Based Key Derivation Function 2) với:
- 100.000 vòng lặp (iterations)
- Khóa muối (salt) 128-bit
- Đánh giá theo tiêu chuẩn OWASP

---

## 4. Kiến Trúc Giao Tiếp Thời Gian Thực (SignalR Real-time)

- **Endpoint Hub**: `/hubs/notifications`
- **Cơ chế**: Khi có sự kiện mới (báo cáo tuần được duyệt, thông báo broadcast từ Admin), Backend bắn sự kiện `ReceiveNotification` trực tiếp đến WebSocket client qua SignalR Hub.
- **Client**: Frontend kết nối qua `signalR.service.ts` với automatic reconnect.

---

## 5. Kiến Trúc Lưu Trữ & Sinh Báo Cáo (Storage & Reporting)

### 5.1. Local Server Storage Engine

- Lưu trữ file trên file system tại `/app/uploads/documents/`
- Docker Named Volume `internlink_uploads_data` đảm bảo dữ liệu không bị mất khi restart.

### 5.2. Server-side PDF Engine

- Interface: `IPdfExportService` với 2 phương thức chính:
  - `GenerateLecturerSummaryPdfAsync()`: Xuất báo cáo tổng hợp cuối kỳ cho giảng viên.
  - `GenerateStudentEvaluationPdfAsync()`: Xuất phiếu đánh giá cá nhân cho sinh viên.
- Tự động sinh file PDF nhị phân trực tiếp trên memory stream.

### 5.3. Excel Processing Engine (ClosedXML)

- Import: Đọc file Excel (.xlsx) danh sách Students, Lecturers, Companies, Assignments.
- Export: Xuất báo cáo tổng hợp, ma trận phân công, danh sách thực tập.

---

## 6. Danh Mục 18 Bảng Dữ Liệu (Entity Summary)

| # | Entity | Bảng SQL | Mô tả |
|:---:|:---|:---|:---|
| 1 | `User` | Users | Tài khoản xác thực trung tâm |
| 2 | `RefreshToken` | RefreshTokens | Token làm mới JWT |
| 3 | `PasswordResetToken` | PasswordResetTokens | Mã đặt lại mật khẩu |
| 4 | `Semester` | Semesters | Học kỳ thực tập |
| 5 | `Student` | Students | Hồ sơ sinh viên |
| 6 | `Lecturer` | Lecturers | Hồ sơ giảng viên |
| 7 | `Company` | Companies | Doanh nghiệp tiếp nhận |
| 8 | `Internship` | Internships | Bản ghi đợt thực tập |
| 9 | `WeeklyReport` | WeeklyReports | Nhật ký báo cáo tuần |
| 10 | `Submission` | Submissions | Bài nộp đồ án |
| 11 | `Feedback` | Feedbacks | Nhận xét bài nộp |
| 12 | `Evaluation` | Evaluations | Bảng điểm đánh giá |
| 13 | `EvaluationRubric` | EvaluationRubrics | Rubric đánh giá |
| 14 | `EvaluationRubricCriterion` | EvaluationRubricCriteria | Tiêu chí rubric |
| 15 | `Document` | Documents | Tài liệu & biểu mẫu |
| 16 | `Notification` | Notifications | Thông báo hệ thống |
| 17 | `AccountRequest` | AccountRequests | Yêu cầu tài khoản |
| 18 | `SystemSetting` | SystemSettings | Cấu hình hệ thống |

---

## 7. Danh Mục 25 API Controllers

| # | Controller | Route | Vai trò |
|:---:|:---|:---|:---|
| 1 | AuthController | `/api/Auth/*` | Public |
| 2 | AdminController | `/api/Admin/*` | SuperAdmin |
| 3 | AdminUsersController | `/api/Admin/users/*` | SuperAdmin |
| 4 | AdminStudentsController | `/api/Admin/students/*` | SuperAdmin |
| 5 | AdminLecturersController | `/api/LecturerProfile/*` | SuperAdmin |
| 6 | AdminCompaniesController | `/api/Admin/companies/*` | SuperAdmin |
| 7 | AdminSemestersController | `/api/Admin/semesters/*` | SuperAdmin |
| 8 | AdminAssignmentsController | `/api/Admin/assignments/*` | SuperAdmin |
| 9 | AdminAccountRequestsController | `/api/Admin/account-requests/*` | SuperAdmin |
| 10 | AdminRubricController | `/api/Admin/rubrics/*` | SuperAdmin |
| 11 | AdminNotificationsController | `/api/Admin/notifications/*` | SuperAdmin |
| 12 | AdminSettingsController | `/api/Admin/settings/*` | SuperAdmin |
| 13 | LecturerController | `/api/Lecturer/*` | Lecturer |
| 14 | LecturerRubricController | `/api/Lecturer/rubric/*` | Lecturer |
| 15 | LecturerProfileController | `/api/LecturerProfile/*` | Lecturer |
| 16 | StudentPortalController | `/api/StudentPortal/*` | Student |
| 17 | SubmissionController | `/api/Submission/*` | Student/Lecturer |
| 18 | WeeklyReportController | `/api/WeeklyReport/*` | Student/Lecturer |
| 19 | EvaluationController | `/api/Evaluation/*` | Lecturer |
| 20 | ExportController | `/api/Export/*` | Lecturer/Admin |
| 21 | DocumentController | `/api/Document/*` | Authenticated |
| 22 | NotificationController | `/api/Notification/*` | Authenticated |
| 23 | CompanyController | `/api/Company/*` | Authenticated |
| 24 | StudentController | `/api/Student/*` | Authenticated |
| 25 | InternshipController | `/api/Internship/*` | Authenticated |

---

## 8. Công Nghệ Sử Dụng (Technology Stack)

| Thành phần | Công nghệ | Phiên bản |
|:---|:---|:---|
| **Frontend** | React + TypeScript + Vite | React 19 |
| **CSS Framework** | Tailwind CSS | v4 |
| **State Management** | React Context + Custom Hooks | — |
| **HTTP Client** | Axios (api.config.ts) | — |
| **Real-time** | @microsoft/signalr | — |
| **Backend** | ASP.NET Core Web API | .NET 8 |
| **ORM** | Entity Framework Core | 8.x |
| **Database** | Microsoft SQL Server | 2022 |
| **PDF Engine** | Custom (IPdfExportService) | — |
| **Excel Engine** | ClosedXML | — |
| **Email** | MailKit (SMTP Gmail) | — |
| **Auth** | JWT Bearer + Refresh Token | — |
| **Validation** | FluentValidation | — |
| **Testing** | xUnit + Moq | — |
| **Containerization** | Docker + Docker Compose | — |
