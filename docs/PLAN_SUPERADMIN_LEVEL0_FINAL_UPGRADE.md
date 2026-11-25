# Kế hoạch hoàn tất SuperAdmin Cấp 0 và chuyển tiếp Cấp 1–2

**Ngày lập:** 24/11/2026
**Đối tượng:** Dev backend, frontend, QA
**Mục tiêu:** Hoàn thành các hạng mục Cấp 0 đã thống nhất, nghiệm thu theo tiêu chí rõ ràng, sau đó chuyển trọng tâm sang quy trình tác nghiệp Cấp 1 và Cấp 2.

## 1. Quyết định phạm vi

- **Cấp 0 — SuperAdmin:** chủ nền tảng SaaS; quản lý trường/tenant, cấu hình dịch vụ, bản quyền, giới hạn sử dụng và hỗ trợ vận hành.
- **Cấp 1 — DepartmentAdmin:** quản trị nghiệp vụ của trường/khoa; quản lý học kỳ, dữ liệu và phân công.
- **Cấp 2 — Người dùng nghiệp vụ:** giảng viên, sinh viên và người liên hệ/mentor doanh nghiệp.
- **Doanh nghiệp là đối tác của tenant trường**, không phải một tenant SaaS độc lập trong phạm vi hiện tại. Chỉ mở rộng thành tổ chức cấp 1 nếu có quyết định sản phẩm riêng.
- Không mở rộng phạm vi sang bán đứt/multi-instance, platform key, cổng HR nhiều vai trò hoặc các chức năng chưa được duyệt. Mọi thay đổi ngoài các đầu việc dưới đây cần được duyệt trước.

## 2. Trạng thái đã đối chiếu trong mã nguồn

| Hạng mục | Trạng thái hiện tại | Việc còn lại |
|---|---|---|
| Branding / White-label | **Đã hoàn tất trong worktree.** Tên ứng dụng, logo, favicon, tiêu đề trình duyệt và nội dung copyright/footer có cấu hình; login/landing dùng nội dung cấu hình. | QA nghiệm thu trên các bề mặt UI và cấu hình triển khai thực tế. |
| Chặn quota dung lượng | **Đã triển khai; migration `EnforceTenantStorageQuota` đã áp dụng trên SQL Server local/dev-test đã được xác nhận.** Test concurrency SQL Server đã xác nhận reservation không vượt trần; test này cũng bắt và giúp sửa lỗi dịch LINQ trong `ExecuteUpdate`. | Còn QA các luồng upload/xóa/rollback trên môi trường nghiệm thu; không tự áp dụng migration lên môi trường khác. |
| Xuất gói dữ liệu tenant | **Đã triển khai trong worktree theo phạm vi đã chốt:** sinh viên, giảng viên, học kỳ, doanh nghiệp, phân công, báo cáo, bài nộp, đánh giá, điểm danh, biểu mẫu và tệp minh chứng cục bộ; ZIP có CSV thô để xử lý dữ liệu và workbook Excel trình bày sẵn với sheet/tên bảng, bộ lọc, tiêu đề, font Arial 13. | QA đối chiếu dữ liệu, file, quyền và audit log trên môi trường nghiệm thu; xác nhận các file ngoài hệ thống được ghi rõ trong manifest. |
| Gói và bảng giá | **Đã triển khai trong mã nguồn hiện tại.** Hạn mức lấy từ danh mục gói; giá cấu hình theo chu kỳ; hóa đơn lưu snapshot giá, VAT và hạn mức. | Migration `AddBillingPlanQuotas` đã tạo nhưng **chưa áp dụng vào cơ sở dữ liệu**. Cần áp dụng có kiểm soát rồi smoke-test trên môi trường được duyệt. |

Không dùng số liệu test hoặc tỷ lệ hoàn thành từ tài liệu cũ làm cam kết. QA cần chạy lại suite trên đúng commit bàn giao và báo số liệu thực tế.

## 3. Cấp 0 — các bước giao Dev

### Bước 1 — Hoàn thiện Branding & White-label Studio

**Mục tiêu:** SuperAdmin đổi nhận diện nền tảng từ `/admin/settings` mà không phải sửa mã nguồn.

**Backend**

- Chuẩn hóa các khóa cấu hình `SystemSettings` cho tên ứng dụng, tên ngắn, logo, favicon, tiêu đề trình duyệt và nội dung copyright/footer.
- Bổ sung DTO/validation/API cho các trường còn thiếu; giữ nguyên API branding công khai chỉ trả các giá trị an toàn để hiển thị.
- Tải tệp vào thư mục lưu trữ cấu hình, giới hạn dung lượng/định dạng; không tin tên tệp từ client.

**Frontend**

- Bổ sung trường cấu hình tiêu đề trình duyệt và copyright/footer tại `/admin/settings`.
- Đồng bộ branding ở đăng nhập, sidebar, tab trình duyệt, trang công khai, thông báo thanh toán và footer.
- Có preview, trạng thái đang tải/lưu, lỗi rõ ràng và khả năng khôi phục mặc định.

**Nghiệm thu**

- Đổi tên/logo/favicon/tiêu đề/copyright, tải lại trang và đăng nhập lại vẫn thấy đúng cấu hình.
- Không còn tên/copyright cố định ở các bề mặt người dùng thuộc phạm vi white-label.
- Kiểm thử API validation và frontend preview, lưu, lỗi upload, reset.

### Bước 2 — Cưỡng chế quota lưu trữ

**Mục tiêu:** Không cho tenant ghi thêm tệp làm dung lượng sử dụng vượt quota của kỳ license hiện hành.

**Backend**

1. **Đã kiểm kê:** tài liệu, biểu mẫu, báo cáo tuần, hồ sơ nộp/đính kèm và avatar tenant. Import Excel tạm thời và branding nền tảng không tính vào quota.
2. **Đã triển khai đối soát ban đầu:** `CurrentStorageBytes` được dựng từ các file vật lý đang được tham chiếu; đường dẫn trùng giữa bản ghi hiện hành và lịch sử chỉ tính một lần.
3. **Đã triển khai reservation dùng chung:** kiểm tra/cộng quota nguyên tử ở database trước khi ghi file; upload lỗi sẽ xóa file dở dang và hoàn quota. Gia hạn license giữ lại usage đã đối soát.
4. **Đã triển khai giải phóng:** chỉ trừ quota khi file vật lý được xóa; các phiên bản lịch sử còn lưu vẫn được tính.
5. **Đã triển khai lỗi có cấu trúc:** API trả HTTP 413 và thông báo nâng cấp khi vượt quota.
6. **Đã áp dụng/kiểm chứng tại local-dev-test:** migration `EnforceTenantStorageQuota` được chạy sau khi người dùng xác nhận target và backup; test SQL Server với 8 reservation đồng thời xác nhận quota 100 bytes chỉ chấp nhận đúng 4 reservation × 25 bytes. Còn kiểm thử upload/xóa/rollback end-to-end trên môi trường nghiệm thu; không triển khai migration sang môi trường khác nếu chưa được xác nhận.

**Frontend**

- Hiển thị dung lượng đã dùng/tổng quota và thông báo dễ hiểu khi upload bị chặn; cung cấp đường dẫn liên hệ/nâng cấp phù hợp.
- Không coi kiểm tra ở trình duyệt là cơ chế bảo vệ quota.

**Nghiệm thu**

- Kiểm thử dưới ngưỡng, đúng ngưỡng, vượt ngưỡng, upload đồng thời, thay tệp, xóa tệp và lỗi ghi.
- Kiểm thử cách ly tenant: quota tenant A không đọc/ghi ảnh hưởng tenant B.
- Các luồng lưu file nghiệp vụ đều qua cùng cơ chế; import Excel và tệp cấu hình nền tảng không bị tính nhầm vào quota tenant.

### Bước 3 — Xuất gói dữ liệu tenant

**Mục tiêu:** SuperAdmin có thể bàn giao dữ liệu của một trường khi kết thúc hợp đồng.

**Backend**

- **Đã triển khai:** endpoint export dùng quyền `TENANTS.EXPORT`, ghi audit log có tenant đích, người thực hiện, IP, thời điểm và số lượng dữ liệu/tệp.
- **Đã chốt với Product Owner:** gói ZIP đầy đủ dữ liệu học vụ — danh sách sinh viên/giảng viên, khoa, học kỳ, doanh nghiệp/vị trí, phân công, rubric/điểm, báo cáo/bài nộp, phản hồi, điểm danh và biểu mẫu; có CSV thô cho sinh viên, giảng viên, điểm và workbook `data/academic-records.xlsx` trình bày sẵn để đọc.
- Tệp minh chứng chỉ được thêm khi file tồn tại trong vùng lưu trữ được quản lý cục bộ; liên kết tới dịch vụ ngoài hoặc file không còn trên đĩa được thống kê trong manifest, không tải từ URL bên ngoài.
- Kèm manifest mô tả tenant, thời điểm xuất, định dạng, nhóm dữ liệu và tình trạng từng tham chiếu tệp.
- Không xuất mật khẩu, refresh token, dữ liệu phiên, secrets, cấu hình nền tảng, billing, avatar hoặc dữ liệu tenant khác.
- ZIP được tạo trong file tạm riêng, xóa khi stream tải được đóng; đường dẫn được giới hạn trong vùng lưu trữ ứng dụng, không nhận đường dẫn từ client.

**Frontend**

- Thêm hành động “Xuất gói dữ liệu” trong hồ sơ/chi tiết tenant.
- Hiển thị xác nhận phạm vi xuất, trạng thái xử lý, lỗi và kết quả tải.

**Nghiệm thu**

- ZIP mở được, có manifest và đủ các nhóm dữ liệu đã chốt; kiểm thử tenant rỗng và tenant có tệp.
- Kiểm thử quyền truy cập, tenant ID không hợp lệ, chống truy cập chéo tenant và audit log.
- QA đối chiếu số bản ghi trong gói với dữ liệu nguồn trước khi ký nghiệm thu; xác nhận CSV an toàn khi mở bằng Excel.

### Bước 4 — Chốt danh mục gói và bảng giá

**Trạng thái:** Phần mã nguồn đã được hiện thực trong worktree. `AddBillingPlanQuotas` đã có trong migration history của local-dev-test; `EnforceTenantStorageQuota` vừa được áp dụng ở cùng môi trường sau khi xác nhận target và backup. Chưa có migration nào được áp dụng lên môi trường khác. Ba gói mặc định hiện là:

| Gói | Sinh viên | Giảng viên | Lưu trữ |
|---|---:|---:|---:|
| Tiêu chuẩn | 500 | 25 | 20 GB |
| Chuyên nghiệp | 2.000 | 100 | 100 GB |
| Doanh nghiệp | 10.000 | 500 | 500 GB |

**Việc Dev/QA cần hoàn tất**

- Kiểm tra migration history ở từng môi trường trước khi triển khai; backup và xác nhận riêng cho từng môi trường. Không tự ý chạy migration production.
- Kiểm tra `/admin/billing`: giá theo gói và chu kỳ được cấu hình riêng; không tự điền hay tự suy đoán VAT.
- Kiểm tra tạo hóa đơn lưu snapshot giá, VAT và hạn mức; thay đổi gói sau đó không sửa hóa đơn/kỳ bản quyền đã phát hành.
- Kiểm tra thanh toán hóa đơn áp dụng đúng quota snapshot; cấp/gia hạn trực tiếp dùng gói chuẩn và ghi rõ không tạo hóa đơn.
- Kiểm tra `/admin/licenses` và luồng tạo tenant không còn cho nhập quota độc lập với danh mục gói.
- Chạy lại test dịch vụ billing, tenant, controller và frontend sau khi migration được áp dụng.

## 4. Cổng nghiệm thu để đóng Cấp 0

Chỉ chuyển trọng tâm khi tất cả điều kiện sau đạt:

- Bốn bước trên đã được QA nghiệm thu; Bước 4 có migration được áp dụng tại môi trường nghiệm thu.
- Branding, quota, export và billing có kiểm thử lỗi/biên; các thao tác SuperAdmin được kiểm tra quyền và audit phù hợp.
- Không còn lỗi nghiêm trọng về phân quyền hoặc rò rỉ dữ liệu tenant; kiểm tra cách ly tenant ở các endpoint liên quan.
- Có hướng dẫn vận hành ngắn: backup trước migration, cấu hình giá/VAT, quota và quy trình xuất dữ liệu.
- Product owner ký xác nhận phạm vi Cấp 0. Từ thời điểm đó chỉ xử lý bug/blocker; tính năng Cấp 0 mới phải được duyệt riêng.

## 5. Sau Cấp 0 — luồng Cấp 1 và Cấp 2

### Cấp 1 — DepartmentAdmin

Thực hiện theo thứ tự nghiệp vụ trên một tenant kiểm thử:

1. **Học kỳ:** tạo học kỳ, thiết lập thời gian thực tập/hạn nộp, cập nhật và khóa sổ; kiểm tra dữ liệu kỳ cũ ở chế độ chỉ xem.
2. **Import:** thử dữ liệu sinh viên và giảng viên tối thiểu 500 dòng; kiểm tra preview, lỗi cột/dòng, trùng mã, dữ liệu không hợp lệ và tính toàn vẹn sau khi import.
3. **Phân công:** ghép sinh viên – doanh nghiệp – giảng viên; kiểm tra xung đột, quyền xem/sửa và phân bổ tải.
4. **Nghiệm thu:** QA chạy luồng từ import đến phân công, báo cáo và xuất bảng điểm; chỉ sửa lỗi có thể tái hiện, không viết lại tính năng đang đáp ứng yêu cầu.

### Cấp 2 — Giảng viên, Sinh viên, Doanh nghiệp

- **Sinh viên:** kiểm thử luồng nộp đề cương/báo cáo tuần/cuối kỳ trên điện thoại; trạng thái nháp, gửi, yêu cầu sửa và giới hạn tệp.
- **Giảng viên:** kiểm thử danh sách việc chờ, duyệt/yêu cầu sửa, rubric, tính điểm và xuất kết quả.
- **Doanh nghiệp:** giữ mô hình đối tác thuộc tenant trường. Kiểm thử luồng tiếp nhận và đánh giá bằng liên kết bảo mật hiện có; xác nhận liên kết hết hạn/đã dùng không thể gửi lại và chỉ hiển thị dữ liệu cần thiết. Không yêu cầu doanh nghiệp tạo tenant hoặc tài khoản HR nhiều cấp trong phạm vi này.
- **Nghiệm thu:** chạy end-to-end qua cả ba vai trò với dữ liệu một học kỳ mẫu; kiểm tra quyền, tenant isolation và trải nghiệm mobile.

## 6. Quy tắc bàn giao Dev

- Mỗi bước có PR nhỏ, test tương ứng, ảnh/chứng cứ QA và ghi chú migration nếu có.
- Không gộp refactor hoặc tính năng ngoài phạm vi vào PR hoàn thiện từng bước.
- Không triển khai migration, xóa dữ liệu hoặc thay đổi cấu hình production nếu chưa có xác nhận và backup.
- Cập nhật tài liệu vận hành khi hành vi upload, quota, export hoặc cấu hình branding thay đổi.
