<!-- LEGACY: bộ tài liệu thiết kế ban đầu. Bản CẬP NHẬT theo code nằm ở docs/current/ — ưu tiên dùng docs/current/. -->
<!-- STATUS: LEGACY -->

# InternLink — Hướng Dẫn Vận hành & Triển Khai (DevOps Guide)

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 4.0  
**Ngày cập nhật:** Tháng 9/2026

---

## 1. Sơ đồ Kiến trúc Hệ thống & Luồng Mạng

```
[ Client / Web Browser ]
         │
         ├─── Port 3000 (HTTP) ──► [ Frontend Container (Nginx Alpine) ]
         │                                  │ Reverse Proxy
         │                                  ├──► Static SPA (/index.html)
         │                                  ├──► /api/* ──┐
         │                                  └──► /hubs/* ─┤
         │                                                │ internlink_network
         └─── Port 7109 (Direct API) ─────────────────────┴─► [ Backend Container (.NET 8) ]
                                                                                │
                                                                                │ host.docker.internal:1433
                                                                                ▼
                                                                    [ Host Machine / SQL Server ]
```

### Port Mapping

| Container | Port ngoài | Port trong | Mô tả |
|:---|:---:|:---:|:---|
| `internlink_frontend` | 3000 | 80 | Nginx — SPA + Reverse Proxy |
| `internlink_api` | 7109 | 8080 | ASP.NET Core Kestrel |

---

## 2. Yêu cầu Hệ thống (Prerequisites)

| Thành phần | Phiên bản tối thiểu | Ghi chú |
|:---|:---|:---|
| Docker Desktop | 4.x | Bao gồm Docker Compose v2 |
| SQL Server | 2022 Express/Developer | Chạy trên máy Host, Port 1433 |
| Node.js | 20.x (ALpine) | Chỉ cần trong build stage |
| .NET SDK | 8.x | Chỉ cần khi chạy local dev |

---

## 3. Hướng dẫn Chạy Local Development

### 3.1. Backend (ASP.NET Core 8)

```bash
cd backend/InternLink

# Restore dependencies
dotnet restore

# Apply database migrations
dotnet ef database update --project InternLink.Infrastructure --startup-project InternLink.API

# Run backend (port 7109)
dotnet run --project InternLink.API
```

**Swagger UI**: `http://localhost:7109/swagger`

### 3.2. Frontend (React 19 + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Run dev server (port 5173)
npm run dev
```

**Frontend Dev**: `http://localhost:5173`

### 3.3. Environment Variables

```bash
# Backend (appsettings.json)
ConnectionStrings__DefaultConnection=Server=host.docker.internal;Database=InternLink;...
Jwt__SecretKey=your-secret-key
Email__SmtpPassword=your-app-password

# Frontend (.env)
VITE_API_URL=http://localhost:7109
```

---

## 4. Docker Deployment

```bash
# Build và chạy toàn bộ
docker compose up -d --build

# Kiểm tra trạng thái
docker compose ps

# Xem log backend
docker logs -f internlink_api

# Dừng toàn bộ
docker compose down
```

---

## 5. Health Checks

| Endpoint | Mục đích | Tiêu chí |
|:---|:---|:---|
| `/health` | Tổng quan | Trả về JSON trạng thái |
| `/health/live` | Liveness Probe | Tiến trình đang sống |
| `/health/ready` | Readiness Probe | Kết nối SQL Server thành công |

---

## 6. Cẩm nang Xử lý Sự cố (Troubleshooting)

### Container Backend Unhealthy
- Kiểm tra SQL Server đang chạy trên máy Host
- Bật TCP/IP trong SQL Server Configuration Manager (Port 1433)
- Kiểm tra `ConnectionStrings` trong `appsettings.json`

### CORS Error
- Đảm bảo `Cors__AllowedOrigins` bao gồm URL Frontend
- Hoặc sử dụng Nginx Reverse Proxy (gọi `/api/` cùng origin)

### 404 khi F5 trong React SPA
- Đã xử lý trong `nginx.conf`: `try_files $uri $uri/ /index.html`

### Database Migration
```bash
cd backend/InternLink
dotnet ef migrations add <MigrationName> --project InternLink.Infrastructure --startup-project InternLink.API
dotnet ef database update --project InternLink.Infrastructure --startup-project InternLink.API
```

---

## 7. Cron Jobs & Background Tasks

- **Refresh Token Cleanup**: Tự động xóa Refresh Token hết hạn (cấu hình trong `Program.cs`)
- **Notification Cleanup**: Có thể thêm hangfire job để xóa thông báo cũ

---

## 8. Backup & Restore

```bash
# Backup database
sqlcmd -S localhost -Q "BACKUP DATABASE [InternLink] TO DISK='C:\backup\internlink.bak'"

# Restore database
sqlcmd -S localhost -Q "RESTORE DATABASE [InternLink] FROM DISK='C:\backup\internlink.bak'"
```
