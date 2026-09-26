using InternLink.Application.Interfaces;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public class LecturerAccessService : ILecturerAccessService
{
    private readonly AppDbContext _db;

    public LecturerAccessService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Guid?> ResolveLecturerIdAsync(Guid userId)
    {
        return await _db.Lecturers
            .Where(l => l.UserId == userId && !l.IsDeleted)
            .Select(l => (Guid?)l.Id)
            .FirstOrDefaultAsync();
    }

    public async Task<bool> CanAccessInternshipAsync(Guid internshipId, Guid userId, bool allowStudentOwner = true)
    {
        var internship = await _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Lecturer)
            .FirstOrDefaultAsync(i => i.Id == internshipId && !i.IsDeleted);

        if (internship == null)
            return false;

        if (allowStudentOwner && internship.Student?.UserId == userId)
            return true;

        if (internship.Lecturer?.UserId == userId)
            return true;

        return await _db.Users.AnyAsync(u => u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted);
    }

    public async Task EnsureAssignedLecturerAsync(Guid internshipId, Guid userId)
    {
        var ok = await CanAccessInternshipAsync(internshipId, userId, allowStudentOwner: false);
        if (!ok)
            throw new UnauthorizedAccessException("You do not have access to this internship");
    }

    public async Task<bool> CanManageSemesterAsync(Guid semesterId, Guid userId)
    {
        // SuperAdmin quản lý toàn hệ thống.
        if (await _db.Users.AnyAsync(u => u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted))
            return true;

        // 1) Được phân công hướng dẫn ít nhất 1 internship trong kỳ.
        var hasInternship = await _db.Internships
            .AnyAsync(i => i.SemesterId == semesterId
                && i.Lecturer != null && i.Lecturer.UserId == userId && !i.IsDeleted);
        if (hasInternship)
            return true;

        // 2) Có trong danh sách giảng viên của kỳ (SemesterLecturers).
        return await _db.SemesterLecturers
            .AnyAsync(sl => sl.SemesterId == semesterId
                && sl.Lecturer.UserId == userId && !sl.IsDeleted);
    }

    public async Task EnsureCanManageSemesterAsync(Guid semesterId, Guid userId)
    {
        if (!await CanManageSemesterAsync(semesterId, userId))
            throw new UnauthorizedAccessException("Bạn không được phân công vào học kỳ này");
    }
}
