using InternLink.API.Extensions;
using InternLink.Application.Interfaces;
using InternLink.Domain.Enums;
using InternLink.Shared.Responses;

namespace InternLink.API.Middleware;

public sealed class StudentArchiveReadOnlyMiddleware
{
    private readonly RequestDelegate _next;

    public StudentArchiveReadOnlyMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IStudentService studentService)
    {
        if (!context.User.IsInRole(Role.Student.ToString())
            || HttpMethods.IsGet(context.Request.Method)
            || HttpMethods.IsHead(context.Request.Method)
            || HttpMethods.IsOptions(context.Request.Method)
            || IsAuthExemptRequest(context.Request))
        {
            await _next(context);
            return;
        }

        var userId = context.User.GetUserId();
        if (userId.HasValue && await studentService.IsArchiveReadOnlyAsync(userId.Value))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(
                new ApiError { Title = "Tài khoản đang ở chế độ chỉ xem vì kỳ thực tập đã kết thúc." }));
            return;
        }

        await _next(context);
    }

    private static bool IsAuthExemptRequest(HttpRequest request)
    {
        if (!HttpMethods.IsPost(request.Method))
            return false;

        var path = request.Path.Value;
        return string.Equals(path, "/api/Auth/refresh-token", StringComparison.OrdinalIgnoreCase)
            || string.Equals(path, "/api/Auth/logout", StringComparison.OrdinalIgnoreCase)
            || string.Equals(path, "/api/Auth/revoke-token", StringComparison.OrdinalIgnoreCase)
            || string.Equals(path, "/api/Auth/revoke-all", StringComparison.OrdinalIgnoreCase);
    }
}
