# Quy Trình Nghiệp Vụ Tổng Thể (Overall Business Workflow) — InternLink

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 4.0  
**Giai đoạn:** 5 Giai đoạn khép kín từ Khởi tạo đến Tổng kết cuối kỳ

---

```mermaid
flowchart TD
    subgraph Phase1["GIAI ĐOẠN 1: KHỞI TẠO & PHÂN CÔNG (Khoa / SuperAdmin)"]
        A1["1.1. Tạo học kỳ mới<br/>(Đặt IsCurrent = true)"]
        A2["1.2. Import file Excel<br/>(Danh sách SV & GVHD)"]
        A3["1.3. Phân công Hướng dẫn<br/>(Manual, Auto, Bulk, Import/Export)"]
        A4["1.4. Gửi Email Thư mời<br/>(Cấp tài khoản & MK ngẫu nhiên)"]
        A5["1.5. Duyệt yêu cầu cấp tài khoản<br/>(Account Requests → Auto Provision)"]
        A6["1.6. Quản lý Rubric mẫu<br/>(Admin save/apply rubric, giữ Approved ngay)"]

        A1 --> A2
        A2 --> A3
        A3 --> A4
        A4 --> A5
        A5 --> A6
    end

    subgraph Phase2["GIAI ĐOẠN 2: KHAI BÁO NƠI THỰC TẬP (Sinh Viên)"]
        B1["2.1. Đăng nhập lần đầu<br/>& Bắt buộc đổi MK"]
        B2["2.2. Xem thông tin Doanh nghiệp<br/>(Đã được phân công)"]
        B3["2.3. Nộp báo cáo tuần<br/>(Tuần 1 - 12 kèm file minh chứng)"]
        B4["2.4. Nộp Đồ án / Báo cáo cuối kỳ<br/>(Quản lý phiên bản v1, v2, v3)"]

        B1 --> B2
        B2 --> B3
        B3 --> B4
    end

    subgraph Phase3["GIAI ĐOẠN 3: GIÁM SÁT & TRAO ĐỔI (SV & GVHD)"]
        C1["3.1. GVHD nhận thông báo<br/>& Xem xét tiến độ"]
        C2["3.2. GVHD duyệt tuần<br/>(Phê duyệt / Yêu cầu sửa)"]
        C3["3.3. Sinh viên phản hồi<br/>(Student Reply nếu cần giải trình)"]
        C4["3.4. GVHD ghi chú sinh viên<br/>(Lưu vào Internship.Notes)"]
        C5["3.5. GVHD gửi thông báo hàng loạt<br/>(POST /notify - Scoped theo SV)"]

        C1 --> C2
        C2 --> C3
        C3 --> C4
        C4 --> C5
    end

    subgraph Phase4["GIAI ĐOẠN 4: ĐÁNH GIÁ & CHẤM ĐIỂM (GVHD)"]
        D1["4.1. GVHD đánh giá Đồ án<br/>& Gửi Feedback"]
        D2["4.2. Sinh viên phản hồi Feedback<br/>(Student Reply)"]
        D3["4.3. GVHD chấm điểm Rubric<br/>(Chuyên môn, Thái độ, Kỹ năng, Báo cáo)"]
        D4["4.4. Hệ thống tự động tính<br/>& Xếp loại"]
        D5["4.5. GVHD Khóa điểm (Finalize)"]

        D1 --> D2
        D2 --> D3
        D3 --> D4
        D4 --> D5
    end

    subgraph Phase5["GIAI ĐOẠN 5: TỔNG KẾT & XUẤT BÁO CÁO"]
        E1["5.1. Xuất Bảng điểm Excel<br/>(15 cột chuẩn P.ĐT)"]
        E2["5.2. Xuất Phiếu thực tập PDF<br/>(Server-side,国 hiệu Tiêu ngữ)"]
        E3["5.3. Xuất Báo cáo tổng hợp<br/>(Admin Dashboard)"]
        E4["5.4. Lưu trữ hồ sơ<br/>(Database + Docker Volume)"]

        E1 --> E2
        E2 --> E3
        E3 --> E4
    end

    Phase1 --> Phase2
    Phase2 --> Phase3
    Phase3 --> Phase4
    Phase4 --> Phase5
```

---

## 📌 Chi Tiết Từng Giai Đoạn

### Giai đoạn 1: Khởi tạo & Phân công
| Bước | Tác nhân | Thao tác | API |
|:---|:---|:---|:---|
| 1.1 | Admin | Tạo học kỳ, đặt IsCurrent | `POST /api/Admin/semesters` |
| 1.2 | Admin | Import Excel danh sách SV, GV | `POST /api/Admin/students/import` |
| 1.3 | Admin | Phân công GVHD cho SV | `POST /api/Admin/assignments/bulk-assign` |
| 1.4 | Admin | Gửi email thư mời | `POST /api/Admin/assignments/send-emails` |
| 1.5 | Admin | Duyệt yêu cầu tài khoản | `POST /api/Admin/account-requests/{id}/process` |
| 1.6 | Admin | Quản lý rubric để chấm điểm | `POST/PUT /api/Admin/semesters/{id}/rubric` |

### Giai đoạn 2: Khai báo & Nộp bài
| Bước | Tác nhân | Thao tác | API |
|:---|:---|:---|:---|
| 2.1 | Student | Đăng nhập + Đổi MK | `POST /api/Auth/login` |
| 2.2 | Student | Xem thông tin DN | `GET /api/StudentPortal/me` |
| 2.3 | Student | Nộp báo cáo tuần | `POST /api/WeeklyReport` |
| 2.4 | Student | Nộp đồ án | `POST /api/Submission` |

### Giai đoạn 3: Giám sát & Trao đổi
| Bước | Tác nhân | Thao tác | API |
|:---|:---|:---|:---|
| 3.1 | Lecturer | Xem tiến độ | `GET /api/Lecturer/dashboard` |
| 3.2 | Lecturer | Duyệt tuần | `POST /api/WeeklyReport/{id}/review` |
| 3.3 | Student | Phản hồi bài nộp | `POST /api/Submission/{id}/student-reply` |
| 3.4 | Lecturer | Ghi chú SV | `PUT /api/Lecturer/internships/{id}/notes` |
| 3.5 | Lecturer | Notify hàng loạt | `POST /api/Lecturer/students/notify` |

### Giai đoạn 4: Đánh giá
| Bước | Tác nhân | Thao tác | API |
|:---|:---|:---|:---|
| 4.1 | Lecturer | Đánh giá đồ án | `POST /api/Submission/{id}/feedback` |
| 4.2 | Student | Phản hồi feedback | `POST /api/Submission/{id}/student-reply` |
| 4.3 | Lecturer | Chấm rubric | `POST /api/LecturerRubric/scores` |
| 4.4 | Lecturer | Finalize | `POST /api/Evaluation/{id}/finalize` |

### Giai đoạn 5: Tổng kết
| Bước | Tác nhân | Thao tác | API |
|:---|:---|:---|:---|
| 5.1 | Lecturer | Xuất Excel | `GET /api/Lecturer/export/end-of-term` |
| 5.2 | Student | Tải PDF | `GET /api/StudentPortal/internship-certificate` |
| 5.3 | Admin | Dashboard tổng hợp | `GET /api/Admin/dashboard/stats` |

---

## 📌 Lợi Ích Của Quy Trình Số Hóa

1. **Rút ngắn 90% thời gian xử lý hành chính**: Tự động hóa hoàn toàn các khâu gửi email, phân công, tổng hợp điểm.
2. **Trao đổi 2 chiều liên tục**: Giảng viên ghi chú, thông báo scoped; Sinh viên phản hồi bài nộp — tất cả lưu DB.
3. **Xuất báo cáo chuẩn mực**: PDF国 hiệu Tiêu ngữ, Excel 15 cột — Server-side, đảm bảo tính nhất quán.
4. **Minh bạch và truy vết**: Mọi thao tác đều được lưu với timestamp, version, và audit trail.
