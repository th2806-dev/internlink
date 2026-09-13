# Sơ Đồ Kiến Trúc Tổng Thể (Overall System Architecture)

**Dự án:** InternLink — Nền tảng Quản lý & Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 4.0  
**Kiến trúc:** Client-Server SPA & Web API Phân Tầng

---

```mermaid
flowchart TB
    subgraph Users["Các Tác Nhân Người Dùng (Actors)"]
        SA["SuperAdmin<br/>(Quản trị viên Khoa)"]
        L["Lecturer<br/>(Giảng viên hướng dẫn)"]
        S["Student<br/>(Sinh viên thực tập)"]
    end

    subgraph Frontend["Tầng Trình Diễn (Frontend Layer - Port 5173)"]
        direction TB
        F_ADMIN["Admin Portal<br/>- Quản lý Học kỳ, Users<br/>- Import Excel & Phân công<br/>- Duyệt tài khoản & Rubric"]
        F_LEC["Lecturer Portal<br/>- Dashboard & Danh sách SV<br/>- Duyệt nhật ký & Đồ án<br/>- Chấm điểm Rubric<br/>- Ghi chú & Thông báo hàng loạt<br/>- Xuất PDF & Excel"]
        F_STU["Student Portal<br/>- Dashboard & Tiến độ<br/>- Nộp báo cáo tuần & Đồ án<br/>- Phản hồi bài nộp<br/>- Tải phiếu thực tập PDF<br/>- Xem điểm số & Nhận xét"]
        F_CORE["Core Engine<br/>React 19 + TypeScript + Tailwind 4 + Vite"]
    end

    subgraph Gateway["Cổng Kết Nối & Bảo Mật"]
        JWT_GUARD["JWT Bearer Token Guard<br/>(HMAC-SHA256 & RBAC Policy)<br/>+ Refresh Token (DB Persisted)"]
    end

    subgraph Backend["Tầng Xử Lý Nghiệp Vụ (Backend Web API - Port 7109)"]
        direction TB
        API_CTRL["RESTful API Controllers<br/>25 Controllers: Auth, Admin*, Lecturer*,<br/>StudentPortal, Submission, WeeklyReport,<br/>Evaluation, Export, Document, Notification..."]
        APP_SVC["Application Business Services<br/>Auth, Semester, Assignment, Rubric,<br/>Notification, PDF Export, Excel Export"]
        SIG_HUB["SignalR Core Real-time Hub<br/>/hubs/notifications"]
        
        subgraph Engines["Bộ Xử Lý Chuyên Biệt"]
            PDF_GEN["Server-side Binary PDF Engine<br/>(Phiếu thực tập, Bảng tổng hợp A4)"]
            XLSX_GEN["ClosedXML Excel Engine<br/>(Import/Export danh sách, Bảng điểm)"]
            MAIL_SVC["MailKit SMTP Dispatcher<br/>(Gmail App Password)"]
        end
    end

    subgraph Data["Tầng Lưu Trữ Bền Vững (Data Persistence Layer)"]
        direction TB
        DB_SQL[("Microsoft SQL Server 2022<br/>18 Bảng Thực Thể, EF Core 8,<br/>Soft Delete, Audit Fields & Indexing")]
        STORAGE_VOL[("Docker Persistent Volume<br/>/app/uploads/documents")]
    end

    SA --> F_ADMIN
    L --> F_LEC
    S --> F_STU

    F_ADMIN --> F_CORE
    F_LEC --> F_CORE
    F_STU --> F_CORE

    F_CORE -->|HTTP/RESTful API + JWT| JWT_GUARD
    F_CORE -.->|WebSocket / WSS Connection| SIG_HUB

    JWT_GUARD --> API_CTRL

    API_CTRL --> APP_SVC
    APP_SVC --> PDF_GEN
    APP_SVC --> XLSX_GEN
    APP_SVC --> MAIL_SVC
    APP_SVC -.->|Push Notifications| SIG_HUB

    APP_SVC --> DB_SQL
    APP_SVC --> STORAGE_VOL
    MAIL_SVC -->|SMTP Port 587| GMAIL_EXT["Google SMTP Server<br/>(internlink.cntt@gmail.com)"]
```

---

## 📌 Đặc Điểm Nổi Bật Của Kiến Trúc

1. **Phân quyền 3 vai trò chặt chẽ (RBAC)**: SuperAdmin, Lecturer, Student — mỗi vai trò có bộ endpoint và giao diện riêng biệt, kiểm soát qua JWT Claims + Policy.
2. **Xử lý tài liệu Server-side**: PDF và Excel được tạo trực tiếp từ Backend (QuestPDF, ClosedXML), đảm bảo chuẩn mực và bảo mật dữ liệu.
3. **Hệ thống tài khoản linh hoạt**: Bao gồm luồng Account Requests (Admin duyệt cấp tài khoản) và Rubric Management (Admin save/apply rubric, hệ thống giữ Approved ngay).
4. **Thao tác phản hồi 2 chiều**: Giảng viên ghi chú sinh viên (`/notes`), gửi thông báo hàng loạt scoped (`/notify`); Sinh viên phản hồi bài nộp (`/student-reply`).
5. **Chi phí vận hành tối ưu**: Docker Volume cục bộ, không phụ thuộc dịch vụ cloud bên ngoài.

---

## 📌 Bo Khoang Cong Nghe (Tech Stack Summary)

| Tầng | Công nghệ | Phiên bản |
|:---|:---|:---|
| Frontend | React, TypeScript, Tailwind CSS, Vite | 19, 5.x, 4.x, 6.x |
| Backend | ASP.NET Core Web API, Clean Architecture | 8.0 |
| ORM | Entity Framework Core | 8.0 |
| Database | Microsoft SQL Server | 2022 |
| Auth | JWT Bearer Token + Refresh Token | - |
| Real-time | SignalR Core | 8.0 |
| PDF | QuestPDF / iTextSharp | - |
| Excel | ClosedXML | - |
| Email | MailKit (SMTP Gmail) | - |
| Container | Docker + Docker Compose | - |
