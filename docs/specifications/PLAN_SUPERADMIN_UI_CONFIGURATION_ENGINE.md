# KẾ HOẠCH TỔNG THỂ: HOÀN THIỆN BỘ MÁY CẤU HÌNH GIAO DIỆN ĐA PHÂN QUYỀN
## (ENTERPRISE DYNAMIC UI CONFIGURATION ENGINE — TKS_V11 SYNTHESIS EDITION)

> **Mã tài liệu:** PLAN-SUPERADMIN-UI-CONFIG  
> **Cấp độ:** Kế hoạch Kỹ thuật Cấp cao (Architectural Master Plan)  
> **Phiên bản:** 2.1 Enterprise (Tích hợp Trích lọc Tinh hoa TKSolution V11 & Chuẩn hóa Modern SaaS)  
> **Phạm vi:** Trọng tâm từ Role Quản trị Cấp cao nhất (SuperAdmin) $\rightarrow$ Toàn quyền cấu hình giao diện, lưới dữ liệu, cây menu, cờ quyền và chính sách biểu mẫu cho tất cả các phân quyền khác (Lecturer, Student, Employer, Dean, Coordinator).  
> **Trạng thái:** Sẵn sàng kích hoạt triển khai (Chờ lệnh bấm nút thực thi từ QA Lead)

---

## 🏛️ 1. TỔNG QUAN KIẾN TRÚC & TRIẾT LÝ THIẾT KẾ (CORE PHILOSOPHY)

Trong các hệ thống thương mại B2B SaaS quy mô lớn phục vụ các trường Đại học và Cao đẳng:
- **Nguyên lý Tối thượng (Zero-Hardcoding Law):** Đội ngũ IT của Nhà trường và SuperAdmin phải tự chủ 100% trong việc cấu hình giao diện cho từng Khoa/Viện và từng nhóm người dùng mà **không bao giờ phải nhờ lập trình viên sửa code hay redeploy hệ thống**.
- **Kế thừa Tinh hoa Quản trị Doanh nghiệp (TKSolution V11):** Trích lọc mô hình quản trị dữ liệu chặt chẽ của ERP/WMS thực chiến: FCode định danh, Dynamic DataGrid 2 tầng, Phân quyền ma trận F1005 (Check-all dòng/cột, cộng dồn nhóm), Ánh xạ cột Excel động F1018, và Nhật ký so sánh biến động dữ liệu F1008.
- **Hiện đại hóa Chuẩn B2B SaaS Giáo dục:** Khắc phục triệt để điểm yếu của phần mềm cũ (loại bỏ màu tím gắt, bỏ độ phân giải cố định, bỏ bắt buộc tạo tài khoản rườm rà) bằng **Bảng màu độc quyền `#026aa7` & `#7bc043`**, trải nghiệm **Responsive Mobile-first**, và **Frictionless Magic-Link 1-chạm**.

```mermaid
flowchart TD
    subgraph SuperAdmin["SUPERADMIN UI CONTROL CENTER (TRUNG TÂM CẤU HÌNH CẤP CAO)"]
        MenuStudio["1. Navigation Studio<br/>(Cấu hình Mega-Menu 6 Phân hệ & FCode)"]
        GridStudio["2. Dynamic Grid Studio<br/>(Ghim cột, chỉnh độ rộng, ẩn/hiện theo Role)"]
        PermMatrix["3. Permission Matrix Studio<br/>(Kiểm soát 5 cờ quyền: View, New, Edit, Delete, Export)"]
        FieldStudio["4. Form & Field Policy Studio<br/>(Chính sách trường: Bắt buộc, Chỉ đọc, Ẩn theo Role)"]
        ImportStudio["5. Smart Import/Export Studio<br/>(Ánh xạ cột Excel động theo từng Khoa/Trường)"]
        PreviewStudio["6. Role Impersonation Studio<br/>(Đóng vai & Xem trước giao diện thực tế)"]
    end

    subgraph CentralDB["CƠ SỞ DỮ LIỆU CẤU HÌNH TẬP TRUNG (SQL SERVER 2022)"]
        DB_Func["Sys_Functions (tbl_Sys_Chuc_Nang)"]
        DB_Grid["Sys_Grid_Configs (Sys_Grid_Field & UI_Global)"]
        DB_Role["Sys_Role_Permissions (Ma trận F1005)"]
        DB_Field["Sys_Field_Policies (Chính sách form)"]
        DB_Map["Sys_Excel_Mappings (Preset F1018)"]
        DB_Log["Sys_Audit_Logs (Diff F1008)"]
    end

    subgraph RuntimePortals["GIAO DIỆN THỰC THI THEO VAI TRÒ (RUNTIME CLIENTS)"]
        LecturerUI["Lecturer Portal<br/>(Lưới SV động, Bảng điểm chuẩn, Bút phê)"]
        StudentUI["Student Portal<br/>(Dashboard tuần, Giấy giới thiệu QR, Nộp bài)"]
        EmployerUI["Employer Portal<br/>(Magic-Link tiếp nhận & Chấm điểm 1-chạm)"]
        DeanUI["Dean / Department Admin<br/>(Giám sát toàn diện, Xuất báo cáo kiểm định)"]
    end

    SuperAdmin ==> CentralDB
    CentralDB ==>|Cache O(1) MemoryCache / Redis 60m| RuntimePortals
```

---

## 💎 2. SÁU TINH HOA TRÍCH LỌC TỪ TKS_V11 & ĐỊNH HƯỚNG HIỆN ĐẠI HÓA

| STT | Tinh hoa Quản trị TKS_V11 | Ứng dụng Thực chiến vào SuperAdmin InternLink | Hiện đại hóa Chuẩn Modern SaaS |
|:---:|:---|:---|:---|
| **1** | **Hệ thống FCode & Mega-Menu 6 Phân hệ**<br/>(`F1001` - `F1047`) | Toàn bộ 6 phân hệ (Hệ thống, Tài khoản, Cấu hình, Nhật ký, Cấu hình IT, API) được cấu hình động qua bảng `Sys_Functions`. | Thay menu tím cũ bằng thanh Mega-Menu tinh tế, icon Lucide sắc nét, hỗ trợ phím tắt và tìm kiếm nhanh. |
| **2** | **Cấu hình Lưới 2 Tầng & Công thái học DataGrid**<br/>(`CSys_Grid_Field` + `CSys_Grid_UI_Global`) | Cho phép SuperAdmin tùy biến từng bảng cho từng Role: Ghim cột bên trái (`Is_Frozen`), chỉnh độ rộng cột (60-400px), ẩn/hiện cột, đổi nhãn tiêu đề. | Bổ sung nút bánh răng `[Cấu hình bảng]` ngay góc phải header, hỗ trợ kéo thả trực quan và xem trước live preview. |
| **3** | **Ma trận Phân quyền F1005 & Cộng dồn Quyền**<br/>(Cumulative Multi-Group RBAC) | Phân quyền theo cây chức năng đa cấp. Cung cấp nút **Check-All theo dòng** (Full quyền 1 chức năng) và **Check-All theo cột** (Cấp quyền Export cho cả phân hệ). | Tích hợp `PermissionGuard` tại frontend và `[AuthorizePermission]` tại backend; giao diện sáng sủa chuẩn `#026aa7` & `#7bc043`. |
| **4** | **Nhập Dữ liệu Động F1018 (Smart Excel Mapping)**<br/>(Không ép khuôn file Excel mẫu) | Đọc header file Excel bất kỳ của trường, gợi ý ghép cột tự động, lưu thành preset mẫu (VD: *"Mẫu Khoa CNTT"*), kiểm định 2 tầng trước khi nạp. | Trực quan hóa lỗi từng dòng với visual badge, hỗ trợ kéo thả file và thanh tiến trình mượt mà. |
| **5** | **Nhật ký Biến động Dữ liệu F1008 (Audit Trail Diff)**<br/>(`CLog_Record_Action_History`) | Ghi nhận chi tiết từng trường bị thay đổi, lưu snapshot cũ và mới, bắt IP và thiết bị thực hiện. | Modal so sánh JSON Diff dạng 2 cột trực quan (Cột đỏ: Dữ liệu cũ $\leftrightarrow$ Cột xanh: Dữ liệu mới), hỗ trợ lọc đa tiêu chí. |
| **6** | **Bố cục Master - Detail (Tổng thể & Chi tiết)**<br/>(Quản lý 2 tầng trên cùng một màn hình) | Nửa trên là Danh sách sinh viên thực tập, click vào sinh viên thì nửa dưới mở ra các tab chi tiết (Nhật ký tuần, Đánh giá DN, Bảng điểm). | Giao diện Responsive chia tỷ lệ mượt mà, không giật lag, tự động cuộn thông minh và tối ưu hóa truy vấn ngầm. |

---

## 📅 3. LỘ TRÌNH TRIỂN KHAI 5 GIAI ĐOẠN CHI TIẾT (STEP-BY-STEP ROADMAP)

---

### 🟢 GIAI ĐOẠN 1: BỘ MÁY SIÊU QUẢN TRỊ CẤU HÌNH GIAO DIỆN (SUPERADMIN CORE STUDIO)
*Thời lượng dự kiến: Sprint 1 (Khởi động ngay)*

#### Bước 1.1: Quản trị Cây Menu & Điều hướng Đa Vai trò (`Navigation Studio`)
- **Backend:** 
  - Nâng cấp bảng `Sys_Functions` (kế thừa đầy đủ các trường từ `tbl_Sys_Chuc_Nang` TKS_V11: `Ma_Chuc_Nang`, `Ten_Chuc_Nang`, `Sort_Priority`, `Chuc_Nang_Parent_ID`, `Nhom_Chuc_Nang_ID`, `Func_URL`, `Image_URL`, 5 cờ quyền mặc định, `Khach_Hang_ID`).
  - Viết `SysFunctionsController.cs`: API trả về cây danh mục phân cấp theo vai trò hiện tại (`GET /api/v1/system/functions/user-menu`) và API quản trị CRUD cây chức năng.
  - Tích hợp bộ nhớ đệm `IMemoryCache` (TTL 60 phút, tự động xóa cache khi Admin cập nhật).
- **Frontend:**
  - Hoàn thiện `AdminMegaMenu.tsx` nạp danh mục động trực tiếp từ API.
  - Xây dựng màn hình `SysFunctionsManagerView.tsx`: Cung cấp giao diện quản trị cây danh mục chức năng dạng bảng phân cấp, cho phép bật/tắt hiển thị, sửa URL, đổi icon Lucide và chỉnh thứ tự sắp xếp.

#### Bước 1.2: Studio Cấu hình Lưới Dữ liệu Đa Phân quyền (`Dynamic Grid Studio`)
- **Backend:**
  - Bổ sung trường `Role_ID` và `Tenant_ID` vào bảng `Sys_Grid_Configs`.
  - Viết API `GET /api/v1/system/grid-configs/{screenCode}` (tự động nhận diện Role của người gọi để trả về cấu hình phù hợp) và API `PUT /api/v1/system/grid-configs/{screenCode}` (SuperAdmin lưu cấu hình cho từng Role cụ thể).
- **Frontend:**
  - Nâng cấp `GridConfigStudioView.tsx`:
    - Thêm bộ chọn: **"Màn hình cấu hình"** (Danh sách SV, Bảng điểm, v.v.) $\times$ **"Vai trò áp dụng"** (Giảng viên, Cán bộ DN, Sinh viên).
    - Thêm công tắc: **Ghim cột trái (Frozen Left)** và **Ghim cột phải (Frozen Right)** kế thừa từ công thái học TKS_V11.
    - Thanh trượt độ rộng cột (Column Width Slider) mượt mà từ 60px đến 400px với token `#026aa7`.
    - Live Preview trực tiếp bên dưới sử dụng `DynamicDataGrid.tsx`.

#### Bước 1.3: Ma trận Năng lực & Kiểm soát Nút bấm Giao diện (`Permission Matrix Studio`)
- **Nghiệp vụ & Frontend:**
  - Nâng cấp `PermissionMatrixView.tsx` theo chuẩn màn hình F1005:
    - Dropdown chọn Nhóm vai trò (`SysRole`).
    - Bảng ma trận hiển thị cây phân hệ $\times$ 5 cờ quyền: `Can_View`, `Can_New`, `Can_Edit`, `Can_Delete`, `Can_Export`.
    - Thêm nút tiện ích vàng: **"Cấp toàn quyền chức năng"** (Check-all row) và **"Cấp quyền cột"** (Check-all column).
  - Hoàn thiện Component bọc bảo vệ nút bấm:
    ```tsx
    <PermissionGuard functionCode="F2301" action="Can_Export" fallback={<DisabledButton tooltip="Bạn không có quyền xuất dữ liệu này" />}>
      <ExportButton onClick={handleExport} />
    </PermissionGuard>
    ```
- **Backend:** Tích hợp `[AuthorizePermission("F2301", PermissionAction.Export)]` Action Filter chặn đứng các yêu cầu API trái phép.

#### Bước 1.4: Studio Chính sách Trường Thông tin Động (`Dynamic Field Policy Studio`)
- **Nghiệp vụ:** SuperAdmin có thể cấu hình cho từng màn hình Form:
  - Trường nào là **Bắt buộc nhập (Required)** $\rightarrow$ Có dấu sao đỏ `*` và validate tự động.
  - Trường nào là **Chỉ đọc (Readonly)** $\rightarrow$ Khóa mờ không cho sửa.
  - Trường nào là **Ẩn hoàn toàn (Hidden)** $\rightarrow$ Không hiển thị trên giao diện của Role đó.
- **Dữ liệu:** Tạo bảng `Sys_Field_Policies` lưu cấu hình theo `(ScreenCode, FieldName, RoleId)`.
- **Frontend:** Component `DynamicFormField` tự động đọc chính sách và render input tương ứng.

#### Bước 1.5: Tính năng Đóng vai & Xem trước Giao diện (Role Impersonation Studio)
- **Nghiệp vụ:** SuperAdmin có thể bấm nút **"Xem thử giao diện với vai trò Giảng viên"** hoặc **"Xem thử giao diện Sinh viên"** ngay tại thanh Header.
- **Bảo mật:** Hệ thống cấp một Impersonation Token tạm thời (TTL 30 phút), hiển thị dải banner màu vàng cam cảnh báo: *"Đang xem thử giao diện với vai trò Giảng viên [Thoát chế độ xem thử]"*, mọi thao tác ghi dữ liệu đều bị chặn hoặc ghi log đặc biệt.

---

### 🔵 GIAI ĐOẠN 2: CHUẨN HÓA & ÁP DỤNG LÊN PHÂN HỆ GIẢNG VIÊN (LECTURER WORKSPACE)
*Thời lượng dự kiến: Sprint 2*

- **Bước 2.1: Danh sách Sinh viên Hướng dẫn (`StudentsView.tsx`):**
  - Chuyển đổi 100% sang `DynamicDataGrid`. Bảng tự động tải cấu hình cột mà SuperAdmin đã thiết lập cho Role Giảng viên.
  - Cột STT, Mã SV, Họ tên được ghim cố định bên trái khi cuộn ngang.
- **Bước 2.2: Bố cục Master - Detail Quản lý Báo cáo (`StudentReportsTab.tsx`):**
  - Nửa trên: Bảng tiến độ 12 tuần của sinh viên.
  - Nửa dưới: Không gian bút phê báo cáo tuần, nạp thang điểm tự động từ `GradingRulesConfigView`.
- **Bước 2.3: Bảng Tổng kết & Bộ nút Xuất Báo cáo (`SummaryView.tsx`):**
  - Đồng bộ các nút xuất chuẩn thương mại: *Hồ sơ đánh giá SV (ZIP)*, *Bảng tổng hợp kết quả (Excel)*, *Báo cáo tổng kết đợt (Word)*, tự động khóa nếu SuperAdmin tắt cờ `Can_Export`.

---

### 🟡 GIAI ĐOẠN 3: CHUẨN HÓA & ÁP DỤNG LÊN PHÂN HỆ SINH VIÊN (STUDENT PORTAL)
*Thời lượng dự kiến: Sprint 3*

- **Bước 3.1: Dashboard Tiến độ Sinh viên (`StudentDashboardView.tsx`):**
  - Dọn sạch toàn bộ chuỗi fallback giả lập cục bộ (`C23A`, `C23A.TH2`).
  - Hiển thị tiến độ tuần thực tế theo cấu hình học kỳ của Nhà trường.
- **Bước 3.2: Module Giấy Giới Thiệu & Tiếp Nhận Doanh Nghiệp:**
  - Tự động sinh Giấy giới thiệu thực tập điện tử có mã tra cứu `IL-ACC-XXXX` và mã QR Code.
- **Bước 3.3: Form Nộp Báo cáo Tuần Động:**
  - Các ô nhập liệu (Công việc, Kết quả, Khó khăn) tự động áp dụng quy tắc từ `Sys_Field_Policies`.

---

### 🟣 GIAI ĐOẠN 4: CHUẨN HÓA CỔNG DOANH NGHIỆP & CỔNG TRA CỨU CÔNG KHAI
*Thời lượng dự kiến: Sprint 4*

- **Bước 4.1: Cổng Tiếp nhận Doanh nghiệp 1-Chạm (`CompanyQuickAcceptanceView.tsx` tại `/accept/:token`):**
  - Mentor quét QR hoặc mở liên kết bảo mật, điền thông tin và bấm xác nhận trong 15 giây mà không cần tài khoản.
  - Hệ thống tự động kích hoạt tiến trình thực tập sang `InProgress`.
- **Bước 4.2: Cổng Đánh giá Doanh nghiệp (`EmployerQuickEvaluationView.tsx` tại `/evaluate/:token`):**
  - Tự động nạp danh mục tiêu chí đánh giá và trọng số điểm từ cấu hình quy chế của Trường.
  - Ký xác thực điện tử và sinh Phiếu đánh giá PDF có mã băm bảo mật.
- **Bước 4.3: Cổng Tra cứu Công khai Xác thực Văn bằng (`PublicVerificationView.tsx` tại `/verify/:code`):**
  - Cho phép nhà tuyển dụng và đoàn thanh tra kiểm định chất lượng tra cứu hồ sơ chính thống của sinh viên.

---

### 🔴 GIAI ĐOẠN 5: KIỂM TOÁN TỰ ĐỘNG, HARDENING & ĐÓNG GÓI THƯƠNG MẠI
*Thời lượng dự kiến: Sprint 5*

- **Bước 5.1: Hoàn thiện Modal So sánh JSON Diff (`AuditLogsView.tsx`):**
  - Kế thừa cơ chế F1008 của TKS_V11: Hiển thị trực quan dữ liệu cũ (đỏ) và dữ liệu mới (xanh) mỗi khi có thay đổi cấu hình hệ thống hoặc điểm số.
- **Bước 5.2: Tối ưu Caching O(1) & Khả năng Chịu tải:**
  - Cache toàn bộ cấu hình Menu và Grid trong RAM với cơ chế Invalidation tức thì khi SuperAdmin bấm "Lưu".
- **Bước 5.3: Hàng rào Kiểm soát Chất lượng QA Gatekeeping:**
  - 100% Unit test Frontend (Vitest) và Backend (.NET) vượt qua.
  - Static code gate: 0 mã màu cấm (`indigo-*`, `violet-*`, `emerald-*`).
  - Production build: `npm run build` và `dotnet build` hoàn thành 0 lỗi.

---

## 🎯 4. MA TRẬN PHÂN CÔNG & THỨ TỰ BẮT ĐẦU (KICK-OFF PLAN)

Chúng ta sẽ khởi động ngay từ **Bước 1 của Giai đoạn 1 (SuperAdmin Core Studio)**:

```
[BƯỚC KHỞI ĐỘNG: SUPERADMIN CORE FOUNDATION]
├── 1. Nâng cấp Schema CSDL: Sys_Functions, Sys_Grid_Configs (bổ sung Role_ID, Tenant_ID)
├── 2. Backend .NET 10: SysFunctionsController & GridConfigsController (Cache O(1) + DTOs)
├── 3. Frontend React 19: Nâng cấp GridConfigStudioView (Ghim cột Frozen + Slider độ rộng)
├── 4. Frontend React 19: Nâng cấp PermissionMatrixView (Nút Check-All dòng/cột theo F1005)
└── 5. QA Verification: Test Vitest + Test .NET + Build Check
```

---

## 🛡️ 5. TIÊU CHÍ NGHIỆM THU QA (ACCEPTANCE CRITERIA)

| Hạng mục | Tiêu chuẩn Nghiệm thu |
|---|---|
| **Cấu hình Đa Role** | SuperAdmin đổi tiêu đề cột hoặc ẩn cột cho Role Giảng viên $\rightarrow$ Đăng nhập tài khoản Giảng viên thấy thay đổi ngay lập tức, trong khi tài khoản Sinh viên không bị ảnh hưởng. |
| **Công thái học Lưới** | Cột được đánh dấu `Is_Frozen = true` luôn cố định bên trái khi cuộn ngang màn hình trên mọi trình duyệt. |
| **Tiện ích Ma trận F1005** | Nút Check-All theo dòng và cột hoạt động chính xác, tự động lưu ma trận 5 cờ quyền vào CSDL và áp dụng ngay. |
| **Bảo mật API** | Người dùng không có cờ `Can_Export` bị chặn cả ở nút bấm giao diện (disabled) và ở tầng API (trả về `403 Forbidden`). |
| **Chuẩn Token UI** | 100% tuân thủ Primary `#026aa7`, Success `#7bc043`, card `rounded-xl border border-slate-200/90 bg-white shadow-2xs`, container `max-w-[1300px]`. |
