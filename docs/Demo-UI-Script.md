# InternLink — Kịch Bản Demo & Thuyết Trình Báo Cáo (Demo UI Script)

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 5.0 (cập nhật theo thực tế hệ thống)  
**Thời lượng báo cáo:** 15 – 20 phút  
**Frontend:** `http://localhost:3000` (React 19 + Vite + Tailwind 4)  
**Backend API:** `http://localhost:7109` (ASP.NET Core, .NET 10)  
**Swagger:** `http://localhost:7109/swagger`

---

## 🔑 Tài Khoản Demo

Trên **database mới** (reset + restart API), `DemoDataSeeder` tự tạo dữ liệu demo cho mỗi khoa:

| Portal | Username | Password | Vai trò |
|:---|:---|:---|:---|
| **SuperAdmin** | `admin` | `Password123!` | Quản trị toàn hệ thống (khoa, settings, admin khoa) |
| **DepartmentAdmin** | `admin-cntt` | `Password123!` | Quản lý kỳ, import, phân công theo khoa |
| **Lecturer** | `gvcntt01` | `Password123!` | Duyệt báo cáo, điểm danh, chấm điểm, xuất Excel/Word |
| **Student** | `cnttsv0001` | `Password123!` | Nộp báo cáo tuần, nộp đồ án, xem điểm, xuất chứng nhận PDF |

> Username theo mẫu: SV `{dept}sv000x`, GV `gv{dept}0x`, admin khoa `admin-{dept}` (đều lowercase). Khoa QTKD: `admin-qtkd`, `gvqtkd01`, `qtkdsv0001`…

**Lưu ý kỹ thuật:** tài khoản demo có `MustChangePassword = false` — login vào dùng luôn, không bị ép đổi mật khẩu giữa buổi demo. DB demo có sẵn: 2 báo cáo tuần/SV (tuần 1 đã duyệt có nhận xét GV, tuần 2 chờ duyệt để duyệt live) + 1 sinh viên đã chấm xong (điểm thi 9.0, điểm TB 8.6, status Graded) để demo màn kết quả.

**Chuẩn bị trước demo (chạy 1 lần):**
```bash
# 1. Reset dữ liệu về chỉ còn SuperAdmin
sqlcmd -S 127.0.0.1 -U sa -P sa -d InternLink -i scripts/reset-demo.sql

# 2. Restart backend → seed tự chạy (khoa, admin khoa, kỳ, demo data)
cd backend/InternLink/InternLink.API && dotnet run

# 3. Frontend
cd frontend && npm run dev   # port 3000
```

> Kỳ demo có sẵn "Cấu hình báo cáo": T1–T5 mở nộp, T6 tắt (dành cho thi), T7 báo cáo cuối kỳ. Nếu muốn SV nộp BC tuần live không báo trễ, cập nhật deadline T1–T5 sang ngày tương lai trong tab Cấu hình báo cáo.

---

## 🎬 Kịch Bản Demo 4 Hồi

### MỞ ĐẦU (1 phút): Giới thiệu

> *"InternLink là nền tảng số hóa 100% quy trình thực tập tốt nghiệp: Backend ASP.NET Core (.NET 10) Clean Architecture — 33 API controllers, 265 unit tests pass; Frontend React 19 + Tailwind 4; CSDL SQL Server; phân quyền JWT RBAC 4 vai trò; thông báo real-time SignalR."*

---

### HỒI 1: Admin Portal — 4 phút

**Login:** `admin-cntt` / `Password123!` (hoặc `admin` để thấy góc nhìn SuperAdmin: thêm menu **Khoa** + **Cấu hình hệ thống**)

1. **Dashboard** (`/admin/dashboard`): Thống kê KPI, biểu đồ theo kỳ
2. **Học kỳ** (`/admin/semesters`): Tạo học kỳ, cấu hình **số tuần thực tập + tuần bắt đầu**
3. **Cấu hình báo cáo**: Bật/tắt từng tuần, đặt deadline — nhấn mạnh: *tiến độ SV tính theo các tuần ĐANG BẬT ở đây, không cứng theo số tuần kỳ*
4. **Import SV/GV** (`/admin/students`, `/admin/lecturers`): Import Excel hàng loạt
5. **Account Requests** (`/admin/account-requests`): Duyệt yêu cầu tự đăng ký
6. **Phân công** (`/admin/assignments`): Gán doanh nghiệp + giảng viên hướng dẫn
7. **Notifications** (`/admin/notifications`): Broadcast thông báo toàn khoa
8. **Logout**

---

### HỒI 2: Student Portal — 4 phút

**Login:** `cnttsv0001` / `Password123!`

1. **Dashboard** (`/student/dashboard`): Tiến độ tổng (VD: 40% = 1/5 tuần × 80% × ...), task, feedback mới
2. **Kỳ thực tập** (`/student/internship`): Timeline tuần, thông tin DN + GV hướng dẫn
3. **Báo cáo tuần** (`/student/weekly-reports`): Nộp/tiếp tục **Báo cáo tuần 2** (đang ở trạng thái chờ duyệt), thấy deadline từng tuần theo cấu hình
4. **Bài nộp** (`/student/submissions`): Nộp **Báo cáo cuối kỳ** (tùy loại bài: BC tuần / BC cuối kỳ / Sản phẩm)
5. **Phản hồi** (`/student/feedback`): Xem nhận xét GV, reply trực tiếp
6. **Xuất chứng nhận PDF** (`/student/internship` → "Xuất phiếu"): Tải PDF xác nhận thực tập
7. **Đánh giá** (`/student/evaluation`): Xem điểm của SV đã chấm xong trong lớp (rubric 4 tiêu chí + điểm thi + xếp loại)
8. **Logout**

---

### HỒI 3: Lecturer Portal — 5 phút

**Login:** `gvcntt01` / `Password123!`

1. **Dashboard** (`/lecturer/dashboard`): KPI (SV đang thực tập, hoàn thành, BC chờ duyệt), weekly trend
2. **Students** (`/lecturer/students`): Danh sách SV kèm **tiến độ từng người** (theo tuần mở) — chọn 1 SV xem workspace: báo cáo tuần, bài nộp, ghi chú
3. **Reports** (`/lecturer/evaluations` tab báo cáo): **Duyệt Báo cáo tuần 2** của SV → Approved + nhận xét → quay lại dashboard thấy số pending giảm
4. **Điểm danh** (`/lecturer/attendance`): Điểm danh buổi hẹn tuần — nhấn mạnh: *vắng ≥ 2 buổi = mất điều kiện dự thi (hệ thống chặn nhập điểm thi)*
5. **Chấm điểm** (`/lecturer/evaluations` tab Chấm điểm): Rubric chất lượng **theo từng tuần** (5 mức), thưởng sản phẩm sáng tạo, nhập **điểm thi vấn đáp** → lưu → SV tự động **chốt Graded**, tiến độ SV nhảy 100%
   - *Điểm nhấn bảo mật:* hệ thống **từ chối nhập điểm thi** nếu SV thiếu BC cuối kỳ hoặc vắng ≥ 2 buổi
6. **Tổng kết** (`/lecturer/summary`): Xuất **Excel C23** (3 sheet) + **Word C22A** (báo cáo tổng kết khoa, có danh sách SV chưa hoàn thành + lý do)
7. **Logout**

---

### HỒI 4: Kết quả & Real-time — 1 phút

**Login:** `cnttsv0001` / `Password123!`

1. **Dashboard**: Tiến độ **100%** — "Hoàn thành toàn bộ thực tập" (GV vừa chấm xong ở Hồi 3)
2. **Thông báo** (`/student/notifications`): Thông báo real-time qua SignalR (điểm đã có, báo cáo được duyệt)

---

### KẾT LUẬN (2 phút)

Nhấn mạnh:
- 100% dữ liệu lưu SQL Server thật — mọi thao tác trên UI đều ghi DB
- Bảo mật: audit IDOR 4 vai trò — SV chỉ thấy dữ liệu của mình, GV chỉ thấy SV được phân công, export auto-scope từ token
- Build sạch: 0 TypeScript errors, 0 C# errors, **268/268 tests pass**
- Xuất Excel/Word khớp mẫu C22A/C23 của trường
- Local storage/file — không phụ thuộc cloud trả phí

---

## ⚠️ Lỗi hay gặp khi demo

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Login GV/SV bị "Invalid credentials" | DB chưa chạy seed → restart API; hoặc DB cũ có tài khoản đã đổi mật khẩu → chạy `reset-demo.sql` + restart |
| Bị bắt đổi mật khẩu khi login | Chỉ xảy ra trên DB cũ — demo accounts mới có `MustChangePassword=false` |
| SV nộp BC tuần bị báo "quá hạn" | Deadline tuần đó đã qua → mở Cấu hình báo cáo, đẩy deadline sang tương lai |
| Không nhập được điểm thi | SV chưa đủ điều kiện (thiếu BC cuối kỳ hoặc vắng ≥ 2 buổi) — **đây là tính năng, không phải bug** |
| Word/Excel export 404 template | File mẫu nằm trong `backend/.../Templates` — kiểm tra đã copy khi deploy |
| Trang trắng sau login | Backend chưa chạy (port 7109) hoặc CORS — kiểm tra terminal backend |
