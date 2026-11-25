namespace InternLink.Application.Exceptions;

/// <summary>Raised when the anonymization preview no longer matches the current eligible set.</summary>
public sealed class AnonymizationPreviewChangedException : Exception
{
    public AnonymizationPreviewChangedException()
        : base("Số hồ sơ đủ điều kiện đã thay đổi. Hãy tải lại bản xem trước trước khi thực thi.")
    {
    }
}
