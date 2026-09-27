# Cấu hình Gmail SMTP — InternLink

**Tài khoản hệ thống:** `internlink.cntt@gmail.com`  
**FromName:** `InternLink - Ban Quản lý Thực tập`

---

## 1. Tạo App Password (Gmail)

1. Đăng nhập https://myaccount.google.com với `internlink.cntt@gmail.com`
2. Bật **Xác minh 2 bước** (bắt buộc)
3. Vào **Bảo mật** → **Mật khẩu ứng dụng** (App passwords)  
   hoặc mở: https://myaccount.google.com/apppasswords
4. Tạo mật khẩu cho app (vd. "InternLink API") → Google hiện **16 ký tự**
5. Copy mật khẩu đó (không dùng mật khẩu đăng nhập Gmail thường)

---

## 2. User Secrets (không commit password)

Trong PowerShell:

```powershell
cd e:\InternLink\backend\InternLink\InternLink.API

dotnet user-secrets init
dotnet user-secrets set "Email:Enabled" "true"
dotnet user-secrets set "Email:Username" "internlink.cntt@gmail.com"
dotnet user-secrets set "Email:Password" "xxxx xxxx xxxx xxxx"
dotnet user-secrets set "Email:FromAddress" "internlink.cntt@gmail.com"
dotnet user-secrets set "Email:SupportEmail" "internlink.cntt@gmail.com"
```

Thay `xxxx...` bằng App Password vừa tạo (có thể bỏ khoảng trắng).

Xem secrets đã lưu:

```powershell
dotnet user-secrets list
```

---

## 3. Giá trị đã có trong appsettings

`appsettings.json` / Development đã set sẵn SMTP Gmail + địa chỉ.  
Mặc định **`Email:Enabled=true`** với SMTP đã trỏ sẵn (App Password còn để trống). Đặt **`Email:Enabled=false`** khi không cần gửi thật — mọi email (kèm mật khẩu tạm) sẽ được ghi ra log Serilog thay vì gửi đi.

| Key | Value |
|-----|--------|
| SmtpHost | `smtp.gmail.com` |
| SmtpPort | `587` |
| UseSsl | `true` |
| FromAddress / Username / SupportEmail | `internlink.cntt@gmail.com` |
| FromName | `InternLink - Ban Quản lý Thực tập` |

---

## 4. Kiểm tra nhanh

1. `dotnet run --project InternLink.API`
2. Login `admin` (mật khẩu `Password123!`)
3. `POST /api/Admin/email/test` với body:

```json
{
  "toEmail": "email-cua-ban@gmail.com",
  "fullName": "Test User",
  "role": 0
}
```

4. Kiểm tra hộp thư (và mục **Spam**).

Nếu `Enabled=false` → xem log trong `InternLink.API/Logs/`.

---

## 5. Lưu ý

- Không commit App Password vào git
- Import hàng loạt: gửi từng lô nhỏ để tránh quota Gmail
- Production (Docker): đặt trong file `.env` ở thư mục gốc — `EMAIL_ENABLED`, `EMAIL_USERNAME`, `EMAIL_PASSWORD` (docker compose tự nạp vào container), không hardcode
