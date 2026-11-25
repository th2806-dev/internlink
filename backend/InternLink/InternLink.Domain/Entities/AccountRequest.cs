using InternLink.Domain.Enums;

namespace InternLink.Domain.Entities;

/// <summary>
/// Represents a user account request (password reset, unlock, info change, etc.)
/// Submitted by users, processed by SuperAdmin.
/// </summary>
public class AccountRequest : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    /// <summary>
    /// Who submitted the request (User ID). Null for anonymous/guest requests.
    /// </summary>
    public Guid? RequesterUserId { get; set; }
    public User? RequesterUser { get; set; }

    /// <summary>
    /// Requester's display code (MSSV, staff code, or company code)
    /// </summary>
    public string RequesterCode { get; set; } = null!;

    /// <summary>
    /// Requester's full name
    /// </summary>
    public string RequesterName { get; set; } = null!;

    /// <summary>
    /// Requester's email
    /// </summary>
    public string? RequesterEmail { get; set; }

    /// <summary>
    /// Requester's phone
    /// </summary>
    public string? RequesterPhone { get; set; }

    /// <summary>
    /// Requester's role: Student, Lecturer, Enterprise
    /// </summary>
    public Role RequesterRole { get; set; }

    /// <summary>
    /// Department or class info
    /// </summary>
    public string? DepartmentOrClass { get; set; }

    /// <summary>
    /// Type of request: "Quên mật khẩu", "Mở khóa tài khoản", "Đổi Email", etc.
    /// </summary>
    public string RequestType { get; set; } = null!;

    /// <summary>
    /// Detailed description from the requester
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Priority: urgent, high, medium, low
    /// </summary>
    public string Priority { get; set; } = "medium";

    /// <summary>
    /// Current status: pending, approved, rejected, need_info
    /// </summary>
    public AccountRequestStatus Status { get; set; } = AccountRequestStatus.Pending;

    /// <summary>
    /// Name of the admin who processed this request
    /// </summary>
    public string? ProcessorName { get; set; }

    /// <summary>
    /// When the request was processed
    /// </summary>
    public DateTime? ProcessedAt { get; set; }

    /// <summary>
    /// Admin's note after processing
    /// </summary>
    public string? AdminNote { get; set; }

    /// <summary>
    /// Optional attachment file URL
    /// </summary>
    public string? AttachmentUrl { get; set; }

    /// <summary>
    /// Attachment display name
    /// </summary>
    public string? AttachmentName { get; set; }

    /// <summary>
    /// JSON-serialized list of requested changes:
    /// [{ "field": "...", "oldValue": "...", "newValue": "..." }]
    /// </summary>
    public string? RequestedChangesJson { get; set; }
}
