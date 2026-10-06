using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Infrastructure.Email;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace InternLink.API.Controllers;

[ApiController]
[Route(AdminApiRoutes.SuperAdminPrefix + "/email")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public class SuperAdminEmailController : ControllerBase
{
    private readonly IEmailService _emailService;
    private readonly EmailSettings _emailSettings;

    public SuperAdminEmailController(IEmailService emailService, IOptions<EmailSettings> emailOptions)
    {
        _emailService = emailService;
        _emailSettings = emailOptions.Value;
    }

    [HttpPost("test")]
    public async Task<IActionResult> TestEmail([FromBody] TestEmailRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.InvalidInput }));

        var portalUrl = _emailSettings.PortalUrl.TrimEnd('/');
        var displayName = string.IsNullOrWhiteSpace(request.FullName)
            ? "Người nhận thử"
            : request.FullName.Trim();
        var result = await _emailService.SendAsync(
            request.ToEmail.Trim(),
            "[InternLink] Email kiểm tra gửi thư",
            $"<p>Xin chào {System.Net.WebUtility.HtmlEncode(displayName)},</p>" +
            $"<p>Đây là email kiểm tra cấu hình gửi thư của InternLink.</p>" +
            $"<p>Địa chỉ hệ thống: <a href=\"{System.Net.WebUtility.HtmlEncode(portalUrl)}\">{System.Net.WebUtility.HtmlEncode(portalUrl)}</a></p>",
            $"Xin chào {displayName},\n\nĐây là email kiểm tra cấu hình gửi thư của InternLink.\nĐịa chỉ hệ thống: {portalUrl}",
            cancellationToken);
        if (!result.Success)
            return StatusCode(502, ApiResponse<object>.Fail(new ApiError { Title = result.Message ?? "Email delivery failed" }));

        return Ok(ApiResponse<SendEmailResult>.Ok(result));
    }
}
