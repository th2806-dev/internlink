using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

/// <summary>
/// Service interface for Evaluation management operations
/// </summary>
public interface IEvaluationService
{
    /// <summary>
    /// Get all evaluations with pagination
    /// </summary>
    Task<IEnumerable<EvaluationListItemDto>> GetAllEvaluationsAsync(int skip = 0, int take = 100, Guid? lecturerId = null);

    /// <summary>
    /// Get evaluations with filtering, sorting, and pagination
    /// </summary>
    Task<PaginatedResponse<EvaluationListItemDto>> GetEvaluationsWithFilterAsync(EvaluationFilterRequest filter, Guid? lecturerId = null);

    /// <summary>
    /// Get a specific evaluation by ID with full details
    /// </summary>
    Task<EvaluationDetailDto?> GetEvaluationByIdAsync(Guid id);
    Task<EvaluationDetailDto?> GetEvaluationByIdAsync(Guid id, Guid userId, bool isLecturerOrAdmin);
    Task<EvaluationScoresResponse?> GetEvaluationScoresAsync(Guid id, Guid userId, bool isLecturerOrAdmin);

    /// <summary>
    /// Get evaluation for a specific internship (only one per internship)
    /// </summary>
    Task<EvaluationDetailDto?> GetEvaluationByInternshipAsync(Guid internshipId);
    Task<EvaluationDetailDto?> GetEvaluationByInternshipAsync(Guid internshipId, Guid userId, bool isLecturerOrAdmin);
    Task<IEnumerable<WeeklyQualityAverageDto>?> GetWeeklyQualityAveragesAsync(Guid internshipId, Guid userId, bool isLecturerOrAdmin);

    /// <summary>
    /// Get evaluations for a specific student
    /// </summary>
    Task<IEnumerable<EvaluationListItemDto>> GetEvaluationsByStudentAsync(Guid studentId, int skip = 0, int take = 100, Guid? lecturerId = null);

    /// <summary>
    /// Get evaluations for a specific company
    /// </summary>
    Task<IEnumerable<EvaluationListItemDto>> GetEvaluationsByCompanyAsync(Guid companyId, int skip = 0, int take = 100, Guid? lecturerId = null);

    /// <summary>
    /// Create a new evaluation (lecturer can enter scores and comments)
    /// </summary>
    Task<EvaluationDetailDto> CreateEvaluationAsync(CreateEvaluationRequest request, Guid evaluatedById);

    /// <summary>
    /// Update an evaluation (scores and comments)
    /// </summary>
    Task<EvaluationDetailDto?> UpdateEvaluationAsync(Guid id, UpdateEvaluationRequest request, Guid? actorUserId = null);

    /// <summary>
    /// Finalize an evaluation (marks as complete)
    /// </summary>
    Task<EvaluationDetailDto?> FinalizeEvaluationAsync(Guid id, Guid? actorUserId = null);
    Task<EvaluationDetailDto?> UpdateDefenseAsync(Guid id, UpdateDefenseRequest request, Guid actorUserId);

    /// <summary>
    /// Delete an evaluation (only if not finalized)
    /// </summary>
    Task<bool> DeleteEvaluationAsync(Guid id, Guid? actorUserId = null);

    /// <summary>
    /// Get average grade across multiple evaluations
    /// </summary>
    Task<decimal> GetAverageGradeAsync(IEnumerable<Guid> evaluationIds);

    /// <summary>
    /// Get average grade for a company (across all its evaluations)
    /// </summary>
    Task<decimal> GetAverageGradeByCompanyAsync(Guid companyId, Guid? lecturerId = null);

    /// <summary>
    /// Check if evaluation exists for internship
    /// </summary>
    Task<bool> HasEvaluationAsync(Guid internshipId);
    Task<bool> HasEvaluationAsync(Guid internshipId, Guid userId, bool isLecturerOrAdmin);

    /// <summary>
    /// Get count of finalized evaluations
    /// </summary>
    Task<int> GetFinalizedEvaluationCountAsync(Guid? lecturerId = null);

    /// <summary>
    /// Get count of draft evaluations (not finalized)
    /// </summary>
    Task<int> GetDraftEvaluationCountAsync(Guid? lecturerId = null);

    /// <summary>
    /// Get evaluation score breakdown (how many evaluations in each grade range)
    /// </summary>
    Task<Dictionary<string, int>> GetEvaluationDistributionAsync(Guid? lecturerId = null);
}
