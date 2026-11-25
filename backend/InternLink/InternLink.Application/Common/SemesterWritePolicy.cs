using InternLink.Domain.Entities;
using InternLink.Domain.Enums;

namespace InternLink.Application.Common;

public static class SemesterWritePolicy
{
    public const string LockedMessage = "Học kỳ đã khóa sổ, không thể thay đổi dữ liệu";

    public static void EnsureWritable(Semester? semester)
    {
        if (semester?.Status == SemesterStatus.Completed)
            throw new InvalidOperationException(LockedMessage);
    }
}
