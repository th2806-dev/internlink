# InternLink — Quy Trình Nghiệp Vụ Thực Tập (Business Workflow)

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 4.0  
**Ngày cập nhật:** Tháng 9/2026

---

## 1. Tổng Quan Quy Trình 5 Giai Đoạn (End-to-End Workflow)

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  GIAI ĐOẠN 1 │──►│  GIAI ĐOẠN 2 │──►│  GIAI ĐOẠN 3 │──►│  GIAI ĐOẠN 4 │──►│  GIAI ĐOẠN 5 │
│ Chuẩn bị     │   │ Khởi động    │   │ Giám sát      │   │ Đánh giá     │   │ Tổng kết     │
│ Học kỳ &    │   │ Thực tập &   │   │ Nhật ký Tuần  │   │ Rubric &     │   │ Xuất Báo     │
│ Phân công    │   │ Phê duyệt    │   │ 1-16 Tuần    │   │ Phản hồi     │   │ cáo/PDF      │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

---

## 2. Chi Tiết Từng Giai Đoạn

### 2.1. Giai Đoạn 1: Chuẩn Bị (Admin)

1. **Tạo Học kỳ**: Admin tạo học kỳ mới, thiết lập thời gian, max students/lecturer.
2. **Quản lý Rubric**: Admin tạo hoặc sửa rubric đánh giá → lưu ngay → hệ thống áp dụng và giữ trạng thái Approved.
3. **Import Danh sách**: Import Excel Sinh viên, Giảng viên, Doanh nghiệp.
4. **Phân công Hướng dẫn**: Bulk assign / Auto-assign SV cho GVHD. Import phân bổ DN.
5. **Quản lý Yêu cầu Tài khoản**: SV/GV mới gửi yêu cầu → Admin duyệt/cấp phát tự động.

### 2.2. Giai Đoạn 2: Khởi Động (Student + Lecturer)

1. **Đăng nhập lần đầu**: Đổi mật khẩu bắt buộc (`MustChangePassword = true`).
2. **Xem thông tin thực tập**: Sinh viên xem GVHD, DN, timeline.
3. **GVHD gửi thông báo**: Bulk notify tới tất cả SV được phân công.

### 2.3. Giai Đoạn 3: Giám Sát (Student + Lecturer)

1. **Nộp Báo cáo Tuần**: Sinh viên nộp báo cáo tuần 1-16 (title, content).
2. **Duyệt Báo cáo Tuần**: GVHD duyệt (`Approved`) hoặc yêu cầu sửa (`RevisionRequested`) + comment.
3. **Phản hồi 2 chiều**: Sinh viên phản hồi feedback qua `POST /api/Submission/{id}/student-reply`.

### 2.4. Giai Đoạn 4: Đánh Giá (Lecturer)

1. **Nộp Bài nộp**: Sinh viên nộp sản phẩm/đồ án cuối kỳ (upload file).
2. **GVHD Review Submission**: Duyệt, yêu cầu sửa, thêm feedback.
3. **Chấm điểm Rubric**: Chấm điểm theo tiêu chí rubric đã phê duyệt → Lưu điểm chi tiết.
4. **Lưu ghi chú SV**: GVHD ghi chú nhận xét tổng quát qua `PUT /api/Lecturer/internships/{id}/notes`.
5. **Khóa điểm**: Finalize evaluation → Không thể chỉnh sửa.

### 2.5. Giai Đoạn 5: Tổng Kết (Lecturer + Student)

1. **Xuất Excel**: Bảng tổng hợp điểm cuối kỳ (.xlsx).
2. **Xuất PDF**: Báo cáo tổng hợp + Phiếu đánh giá cá nhân chuẩn Bộ GD&ĐT.
3. **Tải PDF Chứng nhận**: Sinh viên tải phiếu thực tập PDF qua `GET /api/StudentPortal/internship-certificate`.
4. **Đóng học kỳ**: Admin đóng học kỳ → Dữ liệu chuyển sang chế độ lưu trữ (chỉ xem).

---

## 3. So Sánh Quy Trình As-Is vs To-Be

| Bước | As-Is (Thủ công) | To-Be (InternLink) |
|:---|:---|:---|
| Phân công GV | Email/Excel thủ công | Auto-assign + Bulk assign |
| Nộp báo cáo tuần | Email附件 | Web form + File upload |
| Duyệt báo cáo | Reply email | Web approval + SignalR notify |
| Chấm điểm | Phiếu giấy | Dynamic Rubric + Auto-calculate |
| Tổng hợp điểm | Excel thủ công 1-2 tuần | Auto + Export 1 click |
| Thông báo | Zalo/Telegram | SignalR real-time + In-app |
| Yêu cầu tài khoản | Gặp trực tiếp | Account Requests queue |
| Lưu trữ | Google Drive cá nhân | Docker Volume + SQL Server |
