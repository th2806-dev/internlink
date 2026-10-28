# 🎓 InternLink — Nền Tảng Quản Lý Thực Tập

<div align="center">

![.NET 10](https://img.shields.io/badge/.NET%2010-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![React 19](https://img.shields.io/badge/React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL%20Server%202022-CC292B?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)
![AWS Windows Server](https://img.shields.io/badge/AWS%20EC2-Windows%20Server%202019-FF9900?style=for-the-badge&logo=amazonwebservices&logoColor=white)
![Clean Architecture](https://img.shields.io/badge/Architecture-Clean%20Architecture-239120?style=for-the-badge)
![Unit Tests](https://img.shields.io/badge/Tests-381%20BE%20%7C%20144%20FE%20PASS-brightgreen?style=for-the-badge)

<p align="center">
  <b>Nền tảng số hóa 100% quy trình thực tập tốt nghiệp đại học theo tiêu chuẩn chuyển đổi số giáo dục</b><br>
  Kết nối xuyên suốt: <b>Quản trị Hệ thống</b> ➔ <b>Khoa / Bộ môn</b> ➔ <b>Giảng viên Hướng dẫn</b> ➔ <b>Doanh nghiệp</b> ➔ <b>Sinh viên</b>
</p>

[🌐 Trải nghiệm Trực tiếp (Live Demo)](http://internlink.duckdns.org/) • [📑 Tài liệu Kiến trúc](docs/README.md) • [🚀 Hướng dẫn Vận hành](docs/SYSTEM_MAINTENANCE_SOP.md) • [🗺️ Lộ trình Thương mại hóa](docs/ROADMAP_GROUP3_COMMERCIALIZATION.md)

</div>

---

## 🌟 ĐIỂM SÁNG KỸ THUẬT & KIẾN TRÚC HỆ THỐNG (TECHNICAL HIGHLIGHTS)

Dự án được xây dựng theo chuẩn **Enterprise-Grade** nhằm giải quyết bài toán vận hành thực tế tại các trường đại học với độ chịu tải cao, tính toàn vẹn dữ liệu và trải nghiệm người dùng mượt mà:

### 1. Kiến trúc Clean Architecture 4 tầng (.NET 10)
* **Domain Layer:** Chứa 100% Core Business Entities, Enums, Domain Rules độc lập không phụ thuộc thư viện ngoài.
* **Application Layer:** DTOs, CQRS Interfaces, FluentValidators, Dịch vụ xử lý nghiệp vụ trung tâm.
* **Infrastructure Layer:** EF Core 10, SQL Server 2022, AutoMapper, Engine sinh file Excel OpenXML, SignalR Service.
* **API / Presentation Layer:** RESTful APIs, JWT Authentication, Custom Exception Middleware, Role-Based Access Control (RBAC).

### 2. Bộ Engine Xuất Báo cáo Excel Chuẩn Quy chế Đào tạo (C23 Template)
* Sử dụng **OpenXML SDK** tốc độ cao, trực tiếp xử lý trên binary stream không làm tràn RAM máy chủ.
* Đồng bộ chuẩn hóa font **Times New Roman cỡ chữ 13**, đóng khung **viền mỏng (Thin Border)** toàn bộ dữ liệu.
* Cấu trúc **3 Worksheets tự động**:
  * `DANH SÁCH`: Bảng điểm quá trình, điểm thi, điểm trung bình, xếp loại và phân bổ thống kê.
  * `DATABASE`: CSDL liên kết phục vụ in ấn phôi bằng và trích xuất phòng đào tạo.
  * `TÊN CÔNG TY`: Báo cáo danh sách doanh nghiệp đối tác tiếp nhận thực tập sinh.
* **Bảo vệ Anti-IDOR:** Giảng viên chỉ xuất được sinh viên thuộc nhóm mình hướng dẫn; Admin xuất toàn khoa.

### 3. Cơ chế Khóa sổ Kỳ Thực tập & Lưu trữ Chỉ xem (Read-Only Archival State Machine)
* Thiết kế Middleware độc quyền `StudentArchiveReadOnlyMiddleware`: Khi Admin đóng kỳ (`Completed`), toàn bộ sinh viên kỳ đó tự động chuyển sang chế độ **Chỉ xem (Archive Read-Only)**.
* Chặn mọi hành vi sửa/xóa nhật ký tuần, điểm danh hoặc bài nộp, bảo vệ 100% bằng chứng đào tạo.
* **Whitelist thông minh:** Cho phép `/api/Auth/refresh-token` hoạt động bình thường, giúp sinh viên tra cứu lại kết quả lịch sử mà không bao giờ bị văng phiên đăng nhập (403 Forbidden).

### 4. Hệ thống Ràng buộc Nghiệp vụ Chặt chẽ (Strict Business Guards)
* **Company Guard:** Chặn tuyệt đối hành vi nộp báo cáo tuần hoặc tải giấy chứng nhận nếu sinh viên chưa được phân công doanh nghiệp (`CompanyId == null`).
* **Hỗ trợ Nộp sớm:** Sinh viên đã hoàn thành thực tập và có xác nhận của doanh nghiệp được phép nộp báo cáo sớm mà không bị chặn bởi ngày mở hạn nộp (`StartDate`).
* **Client-side File Validation:** Ngăn chặn file rác ngay từ trình duyệt (Báo cáo tuần: Bắt buộc `.pdf` $\le$ 15MB; Báo cáo cuối/Zip: Tối đa 50MB), tiết kiệm băng thông máy chủ AWS.

### 5. Thông báo Thời gian thực (Real-time SignalR Hub)
* Cập nhật tức thời khi Giảng viên duyệt/yêu cầu sửa báo cáo tuần, phản hồi điểm số hoặc khi Khoa phát thông báo khẩn cấp.
* Cơ chế tự động kết nối lại (Auto-reconnect) và Fallback Long-polling khi mạng chập chờn.

### 6. Độ bao phủ Kiểm thử Nghiêm ngặt (Zero Bug Regression)
* **Backend:** **381 / 381 Unit & Integration Tests Passed (100%)** với xUnit, Moq, FluentAssertions và InMemory Database.
* **Frontend:** **144 / 144 Vitest Component Tests Passed (100%)** trên 27 files kiểm thử.

---

## 🏗️ SƠ ĐỒ KIẾN TRÚC HỆ THỐNG

```
                          ┌───────────────────────────────────────┐
                          │   Client: React 19 + TypeScript       │
                          │   (TailwindCSS, Lucide, Vite)         │
                          └──────────────────┬────────────────────┘
                                             │ HTTP REST / WebSocket (SignalR)
                                             ▼
                          ┌───────────────────────────────────────┐
                          │   Web Server: IIS 10 / Nginx Proxy    │
                          │   Reverse Proxy & SSL Offloading      │
                          └──────────────────┬────────────────────┘
                                             │
                        ┌────────────────────┴────────────────────┐
                        │                                         │
                        ▼                                         ▼
         ┌───────────────────────────────┐         ┌──────────────────────────────┐
         │ ASP.NET Core 10 Web API       │         │ SignalR Notification Hub     │
         │ - Custom Exception Middleware │         │ - Realtime Alert Dispatcher  │
         │ - StudentArchiveReadOnlyGuard │         │ - Student/Lecturer Channels  │
         │ - JWT Bearer Authentication   │         └──────────────────────────────┘
         └──────────────┬────────────────┘
                        │
       ┌────────────────┼────────────────┐
       ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Core Domain  │ │ OpenXML      │ │ Mail Service │
│ - Entities   │ │ Excel Engine │ │ - SMTP / SES │
│ - Rules/Enums│ │ - C23 Format │ │ - Auto Temp  │
└──────┬───────┘ └──────┬───────┘ └──────────────┘
       │                │
       ▼                ▼
┌────────────────────────────────────────┐
│ Entity Framework Core 10 (ORM)         │
│ SQL Server 2022 / SQL Server Express   │
│ - Code-First Migrations & Auto-Seeding │
└────────────────────────────────────────┘
```

---

## 👥 HỆ SINH THÁI 4 PHÂN QUYỀN (RBAC MATRIX)

| Phân quyền (Role) | Trách nhiệm chính & Điểm nhấn tính năng |
|---|---|
| **Quản trị Hệ thống**<br>*(SuperAdmin)* | • Khởi tạo và quản lý danh mục các Khoa trong toàn trường.<br>• Quản trị danh sách tài khoản, phân quyền quản trị khoa.<br>• Giám sát Dashboard chỉ số tổng thể toàn trường. |
| **Quản trị Khoa**<br>*(DepartmentAdmin)* | • Thiết lập kỳ thực tập (số tuần, lịch nộp, tiêu chí đánh giá).<br>• Import Excel danh sách SV, GV, Doanh nghiệp kèm cơ chế cấp mật khẩu tự động.<br>• Phân công GVHD và Doanh nghiệp với công cụ kiểm soát cân bằng tải.<br>• Xuất Excel bảng điểm tổng kết toàn khoa (Mẫu C23 chuẩn in ấn).<br>• Khóa sổ kỳ thực tập (Chế độ chỉ xem bảo vệ dữ liệu). |
| **Giảng viên Hướng dẫn**<br>*(Lecturer)* | • Dashboard việc cần làm: Tách biệt KPI chờ duyệt (Báo cáo tuần vs Hồ sơ khác).<br>• Cảnh báo thông minh: Nhận diện ngay sinh viên nguy cơ (Vắng $\ge$ 2 buổi, trễ bài).<br>• Điểm danh chuyên cần theo buổi học, không trùng lịch.<br>• Duyệt báo cáo tuần (Approve / Request Revision + Phản hồi nhận xét).<br>• Chấm điểm Rubric & Vấn đáp, tự động tính điểm TB và xếp loại theo quy chế.<br>• Xuất file Excel bảng điểm nhóm SV do mình phụ trách. |
| **Sinh viên Thực tập**<br>*(Student)* | • Xem thông tin kỳ thực tập, GVHD, Doanh nghiệp tiếp nhận và hạn nộp đếm ngược.<br>• Nộp Báo cáo tuần (Cơ chế Bản nháp $\rightarrow$ Nộp chính thức).<br>• Nộp Báo cáo cuối kỳ, sản phẩm đồ án, minh chứng đánh giá doanh nghiệp.<br>• Hỗ trợ nộp sớm khi được doanh nghiệp ký xác nhận trước hạn.<br>• Tự động kiểm tra định dạng và dung lượng file trước khi upload.<br>• Xem kết quả đánh giá điểm số và tải Phiếu đánh giá thực tập PDF. |

---

## 💻 CÔNG NGHỆ SỬ DỤNG (TECH STACK)

### Backend
* **Core:** .NET 10 (C# 13), ASP.NET Core Web API
* **Database & ORM:** SQL Server 2022 / SQL Express, Entity Framework Core 10
* **Data Mapping & Validation:** AutoMapper, FluentValidation
* **Export & Reporting:** DocumentFormat.OpenXml (Excel Engine), Custom PDF Generator
* **Realtime:** Microsoft ASP.NET Core SignalR
* **Testing:** xUnit, Moq, FluentAssertions, Microsoft.EntityFrameworkCore.InMemory

### Frontend
* **Core:** React 19, TypeScript 5.8, Vite 5
* **Routing & State:** React Router v6, React Context API, TanStack React Query v5
* **UI & Styling:** TailwindCSS, Vanilla CSS Tokens, Lucide Icons
* **Testing:** Vitest, React Testing Library, JSDOM

### Hạ tầng & DevOps
* **Production Host:** AWS EC2 Windows Server 2019 / IIS 10
* **Domain & DNS:** DuckDNS (`internlink.duckdns.org`), HTTP/HTTPS
* **Automation Scripts:** PowerShell 5.1/7 Deployment Engine (`update-windows-server.ps1`), Tự động sao lưu SQL Server (.bak) trước deploy, Robocopy zero-file-lock
* **Containerization:** Docker, Docker Compose, Nginx Reverse Proxy (hỗ trợ triển khai lab On-Premises)

---

## ⚡ HƯỚNG DẪN CHẠY THỬ NHANH (QUICK START)

### Cách 1: Chạy bằng Docker (Khuyên dùng cho Demo)

Yêu cầu: Đã cài [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# 1. Clone mã nguồn
git clone https://github.com/th2806-dev/internlink.git
cd internlink

# 2. Khởi chạy toàn bộ hệ thống (Frontend + Backend API + SQL Server)
docker compose up -d --build
```
Truy cập hệ thống tại: **`http://localhost:8000`**

---

### Cách 2: Chạy trực tiếp (Local Development)

Yêu cầu: [.NET 10 SDK](https://dotnet.microsoft.com/download), [Node.js 20+](https://nodejs.org/), [SQL Server LocalDB / Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads).

```bash
# 1. Khởi động Backend API
cd backend/InternLink/InternLink.API
dotnet restore
dotnet run --launch-profile http
# API chạy tại: http://localhost:7109 (Swagger: http://localhost:7109/swagger)

# 2. Mở một terminal khác, khởi động Frontend React
cd frontend
npm install
npm run dev
# Web chạy tại: http://localhost:3000
```

---

## 🧪 TÀI KHOẢN TRẢI NGHIỆM DEMO

Hệ thống được cấu hình sẵn các tài khoản mẫu đại diện cho 3 vai trò neo trong kỳ Thực tập `C24A.TH`:

| Vai trò | Tên đăng nhập | Mật khẩu mặc định | Mục đích trải nghiệm |
|---|---|---|---|
| **Admin Khoa** | `admin-cntt` | `Password123!` *(hoặc cấp qua Admin)* | Quản trị kỳ, phân công, xuất bảng điểm toàn khoa |
| **Giảng viên** | `tqcuong@hcmct.edu.vn` | `Password123!` *(hoặc cấp qua Admin)* | Thầy Tống Quốc Cường · Xem cảnh báo nguy cơ, duyệt BC, chấm rubric |
| **Sinh viên** | `2421160052` | `Password123!` *(hoặc cấp qua Admin)* | Sinh viên Thạch Hiền · Nộp báo cáo, nộp minh chứng, xem điểm |
| **Super Admin** | `admin` | `Password123!` | Quản trị cao nhất toàn hệ thống |

---

## 🚀 QUY TRÌNH DEPLOY LÊN AWS WINDOWS SERVER (PRODUCTION RUNBOOK)

Hệ thống tích hợp sẵn script DevOps tự động hóa độc quyền dành cho môi trường **AWS Windows Server + IIS**:

1. **Đẩy mã nguồn từ máy phát triển:**
   ```bash
   git push origin main
   ```
2. **Kích hoạt Deploy trên AWS Windows Server (qua RDP PowerShell Administrator):**
   ```powershell
   powershell -ExecutionPolicy Bypass -File C:\src\InternLink\scripts\update-windows-server.ps1
   ```
> Script tự động: Sao lưu SQL Server ra file `.bak` $\rightarrow$ Kéo git mới nhất $\rightarrow$ Build .NET API & React bundle $\rightarrow$ Dừng IIS Pool an toàn tránh lock file DLL $\rightarrow$ Robocopy mã mới $\rightarrow$ Chạy Database Migration $\rightarrow$ Khởi động lại IIS và kiểm tra Readiness Healthcheck.

---

## 📚 TÀI LIỆU KỸ THUẬT NÂNG CAO

* [SRS - Đặc tả Yêu cầu Phần mềm](docs/02-Software-Requirements-Specification.md)
* [Kiến trúc Hệ thống & Luồng Dữ liệu](docs/06-System-Architecture.md)
* [Đặc tả RESTful API](docs/08-API-Specification.md)
* [Kịch bản Thuyết trình Demo Hội đồng](docs/Demo-UI-Script.md)
* [SOP Vận hành & Bảo trì Hệ thống](docs/SYSTEM_MAINTENANCE_SOP.md)
* [Lộ trình Thương mại hóa & Multi-Tenancy SaaS](docs/ROADMAP_GROUP3_COMMERCIALIZATION.md)

---

## 👨‍💻 TÁC GIẢ & BẢN QUYỀN

* **Lead Developer / Project Creator:** Thạch Hiền ([@th2806-dev](https://github.com/th2806-dev))
* **Công nghệ:** Khoa Công nghệ Thông tin
* **Bản quyền:** Phát hành theo giấy phép [MIT License](LICENSE).
