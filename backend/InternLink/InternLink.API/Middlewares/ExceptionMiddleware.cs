using System.Text.Json;
using InternLink.Shared.Responses;

namespace InternLink.API.Middlewares;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (status, title) = exception switch
        {
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, exception.Message),
            KeyNotFoundException => (StatusCodes.Status404NotFound, exception.Message),
            InvalidOperationException => (StatusCodes.Status400BadRequest, exception.Message),
            ArgumentException => (StatusCodes.Status400BadRequest, exception.Message),
            _ => (StatusCodes.Status500InternalServerError, ErrorMessage.InternalServerError)
        };

        var detail = status == StatusCodes.Status500InternalServerError ? null : exception.Message;
        var error = ApiError.From(title, detail, status);
        var response = ApiResponse<object>.Fail(error);
        var payload = JsonSerializer.Serialize(response, JsonOptions);
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = status;
        return context.Response.WriteAsync(payload);
    }
}
