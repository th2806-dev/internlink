using System.Text;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Infrastructure.Email;
using InternLink.Infrastructure.Identity;
using InternLink.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace InternLink.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // DbContext
        var connection = configuration.GetConnectionString("DefaultConnection");
        services.AddDbContext<Persistence.AppDbContext>(options =>
            options.UseSqlServer(connection)
                   .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

        // Jwt settings
        var jwtSection = configuration.GetSection("Jwt");
        services.Configure<JwtSettings>(jwtSection);
        var jwtSettings = jwtSection.Get<JwtSettings>() ?? new JwtSettings();

        // Authentication
        var key = Encoding.UTF8.GetBytes(jwtSettings.Secret ?? string.Empty);
        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = true;
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidAudience = jwtSettings.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(key)
            };

            // Support SignalR WebSocket authentication via Query parameter 'access_token'
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                }
            };
        });

        // SignalR Core
        services.AddSignalR();

        // JwtService (interface moved to Shared project)
        services.AddScoped<InternLink.Shared.Interfaces.IJwtService, Identity.JwtService>();

        // Password hasher for User
        services.AddScoped<Microsoft.AspNetCore.Identity.PasswordHasher<InternLink.Domain.Entities.User>>();

        // Auth service
        services.AddScoped<InternLink.Application.Interfaces.IAuthService, InternLink.Infrastructure.Services.AuthService>();

        // Semester management service
        services.AddScoped<InternLink.Application.Interfaces.ISemesterService, InternLink.Infrastructure.Services.SemesterService>();

        // Lecturer workflow service
        services.AddScoped<InternLink.Application.Interfaces.ILecturerService, InternLink.Infrastructure.Services.LecturerService>();
        services.AddScoped<InternLink.Application.Interfaces.ILecturerAccessService, InternLink.Infrastructure.Services.LecturerAccessService>();

        // Lecturer profile CRUD / import / overview
        services.AddScoped<InternLink.Application.Interfaces.ILecturerProfileService, InternLink.Infrastructure.Services.LecturerProfileService>();

        // Student management service
        services.AddScoped<InternLink.Application.Interfaces.IStudentService, InternLink.Infrastructure.Services.StudentService>();

        // Company management service
        services.AddScoped<InternLink.Application.Interfaces.ICompanyService, InternLink.Infrastructure.Services.CompanyService>();

        // Internship management service
        services.AddScoped<InternLink.Application.Interfaces.IInternshipService, InternLink.Infrastructure.Services.InternshipService>();

        // Document management service
        services.AddScoped<InternLink.Application.Interfaces.IDocumentService, InternLink.Infrastructure.Services.DocumentService>();

        // Evaluation and grading service
        services.AddScoped<InternLink.Application.Interfaces.IEvaluationService, InternLink.Infrastructure.Services.EvaluationService>();

        // Submission and feedback service
        services.AddScoped<InternLink.Application.Interfaces.ISubmissionService, InternLink.Infrastructure.Services.SubmissionService>();

        // Weekly report service
        services.AddScoped<InternLink.Application.Interfaces.IWeeklyReportService, InternLink.Infrastructure.Services.WeeklyReportService>();

        // Attendance & Meeting service
        services.AddScoped<IAttendanceService, InternLink.Infrastructure.Services.AttendanceService>();
        services.AddScoped<IInternshipGradingService, InternLink.Infrastructure.Services.InternshipGradingService>();

        // Faculty-level semester summary (admin khoa soạn báo cáo tổng kết theo kỳ)
        services.AddScoped<ISemesterSummaryService, InternLink.Infrastructure.Services.SemesterSummaryService>();

        // Notification service
        services.AddScoped<InternLink.Application.Interfaces.INotificationService, InternLink.Infrastructure.Services.NotificationService>();

        // Admin broadcast notifications
        services.AddScoped<IAdminNotificationService, InternLink.Infrastructure.Services.AdminNotificationService>();

        // Excel processing & export engine
        services.AddScoped<IExcelService, InternLink.Infrastructure.Services.ExcelService>();
        services.AddScoped<IExcelExportService, InternLink.Infrastructure.Services.ExcelExportService>();
        services.AddScoped<IInternshipReportService, InternLink.Infrastructure.Services.InternshipReportService>();

        // PDF export engine
        services.AddScoped<IPdfExportService, InternLink.Infrastructure.Services.PdfExportService>();

        // User management (Admin)
        services.AddScoped<IUserManagementService, InternLink.Infrastructure.Services.UserManagementService>();

        // Department management service
        services.AddScoped<InternLink.Application.Interfaces.IDepartmentService, InternLink.Infrastructure.Services.DepartmentService>();

        // System settings (DB-backed)
        services.AddScoped<Application.Interfaces.ISettingsService, Services.SettingsService>();

        // Account requests management
        services.AddScoped<IAccountRequestService, Services.AccountRequestService>();

        // Student–lecturer assignment (Admin)
        services.AddScoped<IAssignmentService, InternLink.Infrastructure.Services.AssignmentService>();

        // Department-based multi-tenancy scoping
        services.AddHttpContextAccessor();
        services.AddScoped<IDepartmentScopeService, Services.DepartmentScopeService>();

        // AutoMapper profile from Infrastructure layer (Department DTO etc.)
        services.AddAutoMapper(cfg => { }, typeof(AutoMapper.AutoMapperProfile).Assembly);

        // AutoMapper profile from Infrastructure layer (Department DTO etc.)
        services.AddAutoMapper(cfg => { }, typeof(AutoMapper.AutoMapperProfile).Assembly);

        // Email (invitation / notifications)
        var emailSection = configuration.GetSection(EmailSettings.SectionName);
        services.Configure<EmailSettings>(emailSection);
        var emailSettings = emailSection.Get<EmailSettings>() ?? new EmailSettings();
        if (emailSettings.Enabled)
            services.AddScoped<IEmailService, SmtpEmailService>();
        else
            services.AddScoped<IEmailService, LoggingEmailService>();

        // Authorization policies for roles.
        // RequireSuperAdmin = SuperAdmin only. Used for global system setup and creating DepartmentAdmin accounts.
        // RequireDepartmentAdmin = DepartmentAdmin only. Used for department-scoped operational management.
        // RequireAdmin = SuperAdmin or DepartmentAdmin. Kept as a compatibility helper for shared department-scoped admin endpoints.
        services.AddAuthorization(options =>
        {
            options.AddPolicy(AdminPolicies.SuperAdmin, p => p.RequireRole("SuperAdmin"));
            options.AddPolicy(AdminPolicies.DepartmentAdmin, p => p.RequireRole("DepartmentAdmin"));
            options.AddPolicy(AdminPolicies.LegacyAdmin, p => p.RequireRole("SuperAdmin", "DepartmentAdmin"));
            options.AddPolicy("RequireLecturer", p => p.RequireRole("Lecturer"));
            options.AddPolicy("RequireStudent", p => p.RequireRole("Student"));
            options.AddPolicy("RequireLecturerOrAdmin", p => p.RequireRole("Lecturer", "SuperAdmin", "DepartmentAdmin"));
            // Lecturer operational writes (grading, report review, feedback, documents...): SuperAdmin is
            // system administration only and must NOT take part in faculty internship operations.
            options.AddPolicy("RequireLecturerOrDepartmentAdmin", p => p.RequireRole("Lecturer", "DepartmentAdmin"));
        });

        return services;
    }
}
