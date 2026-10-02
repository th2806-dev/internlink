using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ILecturerParticipationHistoryService
{
    Task<LecturerParticipationHistoryDto?> GetSemesterHistoryAsync(Guid lecturerId, Guid semesterId);
}