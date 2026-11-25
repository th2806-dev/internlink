namespace InternLink.Application.Exceptions;

public sealed class TenantStorageQuotaExceededException : InvalidOperationException
{
    public TenantStorageQuotaExceededException(long currentBytes, long quotaBytes, long requestedBytes)
        : base($"Dung lượng lưu trữ đã vượt hạn mức của gói. Đang dùng {currentBytes:N0} / {quotaBytes:N0} bytes; cần thêm {requestedBytes:N0} bytes.")
    {
        CurrentBytes = currentBytes;
        QuotaBytes = quotaBytes;
        RequestedBytes = requestedBytes;
    }

    public long CurrentBytes { get; }
    public long QuotaBytes { get; }
    public long RequestedBytes { get; }
}
