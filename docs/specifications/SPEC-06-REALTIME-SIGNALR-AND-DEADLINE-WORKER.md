# ĐẶC TẢ KỸ THUẬT PHÂN HỆ SPEC-06
# HỆ THỐNG THÔNG BÁO SIGNALR REAL-TIME & TỰ ĐỘNG HÓA HẠN NỘP (REAL-TIME SIGNALR PIPELINE & DEADLINE AUTOMATION)

> **Mã tài liệu:** SPEC-06-REALTIME-WORKER  
> **Dự án:** Nền tảng Quản trị Thực tập InternLink (B2B SaaS)  
> **Cấp bảo mật:** Nội bộ / Đối tác Triển khai  
> **Phiên bản:** 2.0 Enterprise  
> **Mục tiêu cốt lõi:** Chấm dứt vĩnh viễn thói quen nhắc việc thủ công qua group chat Zalo, tự động hóa 100% việc cảnh báo trễ hạn nộp báo cáo và đồng bộ thông báo tức thì giữa Sinh viên - Giảng viên - Doanh nghiệp  
> **Trạng thái:** Sẵn sàng cho triển khai và chuyển đổi sang Word (.docx)

---

## 1. TỔNG QUAN VÀ BỐI CẢNH NGHIỆP VỤ (EXECUTIVE OVERVIEW)

### 1.1 Sự bất cập của việc trao đổi qua Group chat Zalo
- **Tin nhắn bị trôi và phân mảnh:** Mỗi đợt thực tập thường có hàng chục nhóm Zalo: nhóm chung của khoa, nhóm riêng của từng giảng viên với sinh viên, nhóm chat với mentor doanh nghiệp. Thông báo nộp báo cáo, thời hạn chấm điểm thường xuyên bị trôi bởi các tin nhắn trò chuyện thông thường.
- **Giảng viên quá tải việc "đòi bài":** Giảng viên hướng dẫn phải liên tục vào danh sách sinh viên rà soát thủ công xem ai chưa nộp báo cáo tuần, sau đó nhắn tin nhắc nhở từng người hoặc tag tên hàng loạt trên Zalo — một công việc lặp đi lặp lại cực kỳ nhàm chán và lãng phí thời gian chuyên môn.
- **Sinh viên trễ hạn vì không có kênh thông báo chính thức:** Sinh viên không nhận được lời nhắc tự động trước giờ khóa sổ nộp bài, dẫn đến việc bị điểm 0 hoặc trượt thực tập một cách đáng tiếc.

### 1.2 Giải pháp Đột phá của InternLink
- **Kênh Thông báo Thời gian thực (SignalR Hub):**
  - Mọi hành động trọng yếu (Sinh viên nộp bài, Giảng viên duyệt/chấm điểm, Doanh nghiệp xác nhận tiếp nhận) đều được đẩy tức thì qua kết nối WebSocket bảo mật mà không cần người dùng tải lại trang (Zero page reload).
- **Cỗ máy Tự động hóa Lịch trình & Hạn nộp (Background Deadline Cron Worker):**
  - Chạy ngầm định kỳ (mỗi ngày vào 08:00 sáng và 20:00 tối):
    - *Cảnh báo trước 24 giờ:* Tự động quét và bắn thông báo cho sinh viên chưa nộp báo cáo tuần sắp đến hạn.
    - *Cảnh báo tồn đọng bài nộp:* Nhắc nhở Giảng viên phụ trách khi có bài nộp của sinh viên tồn đọng quá 5 ngày chưa được phản hồi.
    - *Kích hoạt khâu cuối kỳ:* Khi sinh viên hoàn thành tuần thực tập cuối cùng, worker tự động kích hoạt tiến trình mời Doanh nghiệp đánh giá.

---

## 2. KIẾN TRÚC VÀ SƠ ĐỒ LUỒNG SỰ KIỆN (EVENT-DRIVEN ARCHITECTURE)

```mermaid
flowchart TD
    subgraph Client["ỨNG DỤNG FRONTEND (REACT 19)"]
        SV_UI["Portal Sinh viên<br/>(Nộp báo cáo tuần)"]
        GV_UI["Portal Giảng viên<br/>(Xem thông báo chuông)"]
        Toast["Toast Notification System<br/>(Âm thanh & Popup nhẹ)"]
    end

    subgraph Backend["HỆ THỐNG BACKEND (.NET 10)"]
        API["ReportsController"]
        Hub["SignalR Hub: /hubs/notifications<br/>(Quản lý kết nối WebSocket theo UserId & Role)"]
        Worker["InternshipDeadlineWorker<br/>(Background HostedService)"]
        DB["SQL Server (Sys_Notifications)"]
    end

    SV_UI -->|1. Nộp báo cáo thành công| API
    API -->|2. Ghi nhận bài nộp| DB
    API -->|3. Invoke SendToUser(LecturerId)| Hub
    Hub -->|4. Push Event tức thì| GV_UI
    GV_UI --> Toast

    Worker -->|Mỗi ngày quét hạn nộp| DB
    Worker -->|Phát hiện SV sắp trễ hạn| Hub
    Hub -->|Push cảnh báo khẩn| SV_UI
```

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

```sql
-- 1. BẢNG THÔNG BÁO NGƯỜI DÙNG HỆ THỐNG
CREATE TABLE [dbo].[Sys_Notifications] (
    [Auto_ID]             BIGINT IDENTITY(1,1) NOT NULL,
    [Public_ID]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    [Recipient_User_ID]   BIGINT NOT NULL,                -- Người nhận thông báo
    [Sender_User_ID]      BIGINT NULL,                    -- Người gửi (NULL nếu do Hệ thống sinh)
    [Notification_Type]   NVARCHAR(50) NOT NULL,          -- REPORT_SUBMITTED, GRADE_POSTED, ACCEPTANCE_CONFIRMED, DEADLINE_ALERT
    [Title]               NVARCHAR(200) NOT NULL,         -- Tiêu đề ngắn gọn
    [Message_Body]        NVARCHAR(1000) NOT NULL,        -- Nội dung chi tiết
    [Action_URL]          NVARCHAR(250) NULL,             -- Đường dẫn điều hướng khi bấm vào thông báo
    [Is_Read]             BIT NOT NULL DEFAULT 0,         -- Trạng thái đã đọc
    [Read_At]             DATETIME2 NULL,                 -- Thời điểm đọc
    [Priority_Level]      INT NOT NULL DEFAULT 1,         -- 1: Bình thường, 2: Quan trọng, 3: Khẩn cấp
    [CreatedAt]           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_Sys_Notifications] PRIMARY KEY CLUSTERED ([Auto_ID]),
    CONSTRAINT [AK_Sys_Notifications_Public_ID] UNIQUE NONCLUSTERED ([Public_ID]),
    CONSTRAINT [FK_Notifications_Recipient] FOREIGN KEY ([Recipient_User_ID]) REFERENCES [dbo].[Users] ([Id])
);

-- 2. BẢNG NHẬT KÝ THỰC THI WORKER LỊCH TRÌNH
CREATE TABLE [dbo].[Sys_Worker_Logs] (
    [Auto_ID]             BIGINT IDENTITY(1,1) NOT NULL,
    [Worker_Name]         NVARCHAR(100) NOT NULL,         -- InternshipDeadlineWorker
    [Execution_Status]    NVARCHAR(50) NOT NULL,          -- SUCCESS, WARNING, FAILED
    [Records_Processed]   INT NOT NULL DEFAULT 0,         -- Số bản ghi quét qua
    [Alerts_Sent_Count]   INT NOT NULL DEFAULT 0,         -- Số cảnh báo đã phát đi
    [Error_Message]       NVARCHAR(2000) NULL,
    [Execution_Duration]  INT NOT NULL,                   -- Thời gian chạy (miligiây)
    [Executed_At]         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_Sys_Worker_Logs] PRIMARY KEY CLUSTERED ([Auto_ID])
);
```

---

## 4. ĐẶC TẢ GIAO DIỆN LẬP TRÌNH ỨNG DỤNG & SIGNALR HUB (CONTRACTS)

### 4.1 SignalR Hub Methods (`NotificationHub.cs`)
- **Hub Endpoint:** `/hubs/notifications`
- **Giao thức:** WebSockets (fallback sang Long Polling nếu môi trường mạng hạn chế).
- **Client Listeners (Frontend lắng nghe):**
  - `ReceiveNotification(NotificationDto notification)`: Kích hoạt khi có thông báo mới.
  - `UpdateUnreadCount(int unreadCount)`: Cập nhật số đỏ trên icon quả chuông Header.

### 4.2 RESTful API Endpoints Quản lý Thông báo

| STT | Phương thức | Đường dẫn API | Mục đích |
|---|---|---|---|
| 1 | `GET` | `/api/v1/notifications?page=1&pageSize=10` | Lấy danh sách thông báo của người dùng hiện tại |
| 2 | `PUT` | `/api/v1/notifications/{id}/read` | Đánh dấu 1 thông báo là đã đọc |
| 3 | `PUT` | `/api/v1/notifications/read-all` | Đánh dấu tất cả thông báo là đã đọc |
| 4 | `GET` | `/api/v1/notifications/unread-count` | Lấy số lượng thông báo chưa đọc |

---

## 5. ĐẶC TẢ GIAO DIỆN NGƯỜI DÙNG (FRONTEND UI SPECIFICATION)

### 5.1 Icon Chuông & Hộp Thư Thông báo trên Header
- **Vị trí:** Góc trên bên phải thanh Header của ứng dụng (trong `Navbar.tsx`).
- **Trạng thái huy hiệu (Badge):**
  - Nếu có tin chưa đọc: Hiển thị chấm đỏ nổi bật với số lượng tin chưa đọc.
  - Khi có thông báo mới đẩy về từ SignalR: Icon rung nhẹ (Shake animation) và hiển thị Toast thông báo nhanh ở góc phải màn hình trong 4 giây.
- **Danh sách xổ xuống (Dropdown Panel):**
  - Kích thước: Rộng `380px`, tối đa `500px` chiều cao với thanh cuộn mượt.
  - Thẻ thông báo: Nền sáng nhẹ nếu chưa đọc (`bg-sky-50/60`), chữ đậm. Phân biệt loại thông báo bằng icon tương ứng (Nộp bài: icon văn bản xanh `#026aa7`, Điểm số: icon ngôi sao `#7bc043`, Khẩn cấp: icon đồng hồ cam).

---

## 6. MA TRẬN KIỂM THỬ VÀ NGHIỆM THU QA (TEST MATRIX)

| Test ID | Tình huống kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi |
|---|---|---|---|
| `TC-SIG-01` | Đẩy thông báo thời gian thực khi sinh viên nộp bài | Sinh viên nộp báo cáo tuần 3 | Giảng viên hướng dẫn lập tức thấy popup thông báo và chuông tăng thêm 1 không cần F5 |
| `TC-SIG-02` | Mất kết nối mạng và tự động kết nối lại (Auto Reconnect) | Ngắt kết nối mạng 5 giây rồi bật lại | SignalR client tự động kết nối lại và đồng bộ các thông báo bị lỡ trong thời gian ngắt kết nối |
| `TC-WRK-01` | Worker quét hạn nộp trước 24h | Sinh viên còn 20h nữa đến hạn nộp báo cáo | Worker tạo thông báo gửi tới sinh viên, ghi nhận log thực thi thành công |
| `TC-WRK-02` | Đánh dấu đã đọc thông báo | Người dùng click vào thông báo | Cập nhật `Is_Read = 1` trong CSDL, giảm bộ đếm số đỏ trên Header tức thì |

