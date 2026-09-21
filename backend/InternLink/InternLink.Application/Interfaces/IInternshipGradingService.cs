using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface IInternshipGradingService
{
    Task<InternshipSummaryResponseDto> GetSummaryAsync(Guid semesterId, Guid? lecturerId, Guid? departmentId, string? className = null);
    Task<InternshipStudentGradeDto?> SaveGradeAsync(Guid semesterId, SaveInternshipGradeRequestDto dto, Guid actorUserId, Guid? actorLecturerId);
}
