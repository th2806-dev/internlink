using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Infrastructure.Persistence;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Controllers;

[ApiController]
[Route(AdminApiRoutes.SuperAdminPrefix + "/email")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public class SuperAdminEmailController : ControllerBase
{
    private readonly IEmailService _emailService;
    private readonly AppDbContext _db;

    public SuperAdminEmailController(IEmailService emailService, AppDbContext db)
    {
        _emailService = emailService;
        _db = db;
    }

    [HttpPost("test")]
    public async Task<IActionResult> TestEmail([FromBody] TestEmailRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.InvalidInput }));

        var invitation = new InvitationEmailRequest
        {
            ToEmail = request.ToEmail.Trim(),
            FullName = string.IsNullOrWhiteSpace(request.FullName) ? "Người nhận thử" : request.FullName.Trim(),
            Role = request.Role,
            Username = "demo.user",
            TemporaryPassword = "TempPass123!"
        };

        var result = await _emailService.SendInvitationAsync(invitation, cancellationToken);
        if (!result.Success)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = result.Message ?? "Failed to send email" }));

        var targetUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == invitation.ToEmail && !u.IsDeleted, cancellationToken);
        if (targetUser != null)
        {
            await _db.Notifications.AddAsync(new Notification
            {
                Id = Guid.NewGuid(),
                UserId = targetUser.Id,
                Title = "Kiểm tra gửi email thông báo hệ thống",
                Content = $"Đã gửi thử nghiệm thư mời / thông báo tới email: {invitation.ToEmail} thành công.",
                Link = "/admin-settings",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            }, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
        }

        return Ok(ApiResponse<SendEmailResult>.Ok(result));
    }
}
