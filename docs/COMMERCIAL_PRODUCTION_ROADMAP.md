# 🚀 Lộ trình Chuẩn hóa & Nâng cấp InternLink lên Production Thương mại

Tài liệu này tổng hợp các hạng mục kỹ thuật cốt lõi cần thay thế, tái cấu trúc và chuẩn hóa để đưa **InternLink** từ mức độ đồ án / MVP nội bộ thành một sản phẩm thương mại (Commercial SaaS/Enterprise EdTech) hoạt động ổn định, bảo mật và mở rộng quy mô được.

---

## 1. Dịch vụ Email & Thông báo (Email Infrastructure)

### Hiện trạng
* Đang dùng **Gmail cá nhân qua SMTP** (`smtp.gmail.com:587`) + **App Password**.
* API gửi mail **đồng bộ (synchronous)**: khi client gọi API, luồng xử lý bị block 1.5s – 3s để đợi Gmail phản hồi. Nếu Gmail timeout, API trả lỗi 500/502 cho người dùng.

### Rủi ro thương mại
* **Giới hạn số lượng:** Gmail giới hạn tối đa ~100–500 mail/ngày. Quá tải sẽ bị chặn hoặc khóa tài khoản vĩnh viễn.
* **Tỷ lệ vào Inbox thấp:** Thiếu cấu hình tên miền chuyên nghiệp (SPF, DKIM, DMARC, PTR), mail dễ bị rơi vào mục Spam/Thư rác.
* **App Password dễ bị revoke:** Không có SLA, Google có thể ngắt kết nối bất cứ lúc nào.

### Giải pháp chuẩn hóa
1. **Chuyển sang Cloud Transactional Email Service:**
   * **AWS SES (Amazon Simple Email Service)**: Rẻ nhất (~$0.10 / 1.000 mail), tích hợp tốt nếu chạy trên AWS.
   * **Resend** hoặc **Postmark**: Trải nghiệm developer và độ tin cậy vào inbox cao nhất hiện nay.
   * **SendGrid / Mailgun**: Lựa chọn phổ biến cho doanh nghiệp.
2. **Cấu hình bản ghi tên miền (Domain Authentication):**
   * Thiết lập đầy đủ `SPF`, `DKIM`, `DMARC` trên DNS tên miền riêng (ví dụ: `@internlink.vn`).
3. **Template hóa Email:**
   * Dùng **React Email** hoặc **MJML** để tạo mẫu email chuẩn responsive, hiển thị đẹp trên cả Outlook, Gmail web, mobile app.
4. **Webhook xử lý Bounce & Complaint:**
   * Tự động vô hiệu hóa gửi đến các email không tồn tại hoặc bị người dùng đánh dấu spam.

---

## 2. Lưu trữ File & Quản lý Tài liệu (File Storage)

### Hiện trạng
* Lưu trữ trực tiếp trên ổ cứng máy chủ Windows (`C:\Apps\InternLink\Api\uploads\...`).
* Cấp quyền NTFS qua `icacls`, loại trừ thư mục bằng `robocopy /XD`.

### Rủi ro thương mại
* **Single Point of Failure (SPOF):** Ổ cứng server chết hoặc máy chủ gặp sự cố là mất toàn bộ dữ liệu bài nộp/báo cáo của sinh viên.
* **Không mở rộng được (Scale-out):** Khi chạy nhiều instance API (Load Balancer), các server không thể dùng chung ổ cứng cục bộ.
* **Bảo mật:** File lưu trên server nếu cấu hình tĩnh sai rất dễ bị lộ đường dẫn trực tiếp (Direct Object Reference).

### Giải pháp chuẩn hóa
1. **Chuyển sang Cloud Object Storage:**
   * **AWS S3** hoặc **Cloudflare R2** (R2 miễn phí băng thông egress, cực kỳ tiết kiệm).
   * **MinIO** nếu bắt buộc phải On-Premises (tại trường học).
2. **Cơ chế Upload trực tiếp bằng Pre-signed URL:**
   * Client xin Pre-signed URL từ API → Upload thẳng lên S3/R2 → API không phải chịu tải xử lý băng thông file lớn (PDF, đồ án hàng trăm MB).
3. **Phân quyền tải file (Authorized Downloads):**
   * Sinh viên / Giảng viên chỉ xem được file khi có URL có chữ ký tạm thời (hết hạn sau 5-15 phút).
4. **Quét mã độc tự động (Antivirus Scan):**
   * Tích hợp lambda trigger quét file nộp (ClamAV) trước khi cho phép giảng viên tải về.

---

## 3. Bảo mật & Quản lý Bí mật (Secrets & Security)

### Hiện trạng
* Mật khẩu SMTP, Chuỗi kết nối DB (`sa`), JWT Secret còn lưu dạng plaintext trong `appsettings.json` và đã từng bị commit vào git history.
* Website chạy qua giao thức **HTTP không mã hóa** (`http://internlink.duckdns.org`).

### Giải pháp chuẩn hóa
1. **Làm sạch Git History:**
   * Dùng `git-filter-repo` hoặc BFG Repo-Cleaner để xóa triệt để các chuỗi credentials cũ trong lịch sử Git.
2. **Cơ chế nạp Secret chuyên nghiệp:**
   * Không lưu bất kỳ mật khẩu nào trong code repository.
   * Chuyển sang dùng:
     * **Environment Variables** nạp lúc deploy.
     * Hoặc **AWS Secrets Manager** / **Azure Key Vault** / **HashiCorp Vault**.
3. **Kích hoạt HTTPS bắt buộc:**
   * Cài đặt SSL miễn phí qua **Let's Encrypt / Certbot** hoặc đứng sau **Cloudflare Proxy**.
   * Chuyển sang tên miền thương mại chính thức (ví dụ: `app.internlink.vn`) thay vì dynamic DNS (`duckdns.org`).
4. **Bảo vệ Endpoint Nhạy cảm (Rate Limiting & Anti-Bot):**
   * Áp dụng `Microsoft.AspNetCore.RateLimiting` trên các API `forgot-password`, `login` để chống brute-force / DDoS mail bombing.
   * Tích hợp **Cloudflare Turnstile** (nhẹ, thân thiện hơn Google reCAPTCHA) tại form đăng nhập và quên mật khẩu.
5. **Cơ sở dữ liệu (Least Privilege):**
   * Không dùng user `sa` cho API. Tạo riêng user DB `internlink_app` chỉ có quyền `db_datareader`, `db_datawriter`, `EXECUTE` trên database `InternLink`.

---

## 4. Kiến trúc Bất đồng bộ & Background Jobs (Asynchronous Processing)

### Hiện trạng
* Gửi mail, sinh báo cáo, xuất Excel/PDF chạy trực tiếp trên HTTP Request thread.

### Giải pháp chuẩn hóa
1. **Tích hợp Hangfire hoặc Quartz.NET:**
   * Khi người dùng bấm "Quên mật khẩu", API enqueue một background job và trả về ngay kết quả trong `< 50ms`.
   * Worker xử lý gửi email ngầm ở background, tự động **Retry (thử lại) với Exponential Backoff** nếu mạng chập chờn.
2. **Hàng đợi thông báo (Notification Queue):**
   * Xử lý gửi thông báo hàng loạt (cho cả lớp/khoa) mà không gây nghẽn hệ thống.

---

## 5. Hiện đại hóa Hạ tầng & Deployment (DevOps & Hosting)

### Hiện trạng
* Chạy toàn bộ trên 1 máy ảo Windows Server EC2: IIS + .NET 10 API + React Static + SQL Server Express.
* Deploy bán tự động bằng PowerShell script, phải dừng dịch vụ (downtime với `app_offline.htm`).

### Hướng tối ưu hóa chi phí & hiệu năng thương mại
1. **Chuyển từ Windows Server sang Linux Containers (Docker):**
   * .NET 10 và Node.js chạy trên Linux (Alpine/Ubuntu) mượt hơn và **tiết kiệm 100% tiền bản quyền Windows Server**.
2. **Tách biệt Database:**
   * Chuyển SQL Server ra database managed (AWS RDS / Azure SQL) hoặc chuyển sang **PostgreSQL** (mã nguồn mở, hiệu năng cực cao, không lo chi phí license).
3. **CI/CD Pipeline chuẩn (GitHub Actions):**
   * `git push main` → Tự động chạy Unit/Integration Tests → Build Docker Image → Push lên Registry → Deploy tự động không gián đoạn (Zero Downtime / Rolling Update).
4. **Hosting Frontend riêng biệt:**
   * Đưa thư mục build của React lên **Cloudflare Pages** hoặc **Vercel / AWS S3 + CloudFront**:
     * Tốc độ tải trang cực nhanh toàn cầu (CDN).
     * Hoàn toàn miễn phí hoặc chi phí cực thấp, giảm tải hoàn toàn cho máy chủ backend.

---

## 6. Khả năng Giám sát & Quản trị Lỗi (Observability & APM)

### Hiện trạng
* Log ghi vào file text cục bộ (`Logs/log-*.txt`), phải mở Remote Desktop hoặc dùng lệnh PowerShell để đọc.

### Giải pháp chuẩn hóa
1. **Centralized Logging (Quản lý log tập trung):**
   * Đẩy log về **Grafana Loki**, **Seq**, hoặc **Datadog / Better Stack**.
2. **Error Tracking tự động:**
   * Tích hợp **Sentry** cho cả Frontend React và Backend .NET.
   * Bất kỳ khi nào sinh viên hay giảng viên gặp lỗi màn hình trắng hay 500, đội ngũ kỹ thuật nhận ngay thông báo lỗi chi tiết (Stack trace, môi trường, user ID) qua Telegram / Discord / Slack.
3. **Uptime Monitoring:**
   * Cài đặt Uptime Kuma / Better Uptime ping endpoint `/health/ready` định kỳ 60 giây.

---

## 7. Tính năng Thương mại & Bền vững (Enterprise Readyness)

1. **Audit Logs (Nhật ký kiểm toán):**
   * Lưu vết mọi hành động nhạy cảm: Chấm điểm thực tập, đổi điểm, duyệt sinh viên, phân công giảng viên (Ai làm? Lúc nào? IP nào? Dữ liệu cũ là gì?).
2. **Multi-Tenancy (Đa trường / Đa phân viện):**
   * Thiết kế kiến trúc hỗ trợ nhiều trường đại học trên cùng 1 hệ thống (phân tách theo `TenantId` hoặc riêng Database).
3. **Đăng nhập một lần (SSO / OAuth2):**
   * Tích hợp đăng nhập bằng Google Workspace sinh viên (`@edu.vn`), Microsoft Azure AD / Office 365 của nhà trường, hoặc hệ thống CAS/LDAP trường học.

---

## 📊 Bảng tổng kết: Ưu tiên hành động (Action Priority)

| Giai đoạn | Hạng mục cốt lõi | Công nghệ đề xuất | Tác động |
|---|---|---|---|
| **P0 (Ngay lập tức)** | Bật HTTPS + Tên miền chính thức | Cloudflare + Let's Encrypt | Bảo mật thông tin, tránh bị lộ JWT/mật khẩu |
| **P0 (Ngay lập tức)** | Tách Secret khỏi Git & AppSettings | Environment Variables / Secrets Manager | An toàn thông tin, không bị lộ mật khẩu |
| **P1 (Ngắn hạn - 2 tuần)** | Thay Gmail SMTP bằng Transactional Mail | AWS SES / Resend + Hangfire | Gửi mail 100% không bị chặn, không nghẽn API |
| **P1 (Ngắn hạn - 2 tuần)** | Tách File Storage lên Cloud | AWS S3 / Cloudflare R2 | Không sợ mất file nộp, hỗ trợ mở rộng |
| **P2 (Trung hạn - 1 tháng)**| Docker hóa + CI/CD GitHub Actions | Docker + Linux + GitHub Actions | Triển khai tự động, giảm chi phí server 50% |
| **P2 (Trung hạn - 1 tháng)**| Giám sát lỗi thời gian thực | Sentry + Telegram Alerts | Phát hiện và xử lý lỗi trước khi người dùng báo |
| **P3 (Dài hạn)** | Multi-Tenancy + SSO trường học | Microsoft 365 / Google SSO | Sẵn sàng thương mại hóa cho nhiều trường |
