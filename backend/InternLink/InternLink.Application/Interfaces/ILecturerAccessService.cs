namespace InternLink.Application.Interfaces;

/// <summary>
/// Resolves the lecturer profile for a login user and checks internship assignment.
/// </summary>
public interface ILecturerAccessService
{
    Task<Guid?> ResolveLecturerIdAsync(Guid userId);

    /// <summary>
    /// True when the user is the assigned lecturer, the student owner, or SuperAdmin.
    /// </summary>
    Task<bool> CanAccessInternshipAsync(Guid internshipId, Guid userId, bool allowStudentOwner = true);

    /// <summary>Throws UnauthorizedAccessException when the lecturer is not assigned.</summary>
    Task EnsureAssignedLecturerAsync(Guid internshipId, Guid userId);

    /// <summary>
    /// Giảng viên được ghi dữ liệu theo học kỳ (Cấu hình báo cáo) khi:
    /// được phân công hướng dẫn ít nhất 1 internship trong kỳ đó, HOẶC có trong danh sách
    /// «Cấu hình báo cáo» của kỳ (<see cref="Domain.Entities.SemesterLecturer"/>), HOẶC là SuperAdmin.
    /// </summary>
    Task<bool> CanManageSemesterAsync(Guid semesterId, Guid userId);

    /// <summary>Throws UnauthorizedAccessException khi giảng viên không thuộc học kỳ.</summary>
    Task EnsureCanManageSemesterAsync(Guid semesterId, Guid userId);
}
