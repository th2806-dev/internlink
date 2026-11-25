# InternLink — Documentation Index

**Trạng thái:** Bộ tài liệu hiện hành
**Ngày kiểm tra:** 2026-09-08
**Nguồn chuẩn:** mã nguồn, cấu hình runtime và migrations hiện tại

> Các tài liệu đánh số cũ trong thư mục này được giữ để tham khảo lịch sử. Đặc tả hiện hành nằm trong [`current/`](current/README.md). Không dùng các số liệu cũ về .NET 8, 25 controllers, 18 bảng hoặc 34 routes.

---

## Bộ Quy chuẩn Kỹ thuật & Đặc tả Phân hệ Chức năng (Enterprise Standard V2.0)

> **Dành cho Đội ngũ Phát triển & Soạn thảo Hồ sơ Nghiệm thu (Word/Docx):**  
> Toàn bộ tiêu chuẩn đặt tên, Clean Architecture, quy cách CSDL và đặc tả chi tiết 6 phân hệ cốt lõi được chia nhỏ thành các file `.md` độc lập, sẵn sàng chuyển đổi sang Microsoft Word (.docx) phục vụ lưu trữ và phát triển:

| Mã tài liệu | Tên tài liệu / Phân hệ | Nội dung & Nghiệp vụ cốt lõi | Liên kết file |
|:---:|:---|:---|:---:|
| **STD** | **Bộ Quy chuẩn Kỹ thuật & Đặt tên Chuẩn Enterprise** | Clean Architecture 4 tầng, Naming Conventions (.NET 10, SQL Server, React 19), 3 luật bất biến và quy trình Gatekeeping QA | [`ENGINEERING_CODE_STANDARDS_AND_CONVENTIONS.md`](ENGINEERING_CODE_STANDARDS_AND_CONVENTIONS.md) |
| **SPEC-01** | **Quản trị Danh mục & Phân quyền Động** | Kế thừa `tbl_Sys_Chuc_Nang` TKSolution V11, Dynamic RBAC, Mega Menu 6 cột, 5 cờ quyền, Multi-tenancy | [`specifications/SPEC-01-DYNAMIC-RBAC-SYSTEM-FUNCTIONS.md`](specifications/SPEC-01-DYNAMIC-RBAC-SYSTEM-FUNCTIONS.md) |
| **SPEC-02** | **Nhập / Xuất Dữ liệu Thông minh theo Khoa** | Cơ chế F1018, ánh xạ cột động theo từng trường/khoa, Smart Import Preview, Two-phase Validation, Dynamic Export | [`specifications/SPEC-02-SMART-IMPORT-EXPORT-MAPPING.md`](specifications/SPEC-02-SMART-IMPORT-EXPORT-MAPPING.md) |
| **SPEC-03** | **Tiếp nhận Doanh nghiệp 1-Chạm qua Magic Link** | Giấy giới thiệu điện tử có QR độc bản (`IL-ACC-XXXX`), tiếp nhận không cần tài khoản, tự động kích hoạt tiến trình | [`specifications/SPEC-03-COMPANY-ONBOARDING-MAGIC-LINK-QR.md`](specifications/SPEC-03-COMPANY-ONBOARDING-MAGIC-LINK-QR.md) |
| **SPEC-04** | **Đánh giá Thực tập Doanh nghiệp & Điểm số** | Chấm điểm thang 10 theo 3 nhóm tiêu chí, chữ ký điện tử, kết nối trực tiếp bộ máy tính điểm chuẩn Bộ GD&ĐT | [`specifications/SPEC-04-EMPLOYER-EVALUATION-AND-FEEDBACK.md`](specifications/SPEC-04-EMPLOYER-EVALUATION-AND-FEEDBACK.md) |
| **SPEC-05** | **Báo cáo Hồ sơ Kiểm định & Cổng Xác thực** | Thay thế Zalo/Excel/Classroom bằng Bộ 3 báo cáo (ZIP, Excel, Word), mã QR `IL-VERIFY-XXXX`, Cổng tra cứu `/verify/:code` | [`specifications/SPEC-05-ACCREDITATION-PDF-AND-PUBLIC-VERIFY.md`](specifications/SPEC-05-ACCREDITATION-PDF-AND-PUBLIC-VERIFY.md) |
| **SPEC-06** | **SignalR Real-Time & Tự động hóa Hạn nộp** | SignalR Hub `/hubs/notifications`, Background Cron Worker nhắc hạn 24h, loại bỏ group Zalo thủ công | [`specifications/SPEC-06-REALTIME-SIGNALR-AND-DEADLINE-WORKER.md`](specifications/SPEC-06-REALTIME-SIGNALR-AND-DEADLINE-WORKER.md) |
| **PLAN-P1** | **Kế hoạch Triển khai Giai đoạn 1 (Dev Plan)** | Chi tiết kỹ thuật triển khai Giai đoạn 1: SuperAdmin UI Configuration Engine (Tree Drag-and-Drop, Field Policies, Role Impersonation) | [`specifications/PLAN_PHASE_1_SUPERADMIN_ENGINE_EXECUTION.md`](specifications/PLAN_PHASE_1_SUPERADMIN_ENGINE_EXECUTION.md) |
| **PLAN-P2** | **Kế hoạch Triển khai Giai đoạn 2 (Dev Plan)** | Chi tiết kỹ thuật triển khai Giai đoạn 2: Lecturer Workspace & Evaluation Engine (DynamicDataGrid cho GV, Master-Detail Bút phê tuần, Bộ 3 báo cáo kiểm định) | [`specifications/PLAN_PHASE_2_LECTURER_WORKSPACE_EXECUTION.md`](specifications/PLAN_PHASE_2_LECTURER_WORKSPACE_EXECUTION.md) |
| **PLAN-P3** | **Kế hoạch Triển khai Giai đoạn 3 (Dev Plan)** | Chi tiết kỹ thuật triển khai Giai đoạn 3: Student Portal & Dynamic Submissions (Dashboard tiến độ, Giấy giới thiệu QR, Biểu mẫu nộp tuần động theo Field Policy) | [`specifications/PLAN_PHASE_3_STUDENT_PORTAL_EXECUTION.md`](specifications/PLAN_PHASE_3_STUDENT_PORTAL_EXECUTION.md) |
| **PLAN-P4** | **Kế hoạch Triển khai Giai đoạn 4 (Dev Plan)** | Chi tiết kỹ thuật triển khai Giai đoạn 4: Employer Portal & Public Verification (Cổng tiếp nhận 1-chạm /accept/:token, Đánh giá DN /evaluate/:token, Tra cứu /verify/:code) | [`specifications/PLAN_PHASE_4_EMPLOYER_PORTAL_AND_PUBLIC_VERIFY_EXECUTION.md`](specifications/PLAN_PHASE_4_EMPLOYER_PORTAL_AND_PUBLIC_VERIFY_EXECUTION.md) |
| **PLAN-SA** | **Quy hoạch Tổng thể SuperAdmin UI Engine** | Bản vẽ kiến trúc tổng thể 5 giai đoạn cấu hình động giao diện kế thừa chuẩn TKS_V11 | [`specifications/PLAN_SUPERADMIN_UI_CONFIGURATION_ENGINE.md`](specifications/PLAN_SUPERADMIN_UI_CONFIGURATION_ENGINE.md) |

---

## Tài liệu hiện hành

| File | Nội dung |
|:---|:---|
| [`INTERNLINK_COMMERCIAL_MASTER_BLUEPRINT.md`](INTERNLINK_COMMERCIAL_MASTER_BLUEPRINT.md) | **[KIM CHỈ NAM]** Chiến lược thương mại hóa B2B SaaS ngách Quản trị Thực tập Đại học/Cao đẳng, Tam giác giá trị & Lộ trình 4 giai đoạn |
| [`PLAN_SUPERADMIN_LEVEL0_FINAL_UPGRADE.md`](PLAN_SUPERADMIN_LEVEL0_FINAL_UPGRADE.md) | Kế hoạch bàn giao hoàn tất SuperAdmin Cấp 0, cổng nghiệm thu và lộ trình tiếp nối Cấp 1–2 |
| [`UI_REFACTOR_MASTER_PLAN.md`](UI_REFACTOR_MASTER_PLAN.md) | **[KẾ HOẠCH REFACTOR]** Kế hoạch chi tiết chuẩn hóa 100% UI theo UI Design System V2.0, xóa bỏ mã màu cấm và chuẩn hóa container |
| [`SPRINT_COMM_2_MASTER_SPECIFICATION.md`](SPRINT_COMM_2_MASTER_SPECIFICATION.md) | **[SPRINT COMM-2]** Đặc tả kiến trúc & Kế hoạch triển khai khép kín vòng đời thực tập: Tiếp nhận DN (Magic Link), Cổng xác thực (/verify), SignalR Notification |
| [`TKS_ENTERPRISE_SYNTHESIS_AND_INTERNLINK_ROADMAP.md`](TKS_ENTERPRISE_SYNTHESIS_AND_INTERNLINK_ROADMAP.md) | Phân tích chuyên sâu & trích lọc tinh hoa kiến trúc ERP/WMS thực tế từ doanh nghiệp TKSolution cho InternLink |
| [`DYNAMIC_RBAC.md`](DYNAMIC_RBAC.md) | Hướng dẫn và đặc tả kỹ thuật hệ thống Dynamic RBAC Core và cây quyền động |
| [`current/README.md`](current/README.md) | Baseline implementation và quy ước đọc tài liệu |
| [`current/01-Architecture.md`](current/01-Architecture.md) | Kiến trúc runtime và cấu trúc source |
| [`current/02-Frontend-Routes.md`](current/02-Frontend-Routes.md) | Route tree và phân quyền portal |
| [`current/03-API-Reference.md`](current/03-API-Reference.md) | Controller/endpoint inventory |
| [`current/04-Domain-Model.md`](current/04-Domain-Model.md) | Entity, quan hệ và state |
| [`current/05-Database.md`](current/05-Database.md) | Schema, migration và index |
| [`current/06-Storage.md`](current/06-Storage.md) | Upload, volume, backup và retention |
| [`current/07-Development.md`](current/07-Development.md) | Setup, build, test và migration |
| [`current/08-Operations.md`](current/08-Operations.md) | Docker, healthcheck, logging và sự cố |
| [`current/14-Windows-Server-2019-AWS.md`](current/14-Windows-Server-2019-AWS.md) | Triển khai native trên AWS Windows Server 2019, DuckDNS và HTTPS |
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
