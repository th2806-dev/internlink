# InternLink — Documentation Index

**Trạng thái:** Bộ tài liệu hiện hành
**Ngày kiểm tra:** 2026-09-08
**Nguồn chuẩn:** mã nguồn, cấu hình runtime và migrations hiện tại

> Các tài liệu đánh số cũ trong thư mục này được giữ để tham khảo lịch sử. Đặc tả hiện hành nằm trong [`current/`](current/README.md). Không dùng các số liệu cũ về .NET 8, 25 controllers, 18 bảng hoặc 34 routes.

---

## Tài liệu hiện hành

| File | Nội dung |
|:---|:---|
| [`current/README.md`](current/README.md) | Baseline implementation và quy ước đọc tài liệu |
| [`current/01-Architecture.md`](current/01-Architecture.md) | Kiến trúc runtime và cấu trúc source |
| [`current/02-Frontend-Routes.md`](current/02-Frontend-Routes.md) | Route tree và phân quyền portal |
| [`current/03-API-Reference.md`](current/03-API-Reference.md) | Controller/endpoint inventory |
| [`current/04-Domain-Model.md`](current/04-Domain-Model.md) | Entity, quan hệ và state |
| [`current/05-Database.md`](current/05-Database.md) | Schema, migration và index |
| [`current/06-Storage.md`](current/06-Storage.md) | Upload, volume, backup và retention |
| [`current/07-Development.md`](current/07-Development.md) | Setup, build, test và migration |
| [`current/08-Operations.md`](current/08-Operations.md) | Docker, healthcheck, logging và sự cố |
| [`current/09-Demo-Accounts.md`](current/09-Demo-Accounts.md) | Seed account và dữ liệu demo |
| [`current/10-Documentation-Maintenance.md`](current/10-Documentation-Maintenance.md) | Quy trình cập nhật docs |

## Tài liệu lịch sử

| # | File | Nội dung | Phiên bản |
|:---:|:---|:---|:---:|
| 01 | [`01-Vision-Scope.md`](01-Vision-Scope.md) | Tầm nhìn & Phạm vi dự án | 4.0 |
| 02 | [`02-Software-Requirements-Specification.md`](02-Software-Requirements-Specification.md) | Đặc tả Yêu cầu Phần mềm (SRS) | 4.0 |
| 03 | [`03-Business-Workflow.md`](03-Business-Workflow.md) | Quy trình Nghiệp vụ 5 giai đoạn | 4.0 |
| 04 | [`04-Use-Case-Specification.md`](04-Use-Case-Specification.md) | Đặc tả Use Cases (37 UC) | 4.0 |
| 05 | [`05a-Domain-Model.md`](05a-Domain-Model.md) | Mô hình Miền (18 Entities) | 4.0 |
| 06 | [`05b-Entity-Relationship-Diagram.md`](05b-Entity-Relationship-Diagram.md) | Sơ đồ ERD (18 Bảng) | 4.0 |
| 07 | [`05c-Data-Dictionary.md`](05c-Data-Dictionary.md) | Từ điển Dữ liệu chi tiết | 4.0 |
| 08 | [`05d-Database-Design.md`](05d-Database-Design.md) | Thiết kế CSDL SQL Server | 4.0 |
| 09 | [`06-System-Architecture.md`](06-System-Architecture.md) | Kiến trúc Clean Architecture | 4.0 |
| 10 | [`07a-Information-Architecture.md`](07a-Information-Architecture.md) | Sitemap 34 Routes | 4.0 |
| 11 | [`07b-Application-Flow.md`](07b-Application-Flow.md) | Luồng Hoạt động Ứng dụng | 4.0 |
| 12 | [`08-API-Specification.md`](08-API-Specification.md) | Đặc tả RESTful API (25 Controllers) | 4.0 |
| 13 | [`09-System-DevOps-Guide.md`](09-System-DevOps-Guide.md) | Hướng dẫn Vận hành & Docker | 4.0 |
| 14 | [`Demo-UI-Script.md`](Demo-UI-Script.md) | Kịch bản Demo 15 phút | 5.1 |
| 15 | [`Email-Setup-Gmail.md`](Email-Setup-Gmail.md) | Cấu hình SMTP Gmail | 3.0 |
| 16 | [`ONBOARDING.md`](ONBOARDING.md) | Hướng dẫn Nhập môn Dev | 4.1 |

---

## Snapshot hiện tại

| Thành phần | Công nghệ | Phiên bản |
|:---|:---|:---|
| Frontend | React + TypeScript + Vite | React 19 |
| CSS | Tailwind CSS | v4 |
| Backend | ASP.NET Core Web API | .NET 10 |
| ORM | Entity Framework Core | 10.x |
| Database | Microsoft SQL Server | 2022 |
| Auth | JWT Bearer + Refresh Token | — |
| Real-time | SignalR Core | — |
| Container | Docker + Docker Compose | — |

---

## 📊 Thống kê Hệ thống

| Metric | Giá trị |
|:---|:---:|
| API controllers | 26 |
| DbSet hiện tại | 23 |
| Frontend portal | 3 |
| Backend target | .NET 10 |
| Database | SQL Server 2022 |
| Docker web entrypoint | `http://localhost:3000` |

---

## 🎯 Phân Quyền

- **SuperAdmin**: Quản lý học kỳ, users, assignments, notifications, settings
- **Lecturer**: Dashboard, students, reports, evaluations, export
- **Student**: Dashboard, internship, weekly reports, submissions, feedback

Chi tiết và giới hạn đã kiểm chứng nằm trong [`current/README.md`](current/README.md).
