# NGHIÊN CỨU THIẾT KẾ: TKS PERMISSION MATRIX → INTERNLINK PERMISSION STUDIO
## Phân tích giao diện Phân Quyền Chức Năng (F1005) của TKSolution V11

> **Mục đích:** Học hỏi mô hình thiết kế lưới phân quyền của TKS để nâng cấp `PermissionMatrixView.tsx` của InternLink — rõ ràng và trực quan hơn, nhưng giữ nguyên bản sắc thương hiệu `#026aa7`.

---

## 1. Ảnh chụp giao diện TKS tham khảo

````carousel
![TKS Permission Matrix - Trạng thái được cấp quyền](/C:/Users/th.dev/.gemini/antigravity/brain/512a17a2-5a86-4f1c-8423-fe059e489afa/tks-permission-matrix-1.jpg)
<!-- slide -->
![TKS Permission Matrix - Trạng thái chọn nhóm API](/C:/Users/th.dev/.gemini/antigravity/brain/512a17a2-5a86-4f1c-8423-fe059e489afa/tks-permission-matrix-2.jpg)
````

---

## 2. Điểm mạnh nổi bật của TKS cần học hỏi

| # | Điểm mạnh TKS | Mô tả chi tiết |
|---|---|---|
| 1 | **Multi-Grid phân nhóm chức năng** | Các chức năng được nhóm thành nhiều bảng nhỏ (Panel) cạnh nhau: Dashboard, Master Data, Xuất nhập kho, Báo cáo, Quản trị... Mỗi nhóm là một grid độc lập có phân trang riêng. |
| 2 | **Toggle Switch thay cho Checkbox** | Quyền Xem/Thêm/Sửa/Xóa/Export dùng toggle switch tròn (xanh = cấp, xám = khóa) — trực quan hơn checkbox vuông rất nhiều. |
| 3 | **Cột Sort Order có highlight** | Cột Sort hiển thị giá trị số (1, 2, 3...) với nền vàng (#ffd700) nổi bật, giúp người dùng nhận biết ngay thứ tự sắp xếp chức năng. |
| 4 | **2 bộ lọc đầu trang** | Dropdown "Nhóm Thành Viên" (Role) và "Nhóm Chức Năng" (Function Group) đặt song song ở đầu trang — chọn xong là lưới cập nhật ngay lập tức. |
| 5 | **Nút Load Lại Cache** | Giúp refresh quyền real-time sau khi lưu, không cần đăng xuất/đăng nhập lại. |
| 6 | **Layout Compact** | Mọi thứ hiển thị trên 1 màn hình, không cần cuộn nhiều. |

---

## 3. Điểm yếu / Hạn chế của TKS

| # | Điểm yếu | Giải pháp InternLink |
|---|---|---|
| 1 | Không có cột "Toàn quyền" (Select All) theo hàng | InternLink đã có ✅ |
| 2 | Không có checkbox "Cấp tất cả" theo cột (column toggle) | InternLink đã có ✅ |
| 3 | Dark header (tím đậm) gây mỏi mắt khi nhìn lâu | InternLink dùng header sáng `bg-slate-50` thoáng mắt ✅ |
| 4 | Multi-grid chia nhỏ quá → khó so sánh ngang giữa các nhóm | InternLink nên dùng **Grouped Table** (1 bảng, nhóm bằng header phụ) thay vì chia panel |

---

## 4. Đề xuất nâng cấp `PermissionMatrixView.tsx` InternLink

### 4.1. Thay Checkbox bằng Toggle Switch (iOS-style)
```
Hiện tại:   ☑ (checkbox vuông, nhỏ, khó nhận biết trạng thái)
Đề xuất:    ⚪🟢 (toggle switch tròn, xanh #7bc043 khi bật, xám khi tắt)
```
- Toggle switch to hơn, trực quan hơn, dễ bấm trên mobile.
- Trạng thái ON dùng màu `#7bc043` (success/brand) thay vì xanh dương để phân biệt rõ với primary.

### 4.2. Nhóm chức năng bằng Row Group Header (Grouped Table)
```
┌──────────────────────────────────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
│ Phân hệ / Chức năng             │Sort│ ALL│ Xem│Thêm│Sửa │ Xóa│Xuất│Nhập│Duyệt│
├──────────────────────────────────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
│ 📊 DASHBOARD                    │    │ ⚪ │    │    │    │    │    │    │    │  ← Group header
│   Dashboard                     │ 1  │ 🟢 │ 🟢 │ ⚪ │ ⚪ │ ⚪ │ 🟢 │ ⚪ │ ⚪ │
├──────────────────────────────────┤    │    │    │    │    │    │    │    │    │
│ 🎓 QUẢN LÝ SINH VIÊN           │    │ ⚪ │    │    │    │    │    │    │    │  ← Group header
│   Danh sách sinh viên           │ 1  │ 🟢 │ 🟢 │ 🟢 │ 🟢 │ 🟢 │ 🟢 │ 🟢 │ ⚪ │
│   Phân công GVHD                │ 2  │ 🟢 │ 🟢 │ 🟢 │ 🟢 │ ⚪ │ 🟢 │ 🟢 │ ⚪ │
│   Bảng điểm thực tập            │ 3  │ 🟢 │ 🟢 │ ⚪ │ 🟢 │ ⚪ │ 🟢 │ ⚪ │ 🟢 │
└──────────────────────────────────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
```
- **Mỗi nhóm** có 1 dòng header phụ nền xanh nhạt `bg-blue-50` với icon và tên nhóm.
- **Toggle toàn nhóm**: Click vào toggle ALL trên dòng header sẽ bật/tắt toàn bộ quyền cho cả nhóm đó.
- Đây là điểm khác biệt lớn nhất so với TKS: vẫn 1 bảng liền mạch, dễ so sánh ngang, nhưng phân nhóm rõ ràng bằng visual.

### 4.3. Cột Sort Order có Visual Badge
```
Hiện tại:   (ẩn, chỉ dùng để sắp xếp logic)
Đề xuất:    Badge tròn số thứ tự, nền vàng nhẹ (#fef3c7)
```

### 4.4. Thêm bộ lọc "Nhóm Chức Năng" (Function Group Filter)
```
Hiện tại:   Chỉ có 1 dropdown "Nhóm quyền" (Role)
Đề xuất:    Thêm dropdown "Nhóm chức năng" hoặc nút filter-chip để lọc nhanh
```

### 4.5. Responsive cho Mobile/Tablet
- Sticky cột đầu tiên (tên chức năng) khi cuộn ngang — **đã có** ✅.
- Toggle switch to hơn checkbox → dễ bấm trên màn hình cảm ứng.

---

## 5. Bảng so sánh trước/sau nâng cấp

| Tiêu chí | InternLink hiện tại | Sau nâng cấp (tham khảo TKS) |
|---|---|---|
| Điều khiển quyền | Checkbox vuông 16px | Toggle Switch tròn `#7bc043` |
| Phân nhóm chức năng | Flat list (không nhóm) | Grouped Table với header phụ |
| Cột Sort | Ẩn | Badge số tròn nền vàng |
| Bộ lọc | 1 dropdown (Role) | 2 dropdown (Role + Function Group) |
| Toggle toàn hàng | ✅ Có | ✅ Giữ nguyên |
| Toggle toàn cột | ✅ Có | ✅ Giữ nguyên |
| Toggle toàn nhóm | ❌ Không | ✅ Mới |
| Sticky column | ✅ Có | ✅ Giữ nguyên |
| Màu brand | `#026aa7` Primary | `#026aa7` Primary + `#7bc043` Toggle ON |

---

> [!IMPORTANT]
> Quy tắc bất di bất dịch: Mọi nâng cấp UI phải giữ nguyên hệ màu InternLink (`#026aa7`, `#025a8e`, `#7bc043`). Nghiêm cấm sử dụng lớp màu `indigo-*`, `violet-*` hoặc bảng màu tối kiểu TKS.
