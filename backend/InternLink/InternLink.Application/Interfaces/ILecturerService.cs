using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ILecturerService
{
    Task<LecturerOverviewDto?> GetMeAsync(Guid userId);
    Task<LecturerDashboardStatsDto> GetDashboardStatsAsync(Guid userId, Guid? semesterId = null);
    Task<IEnumerable<LecturerStudentListItemDto>> GetAssignedStudentsAsync(Guid userId, string? search = null, string? status = null, Guid? semesterId = null);
    Task<IEnumerable<LecturerCompanySummaryDto>> GetAssignedCompaniesAsync(Guid userId, Guid? semesterId = null);
    Task<IEnumerable<InternshipDto>> GetInternshipsAsync(Guid userId, Guid? semesterId = null);
    Task<InternshipDetailDto?> GetInternshipAsync(Guid internshipId, Guid userId);
    Task<IEnumerable<SubmissionDto>> GetSubmissionsByInternshipAsync(Guid internshipId, Guid userId);
    Task<IEnumerable<SubmissionDto>> GetAssignedSubmissionsAsync(Guid userId, Guid? semesterId = null);
    Task<PaginatedResponse<WeeklyReportDto>> GetAssignedWeeklyReportsAsync(Guid userId, WeeklyReportFilterRequest filter);
    Task<FeedbackDto?> AddFeedbackAsync(Guid submissionId, Guid authorId, CreateFeedbackRequest request);
    Task<byte[]> ExportEndOfTermExcelAsync(Guid userId);
    Task<LecturerSemesterSummaryDto?> GetSemesterSummaryAsync(Guid userId, Guid semesterId);
    Task<LecturerSemesterSummaryDto?> SaveSemesterSummaryAsync(Guid userId, Guid semesterId, SaveLecturerSemesterSummaryRequest request);

    // Student notes
    Task<bool> UpdateStudentNotesAsync(Guid userId, Guid internshipId, string notes);

    // Bulk notify & individual remind
    Task<int> NotifyAssignedStudentsAsync(Guid userId, string title, string message);
    Task<bool> RemindStudentAsync(Guid userId, Guid studentOrInternshipId, string? title = null, string? message = null);

    // Analytics endpoints
    Task<List<WeeklyTrendDto>> GetWeeklyTrendAsync(Guid userId, Guid? semesterId = null);
    Task<GradeDistributionDto> GetGradeDistributionAsync(Guid userId, Guid? semesterId = null);
    Task<List<CompanyStatsDto>> GetCompanyStatsAsync(Guid userId, Guid? semesterId = null);
    Task<CompanyDetailDto?> GetCompanyDetailAsync(Guid companyId, Guid userId, Guid? semesterId = null);
    Task<LecturerActivityStatsDto> GetActivityStatsAsync(Guid userId, Guid? semesterId = null);
}

