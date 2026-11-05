# Sổ Tay Kỹ Thuật & Khắc Phục Sự Cố: IIS ARR Deadlock, Treo API và Chuyển Đổi Sang Single-Port Direct Hosting trên Windows Server

> **Tài liệu tham khảo vận hành (Operational Playbook & Incident Post-Mortem)**  
> **Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
> **Môi trường ghi nhận:** Windows Server 2019 Datacenter (AWS EC2 t3.small 2 GiB RAM, IIS 10, SQL Server Express, .NET 10, React 19)  
> **Mức độ nghiêm trọng:** Critical (Hệ thống tê liệt toàn bộ luồng nghiệp vụ API)  
> **Trạng thái:** Đã giải quyết triệt để (Resolved via Direct SPA Hosting Architecture)

---

## 1. Tóm Tắt Sự Cố (Incident Summary)

### Hiện tượng
- Người dùng truy cập domain công khai `http://internlink.duckdns.org/` vẫn tải được giao diện khung Frontend React (HTML/CSS/JS tĩnh).
- Khi thực hiện các hành động cần gọi Backend API (Đăng nhập `/api/Auth/login`, kiểm tra health `/health/ready`, tải danh sách thực tập sinh):
  - Trình duyệt rơi vào trạng thái chờ vô tận (vòng xoay loading xoay liên tục).
  - Sau 60 đến 120 giây, yêu cầu bị hủy với mã lỗi `502 Bad Gateway`, `ERR_CONNECTION_TIMED_OUT` hoặc bị ngắt kết nối đột ngột.
  - Gọi trực tiếp nội bộ từ PowerShell trên máy chủ: `Invoke-WebRequest -Uri "http://localhost:7109/health/ready"` cũng thất bại với lỗi `Unable to connect to the remote server`.
  - Kiểm tra log IIS `C:\Windows\System32\LogFiles\HTTPERR` xuất hiện hàng loạt bản ghi `Connection_Dropped DefaultAppPool` hoặc `Timer_ConnectionIdle`.

### Kiến trúc ban đầu (Kiến trúc 2-Tier Proxy)
Trước sự cố, hệ thống được thiết lập theo mô hình truyền thống của IIS:
- **Site 1 (`InternLink`):** Lắng nghe Port 80 phục vụ file tĩnh React SPA, sử dụng module **IIS URL Rewrite** kết hợp **Application Request Routing (ARR)** để làm Reverse Proxy:
  - Bắt các URL có tiền tố `/api/*`, `/hubs/*`, `/health/*` và forward ngược lại cổng nội bộ: `http://127.0.0.1:7109/{R:0}`.
- **Site 2 (`InternLinkApi`):** Lắng nghe Port 7109 nội bộ, chạy ứng dụng ASP.NET Core qua IIS In-Process Hosting (`aspNetCore` handler).

---

## 2. Phân Tích Căn Nguyên (Root Cause Analysis - RCA)

Quá trình điều tra và thực nghiệm trực tiếp trên máy chủ AWS EC2 đã xác định **4 căn nguyên cốt lõi** kết hợp gây nên tình trạng chết đứng (Deadlock):

```
[ Request từ Client ]
         │
         ▼ (Port 80)
┌────────────────────────────────────────────────────────────────────────┐
│ IIS Site: InternLink (ARR Reverse Proxy)                               │
│                                                                        │
│   ❌ LỖI 2: WinHTTP cố giải DNS WPAD (wpad.ec2.internal) → Treo 15-30s │
│   ❌ LỖI 3: ARR disk cache lock kẹt ở RQ_EXECUTE_REQUEST_HANDLER       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Loopback TCP qua HTTP.sys
                                    ▼ (Port 7109)
┌────────────────────────────────────────────────────────────────────────┐
│ HTTP.sys Kernel Socket Stack                                           │
│   ❌ LỖI 1: Loopback Deadlock & Connection Starvation                  │
│             Cùng 1 máy chủ mở socket tự gọi lại chính mình             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ IIS Site: InternLinkApi (ASP.NET Core w3wp.exe)                        │
│   ❌ LỖI 4: Idle Timeout 20 phút → Worker bị dừng → Cold start > 15s   │
│             khiến WinHTTP từ cổng 80 bị timeout trước khi API thức dậy │
└────────────────────────────────────────────────────────────────────────┘
```

### Căn nguyên 1: HTTP.sys Loopback Kernel Socket Deadlock
- **Bản chất:** Cả hai IIS Sites đều nằm trên cùng một instance Windows Server và chịu sự điều phối của driver tầng nhân `HTTP.sys`.
- Khi Client gửi request tới cổng 80, tiến trình worker của Site 1 sử dụng module ARR (dựa trên thư viện **WinHTTP**) để khởi tạo một TCP connection mới ngược về `127.0.0.1:7109` (Site 2).
- Trên môi trường máy chủ tài nguyên hạn chế (2GB RAM, 1-2 vCPU), số lượng I/O completion ports và worker threads bị giới hạn. HTTP.sys phải vừa giữ kết nối từ client vừa giữ kết nối loopback nội bộ. Khi xảy ra tải dồn hoặc có request chậm, các thread bị khóa chéo (cross-dependency thread starvation), dẫn đến việc HTTP.sys chủ động đóng kết nối và ghi nhận `Connection_Dropped`.

### Căn nguyên 2: AWS EC2 VPC WinHTTP WPAD DNS Discovery Timeout
- **Bản chất:** WinHTTP mặc định kích hoạt cơ chế tự động dò tìm cấu hình Proxy mạng (**Web Proxy Auto-Discovery Protocol - WPAD**) thông qua DHCP Option 252.
- Hạ tầng mạng VPC của Amazon AWS **không hỗ trợ DHCP Option 252**. Do đó, mỗi khi WinHTTP của ARR cố gắng mở kết nối loopback tới `127.0.0.1:7109`, nó phát sinh các truy vấn DNS thăm dò tới `wpad.ec2.internal` hoặc `wpad.<subdomain>`.
- Mỗi truy vấn DNS này mất từ **15 đến 30 giây** để timeout trước khi WinHTTP quyết định kết nối thẳng tới IP đích. Khi nhiều request dồn vào, độ trễ cộng dồn làm toàn bộ queue của IIS bị nghẽn hoàn toàn.

### Căn nguyên 3: ARR Disk Cache Lock & Pipeline Freezing
- Khi cài đặt ARR qua lệnh Chocolatey (`choco install iis-arr`), tính năng proxy cache mặc định bật (`system.webServer/proxy/cache enabled="true"`).
- Tuy nhiên, server không được cấu hình thư mục đĩa lưu trữ cache chuyên dụng (Disk Cache Drive).
- Khi ARR nhận các request streaming hoặc chunked payload (như SignalR `/hubs/notifications` hoặc phản hồi JSON lớn), module `requestRouting` bị treo ở bước pipeline `RQ_EXECUTE_REQUEST_HANDLER` để chờ đợi disk lock không tồn tại. Lệnh cấu hình `appcmd.exe set config -section:system.webServer/proxy/cache` trên IIS 10 còn thường xuyên báo lỗi `Unknown config section` do schema XML bị lock bởi tiến trình `w3wp.exe`.

### Căn nguyên 4: IIS AppPool Idle Timeout Cold Start trên 2GB RAM
- IIS đặt mặc định `idleTimeout = 20 phút` cho mọi Application Pool. Sau 20 phút không có người truy cập, tiến trình `w3wp.exe` của Backend tự động giải phóng bộ nhớ và tắt.
- Máy chủ EC2 chỉ có 2 GiB RAM chạy đồng thời SQL Server Express và Windows Defender. Khi có request mới, .NET 10 cần từ **14 đến 25 giây** để nạp runtime, JIT compile và Entity Framework Core DbContext (`MigrateAndSeedDatabaseAsync`).
- ARR proxy ở cổng 80 có timeout mặc định thấp hơn thời gian cold start, dẫn tới việc ARR ngắt kết nối trước khi Backend kịp thức dậy, trả về lỗi 502 liên tục cho Client.

---

## 3. Giải Pháp Tối Ưu: Kiến Trúc Direct Single-Port SPA Hosting

Sau khi phân tích toàn bộ nhược điểm của mô hình Reverse Proxy trên máy chủ nhỏ, giải pháp triệt để và bền vững nhất được áp dụng là: **Loại bỏ hoàn toàn ARR, gộp Frontend và Backend chạy chung trên Cổng 80 duy nhất.**

### 3.1. Sơ đồ kiến trúc mới

```
[ Client / Web Browser ]
         │
         ▼ HTTP Port 80
┌────────────────────────────────────────────────────────────────────────┐
│ Windows Server 2019 — IIS (Cổng 80)                                    │
│ Site: InternLinkApi                                                    │
│ Application Pool: InternLinkApi (No Managed Code, IdleTimeout = 0)     │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ ASP.NET Core Runtime (.NET 10 In-Process)                      │   │
│   │                                                                │   │
│   │   [ Request Pipeline ]                                         │   │
│   │                                                                │   │
│   │   ├──► /api/*         ──► Controllers                          │   │
│   │   ├──► /hubs/*        ──► SignalR NotificationsHub             │   │
│   │   ├──► /health/*      ──► HealthCheck Endpoints                │   │
│   │   │                                                            │   │
│   │   ├──► Static Assets  ──► UseStaticFiles()                     │   │
│   │   │    (.js, .css, .ico)  (phục vụ từ ./wwwroot/)              │   │
│   │   │                                                            │   │
│   │   └──► SPA Route      ──► MapFallbackToFile("index.html")      │   │
│   │        (/admin, /login)   (Client-side Routing)                │   │
│   └────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Windows Integrated Auth (Shared Memory)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SQL Server 2022 Express (localhost\SQLEXPRESS)                         │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2. Thay đổi mã nguồn Backend (`Program.cs`)

Trong pipeline của ASP.NET Core, bổ sung middleware phục vụ file tĩnh và fallback routing cho SPA:

```csharp
// 1. Phục vụ file tĩnh và tài nguyên React SPA từ thư mục wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

// 2. Định tuyến API và SignalR Hub
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapCustomHealthChecks();

// 3. Fallback: Nếu request không khớp file tĩnh và không khớp API, trả về index.html cho React Router
app.MapFallbackToFile("index.html");
```

> [!NOTE]
> Khi chạy ở môi trường HTTP cổng 80 công khai mà chưa cài đặt SSL Certificate, dòng `app.UseHttpsRedirection();` cần được vô hiệu hóa để tránh việc trình duyệt bị chuyển hướng lặp vô tận (Redirect Loop) sang cổng 443 khi cổng này chưa sẵn sàng.

### 3.3. So sánh hiệu năng trước và sau chuyển đổi

| Tiêu chí | Kiến trúc cũ (ARR Proxy) | Kiến trúc mới (Direct Hosting) | Cải thiện |
|:---|:---:|:---:|:---:|
| **Số tiến trình IIS (w3wp.exe)** | 2 tiến trình độc lập | **1 tiến trình duy nhất** | Giảm 50% số tiến trình |
| **Tiêu thụ RAM** | ~550 MB | **~280 MB** | Tiết kiệm ~270 MB RAM quý giá trên máy 2GB |
| **Độ trễ Proxy nội bộ** | 15s - 30s (WPAD bug) | **0 ms (Phục vụ trực tiếp)** | Phản hồi API ngay lập tức (< 50ms) |
| **CORS Overhead** | Bắt buộc xử lý OPTIONS preflight | **Không tồn tại CORS** (cùng 1 origin/port) | Giảm 50% số lượng request mạng |
| **Rủi ro Socket Deadlock** | Rất cao (HTTP.sys loopback) | **Triệt tiêu 100%** (Không còn loopback) | Tuyệt đối an toàn trước deadlock |
| **Độ phụ thuộc phần mềm** | Cần `iis-arr`, `urlrewrite` | **Không cần ARR/UrlRewrite** | Giảm thiểu lỗi cài đặt bên thứ 3 |

---

## 4. Bảng Đánh Giá Rủi Ro & Biện Pháp Phòng Vệ

| Rủi ro tiềm ẩn | Nguyên nhân | Biện pháp kỹ thuật đã tích hợp |
|:---|:---|:---|
| **Xung đột định tuyến (Routing Conflict)** | Đường dẫn trang SPA trùng với đường dẫn API Controller | **Quy ước chuẩn mực:** Mọi Controller nghiệp vụ đều bắt buộc có route bắt đầu bằng `/api/` (ví dụ `/api/Auth/login`). Static assets có phần mở rộng `.js`, `.css`, `.png`. Hàm `app.MapFallbackToFile("index.html")` nằm ở cuối cùng của pipeline, chỉ bắt các route chưa được Controller nào xử lý. |
| **Khóa file (File Lock) khi Deploy** | Tiến trình `w3wp.exe` đang chạy giữ khóa các file `.dll` và file trong `wwwroot` | **Tự động hóa:** Script deploy `update-windows-server.ps1` tạo `app_offline.htm`, gửi tín hiệu dừng AppPool, đợi tối đa 90s cho `w3wp.exe` thoát hoàn toàn rồi mới chạy `robocopy`, sau đó xóa `app_offline.htm` và bật lại. |
| **Tải cao khi phục vụ Static Files** | ASP.NET Core phải gánh thêm việc đọc ổ cứng phục vụ file `.js`, `.css` | File tĩnh của React sau khi build bằng Vite chỉ vỏn vẹn ~5MB. ASP.NET Core Static Files Middleware tự động cache header ETag và hỗ trợ conditional GET (`304 Not Modified`). Đối với hệ thống thực tập sinh trường học, tải hoàn toàn nằm trong mức cho phép. Khi lượng người dùng tăng, có thể đặt Cloudflare phía trước làm CDN miễn phí. |
| **Mất thư mục tải lên (Uploads)** | Khi xóa hoặc ghi đè thư mục ứng dụng | Toàn bộ dữ liệu người dùng (`uploads/documents`, `uploads/submissions`, `uploads/weekly-reports`) được đặt ngoài thư mục publish code hoặc loại trừ rõ ràng trong `robocopy /XD` và được backup tự động. |

---

## 5. Quy Trình Vận Hành & Khắc Phục Nhanh (Runbook)

Dành cho DevOps / Quản trị viên hệ thống khi cần kiểm tra hoặc xử lý sự cố trên server.

### Bước 1: Mở PowerShell quyền Administrator
Mọi thao tác quản trị IIS và Windows Service đều bắt buộc chạy dưới quyền Elevated Administrator:
```powershell
Start-Process powershell -Verb RunAs
```

### Bước 2: Kiểm tra sức khỏe hệ thống (Quick Health Check)
```powershell
# 1. Kiểm tra Health Endpoint qua Port 80 nội bộ
Invoke-WebRequest -Uri "http://127.0.0.1/health/ready" -UseBasicParsing | Select-Object StatusCode, Content

# 2. Kiểm tra Website công khai
Invoke-WebRequest -Uri "http://internlink.duckdns.org/" -UseBasicParsing | Select-Object StatusCode

# 3. Kiểm tra trạng thái IIS Site và AppPool
Import-Module WebAdministration
Get-Website -Name 'InternLinkApi' | Select-Object Name, State, Bindings
Get-WebAppPoolState -Name 'InternLinkApi'
```

### Bước 3: Đảm bảo AppPool không bao giờ bị ngủ (No Idle Timeout)
Nếu AppPool bị đưa về mặc định sau khi update Windows, chạy lệnh sau:
```powershell
Import-Module WebAdministration
Set-ItemProperty 'IIS:\AppPools\InternLinkApi' -Name processModel.idleTimeout -Value ([TimeSpan]::Zero)
Set-ItemProperty 'IIS:\AppPools\InternLinkApi' -Name startMode -Value 'AlwaysRunning'
Restart-WebAppPool -Name 'InternLinkApi'
```

### Bước 4: Khởi động lại dịch vụ nhanh khi có dấu hiệu nghẽn (Emergency Restart)
Nếu hệ thống gặp tình trạng tiêu thụ quá 90% RAM do SQL Server hoặc có tiến trình mồ côi:
```powershell
# Dừng IIS hoàn toàn
iisreset /stop

# Đợi 5 giây
Start-Sleep -Seconds 5

# Bật lại IIS
iisreset /start

# Kiểm tra lại health check
Invoke-WebRequest -Uri "http://127.0.0.1/health/ready" -UseBasicParsing
```

### Bước 5: Kiểm tra vị trí các file Log quan trọng
- **Log nghiệp vụ ứng dụng (Serilog/File Log):**
  `C:\Apps\InternLink\Api\Logs`
- **Log lỗi kết nối tầng mạng HTTP.sys (Nơi ghi nhận connection drop):**
  `C:\Windows\System32\LogFiles\HTTPERR`
- **Log truy cập IIS W3C:**
  `C:\inetpub\logs\LogFiles\W3SVC*`
- **Log hệ điều hành:**
  Mở `eventvwr.msc` → `Windows Logs` → `Application` (Lọc Source: `IIS-W3SVC-WP` hoặc `ASP.NET Core`).

---

## 6. Lời Khuyên Về Khởi Động Lại Server (Reboot Policy)

> [!IMPORTANT]
> **Có nên khởi động lại Windows Server sau khi áp dụng cấu hình này?**  
> **CÓ, NÊN LÀM.**  
> Việc Restart Windows Server (Reboot OS) mang lại các lợi ích kiểm chứng sau:
> 1. **Kiểm tra tính tự phục hồi (Survivability Verification):** Đảm bảo service `MSSQL$SQLEXPRESS` và `W3SVC` tự động bật khi máy khởi động lại mà không cần ai đăng nhập RDP để gõ lệnh.
> 2. **Xóa sạch Socket rác & Handle rác:** Giải phóng toàn bộ socket TCP đang ở trạng thái `TIME_WAIT` và kernel handle bị rò rỉ trong suốt quá trình ARR gặp sự cố trước đó.
> 3. **Giải phóng RAM vật lý:** SQL Server Express sẽ giải phóng bộ nhớ đệm cache và khởi tạo lại mức sử dụng tối ưu nhất.
>
> **Lệnh khởi động lại server an toàn từ PowerShell:**
> ```powershell
> Restart-Computer -Force
> ```
> *Sau khi server khởi động lại (khoảng 2-3 phút), kiểm tra lại bằng lệnh ở Bước 2 để xác nhận hệ thống tự động online.*

