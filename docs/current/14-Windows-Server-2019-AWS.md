# Triển khai InternLink trên Windows Server 2019 (AWS)

Hướng dẫn này triển khai trực tiếp trên Windows Server 2019, không dùng Docker Desktop, Docker Compose hoặc ngrok:

- **SQL Server Express 2022** chạy trực tiếp trên Windows Server (`localhost\SQLEXPRESS`).
- **ASP.NET Core (.NET 10)** chạy qua IIS In-Process trực tiếp tại **Cổng 80** (Site `InternLinkApi`).
- **Frontend React** được build thành file tĩnh và đồng bộ trực tiếp vào thư mục `wwwroot` của Backend.
- **Kiến trúc Direct Single-Port SPA Hosting:** Backend ASP.NET Core phục vụ trực tiếp file tĩnh React, API (`/api/*`), SignalR Hubs (`/hubs/*`) và Health check (`/health/*`) trên cùng một cổng 80 duy nhất mà **không cần IIS ARR Reverse Proxy**, giúp triệt tiêu nguy cơ socket deadlock và tiết kiệm RAM tối đa.
- DuckDNS: `internlink.duckdns.org`.

> [!TIP]
> Để hiểu chi tiết nguyên nhân sự cố IIS ARR Deadlock từng xảy ra trước đây và các bài học kỹ thuật chuyên sâu, tham khảo [Sổ tay khắc phục sự cố ARR Deadlock](../TROUBLESHOOTING_WINDOWS_SERVER_ARR_DEADLOCK.md).

> **Tài nguyên EC2:** Máy khuyến nghị tối thiểu 4 GiB RAM; nếu chạy trên `t3.small` (2 GiB RAM), cần truyền cờ `-AllowLowMemory` khi cài đặt và cấu hình IIS Application Pool `idleTimeout = 0` để tránh bị dừng tiến trình.

---

## 1. Kiểm tra địa chỉ IP và DNS

Domain phải trỏ tới **Public IPv4 hoặc Elastic IP của đúng EC2 instance**, không phải địa chỉ private của Windows hay IP public của một máy khác. Trong AWS Console, kiểm tra **EC2 → Instances → instance → Public IPv4 address**. Nếu IP có thể thay đổi khi dừng/chạy instance, cấp và associate Elastic IP trước.

Kiểm tra bản ghi A từ PowerShell:

```powershell
Resolve-DnsName internlink.duckdns.org -Type A
```

Xác nhận IP này chính là IP public/Elastic IP đang được AWS gán cho EC2. Nếu không khớp, cập nhật DuckDNS; không tiếp tục triển khai cho tới khi DNS trỏ đúng server.

---

## 2. AWS Security Group và Windows Firewall

Inbound rules của AWS Security Group:

| Port | Source | Mục đích |
|:--|:--|:--|
| TCP 3389 | IP quản trị của bạn `/32` | Remote Desktop (RDP) |
| TCP 80 | `0.0.0.0/0` | Website HTTP (Frontend & API) |
| TCP 443 | `0.0.0.0/0` | HTTPS (Sau khi cấu hình SSL) |

Trong AWS Security Group, chọn **Custom TCP** (protocol TCP), port `80`, source `0.0.0.0/0`. **Không mở TCP `1433` (SQL Server) ra Internet.** Giữ RDP giới hạn vào IP quản trị.

Lệnh mở Windows Firewall:

```powershell
New-NetFirewallRule -DisplayName "InternLink HTTP 80" `
  -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
```

---

## 3. Cài đặt tự động bằng Script

Mở **Windows PowerShell bằng quyền Administrator** trên server. Khối lệnh dưới đây bootstrap Chocolatey/Git nếu chưa có, clone source và chạy installer:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if (-not (Get-Command choco.exe -ErrorAction SilentlyContinue)) {
    Invoke-Expression ((New-Object Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    $env:Path = "$env:ProgramData\chocolatey\bin;$env:Path"
}

choco install git --yes --no-progress
$env:Path = "C:\Program Files\Git\cmd;$env:Path"

New-Item -ItemType Directory -Force C:\src | Out-Null
if (-not (Test-Path C:\src\InternLink)) {
    git clone https://github.com/th2806-dev/internlink.git C:\src\InternLink
}
Set-Location C:\src\InternLink
.\scripts\install-windows-server.ps1 -AllowLowMemory
```

Script tự động:
1. Cài IIS, Git, Node.js LTS, .NET 10 SDK, ASP.NET Core Hosting Bundle, SQL Server 2022 Express.
2. Build Frontend React và publish API ASP.NET Core.
3. Đồng bộ Frontend build vào `C:\Apps\InternLink\Api\wwwroot`.
4. Tạo database `InternLink` và cấp quyền db_owner cho `IIS APPPOOL\InternLinkApi`.
5. Cấu hình IIS Site `InternLinkApi` lắng nghe trực tiếp trên Cổng 80 (với hostname `internlink.duckdns.org` và default binding).
6. Tắt hoàn toàn `idleTimeout` của AppPool (`idleTimeout = 0`) và đặt `startMode = AlwaysRunning`.

Sau khi script hoàn thành, kiểm tra:

```powershell
Invoke-WebRequest http://127.0.0.1/health/ready
Invoke-WebRequest http://internlink.duckdns.org/
```

---

## 4. Cấu hình SQL Server

Script cài SQL Server Express 2022 instance `SQLEXPRESS`, tạo database và login Windows cho identity `IIS APPPOOL\InternLinkApi`; không cần bật SQL authentication hay mở TCP/IP ra mạng.

Nếu cần kiểm tra bằng SSMS, có thể cài SSMS và kết nối Windows Authentication tới `localhost\SQLEXPRESS`.

---

## 5. Quy trình Publish và Cấu trúc Thư mục

### Cấu trúc triển khai tại `C:\Apps\InternLink\Api`
```
C:\Apps\InternLink\
├── Api\
│   ├── InternLink.API.dll
│   ├── web.config                  <-- Quản lý bởi ASP.NET Core Module
│   ├── appsettings.json
│   ├── Logs\                       <-- Nhật ký Serilog
│   ├── uploads\                    <-- Tệp đính kèm người dùng
│   └── wwwroot\                    <-- File tĩnh React SPA (index.html, assets, ...)
└── Backups\                        <-- Tệp sao lưu .bak cơ sở dữ liệu
```

### Các lệnh build thủ công (nếu không dùng script):

```powershell
Set-Location C:\src\InternLink

# Build Frontend
npm ci
npm run build --workspace=frontend

# Publish API
dotnet publish .\backend\InternLink\InternLink.API\InternLink.API.csproj `
  -c Release -o C:\Apps\InternLink\Api

# Đồng bộ Frontend vào Backend wwwroot
Copy-Item .\frontend\dist\* C:\Apps\InternLink\Api\wwwroot -Recurse -Force
```

---

## 6. Cấu hình secrets và production settings

Đặt cấu hình ở Machine environment variables:

```powershell
[Environment]::SetEnvironmentVariable(
  'ConnectionStrings__DefaultConnection',
  'Server=localhost\SQLEXPRESS;Database=InternLink;Integrated Security=True;TrustServerCertificate=True;MultipleActiveResultSets=true',
  'Machine'
)
[Environment]::SetEnvironmentVariable('ASPNETCORE_ENVIRONMENT', 'Production', 'Machine')
[Environment]::SetEnvironmentVariable('Email__Enabled', 'false', 'Machine')
[Environment]::SetEnvironmentVariable('Email__PortalUrl', 'http://internlink.duckdns.org', 'Machine')
[Environment]::SetEnvironmentVariable('Cors__AllowedOrigins__0', 'http://internlink.duckdns.org', 'Machine')
```

---

## 7. Cấu hình IIS Site & Application Pool

Trong PowerShell:

```powershell
Import-Module WebAdministration

# 1. Cấu hình AppPool tối ưu cho máy ít RAM
Set-ItemProperty 'IIS:\AppPools\InternLinkApi' -Name managedRuntimeVersion -Value ''
Set-ItemProperty 'IIS:\AppPools\InternLinkApi' -Name processModel.identityType -Value ApplicationPoolIdentity
Set-ItemProperty 'IIS:\AppPools\InternLinkApi' -Name processModel.idleTimeout -Value ([TimeSpan]::Zero)
Set-ItemProperty 'IIS:\AppPools\InternLinkApi' -Name startMode -Value 'AlwaysRunning'

# 2. Cấu hình Site lắng nghe cổng 80
Set-ItemProperty 'IIS:\Sites\InternLinkApi' -Name physicalPath -Value 'C:\Apps\InternLink\Api'
Set-ItemProperty 'IIS:\Sites\InternLinkApi' -Name applicationPool -Value 'InternLinkApi'
Get-WebBinding -Name 'InternLinkApi' | Remove-WebBinding -ErrorAction SilentlyContinue
New-WebBinding -Name 'InternLinkApi' -Protocol 'http' -IPAddress '*' -Port 80 -HostHeader 'internlink.duckdns.org'
New-WebBinding -Name 'InternLinkApi' -Protocol 'http' -IPAddress '*' -Port 80
```

---

## 8. Bật HTTPS bằng Let's Encrypt (Khi cần)

Sau khi domain trỏ đúng Public/Elastic IP, site HTTP truy cập được từ Internet và TCP 80 đã mở:

1. Tải **win-acme** từ trang phát hành chính thức của dự án `win-acme`.
2. Chạy `wacs.exe` bằng quyền Administrator.
3. Chọn tạo certificate cho IIS site `InternLinkApi`, host `internlink.duckdns.org`, dùng HTTP validation.
4. win-acme sẽ tự động tạo HTTPS binding cho port 443 và cấu hình renew định kỳ.
5. Cập nhật `Email__PortalUrl` và `Cors__AllowedOrigins__*` sang `https://internlink.duckdns.org`.

---

## 9. Kiểm tra và Nghiệm thu Hệ thống

Trên server:

```powershell
Invoke-WebRequest http://127.0.0.1/health/ready
Invoke-WebRequest http://internlink.duckdns.org/
```

Trên máy người dùng bên ngoài:
- Truy cập `http://internlink.duckdns.org/`
- Đăng nhập tài khoản quản trị `admin` / `Password123!`
- Đổi mật khẩu ngay sau lần đăng nhập đầu tiên.

---

## 10. Cập nhật mã nguồn định kỳ (Zero-Downtime Update)

Để cập nhật bản mới nhất từ Git mà vẫn bảo vệ toàn vẹn cơ sở dữ liệu và thư mục uploads:

```powershell
Set-Location C:\src\InternLink
git stash push -m "server changes before update"
.\scripts\update-windows-server.ps1
```

Script sẽ tự động:
1. Tạo một bản sao lưu SQL Server an toàn dạng `.bak` (không nén) vào `C:\Apps\InternLink\Backups`.
2. Tạo `app_offline.htm` để thông báo bảo trì và đợi IIS worker giải phóng lock DLL.
3. Đồng bộ DLL API và thư mục `wwwroot` (bỏ qua thư mục `uploads` và `Logs`).
4. Xóa `app_offline.htm`, bật lại AppPool và kiểm tra health check trên port 80.
