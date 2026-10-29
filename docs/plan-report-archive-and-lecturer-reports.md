# KẾ HOẠCH TRIỂN KHAI CHO DEV: NÂNG CẤP KHO HỒ SƠ LƯU TRỮ (ADMIN) & TỐI ƯU TRANG BÁO CÁO (GIẢNG VIÊN)

**Tech Lead:** Thạch · **QA Lead & DevOps:** Antigravity  
**Ngày lập:** 29/10/2026 · **Mục tiêu:** Nâng cấp UX/UI quản lý hồ sơ thực tập, nhóm theo sinh viên, không phá vỡ bất kỳ logic nghiệp vụ nào đang chạy ổn định.

---

## 🎯 NGUYÊN TẮC BẤT DI BẤT DỊCH (CRITICAL RULES)
1. **BẢO TOÀN LOGIC NGHIỆP VỤ 100% (`*** Tránh đụng vào logic như hiện tại`):**
   * Giữ nguyên toàn bộ logic duyệt báo cáo (Approve, Request Revision, Comment, Quality Score).
   * Giữ nguyên cấu trúc dữ liệu, các bảng cơ sở dữ liệu (`WeeklyReports`, `Submissions`, `Internships`), không migration đổi schema phá vỡ dữ liệu cũ.
   * Giữ nguyên quyền hạn và bộ lọc phân quyền Department Admin / Lecturer / Anti-IDOR.
2. **NÂNG CẤP TẬP TRUNG VÀO DỮ LIỆU & GIAO DIỆN (Presentation & Aggregation):**
   * Tầng Backend: Mở rộng khả năng tổng hợp dữ liệu (gộp cả Báo cáo tuần + Hồ sơ cuối kỳ/Minh chứng) vào DTO trả về cho Admin.
   * Tầng Frontend: Tổ chức lại cấu trúc hiển thị dạng **Nhóm theo Sinh viên (Grouped by Student / Accordion)**, loại bỏ hoàn toàn tình trạng danh sách phẳng cuộn dài vô tận.

---

## PHẦN 1: NÂNG CẤP TRANG `/admin/report-archive` (KHO HỒ SƠ LƯU TRỮ)

### 1.1. Hiện trạng & Yêu cầu mới
* **Hiện trạng:**
  * Tên gọi đang là `"Kho báo cáo tuần"`.
  * Chỉ hiển thị danh sách và cho tải báo cáo tuần. Chưa thấy được Báo cáo cuối kỳ, Phiếu đánh giá doanh nghiệp, Sản phẩm đồ án.
* **Yêu cầu mới:**
  * **Đổi tên:** `"Kho báo cáo tuần"` $\rightarrow$ **`"Kho hồ sơ lưu trữ"`** (hoặc `"Kho tài liệu lưu trữ"`).
  * **Kho tổng hợp:** Tích hợp đầy đủ mọi loại hồ sơ của sinh viên trong kỳ (Báo cáo tuần, Báo cáo cuối kỳ, Đánh giá doanh nghiệp, Sản phẩm thực tế).
  * **Nhóm theo Sinh viên:** Mỗi sinh viên là một đơn vị hồ sơ tổng hợp.
  * **Bộ lọc linh hoạt:** Lọc theo loại hồ sơ (Tất cả, Báo cáo tuần, Báo cáo cuối kỳ, Đánh giá DN, Sản phẩm).
  * **Xem & Tải:** Xem trực tiếp (Preview PDF/ảnh), Tải từng file lẻ, Tải ZIP trọn bộ hồ sơ của 1 sinh viên, hoặc Tải ZIP toàn khoa theo bộ lọc.

---

### 1.2. Kế hoạch Kỹ thuật Backend cho Admin Archive

#### A. Cập nhật DTO: `WeeklyReportArchiveDtos.cs`
Bổ sung danh sách chi tiết các tài liệu con của sinh viên vào `WeeklyReportArchiveStudentDto`:

```csharp
namespace InternLink.Application.DTOs;

public class StudentArchiveDocumentItemDto
{
    public Guid Id { get; set; }
    public string DocumentType { get; set; } = null!; // "WeeklyReport", "FinalReport", "Evidence", "Product"
    public string DisplayType { get; set; } = null!;  // "Báo cáo tuần", "Báo cáo cuối kỳ", "Đánh giá DN", "Sản phẩm"
    public string Title { get; set; } = null!;
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
    public long? FileSize { get; set; }
    public int? WeekNumber { get; set; }
    public int Version { get; set; } = 1;
    public string Status { get; set; } = null!;
    public DateTime? SubmittedAt { get; set; }
}

public class WeeklyReportArchiveStudentDto
{
    public Guid StudentId { get; set; }
    public Guid InternshipId { get; set; }
    public string StudentCode { get; set; } = null!;
    public string StudentName { get; set; } = null!;
    public string? ClassName { get; set; }
    public string? CompanyName { get; set; }
    
    // Thống kê nhanh
    public int WeeklyReportCount { get; set; }
    public bool HasFinalReport { get; set; }
    public bool HasEvidence { get; set; }
    public int TotalFilesCount { get; set; }
    public DateTime? LastSubmittedAt { get; set; }

    // Danh sách chi tiết các tài liệu để xem/tải
    public List<StudentArchiveDocumentItemDto> Documents { get; set; } = new();
}
```

#### B. Nâng cấp `WeeklyReportArchiveService.cs`
* **Trong `GetStudentsAsync`:**
  * Include cả `WeeklyReports` và `Submissions` (và các `Assets` nếu có):
    ```csharp
    .Include(item => item.WeeklyReports.Where(r => !r.IsDeleted))
    .Include(item => item.Submissions.Where(s => !s.IsDeleted))
        .ThenInclude(s => s.Assets.Where(a => !a.IsDeleted))
    ```
  * Map toàn bộ file báo cáo tuần và các loại submission vào danh sách `Documents` của từng sinh viên.
* **Trong `CreateZipAsync`:**
  * Thêm tham số lọc `documentType` (`"all"`, `"weekly"`, `"final"`, `"evidence"`).
  * Nếu chọn tải trọn gói của 1 sinh viên (`studentId != null`): Gom cả Báo cáo tuần + Báo cáo cuối + Đánh giá DN vào cấu trúc thư mục rõ ràng:
    ```text
    2421160052_ThachHien/
    ├── BaoCaoTuan/
    │   ├── Tuan01_ThachHien_V1.pdf
    │   └── Tuan02_ThachHien_V1.pdf
    ├── BaoCaoCuoiKy/
    │   └── BaoCaoCuoiKy_ThachHien_V1.pdf
    └── DanhGiaDoanhNghiep/
        └── DanhGiaDN_ThachHien.pdf
    ```

#### C. Controller `AdminReportArchiveController.cs`
* Bổ sung query `[FromQuery] string? documentType = "all"` vào endpoint `download`.

---

### 1.3. Kế hoạch Kỹ thuật Frontend cho Admin Archive

#### A. Đổi tên Menu & Header
* **[Sidebar.tsx](file:///e:/Downloads/InternLink/frontend/src/features/admin/components/Sidebar.tsx):** Đổi nhãn menu `admin-report-archive` thành **`"Kho hồ sơ lưu trữ"`**.
* **[Header.tsx](file:///e:/Downloads/InternLink/frontend/src/features/admin/components/Header.tsx):** Đổi tiêu đề breadcrumb thành **`"Kho hồ sơ lưu trữ"`**.
* **[ReportArchiveView.tsx](file:///e:/Downloads/InternLink/frontend/src/features/admin/pages/ReportArchiveView.tsx):**
  * Tiêu đề trang: **"Kho hồ sơ lưu trữ thực tập"**.
  * Mô tả: *"Kho tổng hợp quản lý, tra cứu và tải về toàn bộ Báo cáo tuần, Báo cáo cuối kỳ, Phiếu đánh giá doanh nghiệp và hồ sơ thực tập của sinh viên."*

#### B. Giao diện Thống kê & Bộ lọc
* **Dải KPI Cards:**
  * Tổng số sinh viên có hồ sơ.
  * Tổng số file báo cáo tuần.
  * Số lượng báo cáo cuối kỳ đã nộp.
  * Số lượng phiếu đánh giá doanh nghiệp đã nộp.
* **Bộ lọc Toolbar:**
  * Ô tìm kiếm: Tìm nhanh theo MSSV, Họ tên, Lớp, Doanh nghiệp.
  * Dropdown lọc loại hồ sơ:
    * `Tất cả tài liệu`
    * `Báo cáo tuần`
    * `Báo cáo cuối kỳ`
    * `Đánh giá doanh nghiệp`
    * `Sản phẩm / Minh chứng khác`
  * Nút **[Tải ZIP toàn kỳ]** có dropdown chọn: *Tải toàn bộ kho* / *Chỉ tải báo cáo tuần* / *Chỉ tải báo cáo cuối*.

#### C. Danh sách Nhóm theo Sinh viên (Accordion Card)
* Mỗi sinh viên là một thẻ card rộng rãi, hiển thị:
  * Avatar chữ cái đầu, Họ tên, MSSV, Lớp, Tên doanh nghiệp tiếp nhận.
  * Các huy hiệu trạng thái: `X Báo cáo tuần` | `BC Cuối: Đã nộp / Chưa nộp` | `Đánh giá DN: Đã nộp / Chưa nộp`.
  * Nút **[Tải toàn bộ hồ sơ (.zip)]** của riêng sinh viên đó.
  * Nút mở rộng/thu gọn (Chevron Down).
* **Khi bấm mở rộng (Expanded Content):**
  * Hiển thị bảng danh sách các tài liệu của sinh viên đó theo bộ lọc đang chọn:
    * Icon loại file (.pdf, .docx, .zip).
    * Tên tài liệu / Tiêu đề bài nộp.
    * Tuần thực tập (nếu là báo cáo tuần).
    * Ngày giờ nộp.
    * Trạng thái duyệt.
    * Thao tác: Nút **[Xem trước (Preview)]** và Nút **[Tải file lẻ]**.

---

## PHẦN 2: TỐI ƯU TRANG `/lecturer/reports` (GIẢNG VIÊN DUYỆT BÁO CÁO)

### 2.1. Hiện trạng & Vấn đề cần khắc phục
1. **Danh sách phẳng cuộn dài:** Hiện tại tất cả báo cáo tuần của mọi sinh viên đang đổ chung vào một danh sách phẳng (`<ul>` thẳng đuột). Nếu có 10–15 sinh viên, mỗi em nộp 2–3 bài chờ duyệt thì danh sách dài hàng chục mục, giảng viên phải cuộn mỏi tay để tìm bài của từng em.
2. **Bộ lọc chưa tiện lợi:** Ô tìm kiếm, dropdown loại hồ sơ và khu vực tải ZIP đang xếp dàn trải, chưa tối ưu luồng thao tác.
3. **Cách nhóm tải file ZIP:** Dropdown hiện tại (`weekly`, `final`, `product`, `evidence`, `student`) còn thô, thiếu trực quan.

---

### 2.2. Giải pháp Tối ưu Giao diện `/lecturer/reports`

#### A. Cải tiến Bộ lọc & Toolbar (Tối ưu trải nghiệm Giảng viên)
Tổ chức lại toolbar theo 2 tầng rõ ràng:
* **Tầng 1 (Điều hướng trạng thái):**
  * Nút **[Chờ duyệt]** kèm Badge đếm màu hổ phách: `X bài chờ duyệt`.
  * Nút **[Đã duyệt / Lịch sử]** kèm Badge màu xanh lá.
  * Nút **[Cấu hình lịch nộp T1–Tn]**.
* **Tầng 2 (Bộ lọc tra cứu nhanh):**
  * Ô tìm kiếm: *"Tìm theo tên sinh viên, MSSV hoặc tiêu đề bài nộp..."*
  * Dropdown Lọc loại bài: *Tất cả bài nộp* | *Báo cáo tuần* | *Báo cáo cuối kỳ* | *Đánh giá doanh nghiệp* | *Sản phẩm thực tế*.
  * Dropdown Lọc Tuần: *Tất cả các tuần* | *Tuần 1* | *Tuần 2*...
* **Khu vực Tải ZIP:**
  * Thu gọn thành một nút công cụ nổi bật: **[📦 Tải gói ZIP hồ sơ]**.
  * Bấm vào mở popup/dropdown cho phép chọn:
    1. *Tải tất cả báo cáo tuần (.zip)*
    2. *Tải tất cả báo cáo cuối kỳ (.zip)*
    3. *Tải tất cả phiếu đánh giá DN (.zip)*
    4. *Gói ZIP phân thư mục theo từng sinh viên*

#### B. Nhóm Báo cáo Chờ duyệt theo Sinh viên (Group by Student in `WeeklyReportsReviewPanel.tsx`)
* **Logic nhóm (Frontend Pure UI, không đụng logic duyệt):**
  * Dữ liệu `reports` hiện có trường `internshipId` và ngữ cảnh `studentByInternship`.
  * Gom nhóm:
    ```typescript
    const groupedReportsByStudent = useMemo(() => {
      const map = new Map<string, { student: any; reports: WeeklyReportDto[] }>();
      for (const r of visibleWeeklyReports) {
        const student = studentByInternship[r.internshipId];
        const key = r.internshipId;
        if (!map.has(key)) {
          map.set(key, { student, reports: [] });
        }
        map.get(key)!.reports.push(r);
      }
      return Array.from(map.values());
    }, [visibleWeeklyReports, studentByInternship]);
    ```
* **Thiết kế Giao diện Thẻ Sinh viên (Student Group Card):**
  * Mỗi sinh viên có báo cáo chờ duyệt sẽ hiển thị thành 1 Card riêng biệt:
    * **Header thẻ:**
      * Avatar chữ cái đầu / Họ tên sinh viên / MSSV / Lớp.
      * Doanh nghiệp tiếp nhận.
      * Huy hiệu đếm: `<span className="badge-warning">X bài chờ duyệt</span>`.
      * Nút mở rộng/thu gọn (Mặc định mở sẵn các sinh viên có bài chờ duyệt).
    * **Body thẻ:**
      * Danh sách các bài nộp của sinh viên đó (ví dụ: Tuần 2, Tuần 3...).
      * Trong từng bài nộp: Hiển thị tiêu đề, tên file, ngày nộp.
      * Các nút hành động: **[Xem trước]**, **[Duyệt & Cho điểm chất lượng]**, **[Yêu cầu sửa]**.
  * **Cảm xúc người dùng:** Khi giảng viên duyệt xong bài của sinh viên nào, số lượng của sinh viên đó giảm dần; khi hết bài chờ duyệt, sinh viên đó tự động chuyển sang tab "Đã duyệt" $\rightarrow$ Giảng viên cảm nhận rõ tiến độ công việc được giải quyết từng bước (Zero-inbox), không bị ngợp bởi danh sách dài dằng dặc.

---

## 📋 PHÂN CHIA TASK CHO DEV TRIỂN KHAI

| Task | Hạng mục | Files can thiệp | Phạm vi & Cam kết |
|:---:|---|---|---|
| **TASK-1** | **Backend Archive Aggregation:** Nâng cấp DTO và Service trả về đầy đủ hồ sơ SV cho Admin | `WeeklyReportArchiveDtos.cs`<br>`WeeklyReportArchiveService.cs`<br>`AdminReportArchiveController.cs` | Bổ sung Submissions vào DTO; Cho phép tải ZIP theo loại tài liệu; Giữ nguyên các method cũ. |
| **TASK-2** | **Đổi tên Menu & Breadcrumb Admin:** Kho báo cáo tuần $\rightarrow$ Kho hồ sơ lưu trữ | `Sidebar.tsx`<br>`Header.tsx`<br>`ReportArchiveView.tsx` | Đổi nhãn hiển thị và tiêu đề trang; Giữ nguyên route `/admin/report-archive`. |
| **TASK-3** | **Frontend Admin Archive UI:** Giao diện nhóm theo Sinh viên & Bộ lọc đa loại hồ sơ | `ReportArchiveView.tsx`<br>`adminReportArchive.service.ts` | Hiển thị dạng Card sinh viên, bộ lọc theo loại hồ sơ, xem trước & tải file/zip từng SV hoặc toàn kỳ. |
| **TASK-4** | **Frontend Lecturer Reports Grouping:** Nhóm bài chờ duyệt theo từng sinh viên | `WeeklyReportsReviewPanel.tsx`<br>`ReportsView.tsx` | Gom báo cáo chờ duyệt theo từng sinh viên, thay thế danh sách phẳng cuộn dài, giữ nguyên 100% logic onReview. |
| **TASK-5** | **Tối ưu Toolbar & Tải ZIP Giảng viên:** Sắp xếp bộ lọc gọn gàng và menu tải ZIP trực quan | `ReportsView.tsx` | Sắp xếp lại Search/Filter, thiết kế lại dropdown/modal tải file ZIP theo từng nhóm rõ ràng. |

---

## ✅ CHECKLIST KIỂM THỬ NGHIỆM THU (QA CRITERIA)

- [ ] Vào `/admin/report-archive`: Menu Sidebar và Header hiển thị tên **"Kho hồ sơ lưu trữ"**.
- [ ] Màn hình Admin hiển thị danh sách nhóm theo từng Sinh viên (Card/Accordion).
- [ ] Bấm mở rộng sinh viên: Xem được cả Báo cáo tuần, Báo cáo cuối kỳ, Đánh giá DN (nếu có).
- [ ] Bộ lọc loại hồ sơ ở Admin hoạt động chính xác (Lọc riêng Báo cáo tuần, Báo cáo cuối...).
- [ ] Tải được file lẻ hoặc file ZIP của 1 sinh viên bất kỳ.
- [ ] Tải được file ZIP toàn kỳ theo bộ lọc.
- [ ] Vào `/lecturer/reports`: Danh sách bài chờ duyệt đã được gom theo từng Sinh viên, không còn bị sổ dài phẳng.
- [ ] Bấm Duyệt / Yêu cầu sửa / Đánh giá chất lượng hoạt động bình thường, dữ liệu cập nhật ngay.
- [ ] Thao tác tải ZIP của Giảng viên có giao diện lựa chọn rõ ràng, tải về mở giải nén bình thường.
- [ ] Chạy `dotnet test --no-build` đạt 100% PASS (381 tests).
- [ ] Chạy `npm test -- --run` đạt 100% PASS (144 tests).
