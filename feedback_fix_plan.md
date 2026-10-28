# 📋 Kế hoạch sửa lỗi theo feedback tuần — InternLink

> Tổng cộng **9 feedback** → chia thành **5 phase**, ưu tiên bug trước rồi đến tính năng mới.

---

## Phase 1 — Bug fix nhanh (UI text & validation)
> ⏱ Ước tính: ~20 phút | Độ rủi ro: Thấp

### 1.1 Login: Lỗi "HTTP 400" khi mật khẩu < 6 ký tự
- **Nguyên nhân:** Backend validator [`LoginRequestValidator.cs`](file:///e:/Downloads/InternLink/backend/InternLink/InternLink.Application/Validators/LoginRequestValidator.cs) dùng FluentValidation với `.MinimumLength(6)` nhưng **không có `.WithMessage()`** → trả về message mặc định tiếng Anh → frontend [`viMessageMap.ts`](file:///e:/Downloads/InternLink/frontend/src/lib/viMessageMap.ts) không tìm thấy key tương ứng → hiện raw HTTP 400.
- **Sửa:**
  - **Backend:** Thêm `.WithMessage()` tiếng Việt vào `LoginRequestValidator.cs`
  - **Frontend:** Thêm mapping trong `viMessageMap.ts` cho các message validation phổ biến (password too short, username empty)
  - **Frontend:** Thêm validate phía client trước khi gọi API trong [`LoginPortal.tsx`](file:///e:/Downloads/InternLink/frontend/src/components/common/LoginPortal.tsx) (dòng 91-94)

### 1.2 Đổi nhãn chất lượng rubric: "Không tốt" → "Kém", "Tốt" → "Giỏi", "Giỏi" → "Xuất sắc"
- **File chính:** [`gradingRules.ts`](file:///e:/Downloads/InternLink/frontend/src/lib/gradingRules.ts) dòng 59-66 — `GR_QUALITY_RUBRIC_LEVELS`
- **Thay đổi:**

| Giá trị | Cũ | Mới |
|---------|-----|-----|
| 1.0 | Không tốt | Kém |
| 2.0 | Trung bình | Trung bình |
| 3.5 | Khá | Khá |
| 4.0 | Tốt | Giỏi |
| 5.0 | Giỏi | Xuất sắc |

- **Lưu ý:** Chỉ thay `label` hiển thị, **không đổi `value`** → logic chấm điểm không bị ảnh hưởng
- **Kiểm tra đồng bộ:** Tìm tất cả nơi dùng `GR_QUALITY_RUBRIC_LEVELS` — modal duyệt báo cáo (`WeeklyReportsReviewPanel.tsx`) và trang chấm điểm (`/lecturer/evaluations`) đều đọc từ constant này → tự đồng bộ

---

## Phase 2 — Bug fix giao diện & UX
> ⏱ Ước tính: ~40 phút | Độ rủi ro: Thấp–Trung bình

### 2.1 Modal "Duyệt báo cáo" gây chớp nháy trang chính
- **File:** [`WeeklyReportsReviewPanel.tsx`](file:///e:/Downloads/InternLink/frontend/src/features/lecturer/components/WeeklyReportsReviewPanel.tsx)
- **Nguyên nhân có thể:**
  - Modal render gây re-render component cha → data refetch → bảng nhấp nháy
  - Thiếu `overflow: hidden` trên `body` khi modal mở → scrollbar nhảy
  - State change khi mở modal trigger data refresh
- **Sửa:** Điều tra DOM khi mở modal, kiểm tra refetch pattern, thêm `body overflow lock` và tối ưu re-render

### 2.2 Student submissions: Thêm nút "Hủy nộp" cho báo cáo cuối kỳ, sản phẩm sáng tạo, đánh giá DN
- **File:** [`SubmissionsView.tsx`](file:///e:/Downloads/InternLink/frontend/src/features/student/pages/SubmissionsView.tsx)
- **Hiện trạng:** Đã có hàm `renderCancelButton()` (dòng 330) và `handleCancelSubmission()` (dòng 311), nhưng **chưa gắn vào UI** cho 3 loại hồ sơ (FinalReport, Product, EmployerEvidence)
- **Sửa:** Thêm `{canCancelSubmission(finalReport) && renderCancelButton(finalReport)}` vào section báo cáo cuối kỳ (dòng ~730), tương tự cho sản phẩm sáng tạo và đánh giá DN
- **Điều kiện:** Chỉ hiện khi `status === "Submitted" || status === "Reviewed"` (chưa được giảng viên Approve)

### 2.3 Student weekly-reports: Select đúng tuần deadline hiện hành
- **File:** [`WeeklyReportsView.tsx`](file:///e:/Downloads/InternLink/frontend/src/features/student/pages/WeeklyReportsView.tsx)
- **Hiện trạng:** Logic `suggestedWeek` (dòng 131-166) đã tính khá đúng, nhưng có thể tab "Danh sách báo cáo các tuần" **không dùng `selectedWeek`** mà hiển thị flat list
- **Sửa:** Kiểm tra tab "Danh sách báo cáo các tuần" có scroll/highlight đến tuần hiện hành không, thêm auto-scroll nếu thiếu

---

## Phase 3 — Bug regex tên file chữ "Đ"
> ⏱ Ước tính: ~30 phút | Độ rủi ro: Trung bình (ảnh hưởng tên file đã lưu)

### 3.1 Fix regex: "Quảng Thành Đạt" → "QuangThanhat" (mất chữ D)
- **File:** [`WeeklyReportService.cs`](file:///e:/Downloads/InternLink/backend/InternLink/InternLink.Infrastructure/Services/WeeklyReportService.cs) dòng 923-938
- **Nguyên nhân gốc:**

```csharp
// Dòng 926-928: Replace Đ → D TRƯỚC KHI normalize
var mappedName = rawName
    .Replace('Đ', 'D')   // "Quảng Thành Đạt" → "Quảng Thành Dạt"
    .Replace('đ', 'd');

// Dòng 930-934: Normalize FormD tách dấu
var normalized = mappedName.Normalize(NormalizationForm.FormD);
// "Dạt" → "D" + combining_mark_a + combining_mark_dot + "t"
// Filter bỏ NonSpacingMark → "Dat" ✓ ĐÚNG cho "Đạt"
```

**NHƯNG** vấn đề là `"Thành"` chứa `"nh"` — khi `Normalize(FormD)`:
- `"Thành"` → `"T" + "h" + "a" + combining_breve + combining_grave + "n" + "h"`
- Filter NonSpacingMark → `"Thanh"` ✓ OK

Cần debug kỹ hơn: có thể **encoding ký tự "Đ" trong tên sinh viên từ DB** khác với char literal `'Đ'` (composed vs decomposed form). Khi `"Đ"` ở dạng decomposed (`"D" + combining_stroke`) thì `Replace('Đ', 'D')` **không match** → `Normalize(FormD)` tách `"Đ"` thành `"D" + combining_stroke"` → filter bỏ combining → mất `"D"` luôn!

- **Sửa đúng:** Normalize FormD **trước**, rồi regex replace `\u0110` (Đ hoa) và `\u0111` (đ thường) **sau khi đã normalize**. Hoặc tốt hơn: dùng `.Replace("Đ", "D").Replace("đ", "d")` bằng **string** thay vì **char**, và normalize input trước khi replace
- **Test:** Thêm unit test cho "Quảng Thành Đạt", "Đặng Nguyễn Duy Khanh", "Nguyễn Văn Đức"
- **Cũng sửa trong:** [`SubmissionService.cs`](file:///e:/Downloads/InternLink/backend/InternLink/InternLink.Infrastructure/Services/SubmissionService.cs) nếu có logic tương tự

---

## Phase 4 — Cải thiện biểu đồ Dashboard giảng viên
> ⏱ Ước tính: ~45 phút | Độ rủi ro: Thấp (chỉ UI)

### 4.1 Biểu đồ "Tình hình nộp báo cáo theo tuần": redesign 2 cột/tuần
- **File:** [`DashboardView.tsx`](file:///e:/Downloads/InternLink/frontend/src/features/lecturer/pages/DashboardView.tsx) (dòng 490+)
- **Yêu cầu mới:**

```
Mỗi tuần hiển thị 2 cột:
┌─────────┐  ┌─────────┐
│ Nộp trễ │  │         │
│ (cam)   │  │Đã duyệt │
├─────────┤  │ (xanh)  │
│Đúng hạn │  │         │
│(xanh nhạt)│ │         │
└─────────┘  └─────────┘
  Đã nộp      Đã duyệt
```

- **Màu sắc:** Đúng hạn = `#93c5fd` (blue-300), Nộp trễ = `#fdba74` (orange-300), Đã duyệt = `#026aa7` (brand blue)
- **Đường line mốc:** Giữ nguyên
- **Sửa:** Cập nhật data transform + chart config, sử dụng stacked bar cho cột "Đã nộp"

---

## Phase 5 — Tính năng mới (SMTP & cơ chế đóng kỳ)
> ⏱ Ước tính: ~2-3 giờ | Độ rủi ro: Cao (thêm logic backend mới)

### 5.1 SMTP: Gửi mail tự động nhắc deadline cho sinh viên
- **Cơ chế:** Tạo `IHostedService` / background job chạy hằng ngày (cron)
- **Logic:** Quét `SemesterReportSchedules` → nếu deadline còn 24h / 48h → gửi mail nhắc sinh viên chưa nộp
- **Template email:** Tham khảo Google Classroom — tiêu đề: "[InternLink] Nhắc nhở: Báo cáo Tuần X sắp đến hạn"
- **Cấu hình:** Thêm setting bật/tắt, khoảng thời gian nhắc (mặc định 24h trước deadline)

### 5.2 SMTP: Gửi mail nhắc giảng viên duyệt
- **Logic:** Quét báo cáo/hồ sơ `status = Submitted` quá 48h chưa duyệt → nhắc giảng viên phụ trách
- **Tần suất:** 1 lần/ngày, không spam

### 5.3 Cập nhật cơ chế đóng kỳ thực tập
- **Hiện trạng:** [`SemesterService.cs`](file:///e:/Downloads/InternLink/backend/InternLink/InternLink.Infrastructure/Services/SemesterService.cs) có `CloseSemesterAsync()` — hiện là **thủ công** (admin nhấn nút đóng)
- **Yêu cầu mới:** Không tự động đóng kỳ, chỉ **gửi thông báo** khi đến thời hạn → admin khoa tự quyết định
- **Sửa:**
  - Kiểm tra nếu có background job tự đóng → xóa/disable
  - Thêm notification khi kỳ hết hạn: "Kỳ thực tập [tên] đã hết thời hạn. Vui lòng xem xét và đóng kỳ khi sẵn sàng."
  - Giữ nguyên nút đóng thủ công cho admin

---

## Tóm tắt thứ tự thực hiện

| Phase | Nội dung | Thời gian | File chính |
|-------|----------|-----------|------------|
| **1** | Login validation + đổi nhãn rubric | ~20 phút | `LoginRequestValidator.cs`, `viMessageMap.ts`, `LoginPortal.tsx`, `gradingRules.ts` |
| **2** | Modal flicker + nút hủy submissions + week selection | ~40 phút | `WeeklyReportsReviewPanel.tsx`, `SubmissionsView.tsx`, `WeeklyReportsView.tsx` |
| **3** | Fix regex tên file chữ "Đ" | ~30 phút | `WeeklyReportService.cs`, unit tests |
| **4** | Redesign biểu đồ dashboard | ~45 phút | `DashboardView.tsx` |
| **5** | SMTP notifications + cơ chế đóng kỳ | ~2-3 giờ | `SmtpEmailService.cs`, `SemesterService.cs`, new background service |

> [!TIP]
> Nên commit riêng từng phase để dễ rollback nếu có vấn đề.

---

**Bắt đầu Phase 1?**
