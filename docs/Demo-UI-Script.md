# InternLink — Kịch Bản Demo & Thuyết Trình Báo Cáo (Demo UI Script)

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 5.1 (khớp luồng Production/Docker — 27/09/2026)  
**Thời lượng báo cáo:** 15 – 20 phút  

| Chế độ chạy | Frontend | Backend API | Swagger |
|:---|:---|:---|:---|
| **Docker Production (khuyên dùng)** | `http://localhost:3000` | qua Nginx: `http://localhost:3000/api/...` | phải bỏ comment `ports` của service `backend` trong `docker-compose.yml` (xem README mục III) |
| **Local development** | `http://localhost:3000` (Vite) | `http://localhost:7109` | `http://localhost:7109/swagger` |

> 📖 Chuẩn bị chạy hệ thống + quy trình tạo dữ liệu 4 phân quyền: xem [README — Quy trình demo 4 phân quyền](../README.md).

---

## 🔑 Tài Khoản Demo

### Cách A — Docker Production (khuyên dùng, khớp README)

Production **chỉ seed đúng 1 tài khoản** khi database mới:

| Portal | Username | Password | Vai trò |
|:---|:---|:---|:---|
| **SuperAdmin** | `admin` | `Password123!` | Quản trị toàn hệ thống (khoa, người dùng, cài đặt) |

**3 vai trò còn lại do bạn tạo trước buổi demo** (theo README mục VI): SuperAdmin tạo **Khoa** + tài khoản **Quản trị khoa**, rồi admin khoa **Import Excel** GV/SV (bộ template trên Google Drive).

| Portal | Username (ví dụ) | Password | Vai trò |
|:---|:---|:---|:---|
| **DepartmentAdmin** | `admin-cntt` | mật khẩu tạm → đổi ở lần đầu | Quản lý kỳ, import, phân công theo khoa |
| **Lecturer** | `gvcntt01` | mật khẩu tạm → đổi ở lần đầu | Duyệt báo cáo, điểm danh, chấm điểm, xuất Excel/Word |
| **Student** | `cnttsv0001` | mật khẩu tạm → đổi ở lần đầu | Nộp báo cáo tuần, nộp đồ án, xem điểm, xuất chứng nhận PDF |

- **Mật khẩu tạm** 8 ký tự gửi qua email người dùng; chạy với `.env` → `EMAIL_ENABLED=false` thì xem trong log: `docker compose logs backend --tail 300` (dòng `Mật khẩu tạm thời:`).
- Tài khoản tạo qua UI/import có `MustChangePassword = true` → **lần đăng nhập đầu bắt đổi mật khẩu** (đổi nhanh 1 lần rồi tiếp tục demo).
- Dữ liệu demo (kỳ thực tập, SV, GV, doanh nghiệp, phân công, báo cáo) do bạn **import/thiết lập trước** — Production không tự sinh dữ liệu nghiệp vụ.

### Cách B — Local Development seed (chỉ môi trường Development, DB mới)

`DemoDataSeeder` tự tạo đủ tài khoản với mật khẩu **`Password123!`**:

| Portal | Username | Password | Vai trò |
|:---|:---|:---|:---|
| **SuperAdmin** | `admin` | `Password123!` | Quản trị toàn hệ thống (khoa, settings, admin khoa) |
| **DepartmentAdmin** | `admin-cntt` | `Password123!` | Quản lý kỳ, import, phân công theo khoa |
| **Lecturer** | `gvcntt01` | `Password123!` | Duyệt báo cáo, điểm danh, chấm điểm, xuất Excel/Word |
| **Student** | `cnttsv0001` | `Password123!` | Nộp báo cáo tuần, nộp đồ án, xem điểm, xuất chứng nhận PDF |

> Username theo mẫu: SV `{dept}sv000x`, GV `gv{dept}0x`, admin khoa `admin-{dept}` (đều lowercase). Khoa QTKD: `admin-qtkd`, `gvqtkd01`, `qtkdsv0001`…

**Lưu ý kỹ thuật (Cách B):** tài khoản seed có `MustChangePassword = false` — login vào dùng luôn, không bị ép đổi mật khẩu giữa buổi demo. DB demo có sẵn: 2 báo cáo tuần/SV (tuần 1 đã duyệt có nhận xét GV, tuần 2 chờ duyệt để duyệt live) + 1 sinh viên đã chấm xong (điểm thi 9.0, điểm TB 8.6, status Graded) để demo màn kết quả.

---

## 🎯 Chuẩn bị Trước Demo

### Cách A — Docker Production (chạy 1 lần)

```bash
# 0. Tạo file .env ở thư mục gốc dự án — để đọc mật khẩu tạm từ log (không cần Gmail)
#    nội dung: EMAIL_ENABLED=false

# 1. Build + khởi động toàn bộ hệ thống (lần đầu vài phút)
docker compose up -d --build
docker compose ps            # đợi 3 container healthy

# 2. Đăng nhập admin/Password123! → tạo Khoa → tạo tài khoản Quản trị khoa
# 3. Đăng nhập admin-cntt → Tạo kỳ thực tập → Import SV/GV/DN (template Google Drive) → Phân công
# 4. Lấy mật khẩu tạm GV/SV từ log rồi đăng nhập, đổi mật khẩu 1 lần:
docker compose logs backend --tail 300
```

**Reset về đầu sau buổi demo (xóa sạch dữ liệu):**

```bash
docker compose down --volumes && docker compose up -d --build
```

### Cách B — Local Development (seed tự động, chạy 1 lần)

```bash
# 1. Reset dữ liệu về chỉ còn SuperAdmin
sqlcmd -S 127.0.0.1 -U sa -P sa -d InternLink -i scripts/reset-demo.sql

# 2. Restart backend → seed tự chạy (khoa, admin khoa, kỳ, demo data)
cd backend/InternLink/InternLink.API && dotnet run

# 3. Frontend
cd frontend && npm run dev   # port 3000
```

> **Cấu hình báo cáo:**
> - **Cách B:** kỳ demo có sẵn T1–T5 mở nộp, T6 tắt (dành cho thi), T7 báo cáo cuối kỳ. Nếu muốn SV nộp BC tuần live không báo trễ, đẩy deadline T1–T5 sang ngày tương lai (tab **Cấu hình báo cáo** — xem Hồi 3).
> - **Cách A:** chưa có lịch tuần → mở tab **Cấu hình báo cáo** ở Hồi 3, hệ thống tự sinh lịch mặc định, rồi chỉnh deadline.

---

## 🎬 Kịch Bản Demo 4 Hồi

### MỞ ĐẦU (1 phút): Giới thiệu

> *"InternLink là nền tảng số hóa 100% quy trình thực tập tốt nghiệp: Backend ASP.NET Core (.NET 10) Clean Architecture — 33 API controllers, 265 unit tests pass; Frontend React 19 + Tailwind 4; CSDL SQL Server; phân quyền JWT RBAC 4 vai trò; thông báo real-time SignalR."*

---

### HỒI 1: Admin Portal — 4 phút

**Login:** `admin-cntt` / mật khẩu đã đổi lần đầu *(Cách B: `Password123!`)*  
— hoặc `admin` / `Password123!` để thấy góc nhìn SuperAdmin: thêm menu **Khoa** + **Cài đặt**.

1. **Dashboard** (`/admin/dashboard`): Thống kê KPI, biểu đồ theo kỳ
2. **Kỳ thực tập** (`/admin/semesters`): Tạo kỳ mới — đặt tên kỳ, **số tuần thực tập + tuần bắt đầu** *(Cách B: seed sẵn 2 kỳ/khoa)*
3. **Import SV/GV** (`/admin/students`, `/admin/lecturers`): nút **Import Excel** + **Tải file mẫu** — import hàng loạt, hệ thống tự tạo tài khoản + mật khẩu tạm
4. **Phân công** (`/admin/assignments`): **Import Phân Bổ DN** (SV → doanh nghiệp) + **Import Excel GVHD** (SV → giảng viên)
5. **Notifications** (`/admin/notifications`): Broadcast thông báo toàn khoa (GV/SV nhận real-time qua SignalR)
6. *(tuỳ chọn)* **Báo cáo tổng kết** (`/admin/summary`): xuất Excel C23 + Word C22A cuối kỳ
7. **Logout**

> 🔑 **Góc SuperAdmin** (login `admin`): menu **Khoa** (tạo khoa), **Người dùng** (tạo tài khoản admin khoa/GV/SV, cấp lại mật khẩu), **Cài đặt**; duyệt yêu cầu tự đăng ký tại `/admin/account-requests` (truy cập trực tiếp bằng URL, chỉ SuperAdmin). **SuperAdmin không** tham gia import/phân công/chấm điểm.

---

### HỒI 2: Student Portal — 4 phút

**Login:** `cnttsv0001` / mật khẩu tạm đã đổi *(Cách B: `Password123!`)*

1. **Dashboard** (`/student/dashboard`): Tiến độ tổng (VD: 40% = 1/5 tuần × 80% × ...), task, feedback mới
2. **Kỳ thực tập** (`/student/internship`): Timeline tuần, thông tin DN + GV hướng dẫn
3. **Báo cáo tuần** (`/student/weekly-reports`): Nộp/tiếp tục báo cáo tuần, thấy deadline từng tuần theo cấu hình *(Cách B: seed có sẵn BC tuần 2 chờ duyệt để duyệt live ở Hồi 3; Cách A: nộp 1 BC rồi sang Hồi 3 duyệt)*
4. **Bài nộp** (`/student/submissions`): Nộp **Báo cáo cuối kỳ** (tùy loại bài: BC tuần / BC cuối kỳ / Sản phẩm)
5. **Phản hồi** (`/student/feedback`): Xem nhận xét GV, reply trực tiếp
6. **Xuất chứng nhận PDF** (`/student/internship` → "Xuất phiếu"): Tải PDF xác nhận thực tập
7. **Đánh giá** (`/student/evaluation`): Xem điểm (rubric 4 tiêu chí + điểm thi + xếp loại) — *Cách B: seed sẵn 1 SV đã chấm 8.6; Cách A: xem sau khi GV chấm ở Hồi 3*
8. **Logout**

---

### HỒI 3: Lecturer Portal — 5 phút

**Login:** `gvcntt01` / mật khẩu tạm đã đổi *(Cách B: `Password123!`)*

1. **Dashboard** (`/lecturer/dashboard`): KPI (SV đang thực tập, hoàn thành, BC chờ duyệt), weekly trend
2. **Students** (`/lecturer/students`): Danh sách SV kèm **tiến độ từng người** (theo tuần mở) — chọn 1 SV xem workspace: báo cáo tuần, bài nộp, ghi chú
3. **Cấu hình báo cáo** (`/lecturer/evaluations` tab Cấu hình báo cáo): Bật/tắt từng tuần, đặt deadline — nhấn mạnh: *tiến độ SV tính theo các tuần ĐANG BẬT ở đây, không cứng theo số tuần kỳ*
4. **Reports** (`/lecturer/reports`): **Duyệt báo cáo tuần** của SV → Approved + nhận xét → quay lại dashboard thấy số pending giảm
5. **Điểm danh** (`/lecturer/attendance`): Điểm danh buổi hẹn tuần — nhấn mạnh: *vắng ≥ 2 buổi = mất điều kiện dự thi (hệ thống chặn nhập điểm thi)*
6. **Chấm điểm** (`/lecturer/evaluations` tab Chấm điểm): Rubric chất lượng **theo từng tuần** (5 mức), thưởng sản phẩm sáng tạo, nhập **điểm thi vấn đáp** → lưu → SV tự động **chốt Graded**, tiến độ SV nhảy 100%
   - *Điểm nhấn bảo mật:* hệ thống **từ chối nhập điểm thi** nếu SV thiếu BC cuối kỳ hoặc vắng ≥ 2 buổi
7. **Tổng hợp** (`/lecturer/evaluations` tab Tổng hợp & Xuất file): Xuất **Excel C23** (3 sheet) + **Word C22A** (báo cáo tổng kết khoa, có danh sách SV chưa hoàn thành + lý do)
8. **Logout**

---

### HỒI 4: Kết quả & Real-time — 1 phút

**Login:** `cnttsv0001` / mật khẩu đã đổi *(Cách B: `Password123!`)*

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

## ⚠️ Lỗi Hay Gặp Khi Demo

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Login GV/SV bị "Invalid credentials" | **Cách A (Production):** DB chỉ có tài khoản `admin` → tạo GV/SV theo [README — Quy trình demo 4 phân quyền](../README.md), hoặc sai mật khẩu tạm → xem `docker compose logs backend --tail 300`. **Cách B:** DB chưa seed → restart API. |
| Bị bắt đổi mật khẩu khi login | **Bình thường** với tài khoản tạo qua UI/import (`MustChangePassword=true`) — đổi nhanh rồi tiếp tục. Chỉ tài khoản dev-seed (Cách B) mới không bị ép. |
| Không nhận được email mời / không có mật khẩu tạm | Chưa cấu hình SMTP → đặt `EMAIL_ENABLED=false` trong `.env` rồi `docker compose up -d backend`, xem mật khẩu tạm trong log. Hoặc cấu hình Gmail thật: [`Email-Setup-Gmail.md`](Email-Setup-Gmail.md). |
| Không thấy dữ liệu demo (kỳ, SV, GV) | **Cách A:** Production không tự sinh dữ liệu → import/thiết lập trước theo README. Seed đầy đủ chỉ chạy ở môi trường Development với DB mới. |
| SV nộp BC tuần bị báo "quá hạn" | Mở tab **Cấu hình báo cáo**, đẩy deadline của tuần đó sang tương lai |
| Không nhập được điểm thi | SV chưa đủ điều kiện (thiếu BC cuối kỳ hoặc vắng ≥ 2 buổi) — **đây là tính năng, không phải bug** |
| Word/Excel export 404 template | File mẫu nằm trong `backend/.../Templates` — kiểm tra đã copy khi deploy |
| Trang trắng sau login / không gọi được API | **Docker:** kiểm tra `docker compose ps` + `docker compose logs backend frontend` (API đi qua Nginx cổng 3000). **Local dev:** backend chưa chạy (7109) hoặc CORS. |
| Muốn demo lại từ đầu | Docker: `docker compose down --volumes && docker compose up -d --build`. Local: `scripts/reset-demo.sql` + restart API. |
