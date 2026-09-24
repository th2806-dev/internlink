# InternLink — Đặc Tả Use Cases Chi Tiết (Use Case Specification)

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 4.1  
**Ngày cập nhật:** Tháng 9/2026

---

## 1. Tổng Quan Use Cases (38 Use Cases)

### Phân Hệ Admin (16 UC)

> **Ranh giới vai trò:** **SuperAdmin** = quản trị hệ thống (cấu hình cấp toàn trường, duyệt TK Admin khoa, giám sát read-only). **DepartmentAdmin** = chủ sở hữu nghiệp vụ trong khoa (import, phân công, rubric/biểu mẫu, broadcast, CRUD học kỳ). SuperAdmin không thực hiện các UC vận hành khoa và không chấm điểm/duyệt báo cáo thực tập.

| mã UC | Tên | Mô tả | Chủ sở hữu |
|:---|:---|:---|:---|
| UC-ADM-01 | Quản lý Học kỳ | CRUD, Close, Duplicate học kỳ | DepartmentAdmin (SuperAdmin chỉ đọc) |
| UC-ADM-02 | Quản lý Users | CRUD, Reset password, Lock/Unlock | SuperAdmin (toàn cục) + DepartmentAdmin (trong khoa) |
| UC-ADM-03 | Import Sinh viên | Import Excel danh sách SV | DepartmentAdmin |
| UC-ADM-04 | Import Giảng viên | Import Excel danh sách GV | DepartmentAdmin |
| UC-ADM-05 | Import Doanh nghiệp | Import Excel danh sách DN | DepartmentAdmin |
| UC-ADM-06 | Phân công Hướng dẫn | Bulk/Auto assign, Company allocation | DepartmentAdmin |
| UC-ADM-07 | Quản lý Yêu cầu TK | Duyệt/Từ chối/Cấp phát tài khoản | SuperAdmin |
| UC-ADM-08 | Tạo Rubric | Tạo/Sửa rubric đánh giá | SuperAdmin + DepartmentAdmin |
| UC-ADM-09 | Quản lý Rubric | Tạo/Sửa rubric theo admin save/apply, hệ thống giữ Approved ngay | SuperAdmin + DepartmentAdmin |
| UC-ADM-10 | Phát Thông báo | Broadcast trong khoa | DepartmentAdmin |
| UC-ADM-11 | Cấu hình Hệ thống | Settings CRUD + Reset | SuperAdmin |
| UC-ADM-12 | Dashboard Tổng quan | Thống kê KPI, Charts | SuperAdmin (giám sát) + DepartmentAdmin (vận hành) |
| UC-ADM-13 | Xuất Danh sách | Export Excel sinh viên/GV/DN | DepartmentAdmin |
| UC-ADM-14 | Xuất Phân công | Export ma trận phân công | DepartmentAdmin |
| UC-ADM-15 | Test Email SMTP | Kiểm tra cấu hình email | SuperAdmin |
| UC-ADM-16 | Quản lý Khoa/Bộ môn | CRUD khoa, gán Admin khoa — đặc quyền SuperAdmin | SuperAdmin |

### Lecturer (12 UC)

| mã UC | Tên | Mô tả |
|:---|:---|:---|
| UC-LEC-01 | Dashboard | KPI, Action items, Trends |
| UC-LEC-02 | Xem Danh sách SV | Filter, Search, Sort |
| UC-LEC-03 | Lưu Ghi chú SV | Notes qua `PUT /notes` |
| UC-LEC-04 | Bulk Notify SV | Gửi thông báo hàng loạt |
| UC-LEC-05 | Duyệt Báo cáo tuần | Approve/Reject + Comment |
| UC-LEC-06 | Review Submission | Duyệt bài nộp + Feedback |
| UC-LEC-07 | Chấm điểm Rubric | Dynamic rubric evaluation |
| UC-LEC-08 | Khóa điểm | Finalize evaluation |
| UC-LEC-09 | Xuất Excel | Bảng tổng hợp cuối kỳ |
| UC-LEC-10 | Xuất PDF | Báo cáo + Phiếu đánh giá |
| UC-LEC-11 | Quản lý Tài liệu | Upload, Download, Archive |
| UC-LEC-12 | Phản hồi Thông báo | Reply notification |

### Student (10 UC)

| mã UC | Tên | Mô tả |
|:---|:---|:---|
| UC-STU-01 | Xem Dashboard | Tiến độ, Tasks, Feedback |
| UC-STU-02 | Xem Kỳ thực tập | Timeline, Weekly plan |
| UC-STU-03 | Nộp Báo cáo tuần | CRUD + Submit |
| UC-STU-04 | Nộp Bài nộp | Upload + Resubmit |
| UC-STU-05 | Phản hồi Feedback | Student reply qua `POST /student-reply` |
| UC-STU-06 | Tải PDF Chứng nhận | `GET /internship-certificate` |
| UC-STU-07 | Xem Điểm đánh giá | Scores + Final grade |
| UC-STU-08 | Tải Biểu mẫu | Document library |
| UC-STU-09 | Quản lý Thông báo | Mark read, Real-time |
| UC-STU-10 | Đổi mật khẩu | Change password |

---

## 2. Đặc Tả Chi Tiết 5 Use Cases Trọng Tâm

### UC-ADM-07: Quản lý Yêu cầu Tài khoản

- **Tác nhân**: SuperAdmin
- **Phân quyền**: `RequireSuperAdmin` — DepartmentAdmin không được xử lý hàng đợi này (tránh tự cấp quyền tạo Admin khoa)
- **Tiền điều kiện**: Có yêu cầu từ SV/GV mới
- **Luồng chính**:
  1. SV/GV gửi yêu cầu cấp tài khoản qua form
  2. Admin xem hàng đợi yêu cầu (filter theo role, status, priority)
  3. Admin duyệt: Reset password / Mở khóa / Kích hoạt
  4. Hệ thống tự động cấp phát tài khoản + gửi email thông báo
- **Hậu điều kiện**: Tài khoản được kích hoạt, email gửi thành công

### UC-ADM-09: Quản lý Rubric (Admin Save/Apply)

- **Tác nhân**: SuperAdmin / DepartmentAdmin (admin_khoa)
- **Luồng chính**:
  1. Admin tạo hoặc cập nhật rubric với các tiêu chí (tên, trọng số, max điểm)
  2. Hệ thống lưu trực tiếp và đặt trạng thái `Approved`
  3. GVHD bắt đầu sử dụng rubric ngay sau khi save
  4. Nếu cần chỉnh sửa, admin cập nhật lại rubric và hệ thống vẫn giữ `Approved`

### UC-LEC-04: Bulk Notify Sinh viên

- **Tác nhân**: Lecturer
- **Bảo mật**: Chỉ gửi được cho SV mình hướng dẫn (scoped by JWT)
- **Luồng chính**:
  1. GVHD chọn SV từ danh sách
  2. Nhập tiêu đề + nội dung thông báo
  3. Gọi `POST /api/Lecturer/students/notify`
  4. Backend tạo notification cho từng SV qua `INotificationService`
  5. SV nhận thông báo real-time qua SignalR

### UC-STU-05: Phản hồi Feedback (Student Reply)

- **Tác nhân**: Student
- **Luồng chính**:
  1. SV xem feedback từ GVHD trên bài nộp
  2. Nhập nội dung phản hồi
  3. Gọi `POST /api/Submission/{id}/student-reply`
  4. Backend tạo Feedback record với `LecturerId = null`
  5. Backend gửi notification cho GVHD: "SV vừa phản hồi bài nộp"

### UC-STU-06: Tải PDF Chứng nhận Thực tập

- **Tác nhân**: Student
- **Luồng chính**:
  1. SV vào trang "Kỳ thực tập"
  2. Bấm "Xuất phiếu"
  3. Gọi `GET /api/StudentPortal/internship-certificate`
  4. Backend tạo PDF qua `IPdfExportService.GenerateStudentEvaluationPdfAsync()`
  5. File PDF tải về máy với tên `Phieu-Thuc-Tap-{MSSV}.pdf`
