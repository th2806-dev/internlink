using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Persistence;

public static class SeedData
{
    /// <summary>
    /// Default password for all seeded accounts: Password123!
    /// </summary>
    public const string DefaultPassword = "Password123!";

    public static async Task InitializeAsync(AppDbContext context)
    {
        var hasher = new PasswordHasher<User>();

        await EnsureDepartmentsAsync(context);
        await EnsureSuperAdminAsync(context, hasher);
        await EnsureDepartmentAdminsAsync(context, hasher);
        await EnsureSemestersAsync(context);
        await DemoDataSeeder.SeedAsync(context, hasher);
    }

    /// <summary>
    /// Create department seed data.
    /// </summary>
    private static async Task EnsureDepartmentsAsync(AppDbContext context)
    {
        if (await context.Departments.AnyAsync())
            return;

        var cntt = new Department
        {
            Id = Guid.Parse("aaaa1111-1111-1111-1111-111111111111"),
            Code = "CNTT",
            Name = "Khoa Công nghệ Thông tin",
            Description = "Khoa đào tạo ngành Công nghệ Thông tin, Kỹ thuật Phần mềm, Mạng máy tính",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var qtkd = new Department
        {
            Id = Guid.Parse("aaaa2222-2222-2222-2222-222222222222"),
            Code = "QTKD",
            Name = "Khoa Quản trị Kinh doanh",
            Description = "Khoa đào tạo ngành Quản trị Kinh doanh, Marketing, Tài chính",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        context.Departments.AddRange(cntt, qtkd);
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Ensure SuperAdmin account exists (DepartmentId = null → sees all departments).
    /// </summary>
    private static async Task EnsureSuperAdminAsync(AppDbContext context, PasswordHasher<User> hasher)
    {
        const string username = "admin";
        var user = await context.Users.FirstOrDefaultAsync(u => u.Username == username);

        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Username = username,
                FullName = "Super Admin",
                Email = "admin@internlink.test",
                Role = Role.SuperAdmin,
                DepartmentId = null, // SuperAdmin sees ALL departments
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            user.PasswordHash = hasher.HashPassword(user, DefaultPassword);
            await context.Users.AddAsync(user);
        }
        else
        {
            user.IsActive = true;
            user.IsDeleted = false;
            user.FullName = "Super Admin";
            user.Role = Role.SuperAdmin;
            user.DepartmentId = null;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Create DepartmentAdmin accounts for each department.
    /// Each admin is scoped to their department via DepartmentId.
    /// </summary>
    private static async Task EnsureDepartmentAdminsAsync(AppDbContext context, PasswordHasher<User> hasher)
    {
        var departments = await context.Departments.Where(d => d.IsActive && !d.IsDeleted).ToListAsync();

        foreach (var dept in departments)
        {
            var username = $"admin-{dept.Code.ToLower()}";
            var existing = await context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (existing != null)
                continue;

            var adminUser = new User
            {
                Id = Guid.NewGuid(),
                Username = username,
                FullName = $"Admin Khoa {dept.Code}",
                Email = $"{username}@internlink.test",
                Role = Role.DepartmentAdmin,
                DepartmentId = dept.Id, // Scoped to this department
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            adminUser.PasswordHash = hasher.HashPassword(adminUser, DefaultPassword);
            await context.Users.AddAsync(adminUser);
        }

        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Seed semesters per department.
    /// </summary>
    private static async Task EnsureSemestersAsync(AppDbContext context)
    {
        if (await context.Semesters.AnyAsync())
            return;

        var departments = await context.Departments.Where(d => d.IsActive && !d.IsDeleted).ToListAsync();

        foreach (var dept in departments)
        {
            var activeSem = new Semester
            {
                Id = Guid.NewGuid(),
                Name = $"Thực tập Tốt nghiệp {dept.Code} (2025 - 2026)",
                Term = "Học kỳ I",
                AcademicYear = "2025 - 2026",
                StartDate = DateTime.UtcNow.AddMonths(-2),
                EndDate = DateTime.UtcNow.AddMonths(2),
                Status = SemesterStatus.Active,
                Description = $"Đợt thực tập chính thức cho sinh viên Khoa {dept.Name}.",
                MaxStudentsPerLecturer = 30,
                DepartmentId = dept.Id,
                CreatedAt = DateTime.UtcNow
            };

            var upcomingSem = new Semester
            {
                Id = Guid.NewGuid(),
                Name = $"Thực tập Doanh nghiệp {dept.Code} (2025 - 2026)",
                Term = "Học kỳ II",
                AcademicYear = "2025 - 2026",
                StartDate = DateTime.UtcNow.AddMonths(3),
                EndDate = DateTime.UtcNow.AddMonths(7),
                Status = SemesterStatus.Upcoming,
                Description = $"Đợt thực tập Học kỳ II dành cho sinh viên Khoa {dept.Name}.",
                MaxStudentsPerLecturer = 30,
                DepartmentId = dept.Id,
                CreatedAt = DateTime.UtcNow
            };

            context.Semesters.AddRange(activeSem, upcomingSem);
        }

        await context.SaveChangesAsync();
    }
}
