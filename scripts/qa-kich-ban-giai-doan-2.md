# InternLink — Kịch bản kiểm thử Giai đoạn 2
**Tester:** Hồng Anh · **Kỳ:** C24A.TH (2026–2027) · **SV neo:** 2421160052  
**Tiền điều kiện:** Fix pack GĐ1 đã PASS (Auth 401, Evaluation/mine, KPI chờ duyệt, chặn nộp thiếu DN).

## Phạm vi GĐ2 (ưu tiên demo khoa → thương mại)

| Gói | Mục tiêu | Ưu tiên |
|-----|----------|---------|
| G2-A | Gán DN → SV nộp BC tuần → GV duyệt | P0 |
| G2-B | Điểm danh buổi gặp + vắng | P0 |
| G2-C | Nộp BC cuối / Product → GV duyệt | P1 |
| G2-D | Chấm điểm (QT + vấn đáp) + SV xem kết quả | P1 |
| G2-E | Thông báo / export / chứng nhận / RBAC phụ | P2 |

---

## G2-A — Phân công DN + vòng BC tuần

| ID | Role | Bước | Kỳ vọng |
|----|------|------|---------|
| G2A-01 | Admin/GV | Gán DN cho internship SV `2421160052` | `companyId` có giá trị; status có thể chuyển InProgress |
| G2A-02 | SV | Portal thấy tên DN + GVHD | Đúng DN vừa gán |
| G2A-03 | SV | Submit draft BC tuần đang mở | **Được nộp** (không còn chặn thiếu DN) |
| G2A-04 | GV | Thấy BC status Submitted / chờ duyệt | KPI pending weekly tăng hoặc list có BC |
| G2A-05 | GV | Duyệt Approve + nhận xét | Status Approved; SV thấy feedback |
| G2A-06 | SV | Nộp tuần đã đóng lịch | Bị chặn theo schedule |

## G2-B — Điểm danh

| ID | Role | Bước | Kỳ vọng |
|----|------|------|---------|
| G2B-01 | GV | Tạo buổi gặp (session) tuần hiện tại | Session tạo thành công |
| G2B-02 | GV | Điểm danh Present cho SV neo | Record present |
| G2B-03 | GV | Tạo buổi 2 + mark Absent | `absentCount` tăng |
| G2B-04 | SV | `Attendance/student/me` | Thấy đủ buổi / trạng thái |
| G2B-05 | Admin | Attendance admin report | Có dữ liệu kỳ |

## G2-C — Nộp cuối kỳ

| ID | Role | Bước | Kỳ vọng |
|----|------|------|---------|
| G2C-01 | SV | Nộp FinalReport (upload/metadata) | Submitted |
| G2C-02 | GV | Review / Approve FinalReport | Approved |
| G2C-03 | SV | (tuỳ) Product / Evidence | Lưu được, status đúng |

## G2-D — Chấm điểm

| ID | Role | Bước | Kỳ vọng |
|----|------|------|---------|
| G2D-01 | GV | Grading summary thấy SV | Row MSSV đúng |
| G2D-02 | GV | Lưu rubric tuần + oral (nếu đủ ĐK) | Lưu OK / hoặc chặn đúng lý do thiếu ĐK |
| G2D-03 | SV | Xem evaluation | Điểm / xếp loại khớp GV |

## G2-E — Phụ

| ID | Case | Kỳ vọng |
|----|------|---------|
| G2E-01 | PDF chứng nhận khi đã có DN | 200, nội dung có DN |
| G2E-02 | PDF chứng nhận khi chưa DN | Chặn hoặc cảnh báo (hiện WARN nếu vẫn 200) |
| G2E-03 | SV không xem internship GV khác | 403/404 |
| G2E-04 | Export grades Excel GV | File > 0 byte |

## Thứ tự chạy

```
G2-A (DN + BC tuần) → G2-B (điểm danh) → G2-C (nộp cuối) → G2-D (chấm) → G2-E
```

## Ghi chú dữ liệu

- Không đụng 26 SV còn lại trừ đọc.
- SV neo có thể còn Draft QA từ GĐ1 — tái sử dụng hoặc tạo tuần mở.
- Nếu gán DN thất bại → dừng G2-A/B/C/D, báo blocker.

---

## Kết quả thực thi (28/10/2026)

### GĐ1 — Fix pack (đã chốt trước)
| Gói | Kết quả |
|-----|---------|
| BUG-02/03/04/06 + P0 thiếu DN | **PASS** |

### GĐ2 — G2-A + G2-B (chạy tiếp sau interrupt)
| ID | Kết quả | Chi tiết |
|----|---------|----------|
| G2A-01 | PASS | DN: Công ty TNHH Giải Pháp Tiến Khanh |
| G2A-02 | PASS | Status `InProgress` |
| G2A-03 | PASS | Submit tuần 5 sau khi có DN |
| G2A-04 | PASS | KPI pending weekly phản ánh |
| G2A-05 / 05b | PASS | GV duyệt Approved · SV thấy Approved |
| G2A-06 | PASS | Tuần 1 đóng → chặn tạo/nộp |
| G2B-01..05 | PASS | Có session T1/T3/T4 · Present + Absent · SV/Admin xem OK |
| **G2-A/B tổng** | **15 PASS · 0 FAIL** | progress SV ≈ 32%, BC Approved=2 |

### G2-C + G2-D (28/10/2026 — tiếp)
| ID | Kết quả | Chi tiết |
|----|---------|----------|
| G2C-01 | PASS | FinalReport **upload file** → Submitted → Approved |
| G2C-03 | PASS | Product Approved |
| G2D-01 | PASS | Có trong grading summary · eligible=True sau khi có BC cuối |
| G2D-02 | PASS | QT **7.5** · Oral **8.0** · TB **7.8** · xếp loại Khá |
| G2D-03 | PASS | SV xem evaluation · finalized=True · portal **Graded** progress≈52% |

### Rule bắt được (đúng thiết kế, không phải bug)
1. FinalReport **bắt buộc file đính kèm** — JSON `fileUrl` alone → 400.
2. Chưa FinalReport → **không nhập điểm thi** (eligible=False).
3. DN full capacity → không gán thêm.
4. Điểm danh: ngày ∈ tuần học kỳ; 1 tuần / 1 buổi gặp SV.

### G2-E (28/10/2026)
| ID | Kết quả | Chi tiết |
|----|---------|----------|
| G2E-01/02/05/06 | PASS | Notification mine / unread / mark-read |
| G2E-03/04 | PASS | Admin broadcast (`title`+`content`+`audience`) · unread SV tăng |
| G2E-07..11 | PASS | 5 import templates tải được |
| G2E-12..16 | PASS | 4 GV · IDOR 404 · GV2 (`lhphuoc@...`) không thấy `2421160052` |
| G2E-17..20 | PASS | Certificate Graded · Excel export · SV không broadcast |

**GĐ2 tổng:** A/B/C/D/E cơ bản **PASS**. Còn SignalR realtime UI (websocket) chưa soi bằng browser.
