# KẾ HOẠCH LỘ TRÌNH PHÁT TRIỂN & THƯƠNG MẠI HÓA (NHÓM 3)
**Dự án:** Hệ thống Quản trị Thực tập Đại học InternLink  
**Tech Lead:** Thạch · **QA Lead & DevOps:** Antigravity · **Tester:** Hồng Anh  
**Tài liệu:** Product & Technical Roadmap (Giai đoạn thương mại hóa 3 – 6 tháng)  
**Ngày lập:** 28/10/2026 · **Mã tài liệu:** `DOC-ROADMAP-GROUP3-V1.0`

---

## 🧭 1. TỔNG QUAN CHIẾN LƯỢC

Dựa trên biên bản kiểm thử thực tế và bảng **67 kỳ vọng người dùng** do tester Hồng Anh đề xuất cho kỳ Thực tập Tốt nghiệp C24A.TH:
* **Nhóm 1 (42 mục):** Đã hoàn thành và đạt 100% trong bộ test (381 backend test, 144 frontend test).
* **Nhóm 2 (6 mục cấp bách):** Đã triển khai xong và deploy lên AWS Server (Guard doanh nghiệp, file validation 15/50MB, KPI lecturer, empty states, Excel 3 sheet, fix UUID fallback).
* **Nhóm 3 (19 mục dài hạn):** Lưu trữ toàn diện trong tài liệu này để định hướng phát triển sản phẩm thương mại (Commercial SaaS / Enterprise EdTech) trong 3 đến 6 tháng tới.

---

## 🗺️ 2. SƠ ĐỒ LỘ TRÌNH 3 GIAI ĐOẠN (ROADMAP PHASING)

```
[ Hiện tại: Bản Demo Khoa C24A.TH chạy ổn định trên AWS ]
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 2 (Tháng 1 - 2): TRẢI NGHIỆM & TỰ ĐỘNG HÓA   │
│ 1. Tự động lưu nháp (Auto-Save chống mất dữ liệu khi F5)│
│ 2. Import Excel thông minh (Tự sinh file dòng lỗi)     │
│ 3. 1-Click Nhắc nhở SV nộp trễ (Email + In-app Push)   │
│ 4. Giao diện Mobile-first cho Sinh viên nộp bài        │
│ 5. Phân hệ Quản lý Biểu mẫu thực tập động             │
└────────────────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 3 (Tháng 3 - 4): AN TOÀN DỮ LIỆU & PHÁP LÝ   │
│ 6. Phân hệ Audit Trail (Lịch sử ai sửa điểm/xuất file) │
│ 7. Xuất Báo cáo Word chuẩn Nghị định 30/2020/NĐ-CP     │
│ 8. Thuật toán Gợi ý Phân công GV cân bằng tải          │
│ 9. Email Amazon SES tin cậy + Backup hàng đêm lên S3   │
└────────────────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 4 (Tháng 5 - 6): KIẾN TRÚC SAAS ĐA TRƯỜNG   │
│ 10. Multi-Tenancy (Cô lập dữ liệu tuyệt đối giữa Khoa) │
│ 11. Dashboard Liên khoa dành cho Ban Giám Hiệu         │
│ 12. Healthcheck & Tự động phục hồi IIS (Auto-Healing)  │
│ 13. Onboarding Wizard triển khai khoa mới < 15 phút    │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 3. CHI TIẾT TỪNG MODULE & GIẢI PHÁP KỸ THUẬT

### GIAI ĐOẠN 2: TỐI ƯU TRẢI NGHIỆM & TỰ ĐỘNG HÓA VẬN HÀNH (THÁNG 1 – 2)

#### 1. [Mục 7] Cơ chế Chống mất dữ liệu (Auto-Save Resilience)
* **Hiện trạng:** Khi sinh viên gõ báo cáo tuần dài hoặc giảng viên nhập nhận xét rubric mà bị F5, rớt mạng hoặc sập nguồn thì mất dữ liệu đang gõ dở.
* **Giải pháp:**
  * Xây dựng custom hook `useLocalStorageDraft(key, data)` tích hợp `IndexedDB` / `localStorage`.
  * Cơ chế debounce 1.5s tự động lưu nháp ngầm.
  * Tự động hiển thị thanh thông báo phục hồi khi tải lại trang: *"Phát hiện bản nháp chưa gửi lúc [HH:mm]. [Khôi phục] / [Hủy]"*.

#### 2. [Mục 12] Bộ Import Excel Thông minh (Báo lỗi từng dòng)
* **Hiện trạng:** Khi file Excel import hàng trăm sinh viên/doanh nghiệp có vài dòng sai ngày tháng hoặc trùng mã, hệ thống báo lỗi chung khiến người dùng khó tìm dòng sai.
* **Giải pháp:**
  * Backend xử lý theo mô hình: **Import dòng hợp lệ + Gom danh sách dòng lỗi**.
  * Tự động sinh file Excel phản hồi (`error_rows.xlsx`) chứa riêng các dòng bị lỗi kèm cột cuối cùng *"Nguyên nhân lỗi"* (ví dụ: *"Dòng 14: MSSV đã tồn tại"*, *"Dòng 22: Email sai format"*). Giáo vụ chỉ cần sửa trực tiếp trên file này và nạp lại.

#### 3. [Mục 35] 1-Click Nhắc nhở Sinh viên Nộp trễ (Smart Bulk Reminders)
* **Hiện trạng:** Giảng viên phải tự tra cứu và nhắn tin thủ công cho từng sinh viên trễ hạn.
* **Giải pháp:**
  * Bổ sung nút **[🔔 Nhắc nhở sinh viên chưa nộp]** trên Dashboard Giảng viên.
  * Hệ thống tự động lọc các em chưa nộp báo cáo của tuần hiện tại hoặc vắng điểm danh $\ge$ 2 buổi để gửi thông báo in-app kèm email trang trọng có gắn link nộp bài một chạm.

#### 4. [Mục 4] Tối ưu Giao diện Mobile cho Sinh viên
* **Hiện trạng:** Giao diện tối ưu cho màn hình laptop/máy tính bàn.
* **Giải pháp:**
  * Thiết kế giao diện Mobile-first cho Portal Sinh viên:
    * Bottom Navigation Bar tiện lợi (Trang chủ · Báo cáo · Điểm danh · Điểm số).
    * Hỗ trợ upload ảnh minh chứng hoặc phiếu đánh giá trực tiếp từ camera điện thoại.
    * Danh sách báo cáo tuần dạng accordion chạm vuốt mượt mà.

#### 5. [Mục 21] Phân hệ Quản lý Biểu mẫu Thực tập Động
* **Hiện trạng:** Biểu mẫu đơn từ thường phải gửi qua email hoặc nhóm Zalo lớp.
* **Giải pháp:**
  * Admin Khoa có trang quản lý tải lên các biểu mẫu chuẩn (.docx, .pdf) theo từng học kỳ.
  * Sinh viên và Giảng viên có mục *"Tải biểu mẫu"* luôn nhận được các văn bản mới nhất của khoa.

---

### 🛡️ GIAI ĐOẠN 3: AN TOÀN DỮ LIỆU, PHÁP LÝ & AUDIT TRAIL (THÁNG 3 – 4)

#### 6. [Mục 50] Hệ thống Audit Trail Đào tạo (Giám sát Biến động Dữ liệu)
* **Hiện trạng:** Chưa có nhật ký vết chi tiết khi có chỉnh sửa điểm số hoặc thay đổi phân công.
* **Giải pháp:**
  * Thiết kế bảng `AuditLogs`: Lưu vết `UserId`, `Role`, `ActionType`, `EntityName`, `EntityId`, `OldValues`, `NewValues`, `IpAddress`, `UserAgent`, `Timestamp`.
  * Áp dụng EF Core Interceptor tự động ghi nhận:
    * Mọi lần sửa đổi điểm số (Điểm Quá trình, Điểm Thi, Điểm TB).
    * Mọi lần thay đổi GVHD hoặc Doanh nghiệp thực tập.
    * Thao tác Khóa sổ / Mở khóa học kỳ.
    * Thao tác xuất dữ liệu Excel bảng điểm ra ngoài.
  * Màn hình tra cứu riêng dành cho Lãnh đạo Khoa và Thanh tra đào tạo.

#### 7. [Mục 33] Xuất Báo cáo Tổng kết Word Chuẩn Nghị định 30/2020/NĐ-CP
* **Hiện trạng:** Khoa phải tổng hợp thủ công ra file Word hành chính để nộp Phòng Đào tạo.
* **Giải pháp:**
  * Module xuất file Word (.docx) tự động điền toàn bộ chỉ số thống kê, danh sách doanh nghiệp, phân loại kết quả.
  * Định dạng căn lề, tiêu ngữ, font chữ Times New Roman chuẩn thể thức văn bản hành chính Việt Nam.

#### 8. [Mục 14] Thuật toán Gợi ý Phân công GV Cân bằng Tải
* **Hiện trạng:** Phân công thủ công dễ dẫn đến người quá tải, người thiếu chỉ tiêu.
* **Giải pháp:**
  * Thuật toán phân bổ tự động dựa trên chỉ tiêu `MaxStudents` và chuyên môn/bộ môn hẹp của Giảng viên và đề tài của Sinh viên.

#### 9. [Mục 49 & 51] Hạ tầng Email Doanh nghiệp & Tự động Sao lưu Cloud S3
* **Email:** Nâng cấp sang **Amazon Simple Email Service (SES)** với tỷ lệ vào Inbox 99.9%, hỗ trợ Domain Authentication (SPF, DKIM, DMARC) và Bounce Handler.
* **Sao lưu dữ liệu:** Script tự động chạy hàng đêm lúc 01:00 AM sao lưu SQL Server, nén và mã hóa đẩy lên **AWS S3 Bucket** với chính sách lưu trữ 30 ngày.

---

### 🏢 GIAI ĐOẠN 4: SAAS ĐA KHOA / ĐA TRƯỜNG & HIGH AVAILABILITY (THÁNG 5 – 6)

#### 10. [Mục 48 & 52] Kiến trúc Multi-Tenancy (Bán SaaS Đa Khoa / Đa Trường)
* Áp dụng mô hình **Row-Level Tenancy với `DepartmentId` / `TenantId`**.
* EF Core **Global Query Filters** tự động cô lập dữ liệu theo từng Khoa/Trường, ngăn chặn hoàn toàn rủi ro lộ dữ liệu chéo.
* Xây dựng **Executive Dashboard** liên khoa dành cho Ban Giám Hiệu.

#### 11. [Mục 53] Hệ thống Giám sát Độ sẵn sàng (Uptime & Auto-Healing)
* Thiết lập endpoint `/api/health/live` và `/api/health/ready`.
* Cấu hình IIS Application Warmup & Auto-Restart phục hồi trong vòng 5 giây khi có sự cố.
* Tích hợp cảnh báo Telegram Bot / Email cho đội DevOps khi tải server cao.

#### 12. [Mục 54] Onboarding Wizard cho Khoa mới trong 15 Phút
* Trình hướng dẫn thiết lập 4 bước: Tạo Khoa $\rightarrow$ Nạp Excel Giảng viên/Sinh viên $\rightarrow$ Cấu hình quy chế điểm $\rightarrow$ Tự động kích hoạt tài khoản.

---

## 📊 4. BẢNG THEO DÕI ĐỐI CHIẾU 19 KỲ VỌNG NHÓM 3

| STT | Kỳ vọng của Tester | Phân loại Module | Giai đoạn | Đơn vị phụ trách |
|:---:|---|---|:---:|:---:|
| 1 | **Mục 4:** Mobile responsive cho SV nộp bài | UX/UI Frontend | Giai đoạn 2 | Frontend Lead |
| 2 | **Mục 5:** Thông báo realtime tin cậy | SignalR / Notifications | Giai đoạn 2 | Fullstack Dev |
| 3 | **Mục 7:** Tự động lưu nháp chống mất data | Form State Resilience | Giai đoạn 2 | Frontend Dev |
| 4 | **Mục 10:** Empty states & Onboarding tour | UI Polish | Giai đoạn 2 | UI/UX Designer |
| 5 | **Mục 12:** Import Excel sinh file dòng lỗi | Data Import Engine | Giai đoạn 2 | Backend Dev |
| 6 | **Mục 14:** Cân bằng tải phân công GVHD | Optimization Algorithm | Giai đoạn 3 | Backend Dev |
| 7 | **Mục 21:** Quản lý biểu mẫu tải về cho SV | Document Management | Giai đoạn 2 | Fullstack Dev |
| 8 | **Mục 33:** Xuất Word chuẩn Nghị định 30 | Reporting Engine | Giai đoạn 3 | Backend Lead |
| 9 | **Mục 35:** 1-Click nhắc SV nộp trễ | Automation & Mailer | Giai đoạn 2 | Backend Dev |
| 10 | **Mục 48:** Multi-Khoa không lẫn data | Multi-Tenancy Architecture | Giai đoạn 4 | System Architect |
| 11 | **Mục 49:** Backup SQL Server lên AWS S3 | Cloud DevOps | Giai đoạn 3 | DevOps Engineer |
| 12 | **Mục 50:** Audit Trail thay đổi điểm số | Security & Compliance | Giai đoạn 3 | Backend Lead |
| 13 | **Mục 51:** Email Transactional Amazon SES | Infrastructure | Giai đoạn 3 | DevOps Engineer |
| 14 | **Mục 52:** Báo cáo liên khoa cấp BGH | Analytics & BI | Giai đoạn 4 | Frontend Lead |
| 15 | **Mục 53:** Uptime monitoring & Auto-healing | SRE & Healthchecks | Giai đoạn 4 | DevOps Engineer |
| 16 | **Mục 54:** Onboarding khoa mới < 15 phút | Data Provisioning | Giai đoạn 4 | DevOps Engineer |
| 17–19 | **Mục 63–67:** Giá trị số hóa & Niềm tin người dùng | User Sentiment & KPIs | Xuyên suốt | Product Owner |

---

## 🎯 5. HÀNH ĐỘNG TIẾP THEO

1. **Ưu tiên số 1 hiện tại:** Tiến hành buổi Demo Khoa kỳ C24A.TH thành công rực rỡ với phiên bản vừa triển khai trên AWS Server.
2. **Kế hoạch tiếp nhận:** Thu thập biên bản góp ý của Hội đồng Khoa sau buổi demo để làm cơ sở triển khai ngay các tính năng của **Giai đoạn 2**.
