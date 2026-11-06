using InternLink.API.Extensions;
using InternLink.API.Filters;
using InternLink.API.Hubs;
using InternLink.Application;
using InternLink.Infrastructure;
using Microsoft.OpenApi;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Load local overrides (email passwords, etc.) â€” this file is gitignored
builder.Configuration.AddJsonFile("appsettings.local.json", optional: true, reloadOnChange: true);
builder.Configuration.AddEnvironmentVariables();
builder.Configuration.AddCommandLine(args);

// Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .CreateLogger();

builder.Host.UseSerilog();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonDateTimeUtcConverter());
        options.JsonSerializerOptions.Converters.Add(new JsonNullableDateTimeUtcConverter());
    });
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        // Content-Disposition pháº£i Ä‘Æ°á»£c expose Ä‘á»ƒ frontend Ä‘á»c tĂªn file xuáº¥t (Excel/PDF/Word)
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .WithExposedHeaders("Content-Disposition", "Content-Length")
                .AllowCredentials();
        }
        else if (builder.Environment.IsDevelopment())
        {
            policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .WithExposedHeaders("Content-Disposition", "Content-Length")
                .AllowCredentials();
        }
        else
        {
            policy.WithOrigins(Array.Empty<string>())
                .AllowAnyHeader()
                .AllowAnyMethod()
                .WithExposedHeaders("Content-Disposition", "Content-Length");
        }
    });
});

builder.Services.AddSignalR();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddScoped<InternLink.Application.Interfaces.IRealtimeNotificationService, InternLink.Infrastructure.Services.RealtimeNotificationService<NotificationHub>>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddCustomHealthChecks();
builder.Services.AddSwaggerGen(c =>
{
    c.OperationFilter<FileUploadOperationFilter>();

    c.AddSecurityDefinition("bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Paste JWT from /api/Auth/login. Example: eyJhbGciOi..."
    });

    c.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("bearer", document)] = []
    });
});

var app = builder.Build();

// Fail-fast validation: Ensure strong JWT Secret is configured
var jwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32)
{
    throw new InvalidOperationException(
        "Lá»—i cáº¥u hĂ¬nh báº£o máº­t: 'Jwt:Secret' chÆ°a Ä‘Æ°á»£c khai bĂ¡o hoáº·c cĂ³ Ä‘á»™ dĂ i dÆ°á»›i 32 kĂ½ tá»±. " +
        "Vui lĂ²ng cáº¥u hĂ¬nh khĂ³a Ä‘á»§ máº¡nh qua biáº¿n mĂ´i trÆ°á»ng (Jwt__Secret), " +
        "User Secrets (dotnet user-secrets set \"Jwt:Secret\" \"<your-secret>\"), hoáº·c appsettings.Development.json.");
}

app.UseApiExceptionHandler();
app.UseResponseCompression();
app.UseSerilogRequestLogging();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "InternLink API v1");
    c.RoutePrefix = "swagger";
});

// 1. Phuc vu Static Files cho React SPA truoc (tranh ton chi phi pipeline Auth cho asset tinh)
app.UseDefaultFiles();
app.UseStaticFiles();

// 2. CORS must come before HTTPS redirection to avoid 307 on OPTIONS preflight
app.UseCors("Frontend");

// 3. HTTPS Redirection (chi bat khi cau hinh yeu cau hoac co chung chi SSL thuc te)
if (builder.Configuration.GetValue<bool>("Security:EnforceHttps", false))
{
    app.UseHttpsRedirection();
}

// 4. Authentication & Authorization cho API
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<InternLink.API.Middleware.StudentArchiveReadOnlyMiddleware>();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapCustomHealthChecks();
app.MapFallbackToFile("index.html");

await app.MigrateAndSeedDatabaseAsync();

app.Run();
