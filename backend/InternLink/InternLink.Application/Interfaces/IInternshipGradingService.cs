using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface IInternshipGradingService
{
    Task<InternshipSummaryResponseDto> GetSummaryAsync(Guid semesterId, Guid? lecturerId, Guid? departmentId, string? className = null);
    Task<InternshipStudentGradeDto?> SaveGradeAsync(Guid semesterId, SaveInternshipGradeRequestDto dto, Guid actorUserId, Guid? actorLecturerId);

    /// <summary>
    /// Xuất Excel "Bảng điểm toàn khóa" trực tiếp từ dữ liệu grading (nguồn sự thật),
    /// đã scoped theo giảng viên/khoa. Trả về byte[] file .xlsx.
    /// </summary>
    Task<byte[]> ExportGradesExcelAsync(Guid semesterId, Guid? lecturerId, Guid? departmentId, string? className = null, CancellationToken cancellationToken = default);
}
