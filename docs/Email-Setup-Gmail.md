# Cấu hình Gmail SMTP — InternLink

**Tài khoản gửi mặc định:** `internlink.cntt@gmail.com`
**FromName:** `InternLink - Ban Quản lý Thực tập`

---

## 1. Tạo App Password (Gmail)

1. Đăng nhập https://myaccount.google.com với `internlink.cntt@gmail.com`
2. Bật **Xác minh 2 bước** (bắt buộc)
3. Vào **Bảo mật** → **Mật khẩu ứng dụng** (App passwords)  
   hoặc mở: https://myaccount.google.com/apppasswords
4. Tạo mật khẩu cho app (vd. "InternLink API") → Google hiện **16 ký tự**
5. Lưu App Password an toàn; không gửi qua chat, commit vào git hoặc dùng mật khẩu Gmail thông thường

---

## 2. User Secrets (không commit password)

Trong PowerShell:

```powershell
cd e:\InternLink\backend\InternLink\InternLink.API

dotnet user-secrets init
dotnet user-secrets set "Email:Enabled" "true"
dotnet user-secrets set "Email:Username" "internlink.cntt@gmail.com"
dotnet user-secrets set "Email:Password" "<APP_PASSWORD>"
dotnet user-secrets set "Email:FromAddress" "internlink.cntt@gmail.com"
dotnet user-secrets set "Email:SupportEmail" "internlink.cntt@gmail.com"
```

Thay `<APP_PASSWORD>` bằng App Password vừa tạo (có thể bỏ khoảng trắng).

---

## 3. Giá trị đã có trong appsettings

`appsettings.json` chứa host và cổng SMTP cùng địa chỉ gửi mặc định; không chứa App Password. Mặc định `Email:Enabled=false`. Chỉ bật email sau khi đã cấu hình App Password an toàn trong User Secrets, biến môi trường hoặc secret manager.

| Key | Value |
|-----|--------|
| SmtpHost | `smtp.gmail.com` |
| SmtpPort | `587` |
| UseSsl | `true` |
| FromAddress / Username / SupportEmail mặc định | `internlink.cntt@gmail.com` |
| FromName | `InternLink - Ban Quản lý Thực tập` |

---

## 4. Kiểm tra nhanh

1. `dotnet run --project InternLink.API`
2. Login `admin` (mật khẩu `Password123!`)
3. Trong **Cài đặt hệ thống**, đặt email hỗ trợ làm người nhận thử rồi chọn **Gửi thử**. API dùng `POST /api/SuperAdmin/email/test` và gửi email chẩn đoán không chứa thông tin mật khẩu:

```json
{
  "toEmail": "email-cua-ban@gmail.com",
  "fullName": "Test User",
  "role": "Lecturer"
}
```

4. Kiểm tra hộp thư người nhận (và mục **Spam**).

Nếu `Enabled=false`, endpoint báo chưa gửi thay vì trả thành công; xem log trong `InternLink.API/Logs/`.

---

## 5. Lưu ý

- Không commit App Password vào git
- Import hàng loạt: gửi từng lô nhỏ để tránh quota Gmail
- Production (Docker): đặt trong file `.env` ở thư mục gốc — `EMAIL_ENABLED`, `EMAIL_USERNAME`, `EMAIL_PASSWORD` (docker compose tự nạp vào container), không hardcode

## 6. Cập nhật và kiểm tra SMTP trên Windows Server

Mở PowerShell **Run as Administrator** trên server, sau đó chạy:

```powershell
cd C:\src\InternLink
git pull --ff-only origin main
.\scripts\update-windows-server.ps1
```

Script cập nhật ứng dụng, dùng `internlink.cntt@gmail.com` làm tài khoản gửi mặc định, hỏi App Password (không hiển thị khi gõ), bật SMTP bằng biến môi trường của máy và khởi động lại IIS để API nạp cấu hình mới. IIS sẽ gián đoạn ngắn. Sau đó script đăng nhập bằng tài khoản SuperAdmin để lấy địa chỉ email hỗ trợ đã lưu trong Cài đặt hệ thống; nó hiển thị người nhận và chỉ gửi một email chẩn đoán sau khi xác nhận `Y`.

Không dán App Password hoặc mật khẩu SuperAdmin vào lệnh hay chat. Nếu Gmail từ chối xác thực, hãy thu hồi App Password bị lộ/từ chối, tạo App Password mới cho đúng tài khoản gửi, rồi chạy lại script.
