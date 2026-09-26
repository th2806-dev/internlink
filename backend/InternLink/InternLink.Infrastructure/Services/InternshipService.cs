using AutoMapper;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

/// <summary>
/// Service for managing Internship entities
/// </summary>
public class InternshipService : IInternshipService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;

    public InternshipService(AppDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<IEnumerable<InternshipListItemDto>> GetAllInternshipsAsync(int skip = 0, int take = 100, Guid? lecturerId = null, Guid? departmentId = null)
    {
        var query = _db.Internships.Where(i => !i.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);
        query = ApplyDepartmentScope(query, departmentId);

        var internships = await query
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Submissions)
            .OrderByDescending(i => i.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return internships.Select(i => new InternshipListItemDto
        {
            Id = i.Id,
            StudentId = i.StudentId,
            StudentName = i.Student?.FullName,
            CompanyId = i.CompanyId,
            CompanyName = i.Company?.CompanyName,
            StartDate = i.StartDate,
            EndDate = i.EndDate,
            Status = i.Status.ToString(),
            Position = i.Position,
            SubmissionCount = i.Submissions?.Count ?? 0,
            CreatedAt = i.CreatedAt
        });
    }

    public async Task<PaginatedResponse<InternshipListItemDto>> GetInternshipsWithFilterAsync(InternshipFilterRequest filter, Guid? lecturerId = null, Guid? departmentId = null)
    {
        var query = _db.Internships
            .Where(i => !i.IsDeleted)
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Submissions)
            .AsQueryable();

        query = ApplyLecturerScope(query, lecturerId ?? filter.LecturerId);
        query = ApplyDepartmentScope(query, departmentId);

        // Apply filters
        if (filter.StudentId.HasValue)
            query = query.Where(i => i.StudentId == filter.StudentId.Value);

        if (filter.CompanyId.HasValue)
            query = query.Where(i => i.CompanyId == filter.CompanyId.Value);

        if (!lecturerId.HasValue && filter.LecturerId.HasValue)
            query = query.Where(i => i.LecturerId == filter.LecturerId.Value);

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            if (Enum.TryParse<InternshipStatus>(filter.Status, out var status))
                query = query.Where(i => i.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var searchLower = filter.SearchTerm.ToLower();
            query = query.Where(i =>
                i.Student.FullName.ToLower().Contains(searchLower) ||
                i.Company.CompanyName.ToLower().Contains(searchLower) ||
                i.Position!.ToLower().Contains(searchLower)
            );
        }

        if (filter.StartDateFrom.HasValue)
            query = query.Where(i => i.StartDate >= filter.StartDateFrom.Value);

        if (filter.StartDateTo.HasValue)
            query = query.Where(i => i.StartDate <= filter.StartDateTo.Value);

        if (filter.EndDateFrom.HasValue)
            query = query.Where(i => i.EndDate >= filter.EndDateFrom.Value);

        if (filter.EndDateTo.HasValue)
            query = query.Where(i => i.EndDate <= filter.EndDateTo.Value);

        // Apply sorting
        var sortDirection = filter.SortDirection?.ToLower() == "asc" ? true : false;
        query = (filter.SortBy?.ToLower()) switch
        {
            "startdate" => sortDirection 
                ? query.OrderBy(i => i.StartDate) 
                : query.OrderByDescending(i => i.StartDate),
            "enddate" => sortDirection 
                ? query.OrderBy(i => i.EndDate) 
                : query.OrderByDescending(i => i.EndDate),
            "status" => sortDirection 
                ? query.OrderBy(i => i.Status) 
                : query.OrderByDescending(i => i.Status),
            _ => sortDirection 
                ? query.OrderBy(i => i.CreatedAt) 
                : query.OrderByDescending(i => i.CreatedAt)
        };

        // Get total count before pagination
        var total = await query.CountAsync();

        // Apply pagination
        var internships = await query
            .Skip(filter.Skip)
            .Take(filter.Take)
            .ToListAsync();

        var items = internships.Select(i => new InternshipListItemDto
        {
            Id = i.Id,
            StudentId = i.StudentId,
            StudentName = i.Student?.FullName,
            CompanyId = i.CompanyId,
            CompanyName = i.Company?.CompanyName,
            StartDate = i.StartDate,
            EndDate = i.EndDate,
            Status = i.Status.ToString(),
            Position = i.Position,
            SubmissionCount = i.Submissions?.Count ?? 0,
            CreatedAt = i.CreatedAt
        });

        return new PaginatedResponse<InternshipListItemDto>
        {
            Items = items,
            Total = total,
            Skip = filter.Skip,
            Take = filter.Take
        };
    }

    public async Task<InternshipDetailFullDto?> GetInternshipByIdAsync(Guid id)
    {
        var internship = await _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Submissions)
                .ThenInclude(s => s.Feedbacks)
                    .ThenInclude(f => f.Lecturer)
            .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);

        if (internship == null)
            return null;

        return MapToDetailFullDto(internship);
    }

    public async Task<InternshipDetailFullDto?> GetInternshipByIdAsync(Guid id, Guid userId, bool isLecturerOrAdmin)
    {
        var internship = await _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Lecturer)
            .Include(i => i.Submissions)
                .ThenInclude(s => s.Feedbacks)
                    .ThenInclude(f => f.Lecturer)
            .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);

        if (internship == null)
            return null;

        var ownsInternship = internship.Student?.UserId == userId;
        var isAssignedLecturer = internship.Lecturer?.UserId == userId;

        if (!isLecturerOrAdmin && !ownsInternship)
            throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NoAccessInternship);

        if (isLecturerOrAdmin && !isAssignedLecturer && !ownsInternship)
        {
            var isSuperAdmin = await _db.Users
                .AnyAsync(u => u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted);
            if (!isSuperAdmin)
                throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NoAccessInternship);
        }

        return MapToDetailFullDto(internship);
    }

    /// <summary>
    /// Detail access for DepartmentAdmin: internship must belong to a student in their department.
    /// </summary>
    public async Task<InternshipDetailFullDto?> GetInternshipByIdForDepartmentAdminAsync(Guid id, Guid? departmentId)
    {
        if (departmentId == null)
            return null;

        var internship = await _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Lecturer)
            .Include(i => i.Submissions)
                .ThenInclude(s => s.Feedbacks)
                    .ThenInclude(f => f.Lecturer)
            .FirstOrDefaultAsync(i => i.Id == id
                && !i.IsDeleted
                && i.Student != null
                && i.Student.DepartmentId == departmentId.Value);

        if (internship == null)
            return null;

        return MapToDetailFullDto(internship);
    }

    public async Task<IEnumerable<InternshipListItemDto>> GetInternshipsByStudentAsync(Guid studentId, int skip = 0, int take = 100, Guid? lecturerId = null, Guid? departmentId = null)
    {
        var query = _db.Internships
            .Where(i => i.StudentId == studentId && !i.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);
        query = ApplyDepartmentScope(query, departmentId);

        var internships = await query
            .Include(i => i.Company)
            .Include(i => i.Submissions)
            .OrderByDescending(i => i.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return internships.Select(i => new InternshipListItemDto
        {
            Id = i.Id,
            StudentId = i.StudentId,
            StudentName = "", // Student context is already known
            CompanyId = i.CompanyId,
            CompanyName = i.Company?.CompanyName,
            StartDate = i.StartDate,
            EndDate = i.EndDate,
            Status = i.Status.ToString(),
            Position = i.Position,
            SubmissionCount = i.Submissions?.Count ?? 0,
            CreatedAt = i.CreatedAt
        });
    }

    public async Task<IEnumerable<InternshipListItemDto>> GetInternshipsByCompanyAsync(Guid companyId, int skip = 0, int take = 100, Guid? lecturerId = null, Guid? departmentId = null)
    {
        var query = _db.Internships
            .Where(i => i.CompanyId == companyId && !i.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);
        query = ApplyDepartmentScope(query, departmentId);

        var internships = await query
            .Include(i => i.Student)
            .Include(i => i.Submissions)
            .OrderByDescending(i => i.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return internships.Select(i => new InternshipListItemDto
        {
            Id = i.Id,
            StudentId = i.StudentId,
            StudentName = i.Student?.FullName,
            CompanyId = i.CompanyId,
            CompanyName = "", // Company context is already known
            StartDate = i.StartDate,
            EndDate = i.EndDate,
            Status = i.Status.ToString(),
            Position = i.Position,
            SubmissionCount = i.Submissions?.Count ?? 0,
            CreatedAt = i.CreatedAt
        });
    }

    public async Task<InternshipDetailFullDto> CreateInternshipAsync(CreateInternshipRequest request)
    {
        // Validate student exists
        var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == request.StudentId && !s.IsDeleted);
        if (student == null)
            throw new InvalidOperationException($"Student with ID {request.StudentId} not found");

        // Validate company exists
        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == request.CompanyId && !c.IsDeleted);
        if (company == null)
            throw new InvalidOperationException($"Company with ID {request.CompanyId} not found");

        // Check if student already has an active internship
        var existingInternship = await _db.Internships
            .FirstOrDefaultAsync(i => i.StudentId == request.StudentId && !i.IsDeleted &&
                (i.Status == InternshipStatus.InProgress || i.Status == InternshipStatus.NotStarted));

        if (existingInternship != null)
            throw new InvalidOperationException($"Student already has an active internship");

        var internship = new Internship
        {
            Id = Guid.NewGuid(),
            StudentId = request.StudentId,
            CompanyId = request.CompanyId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = InternshipStatus.NotStarted,
            Position = request.Position,
            SupervisorName = request.SupervisorName,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        await _db.Internships.AddAsync(internship);
        await _db.SaveChangesAsync();

        // Load related data
        await _db.Entry(internship).Reference(i => i.Student).LoadAsync();
        await _db.Entry(internship).Reference(i => i.Company).LoadAsync();

        return MapToDetailFullDto(internship);
    }

    public async Task<InternshipDetailFullDto?> UpdateInternshipAsync(Guid id, UpdateInternshipRequest request)
    {
        var internship = await _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Company)
            .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);

        if (internship == null)
            return null;

        if (request.CompanyId.HasValue)
        {
            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == request.CompanyId.Value && !c.IsDeleted);
            if (company == null)
                throw new InvalidOperationException($"Company with ID {request.CompanyId} not found");

            internship.CompanyId = request.CompanyId.Value;
        }

        if (request.StartDate.HasValue)
            internship.StartDate = request.StartDate.Value;

        if (request.EndDate.HasValue)
            internship.EndDate = request.EndDate.Value;

        if (!string.IsNullOrWhiteSpace(request.Position))
            internship.Position = request.Position;

        if (!string.IsNullOrWhiteSpace(request.SupervisorName))
            internship.SupervisorName = request.SupervisorName;

        if (!string.IsNullOrWhiteSpace(request.Notes))
            internship.Notes = request.Notes;

        internship.UpdatedAt = DateTime.UtcNow;

        _db.Internships.Update(internship);
        await _db.SaveChangesAsync();

        await _db.Entry(internship).Collection(i => i.Submissions).LoadAsync();

        return MapToDetailFullDto(internship);
    }

    public async Task<InternshipDetailFullDto?> UpdateInternshipStatusAsync(Guid id, UpdateInternshipStatusRequest request)
    {
        var internship = await _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Submissions)
            .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);

        if (internship == null)
            return null;

        if (Enum.TryParse<InternshipStatus>(request.Status, out var newStatus))
        {
            internship.Status = newStatus;
            internship.UpdatedAt = DateTime.UtcNow;

            _db.Internships.Update(internship);
            await _db.SaveChangesAsync();
        }
        else
        {
            throw new InvalidOperationException($"Invalid status: {request.Status}");
        }

        return MapToDetailFullDto(internship);
    }

    public async Task<InternshipDetailFullDto?> AssignCompanyAsync(Guid id, AssignCompanyRequest request, Guid? lecturerId = null)
    {
        var internship = await _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Company)
            .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted &&
                (!lecturerId.HasValue || i.LecturerId == lecturerId.Value));

        if (internship == null)
            return null;

        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == request.CompanyId && c.IsActive && !c.IsDeleted);
        if (company == null)
            throw new InvalidOperationException("Doanh nghiệp không tồn tại hoặc đang ngưng hoạt động");

        if (internship.SemesterId.HasValue)
        {
            var isUnlinked = await _db.SemesterCompanies.AnyAsync(sc =>
                sc.SemesterId == internship.SemesterId.Value &&
                sc.CompanyId == request.CompanyId &&
                !sc.IsActive &&
                !sc.IsDeleted);

            if (isUnlinked)
                throw new InvalidOperationException("Doanh nghiệp đã ngưng liên kết trong học kỳ này");

            if (company.Capacity.HasValue && company.Capacity.Value > 0)
            {
                var assignedCount = await _db.Internships.CountAsync(i =>
                    i.Id != id &&
                    i.CompanyId == request.CompanyId &&
                    i.SemesterId == internship.SemesterId.Value &&
                    !i.IsDeleted);

                if (assignedCount >= company.Capacity.Value)
                    throw new InvalidOperationException("Doanh nghiệp đã đạt sức chứa trong học kỳ này");
            }
        }

        internship.CompanyId = request.CompanyId;
        if (internship.Status == InternshipStatus.NotStarted)
            internship.Status = InternshipStatus.InProgress;
        if (!string.IsNullOrWhiteSpace(request.SupervisorName))
            internship.SupervisorName = request.SupervisorName;
        if (!string.IsNullOrWhiteSpace(request.Position))
            internship.Position = request.Position;
        internship.UpdatedAt = DateTime.UtcNow;

        _db.Internships.Update(internship);
        await _db.SaveChangesAsync();

        // Reload company
        await _db.Entry(internship).Reference(i => i.Company).LoadAsync();
        await _db.Entry(internship).Collection(i => i.Submissions).LoadAsync();

        return MapToDetailFullDto(internship);
    }

    public async Task<bool> DeleteInternshipAsync(Guid id)
    {
        var internship = await _db.Internships
            .Include(i => i.Submissions)
            .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);

        if (internship == null)
            return false;

        if (internship.Submissions?.Any(s => !s.IsDeleted) == true)
            throw new InvalidOperationException("Cannot delete internship with existing submissions");

        internship.IsDeleted = true;
        internship.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<InternshipStatsDto> GetInternshipStatsAsync(Guid? lecturerId = null, Guid? semesterId = null, Guid? departmentId = null)
    {
        var query = _db.Internships.Where(i => !i.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);

        if (departmentId.HasValue)
        {
            query = query.Where(i => i.Student != null && i.Student.DepartmentId == departmentId.Value);
        }

        if (semesterId.HasValue && semesterId.Value != Guid.Empty)
        {
            query = query.Where(i => i.SemesterId == semesterId.Value);
        }

        // GROUP BY trong DB (đề xuất P2): thay vì tải toàn bộ internships về rồi Count in-memory.
        var grouped = await query
            .GroupBy(i => i.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var counts = grouped.ToDictionary(x => x.Status, x => x.Count);
        int Get(InternshipStatus status) => counts.GetValueOrDefault(status);

        return new InternshipStatsDto
        {
            Total = grouped.Sum(x => x.Count),
            NotStarted = Get(InternshipStatus.NotStarted),
            InProgress = Get(InternshipStatus.InProgress),
            BehindSchedule = Get(InternshipStatus.BehindSchedule),
            AwaitingFeedback = Get(InternshipStatus.AwaitingFeedback),
            RequiresRevision = Get(InternshipStatus.RequiresRevision),
            Completed = Get(InternshipStatus.Completed),
            Graded = Get(InternshipStatus.Graded)
        };
    }

    public async Task<bool> StudentHasActiveInternshipAsync(Guid studentId)
    {
        return await _db.Internships
            .AnyAsync(i => i.StudentId == studentId && !i.IsDeleted &&
                (i.Status == InternshipStatus.InProgress || i.Status == InternshipStatus.NotStarted));
    }

    public async Task<IEnumerable<InternshipListItemDto>> GetInternshipsByStatusAsync(string status, int skip = 0, int take = 100, Guid? lecturerId = null, Guid? departmentId = null)
    {
        if (!Enum.TryParse<InternshipStatus>(status, out var internshipStatus))
            return Enumerable.Empty<InternshipListItemDto>();

        var query = _db.Internships
            .Where(i => i.Status == internshipStatus && !i.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);
        query = ApplyDepartmentScope(query, departmentId);

        var internships = await query
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Submissions)
            .OrderByDescending(i => i.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return internships.Select(i => new InternshipListItemDto
        {
            Id = i.Id,
            StudentId = i.StudentId,
            StudentName = i.Student?.FullName,
            CompanyId = i.CompanyId,
            CompanyName = i.Company?.CompanyName,
            StartDate = i.StartDate,
            EndDate = i.EndDate,
            Status = i.Status.ToString(),
            Position = i.Position,
            SubmissionCount = i.Submissions?.Count ?? 0,
            CreatedAt = i.CreatedAt
        });
    }

    private static IQueryable<Internship> ApplyLecturerScope(IQueryable<Internship> query, Guid? lecturerId)
    {
        if (lecturerId.HasValue)
            return query.Where(i => i.LecturerId == lecturerId.Value);
        return query;
    }

    private static IQueryable<Internship> ApplyDepartmentScope(IQueryable<Internship> query, Guid? departmentId)
    {
        if (departmentId.HasValue)
            return query.Where(i => i.Student != null && i.Student.DepartmentId == departmentId.Value);
        return query;
    }

    private InternshipDetailFullDto MapToDetailFullDto(Internship internship)
    {
        return new InternshipDetailFullDto
        {
            Id = internship.Id,
            StudentId = internship.StudentId,
            CompanyId = internship.CompanyId,
            LecturerId = internship.LecturerId,
            StartDate = internship.StartDate,
            EndDate = internship.EndDate,
            Status = internship.Status.ToString(),
            Position = internship.Position,
            SupervisorName = internship.SupervisorName,
            Notes = internship.Notes,
            CreatedAt = internship.CreatedAt,
            UpdatedAt = internship.UpdatedAt,
            Student = internship.Student != null ? new StudentSummaryDto
            {
                Id = internship.Student.Id,
                StudentCode = internship.Student.StudentCode,
                FullName = internship.Student.FullName,
                Class = internship.Student.Class,
                Major = internship.Student.Major,
                Email = internship.Student.Email,
                Phone = internship.Student.Phone
            } : null,
            Company = internship.Company != null ? new CompanySummaryDto
            {
                Id = internship.Company.Id,
                CompanyName = internship.Company.CompanyName,
                Industry = internship.Company.Industry,
                ContactPerson = internship.Company.ContactPerson,
                ContactEmail = internship.Company.ContactEmail,
                ContactPhone = internship.Company.ContactPhone
            } : null,
            Submissions = internship.Submissions?.Select(s => new SubmissionDto
            {
                Id = s.Id,
                InternshipId = s.InternshipId,
                Type = s.Type.ToString(),
                Status = s.Status.ToString(),
                Version = s.Version,
                Title = s.Title,
                Description = s.Description,
                FileName = s.FileName,
                FileUrl = s.FileUrl,
                SubmittedAt = s.SubmittedAt,
                Feedbacks = s.Feedbacks?.Select(f => new FeedbackDto
                {
                    Id = f.Id,
                    SubmissionId = f.SubmissionId,
                    LecturerId = f.LecturerId,
                    LecturerName = f.Lecturer?.FullName,
                    Comment = f.Comment,
                    IsPublic = f.IsPublic,
                    CreatedAt = f.CreatedAt
                }) ?? Array.Empty<FeedbackDto>()
            }) ?? Array.Empty<SubmissionDto>()
        };
    }
}
