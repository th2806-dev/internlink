using AutoMapper;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public class DepartmentService : IDepartmentService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;

    public DepartmentService(AppDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<IEnumerable<DepartmentDto>> GetAllAsync(Guid? departmentId = null)
    {
        var query = _db.Departments.Where(d => !d.IsDeleted);

        if (departmentId.HasValue)
            query = query.Where(d => d.Id == departmentId.Value);

        var departments = await query
            .OrderBy(d => d.Code)
            .ToListAsync();

        var dtos = _mapper.Map<List<DepartmentDto>>(departments);
        if (dtos.Count == 0)
            return dtos;

        var ids = dtos.Select(d => d.Id).ToList();

        var userCounts = await _db.Users
            .Where(u => !u.IsDeleted && ids.Contains(u.DepartmentId!.Value))
            .GroupBy(u => u.DepartmentId!.Value)
            .Select(g => new { DepartmentId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.DepartmentId, x => x.Count);

        var studentCounts = await _db.Students
            .Where(s => !s.IsDeleted && ids.Contains(s.DepartmentId!.Value))
            .GroupBy(s => s.DepartmentId!.Value)
            .Select(g => new { DepartmentId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.DepartmentId, x => x.Count);

        var lecturerCounts = await _db.Lecturers
            .Where(l => !l.IsDeleted && ids.Contains(l.DepartmentId!.Value))
            .GroupBy(l => l.DepartmentId!.Value)
            .Select(g => new { DepartmentId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.DepartmentId, x => x.Count);

        var semesterCounts = await _db.Semesters
            .Where(s => !s.IsDeleted && ids.Contains(s.DepartmentId!.Value))
            .GroupBy(s => s.DepartmentId!.Value)
            .Select(g => new { DepartmentId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.DepartmentId, x => x.Count);

        foreach (var dto in dtos)
        {
            dto.UserCount = userCounts.GetValueOrDefault(dto.Id, 0);
            dto.StudentCount = studentCounts.GetValueOrDefault(dto.Id, 0);
            dto.LecturerCount = lecturerCounts.GetValueOrDefault(dto.Id, 0);
            dto.SemesterCount = semesterCounts.GetValueOrDefault(dto.Id, 0);
        }

        return dtos;
    }

    public async Task<DepartmentDto?> GetByIdAsync(Guid id, Guid? requesterDepartmentId = null)
    {
        var query = _db.Departments.Where(d => d.Id == id && !d.IsDeleted);

        var department = await query.FirstOrDefaultAsync();
        if (department == null)
            return null;

        // Basic scoping: non-superadmin can only see their own department.
        if (requesterDepartmentId.HasValue && department.Id != requesterDepartmentId.Value)
            return null;

        var dto = _mapper.Map<DepartmentDto>(department);

        dto.UserCount = await _db.Users
            .CountAsync(u => !u.IsDeleted && u.DepartmentId == department.Id);
        dto.StudentCount = await _db.Students
            .CountAsync(s => !s.IsDeleted && s.DepartmentId == department.Id);
        dto.LecturerCount = await _db.Lecturers
            .CountAsync(l => !l.IsDeleted && l.DepartmentId == department.Id);
        dto.SemesterCount = await _db.Semesters
            .CountAsync(s => !s.IsDeleted && s.DepartmentId == department.Id);

        return dto;
    }

    public async Task<DepartmentDto> CreateAsync(CreateDepartmentRequest request)
    {
        if (await CodeExistsAsync(request.Code))
            throw new InvalidOperationException($"Mã khoa '{request.Code}' đã tồn tại.");

        var department = new Department
        {
            Id = Guid.NewGuid(),
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            Description = request.Description,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        await _db.Departments.AddAsync(department);
        await _db.SaveChangesAsync();

        return _mapper.Map<DepartmentDto>(department);
    }

    public async Task<DepartmentDto?> UpdateAsync(Guid id, UpdateDepartmentRequest request)
    {
        var department = await _db.Departments
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        if (department == null)
            return null;

        if (request.Code != null)
        {
            var normalized = request.Code.Trim().ToUpperInvariant();
            if (!string.Equals(department.Code, normalized, StringComparison.OrdinalIgnoreCase) &&
                await CodeExistsAsync(normalized, excludeId: id))
            {
                throw new InvalidOperationException($"Mã khoa '{normalized}' đã tồn tại.");
            }

            department.Code = normalized;
        }

        if (request.Name != null)
            department.Name = request.Name.Trim();

        if (request.Description != null)
            department.Description = request.Description;

        if (request.IsActive.HasValue)
            department.IsActive = request.IsActive.Value;

        department.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return _mapper.Map<DepartmentDto>(department);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var department = await _db.Departments
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        if (department == null)
            return false;

        // Prevent deletion of departments that still have users/students/lecturers/semesters.
        var userCount = await _db.Users.CountAsync(u => !u.IsDeleted && u.DepartmentId == id);
        var studentCount = await _db.Students.CountAsync(s => !s.IsDeleted && s.DepartmentId == id);
        var lecturerCount = await _db.Lecturers.CountAsync(l => !l.IsDeleted && l.DepartmentId == id);
        var semesterCount = await _db.Semesters.CountAsync(s => !s.IsDeleted && s.DepartmentId == id);

        if (userCount > 0 || studentCount > 0 || lecturerCount > 0 || semesterCount > 0)
        {
            throw new InvalidOperationException(
                "Không thể xóa khoa đang có người dùng, sinh viên, giảng viên hoặc Kỳ thực tập.");
        }

        department.IsDeleted = true;
        department.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> CodeExistsAsync(string code, Guid? excludeId = null)
    {
        var query = _db.Departments.Where(d => d.Code == code.Trim().ToUpperInvariant() && !d.IsDeleted);
        if (excludeId.HasValue)
            query = query.Where(d => d.Id != excludeId.Value);
        return await query.AnyAsync();
    }
}
