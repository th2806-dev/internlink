<!-- LEGACY: bộ tài liệu thiết kế ban đầu. Bản CẬP NHẬT theo code nằm ở docs/current/ — ưu tiên dùng docs/current/. -->
<!-- STATUS: LEGACY -->

# InternLink — Đặc Tả Yêu Cầu Phần Mềm (SRS)

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 4.1  
**Ngày cập nhật:** Tháng 9/2026

---

## 1. Giới thiệu

Tài liệu đặc tả toàn bộ yêu cầu chức năng (FR) và phi chức năng (NFR) của hệ thống InternLink v1.0.

---

## 2. Tác nhân (Actors)

1. **SuperAdmin**: Quản trị hệ thống — cấu hình cấp toàn trường (khoá/bộ môn, cài đặt, tài khoản Admin khoa, duyệt yêu cầu TK), dashboard giám sát **read-only**. Không tham gia thao tác nghiệp vụ SV thực tập tại doanh nghiệp (không import SV/GV/DN, không phân công, không chấm điểm hay duyệt báo cáo).
2. **DepartmentAdmin**: Quản trị khoa — toàn quyền thao tác nghiệp vụ trong phạm vi khoa: import SV/GV/DN, phân công hướng dẫn, rubric/biểu mẫu, broadcast, CRUD học kỳ.
3. **Lecturer**: Giảng viên hướng dẫn — quản lý SV được phân công, chấm điểm, xuất báo cáo.
4. **Student**: Sinh viên thực tập — nộp báo cáo, xem điểm, phản hồi.
5. **System**: Xử lý nền — Email SMTP, SignalR, PDF/Excel engine.

---

## 3. Yêu cầu Chức năng (Functional Requirements)

### 3.1. Xác thực & Hồ sơ (5 FR)

| Mã | Chức năng | Mô tả |
|:---|:---|:---|
| FR-AUTH-01 | Đăng nhập | JWT Access Token (60 phút) + Refresh Token (7 ngày) |
| FR-AUTH-02 | Phân quyền RBAC | Policy: `RequireSuperAdmin`, `RequireDepartmentAdmin`, `RequireLecturerOrDepartmentAdmin` (ghi nghiệp vụ — **SuperAdmin bị loại**), `RequireLecturerOrAdmin` (đọc/giám sát), `RequireLecturer`, `RequireStudent` |
| FR-AUTH-03 | Đổi mật khẩu lần đầu | MustChangePassword = true |
| FR-AUTH-04 | Quên mật khẩu | Token 15 phút + Email link |
| FR-AUTH-05 | Hồ sơ cá nhân | Xem + cập nhật thông tin |

### 3.2. Admin Module (16 FR)

> **Ranh giới vai trò:** **SuperAdmin** = quản trị hệ thống cấp toàn trường (cấu hình, tài khoản Admin khoa, giám sát read-only). **DepartmentAdmin** = chủ sở hữu toàn bộ thao tác nghiệp vụ trong khoa. SuperAdmin **không** tham gia import SV/GV/DN, phân công, broadcast hay chấm/duyệt dữ liệu thực tập.

| Mã | Chức năng | Mô tả | Chủ sở hữu |
|:---|:---|:---|:---|
| FR-ADM-01 | Quản lý Học kỳ | CRUD + Close + Duplicate | DepartmentAdmin (SuperAdmin chỉ đọc) |
| FR-ADM-02 | Quản lý Users | CRUD + Reset password + **Lock/Unlock** | SuperAdmin (toàn cục) + DepartmentAdmin (trong khoa) |
| FR-ADM-03 | Import Sinh viên | Excel import + auto-create accounts | DepartmentAdmin |
| FR-ADM-04 | Import Giảng viên | Excel import + auto-create accounts | DepartmentAdmin |
| FR-ADM-05 | Import Doanh nghiệp | Excel import | DepartmentAdmin |
| FR-ADM-06 | Phân công Hướng dẫn | **Bulk/Auto assign** + Company allocation | DepartmentAdmin |
| FR-ADM-07 | **Yêu cầu Tài khoản** | Request Queue + **Provision tự động** (kể cả duyệt TK Admin khoa) | SuperAdmin |
| FR-ADM-08 | **Tạo Rubric** | Dynamic rubric với tiêu chí tùy chỉnh | SuperAdmin + DepartmentAdmin |
| FR-ADM-09 | **Quản lý Rubric** | Save/Update rubric; hệ thống áp dụng ngay và lưu trạng thái Approved | SuperAdmin + DepartmentAdmin |
| FR-ADM-10 | Phát Thông báo | Broadcast trong khoa | DepartmentAdmin |
| FR-ADM-11 | Cấu hình Hệ thống | Settings CRUD + Reset | SuperAdmin |
| FR-ADM-12 | Dashboard Tổng quan | KPI, Charts, Action items | SuperAdmin (giám sát) + DepartmentAdmin (vận hành) |
| FR-ADM-13 | Xuất Excel | Danh sách SV/GV/DN | DepartmentAdmin |
| FR-ADM-14 | Xuất Phân công | Ma trận phân công | DepartmentAdmin |
| FR-ADM-15 | Test Email SMTP | Kiểm tra cấu hình | SuperAdmin |
| FR-ADM-16 | **Quản lý Khoa/Bộ môn** | CRUD khoa — SuperAdmin cấp toàn trường, gán Admin khoa theo khoa | SuperAdmin |

### 3.3. Lecturer Module (12 FR)

| Mã | Chức năng | Mô tả |
|:---|:---|:---|
| FR-LEC-01 | Dashboard | KPI, Action items, Weekly trends |
| FR-LEC-02 | Danh sách SV | Filter, Search, Sort |
| FR-LEC-03 | **Lưu Ghi chú SV** | Notes qua `PUT /internships/{id}/notes` |
| FR-LEC-04 | **Bulk Notify SV** | Gửi thông báo theo scope giảng viên |
| FR-LEC-05 | Duyệt Báo cáo tuần | Approve/Reject + Comment |
| FR-LEC-06 | Review Submission | Duyệt bài nộp + Feedback |
| FR-LEC-07 | Chấm điểm Rubric | Dynamic rubric evaluation |
| FR-LEC-08 | Khóa điểm | Finalize evaluation |
| FR-LEC-09 | Xuất Excel | Bảng tổng hợp cuối kỳ |
| FR-LEC-10 | Xuất PDF | Báo cáo + Phiếu đánh giá |
| FR-LEC-11 | Quản lý Tài liệu | Upload, Download, Archive |
| FR-LEC-12 | Phản hồi Thông báo | Reply notification |

> **Lưu ý phân quyền:** Các FR ghi dữ liệu của GVHD (FR-LEC-03 → FR-LEC-08, FR-LEC-11) dùng policy `RequireLecturerOrDepartmentAdmin` — **SuperAdmin không gọi được**; SuperAdmin chỉ xem/giám sát qua `RequireLecturerOrAdmin`.

### 3.4. Student Module (10 FR)

| Mã | Chức năng | Mô tả |
|:---|:---|:---|
| FR-STU-01 | Dashboard | Tiến độ, Tasks, Feedback |
| FR-STU-02 | Kỳ thực tập | Timeline, Weekly plan, Company info |
| FR-STU-03 | Nộp Báo cáo tuần | CRUD + Submit |
| FR-STU-04 | Nộp Bài nộp | Upload + Resubmit |
| FR-STU-05 | **Phản hồi Feedback** | Student reply qua `POST /student-reply` |
| FR-STU-06 | **Tải PDF Chứng nhận** | `GET /internship-certificate` |
| FR-STU-07 | Xem Điểm đánh giá | Scores + Final grade |
| FR-STU-08 | Tải Biểu mẫu | Document library |
| FR-STU-09 | Quản lý Thông báo | Mark read, Real-time |
| FR-STU-10 | Đổi mật khẩu | Change password |

---

## 4. Yêu cầu Phi chức năng (NFR)

### 4.1. Hiệu năng
- NFR-PERF-01: API response < 300ms (truy vấn thường)
- NFR-PERF-02: Xuất file < 1.5s cho 100 SV
- NFR-PERF-03: Hỗ trợ 200 concurrent users

### 4.2. Bảo mật
- NFR-SEC-01: PBKDF2 100.000 iterations + Salt 128-bit
- NFR-SEC-02: JWT HMAC-SHA256 + Refresh Token
- NFR-SEC-03: Phân quyền tài nguyên (student chỉ xem của mình)
- NFR-SEC-04: Soft Delete bảo vệ lịch sử

### 4.3. Độ tin cậy
- NFR-REL-01: Availability 99.5%
- NFR-REL-02: Logging middleware chi tiết
- NFR-REL-03: Docker Persistent Volume

### 4.4. Tương thích
- NFR-UI-01: Responsive Design (Desktop, Laptop, Tablet)
- NFR-UI-02: Tiếng Việt UTF-8
