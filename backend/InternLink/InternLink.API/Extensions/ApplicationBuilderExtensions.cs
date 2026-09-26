using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Extensions;

public static class ApplicationBuilderExtensions
{
    public static async Task MigrateAndSeedDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var logger = services.GetRequiredService<ILogger<WebApplication>>();

        try
        {
            logger.LogInformation("Applying database migrations...");
            var context = services.GetRequiredService<AppDbContext>();
            await context.Database.MigrateAsync();

            // Fresh environment: seed ONLY the single SuperAdmin account.
            // Business data (departments, semesters, students...) is entered manually via the UI.
            if (!await context.Users.AnyAsync())
            {
                var hasher = new PasswordHasher<User>();
                var admin = new User
                {
                    Id = Guid.NewGuid(),
                    Username = "admin",
                    FullName = "Super Admin",
                    Email = "admin@internlink.test",
                    Role = Role.SuperAdmin,
                    DepartmentId = null, // SuperAdmin sees ALL departments
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                admin.PasswordHash = hasher.HashPassword(admin, SeedData.DefaultPassword);
                context.Users.Add(admin);
                await context.SaveChangesAsync();
                logger.LogInformation("Seeded default SuperAdmin account 'admin'.");
            }

            // Development/demo only: full seed (departments, admins, semesters, demo data)
            // when the fresh SuperAdmin above was just created. Production seeds nothing extra.
            var isDevelopment = app.Environment.IsDevelopment();
            var justSeededAdmin = await context.Users.CountAsync(u => u.Role == Role.SuperAdmin && !u.IsDeleted) == 1
                && !await context.Departments.AnyAsync();
            if (isDevelopment && justSeededAdmin)
            {
                logger.LogInformation("Development fresh database — running full seed (departments, semesters, demo data)...");
                await SeedData.InitializeAsync(context);
                logger.LogInformation("Full development seed completed.");
            }

            logger.LogInformation("Database migration completed successfully.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while migrating or seeding the database: {Message}", ex.Message);
        }
    }
}
