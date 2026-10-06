# InternLink — Hệ Thống Quản Lý Thực Tập Tốt Nghiệp

> **InternLink** là nền tảng số hóa 100% quy trình thực tập tốt nghiệp: kết nối **Quản trị hệ thống (SuperAdmin)** → **Quản trị khoa (DepartmentAdmin)** → **Giảng viên hướng dẫn (Lecturer)** → **Sinh viên thực tập (Student)** trên cùng một hệ thống.
>
> **Stack:** ASP.NET Core 10 (Clean Architecture) · React 19 + TypeScript + Vite · SQL Server 2022 · JWT RBAC · SignalR (thông báo real-time) · Docker.

📚 **Đây là tài liệu hướng dẫn sử dụng** — chạy hệ thống bằng Docker, đăng nhập, demo 4 phân quyền và vận hành hằng ngày.
> Triển khai trên **AWS Windows Server 2019 không dùng Docker**: xem [hướng dẫn IIS + SQL Server](docs/current/14-Windows-Server-2019-AWS.md).

---

## 📑 Mục lục

1. [Yêu cầu hệ thống & Cài đặt Docker](#cai-dat-docker)
2. [Clone mã nguồn & chạy bằng vài lệnh terminal](#chay-du-an)
3. [Truy cập hệ thống](#truy-cap-he-thong)
4. [Tải bộ file Excel mẫu để demo](#excel-mau)
5. [Đăng nhập Super Admin](#super-admin)
6. [Quy trình demo 4 phân quyền](#demo-4-phan-quyen)
7. [Các lệnh vận hành thường dùng](#van-hanh)
8. [Cấu trúc thư mục](#cau-truc)
9. [Chạy cục bộ (Local Development)](#local-dev)
10. [Gỡ lỗi hay gặp](#go-loi)
11. [Tài liệu chi tiết](#tai-lieu)

---

<a id="cai-dat-docker"></a>

## 🖥️ I. Yêu cầu hệ thống & Cài đặt Docker

### Yêu cầu tối thiểu

| Hạng mục | Tối thiểu | Khuyến nghị |
| :--- | :--- | :--- |
| RAM | 4 GB trống | **8 GB** (SQL Server bị giới hạn 2 GB RAM trong `docker-compose.yml`) |
| Disk | ~5 GB (image + dữ liệu) | 10 GB |
| Hệ điều hành | Windows 10/11 64-bit, macOS, hoặc Linux | — |
| Phần mềm | **Git** + **Docker** | — |

### 1. Cài Git (nếu chưa có)

- Windows: tải https://git-scm.com/download/win
- macOS: `xcode-select --install`
- Linux (Debian/Ubuntu): `sudo apt update && sudo apt install -y git`

### 2. Cài Docker

| Hệ điều hành | Hướng dẫn |
| :--- | :--- |
| **Windows 10/11** | Tải **Docker Desktop**: <https://www.docker.com/products/docker-desktop/> — khi cài chọn backend **WSL 2** (mặc định). Khởi động Docker Desktop lần đầu rồi để nó chạy nền. |
| **macOS** | Tải **Docker Desktop**: <https://www.docker.com/products/docker-desktop/> (chọn bản Intel hoặc Apple Silicon). |
| **Linux** | Cài **Docker Engine + Docker Compose plugin**: <https://docs.docker.com/engine/install/> rồi thêm user vào nhóm docker: `sudo usermod -aG docker $USER` (đăng nhập lại sau). |

### 3. Kiểm tra đã cài xong

Mở terminal (PowerShell / CMD / Terminal đều được) và chạy:

```bash
docker --version
docker compose version
```

- ✅ Cả 2 lệnh in ra phiên bản → sẵn sàng.
- ❌ `docker: command not found` → Docker chưa được cài, hoặc Docker Desktop chưa được mở (mở Docker Desktop trước rồi thử lại).
- ❌ `error during connect ... docker Desktop is not running` → mở Docker Desktop và chờ icon khay hệ thống ổn định.

> 💡 **Mẹo Windows:** sau khi cài Docker Desktop, nên restart máy một lần để WSL 2 hoạt động ổn định.

---

<a id="chay-du-an"></a>

## 🚀 II. Clone mã nguồn & chạy bằng vài lệnh terminal

Mở terminal, di chuyển tới thư mục muốn chứa dự án, rồi chạy **3 lệnh**:

```bash
# 1. Tải mã nguồn từ GitHub
git clone https://github.com/th2806-dev/internlink.git

# 2. Vào thư mục dự án
cd internlink

# 3. Build + khởi động toàn bộ hệ thống (Frontend Nginx + Backend API + SQL Server)
docker compose up -d --build
```

### (Khuyến nghị cho demo) Tạo file `.env` trước khi chạy

Mặc định hệ thống cố gửi **email mời kèm mật khẩu tạm** qua Gmail SMTP — nếu chưa có mật khẩu ứng dụng Gmail thì email sẽ gửi thất bại và bạn không biết mật khẩu tạm của tài khoản GV/SV.

Để **demo không cần Gmail**, tạo file `.env` ở **thư mục gốc dự án** (cùng cấp với `docker-compose.yml`) với nội dung:

```env
# .env — dùng cho demo, email được ghi vào log thay vì gửi thật
EMAIL_ENABLED=false
```

Khi đó mọi email mời (kèm **tên đăng nhập + mật khẩu tạm**) sẽ được ghi vào **log backend**, xem bằng:

```bash
docker compose logs backend --tail 300
```

> Muốn gửi email thật (thư mời, quên mật khẩu): đặt `EMAIL_ENABLED=true` cùng `EMAIL_USERNAME` / `EMAIL_PASSWORD` (App Password) trong `.env` — xem [docs/Email-Setup-Gmail.md](docs/Email-Setup-Gmail.md).

### Kiểm tra hệ thống đã lên

```bash
docker compose ps
```

Lần đầu tiên cần **build vài phút** và backend cần ~1 phút để chạy migration + seed, đợi cho tới khi cả 3 container ở trạng thái **healthy (running)**:

| Container | Tên | Vai trò |
| :--- | :--- | :--- |
| `internlink_frontend` | Nginx | Giao diện React + reverse proxy API (cổng 8000) |
| `internlink_api` | ASP.NET Core | REST API + SignalR + Swagger |
| `internlink_database` | SQL Server 2022 | Cơ sở dữ liệu (volume `internlink_database_data`) |

```bash
# Xem log theo thời gian thực (Ctrl+C để thoát, container vẫn chạy)
docker compose logs -f backend
```

### ✅ Truy cập

```
http://localhost:8000
```

---

<a id="truy-cap-he-thong"></a>

## 🌐 III. Truy cập hệ thống

| Dịch vụ | URL | Ghi chú |
| :--- | :--- | :--- |
| **Giao diện (Web)** | **<http://localhost:8000>** | Dùng cho cả 4 phân quyền |
| REST API (qua Nginx) | <http://localhost:8000/api/...> | Proxy sang backend bên trong Docker network |
| Health check | <http://localhost:8000/health> | Trả về JSON trạng thái (`.live` / `.ready` cũng có) |
| Swagger UI | <http://localhost:7109/swagger> | Chỉ truy cập được từ chính máy host |

> ⚠️ Website được publish trên **cổng 8000**. Backend (7109) và SQL Server (14330) chỉ được bind vào localhost của host, không mở các cổng này trong AWS Security Group.

---

<a id="excel-mau"></a>

## 📎 IV. Tải bộ file Excel mẫu để demo

Bộ template Excel dùng cho **demo nhập liệu** được lưu trên Google Drive:

🔗 **<https://drive.google.com/drive/folders/1Wi2jyhn1bGdR10eljSRcta0U7f_rgFaH?usp=sharing>** (thư mục `templates-demo-InternLink`)

| File Excel | Dùng ở đâu trong hệ thống | Kết quả |
| :--- | :--- | :--- |
| `Mau-danh-sach-SV.xlsx` | Quản trị khoa → **Sinh viên** → `Import Excel` | Tự tạo tài khoản đăng nhập cho từng SV |
| `Mau-danh-sach-GV.xlsx` | Quản trị khoa → **Giảng viên** → `Import Excel` | Tự tạo tài khoản đăng nhập cho từng GV |
| `Mau-danh-sach-doanh-nghiep.xlsx` | Quản trị khoa → **Doanh nghiệp** → `Import Excel` | Danh sách doanh nghiệp nhận thực tập |
| `Mau-danh-sach-SV-thuc-tap-taiDN.xlsx` | Quản trị khoa → **Phân công hướng dẫn** → `Import Phân Bổ DN` | Phân bổ SV vào doanh nghiệp |

**Lưu ý quan trọng khi điền mẫu:**

- Cột **Email** và **Username** (mặc định = MSSV/MSGV) là bắt buộc nếu muốn **tạo tài khoản đăng nhập**. Hệ thống sẽ sinh **mật khẩu tạm 8 ký tự** và gửi qua email (hoặc ghi vào log nếu `EMAIL_ENABLED=false`).
- Ngoài bộ file trên, còn mẫu **phân công GVHD** (`Mau-danh-sach-phan-cong-GVHD.xlsx`) tải ngay trong ứng dụng — mọi cửa sổ Import đều có sẵn nút **“Tải file mẫu”**.
- File Excel phải có **dòng tiêu đề** (hàng 1) đúng như mẫu — hệ thống tự nhận diện cột (không phân biệt hoa/thường, có/không dấu).

---

<a id="super-admin"></a>

## 🔑 V. Đăng nhập Super Admin

### Các bước đăng nhập

1. Mở trình duyệt → truy cập **<http://localhost:8000>**
2. Tại màn hình **Đăng nhập**, nhập:

   | Field | Giá trị |
   | :--- | :--- |
   | **Tên đăng nhập** | `admin` |
   | **Mật khẩu** | `Password123!` |

3. Bấm **Đăng nhập** → chuyển vào **Cổng Quản trị**, góc trái sidebar hiển thị nhãn **“QUẢN TRỊ HỆ THỐNG”**.

> ✅ Đây là tài khoản **duy nhất được seed sẵn** khi hệ thống chạy lần đầu trên database mới (môi trường Production của Docker). Không bị ép đổi mật khẩu khi đăng nhập lần đầu.

### Menu của SuperAdmin

| Menu | Chức năng |
| :--- | :--- |
| **Tổng quan** | Dashboard KPI toàn hệ thống |
| **Khoa** | Tạo/sửa/xoá khoa (ví dụ: Khoa Công nghệ Thông tin) |
| **Kỳ thực tập** | Xem các kỳ thực tập (chỉ xem — quản lý kỳ là quyền của Quản trị khoa) |
| **Người dùng** | Tạo tài khoản **Quản trị khoa / Giảng viên / Sinh viên**, cấp lại mật khẩu, vô hiệu hoá |
| **Cài đặt** | Cấu hình hệ thống |
| **Tài khoản** | Hồ sơ & đổi mật khẩu của chính mình |

### Bảng tài khoản mặc định

| Vai trò (Role) | Tên đăng nhập | Mật khẩu | Nguồn |
| :--- | :--- | :--- | :--- |
| **SuperAdmin** — Quản trị hệ thống | `admin` | `Password123!` | Seed sẵn |
| **DepartmentAdmin** — Quản trị khoa | bạn tự tạo, ví dụ `admin-cntt` | mật khẩu tạm (email/log) | Tạo qua menu **Người dùng** |
| **Lecturer** — Giảng viên | ví dụ `gvcntt01` | mật khẩu tạm (email/log) | Tạo qua menu **Người dùng** / Import Excel |
| **Student** — Sinh viên | ví dụ `cnttsv0001` | mật khẩu tạm (email/log) | Import Excel / tạo qua menu **Người dùng** |

**Quy tắc mật khẩu tạm:**
- Mọi tài khoản tạo mới (tay hoặc qua import Excel) đều nhận **mật khẩu tạm 8 ký tự**, gửi đến **email của chính người dùng** — nên điền **email của bạn** khi tạo tài khoản demo để tự nhận mail.
- Nếu `EMAIL_ENABLED=false` → mật khẩu tạm nằm trong log: `docker compose logs backend --tail 300` (tìm dòng `Mật khẩu tạm thời:`).
- **Lần đăng nhập đầu tiên bắt buộc đổi mật khẩu** → đăng nhập, đổi mật khẩu rồi mới vào portal chính.

---

<a id="demo-4-phan-quyen"></a>

## 🎬 VI. Quy trình demo 4 phân quyền

### Chuẩn bị (chạy 1 lần)

```bash
# 1. Đã có .env với EMAIL_ENABLED=false (xem mục II) — để đọc mật khẩu tạm từ log
# 2. Hệ thống đã chạy và healthy
docker compose ps

# 3. Tải bộ file Excel mẫu từ Google Drive (mục IV)
# 4. Biết cách lấy mật khẩu tạm của tài khoản vừa tạo:
docker compose logs backend --tail 300
```

**Sơ đồ 4 phân quyền và vòng lặp dữ liệu:**

```
SuperAdmin ── tạo Khoa, tạo tài khoản Admin khoa ──▶ Admin khoa
                                                          │
                        tạo Kỳ · Import SV/GV/DN · Phân công GVHD
                                                          │
Sinh viên ◀── nộp BC tuần, đồ án, xem điểm ──▶ Giảng viên ◀── duyệt BC, điểm danh, chấm Rubric
        └────────── thông báo real-time (SignalR) ──────────┘
```

---

### Hồi 1 — SuperAdmin (≈3 phút)

**Đăng nhập:** `admin` / `Password123!`

| # | Thao tác | Đường dẫn |
| :--- | :--- | :--- |
| 1 | Vào **Khoa** → **Thêm khoa** → đặt mã + tên khoa (vd. `CNTT` — Khoa Công nghệ Thông tin) | `/admin/departments` |
| 2 | Vào **Người dùng** → **Tạo tài khoản** → chọn vai trò **Quản trị khoa**, chọn khoa vừa tạo, điền username (vd. `admin-cntt`) + họ tên + **email của bạn** → Lưu | `/admin/users` |
| 3 | Lấy **mật khẩu tạm** của tài khoản vừa tạo từ log: `docker compose logs backend --tail 300` | terminal |
| 4 *(tuỳ chọn)* | Xem **Tổng quan** (KPI) và **Cài đặt** hệ thống | `/admin/dashboard`, `/admin/settings` |
| 5 | **Đăng xuất** | — |

> 🔑 Đây là điểm nhấn phân quyền: **SuperAdmin quản trị hệ thống** (khoa, tài khoản, cài đặt) — **không** tham gia vận hành nghiệp vụ thực tập (import, phân công, chấm điểm).

---

### Hồi 2 — Quản trị khoa / DepartmentAdmin (≈5 phút)

**Đăng nhập:** `admin-cntt` / mật khẩu tạm → **bắt buộc đổi mật khẩu** → vào Cổng Quản trị (nhãn “QUẢN TRỊ KHOA”).

| # | Thao tác | Đường dẫn | File Excel |
| :--- | :--- | :--- | :--- |
| 1 | **Kỳ thực tập** → **Tạo kỳ thực tập mới**: đặt tên kỳ, **số tuần thực tập**, thời gian áp dụng (trang này còn có nút tắt **Import Giảng viên** / **Import Sinh viên**) | `/admin/semesters` | — |
| 2 | **Sinh viên** → **Import Excel** → **Tải file mẫu** (nếu chưa có) → chọn file đã điền → **Bắt đầu Import** → lấy mật khẩu tạm từ log | `/admin/students` | `Mau-danh-sach-SV.xlsx` |
| 3 | **Giảng viên** → **Import Excel** → **Bắt đầu Import** → lấy mật khẩu tạm từ log | `/admin/lecturers` | `Mau-danh-sach-GV.xlsx` |
| 4 | **Doanh nghiệp** → **Import Excel** → danh sách DN nhận thực tập | `/admin/companies` | `Mau-danh-sach-doanh-nghiep.xlsx` |
| 5 | **Phân công hướng dẫn** → **Import Phân Bổ DN** (phân bổ SV vào doanh nghiệp) | `/admin/assignments` | `Mau-danh-sach-SV-thuc-tap-taiDN.xlsx` |
| 6 | **Phân công hướng dẫn** → **Import Excel GVHD** (dùng file mẫu `Mau-danh-sach-phan-cong-GVHD.xlsx`) hoặc phân công từng SV | `/admin/assignments` | — |
| 7 | **Thông báo** → phát thanh thông báo toàn khoa (hiện ngay cho GV/SV qua SignalR) | `/admin/notifications` | — |
| 8 | *(tuỳ chọn)* **Biểu mẫu & Tài liệu** upload biểu mẫu cho SV tải; **Báo cáo tổng kết** xuất Excel/Word cuối kỳ | `/admin/templates`, `/admin/summary` | — |
| 9 | **Đăng xuất** — ghi lại mật khẩu tạm của GV và SV để dùng cho Hồi 3, Hồi 4 | — | — |

> 📌 **Tại sao phải dùng Quản trị khoa?** Các chức năng import, phân công, quản lý kỳ đều gắn với một khoa cụ thể — SuperAdmin chỉ tạo khoa và tài khoản admin khoa, toàn bộ vận hành nằm ở phân quyền này.

---

### Hồi 3 — Giảng viên / Lecturer (≈5 phút)

**Đăng nhập:** tài khoản GV từ Excel import (vd. `gvcntt01`) / mật khẩu tạm → đổi mật khẩu → **Cổng Giảng viên**.

| # | Thao tác | Đường dẫn |
| :--- | :--- | :--- |
| 1 | **Tổng quan**: KPI (SV đang thực tập, báo cáo chờ duyệt…) | `/lecturer/dashboard` |
| 2 | **Sinh viên**: danh sách SV được phân công kèm tiến độ từng người → bấm 1 SV để mở workspace | `/lecturer/students` |
| 3 | **Báo cáo & Bài nộp**: **duyệt báo cáo tuần** của SV (Duyệt + nhận xét, hoặc yêu cầu chỉnh sửa) | `/lecturer/reports` |
| 4 | **Điểm danh & Buổi gặp**: điểm danh buổi hẹn tuần (*vắng ≥ 2 buổi sẽ bị chặn nhập điểm thi — tính năng, không phải bug*) | `/lecturer/attendance` |
| 5 | **Đánh giá & Chấm điểm** → tab **Cấu hình báo cáo** *(tuỳ chọn)*: bật/tắt từng tuần nộp, đặt deadline (T1–T5 bật, T6 tắt để bảo vệ, T7 báo cáo cuối kỳ) | `/lecturer/evaluations` |
| 6 | Tab **Chấm điểm**: chấm **Rubric theo tuần** (5 mức) + **điểm thi vấn đáp** → Lưu → hồ sơ SV chuyển sang **Graded** | `/lecturer/evaluations` |
| 7 | Tab **Tổng hợp & Xuất file**: xuất **bảng điểm Excel** và **báo cáo Word** (mẫu C23/C22A của khoa) | `/lecturer/evaluations` |
| 8 | **Đăng xuất** | — |

---

### Hồi 4 — Sinh viên / Student (≈4 phút)

**Đăng nhập:** tài khoản SV từ Excel import (vd. `cnttsv0001`) / mật khẩu tạm → đổi mật khẩu → **Cổng Sinh viên**.

| # | Thao tác | Đường dẫn |
| :--- | :--- | :--- |
| 1 | **Tổng quan**: tiến độ thực tập, task tuần, phản hồi mới | `/student/dashboard` |
| 2 | **Kỳ thực tập của tôi**: timeline các tuần, thông tin doanh nghiệp + GVHD, **xuất Phiếu xác nhận thực tập (PDF)** | `/student/internship` |
| 3 | **Báo cáo tuần**: **nộp báo cáo tuần** (chú ý deadline do GV cấu hình ở Hồi 3) | `/student/weekly-reports` |
| 4 | **Sản phẩm thực tập**: nộp báo cáo cuối kỳ / sản phẩm cuối kỳ | `/student/submissions` |
| 5 | **Phản hồi & Chỉnh sửa**: xem nhận xét của GV, phản hồi hoặc nộp bản chỉnh sửa | `/student/feedback` |
| 6 | **Kết quả Đánh giá**: xem điểm Rubric + điểm thi + xếp loại (sau khi GV chấm) | `/student/evaluation` |
| 7 | **Biểu mẫu & Tài liệu**: tải biểu mẫu hướng dẫn do admin khoa upload | `/student/templates` |

**Vòng lặp demo real-time để kết thúc buổi demo:**

```
SV nộp báo cáo tuần  →  GV duyệt + nhận xét  →  SV nhận thông báo real-time (SignalR)
GV chấm điểm xong    →  SV mở "Kết quả Đánh giá" thấy điểm + xếp loại
```

**Khôi phục lại từ đầu sau buổi demo:**

```bash
docker compose down --volumes   # ⚠️ XÓA toàn bộ dữ liệu (DB + file upload)
docker compose up -d --build    # chạy lại từ đầu → seed lại tài khoản admin
```

---

<a id="van-hanh"></a>

## ⚙️ VII. Các lệnh vận hành thường dùng

```bash
# Trạng thái các container (healthy?)
docker compose ps

# Xem log (Backend chứa log nghiệp vụ + email/mật khẩu tạm nếu EMAIL_ENABLED=false)
docker compose logs -f backend
docker compose logs --tail 100 frontend

# Khởi động lại 1 service
docker compose restart backend

# Dừng hệ thống — GIỮ nguyên dữ liệu
docker compose down

# Dừng hệ thống và XÓA sạch dữ liệu (reset demo / chạy lại từ đầu)
docker compose down --volumes

# Cập nhật mã nguồn mới rồi build lại
git pull
docker compose up -d --build

# Chạy lại health check
curl http://localhost:8000/health
```

**Dữ liệu được lưu ở Docker volume (không mất khi `docker compose down` thường):**

| Volume | Nội dung |
| :--- | :--- |
| `internlink_database_data` | Database SQL Server |
| `internlink_uploads_data` | Báo cáo, tài liệu, file SV đã upload (`/app/uploads`) |

---

<a id="cau-truc"></a>

## 📁 VIII. Cấu trúc thư mục

```
internlink/
├── backend/InternLink/            # Backend ASP.NET Core 10 (Clean Architecture)
│   ├── InternLink.API/            # Controllers, Hubs (SignalR), Health checks, Dockerfile
│   ├── InternLink.Application/    # DTOs, Interfaces, business logic
│   ├── InternLink.Domain/         # Entities, Enums (Role, InternshipStatus...)
│   ├── InternLink.Infrastructure/ # EF Core, seed, Email, Excel/Word/PDF, Services
│   └── InternLink.Shared/         # Responses, helpers, authorization policies
├── frontend/                      # Frontend React 19 + Vite + Tailwind
│   └── src/
│       ├── features/              # admin / lecturer / student / auth
│       ├── components/            # UI dùng chung
│       ├── services/              # Gọi API (Axios wrapper)
│       └── routes/                # React Router + phân quyền theo role
├── docs/                          # Tài liệu phân tích thiết kế & vận hành
├── scripts/                       # Script demo, reset, backup
├── database/                      # README DB, cấu trúc bảng, script SQL
├── docker-compose.yml             # Toàn bộ hệ thống (3 services)
└── README.md                      # Tài liệu này
```

---

<a id="local-dev"></a>

## 💻 IX. Chạy cục bộ (Local Development)

Chỉ cần khi phát triển code — không cần Docker cho frontend/backend (vẫn cần SQL Server).

**1. Backend (.NET 10):**

```bash
cd backend/InternLink/InternLink.API
dotnet restore
dotnet ef database update --project ../InternLink.Infrastructure
dotnet run --launch-profile http        # API: http://localhost:7109
```

**2. Frontend (React + Vite):**

```bash
cd frontend
npm install
npm run dev                             # Web: http://localhost:3000 (proxy /api → 7109)
```

**3. Chạy test / build:**

```bash
npm run typecheck     # kiểm tra kiểu TypeScript
npm run test          # unit test frontend (Vitest)
npm run build         # build frontend
```

---

<a id="go-loi"></a>

## 🧯 X. Gỡ lỗi hay gặp

| Triệu chứng | Nguyên nhân & Cách xử lý |
| :--- | :--- |
| `docker: command not found` | Docker chưa cài / terminal mở trước khi cài → cài Docker Desktop rồi mở lại terminal. |
| `Docker Desktop is not running` | Mở Docker Desktop, chờ nó khởi động xong rồi chạy lại `docker compose up -d --build`. |
| Build lần đầu rất lâu (5–10 phút) | Bình thường (build image .NET + npm). Chờ, xem tiến độ: `docker compose logs -f`. |
| Container `internlink_api` chưa `healthy` | Backend đang chạy migration/seed (cần ~60s). Vẫn lỗi → `docker compose logs backend`. |
| Lỗi port 8000 đã được sử dụng | Đổi host port ở service `frontend` trong `docker-compose.yml` (ví dụ `"8001:80"`), cập nhật `PORTAL_URL` trong `.env`, rồi chạy lại `docker compose up -d`. |
| Đăng nhập `admin` bị sai mật khẩu | Mật khẩu SuperAdmin là **`Password123!`** (không phải `Admin123!`). Nếu DB đã bị đổi từ trước → reset: `docker compose down --volumes && docker compose up -d --build`. |
| Không đăng nhập được tài khoản GV/SV | DB mới chỉ có tài khoản `admin`. Phải tạo/import GV-SV theo [Quy trình demo 4 phân quyền](#demo-4-phan-quyen) rồi lấy mật khẩu tạm. |
| Import báo `Failed to send email` / không có mật khẩu tạm | Chưa cấu hình SMTP → đặt `EMAIL_ENABLED=false` trong `.env` rồi `docker compose up -d backend`, rồi `docker compose logs backend --tail 300`. |
| Trang trắng / không gọi được API | Xem log: `docker compose logs backend frontend`. Kiểm tra CORS origin phải khớp URL frontend đang dùng, mặc định `http://localhost:8000`. |
| SV nộp báo cáo bị báo “quá hạn” | Portal Giảng viên → **Đánh giá & Chấm điểm** → tab **Cấu hình báo cáo**: bật lại tuần nộp hoặc đẩy deadline của tuần đó sang tương lai. |
| Không nhập được điểm thi | SV thiếu báo cáo cuối kỳ hoặc vắng ≥ 2 buổi → **đúng thiết kế**, không phải lỗi. |
| Muốn mở Swagger | Trên chính Docker host, truy cập `http://localhost:7109/swagger`; không mở port 7109 ra Internet. |
| Muốn demo lại từ đầu | `docker compose down --volumes && docker compose up -d --build`. |

**Lệnh chẩn đoán nhanh:**

```bash
docker compose ps                       # trạng thái & health
docker compose logs --tail 200 backend  # lỗi API/seed
curl http://localhost:8000/health       # health check qua Nginx
```

---

<a id="tai-lieu"></a>

## 📚 XI. Tài liệu chi tiết

Toàn bộ tài liệu phân tích – thiết kế – vận hành nằm trong thư mục [`/docs`](docs/README.md):

| Tài liệu | Nội dung |
| :--- | :--- |
| [`docs/01-Vision-Scope.md`](docs/01-Vision-Scope.md) | Tầm nhìn, phạm vi, mục tiêu nghiệp vụ |
| [`docs/02-Software-Requirements-Specification.md`](docs/02-Software-Requirements-Specification.md) | Đặc tả yêu cầu phần mềm (SRS) |
| [`docs/03-Business-Workflow.md`](docs/03-Business-Workflow.md) | Quy trình nghiệp vụ thực tập tốt nghiệp |
| [`docs/04-Use-Case-Specification.md`](docs/04-Use-Case-Specification.md) | Đặc tả Use Case chi tiết |
| [`docs/05b-Entity-Relationship-Diagram.md`](docs/05b-Entity-Relationship-Diagram.md) · [`05d-Database-Design.md`](docs/05d-Database-Design.md) | ERD & thiết kế cơ sở dữ liệu |
| [`docs/06-System-Architecture.md`](docs/06-System-Architecture.md) | Kiến trúc hệ thống & luồng dữ liệu |
| [`docs/08-API-Specification.md`](docs/08-API-Specification.md) | Đặc tả REST API & SignalR |
| [`docs/09-System-DevOps-Guide.md`](docs/09-System-DevOps-Guide.md) | Hạ tầng Docker, Nginx, troubleshooting runbook |
| [`docs/Demo-UI-Script.md`](docs/Demo-UI-Script.md) | **Kịch bản demo & thuyết trình (15–20 phút)** |
| [`docs/Email-Setup-Gmail.md`](docs/Email-Setup-Gmail.md) | Cấu hình gửi email qua Gmail SMTP |
| [`docs/current/09-Demo-Accounts.md`](docs/current/09-Demo-Accounts.md) | Tài khoản demo & seed dữ liệu |
| [`database/README.md`](database/README.md) | Cấu trúc bảng, migration, quy ước đặt tên |

---

## 📄 License

Dự án mở theo giấy phép **MIT** — xem [LICENSE](LICENSE).
