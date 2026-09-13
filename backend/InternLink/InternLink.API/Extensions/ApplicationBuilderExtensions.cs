using InternLink.Application.Interfaces;
using InternLink.Infrastructure.Persistence;
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

            // Keep the database clean so the environment can be initialized manually.
            // SeedData.InitializeAsync(context) is intentionally skipped.
            var documentService = services.GetRequiredService<IDocumentService>();
            await documentService.SeedDefaultTemplatesAsync();
            logger.LogInformation("Database migration completed successfully.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while migrating or seeding the database: {Message}", ex.Message);
        }
    }
}
