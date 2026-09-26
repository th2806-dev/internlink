<!-- LEGACY: bộ tài liệu thiết kế ban đầu. Bản CẬP NHẬT theo code nằm ở docs/current/ — ưu tiên dùng docs/current/. -->
<!-- STATUS: LEGACY -->

# InternLink — Kiến Trúc Thông Tin & Điều Hướng (Information Architecture)

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 4.0  
**Ngày cập nhật:** Tháng 9/2026

---

## 1. Sơ Đồ Cấu Trúc Menu & Điều Hướng (Site Map — 34 Màn Hình)

Toàn bộ ứng dụng được tổ chức theo **3 Portal độc lập** và **4 tuyến đường công khai**:

```
INTERNLINK SYSTEM (34 Routes)
│
├── [ KHU VỰC CÔNG KHAI / XÁC THỰC ] (4 routes)
│   ├── /login                        → LoginPortal
│   ├── /forgot-password              → ForgotPasswordPage
│   ├── /reset-password               → ResetPasswordPage
│   └── /change-password              → ChangePasswordPage
│
├── [ CỔNG QUẢN TRỊ KHOA - /admin ] (12 routes)
│   ├── /admin/dashboard              → DashboardView (KPI, Charts, Action Items)
│   ├── /admin/semesters              → SemestersView (CRUD Học kỳ, Rubric Editor)
│   ├── /admin/assignments            → AssignmentsView (Phân công GV-SV, Auto-assign)
│   ├── /admin/lecturers              → LecturersView (CRUD GV, Import/Export Excel)
│   ├── /admin/students               → StudentsView (CRUD SV, Import Excel)
│   ├── /admin/companies              → CompaniesView (CRUD DN, Import/Export)
│   ├── /admin/users                  → UsersView (Quản lý tài khoản, Reset password)
│   ├── /admin/account-requests       → AccountRequestsView (Yêu cầu & Cấp phát TK)
│   ├── /admin/notifications          → NotificationsView (Broadcast, Campaign History)
│   ├── /admin/settings               → SettingsView (Cấu hình hệ thống)
│   ├── /admin/account                → AccountView (Hồ sơ cá nhân Admin)
│   └── /admin/*                      → Redirect → /admin/dashboard
│
├── [ CỔNG GIẢNG VIÊN HƯỚNG DẪN - /lecturer ] (10 routes)
│   ├── /lecturer/dashboard           → DashboardView (KPI, Trends, Deadlines)
│   ├── /lecturer/students            → StudentsView (Danh sách SV, Comment, Bulk Notify)
│   ├── /lecturer/enterprises         → EnterprisesView (Danh sách DN đọc)
│   ├── /lecturer/templates           → TemplatesView (Quản lý Tài liệu/Biểu mẫu)
│   ├── /lecturer/evaluations         → EvaluationsView (Chấm điểm Rubric)
│   ├── /lecturer/export              → ExportView (Xuất Excel/PDF)
│   ├── /lecturer/reports             → ReportsView (Duyệt Báo cáo tuần & Bài nộp)
│   ├── /lecturer/analytics           → AnalyticsView (Thống kê nâng cao)
│   ├── /lecturer/notifications       → NotificationsView (Thông báo & Phản hồi SV)
│   ├── /lecturer/account             → AccountView (Hồ sơ cá nhân GV)
│   └── /lecturer/*                   → Redirect → /lecturer/dashboard
│
└── [ CỔNG SINH VIÊN THỰC TẬP - /student ] (9 routes)
    ├── /student/dashboard            → DashboardView (Tiến độ, Tasks, Feedback)
    ├── /student/internship           → InternshipView (Thông tin DN, Timeline, Weekly Plan)
    ├── /student/weekly-reports       → WeeklyReportsView (Nộp & Quản lý Báo cáo tuần)
    ├── /student/submissions          → SubmissionsView (Nộp & Quản lý Bài nộp)
    ├── /student/feedback             → FeedbackView (Phản hồi 2 chiều với GV)
    ├── /student/templates            → TemplatesView (Tải Biểu mẫu)
    ├── /student/evaluation           → EvaluationView (Xem Điểm & Đánh giá)
    ├── /student/notifications        → NotificationsView (Thông báo Real-time)
    ├── /student/account              → AccountView (Hồ sơ & Đổi mật khẩu)
    └── /student/*                    → Redirect → /student/dashboard
```

---

## 2. Tổng Hợp Routes Theo Vai Trò

| Vai trò | Số lượng routes | Mô tả |
|:---|:---:|:---|
| **Public (Auth)** | 4 | Login, Forgot Password, Reset Password, Change Password |
| **Admin** | 12 | Dashboard, Semesters, Assignments, Lecturers, Students, Companies, Users, Account Requests, Notifications, Settings, Account |
| **Lecturer** | 10 | Dashboard, Students, Enterprises, Templates, Evaluations, Export, Reports, Analytics, Notifications, Account |
| **Student** | 9 | Dashboard, Internship, Weekly Reports, Submissions, Feedback, Templates, Evaluation, Notifications, Account |
| **Tổng cộng** | **34** | — |

---

## 3. Nguyên Tắc Điều Hướng & Bảo Vệ Tuyến Đường (Route Guards)

### 3.1. Role-Based Redirection

Khi đăng nhập thành công, hệ thống tự động điều hướng theo `Role`:
- `SuperAdmin` → `/admin/dashboard`
- `Lecturer` → `/lecturer/dashboard`
- `Student` → `/student/dashboard`

### 3.2. First-Login Password Change Guard

Nếu `mustChangePassword = true`, `ProtectedRoute` chặn tất cả route và chuyển hướng về `/change-password`.

### 3.3. Route Protection

- Component `ProtectedRoute` kiểm tra `allowedRoles` trước khi render `<Outlet />`.
- Nếu vi phạm quyền → Redirect về dashboard của role đó.

---

## 4. Component Layout Theo Portal

| Portal | Layout Component | Cấu trúc |
|:---|:---|:---|
| Admin | `AdminLayout` | Sidebar (12 items) + Header (Search, Notifications, Avatar) |
| Lecturer | `LecturerLayout` | Sidebar (10 items) + Header (Search, Semester Selector) |
| Student | `StudentLayout` | Sidebar (9 items) + Header (Search, Notifications) |

---

## 5. Feature Flags

```typescript
// frontend/src/config/featureFlags.ts
FEATURES = {
  adminSemesters: true,        // Trang Quản lý Học kỳ
  adminAccountRequests: true,  // Trang Yêu cầu & Cấp phát Tài khoản
  lecturerAnalytics: true,     // Trang Analytics nâng cao
}
```
