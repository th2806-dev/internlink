# NGHIÊN CỨU THIẾT KẾ: TKS PROFILE (F1006) → INTERNLINK PROFILE STUDIO
## Phân tích bố cục Trang Thông Tin Thành Viên của TKSolution V11

> **Mục đích:** Lưu trữ tư liệu tham khảo bố cục và luồng trải nghiệm người dùng từ trang Profile của TKSolution để phục vụ đợt "Đại tu nâng cấp giao diện toàn diện" ngay sau khi hoàn thành Giai đoạn 5.

---

## 1. Ảnh chụp giao diện TKS tham khảo

````carousel
![TKS Profile - Tab Tổng Quan](/C:/Users/th.dev/.gemini/antigravity/brain/512a17a2-5a86-4f1c-8423-fe059e489afa/tks-profile-overview.jpg)
<!-- slide -->
![TKS Profile - Tab Nhật Ký Đăng Nhập](/C:/Users/th.dev/.gemini/antigravity/brain/512a17a2-5a86-4f1c-8423-fe059e489afa/tks-profile-login-history.jpg)
<!-- slide -->
![TKS Profile - Tab Tính Năng Được Truy Cập](/C:/Users/th.dev/.gemini/antigravity/brain/512a17a2-5a86-4f1c-8423-fe059e489afa/tks-profile-feature-access.jpg)
````

---

## 2. Phân tích cấu trúc bố cục xuất sắc của TKS Profile

### 2.1. Hero Banner cá nhân hóa (Top Header)
* **Avatar tròn lớn:** Nổi bật ở góc trái, có shadow nhẹ và viền trắng nổi bật trên nền banner.
* **Thông tin định danh:** Tên đăng nhập (Username), Tên hiển thị (Họ tên đầy đủ), Chức vụ.
* **Tag nhóm quyền trực thuộc:** Hiển thị rõ người này thuộc nhóm nào (ví dụ: `API, Quản trị, Quản trị hệ thống`).
* **Hệ thống Tab điều hướng dính liền banner:**
  - `Tổng Quan`
  - `Nhật Ký Đăng Nhập`
  - `Tính Năng Được Truy Cập`

---

### 2.2. Chi tiết 3 Phân hệ Tab

#### 📌 Tab 1: Tổng Quan (Overview)
* **Card 1: Tiến độ hoàn thành hồ sơ (Profile Completion Bar):**
  - Thanh progress bar trực quan (100% hoặc % hoàn thành) có badge phần trăm.
  - Rất thích hợp áp dụng cho Sinh viên: *"Tiến độ hoàn thiện hồ sơ thực tập: 80%"* (Đã nộp CV, Đã có giấy tiếp nhận, Đã nộp đề cương...).
* **Card 2: Thông tin chi tiết (Info Grid):**
  - Họ tên, Số điện thoại, Email, Trạng thái (Badge xanh `#7bc043` "Hoạt động"), Ngày giờ tạo tài khoản.
* **Card 3: Ghi chú & Nhóm trực thuộc:**
  - Lời chào cá nhân hóa, mô tả ngắn, danh sách vai trò phân quyền.

#### 📌 Tab 2: Nhật Ký Đăng Nhập (Login Audit Trail)
* Hiển thị bảng lịch sử toàn bộ các phiên đăng nhập:
  - **Ngày Giờ Tạo:** Timestamp chính xác đến từng giây.
  - **Địa chỉ IP:** IP mạng của người dùng (giúp phát hiện đăng nhập trái phép).
  - **User Agent:** Thiết bị, hệ điều hành (Windows/macOS/iOS/Android) và trình duyệt (Chrome, Safari...).

#### 📌 Tab 3: Tính Năng Được Truy Cập (Feature Access Trail)
* Nhật ký hành động thực tế của người dùng:
  - **Ngày Giờ Thao Tác**
  - **Mã Chức Năng (Mã CN):** `1005`, `1001`, `1004`, `1030`...
  - **Tên Chức Năng:** Phân Quyền Chức Năng, Cấu Hình Đóng Băng Cột, v.v.
* Giúp người dùng hoặc quản trị viên kiểm toán xem tài khoản của mình vừa mở những màn hình nào.

---

## 3. Đề xuất thiết kế Profile chuẩn InternLink (Sau Giai đoạn 5)

Kế thừa tư duy bố cục của TKS nhưng điều chỉnh phù hợp với nghiệp vụ Giáo dục / Thực tập của InternLink và chuẩn màu thương hiệu `#026aa7`:

```
┌────────────────────────────────────────────────────────────────────────┐
│  BANNER XANH INTERNLINK (#026aa7)                                     │
│  [ AVATAR ]   Nguyễn Văn An (MSSV: 202611001)                          │
│               Sinh viên Thực tập - Lớp C24A.TH - Khoa CNTT             │
│               Vai trò: Student | GVHD: ThS. Tăng Quốc Cường            │
│                                                                        │
│  [ Tổng quan hồ sơ ]   [ Nhật ký đăng nhập ]   [ Lịch sử hoạt động ]  │
└────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────┐ ┌──────────────────────────────────────┐
│  TIẾN ĐỘ HỒ SƠ THỰC TẬP       │ │  THÔNG TIN CÔNG TY THỰC TẬP          │
│  [======= 75% =======]        │ │  Công ty: FPT Software               │
│  ✓ Đăng ký nguyện vọng        │ │  Mentor: Trần Văn Mentor             │
│  ✓ Giấy tiếp nhận 1-chạm      │ │  Email mentor: mentor@fpt.com        │
│  ✓ Báo cáo tuần (8/10)        │ │  Đánh giá DN: [Đã chấm 9.5]          │
│  ○ Báo cáo tổng kết C22A      │ │                                      │
├───────────────────────────────┤ ├──────────────────────────────────────┤
│  THÔNG TIN CÁ NHÂN            │ │  QUY CHẾ & TIÊU CHÍ ÁP DỤNG          │
│  Email: an.nguyen@edu.vn      │ │  Quy chế: Chuẩn Khoa CNTT 2026       │
│  SĐT: 0912 345 678            │ │  Tỷ lệ: Quá trình 40% | Thi 60%     │
│  Trạng thái: Đang thực tập    │ │  Điều kiện dự thi: Đủ điều kiện      │
└───────────────────────────────┘ └──────────────────────────────────────┘
```

---

## 4. Giá trị chiến lược
1. **Đối với Sinh viên:** Profile trở thành "Bảng điều khiển thực tập cá nhân" (Personal Internship Dashboard), nhìn vào là biết mình còn thiếu báo cáo nào, hồ sơ đến đâu.
2. **Đối với Giảng viên:** Profile hiển thị số lượng sinh viên đang hướng dẫn, hạn mức (Quota), trạng thái chấm điểm các lớp.
3. **Đối với Admin:** Profile tích hợp Audit Trail và lịch sử bảo mật như TKS để phục vụ thanh tra đào tạo.

*(Toàn bộ tài liệu và hình ảnh mẫu đã được lưu trữ an toàn trong kho tài liệu để chuẩn bị cho Sprint Đại tu UI sau Giai đoạn 5).*
