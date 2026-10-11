# 🛠️ Sổ Tay Quy Trình Vận Hành & Bảo Trì Hệ Thống (System Maintenance SOP)
**Dự án:** InternLink — Hệ thống Quản lý Thực tập Doanh nghiệp  
**Phiên bản tài liệu:** 1.0 (Cập nhật: 12/10/2026)

---

## 📌 1. NGUYÊN TẮC VÀNG KHI BẢO TRÌ PRODUCTION (5 GOLDEN RULES)

Khi can thiệp vào máy chủ Windows Server / AWS EC2 đang chạy thực tế, **bắt buộc tuân thủ 5 nguyên tắc sau:**

1. **Backup First (Sao lưu trước, thao tác sau):** Luôn tạo bản sao lưu Database (`.bak`) và thư mục `uploads/` trước khi chạm vào bất kỳ file nào.
2. **Maintenance Mode (Chế độ bảo trì):** Tạm dừng Website/API (`Stop-Website`) để ngắt luồng người dùng truy cập hoặc tải file lên trong lúc đang sửa đổi.
3. **Dry-Run by Default (Chạy thử trước):** Mọi script bảo trì phải có chế độ chạy thử nghiệm (không sửa đổi gì) để rà soát toàn bộ lỗi trước khi chạy thật (`-Apply`).
4. **All-or-Nothing (Nguyên tắc toàn vẹn):** Nếu có **dù chỉ 1 file bị lỗi** hoặc **1 bản ghi không khớp**, hệ thống phải lập tức dừng lại, từ chối thực hiện để tránh tình trạng "sửa nửa vời" gây lệch pha dữ liệu.
5. **Atomic Database Transactions:** Mọi câu lệnh SQL cập nhật phải đặt trong `BEGIN TRANSACTION ... COMMIT` kèm kiểm tra `IF @@ROWCOUNT <> 1 THROW` để tự động Rollback nếu có sai lệch.

---

## 🎯 2. QUY TRÌNH CHUẨN SỬA LỖI TÊN FILE & ĐỒNG BỘ DATABASE
*(Áp dụng cho case study: Khắc phục lỗi mất chữ `Đ` trong tên file báo cáo tuần)*

### 🔍 Bản chất kỹ thuật của lỗi
* **Nguyên nhân:** Chuẩn Unicode Form D chỉ tách các ký tự có dấu tổ hợp (`á` $\rightarrow$ `a` + dấu sắc). Ký tự `Đ` (U+0110) là chữ cái Latin độc lập có nét gạch ngang (Stroke), không phải dấu tổ hợp. Khi dùng regex lọc bỏ ký tự đặc biệt, chữ `Đ` bị xóa nhầm thành rỗng (Ví dụ: `Đặng Minh Nghĩa` $\rightarrow$ `angMinhNghia`).
* **Giải pháp:** Ánh xạ tường minh `Đ` $\rightarrow$ `D` và `đ` $\rightarrow$ `d` trước khi chuẩn hóa Unicode.

---

### 📋 QUY TRÌNH THỰC THI 4 BƯỚC BẰNG POWERSHELL (100% NO-GUI)

#### Bước 2.1: Chuẩn bị & Đưa hệ thống vào bảo trì
Mở **PowerShell (Run as Administrator)** trên máy chủ:

```powershell
# 1. Dừng nhận request từ người dùng
Stop-Website -Name 'InternLink'
Stop-Website -Name 'InternLinkApi'

# 2. Tạo thư mục tạm lưu kết quả
New-Item -ItemType Directory -Force "C:\Temp" | Out-Null

Write-Host "Hệ thống đã ở trạng thái bảo trì." -ForegroundColor Yellow
```

#### Bước 2.2: Xuất danh sách ứng viên từ Database ra CSV
Sử dụng module `SqlServer` có sẵn trên máy chủ để chạy câu truy vấn trích xuất:

```powershell
Import-Module SqlServer -ErrorAction Stop

# Chạy query và xuất ra file CSV UTF-8
Invoke-Sqlcmd -ServerInstance 'localhost\SQLEXPRESS' -Database 'InternLink' `
    -TrustServerCertificate `
    -InputFile "C:\src\InternLink\scripts\repair-weekly-report-filenames.sql" `
    | Export-Csv -Path "C:\Temp\weekly-report-candidates.csv" -Encoding UTF8 -NoTypeInformation

Write-Host "Đã xuất danh sách ứng viên ra: C:\Temp\weekly-report-candidates.csv" -ForegroundColor Green
```

#### Bước 2.3: Chạy thử nghiệm (Dry-Run — An toàn tuyệt đối)
```powershell
cd C:\src\InternLink\scripts

.\repair-weekly-report-filenames.ps1 `
    -InputCsv "C:\Temp\weekly-report-candidates.csv" `
    -UploadRoot "C:\Apps\InternLink\Api\uploads\weekly-reports" `
    -Verbose
```
* **Mục tiêu kiểm tra:**
  * Xem bảng đối chiếu: `OldFileName` $\rightarrow$ `NewFileName`.
  * Cột `Error` phải **trống hoàn toàn** (không có file nguồn bị mất, không có file đích bị trùng tên).

#### Bước 2.4: Áp dụng đổi tên file vật lý & Cập nhật Database
Khi bước chạy thử nghiệm thành công sạch lỗi:

```powershell
# 1. Đổi tên file vật lý trên ổ đĩa và sinh file SQL cập nhật Database
.\repair-weekly-report-filenames.ps1 `
    -InputCsv "C:\Temp\weekly-report-candidates.csv" `
    -UploadRoot "C:\Apps\InternLink\Api\uploads\weekly-reports" `
    -Apply `
    -OutputSql "C:\Temp\repair-weekly-report-filenames.generated.sql"

# 2. Thực thi file SQL vừa sinh vào Database
Invoke-Sqlcmd -ServerInstance 'localhost\SQLEXPRESS' -Database 'InternLink' `
    -TrustServerCertificate `
    -InputFile "C:\Temp\repair-weekly-report-filenames.generated.sql" `
    -Verbose

Write-Host "Cập nhật file và Database hoàn tất 100%!" -ForegroundColor Green
```

#### Bước 2.5: Khởi động lại hệ thống
```powershell
# Bật lại các website và application pool
Start-Website -Name 'InternLink'
Start-Website -Name 'InternLinkApi'
Restart-WebAppPool -Name 'InternLinkApi'

Write-Host "Bảo trì hoàn tất. Hệ thống đã mở lại cho người dùng!" -ForegroundColor Cyan
```

---

## 🛡️ 3. KỊCH BẢN ROLLBACK (KHI CÓ SỰ CỐ)

Hệ thống được thiết kế cơ chế bảo vệ đa tầng để xử lý rủi ro:

### Trường hợp 1: Lỗi giữa chừng khi đang đổi tên file vật lý
* Script [repair-weekly-report-filenames.ps1](file:///e:/Downloads/InternLink/scripts/repair-weekly-report-filenames.ps1) có khối `catch` tự động đảo ngược mảng file (`[array]::Reverse`) để **đổi tên ngược lại về file cũ ngay lập tức**.
* File SQL đầu ra sẽ tự động bị xóa nếu bước đổi file chưa hoàn tất 100%.

### Trường hợp 2: Lỗi khi chạy cập nhật Database
* Script SQL được sinh ra với cơ chế:
  ```sql
  SET XACT_ABORT ON;
  BEGIN TRANSACTION;
  ...
  IF @@ROWCOUNT <> 1 THROW 51000, 'Expected exactly one row...', 1;
  ...
  COMMIT TRANSACTION;
  ```
* Nếu có bất kỳ bản ghi nào không khớp, SQL Server sẽ **tự động Rollback toàn bộ transaction**, dữ liệu Database không bao giờ bị sai lệch một phần.

### Trường hợp 3: Sự cố nghiêm trọng cần khôi phục toàn diện
Khôi phục Database từ bản sao lưu gần nhất tạo bởi deploy script:
```powershell
# Xem danh sách các bản backup trước deploy
Get-ChildItem -Path "C:\Apps\InternLink\Backups" -Filter "*.bak" | Sort-Object LastWriteTime -Descending

# Restore database (nếu cần thiết)
# Invoke-Sqlcmd -ServerInstance 'localhost\SQLEXPRESS' -Database master -Query "RESTORE DATABASE [InternLink] FROM DISK = 'C:\Apps\InternLink\Backups\InternLink-before-deploy-XXXX.bak' WITH REPLACE"
```

---

## 💡 4. TỔNG HỢP KINH NGHIỆM XƯƠNG MÁU (LESSONS LEARNED)

| STT | Vấn đề từng gặp | Nguyên nhân cốt lõi | Giải pháp chuẩn hóa lâu dài |
|---|---|---|---|
| **1** | **Lỗi SMTP 502 BadCredentials** | File `appsettings.local.json` cũ bị lãng quên trong thư mục Git `C:\src` ghi đè mật khẩu mới mỗi lần chạy script deploy. | Script deploy hiện tại tự động **xóa sạch mọi file `appsettings.local.json`** để ưu tiên `appsettings.json` làm nguồn chân lý duy nhất. |
| **2** | **Lỗi SQL Server `Msg 131`** | Dùng `CAST(NULL AS nvarchar(8000))` vượt quá giới hạn tối đa 4000 ký tự của kiểu `nvarchar`. | Trong SQL Server, với kiểu Unicode độ dài lớn, luôn dùng **`nvarchar(max)`** thay vì `nvarchar(8000)`. |
| **3** | **Tắt cửa sổ PowerShell khi chạy script** | Dùng lệnh `exit 2` bên trong script PowerShell khiến terminal đang mở bị đóng đột ngột. | Trong script nội bộ, dùng **`return`** hoặc **`throw`** thay vì `exit` để giữ nguyên terminal xem thông báo lỗi. |
| **4** | **Lỗi Font tiếng Việt khi xuất/nhập SQL & CSV** | Mặc định xuất CSV không chỉ định UTF-8 dẫn đến các ký tự Unicode tiếng Việt biến thành dấu `?`. | Luôn xuất CSV kèm tham số **`-Encoding UTF8`** và sinh file SQL với **`System.Text.UTF8Encoding($true)` (UTF-8 with BOM)**. |
| **5** | **Không tìm thấy thư mục `uploads`** | Thư mục `uploads/` bị `.gitignore` chặn nên không nằm trong `C:\src\InternLink`. | Thư mục upload thực tế của IIS luôn nằm tại **`C:\Apps\InternLink\Api\uploads\`**. |
