# InternLink — Hướng Dẫn Nhập Môn (Onboarding)

**Phiên bản:** 4.1  
**Ngày cập nhật:** 27/09/2026

---

## 1. Yêu cầu Hệ thống

| Thành phần | Phiên bản |
|:---|:---|
| .NET SDK | 10.x |
| Node.js | 20.x |
| SQL Server | 2022 Express/Developer |
| Docker Desktop | 4.x (khuyên dùng — xem [README](../README.md)) |

---

## 2. Clone & Setup

```bash
# Clone repository
git clone https://github.com/th2806-dev/internlink.git
cd internlink

# Backend setup
cd backend/InternLink
dotnet restore
dotnet ef database update --project InternLink.Infrastructure --startup-project InternLink.API
dotnet run --project InternLink.API

# Frontend setup (terminal mới)
cd frontend
npm install
npm run dev
```

---

## 3. Access Points

| Service | URL |
|:---|:---|
| Frontend (Vite) | http://localhost:3000 |
| Backend API | http://localhost:7109 |
| Swagger | http://localhost:7109/swagger |

> Chạy bằng Docker (`docker compose up -d --build`) thì web + API đều qua **http://localhost:3000** — xem [README](../README.md).

---

## 4. Tài khoản Demo

| Username | Password | Role |
|:---|:---|:---|
| `admin` | `Password123!` | SuperAdmin — **seed sẵn** khi database mới |
| `admin-cntt` (ví dụ) | mật khẩu tạm | DepartmentAdmin — tạo qua menu **Người dùng** |
| `gvcntt01` (ví dụ) | mật khẩu tạm | Lecturer — tạo qua **Import Excel** |
| `cnttsv0001` (ví dụ) | mật khẩu tạm | Student — tạo qua **Import Excel** |

- Docker (Production) chỉ seed sẵn tài khoản **`admin`** — 3 vai trò còn lại do bạn tạo theo [README — Quy trình demo 4 phân quyền](../README.md).
- **Mật khẩu tạm** 8 ký tự được gửi qua email người dùng; nếu đặt `Email:Enabled=false` thì xem trong log backend (`docker compose logs backend --tail 300`).
- Tài khoản tạo mới **bắt buộc đổi mật khẩu** ở lần đăng nhập đầu tiên.

---

## 5. Thứ Tự Đọc Tài Liệu

1. `01-Vision-Scope.md` — Tổng quan dự án
2. `06-System-Architecture.md` — Kiến trúc hệ thống
3. `05a-Domain-Model.md` — Mô hình miền
4. `08-API-Specification.md` — Đặc tả API
5. `09-System-DevOps-Guide.md` — Hướng dẫn vận hành

---

## 6. Smoke Test Nhanh

```bash
# 1. Login Admin
curl -X POST http://localhost:7109/api/Auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Password123!"}'

# 2. Lấy JWT token từ response, rồi gọi:
curl http://localhost:7109/api/Admin/students \
  -H "Authorization: Bearer <token>"

# 3. Login Lecturer (chỉ chạy sau khi đã tạo tài khoản GV — username/mật khẩu tạm lấy từ email hoặc log)
curl -X POST http://localhost:7109/api/Auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<gv-username>","password":"<mat-khau-tam>"}'

# 4. Gọi API giảng viên
curl http://localhost:7109/api/Lecturer/internships \
  -H "Authorization: Bearer <token>"
```

---

## 7. Cấu Hình Email (Tùy chọn)

- Mặc định: `Email:Enabled=true` (Gmail SMTP, cần `Email:Password` là App Password)
- Demo không cần Gmail: đặt `Email:Enabled=false` → mọi email (kèm mật khẩu tạm) được ghi ra console/log
- Hướng dẫn cấu hình SMTP: Xem [`Email-Setup-Gmail.md`](Email-Setup-Gmail.md)
