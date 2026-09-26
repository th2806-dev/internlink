namespace InternLink.Shared.Responses;

/// <summary>
/// Danh mục message lỗi tiếng Việt dùng chung backend (controller ApiError + service exceptions).
/// Nguyên tắc: câu kết thúc bằng dấu chấm, xưng hô trung tính "Bạn", không trộn tiếng Anh.
/// Placeholder giữ đúng vị trí qua string.Format / interpolation.
/// </summary>
public static class ErrorMessage
{
    // ── Auth / Access ──────────────────────────────────────────────
    public const string Unauthorized = "Chưa xác thực. Vui lòng đăng nhập.";
    public const string InvalidCredentials = "Tên đăng nhập hoặc mật khẩu không đúng.";
    public const string InvalidAccessToken = "Mã truy cập không hợp lệ hoặc đã hết hạn.";
    public const string InvalidUserIdentityInToken = "Thông tin người dùng trong mã xác thực không hợp lệ.";
    public const string InvalidRefreshToken = "Mã làm mới không hợp lệ.";
    public const string RefreshTokenSecurityViolation = "Phiên đăng nhập đã bị kết thúc do phát hiện rủi ro bảo mật. Vui lòng đăng nhập lại.";
    public const string RefreshTokenExpired = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    public const string TokenIdentifierMismatch = "Mã phiên đăng nhập không khớp. Vui lòng đăng nhập lại.";
    public const string UserInactive = "Tài khoản đã bị vô hiệu hóa hoặc không còn hoạt động.";
    public const string CurrentPasswordInvalid = "Mật khẩu hiện tại không đúng.";
    public const string InvalidOrExpiredPasswordResetLink = "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.";
    public const string AccessDenied = "Bạn không có quyền thực hiện thao tác này.";
    public const string ForbiddenRole = "Tài khoản của bạn không được phép truy cập chức năng này.";

    // ── Server / Validation generic ───────────────────────────────
    public const string InternalServerError = "Đã xảy ra lỗi. Vui lòng thử lại sau.";
    public const string InvalidInput = "Dữ liệu gửi lên không hợp lệ.";
    public const string SkipMustBeNonNegative = "Tham số phân trang 'skip' phải lớn hơn hoặc bằng 0.";
    public const string TakeMustBeInRange = "Tham số phân trang 'take' phải nằm trong khoảng từ 1 đến 1000.";
    public const string InvalidPagination = "Tham số phân trang không hợp lệ.";
    public const string ImportProcessingError = "Lỗi khi xử lý tệp import.";

    // ── Access denied per resource ────────────────────────────────
    public const string NoAccessInternship = "Bạn không có quyền truy cập đợt thực tập này.";
    public const string NoAccessWeeklyReport = "Bạn không có quyền truy cập báo cáo tuần này.";
    public const string NoAccessSubmission = "Bạn không có quyền truy cập bài nộp này.";
    public const string NoAccessEvaluation = "Bạn không có quyền truy cập đánh giá này.";
    public const string NoAccessDocument = "Bạn không có quyền truy cập tài liệu này.";
    public const string NoAccessFeedback = "Bạn không có quyền truy cập phản hồi này.";
    public const string NoAccessFile = "Bạn không có quyền tải tệp này.";
    public const string NoAccessInternshipDocuments = "Bạn không có quyền truy cập tài liệu của đợt thực tập này.";
    public const string NotOwnerInternship = "Đợt thực tập không thuộc về sinh viên hiện tại.";
    public const string NotOwnerSubmission = "Bài nộp không thuộc về sinh viên hiện tại.";
    public const string OnlyOwnFeedback = "Bạn chỉ được chỉnh sửa phản hồi do chính mình viết.";
    public const string OnlyEvaluateAssigned = "Bạn chỉ được đánh giá đợt thực tập được phân công cho mình.";
    public const string NotSemesterMember = "Bạn không được phân công vào học kỳ này.";

    // ── Not found (helper) ────────────────────────────────────────
    public const string UserNotFound = "Không tìm thấy người dùng.";
    public const string StudentNotFound = "Không tìm thấy sinh viên.";
    public const string StudentProfileNotFound = "Không tìm thấy hồ sơ sinh viên.";
    public const string LecturerNotFound = "Không tìm thấy giảng viên.";
    public const string LecturerProfileNotFound = "Không tìm thấy hồ sơ giảng viên.";
    public const string LecturerProfileMissing = "Không tìm thấy hồ sơ giảng viên cho tài khoản hiện tại.";
    public const string CompanyNotFound = "Không tìm thấy doanh nghiệp.";
    public const string CompanyNotForYourStudents = "Không tìm thấy doanh nghiệp tiếp nhận sinh viên của bạn.";
    public const string DepartmentNotFound = "Không tìm thấy khoa.";
    public const string SemesterNotFound = "Không tìm thấy học kỳ.";
    public const string InternshipNotFound = "Không tìm thấy đợt thực tập.";
    public const string InternshipNotFoundOrDenied = "Không tìm thấy đợt thực tập hoặc bạn không có quyền truy cập.";
    public const string WeeklyReportNotFound = "Không tìm thấy báo cáo tuần.";
    public const string SubmissionNotFound = "Không tìm thấy bài nộp.";
    public const string AssetNotFound = "Không tìm thấy tệp đính kèm của bài nộp.";
    public const string EvaluationNotFound = "Không tìm thấy đánh giá.";
    public const string DocumentNotFound = "Không tìm thấy tài liệu.";
    public const string FileNotFound = "Không tìm thấy tệp trên máy chủ.";
    public const string NotificationNotFound = "Không tìm thấy thông báo.";
    public const string NotificationCampaignNotFound = "Không tìm thấy chiến dịch thông báo.";
    public const string FeedbackNotFound = "Không tìm thấy phản hồi.";
    public const string AssignmentNotFound = "Không tìm thấy phân công.";
    public const string AccountRequestNotFound = "Không tìm thấy yêu cầu tài khoản.";
    public const string AttendanceSessionNotFound = "Không tìm thấy buổi gặp.";
    public const string AttendanceSessionDeleteDenied = "Không tìm thấy buổi gặp hoặc bạn không có quyền xóa.";
    public const string SelectedDepartmentNotFoundOrInactive = "Khoa được chọn không tồn tại hoặc đã ngừng hoạt động.";
    public const string NoActiveSemester = "Không có học kỳ đang hoạt động.";
    public const string StudentInternshipMissing = "Bạn chưa có thông tin thực tập.";

    public static string NotFound(string entityName) => $"Không tìm thấy {entityName}.";
    public static string SemesterNotFoundById(object id) => $"Không tìm thấy học kỳ có mã {id}.";
    public static string InternshipNotFoundById(object id) => $"Không tìm thấy đợt thực tập có mã {id}.";

    // ── File / Upload ─────────────────────────────────────────────
    public const string FileRequired = "Vui lòng đính kèm tệp.";
    public const string FileEmpty = "Tệp đính kèm đang trống.";
    public const string ImageFileRequired = "Vui lòng chọn tệp ảnh.";
    public const string NoValidFilesUploaded = "Không có tệp hợp lệ nào được tải lên.";
    public const string NoSubmissionFiles = "Không tìm thấy tệp bài nộp.";
    public const string ExcelStreamRequired = "Vui lòng cung cấp tệp Excel.";
    public const string ExcelFileEmpty = "Tệp Excel đang trống.";
    public const string ExcelNoWorksheet = "Tệp Excel không có trang tính nào.";
    public const string ExcelFileRequired = "Vui lòng chọn tệp Excel để import.";
    public const string OnlyXlsxSupported = "Hệ thống chỉ chấp nhận tệp Excel (.xlsx).";
    public const string OnlyXlsxOrXlsSupported = "Chỉ chấp nhận định dạng tệp .xlsx hoặc .xls.";
    public const string OnlyImageSupported = "Chỉ chấp nhận tệp ảnh .jpg, .png, .webp.";
    public static string FileTypeNotAllowed(string extension) => $"Hệ thống không chấp nhận tệp '{extension}'.";

    // ── Field validation ──────────────────────────────────────────
    public const string StudentNumberRequired = "Vui lòng nhập mã số sinh viên.";
    public const string CompanyNameRequired = "Vui lòng nhập tên doanh nghiệp.";
    public const string IndustryRequired = "Vui lòng nhập lĩnh vực hoạt động.";
    public const string NameRequired = "Vui lòng nhập tên.";
    public const string TermRequired = "Vui lòng nhập học kỳ (Term).";
    public const string AcademicYearRequired = "Vui lòng nhập năm học.";
    public const string SemesterIdRequired = "Vui lòng chỉ định học kỳ.";
    public const string LecturerIdRequired = "Cần chỉ định mã giảng viên (lecturerId).";
    public const string AccessTokenAndRefreshTokenRequired = "Vui lòng cung cấp đủ mã truy cập và mã làm mới.";
    public const string RefreshTokenRequired = "Vui lòng cung cấp mã làm mới.";
    public const string TokenNotFoundOrRevoked = "Token không tồn tại hoặc đã bị thu hồi.";

    // ── Weekly report business rules ──────────────────────────────
    public static string WeekOutOfRange(int totalWeeks) => $"Tuần báo cáo phải nằm trong khoảng 1 đến {totalWeeks}.";
    public const string OnlyDraftOrRevisionUpdatable = "Chỉ báo cáo ở trạng thái nháp hoặc yêu cầu chỉnh sửa mới được cập nhật.";
    public const string OnlyDraftOrRevisionSubmittable = "Chỉ báo cáo ở trạng thái nháp hoặc yêu cầu chỉnh sửa mới được nộp.";
    public const string SubmissionPaused = "Học kỳ này đang tạm dừng nhận bài nộp cho lịch trên. Vui lòng liên hệ giảng viên hướng dẫn.";
    public static string SubmissionNotOpenYet(string title, DateTime startDate) =>
        $"Bài nộp cho {title} chưa mở nhận trước ngày {startDate:dd/MM/yyyy HH:mm}.";
    public static string SubmissionLateNotAllowed(string title, DateTime dueDate) =>
        $"Hạn nộp {title} đã kết thúc vào ngày {dueDate:dd/MM/yyyy HH:mm}. Không cho phép nộp muộn.";
    public const string DuplicateWeeklyReport = "Báo cáo tuần cho tuần này đã tồn tại.";
    public const string ReplyCommentRequired = "Vui lòng nhập nội dung phản hồi.";

    // ── Grading business rules ────────────────────────────────────
    public const string InvalidQualityLevel = "Mức chất lượng phải là 1 trong các mức: 1.0, 2.0, 3.5, 4.0, 5.0.";
    public static string InvalidQualityLevelWeek(int week) =>
        $"Mức rubric tuần {week} phải là 1 trong các mức: 1.0, 2.0, 3.5, 4.0, 5.0.";
    public static string NotEligibleForOralExam(string reasons) =>
        $"Sinh viên này KHÔNG đủ điều kiện dự thi, không thể nhập Điểm thi. Lý do: {reasons}";
    public const string InvalidStatusValue = "Trạng thái gửi lên không hợp lệ.";
    public const string InvalidSubmissionType = "Loại bài nộp không hợp lệ.";
    public static string InvalidStatusValueDetail(string status) => $"Trạng thái không hợp lệ: {status}";
    public static string InvalidSubmissionTypeDetail(string type) => $"Loại bài nộp không hợp lệ: {type}";
    public const string ProductRequiresFinalReport = "Phải nộp Báo cáo thực tập tốt nghiệp trước khi nộp sản phẩm thực tế.";
    public const string EvaluationAlreadyExists = "Đợt thực tập này đã có đánh giá.";
    public const string OnlyDraftEvaluationEditable = "Chỉ đánh giá ở trạng thái nháp mới được sửa.";
}
