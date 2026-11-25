# KẾ HOẠCH BÀN GIAO TOÀN DIỆN: CẤP 0, CẤP 1, CẤP 2 VÀ HỆ SINH THÁI DOANH NGHIỆP

**Mã tài liệu:** `DOC-MASTER-PLAN-INTERNLINK-2026`
**Ngày ban hành:** 25/11/2026
**Chủ trì:** QA Lead & Lead Enterprise Solutions Architect
**Đối tượng thực hiện:** Toàn bộ đội ngũ Backend Dev, Frontend Dev, DevOps & QA

---

## 1. NGUYÊN TẮC QUẢN TRỊ MÃ NGUỒN & XỬ LÝ WORKTREE (BƯỚC ĐẦU TIÊN)

Hiện tại worktree có **338 tệp thay đổi/chưa commit**, bao gồm toàn bộ nền tảng SuperAdmin Cấp 0 và các tính năng Cấp 1 vừa hoàn thành. Để tránh trộn lẫn code và tạo được các PR sạch, Dev bắt buộc thực hiện theo đúng 2 bước Git sau:

### Bước 1: Tạo Baseline Commit chốt hạ Cấp 0 (SuperAdmin Freeze)
Staging và commit toàn bộ các tệp thuộc nền tảng SuperAdmin đã nghiệm thu (đạt 576 tests ban đầu):
```bash
git add backend/InternLink/InternLink.API/Controllers/SysTenantsController.cs \
        backend/InternLink/InternLink.Infrastructure/Services/SystemTenantExportService.cs \
        backend/InternLink/InternLink.Infrastructure/Services/TenantStorageQuotaService.cs \
        backend/InternLink/InternLink.API/Controllers/SystemCatalogController.cs \
        frontend/src/features/admin/pages/TenantsManagerView.tsx \
        frontend/src/features/admin/pages/TenantBillingView.tsx \
        frontend/src/features/admin/components/BillingPaymentNoticeModal.tsx \
        frontend/src/lib/formatVnCurrencyText.ts \
        docs/

git commit -m "feat(superadmin): complete level 0 hardening, billing snapshots, hard quota and commercial baseline"
```

### Bước 2: Tách 4 PR độc lập cho Cấp 1
Sau khi Cấp 0 đã được neo vào lịch sử Git, Dev tạo nhánh mới `feature/level1-academic-ops` và chia thành 4 PR module hóa:
* **PR 1:** `feat(semesters): implement semester write policy and read-only archive lock`
* **PR 2:** `feat(excel): smart excel import pipeline with error-row workbook export`
* **PR 3:** `feat(assignments): faculty capacity limit and assignment matrix constraints`
* **PR 4:** `feat(rubric): enforce 100% rubric weight validation and grading rules`

---

## 2. GIAI ĐOẠN 1: HOÀN TẤT & ĐÓNG GÓI CẤP 1 (DEPARTMENT ADMIN)

### 2.1. Bốn tính năng học vụ cốt lõi (Đã code, chờ đóng gói PR):
1. **Khóa sổ Học kỳ (`SemesterWritePolicy.cs`):**
   * Trạng thái `Archived`/`Closed` khóa toàn bộ dữ liệu điểm số, phân công, báo cáo về Read-Only.
   * Chặn mở lại học kỳ tùy tiện, thống nhất thông báo lỗi nghiệp vụ tiếng Việt.
2. **Smart Excel Import Pipeline (`SmartExcelImportService.Pipeline.cs`):**
   * Chịu tải lô 500 – 2.000 dòng.
   * Xử lý nạp các dòng hợp lệ; bóc tách riêng các dòng lỗi (trùng MSSV, sai định dạng SĐT) xuất thành file Excel đính kèm cột lý do lỗi để trả về cho cán bộ trường.
3. **Ma trận Phân công Thực tập:**
   * Ghép bộ 3 `Sinh viên <-> Doanh nghiệp <-> Giảng viên hướng dẫn`.
   * Kiểm tra giới hạn tải giảng viên (không vượt quá định mức sinh viên/GV); ràng buộc phạm vi theo `DepartmentId`.
4. **Quy tắc Chấm điểm Rubric 100%:**
   * Kiểm tra tổng trọng số các tiêu chí đánh giá bắt buộc phải bằng đúng 100%.

### 2.2. Tách bạch triệt để Giao diện giữa SuperAdmin và DepartmentAdmin:
* **Tách màn hình Quản lý User:**
  * SuperAdmin: Đổi thành `/admin/platform-accounts` ("Tài khoản Quản trị Đơn vị") — chỉ quản lý Trưởng khoa / Quản trị viên trường, xóa sạch sinh viên/giảng viên.
  * DepartmentAdmin: Trang `/admin/academic-users` mang tên "Danh bạ Giảng viên & Sinh viên" — chỉ quản lý cán bộ và sinh viên của Khoa.
* **Tách biệt Dashboard:**
  * SuperAdmin (`/admin/dashboard`): Gắn nhãn *"Tổng quan Vận hành Nền tảng SaaS"*.
  * DepartmentAdmin: Gắn nhãn *"Bàn làm việc Quản lý Thực tập — Khoa [Tên Khoa]"*.
* **Bàn giao Quản lý Khoa (`/admin/departments`):**
  * Rút quyền CRUD khoa khỏi SuperAdmin; bàn giao về đúng Quản trị viên cấp Trường (Phòng Đào tạo).

---

## 3. GIAI ĐOẠN 2: CẤP 2 (NGƯỜI DÙNG TÁC NGHIỆP 1-CHẠM — GIẢNG VIÊN & SINH VIÊN)

### 3.1. Đăng nhập & Xác thực Đa kênh:
* Hỗ trợ gõ trực tiếp **MSSV** (`2421160052`) + Mật khẩu trường (hoặc mật khẩu mặc định lần đầu kèm cờ `MustChangePassword = true`).
* Hỗ trợ nút 1-chạm **"Đăng nhập bằng Microsoft Outlook Trường"** (`@hcmct.edu.vn`) hoặc Google Workspace.

### 3.2. Cấu trúc Hồ sơ Sinh viên Thực tế:
* **Học vụ cốt lõi:** MSSV, Họ tên, Lớp (`C24ATH1`), Chương trình đào tạo (`Công nghệ thông tin C24A`).
* **Cố vấn học tập:** Tự động kết nối với Giảng viên hướng dẫn (`Thầy Tăng Quốc Cường - tqcuong@hcmct.edu.vn`).
* **Thông tin nhận phụ cấp thực tập:** Lưu trữ **Số tài khoản ngân hàng (ACB - `14867761`)** để Doanh nghiệp trả phụ cấp/lương hàng tháng trực tiếp.
* **Dữ liệu mở rộng:** CCCD, Dân tộc (`Khmer`), Người liên hệ phụ huynh $\rightarrow$ Lưu trữ qua trường `MetadataJson`.

### 3.3. Thiết kế Bàn làm việc "1-Chạm" (High UX & Mobile-First):
* **Bố cục:** Menu trái thu gọn (Collapsible Sidebar) + Command Topbar + Vùng Content Timeline.
* **Sinh viên:** Theo dõi tiến độ tuần thực tập (Tuần 1 $\rightarrow$ Tuần 10), chạm nộp bài báo cáo hoặc chụp ảnh nộp thẳng từ điện thoại.
* **Giảng viên:** Danh sách bài nộp chờ duyệt, chấm điểm Rubric kéo thả, duyệt bài trong đúng 1 chạm.

---

## 4. GIAI ĐOẠN 3: HỆ SINH THÁI DOANH NGHIỆP & CHIẾN LƯỢC CỨU CÁNH 3 TẦNG

### 4.1. Tuyển dụng kép & Lọc Ứng viên Thông minh (Smart Match):
* **Nộp hồ sơ:** Sinh viên tự apply hoặc Khoa gửi danh sách tiến cử hàng loạt kèm **Giấy Giới Thiệu có mã QR bảo mật**.
* **Smart Matching %:** Tự động tính điểm phù hợp (Chuyên ngành 30% + Kỹ năng 40% + GPA 20% + Địa điểm 10%) và xếp hạng ứng viên từ trên xuống để Doanh nghiệp hẹn phỏng vấn.

### 4.2. Đánh giá Cuối kỳ, Mộc đỏ Pháp lý & Kiểm định Việc làm:
* In **Phiếu Đánh Giá Thực Tập A4** có khung ký tên và đóng dấu mộc tròn đỏ công ty phục vụ thanh tra đào tạo.
* Ô xác nhận `[x] Tuyển dụng thành nhân viên chính thức` $\rightarrow$ Lưu vết mạng lưới Cựu sinh viên phục vụ kiểm định AUN-QA của nhà trường.
* Sinh viên đánh giá ngược 1–5 ⭐ (có Khoa kiểm duyệt) để xếp hạng **"Doanh nghiệp Triển vọng"**.

### 4.3. Chiến lược Cứu cánh 3 Tầng khi Doanh nghiệp "Né App":
* **Tầng 1 (Portal):** Cổng Doanh nghiệp đầy đủ cho đối tác lớn tuyển dụng thường xuyên.
* **Tầng 2 (Magic Link):** Mentor bận rộn chạm link bảo mật qua Zalo/Email để chấm điểm trong 2 phút trên điện thoại, không cần mật khẩu.
* **Tầng 3 (Giấy truyền thống):** Sinh viên in phiếu A4 xin mộc đỏ trực tiếp $\rightarrow$ Chụp ảnh nộp lên app $\rightarrow$ Khoa duyệt `VerifiedByPhysicalStamp` (sinh viên không bao giờ bị nghẽn tốt nghiệp!).

---

## 5. TIÊU CHÍ NGHIỆM THU KỸ THUẬT (QA ACCEPTANCE GATES)

1. **Bộ test hồi quy:** Duy trì **592+ backend tests** và **276 frontend vitest** đạt 100% pass.
2. **Kiểm tra biên dịch & mã nguồn:** `npm run typecheck --prefix frontend` đạt 0 lỗi; `git diff --check` đạt chuẩn whitespace.
3. **Cơ sở dữ liệu:** Không tự ý chạy migration lên server staging/production khi chưa có backup và lệnh duyệt.
4. **Trải nghiệm người dùng:** Toàn bộ thông báo lỗi và trạng thái hiển thị bằng tiếng Việt nghiệp vụ chuẩn ERP.

---
*Kế hoạch có hiệu lực ngay khi ban hành. Đội ngũ kỹ thuật căn cứ theo các mốc trên để triển khai và báo cáo tiến độ.*
