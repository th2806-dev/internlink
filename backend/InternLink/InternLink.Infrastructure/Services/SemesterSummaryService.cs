using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

/// <summary>
/// Nội dung báo cáo tổng kết công tác thực tập cấp KHOA, lưu theo (Học kỳ, Khoa).
/// Admin khoa soạn/lưu cho khoa của mình; SuperAdmin cho toàn hệ thống (DepartmentId = null).
/// Nội dung này được inject vào các placeholder của template Word C22A khi xuất báo cáo tổng kết.
/// </summary>
public class SemesterSummaryService : ISemesterSummaryService
{
    private readonly AppDbContext _db;

    public SemesterSummaryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<LecturerSemesterSummaryDto?> GetAsync(Guid semesterId, Guid? departmentId)
    {
        var summary = await _db.SemesterFacultySummaries
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.SemesterId == semesterId && x.DepartmentId == departmentId);

        if (summary == null)
            return new LecturerSemesterSummaryDto { SemesterId = semesterId };

        return Map(summary);
    }

    public async Task<LecturerSemesterSummaryDto?> SaveAsync(Guid semesterId, Guid? departmentId, SaveLecturerSemesterSummaryRequest request)
    {
        var semesterExists = await _db.Semesters.AnyAsync(s => s.Id == semesterId && !s.IsDeleted);
        if (!semesterExists)
            return null;

        var summary = await _db.SemesterFacultySummaries
            .FirstOrDefaultAsync(x => x.SemesterId == semesterId && x.DepartmentId == departmentId);

        if (summary == null)
        {
            summary = new SemesterFacultySummary
            {
                Id = Guid.NewGuid(),
                SemesterId = semesterId,
                DepartmentId = departmentId,
                CreatedAt = DateTime.UtcNow,
            };
            _db.SemesterFacultySummaries.Add(summary);
        }

        summary.Results = request.Results?.Trim() ?? string.Empty;
        summary.Difficulties = request.Difficulties?.Trim() ?? string.Empty;
        summary.Recommendations = request.Recommendations?.Trim() ?? string.Empty;
        summary.Conclusion = request.Conclusion?.Trim() ?? string.Empty;
        summary.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Map(summary);
    }

    private static LecturerSemesterSummaryDto Map(SemesterFacultySummary summary) => new()
    {
        SemesterId = summary.SemesterId,
        Results = summary.Results,
        Difficulties = summary.Difficulties,
        Recommendations = summary.Recommendations,
        Conclusion = summary.Conclusion,
        UpdatedAt = summary.UpdatedAt,
    };
}
