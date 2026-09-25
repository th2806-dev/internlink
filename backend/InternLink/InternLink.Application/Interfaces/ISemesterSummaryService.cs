using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

/// <summary>
/// Nội dung báo cáo tổng kết công tác thực tập cấp KHOA, lưu theo (Học kỳ, Khoa).
/// Tách khỏi nội dung tổng kết của giảng viên (ILecturerService.SaveSemesterSummaryAsync)
/// để admin khoa soạn báo cáo của toàn khoa và hệ thống inject vào Word C22A khi admin xuất.
/// </summary>
public interface ISemesterSummaryService
{
    /// <param name="departmentId">Khoa sở hữu báo cáo; null = báo cáo toàn hệ thống (SuperAdmin).</param>
    Task<LecturerSemesterSummaryDto?> GetAsync(Guid semesterId, Guid? departmentId);

    /// <param name="departmentId">Khoa sở hữu báo cáo; null = báo cáo toàn hệ thống (SuperAdmin).</param>
    Task<LecturerSemesterSummaryDto?> SaveAsync(Guid semesterId, Guid? departmentId, SaveLecturerSemesterSummaryRequest request);
}
