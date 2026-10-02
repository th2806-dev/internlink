using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class SchoolAcademicTermService : ISchoolAcademicTermService
{
    private readonly AppDbContext _db;

    public SchoolAcademicTermService(AppDbContext db) => _db = db;

    public async Task<IEnumerable<SchoolAcademicTermDto>> GetAllAsync()
    {
        var terms = await _db.SchoolAcademicTerms
            .AsNoTracking()
            .Where(term => !term.IsDeleted)
            .OrderByDescending(term => term.AcademicYear)
            .ThenBy(term => term.StartDate)
            .ToListAsync();

        return terms.Select(Map);
    }

    public async Task<SchoolAcademicTermDto> CreateAsync(SaveSchoolAcademicTermRequest request)
    {
        Validate(request);
        var academicYear = request.AcademicYear.Trim();
        var termName = request.Term.Trim();
        if (await _db.SchoolAcademicTerms.AnyAsync(term => !term.IsDeleted
            && term.AcademicYear == academicYear && term.Term == termName))
            throw new InvalidOperationException("Khung thời gian học kỳ này đã tồn tại.");

        var term = new SchoolAcademicTerm
        {
            Id = Guid.NewGuid(),
            AcademicYear = academicYear,
            Term = termName,
            StartDate = request.StartDate.Date,
            EndDate = request.EndDate.Date,
            CreatedAt = DateTime.UtcNow
        };
        _db.SchoolAcademicTerms.Add(term);
        await _db.SaveChangesAsync();
        return Map(term);
    }

    public async Task<SchoolAcademicTermDto?> UpdateAsync(Guid id, SaveSchoolAcademicTermRequest request)
    {
        Validate(request);
        var term = await _db.SchoolAcademicTerms.FirstOrDefaultAsync(item => item.Id == id && !item.IsDeleted);
        if (term == null)
            return null;

        var academicYear = request.AcademicYear.Trim();
        var termName = request.Term.Trim();
        if (await _db.SchoolAcademicTerms.AnyAsync(item => item.Id != id && !item.IsDeleted
            && item.AcademicYear == academicYear && item.Term == termName))
            throw new InvalidOperationException("Khung thời gian học kỳ này đã tồn tại.");

        term.AcademicYear = academicYear;
        term.Term = termName;
        term.StartDate = request.StartDate.Date;
        term.EndDate = request.EndDate.Date;
        term.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Map(term);
    }

    /// <summary>
    /// Tạo nhanh cả năm học: HK I → HK II → HK Hè trong MỘT transaction.
    /// Học kỳ sau phải bắt đầu sau khi học kỳ trước kết thúc (không chồng lấn).
    /// Nếu bất kỳ học kỳ nào đã tồn tại trong năm đó → từ chối toàn bộ (không tạo nửa chừng).
    /// </summary>
    public async Task<AcademicYearBatchResultDto> CreateAcademicYearAsync(CreateAcademicYearRequest request)
    {
        var academicYear = request.AcademicYear?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(academicYear))
            throw new InvalidOperationException("Niên khóa là bắt buộc.");

        var terms = new (string Term, DateTime Start, DateTime End)[]
        {
            ("Học kỳ I", request.Term1Start, request.Term1End),
            ("Học kỳ II", request.Term2Start, request.Term2End),
            ("Học kỳ Hè", request.SummerStart, request.SummerEnd),
        };

        foreach (var (termName, start, end) in terms)
        {
            if (start.Date > end.Date)
                throw new InvalidOperationException($"{termName}: ngày bắt đầu phải trước hoặc trùng ngày kết thúc.");
        }
        if (request.Term1End.Date >= request.Term2Start.Date)
            throw new InvalidOperationException("Học kỳ II phải bắt đầu sau khi Học kỳ I kết thúc.");
        if (request.Term2End.Date >= request.SummerStart.Date)
            throw new InvalidOperationException("Học kỳ Hè phải bắt đầu sau khi Học kỳ II kết thúc.");

        var existing = await _db.SchoolAcademicTerms
            .Where(term => !term.IsDeleted && term.AcademicYear == academicYear)
            .Select(term => term.Term)
            .ToListAsync();
        if (existing.Count > 0)
            throw new InvalidOperationException($"Năm học {academicYear} đã có cấu hình học kỳ ({string.Join(", ", existing)}). Không thể tạo trùng.");

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var now = DateTime.UtcNow;
            var created = new List<SchoolAcademicTermDto>();
            foreach (var (termName, start, end) in terms)
            {
                var term = new SchoolAcademicTerm
                {
                    Id = Guid.NewGuid(),
                    AcademicYear = academicYear,
                    Term = termName,
                    StartDate = start.Date,
                    EndDate = end.Date,
                    CreatedAt = now
                };
                _db.SchoolAcademicTerms.Add(term);
                await _db.SaveChangesAsync();
                created.Add(Map(term));
            }

            await transaction.CommitAsync();
            return new AcademicYearBatchResultDto
            {
                AcademicYear = academicYear,
                Terms = created
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private static void Validate(SaveSchoolAcademicTermRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AcademicYear) || string.IsNullOrWhiteSpace(request.Term))
            throw new InvalidOperationException("Niên khóa và học kỳ là bắt buộc.");
        if (request.StartDate.Date > request.EndDate.Date)
            throw new InvalidOperationException("Ngày bắt đầu phải trước hoặc trùng ngày kết thúc.");
    }

    private static SchoolAcademicTermDto Map(SchoolAcademicTerm term)
    {
        var days = (term.EndDate.Date - term.StartDate.Date).Days + 1;
        return new SchoolAcademicTermDto
        {
            Id = term.Id,
            AcademicYear = term.AcademicYear,
            Term = term.Term,
            StartDate = term.StartDate,
            EndDate = term.EndDate,
            TotalWeeks = (days + 6) / 7
        };
    }
}