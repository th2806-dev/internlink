using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface IAttendanceService
{
    Task<List<AttendanceSessionDto>> GetLecturerSessionsAsync(Guid lecturerId, Guid semesterId);
    Task<AttendanceSessionDetailDto?> GetSessionDetailAsync(Guid sessionId, Guid? lecturerId = null);
    Task<AttendanceSessionDetailDto> CreateSessionAsync(Guid lecturerId, CreateAttendanceSessionDto dto);
    Task<AttendanceSessionDetailDto> UpdateSessionAsync(Guid sessionId, Guid lecturerId, UpdateAttendanceSessionDto dto);
    Task<bool> DeleteSessionAsync(Guid sessionId, Guid lecturerId);
    Task<AttendanceSessionDetailDto> MarkAttendanceAsync(Guid sessionId, Guid lecturerId, MarkAttendanceDto dto);
    Task<StudentAttendanceOverviewDto> GetStudentAttendanceAsync(Guid studentId, Guid semesterId);
    Task<AdminAttendanceReportDto> GetAdminAttendanceReportAsync(Guid semesterId, Guid? departmentId = null);
    Task<List<AttendanceRecordDto>> GetStudentAttendanceForLecturerAsync(Guid lecturerId, Guid studentId, Guid semesterId);
}
