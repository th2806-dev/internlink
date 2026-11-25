using InternLink.Application.DTOs;
using InternLink.Application.Common;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace InternLink.Infrastructure.Services;

public class RubricService : IRubricService
{
    private static readonly IReadOnlyList<EmployerRatingLevelDto> DefaultEmployerRatingLevels =
    [
        new(0, "Chưa đáp ứng", "Chưa thể hiện được năng lực hoặc yêu cầu của tiêu chí."),
        new(1, "Cần cải thiện", "Thể hiện chưa ổn định, cần hướng dẫn thường xuyên."),
        new(2, "Đạt một phần", "Đáp ứng một phần yêu cầu, cần cải thiện thêm."),
        new(3, "Đạt yêu cầu", "Đáp ứng đầy đủ yêu cầu trong công việc."),
        new(4, "Vượt yêu cầu", "Thể hiện tốt, chủ động và vượt kỳ vọng."),
    ];

    private readonly AppDbContext _context;

    public RubricService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<RubricDto?> GetBySemesterAsync(Guid semesterId)
    {
        var rubric = await _context.Set<EvaluationRubric>()
            .Where(r => r.SemesterId == semesterId && r.DepartmentId == null && !r.IsDeleted)
            .Include(r => r.Criteria.OrderBy(c => c.OrderIndex))
            .Include(r => r.SubmittedBy)
            .Include(r => r.ApprovedBy)
            .FirstOrDefaultAsync();

        return rubric == null ? null : MapToDto(rubric);
    }

    public async Task<EmployerRubricConfigDto?> GetEmployerConfigAsync(
        Guid semesterId,
        Guid? departmentId,
        CancellationToken cancellationToken)
    {
        var rubrics = _context.EvaluationRubrics
            .AsNoTracking()
            .Where(rubric => rubric.SemesterId == semesterId
                && !rubric.IsDeleted
                && (rubric.Status == RubricStatus.Approved || rubric.Status == RubricStatus.Locked));

        var rubric = departmentId.HasValue
            ? await rubrics
                .Where(item => item.DepartmentId == departmentId)
                .Include(item => item.Criteria.OrderBy(criterion => criterion.OrderIndex))
                .FirstOrDefaultAsync(cancellationToken)
            : null;
        var isInherited = departmentId.HasValue && rubric == null;

        rubric ??= await rubrics
            .Where(item => item.DepartmentId == null)
            .Include(item => item.Criteria.OrderBy(criterion => criterion.OrderIndex))
            .FirstOrDefaultAsync(cancellationToken);

        return rubric == null
            ? null
            : MapEmployerConfig(rubric, isInherited);
    }

    public async Task<EmployerRubricConfigDto> SaveEmployerConfigAsync(
        Guid semesterId,
        Guid? departmentId,
        SaveEmployerRubricRequest request,
        Guid updatedByUserId,
        CancellationToken cancellationToken)
    {
        ValidateEmployerRubric(request);

        var semester = await _context.Semesters
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == semesterId && !item.IsDeleted, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy học kỳ.");
        SemesterWritePolicy.EnsureWritable(semester);

        if (departmentId.HasValue)
        {
            var departmentExists = await _context.Departments
                .AnyAsync(item => item.Id == departmentId.Value && !item.IsDeleted, cancellationToken);
            if (!departmentExists)
                throw new KeyNotFoundException("Không tìm thấy khoa đã chọn.");
            if (semester.DepartmentId.HasValue && semester.DepartmentId != departmentId)
                throw new InvalidOperationException("Học kỳ không thuộc khoa đã chọn.");
        }

        var now = DateTime.UtcNow;
        var previousVersions = await _context.EvaluationRubrics
            .Where(item => item.SemesterId == semesterId && item.DepartmentId == departmentId)
            .ToListAsync(cancellationToken);
        foreach (var previous in previousVersions.Where(item => !item.IsDeleted))
        {
            previous.IsDeleted = true;
            previous.DeletedAt = now;
            previous.DeletedBy = updatedByUserId.ToString();
            previous.UpdatedAt = now;
        }

        var rubric = new EvaluationRubric
        {
            Id = Guid.NewGuid(),
            SemesterId = semesterId,
            DepartmentId = departmentId,
            Name = request.Name.Trim(),
            Version = previousVersions.Count == 0 ? 1 : previousVersions.Max(item => item.Version) + 1,
            RatingLevelsJson = JsonSerializer.Serialize(request.RatingLevels.OrderBy(level => level.Value)),
            ApplicationMode = RubricApplicationMode.Required,
            Status = RubricStatus.Approved,
            SubmittedById = updatedByUserId,
            SubmittedAt = now,
            ApprovedById = updatedByUserId,
            ApprovedAt = now,
            CreatedAt = now,
            CreatedBy = updatedByUserId.ToString(),
            CreatedByFunction = "SAVE_EMPLOYER_EVALUATION_RUBRIC",
            Criteria = request.Criteria.Select((criterion, index) => new EvaluationRubricCriterion
            {
                Id = Guid.NewGuid(),
                Name = criterion.Name.Trim(),
                Description = NullIfWhiteSpace(criterion.Description),
                Weight = criterion.Weight,
                MaxScore = 10,
                OrderIndex = index + 1,
                CreatedAt = now
            }).ToList()
        };

        _context.EvaluationRubrics.Add(rubric);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetEmployerConfigAsync(semesterId, departmentId, cancellationToken)
            ?? throw new InvalidOperationException("Không thể tải cấu hình rubric vừa lưu.");
    }

    public async Task<RubricDto> CreateAsync(Guid semesterId, CreateRubricRequest request, Guid createdByUserId)
    {
        // Validate semester exists
        var semester = await _context.Semesters
            .FirstOrDefaultAsync(s => s.Id == semesterId && !s.IsDeleted);
        if (semester == null)
            throw new InvalidOperationException("Kỳ thực tập không tồn tại.");

        // Treat create as an idempotent Admin save. This also handles a stale UI
        // that has not loaded the existing rubric yet.
        var existing = await _context.Set<EvaluationRubric>()
            .Where(r => r.SemesterId == semesterId && r.DepartmentId == null && !r.IsDeleted)
            .Select(r => r.Id)
            .FirstOrDefaultAsync();
        if (existing != Guid.Empty)
        {
            var updateRequest = new UpdateRubricRequest
            {
                Name = request.Name,
                ApplicationMode = request.ApplicationMode,
                Criteria = request.Criteria.Select(c => new UpdateRubricCriterionRequest
                {
                    Name = c.Name,
                    Description = c.Description,
                    Weight = c.Weight,
                    MaxScore = c.MaxScore,
                    OrderIndex = c.OrderIndex
                }).ToList()
            };

            return await UpdateAsync(existing, updateRequest, createdByUserId)
                ?? throw new InvalidOperationException("Không thể cập nhật rubric hiện tại.");
        }

        // Validate criteria weights sum to 100
        var totalWeight = request.Criteria.Sum(c => c.Weight);
        if (Math.Abs(totalWeight - 100) > 0.01m)
            throw new InvalidOperationException($"Tổng trọng số phải bằng 100%. Hiện tại: {totalWeight}%");

        // Validate no duplicate names
        if (request.Criteria.GroupBy(c => c.Name.Trim().ToLower()).Any(g => g.Count() > 1))
            throw new InvalidOperationException("Không được có tiêu chí trùng tên.");

        var rubric = new EvaluationRubric
        {
            Id = Guid.NewGuid(),
            SemesterId = semesterId,
            Name = request.Name,
            ApplicationMode = request.ApplicationMode == "LecturerCustom"
                ? RubricApplicationMode.LecturerCustom
                : RubricApplicationMode.Required,
            // Admin is the highest authority in this deployment: saving a rubric applies it immediately.
            Status = RubricStatus.Approved,
            SubmittedById = createdByUserId,
            SubmittedAt = DateTime.UtcNow,
            ApprovedById = createdByUserId,
            ApprovedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            Criteria = request.Criteria.Select((c, idx) => new EvaluationRubricCriterion
            {
                Id = Guid.NewGuid(),
                Name = c.Name,
                Description = c.Description,
                Weight = c.Weight,
                MaxScore = c.MaxScore,
                OrderIndex = c.OrderIndex > 0 ? c.OrderIndex : idx + 1,
                CreatedAt = DateTime.UtcNow
            }).ToList()
        };

        _context.Set<EvaluationRubric>().Add(rubric);
        await _context.SaveChangesAsync();

        // Reload with includes for proper DTO mapping
        return await GetBySemesterAsync(semesterId) ?? MapToDto(rubric);
    }

    public async Task<RubricDto?> UpdateAsync(Guid rubricId, UpdateRubricRequest request, Guid updatedByUserId)
    {
        var rubric = await _context.Set<EvaluationRubric>()
            .Where(r => r.Id == rubricId && !r.IsDeleted)
            .Include(r => r.Criteria)
            .FirstOrDefaultAsync();

        if (rubric == null) return null;
        if (rubric.Status == RubricStatus.Locked)
            throw new InvalidOperationException("Rubric đã khóa, không thể chỉnh sửa.");

        if (request.Name != null) rubric.Name = request.Name;
        if (request.ApplicationMode != null)
        {
            rubric.ApplicationMode = request.ApplicationMode == "LecturerCustom"
                ? RubricApplicationMode.LecturerCustom
                : RubricApplicationMode.Required;
        }

        // Replace criteria if provided
        if (request.Criteria != null)
        {
            var totalWeight = request.Criteria.Sum(c => c.Weight ?? 0);
            if (Math.Abs(totalWeight - 100) > 0.01m)
                throw new InvalidOperationException($"Tổng trọng số phải bằng 100%. Hiện tại: {totalWeight}%");

            // Delete old rows explicitly before inserting the replacement set.
            // This avoids EF tracking conflicts when an Admin saves a loaded rubric.
            _context.Set<EvaluationRubricCriterion>().RemoveRange(rubric.Criteria);
            await _context.SaveChangesAsync();

            var replacementCriteria = request.Criteria.Select((c, idx) => new EvaluationRubricCriterion
            {
                Id = Guid.NewGuid(),
                RubricId = rubricId,
                Name = c.Name ?? "Untitled",
                Description = c.Description,
                Weight = c.Weight ?? 0,
                MaxScore = c.MaxScore ?? 10,
                OrderIndex = (c.OrderIndex ?? 0) > 0 ? c.OrderIndex!.Value : idx + 1,
                CreatedAt = DateTime.UtcNow
            }).ToList();
            _context.Set<EvaluationRubricCriterion>().AddRange(replacementCriteria);
        }

        rubric.UpdatedAt = DateTime.UtcNow;
        rubric.Status = RubricStatus.Approved;
        rubric.ApprovedById = updatedByUserId;
        rubric.ApprovedAt = DateTime.UtcNow;
        rubric.RejectionReason = null;
        await _context.SaveChangesAsync();

        return await GetBySemesterAsync(rubric.SemesterId);
    }

    public async Task<bool> DeleteAsync(Guid rubricId)
    {
        var rubric = await _context.Set<EvaluationRubric>()
            .FirstOrDefaultAsync(r => r.Id == rubricId && !r.IsDeleted);

        if (rubric == null) return false;
        if (rubric.Status != RubricStatus.Draft && rubric.Status != RubricStatus.Rejected)
            throw new InvalidOperationException("Chỉ có thể xóa rubric ở trạng thái Nháp hoặc Bị từ chối.");

        rubric.IsDeleted = true;
        rubric.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<RubricDto?> SubmitForApprovalAsync(Guid rubricId, Guid submittedByUserId, string? note)
    {
        var rubric = await _context.Set<EvaluationRubric>()
            .Where(r => r.Id == rubricId && !r.IsDeleted)
            .Include(r => r.Criteria)
            .FirstOrDefaultAsync();

        if (rubric == null) return null;
        if (rubric.Status != RubricStatus.Draft && rubric.Status != RubricStatus.Rejected)
            throw new InvalidOperationException("Rubric phải ở trạng thái Nháp hoặc Bị từ chối để gửi duyệt.");

        // Validate total weight
        var totalWeight = rubric.Criteria.Sum(c => c.Weight);
        if (Math.Abs(totalWeight - 100) > 0.01m)
            throw new InvalidOperationException($"Tổng trọng số phải bằng 100%. Hiện tại: {totalWeight}%");

        rubric.Status = RubricStatus.PendingApproval;
        rubric.SubmittedById = submittedByUserId;
        rubric.SubmittedAt = DateTime.UtcNow;
        rubric.RejectionReason = null;
        rubric.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await GetBySemesterAsync(rubric.SemesterId);
    }

    public async Task<RubricDto?> ApproveAsync(Guid rubricId, Guid approvedByUserId, string? note)
    {
        var rubric = await _context.Set<EvaluationRubric>()
            .Where(r => r.Id == rubricId && !r.IsDeleted)
            .Include(r => r.Criteria)
            .Include(r => r.SubmittedBy)
            .FirstOrDefaultAsync();

        if (rubric == null) return null;
        if (rubric.Status != RubricStatus.PendingApproval)
            throw new InvalidOperationException("Chỉ có thể duyệt rubric đang chờ phê duyệt.");

        rubric.Status = RubricStatus.Approved;
        rubric.ApprovedById = approvedByUserId;
        rubric.ApprovedAt = DateTime.UtcNow;
        rubric.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await GetBySemesterAsync(rubric.SemesterId);
    }

    public async Task<RubricDto?> RejectAsync(Guid rubricId, string rejectionReason)
    {
        var rubric = await _context.Set<EvaluationRubric>()
            .Where(r => r.Id == rubricId && !r.IsDeleted)
            .Include(r => r.Criteria)
            .FirstOrDefaultAsync();

        if (rubric == null) return null;
        if (rubric.Status != RubricStatus.PendingApproval)
            throw new InvalidOperationException("Chỉ có thể từ chối rubric đang chờ phê duyệt.");

        rubric.Status = RubricStatus.Rejected;
        rubric.RejectionReason = rejectionReason;
        rubric.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await GetBySemesterAsync(rubric.SemesterId);
    }

    public async Task<RubricDto?> LockAsync(Guid rubricId)
    {
        var rubric = await _context.Set<EvaluationRubric>()
            .Where(r => r.Id == rubricId && !r.IsDeleted)
            .Include(r => r.Criteria)
            .FirstOrDefaultAsync();

        if (rubric == null) return null;
        if (rubric.Status != RubricStatus.Approved)
            throw new InvalidOperationException("Chỉ có thể khóa rubric đã được phê duyệt.");

        rubric.Status = RubricStatus.Locked;
        rubric.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await GetBySemesterAsync(rubric.SemesterId);
    }

    public async Task<RubricDto?> GetApprovedRubricAsync(Guid semesterId)
    {
        var rubric = await _context.Set<EvaluationRubric>()
            .Where(r => r.SemesterId == semesterId && r.DepartmentId == null && !r.IsDeleted
                && (r.Status == RubricStatus.Approved || r.Status == RubricStatus.Locked))
            .Include(r => r.Criteria.OrderBy(c => c.OrderIndex))
            .FirstOrDefaultAsync();

        return rubric == null ? null : MapToDto(rubric);
    }

    private static RubricDto MapToDto(EvaluationRubric rubric)
    {
        return new RubricDto
        {
            Id = rubric.Id,
            SemesterId = rubric.SemesterId,
            DepartmentId = rubric.DepartmentId,
            Name = rubric.Name,
            Version = rubric.Version,
            RatingLevels = ParseRatingLevels(rubric.RatingLevelsJson).ToList(),
            ApplicationMode = rubric.ApplicationMode.ToString(),
            Status = rubric.Status.ToString(),
            Criteria = rubric.Criteria
                .OrderBy(c => c.OrderIndex)
                .Select(c => new RubricCriterionDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Description = c.Description,
                    Weight = c.Weight,
                    MaxScore = c.MaxScore,
                    OrderIndex = c.OrderIndex
                }).ToList(),
            RejectionReason = rubric.RejectionReason,
            SubmittedByName = rubric.SubmittedBy?.FullName,
            SubmittedAt = rubric.SubmittedAt,
            ApprovedByName = rubric.ApprovedBy?.FullName,
            ApprovedAt = rubric.ApprovedAt,
            CreatedAt = rubric.CreatedAt,
            UpdatedAt = rubric.UpdatedAt
        };
    }

    private static EmployerRubricConfigDto MapEmployerConfig(EvaluationRubric rubric, bool isInherited) =>
        new(
            rubric.Id,
            rubric.SemesterId,
            rubric.DepartmentId,
            rubric.Name,
            rubric.Version,
            isInherited,
            ParseRatingLevels(rubric.RatingLevelsJson),
            rubric.Criteria
                .OrderBy(criterion => criterion.OrderIndex)
                .Select(criterion => new EmployerRubricCriterionDto(
                    criterion.Id,
                    criterion.Name,
                    criterion.Description,
                    criterion.Weight,
                    criterion.OrderIndex))
                .ToList());

    private static IReadOnlyList<EmployerRatingLevelDto> ParseRatingLevels(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return DefaultEmployerRatingLevels;
        try
        {
            var levels = JsonSerializer.Deserialize<List<EmployerRatingLevelDto>>(json);
            return levels is { Count: 5 }
                ? levels.OrderBy(level => level.Value).ToList()
                : DefaultEmployerRatingLevels;
        }
        catch (JsonException)
        {
            return DefaultEmployerRatingLevels;
        }
    }

    private static void ValidateEmployerRubric(SaveEmployerRubricRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 250)
            throw new InvalidOperationException("Tên rubric phải có từ 1 đến 250 ký tự.");
        if (request.Criteria is null || request.Criteria.Count is < 8 or > 10)
            throw new InvalidOperationException("Rubric phải có từ 8 đến 10 tiêu chí.");
        if (request.Criteria.Any(criterion =>
                string.IsNullOrWhiteSpace(criterion.Name)
                || criterion.Name.Trim().Length > 200
                || criterion.Description?.Length > 500
                || criterion.Weight <= 0))
            throw new InvalidOperationException("Mỗi tiêu chí cần tên hợp lệ, trọng số dương và mô tả không quá 500 ký tự.");
        if (request.Criteria.GroupBy(criterion => criterion.Name.Trim(), StringComparer.OrdinalIgnoreCase)
            .Any(group => group.Count() > 1))
            throw new InvalidOperationException("Tên tiêu chí không được trùng nhau.");
        if (Math.Abs(request.Criteria.Sum(criterion => criterion.Weight) - 100m) > 0.01m)
            throw new InvalidOperationException("Tổng trọng số các tiêu chí phải bằng 100%.");
        if (request.RatingLevels is null
            || request.RatingLevels.Count != 5
            || request.RatingLevels.Select(level => level.Value).Order().Where((value, index) => value != index).Any()
            || request.RatingLevels.Any(level =>
                string.IsNullOrWhiteSpace(level.Label)
                || level.Label.Trim().Length > 100
                || string.IsNullOrWhiteSpace(level.Description)
                || level.Description.Trim().Length > 500))
            throw new InvalidOperationException("Cần cấu hình đủ 5 mức đánh giá từ 0 đến 4, mỗi mức có nhãn và mô tả hợp lệ.");
    }

    private static string? NullIfWhiteSpace(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
