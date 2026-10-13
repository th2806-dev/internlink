# Kế hoạch trang Trung tâm Hướng dẫn sử dụng InternLink

## Mục tiêu

Xây dựng một trang hướng dẫn dùng chung cho toàn bộ hệ thống, được lọc theo quyền người dùng và có khả năng deep link tới từng bài viết, cho phép người dùng dễ dàng tìm đúng bài hướng dẫn trong thời gian ngắn.

## Yêu cầu chính

- Một trang dùng chung thay vì tách 4 trang riêng.
- Nội dung được lọc theo quyền: SuperAdmin, DepartmentAdmin, Lecturer, Student.
- Hỗ trợ deep link: `/student/help?article=...`, `/lecturer/help?article=...`, `/admin/help?article=...`.
- Tìm kiếm thông minh tiếng Việt, hỗ trợ nhập có dấu và không dấu.
- Có thêm trợ giúp theo ngữ cảnh trên các trang nghiệp vụ phức tạp.
- Quản lý nội dung dạng dữ liệu tĩnh (TypeScript catalog) cho v1.
- Không cần thêm database, API, hoặc CMS ở phiên bản đầu.

## Nguyên tắc kiến trúc

### 1) Trang dùng chung + lọc theo quyền

- Một giao diện duy nhất cho toàn bộ hệ thống.
- Mỗi bài viết có `roles` xác định ai được xem.
- SuperAdmin và DepartmentAdmin có thể dùng chung portal admin nhưng nội dung sẽ được lọc theo phạm vi quyền.
- Sinh viên, giảng viên và quản trị sẽ truy cập bằng portal riêng nhưng cùng chung một component và dữ liệu catalog.

### 2) Dữ liệu tĩnh cho v1

- Không cần phát triển schema database hoặc API.
- Tạo file `frontend/src/features/help/types/helpCenter.ts` và `frontend/src/features/help/data/helpArticles.ts`.
- Dễ maintain qua Git và cập nhật nhanh trong quá trình phát triển.
- Phù hợp với hệ thống đang có sẵn vì tải nhanh, không gây tải cho server.

## Cấu trúc dữ liệu đề xuất

```ts
export type HelpRole = 'SuperAdmin' | 'DepartmentAdmin' | 'Lecturer' | 'Student';

export interface HelpStep {
  stepNumber: number;
  title: string;
  description: string;
  image?: string;
  note?: string;
}

export interface HelpFaqItem {
  question: string;
  answer: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  category: 'getting-started' | 'internship-mgmt' | 'reports' | 'attendance' | 'grading' | 'troubleshooting';
  roles: HelpRole[];
  superAdminOnly?: boolean;
  summary: string;
  keywords: string[];
  steps: HelpStep[];
  actionUrl?: string;
  actionLabel?: string;
  faq?: HelpFaqItem[];
}
```

## Cấu trúc giao diện đề xuất

### Trang Help Center

- Hero section: tiêu đề + ô tìm kiếm
- Bộ lọc bên trái: theo quyền và nhóm danh mục
- Nội dung bài viết chính ở giữa
- FAQ và lời khuyên khắc phục ở bên phải
- Nút “Đi đến chức năng này” nếu bài có `actionUrl`
- Trạng thái rỗng khi không tìm thấy kết quả

### Tính năng deep link

- URL mẫu:
  - `/student/help?article=nop-bao-cao-tuan`
  - `/lecturer/help?article=cham-diem-thuc-tap`
  - `/admin/help?article=quan-ly-ky-thuc-tap`
- Khi mở bài theo `article`, hệ thống:
  - kiểm tra quyền truy cập;
  - nếu hợp lệ thì mở đúng bài và cuộn đến phần tiêu đề;
  - nếu không hợp lệ thì hiện trạng thái “Bạn không có quyền xem bài hướng dẫn này” và gợi ý quay về danh sách.

## Tìm kiếm tiếng Việt

### Yêu cầu

- Hỗ trợ nhập có dấu và không dấu.
- Tìm kiếm khớp trên tiêu đề, mô tả, từ khóa, câu hỏi FAQ và câu trả lời FAQ.

### Cách làm

```ts
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
```

- Tìm kiếm sẽ so sánh `normalize(query)` với `normalize(article.title)`, `normalize(summary)`, `normalize(keywords.join(' '))` và FAQ text.
- Ví dụ: `nop bao cao` vẫn tìm ra bài “Hướng dẫn nộp báo cáo tuần”.

## Trợ giúp theo ngữ cảnh

- Thêm nút `(?) Hướng dẫn trang này` ở PageHeader của các màn hình nghiệp vụ quan trọng.
- Khi bấm vào, mở đúng bài hướng dẫn liên quan bằng deep link.
- Ví dụ:
  - `/admin/assignments` → bài “Quy trình phân công và ghép cặp doanh nghiệp”
  - `/student/weekly-reports` → bài “Quy định định dạng file PDF và thời hạn nộp bài”
- Mục tiêu: giảm thời gian người dùng phải đi tìm hướng dẫn lâu.

## Nội dung FAQ giá trị cần có

### Cho tất cả vai trò

- Tôi quên mật khẩu nhưng không thấy email về hộp thư?
- Tôi không nhận được email xác minh hoặc thông báo?
- File báo cáo tuần của tôi bị từ chối vì sao?
- Tại sao tôi không thấy danh sách kỳ thực tập của mình?

### Cho sinh viên

- Nộp báo cáo tuần cần file định dạng nào?
- Đăng ký bộ phận thực tập bị thiếu dữ liệu?
- Chưa nhận được phản hồi từ giảng viên sau khi nộp?
- Làm sao để kiểm tra deadline báo cáo?

### Cho giảng viên

- Làm thế nào để duyệt báo cáo tuần nhanh hơn?
- Có thể chỉnh sửa điểm sau khi đã xác nhận không?
- Sửa deadline hoặc thời gian nộp ở đâu?

### Cho quản trị

- Phân công giảng viên và doanh nghiệp cần làm theo trình tự nào?
- Cách cập nhật kỳ thực tập và cấu hình thời hạn nộp?
- Cách quản lý báo cáo tổng kết và kho báo cáo theo khoa?

## Mục lục đề xuất theo vai trò

### SuperAdmin

- Quản lý hệ thống và quyền
- Quản lý kỳ thực tập
- Quản lý khoa, người dùng, tài khoản
- Cấu hình và sao lưu
- Báo cáo tổng kết hệ thống

### DepartmentAdmin

- Quản lý sinh viên trong khoa
- Quản lý giảng viên và doanh nghiệp trong khoa
- Phân công hướng dẫn và đội ngũ
- Điểm danh & báo cáo khoa
- Duyệt và tổng kết thực tập trong phạm vi khoa

### Lecturer

- Theo dõi sinh viên hướng dẫn
- Xem báo cáo tuần và bài nộp
- Điểm danh và buổi gặp
- Đánh giá & chấm điểm
- Xem thống kê & phân tích
- Lịch sử hướng dẫn

### Student

- Bắt đầu kỳ thực tập
- Theo dõi thời hạn và lịch làm việc
- Nộp báo cáo tuần, báo cáo cuối kỳ, sản phẩm, minh chứng
- Xem phản hồi, đánh giá và điểm
- Đổi mật khẩu và quản lý tài khoản

## Lộ trình triển khai khuyến nghị

### P1 — Tạo thư mục help catalog

- `frontend/src/features/help/types/helpCenter.ts`
- `frontend/src/features/help/data/helpArticles.ts`
- `frontend/src/features/help/components/HelpCenterView.tsx`

### P2 — Xây dựng giao diện Help Center

- Hero search
- Danh mục tab/chủ đề
- Danh sách bài viết
- Nội dung bài chi tiết
- FAQ accordion
- Empty state

### P3 — Gắn route và menu

- `/admin/help`
- `/lecturer/help`
- `/student/help`
- Thêm mục vào các Sidebar hiện có

### P4 — Deep link + quyền truy cập

- Chấp nhận `article` query param
- Kiểm tra `roles`
- Highlight tiêu đề bài đang mở
- Hiển thị cảnh báo khi không có quyền

### P5 — Test và xác minh UX

- Xác minh tìm kiếm có dấu + không dấu
- Xác minh quyền xem đúng với từng vai trò
- Xác minh deep link và redirect
- Kiểm tra trên mobile và desktop
- Kiểm tra khả năng mở từ các trang nghiệp vụ khác

## Tiêu chí chốt hoàn thành

- 4 vai trò đều có hướng dẫn phù hợp và không lộ nội dung sai quyền.
- Deep link mở bài đúng và có highlight rõ ràng.
- Tìm kiếm không dấu / có dấu hoạt động chuẩn.
- Có thể mở bài từ sidebar và từ nút trợ giúp theo ngữ cảnh.
- Hệ thống dễ mở rộng theo thời gian mà không cần database.
- UX thân thiện, rõ ràng, đọc dễ trên cả desktop và mobile.

## Ghi chú triển khai

- v1 sẽ dùng dữ liệu tĩnh; không cần API mới.
- v2 có thể nâng cấp về CMS hoặc quản trị nội dung bằng admin nếu cần.
- Nên ưu tiên các bài hướng dẫn có tính chất nghiệp vụ cao và thường gặp nhất trước.
