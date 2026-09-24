using System.Text.Json;
using AutoMapper;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

/// <summary>
/// Service for managing Evaluation entities and grading logic
/// </summary>
public class EvaluationService : IEvaluationService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;

    public EvaluationService(AppDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    private static IQueryable<Evaluation> ApplyLecturerScope(IQueryable<Evaluation> query, Guid? lecturerId)
    {
        if (lecturerId.HasValue)
            return query.Where(e => e.Internship.LecturerId == lecturerId.Value);
        return query;
    }

    public async Task<IEnumerable<EvaluationListItemDto>> GetAllEvaluationsAsync(int skip = 0, int take = 100, Guid? lecturerId = null)
    {
        var query = _db.Evaluations.Where(e => !e.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);

        var evaluations = await query
            .Include(e => e.Internship)
                .ThenInclude(i => i.Student)
            .Include(e => e.Internship)
                .ThenInclude(i => i.Company)
            .Include(e => e.EvaluatedBy)
            .OrderByDescending(e => e.EvaluatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return evaluations.Select(e => new EvaluationListItemDto
        {
            Id = e.Id,
            InternshipId = e.InternshipId,
            StudentName = e.Internship?.Student?.FullName,
            CompanyName = e.Internship?.Company?.CompanyName,
            FinalGrade = e.FinalGrade,
            EvaluatedAt = e.EvaluatedAt,
            IsFinalized = e.IsFinalized,
            EvaluatedBy = e.EvaluatedBy != null ? new UserSummaryDto 
            { 
                Id = e.EvaluatedBy.Id, 
                FullName = e.EvaluatedBy.FullName, 
                Email = e.EvaluatedBy.Email 
            } : null
        });
    }

    public async Task<PaginatedResponse<EvaluationListItemDto>> GetEvaluationsWithFilterAsync(EvaluationFilterRequest filter, Guid? lecturerId = null)
    {
        var query = _db.Evaluations
            .Where(e => !e.IsDeleted)
            .Include(e => e.Internship)
                .ThenInclude(i => i.Student)
            .Include(e => e.Internship)
                .ThenInclude(i => i.Company)
            .Include(e => e.EvaluatedBy)
            .AsQueryable();

        query = ApplyLecturerScope(query, lecturerId);

        // Apply filters
        if (filter.InternshipId.HasValue)
            query = query.Where(e => e.InternshipId == filter.InternshipId);

        if (filter.StudentId.HasValue)
            query = query.Where(e => e.Internship.StudentId == filter.StudentId);

        if (filter.CompanyId.HasValue)
            query = query.Where(e => e.Internship.CompanyId == filter.CompanyId);

        if (filter.IsFinalized.HasValue)
            query = query.Where(e => e.IsFinalized == filter.IsFinalized.Value);

        if (filter.MinGrade.HasValue)
            query = query.Where(e => e.FinalGrade >= filter.MinGrade.Value);

        if (filter.MaxGrade.HasValue)
            query = query.Where(e => e.FinalGrade <= filter.MaxGrade.Value);

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var searchLower = filter.SearchTerm.ToLower();
            query = query.Where(e =>
                e.Internship.Student.FullName.ToLower().Contains(searchLower) ||
                e.Internship.Company.CompanyName.ToLower().Contains(searchLower) ||
                (e.Comments != null && e.Comments.ToLower().Contains(searchLower)));
        }

        if (filter.EvaluatedFrom.HasValue)
            query = query.Where(e => e.EvaluatedAt >= filter.EvaluatedFrom.Value);

        if (filter.EvaluatedTo.HasValue)
            query = query.Where(e => e.EvaluatedAt <= filter.EvaluatedTo.Value);

        // Apply sorting
        query = ApplySorting(query, filter.SortBy, filter.SortOrder);

        // Get total count
        var totalCount = await query.CountAsync();

        // Apply pagination
        var evaluations = await query
            .Skip(filter.Skip)
            .Take(filter.Take)
            .ToListAsync();

        var items = evaluations.Select(e => new EvaluationListItemDto
        {
            Id = e.Id,
            InternshipId = e.InternshipId,
            StudentName = e.Internship?.Student?.FullName,
            CompanyName = e.Internship?.Company?.CompanyName,
            FinalGrade = e.FinalGrade,
            EvaluatedAt = e.EvaluatedAt,
            IsFinalized = e.IsFinalized,
            EvaluatedBy = e.EvaluatedBy != null ? new UserSummaryDto 
            { 
                Id = e.EvaluatedBy.Id, 
                FullName = e.EvaluatedBy.FullName, 
                Email = e.EvaluatedBy.Email 
            } : null
        });

        return new PaginatedResponse<EvaluationListItemDto>
        {
            Items = items,
            Total = totalCount,
            Skip = filter.Skip,
            Take = filter.Take
        };
    }

    public async Task<EvaluationDetailDto?> GetEvaluationByIdAsync(Guid id)
    {
        var evaluation = await _db.Evaluations
            .Include(e => e.Internship)
                .ThenInclude(i => i.Student)
            .Include(e => e.Internship)
                .ThenInclude(i => i.Company)
            .Include(e => e.EvaluatedBy)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

        if (evaluation == null)
            return null;

        return MapToDetailDto(evaluation);
    }

    public async Task<EvaluationDetailDto?> GetEvaluationByIdAsync(Guid id, Guid userId, bool isLecturerOrAdmin)
    {
        var evaluation = await _db.Evaluations
            .Include(e => e.Internship)
                .ThenInclude(i => i.Student)
            .Include(e => e.Internship)
                .ThenInclude(i => i.Company)
            .Include(e => e.Internship)
                .ThenInclude(i => i.Lecturer)
            .Include(e => e.EvaluatedBy)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

        if (evaluation == null)
            return null;

        var ownsInternship = evaluation.Internship?.Student?.UserId == userId;
        var isAssignedLecturer = evaluation.Internship?.Lecturer?.UserId == userId;

        if (!isLecturerOrAdmin && !ownsInternship)
            throw new UnauthorizedAccessException("You do not have access to this evaluation");

        if (isLecturerOrAdmin && !isAssignedLecturer && !ownsInternship)
        {
            var isSuperAdmin = await _db.Users
                .AnyAsync(u => u.Id == userId && u.Role == Domain.Enums.Role.SuperAdmin && !u.IsDeleted);
            if (!isSuperAdmin)
                throw new UnauthorizedAccessException("You do not have access to this evaluation");
        }

        return MapToDetailDto(evaluation);
    }

    public async Task<EvaluationScoresResponse?> GetEvaluationScoresAsync(Guid id, Guid userId, bool isLecturerOrAdmin)
    {
        var evaluation = await GetEvaluationByIdAsync(id, userId, isLecturerOrAdmin);
        if (evaluation == null)
            return null;

        var criteriaScoresJson = await _db.Evaluations
            .Where(item => item.Id == id && !item.IsDeleted)
            .Select(item => item.CriteriaScoresJson)
            .FirstOrDefaultAsync();

        var criteriaScores = string.IsNullOrWhiteSpace(criteriaScoresJson)
            ? new List<CriterionScoreDto>()
            : JsonSerializer.Deserialize<List<CriterionScoreDto>>(criteriaScoresJson)
              ?? new List<CriterionScoreDto>();

        return new EvaluationScoresResponse
        {
            EvaluationId = id,
            CriteriaScores = criteriaScores,
            FinalGrade = evaluation.FinalGrade,
            IsFinalized = evaluation.IsFinalized,
        };
    }

    public async Task<EvaluationDetailDto?> GetEvaluationByInternshipAsync(Guid internshipId)
    {
        var evaluation = await _db.Evaluations
            .Include(e => e.Internship)
                .ThenInclude(i => i.Student)
            .Include(e => e.Internship)
                .ThenInclude(i => i.Company)
            .Include(e => e.EvaluatedBy)
            .FirstOrDefaultAsync(e => e.InternshipId == internshipId && !e.IsDeleted);

        if (evaluation == null)
            return null;

        return MapToDetailDto(evaluation);
    }

    public async Task<EvaluationDetailDto?> GetEvaluationByInternshipAsync(Guid internshipId, Guid userId, bool isLecturerOrAdmin)
    {
        var evaluation = await _db.Evaluations
            .Include(e => e.Internship)
                .ThenInclude(i => i.Student)
            .Include(e => e.Internship)
                .ThenInclude(i => i.Company)
            .Include(e => e.Internship)
                .ThenInclude(i => i.Lecturer)
            .Include(e => e.EvaluatedBy)
            .FirstOrDefaultAsync(e => e.InternshipId == internshipId && !e.IsDeleted);

        if (evaluation == null)
            return null;

        var ownsInternship = evaluation.Internship?.Student?.UserId == userId;
        var isAssignedLecturer = evaluation.Internship?.Lecturer?.UserId == userId;

        if (!isLecturerOrAdmin && !ownsInternship)
            throw new UnauthorizedAccessException("You do not have access to this evaluation");

        if (isLecturerOrAdmin && !isAssignedLecturer && !ownsInternship)
        {
            var isSuperAdmin = await _db.Users
                .AnyAsync(u => u.Id == userId && u.Role == Domain.Enums.Role.SuperAdmin && !u.IsDeleted);
            if (!isSuperAdmin)
                throw new UnauthorizedAccessException("You do not have access to this evaluation");
        }

        return MapToDetailDto(evaluation);
    }

    public async Task<IEnumerable<EvaluationListItemDto>> GetEvaluationsByStudentAsync(Guid studentId, int skip = 0, int take = 100, Guid? lecturerId = null)
    {
        var query = _db.Evaluations
            .Where(e => e.Internship.StudentId == studentId && !e.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);

        var evaluations = await query
            .Include(e => e.Internship)
                .ThenInclude(i => i.Student)
            .Include(e => e.Internship)
                .ThenInclude(i => i.Company)
            .Include(e => e.EvaluatedBy)
            .OrderByDescending(e => e.EvaluatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return evaluations.Select(e => new EvaluationListItemDto
        {
            Id = e.Id,
            InternshipId = e.InternshipId,
            StudentName = e.Internship?.Student?.FullName,
            CompanyName = e.Internship?.Company?.CompanyName,
            FinalGrade = e.FinalGrade,
            EvaluatedAt = e.EvaluatedAt,
            IsFinalized = e.IsFinalized,
            EvaluatedBy = e.EvaluatedBy != null ? new UserSummaryDto 
            { 
                Id = e.EvaluatedBy.Id, 
                FullName = e.EvaluatedBy.FullName, 
                Email = e.EvaluatedBy.Email 
            } : null
        });
    }

    public async Task<IEnumerable<EvaluationListItemDto>> GetEvaluationsByCompanyAsync(Guid companyId, int skip = 0, int take = 100, Guid? lecturerId = null)
    {
        var query = _db.Evaluations
            .Where(e => e.Internship.CompanyId == companyId && !e.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);

        var evaluations = await query
            .Include(e => e.Internship)
                .ThenInclude(i => i.Student)
            .Include(e => e.Internship)
                .ThenInclude(i => i.Company)
            .Include(e => e.EvaluatedBy)
            .OrderByDescending(e => e.EvaluatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return evaluations.Select(e => new EvaluationListItemDto
        {
            Id = e.Id,
            InternshipId = e.InternshipId,
            StudentName = e.Internship?.Student?.FullName,
            CompanyName = e.Internship?.Company?.CompanyName,
            FinalGrade = e.FinalGrade,
            EvaluatedAt = e.EvaluatedAt,
            IsFinalized = e.IsFinalized,
            EvaluatedBy = e.EvaluatedBy != null ? new UserSummaryDto 
            { 
                Id = e.EvaluatedBy.Id, 
                FullName = e.EvaluatedBy.FullName, 
                Email = e.EvaluatedBy.Email 
            } : null
        });
    }

    public async Task<EvaluationDetailDto> CreateEvaluationAsync(CreateEvaluationRequest request, Guid evaluatedById)
    {
        // Verify internship exists and check lecturer assignment
        var internship = await _db.Internships
            .Include(i => i.Lecturer)
            .FirstOrDefaultAsync(i => i.Id == request.InternshipId && !i.IsDeleted);
        if (internship == null)
            throw new InvalidOperationException($"Internship with ID {request.InternshipId} not found");

        var isAssignedLecturer = internship.Lecturer?.UserId == evaluatedById;
        var isSuperAdmin = await _db.Users.AnyAsync(u => u.Id == evaluatedById && u.Role == Role.SuperAdmin && !u.IsDeleted);
        if (!isAssignedLecturer && !isSuperAdmin)
            throw new UnauthorizedAccessException("You can only evaluate internships assigned to you");

        // Check if evaluation already exists for this internship
        var existingEvaluation = await _db.Evaluations
            .FirstOrDefaultAsync(e => e.InternshipId == request.InternshipId && !e.IsDeleted);
        if (existingEvaluation != null)
            throw new InvalidOperationException($"An evaluation already exists for this internship");

        var evaluation = new Evaluation
        {
            Id = Guid.NewGuid(),
            InternshipId = request.InternshipId,
            EvaluatedById = evaluatedById,
            TechnicalScore = request.TechnicalScore,
            CommunicationScore = request.CommunicationScore,
            TeamworkScore = request.TeamworkScore,
            InitiativeScore = request.InitiativeScore,
            Comments = request.Comments,
            Strengths = request.Strengths,
            AreasForImprovement = request.AreasForImprovement,
            IsFinalized = request.IsFinalized,
            EvaluatedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        // Calculate final grade
        evaluation.CalculateFinalGrade();

        if (evaluation.IsFinalized && internship != null)
        {
            internship.Status = evaluation.FinalGrade > 0
                ? InternshipStatus.Graded
                : InternshipStatus.Completed;
            internship.UpdatedAt = DateTime.UtcNow;
            _db.Internships.Update(internship);
        }

        _db.Evaluations.Add(evaluation);
        await _db.SaveChangesAsync();

        // Reload with relations
        var created = await _db.Evaluations
            .Include(e => e.Internship)
                .ThenInclude(i => i.Student)
            .Include(e => e.Internship)
                .ThenInclude(i => i.Company)
            .Include(e => e.EvaluatedBy)
            .FirstOrDefaultAsync(e => e.Id == evaluation.Id);

        return MapToDetailDto(created!);
    }

    public async Task<EvaluationDetailDto?> UpdateEvaluationAsync(Guid id, UpdateEvaluationRequest request, Guid? actorUserId = null)
    {
        var evaluation = await _db.Evaluations
            .Include(e => e.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
        if (evaluation == null)
            return null;

        if (actorUserId.HasValue)
        {
            var isAssigned = evaluation.Internship?.Lecturer?.UserId == actorUserId.Value;
            var isSuperAdmin = await _db.Users.AnyAsync(u => u.Id == actorUserId.Value && u.Role == Role.SuperAdmin && !u.IsDeleted);
            if (!isAssigned && !isSuperAdmin)
                throw new UnauthorizedAccessException("You do not have permission to update this evaluation");
        }

        // Don't allow updates to finalized evaluations
        if (evaluation.IsFinalized)
            throw new InvalidOperationException("Cannot update a finalized evaluation");

        if (request.TechnicalScore.HasValue)
            evaluation.TechnicalScore = request.TechnicalScore.Value;

        if (request.CommunicationScore.HasValue)
            evaluation.CommunicationScore = request.CommunicationScore.Value;

        if (request.TeamworkScore.HasValue)
            evaluation.TeamworkScore = request.TeamworkScore.Value;

        if (request.InitiativeScore.HasValue)
            evaluation.InitiativeScore = request.InitiativeScore.Value;

        if (request.Comments != null)
            evaluation.Comments = request.Comments;

        if (request.Strengths != null)
            evaluation.Strengths = request.Strengths;

        if (request.AreasForImprovement != null)
            evaluation.AreasForImprovement = request.AreasForImprovement;

        if (request.IsFinalized.HasValue)
            evaluation.IsFinalized = request.IsFinalized.Value;

        evaluation.UpdatedAt = DateTime.UtcNow;

        // Recalculate final grade
        evaluation.CalculateFinalGrade();

        if (evaluation.IsFinalized && evaluation.Internship != null)
        {
            evaluation.Internship.Status = evaluation.FinalGrade > 0
                ? InternshipStatus.Graded
                : InternshipStatus.Completed;
            evaluation.Internship.UpdatedAt = DateTime.UtcNow;
            _db.Internships.Update(evaluation.Internship);
        }

        _db.Evaluations.Update(evaluation);
        await _db.SaveChangesAsync();

        // Reload with relations
        var updated = await _db.Evaluations
            .Include(e => e.Internship)
                .ThenInclude(i => i.Student)
            .Include(e => e.Internship)
                .ThenInclude(i => i.Company)
            .Include(e => e.EvaluatedBy)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

        return MapToDetailDto(updated!);
    }

    public async Task<EvaluationDetailDto?> FinalizeEvaluationAsync(Guid id, Guid? actorUserId = null)
    {
        var evaluation = await _db.Evaluations
            .Include(e => e.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
        if (evaluation == null)
            return null;

        if (actorUserId.HasValue)
        {
            var isAssigned = evaluation.Internship?.Lecturer?.UserId == actorUserId.Value;
            var isSuperAdmin = await _db.Users.AnyAsync(u => u.Id == actorUserId.Value && u.Role == Role.SuperAdmin && !u.IsDeleted);
            if (!isAssigned && !isSuperAdmin)
                throw new UnauthorizedAccessException("You do not have permission to finalize this evaluation");
        }

        evaluation.IsFinalized = true;
        evaluation.UpdatedAt = DateTime.UtcNow;

        if (evaluation.Internship != null)
        {
            evaluation.Internship.Status = evaluation.FinalGrade > 0
                ? InternshipStatus.Graded
                : InternshipStatus.Completed;
            evaluation.Internship.UpdatedAt = DateTime.UtcNow;
            _db.Internships.Update(evaluation.Internship);
        }

        _db.Evaluations.Update(evaluation);
        await _db.SaveChangesAsync();

        // Reload with relations
        var finalized = await _db.Evaluations
            .Include(e => e.Internship)
                .ThenInclude(i => i.Student)
            .Include(e => e.Internship)
                .ThenInclude(i => i.Company)
            .Include(e => e.EvaluatedBy)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

        return MapToDetailDto(finalized!);
    }

    public async Task<EvaluationDetailDto?> UpdateDefenseAsync(Guid id, UpdateDefenseRequest request, Guid actorUserId)
    {
        var evaluation = await _db.Evaluations
            .Include(e => e.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
        if (evaluation == null) return null;

        var isAssigned = evaluation.Internship?.Lecturer?.UserId == actorUserId;
        var isSuperAdmin = await _db.Users.AnyAsync(u => u.Id == actorUserId && u.Role == Role.SuperAdmin && !u.IsDeleted);
        if (!isAssigned && !isSuperAdmin)
            throw new UnauthorizedAccessException("You do not have permission to update defense details");

        evaluation.DefenseDate = request.DefenseDate;
        evaluation.DefenseStatus = request.DefenseStatus;
        evaluation.DefenseCouncilName = request.DefenseCouncilName?.Trim();
        evaluation.DefenseExaminerName = request.DefenseExaminerName?.Trim();
        evaluation.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var updated = await _db.Evaluations
            .Include(e => e.Internship).ThenInclude(i => i.Student)
            .Include(e => e.Internship).ThenInclude(i => i.Company)
            .Include(e => e.EvaluatedBy)
            .FirstAsync(e => e.Id == id);
        return MapToDetailDto(updated);
    }

    public async Task<bool> DeleteEvaluationAsync(Guid id, Guid? actorUserId = null)
    {
        var evaluation = await _db.Evaluations
            .Include(e => e.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
        if (evaluation == null)
            return false;

        if (actorUserId.HasValue)
        {
            var isAssigned = evaluation.Internship?.Lecturer?.UserId == actorUserId.Value;
            var isSuperAdmin = await _db.Users.AnyAsync(u => u.Id == actorUserId.Value && u.Role == Role.SuperAdmin && !u.IsDeleted);
            if (!isAssigned && !isSuperAdmin)
                throw new UnauthorizedAccessException("You do not have permission to delete this evaluation");
        }

        // Don't allow deletion of finalized evaluations
        if (evaluation.IsFinalized)
            throw new InvalidOperationException("Cannot delete a finalized evaluation");

        evaluation.IsDeleted = true;
        evaluation.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<decimal> GetAverageGradeAsync(IEnumerable<Guid> evaluationIds)
    {
        var ids = evaluationIds.ToList();
        if (!ids.Any())
            return 0;

        var average = await _db.Evaluations
            .Where(e => ids.Contains(e.Id) && !e.IsDeleted)
            .AverageAsync(e => e.FinalGrade);

        return Math.Round(average, 2);
    }

    public async Task<decimal> GetAverageGradeByCompanyAsync(Guid companyId, Guid? lecturerId = null)
    {
        var query = _db.Evaluations
            .Where(e => e.Internship.CompanyId == companyId && !e.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);

        var average = await query.AverageAsync(e => (decimal?)e.FinalGrade) ?? 0;

        return Math.Round(average, 2);
    }

    public async Task<bool> HasEvaluationAsync(Guid internshipId)
    {
        return await _db.Evaluations.AnyAsync(e => e.InternshipId == internshipId && !e.IsDeleted);
    }

    public async Task<bool> HasEvaluationAsync(Guid internshipId, Guid userId, bool isLecturerOrAdmin)
    {
        var internship = await _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Lecturer)
            .FirstOrDefaultAsync(i => i.Id == internshipId && !i.IsDeleted);

        if (internship == null)
            return false;

        var ownsInternship = internship.Student?.UserId == userId;
        var isAssignedLecturer = internship.Lecturer?.UserId == userId;

        if (!isLecturerOrAdmin && !ownsInternship)
            throw new UnauthorizedAccessException("You do not have access to this internship evaluation");

        if (isLecturerOrAdmin && !isAssignedLecturer && !ownsInternship)
        {
            var isSuperAdmin = await _db.Users
                .AnyAsync(u => u.Id == userId && u.Role == Domain.Enums.Role.SuperAdmin && !u.IsDeleted);
            if (!isSuperAdmin)
                throw new UnauthorizedAccessException("You do not have access to this internship evaluation");
        }

        return await _db.Evaluations.AnyAsync(e => e.InternshipId == internshipId && !e.IsDeleted);
    }

    public async Task<int> GetFinalizedEvaluationCountAsync(Guid? lecturerId = null)
    {
        var query = _db.Evaluations.Where(e => e.IsFinalized && !e.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);
        return await query.CountAsync();
    }

    public async Task<int> GetDraftEvaluationCountAsync(Guid? lecturerId = null)
    {
        var query = _db.Evaluations.Where(e => !e.IsFinalized && !e.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);
        return await query.CountAsync();
    }

    public async Task<Dictionary<string, int>> GetEvaluationDistributionAsync(Guid? lecturerId = null)
    {
        var query = _db.Evaluations.Where(e => !e.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);
        var evaluations = await query.ToListAsync();

        var distribution = new Dictionary<string, int>
        {
            { "Excellent (9-10)", 0 },
            { "Good (7-8.99)", 0 },
            { "Average (5-6.99)", 0 },
            { "Fair (3-4.99)", 0 },
            { "Poor (0-2.99)", 0 }
        };

        foreach (var eval in evaluations)
        {
            if (eval.FinalGrade >= 9)
                distribution["Excellent (9-10)"]++;
            else if (eval.FinalGrade >= 7)
                distribution["Good (7-8.99)"]++;
            else if (eval.FinalGrade >= 5)
                distribution["Average (5-6.99)"]++;
            else if (eval.FinalGrade >= 3)
                distribution["Fair (3-4.99)"]++;
            else
                distribution["Poor (0-2.99)"]++;
        }

        return distribution;
    }

    private EvaluationDetailDto MapToDetailDto(Evaluation evaluation)
    {
        return new EvaluationDetailDto
        {
            Id = evaluation.Id,
            InternshipId = evaluation.InternshipId,
            TechnicalScore = evaluation.TechnicalScore,
            CommunicationScore = evaluation.CommunicationScore,
            TeamworkScore = evaluation.TeamworkScore,
            InitiativeScore = evaluation.InitiativeScore,
            FinalGrade = evaluation.FinalGrade,
            QualityLevel = evaluation.QualityLevel,
            OralExamScore = evaluation.OralExamScore,
            HasCreativeProduct = evaluation.HasCreativeProduct,
            WeeklyQualityScores = string.IsNullOrWhiteSpace(evaluation.WeeklyQualityJson)
                ? null
                : JsonSerializer.Deserialize<Dictionary<int, decimal>>(evaluation.WeeklyQualityJson),
            Comments = evaluation.Comments,
            Strengths = evaluation.Strengths,
            AreasForImprovement = evaluation.AreasForImprovement,
            EvaluatedAt = evaluation.EvaluatedAt,
            UpdatedAt = evaluation.UpdatedAt,
            IsFinalized = evaluation.IsFinalized,
            DefenseDate = evaluation.DefenseDate,
            DefenseStatus = evaluation.DefenseStatus,
            DefenseCouncilName = evaluation.DefenseCouncilName,
            DefenseExaminerName = evaluation.DefenseExaminerName,
            EvaluatedBy = evaluation.EvaluatedBy != null ? new UserSummaryDto
            {
                Id = evaluation.EvaluatedBy.Id,
                FullName = evaluation.EvaluatedBy.FullName,
                Email = evaluation.EvaluatedBy.Email
            } : null,
            Internship = evaluation.Internship != null ? new InternshipSummaryDto
            {
                Id = evaluation.Internship.Id,
                StudentName = evaluation.Internship.Student?.FullName,
                CompanyName = evaluation.Internship.Company?.CompanyName,
                Position = evaluation.Internship.Position,
                Status = evaluation.Internship.Status.ToString()
            } : null
        };
    }

    private IQueryable<Evaluation> ApplySorting(IQueryable<Evaluation> query, string? sortBy, string? sortOrder)
    {
        var isDescending = sortOrder?.Equals("desc", StringComparison.OrdinalIgnoreCase) ?? true;

        return (sortBy?.ToLowerInvariant()) switch
        {
            "studentname" => isDescending 
                ? query.OrderByDescending(e => e.Internship.Student.FullName) 
                : query.OrderBy(e => e.Internship.Student.FullName),
            "finalgrade" => isDescending 
                ? query.OrderByDescending(e => e.FinalGrade) 
                : query.OrderBy(e => e.FinalGrade),
            _ => isDescending 
                ? query.OrderByDescending(e => e.EvaluatedAt) 
                : query.OrderBy(e => e.EvaluatedAt)
        };
    }
}
