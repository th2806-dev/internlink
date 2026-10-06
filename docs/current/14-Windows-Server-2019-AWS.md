# Triển khai InternLink trên Windows Server 2019 (AWS)

Hướng dẫn này triển khai trực tiếp trên Windows Server 2019, không dùng Docker Desktop, Docker Compose hoặc ngrok:

- SQL Server chạy trên Windows Server.
- ASP.NET Core API chạy qua IIS tại `127.0.0.1:7109`.
- Frontend React được build thành file tĩnh và phục vụ bởi IIS.
- IIS ARR chuyển tiếp `/api`, `/hubs` và `/health` đến API.
- DuckDNS: `internlink.duckdns.org`.

## 1. Kiểm tra địa chỉ IP và DNS

Domain phải trỏ tới **Public IPv4 hoặc Elastic IP của đúng EC2 instance**, không phải địa chỉ private của Windows hay IP public của một máy khác. Trong AWS Console, kiểm tra **EC2 → Instances → instance → Public IPv4 address**. Nếu IP có thể thay đổi khi dừng/chạy instance, cấp và associate Elastic IP trước.

Kiểm tra bản ghi A từ PowerShell:

```powershell
Resolve-DnsName internlink.duckdns.org -Type A
```

Tại thời điểm tài liệu này được cập nhật, domain phân giải thành `171.246.98.49`. Trước khi tiếp tục, xác nhận IP này cũng chính là IP public đang được AWS gán cho EC2. Nếu không khớp, cập nhật DuckDNS; không tiếp tục cấp TLS certificate cho IP sai.

## 2. AWS Security Group và Windows Firewall

Inbound rules của Security Group:

| Port | Source | Mục đích |
|:--|:--|:--|
| TCP 3389 | IP quản trị của bạn `/32` | Remote Desktop |
| TCP 80 | `0.0.0.0/0` | Web và Let's Encrypt HTTP validation |
| TCP 443 | `0.0.0.0/0` | HTTPS |

Không mở TCP `1433` (SQL Server) hoặc `7109` (API) ra Internet. Trên Windows Firewall, cho phép inbound TCP 80 và 443. Giữ RDP giới hạn vào IP quản trị.

## 3. Cài thành phần Windows

Mở PowerShell bằng quyền Administrator:

```powershell
Install-WindowsFeature Web-Server, Web-WebSockets, Web-Mgmt-Tools, Web-Scripting-Tools
```

Cài các thành phần sau bằng bộ cài chính thức:

1. SQL Server 2022 Database Engine. Developer edition chỉ dùng cho demo/kiểm thử; production cần edition có giấy phép phù hợp.
2. .NET 10 SDK x64.
3. ASP.NET Core 10 Hosting Bundle x64. Cài Hosting Bundle sau SDK.
4. Node.js 20 LTS x64 và Git for Windows.
5. IIS URL Rewrite và IIS Application Request Routing (ARR).

Trong IIS Manager, tại cấp server mở **Application Request Routing Cache → Server Proxy Settings**, đánh dấu **Enable proxy**, rồi Apply. Bật WebSocket trong IIS nếu chưa bật. Sau khi cài Hosting Bundle, chạy:

```powershell
iisreset
```

## 4. Cài và chuẩn bị SQL Server

Ưu tiên default SQL Server instance để API có thể dùng `Server=localhost`. Bật TCP/IP trong SQL Server Configuration Manager nếu chưa bật, rồi restart SQL Server service.

Trong SSMS:

1. Tạo database `InternLink`.
2. Bật SQL authentication (Mixed Mode) nếu dùng SQL login.
3. Tạo login riêng cho ứng dụng, không dùng `sa`.
4. Tạo database user tương ứng trong `InternLink` và tạm cấp `db_owner` để API tự áp dụng EF migrations khi khởi động lần đầu. Sau khi migrations hoàn tất, có thể rà soát và thu hẹp quyền theo chính sách vận hành.

Nếu dùng named instance, ví dụ `SQLEXPRESS`, thay `Server=localhost` trong connection string bằng `Server=localhost\SQLEXPRESS`. Đảm bảo SQL Server TCP/IP được cấu hình và instance lắng nghe ổn định.

## 5. Build và publish ứng dụng

Mở PowerShell:

```powershell
git clone https://github.com/th2806-dev/internlink.git C:\src\InternLink
Set-Location C:\src\InternLink

npm ci
npm run build --workspace=frontend

dotnet publish .\backend\InternLink\InternLink.API\InternLink.API.csproj `
  -c Release -o C:\Apps\InternLink\Api

New-Item -ItemType Directory -Force C:\inetpub\wwwroot\InternLink | Out-Null
Copy-Item .\frontend\dist\* C:\inetpub\wwwroot\InternLink -Recurse -Force
```

Khi cập nhật phiên bản, build/publish lại, chép đè frontend `dist`, rồi recycle App Pool hoặc chạy `iisreset`.

## 6. Cấu hình secrets và production settings

Đặt cấu hình ở Machine environment variables để API nhận được sau khi recycle IIS. Thay mọi giá trị trong dấu `<...>` bằng thông tin riêng; không lưu secrets trong Git hoặc gửi qua chat.

```powershell
[Environment]::SetEnvironmentVariable(
  'ConnectionStrings__DefaultConnection',
  'Server=localhost;Database=InternLink;User Id=<APP_LOGIN>;Password=<APP_PASSWORD>;TrustServerCertificate=True;MultipleActiveResultSets=true',
  'Machine'
)
[Environment]::SetEnvironmentVariable(
  'Jwt__Secret',
  '<SECRET_NGAU_NHIEN_IT_NHAT_32_KY_TU>',
  'Machine'
)
[Environment]::SetEnvironmentVariable('ASPNETCORE_ENVIRONMENT', 'Production', 'Machine')
[Environment]::SetEnvironmentVariable('Email__Enabled', 'false', 'Machine')
[Environment]::SetEnvironmentVariable('Email__PortalUrl', 'https://internlink.duckdns.org', 'Machine')
[Environment]::SetEnvironmentVariable('Cors__AllowedOrigins__0', 'https://internlink.duckdns.org', 'Machine')
[Environment]::SetEnvironmentVariable('Cors__AllowedOrigins__1', 'https://internlink.duckdns.org', 'Machine')
```

`Email__Enabled=false` phù hợp khi chưa cấu hình SMTP. Nếu cần gửi email, bật sau khi cài SMTP credentials an toàn. Frontend và API dùng cùng origin nên browser traffic được chuyển qua IIS; không cần mở API riêng ra Internet.

## 7. Tạo IIS site cho API

Tạo thư mục cần thiết và cấp quyền ghi cho App Pool:

```powershell
New-Item -ItemType Directory -Force `
  C:\Apps\InternLink\Api\Logs, `
  C:\Apps\InternLink\Api\uploads, `
  C:\Apps\InternLink\Api\wwwroot\uploads | Out-Null

icacls C:\Apps\InternLink\Api\Logs `
  /grant 'IIS AppPool\InternLinkApi:(OI)(CI)M' /T
icacls C:\Apps\InternLink\Api\uploads `
  /grant 'IIS AppPool\InternLinkApi:(OI)(CI)M' /T
icacls C:\Apps\InternLink\Api\wwwroot\uploads `
  /grant 'IIS AppPool\InternLinkApi:(OI)(CI)M' /T
```

Trong IIS Manager:

1. Tạo Application Pool `InternLinkApi`; đặt **.NET CLR Version** thành **No Managed Code**.
2. Tạo site `InternLinkApi`, physical path `C:\Apps\InternLink\Api`, App Pool `InternLinkApi`.
3. Binding HTTP, IP `127.0.0.1`, port `7109`.

Chỉ bind API vào loopback; không tạo Security Group rule cho port này. Kiểm tra:

```powershell
Invoke-WebRequest http://127.0.0.1:7109/health/live
```

API tự chạy migrations khi khởi động. Xem log `C:\Apps\InternLink\Api\Logs` và **Event Viewer → Windows Logs → Application** để xác nhận migration thành công trước khi chuyển sang frontend.

## 8. Cấu hình IIS frontend và reverse proxy

Tạo `C:\inetpub\wwwroot\InternLink\web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <webSocket enabled="true" />
    <rewrite>
      <rules>
        <rule name="Proxy API, SignalR and health checks" stopProcessing="true">
          <match url="^(api|hubs|health)(/.*)?$" />
          <action type="Rewrite"
                  url="http://127.0.0.1:7109/{R:0}"
                  appendQueryString="true" />
        </rule>
        <rule name="React SPA fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

Tạo frontend site trong IIS với physical path `C:\inetpub\wwwroot\InternLink`, binding HTTP port 80. Ban đầu kiểm tra bằng:

```text
http://internlink.duckdns.org
```

Nếu không mở được từ bên ngoài, kiểm tra cả DNS, AWS Security Group, Windows Firewall và IIS binding.

## 9. Bật HTTPS bằng Let's Encrypt

Chỉ làm bước này sau khi domain trỏ đúng Public/Elastic IP, site HTTP truy cập được từ Internet và TCP 80 đã mở.

1. Tải **win-acme** từ trang phát hành chính thức của dự án `win-acme`.
2. Chạy `wacs.exe` bằng quyền Administrator.
3. Chọn tạo certificate cho IIS site/binding `internlink.duckdns.org`, dùng HTTP validation.
4. Chấp nhận cấu hình IIS HTTPS binding và scheduled renewal task do win-acme thiết lập.
5. Mở `https://internlink.duckdns.org`, xác nhận trình duyệt báo certificate hợp lệ.
6. Sau khi xác nhận HTTPS hoạt động, bật redirect HTTP sang HTTPS trong IIS và cập nhật Security Group để vẫn cho phép TCP 80 nếu dùng HTTP-01 renewal.

Không nhập password hay private key vào source code. Không bật HSTS cho tới khi đã xác nhận HTTPS ổn định.

## 10. Kiểm tra cuối cùng

Trên server:

```powershell
Invoke-WebRequest http://127.0.0.1:7109/health/live
Invoke-WebRequest https://internlink.duckdns.org/health/live
```

Trên máy người dùng, truy cập `https://internlink.duckdns.org`, đăng nhập và kiểm tra một thao tác gọi API, upload/download tệp và SignalR nếu dùng tính năng realtime.

Seed Production hiện chỉ tạo tài khoản `admin`; tài liệu dự án ghi mật khẩu khởi tạo là `Password123!`. Đổi mật khẩu ngay sau lần đăng nhập đầu tiên. Không sử dụng mật khẩu mặc định trên server công khai.

## 11. Cập nhật và backup

- Khi cập nhật code, publish API và build frontend lại theo bước 5, sau đó recycle `InternLinkApi` và kiểm tra health endpoint.
- Lên lịch backup SQL Server và thư mục uploads cùng nhau, rồi sao chép backup ra ngoài EC2. Hướng dẫn script hiện có nằm trong [08-Operations.md](08-Operations.md).
- Không dùng Docker Desktop/Compose hoặc `start.bat` cho quy trình native Windows Server này.
