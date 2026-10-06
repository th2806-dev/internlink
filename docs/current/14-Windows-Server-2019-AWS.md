# Triển khai InternLink trên Windows Server 2019 (AWS)

Hướng dẫn này triển khai trực tiếp trên Windows Server 2019, không dùng Docker Desktop, Docker Compose hoặc ngrok:

- SQL Server chạy trên Windows Server.
- ASP.NET Core API chạy qua IIS tại `127.0.0.1:7109`.
- Frontend React được build thành file tĩnh và phục vụ bởi IIS.
- IIS ARR chuyển tiếp `/api`, `/hubs` và `/health` đến API.
- DuckDNS: `internlink.duckdns.org`.

Đây là phương án chạy ứng dụng native trên Windows; các lệnh Docker Compose trong README không dùng cho máy triển khai này.

> **Tài nguyên EC2:** máy hiện tại là `t3.small` (2 GiB RAM), không phù hợp để chạy IIS, API và SQL Server cùng lúc. Trước khi triển khai, dừng instance và đổi sang máy Windows tương thích có tối thiểu 4 GiB RAM; khuyến nghị 8 GiB cho SQL Server và ứng dụng.

## 1. Kiểm tra địa chỉ IP và DNS

Domain phải trỏ tới **Public IPv4 hoặc Elastic IP của đúng EC2 instance**, không phải địa chỉ private của Windows hay IP public của một máy khác. Trong AWS Console, kiểm tra **EC2 → Instances → instance → Public IPv4 address**. Nếu IP có thể thay đổi khi dừng/chạy instance, cấp và associate Elastic IP trước.

Kiểm tra bản ghi A từ PowerShell:

```powershell
Resolve-DnsName internlink.duckdns.org -Type A
```

Domain dự kiến dùng IP `171.246.98.49`. Trước khi tiếp tục, xác nhận IP này cũng chính là IP public/Elastic IP đang được AWS gán cho EC2. Nếu không khớp, cập nhật DuckDNS; không tiếp tục triển khai cho tới khi DNS trỏ đúng server.

## 2. AWS Security Group và Windows Firewall

Inbound rules của Security Group:

| Port | Source | Mục đích |
|:--|:--|:--|
| TCP 3389 | IP quản trị của bạn `/32` | Remote Desktop |
| TCP 80 | `0.0.0.0/0` | Website HTTP |
| TCP 443 | `0.0.0.0/0` | HTTPS |

Trong AWS Security Group, chọn **Custom TCP** (protocol TCP), port `80`, source `0.0.0.0/0` để URL dùng được mà không hiện port. Không mở TCP `1433` (SQL Server) hoặc `7109` (API) ra Internet. Giữ RDP giới hạn vào IP quản trị. Lệnh mở Windows Firewall:

```powershell
New-NetFirewallRule -DisplayName "InternLink HTTP 80" `
  -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
```

## 3. Cài thành phần Windows

Máy EC2 hiện tại `t3.small` chỉ có 2 GiB RAM; script bên dưới cố ý dừng ở cấu hình này. Đổi instance sang tối thiểu 4 GiB RAM (khuyến nghị 8 GiB) trước khi cài SQL Server và build ứng dụng.

Sau khi nâng cấp EC2 lên ít nhất 4 GiB RAM, mở **Windows PowerShell bằng quyền Administrator** trên server. Khối lệnh dưới đây bootstrap Chocolatey/Git nếu chưa có, clone source và chạy installer:

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
.\scripts\install-windows-server.ps1
```

Script tự cài IIS, Git, Node.js LTS, .NET 10 SDK, ASP.NET Core Hosting Bundle, SQL Server 2022 Express, IIS URL Rewrite và ARR; sau đó build/publish source, tạo database, cấu hình IIS với hostname `internlink.duckdns.org` trên port 80 và mở Windows Firewall TCP 80.

Script chạy lại được sau khi cài dở hoặc khởi động lại. Nó tải Chocolatey packages, PowerShell SQLServer module và .NET Hosting Bundle từ Internet. SQL Express được cài làm instance `SQLEXPRESS`; script tạo database `InternLink`, cấp quyền migrations cho IIS App Pool bằng Windows Integrated Authentication, cấu hình thư mục uploads/log/backup, rồi build frontend/API. Kết nối provisioning tới SQL Express dùng `-TrustServerCertificate` cho certificate tự ký ở local server. Script không mở SQL/API port ra ngoài.

Nếu script trước đó đã dừng ở lỗi SQL certificate chain, bản sửa cần có `-TrustServerCertificate` trên hai lệnh `Invoke-Sqlcmd`. Cập nhật source rồi chạy lại:

```powershell
Set-Location C:\src\InternLink
git pull --ff-only origin main
.\scripts\install-windows-server.ps1 -AllowLowMemory
```

Sau khi lệnh hoàn thành, trong AWS Security Group thêm inbound **Custom TCP** `80`, rồi kiểm tra:

```powershell
Invoke-WebRequest http://127.0.0.1:7109/health/ready
Invoke-WebRequest http://internlink.duckdns.org/
```

Nếu quá trình dừng do cần reboot, khởi động lại Windows Server, vào lại `C:\src\InternLink` và chạy script lần nữa.

## 4. Cấu hình SQL Server (tham khảo sau khi chạy script)

Script cài SQL Server Express 2022 instance `SQLEXPRESS`, tạo database và login Windows cho identity `IIS APPPOOL\InternLinkApi`; không cần bật SQL authentication hay mở TCP/IP ra mạng.

Nếu cần kiểm tra bằng SSMS, có thể cài SSMS và kết nối Windows Authentication tới `localhost\SQLEXPRESS`. Script không cài SSMS vì đây chỉ là công cụ quản trị, không cần để ứng dụng chạy.

SQL Server Express có giới hạn kích thước database; theo dõi dung lượng và RAM khi vận hành.

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
[Environment]::SetEnvironmentVariable('Email__PortalUrl', 'http://internlink.duckdns.org', 'Machine')
[Environment]::SetEnvironmentVariable('Cors__AllowedOrigins__0', 'http://internlink.duckdns.org', 'Machine')
[Environment]::SetEnvironmentVariable('Cors__AllowedOrigins__1', $null, 'Machine')
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

Tạo frontend site trong IIS với physical path `C:\inetpub\wwwroot\InternLink`, binding HTTP port `80`, host name `internlink.duckdns.org`. Binding theo hostname giữ URL gọn, không cần nhập `:80`.

```text
http://internlink.duckdns.org/
```

Nếu không mở được từ bên ngoài, kiểm tra cả DNS, AWS Security Group, Windows Firewall và IIS binding. Kiểm tra local trên server bằng:

```powershell
curl.exe --resolve internlink.duckdns.org:80:127.0.0.1 http://internlink.duckdns.org/
```

## 9. Bật HTTPS bằng Let's Encrypt

Chỉ làm bước này sau khi domain trỏ đúng Public/Elastic IP, site HTTP truy cập được từ Internet và TCP 80 đã mở.

1. Đảm bảo TCP 80 được mở từ Internet để hoàn thành HTTP validation và phục vụ website.
2. Tải **win-acme** từ trang phát hành chính thức của dự án `win-acme`.
3. Chạy `wacs.exe` bằng quyền Administrator.
4. Chọn tạo certificate cho IIS site/binding `internlink.duckdns.org`, dùng HTTP validation.
5. Tạo HTTPS binding cho port 443 (hoặc binding TLS riêng theo quy hoạch cổng), rồi cấu hình renew tự động.
6. Cập nhật `Email__PortalUrl` và `Cors__AllowedOrigins__*` theo origin HTTPS thực tế, recycle App Pool và kiểm tra lại.

Không nhập password hay private key vào source code. Không bật HSTS cho tới khi đã xác nhận HTTPS ổn định.

## 10. Kiểm tra cuối cùng

Trên server:

```powershell
Invoke-WebRequest http://127.0.0.1:7109/health/live
Invoke-WebRequest http://internlink.duckdns.org/health/live
```

Trên máy người dùng, truy cập `http://internlink.duckdns.org/`, đăng nhập và kiểm tra một thao tác gọi API, upload/download tệp và SignalR nếu dùng tính năng realtime. Địa chỉ HTTP không mã hóa lưu lượng; cấu hình HTTPS trước khi dùng tài khoản thật qua Internet.

Seed Production hiện chỉ tạo tài khoản `admin`; tài liệu dự án ghi mật khẩu khởi tạo là `Password123!`. Đổi mật khẩu ngay sau lần đăng nhập đầu tiên. Không sử dụng mật khẩu mặc định trên server công khai.

## 11. Cập nhật và backup

- Để triển khai bản mới mà không thay database hoặc uploads, mở PowerShell bằng quyền Administrator và chạy:

  ```powershell
  Set-Location C:\src\InternLink
  git stash push -m "server changes before update"
  .\scripts\update-windows-server.ps1
  ```

  Script pull `main`, tạo SQL backup không nén trước khi triển khai, build frontend/API, đưa API offline và đợi IIS worker thoát trước khi chép DLL; uploads và `web.config` được giữ nguyên. Script cập nhật binding sang port 80, khởi động lại API rồi kiểm tra health. Nếu port 80 đã được một IIS site đang chạy khác sử dụng, script sẽ dừng trước khi triển khai và nêu tên binding xung đột. Lệnh `git stash` giữ lại các chỉnh sửa code tracked cục bộ trước khi pull; không tự động áp dụng lại stash sau deploy.
- Sau khi cập nhật, đảm bảo AWS Security Group vẫn có **Custom TCP** port `80` từ các client dự định truy cập; đóng inbound port `8000` nếu còn rule cũ.
- Lên lịch backup SQL Server và thư mục uploads cùng nhau, rồi sao chép backup ra ngoài EC2. Hướng dẫn script hiện có nằm trong [08-Operations.md](08-Operations.md).
- Không dùng Docker Desktop/Compose hoặc `start.bat` cho quy trình native Windows Server này.
