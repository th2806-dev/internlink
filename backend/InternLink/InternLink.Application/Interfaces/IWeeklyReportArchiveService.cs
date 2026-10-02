using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface IWeeklyReportArchiveService
{
    Task<IReadOnlyList<WeeklyReportArchiveStudentDto>?> GetStudentsAsync(Guid semesterId, Guid departmentId);

    Task<WeeklyReportArchiveZipDto?> CreateZipAsync(
        Guid semesterId,
        Guid departmentId,
        Guid userId,
        Guid? studentId = null);
}