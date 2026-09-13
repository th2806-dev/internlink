# InternLink — Danh Mục Sơ Đồ Kỹ Thuật (Architecture & Flow Diagrams)

Thư mục này chứa toàn bộ mã nguồn sơ đồ chuẩn hóa bằng **Mermaid Markdown** và hình ảnh thiết kế phục vụ công tác báo cáo đồ án, thuyết trình và nghiệm thu kỹ thuật.

**Phiên bản:** 4.0

---

## 📑 Danh Mục Sơ Đồ Theo Phân Loại

### 1. Kiến Trúc Hệ Thống (`/docs/images/architecture/`)
| Tên Sơ Đồ | File Nguồn | Mô Tả Nội Dung |
|:---|:---|:---|
| **Tổng quan Kiến trúc** | [`overall-architecture.md`](architecture/overall-architecture.md) | Sơ đồ tương tác 3 tác nhân, React 19, .NET 8, SQL Server 2022, 18 bảng, 25 Controllers. |
| **Phân tầng Backend** | [`backend-layer.md`](architecture/backend-layer.md) | Clean Architecture 5 tầng: API, Application, Domain, Infrastructure, Shared. 18 Entities, 15 Service Interfaces. |
| **Vòng đời Request** | [`request-lifecycle.md`](architecture/request-lifecycle.md) | Luồng HTTP Request: Middleware → JWT Auth → Controller → Service → EF Core → DB. |
| **Kiến trúc Triển khai** | [`deployment-architecture.md`](architecture/deployment-architecture.md) | Docker Container, Nginx Reverse Proxy, Volume Storage. |

---

### 2. Sơ Đồ Use Case (`/docs/images/usecase/`)
| Tên Sơ Đồ | File Nguồn | Mô Tả Nội Dung |
|:---|:---|:---|
| **Sơ đồ Use Case Toàn hệ thống** | [`usecase-diagram.md`](usecase/usecase-diagram.md) | 37 Use Cases: Admin (15), Lecturer (12), Student (10). Bao gồm Account Requests, Rubric Management, Student Reply, Bulk Notify, PDF Certificate. |

---

### 3. Quy Trình Nghiệp Vụ (`/docs/images/workflow/`)
| Tên Sơ Đồ | File Nguồn | Mô Tả Nội Dung |
|:---|:---|:---|
| **Luồng Nghiệp vụ Tổng thể** | [`overall-business-flow.md`](workflow/overall-business-flow.md) | 5 giai đoạn: Khởi tạo → Khai báo → Giám sát → Đánh giá → Tổng kết. |
| **Quy trình Hiện trạng (As-Is)** | [`as-is-workflow.md`](workflow/as-is-workflow.md) | Quy trình thủ công cũ qua Email, Zalo, giấy tờ. |
| **Quy trình Đề xuất (To-Be)** | [`to-be-workflow.md`](workflow/to-be-workflow.md) | Quy trình số hóa 100% trên InternLink. |
| **So sánh As-Is vs To-Be** | [`workflow-comparison.md`](workflow/workflow-comparison.md) | Bảng phân tích tối ưu thời gian và chi phí. |

---

### 4. Sơ Đồ Trình Tự (`/docs/images/sequence/`)
| Tên Sơ Đồ | File Nguồn | Mô Tả Nội Dung |
|:---|:---|:---|
| **Gửi Email Thư mời** | [`invitation-email.md`](sequence/invitation-email.md) | Admin import → Sinh MK → Gửi SMTP. |
| **Phân công Hướng dẫn** | [`bulk-assign.md`](sequence/bulk-assign.md) | Gán SV cho GVHD theo học kỳ. |
| **Quên & Đặt lại Mật khẩu** | [`forgot-password.md`](sequence/forgot-password.md) | Reset token → Email → Cập nhật MK. |

---

### 5. Kiến Trúc Thông Tin & Điều Hướng (`/docs/images/information-architecture/`)
| Tên Sơ Đồ | File Nguồn | Mô Tả Nội Dung |
|:---|:---|:---|
| **Cây Sơ Đồ Trang (Sitemap)** | [`sitemap.md`](information-architecture/sitemap.md) | **34 routes**: Admin 12, Lecturer 10, Student 9, Auth 4. |
| **Phân cấp Màn hình** | [`screen-hierarchy.md`](information-architecture/screen-hierarchy.md) | Cấu trúc phân cấp giao diện 3 vai trò. |
| **Điều hướng Giảng viên** | [`lecturer-navigation.md`](information-architecture/lecturer-navigation.md) | Sơ đồ điều hướng Lecturer Portal. |
| **Luồng Người dùng Giảng viên** | [`lecturer-user-flow.md`](information-architecture/lecturer-user-flow.md) | Luồng duyệt bài & chấm điểm. |
| **Điều hướng Sinh viên** | [`student-navigation.md`](information-architecture/student-navigation.md) | Sơ đồ điều hướng Student Portal. |
| **Luồng Người dùng Sinh viên** | [`student-user-flow.md`](information-architecture/student-user-flow.md) | Luồng nộp nhật ký & đồ án. |

---

### 6. Luồng Ứng Dụng Chi Tiết (`/docs/images/application-flow/`)
Tập hợp 16 kịch bản luồng thao tác màn hình cụ thể:
- **Admin**: `admin-import-invite.md`, `admin-bulk-assign.md`...
- **Lecturer**: `lecturer-login.md`, `lecturer-manage-students.md`, `lecturer-review-report.md`, `lecturer-review-submission.md`, `lecturer-evaluation.md`, `lecturer-manage-company.md`, `lecturer-upload-document.md`...
- **Student**: `student-login.md`, `student-weekly-report.md`, `student-submission.md`, `student-resubmission.md`, `student-feedback.md`, `student-download-document.md`...
- **Auth**: `forgot-password.md`.

---

## 🛠️ Hướng Dẫn Xem & Xuất Sơ Đồ

1. **Xem trực tiếp trên GitHub / VSCode Markdown Preview**: Tất cả sơ đồ đều dùng cú pháp `mermaid`, render tự động.
2. **Xuất PNG / SVG**: Truy cập [Mermaid Live Editor](https://mermaid.live), paste code, chọn Download.

---

## 📌 Thống Kê Phiên Bản 4.0

| Loại | Số lượng |
|:---|:---:|
| Sơ đồ Kiến trúc | 4 |
| Sơ đồ Use Case | 1 |
| Sơ đồ Nghiệp vụ | 4 |
| Sơ đồ Trình tự | 3 |
| Sơ đồ Thông tin | 6 |
| Sơ đồ Ứng dụng | 16 |
| **Tổng** | **34** |
