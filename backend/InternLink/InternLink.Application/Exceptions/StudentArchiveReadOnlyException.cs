namespace InternLink.Application.Exceptions;

public sealed class StudentArchiveReadOnlyException : InvalidOperationException
{
    public StudentArchiveReadOnlyException()
        : base("Tài khoản đang ở chế độ chỉ xem; không thể đổi hoặc khôi phục mật khẩu.")
    {
    }
}
