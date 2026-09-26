<!-- LEGACY: bộ tài liệu thiết kế ban đầu. Bản CẬP NHẬT theo code nằm ở docs/current/ — ưu tiên dùng docs/current/. -->
<!-- STATUS: LEGACY -->

# InternLink — Đặc Tả RESTful API & SignalR (API Specification)

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 4.0  
**Ngày cập nhật:** Tháng 9/2026

---

## 1. Quy Chuẩn API Chung (General API Standards)

- **Base URL**: `http://localhost:7109` (Production: HTTPS qua Nginx Reverse Proxy)
- **Định dạng dữ liệu**: `application/json` (trừ Upload `multipart/form-data` và Export File nhị phân)
- **Xác thực**: Bearer Token trong Header: `Authorization: Bearer <access_token>`
- **Cấu trúc Response Chuẩn**:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-09-03T10:30:00Z"
}
```
- **Phân trang**: `?skip=0&take=200`

---

## 2. Nhóm API Xác Thực (`/api/Auth`) — 7 Endpoints

| Method | Endpoint | Quyền hạn | Mô tả |
|:---|:---|:---:|:---|
| `POST` | `/api/Auth/login` | Public | Đăng nhập, nhận AccessToken & RefreshToken |
| `POST` | `/api/Auth/refresh-token` | Public | Làm mới AccessToken |
| `POST` | `/api/Auth/logout` | Authenticated | Đăng xuất, hủy RefreshToken |
| `POST` | `/api/Auth/revoke-token` | Authenticated | Thu hồi RefreshToken |
| `POST` | `/api/Auth/change-password` | Authenticated | Đổi mật khẩu |
| `POST` | `/api/Auth/forgot-password` | Public | Yêu cầu mã đặt lại mật khẩu qua email |
| `POST` | `/api/Auth/reset-password` | Public | Đặt lại mật khẩu mới |
| `GET`  | `/api/Auth/me` | Authenticated | Lấy thông tin tài khoản hiện tại |

---

## 3. Nhóm API Quản Trị (`/api/Admin`) — 50+ Endpoints

### 3.1. Users (`/api/Admin/users`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Admin/users` | Danh sách người dùng (phân trang, lọc theo role/isActive/searchTerm) |
| `GET` | `/api/Admin/users/{id}` | Chi tiết người dùng |
| `POST` | `/api/Admin/users` | Tạo tài khoản mới |
| `PUT` | `/api/Admin/users/{id}` | Cập nhật (fullName, email, **isActive** — khóa/mở khóa) |
| `DELETE` | `/api/Admin/users/{id}` | Xóa mềm người dùng |
| `POST` | `/api/Admin/users/{id}/reset-password` | Đặt lại mật khẩu |

### 3.2. Students (`/api/Admin/students`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Admin/students` | Danh sách sinh viên |
| `GET` | `/api/Admin/students/{id}` | Chi tiết sinh viên |
| `POST` | `/api/Admin/students` | Tạo sinh viên mới |
| `PUT` | `/api/Admin/students/{id}` | Cập nhật sinh viên |
| `DELETE` | `/api/Admin/students/{id}` | Xóa mềm |
| `POST` | `/api/Admin/students/import` | Import Excel danh sách SV |
| `GET` | `/api/Admin/students/import/template` | Tải template Excel |

### 3.3. Lecturers (`/api/LecturerProfile`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/LecturerProfile` | Danh sách giảng viên |
| `GET` | `/api/LecturerProfile/{id}` | Chi tiết giảng viên |
| `GET` | `/api/LecturerProfile/{id}/overview` | Tổng quan hoạt động GV |
| `POST` | `/api/LecturerProfile` | Tạo giảng viên mới |
| `PUT` | `/api/LecturerProfile/{id}` | Cập nhật |
| `DELETE` | `/api/LecturerProfile/{id}` | Xóa mềm |
| `POST` | `/api/LecturerProfile/import` | Import Excel |
| `GET` | `/api/LecturerProfile/import/template` | Tải template |
| `GET` | `/api/LecturerProfile/export` | Xuất Excel |

### 3.4. Companies (`/api/Admin/companies`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Admin/companies` | Danh sách DN |
| `POST` | `/api/Admin/companies` | Thêm DN mới |
| `PUT` | `/api/Admin/companies/{id}` | Cập nhật DN |
| `DELETE` | `/api/Admin/companies/{id}` | Xóa DN |
| `POST` | `/api/Admin/companies/import` | Import Excel |
| `GET` | `/api/Admin/companies/import/template` | Tải template |
| `GET` | `/api/Admin/companies/export` | Xuất Excel |

### 3.5. Semesters (`/api/Admin/semesters`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Admin/semesters` | Danh sách học kỳ |
| `GET` | `/api/Admin/semesters/{id}` | Chi tiết học kỳ |
| `POST` | `/api/Admin/semesters` | Tạo học kỳ mới |
| `PUT` | `/api/Admin/semesters/{id}` | Cập nhật học kỳ |
| `DELETE` | `/api/Admin/semesters/{id}` | Xóa học kỳ |
| `POST` | `/api/Admin/semesters/{id}/close` | Đóng học kỳ |

### 3.6. Assignments (`/api/Admin/assignments`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Admin/assignments` | Danh sách phân công |
| `GET` | `/api/Admin/assignments/by-lecturer/{id}` | Phân công theo GV |
| `POST` | `/api/Admin/assignments` | Bulk assign (lecturerId + studentIds[]) |
| `DELETE` | `/api/Admin/assignments` | Hủy phân công |
| `GET` | `/api/Admin/assignments/history` | Lịch sử phân công |
| `POST` | `/api/Admin/assignments/auto` | Tự động phân công |
| `GET` | `/api/Admin/assignments/export` | Xuất Excel |
| `GET` | `/api/Admin/assignments/template` | Tải template import |
| `POST` | `/api/Admin/assignments/import` | Import phân công |
| `GET` | `/api/Admin/assignments/company-allocation` | Phân bổ DN |
| `POST` | `/api/Admin/assignments/company-allocation/import` | Import phân bổ DN |
| `GET` | `/api/Admin/assignments/company-allocation/export` | Xuất phân bổ DN |
| `GET` | `/api/Admin/assignments/company-allocation/template` | Template phân bổ DN |

### 3.7. Account Requests (`/api/Admin/account-requests`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Admin/account-requests` | Danh sách yêu cầu |
| `POST` | `/api/Admin/account-requests/{id}/process` | Xử lý yêu cầu (approve/reject/need_info) |

### 3.8. Rubrics (`/api/Admin/semesters/{id}/rubric`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Admin/semesters/{id}/rubric` | Lấy rubric |
| `POST` | `/api/Admin/semesters/{id}/rubric` | Tạo rubric (save/apply tức thì, trạng thái Approved) |
| `PUT` | `/api/Admin/semesters/{id}/rubric` | Cập nhật rubric (giữ trạng thái Approved) |
| `DELETE` | `/api/Admin/semesters/{id}/rubric` | Xóa rubric |

### 3.9. Notifications (`/api/Admin/notifications`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Admin/notifications` | Danh sách chiến dịch |
| `POST` | `/api/Admin/notifications/broadcast` | Phát thông báo (all/student/lecturer) |
| `DELETE` | `/api/Admin/notifications/campaign` | Xóa chiến dịch |

### 3.10. Settings (`/api/Admin/settings`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Admin/settings` | Lấy cấu hình |
| `PUT` | `/api/Admin/settings` | Cập nhật cấu hình |
| `POST` | `/api/Admin/settings/reset` | Reset về mặc định |

### 3.11. Dashboard & Stats

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Admin/internship-stats` | Thống kê thực tập |
| `POST` | `/api/Admin/email/test` | Test email SMTP |

---

## 4. Nhóm API Giảng Viên (`/api/Lecturer`) — 25+ Endpoints

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Lecturer/me` | Hồ sơ cá nhân |
| `GET` | `/api/Lecturer/dashboard` | Thống kê tổng quan |
| `GET` | `/api/Lecturer/stats` | Thống kê chi tiết |
| `GET` | `/api/Lecturer/students` | Danh sách SV phân công |
| `GET` | `/api/Lecturer/companies` | Danh sách DN của SV |
| `GET` | `/api/Lecturer/internships` | Danh sách thực tập |
| `GET` | `/api/Lecturer/internships/{id}` | Chi tiết thực tập |
| `GET` | `/api/Lecturer/internships/{id}/submissions` | Bài nộp của thực tập |
| `PUT` | `/api/Lecturer/internships/{id}/notes` | **Lưu ghi chú SV** (mới) |
| `POST` | `/api/Lecturer/students/notify` | **Gửi thông báo hàng loạt** (mới) |
| `POST` | `/api/Lecturer/submissions/{id}/feedback` | Gửi feedback bài nộp |
| `GET` | `/api/Lecturer/weekly-reports` | Danh sách báo cáo tuần |
| `GET` | `/api/Lecturer/weekly-reports/{id}` | Chi tiết báo cáo tuần |
| `POST` | `/api/Lecturer/weekly-reports/{id}/review` | Duyệt/từ chối báo cáo tuần |
| `GET` | `/api/Lecturer/evaluations` | Danh sách đánh giá |
| `GET` | `/api/Lecturer/evaluations/internship/{id}` | Đánh giá theo thực tập |
| `POST` | `/api/Lecturer/evaluations` | Tạo đánh giá |
| `PUT` | `/api/Lecturer/evaluations/{id}` | Cập nhật đánh giá |
| `POST` | `/api/Lecturer/evaluations/{id}/finalize` | Khóa điểm |
| `PUT` | `/api/Lecturer/evaluation/{id}/scores` | Lưu điểm rubric chi tiết |
| `GET` | `/api/Lecturer/evaluation/{id}/scores` | Xem điểm rubric |
| `POST` | `/api/Lecturer/evaluation/scores` | Lưu điểm rubric (tự tạo đánh giá nếu chưa có) |
| `GET` | `/api/Lecturer/documents` | Danh sách tài liệu |
| `POST` | `/api/Lecturer/documents/upload` | Upload tài liệu |
| `GET` | `/api/Lecturer/documents/{id}/download` | Tải tài liệu |
| `GET` | `/api/Lecturer/rubric` | Xem rubric được phê duyệt |
| `GET` | `/api/Lecturer/export/end-of-term` | Xuất Excel tổng hợp |
| `GET` | `/api/Lecturer/export/end-of-term/pdf` | Xuất PDF tổng hợp |
| `GET` | `/api/Lecturer/export/evaluation/{id}/pdf` | Xuất PDF đánh giá SV |
| `GET` | `/api/Lecturer/analytics/weekly-trend` | Xu hướng tuần |
| `GET` | `/api/Lecturer/analytics/grade-distribution` | Phân bố điểm |
| `GET` | `/api/Lecturer/analytics/company-stats` | Thống kê theo DN |
| `GET` | `/api/Lecturer/analytics/activity-stats` | Thống kê hoạt động |
| `POST` | `/api/Lecturer/ai/generate-comment` | Tạo nhận xét AI (template) |

---

## 5. Nhóm API Sinh Viên (`/api/StudentPortal`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/StudentPortal/me` | Hồ sơ cá nhân + thực tập |
| `GET` | `/api/StudentPortal/internship-certificate` | **Tải PDF chứng nhận thực tập** (mới) |

---

## 6. Nhóm API Bài Nộp (`/api/Submission`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Submission/{id}` | Chi tiết bài nộp |
| `GET` | `/api/Submission/mine` | Bài nộp của tôi |
| `GET` | `/api/Submission/internship/{id}` | Bài nộp theo thực tập |
| `POST` | `/api/Submission` | Tạo bài nộp mới |
| `POST` | `/api/Submission/upload` | Upload bài nộp (multipart) |
| `POST` | `/api/Submission/{id}/resubmit` | Nộp lại |
| `POST` | `/api/Submission/{id}/resubmit-upload` | Nộp lại với file |
| `GET` | `/api/Submission/{id}/download` | Tải file bài nộp |
| `PATCH` | `/api/Submission/{id}/status` | Cập nhật trạng thái |
| `DELETE` | `/api/Submission/{id}` | Xóa mềm |
| `GET` | `/api/Submission/{id}/feedbacks` | Danh sách feedback |
| `POST` | `/api/Submission/{id}/feedback` | Thêm feedback (GV) |
| `POST` | `/api/Submission/{id}/student-reply` | **Sinh viên phản hồi** (mới) |

---

## 7. Nhóm API Báo Cáo Tuần (`/api/WeeklyReport`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/WeeklyReport/{id}` | Chi tiết báo cáo |
| `GET` | `/api/WeeklyReport/mine` | Báo cáo của tôi |
| `GET` | `/api/WeeklyReport/internship/{id}` | Báo cáo theo thực tập |
| `POST` | `/api/WeeklyReport` | Tạo báo cáo mới |
| `PUT` | `/api/WeeklyReport/{id}` | Cập nhật báo cáo |
| `POST` | `/api/WeeklyReport/{id}/submit` | Nộp báo cáo |
| `POST` | `/api/WeeklyReport/{id}/review` | Duyệt/từ chối |
| `DELETE` | `/api/WeeklyReport/{id}` | Xóa mềm |

---

## 8. Nhóm API Đánh Giá (`/api/Evaluation`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Evaluation` | Danh sách đánh giá |
| `GET` | `/api/Evaluation/{id}` | Chi tiết đánh giá |
| `GET` | `/api/Evaluation/internship/{id}` | Đánh giá theo thực tập |
| `POST` | `/api/Evaluation` | Tạo đánh giá |
| `PUT` | `/api/Evaluation/{id}` | Cập nhật đánh giá |
| `POST` | `/api/Evaluation/{id}/finalize` | Khóa điểm |

---

## 9. Nhóm API Xuất File (`/api/Export`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Export/internship-excel` | Xuất danh sách thực tập Excel |
| `GET` | `/api/Export/summary-report` | Xuất báo cáo tổng kết Excel |
| `GET` | `/api/Export/summary-report/word` | Xuất báo cáo tổng kết Word |

---

## 10. Nhóm API Tài Liệu (`/api/Document`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Document` | Danh sách tài liệu |
| `GET` | `/api/Document/internship/{id}` | Tài liệu theo thực tập |
| `POST` | `/api/Document/upload` | Upload tài liệu (multipart) |
| `PUT` | `/api/Document/{id}` | Cập nhật tài liệu |
| `DELETE` | `/api/Document/{id}` | Xóa tài liệu |
| `GET` | `/api/Document/{id}/download` | Tải file |

---

## 11. Nhóm API Thông Báo (`/api/Notification`)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/api/Notification/mine` | Thông báo của tôi |
| `POST` | `/api/Notification/mark-read/{id}` | Đánh dấu đã đọc |
| `POST` | `/api/Notification/mark-all-read` | Đánh dấu tất cả đã đọc |

---

## 12. Kết Nối Real-Time SignalR Hub

- **URL Hub**: `ws://localhost:7109/hubs/notifications` (kèm `access_token` query string)
- **Client Listeners**:
  - `ReceiveNotification(NotificationDto notification)`: Nhận thông báo tức thời
