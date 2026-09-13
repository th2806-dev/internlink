# InternLink — Tầm Nhìn & Phạm Vi Dự Án (Vision & Scope)

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 4.0  
**Ngày cập nhật:** Tháng 9/2026  
**Trạng thái:** v1.0 Release — Sẵn sàng vận hành học kỳ

---

## 1. Giới thiệu Tổng quan (Executive Summary)

**InternLink** là nền tảng quản lý và giám sát thực tập tốt nghiệp toàn diện dành cho Khoa Công nghệ Thông tin, số hóa 100% quy trình kết nối giữa 3 chủ thể:

1. **Ban Quản trị Khoa (SuperAdmin)**: Quản lý học kỳ, danh mục doanh nghiệp, import hàng loạt danh sách SV/GV bằng Excel, phân công hướng dẫn, quản lý yêu cầu tài khoản, quản lý rubric đánh giá (save/apply tức thì), phát thông báo broadcast.
2. **Giảng viên hướng dẫn (Lecturer)**: Theo dõi tiến độ sinh viên, duyệt báo cáo tuần, phản hồi bài nộp, chấm điểm rubric, lưu ghi chú SV, gửi thông báo hàng loạt, xuất báo cáo PDF/Excel.
3. **Sinh viên thực tập (Student)**: Theo dõi tiến độ thực tập, nộp báo cáo tuần, nộp bài nộp sản phẩm, phản hồi 2 chiều với GV, xem điểm đánh giá, tải PDF chứng nhận thực tập.

---

## 2. Bối cảnh & Vấn đề Thực tế (Problem Statement)

| Vấn đề thực tế (Pain Points) | Hậu quả | Giải pháp của InternLink |
|:---|:---|:---|
| **P1. Dữ liệu phân tán** | Danh sách SV lưu trên Excel, nộp bài qua Email/Zalo | Tập trung vào CSDL SQL Server duy nhất |
| **P2. Khó theo dõi tiến độ** | GVHD không nắm SV nào nợ báo cáo | Dashboard tuần + thông báo real-time |
| **P3. Quản lý phiên bản nộp bài** | SV gửi nhiều file qua email gây thất lạc | Hệ thống Submission đa phiên bản |
| **P4. Tổng hợp điểm thủ công** | Mất 1-2 tuần tổng hợp điểm từ phiếu giấy | Tự động tính điểm + xuất Excel/PDF |
| **P5. Khởi tạo tài khoản nặng nề** | Nhập liệu thủ công hàng trăm tài khoản | Import Excel + tự động tạo tài khoản |
| **P6. Không có hệ thống yêu cầu tài khoản** | SV/GV mới phải chờ Admin tạo thủ công | Account Requests + Provision tự động |
| **P7. Không có rubric chuẩn hóa** | Mỗi GV chấm theo tiêu chí riêng | Dynamic Rubric Editor + save/apply Approved tức thì |

---

## 3. Mục tiêu của Hệ thống (System Goals)

- **G1. Tự động hóa 90% quy trình hành chính**: Import/Export Excel, auto-assign, bulk operations.
- **G2. Tăng cường tương tác 2 chiều**: SignalR real-time, feedback submission, student reply.
- **G3. Đảm bảo minh bạch học thuật**: Rubric 4 tiêu chí, save/apply tức thì, audit trail.
- **G4. Bảo mật & 0đ Cloud**: Local Docker Volume, JWT + Refresh Token, PBKDF2.

---

## 4. Phạm vi Sản phẩm (Product Scope) — v1.0

### 4.1. Phân hệ Admin (12 trang)
- Dashboard thống kê tổng quan với Charts
- Quản lý Học kỳ (CRUD + Close + Duplicate + Rubric Editor)
- Phân công Hướng dẫn (Bulk/Auto assign, Company Allocation, Import/Export)
- Quản lý Sinh viên/Giảng viên/Doanh nghiệp (CRUD + Import/Export Excel)
- Quản lý Tài khoản (CRUD + Reset password + Lock/Unlock)
- Yêu cầu & Cấp phát Tài khoản (Request Queue + Provision)
- Quản lý Rubric (save/apply tức thì, Approved ngay)
- Thông báo Broadcast (Campaign history + Delete)
- Cấu hình Hệ thống

### 4.2. Phân hệ Lecturer (10 trang)
- Dashboard (Stats, Action Items, Deadlines, Weekly Trends)
- Danh sách SV (Filter, Comment save, Bulk notify, Bulk export)
- Danh sách Doanh nghiệp (Read-only)
- Templates/Tài liệu (Upload, Download, Archive)
- Đánh giá Rubric (Dynamic rubric evaluation, Scores, Finalize)
- Xuất file (Excel + PDF)
- Báo cáo (Duyệt weekly reports + Submission review)
- Analytics (Thống kê nâng cao)
- Thông báo (Notification inbox + Reply)
- Tài khoản cá nhân

### 4.3. Phân hệ Student (9 trang)
- Dashboard (Progress, Tasks, Feedback, Milestones)
- Kỳ thực tập (Timeline, Weekly Plan, Company info)
- Báo cáo tuần (CRUD + Submit + Review)
- Bài nộp (Upload, Resubmit, Download, Student Reply)
- Phản hồi (Feedback thread 2 chiều)
- Templates (Document library)
- Đánh giá (View scores + Final grade)
- Thông báo (Real-time via SignalR)
- Tài khoản cá nhân

---

## 5. Công nghệ Sử dụng (Technology Stack)

| Thành phần | Công nghệ | Phiên bản |
|:---|:---|:---|
| Frontend | React + TypeScript + Vite | React 19 |
| CSS | Tailwind CSS | v4 |
| Backend | ASP.NET Core Web API | .NET 8 |
| ORM | Entity Framework Core | 8.x |
| Database | Microsoft SQL Server | 2022 |
| PDF | Custom IPdfExportService | — |
| Excel | ClosedXML | — |
| Email | MailKit (SMTP Gmail) | — |
| Auth | JWT Bearer + Refresh Token | — |
| Real-time | SignalR Core | — |
| Container | Docker + Docker Compose | — |

---

## 6. Giới hạn & Định hướng Phát triển (Future Roadmap)

- **v1.0 (Hiện tại)**: Nghiệp vụ lõi hoàn chỉnh cho 50-500 SV, vận hành 1 học kỳ.
- **v1.1 (Post-semester)**: Floating AI Assistant (tóm tắt báo cáo, gợi ý nhận xét).
- **v2.0 (Mở rộng)**: Enterprise Portal cho Mentor DN, SSO với hệ thống Đào tạo, Cloud Storage.
