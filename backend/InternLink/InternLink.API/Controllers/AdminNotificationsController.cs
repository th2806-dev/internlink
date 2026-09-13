using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/Admin/notifications")]
[Authorize(Policy = "RequireAdmin")]
public class AdminNotificationsController : ControllerBase
{
    private readonly IAdminNotificationService _adminNotificationService;
    private readonly IDepartmentScopeService _deptScope;

    public AdminNotificationsController(IAdminNotificationService adminNotificationService, IDepartmentScopeService deptScope)
    {
        _adminNotificationService = adminNotificationService;
        _deptScope = deptScope;
    }

    [HttpGet]
    public async Task<IActionResult> GetCampaigns([FromQuery] int take = 100)
    {
        var items = await _adminNotificationService.GetCampaignsAsync(take);
        return Ok(ApiResponse<IReadOnlyList<AdminNotificationCampaignDto>>.Ok(items));
    }

    [HttpPost("broadcast")]
    public async Task<IActionResult> Broadcast([FromBody] AdminBroadcastNotificationRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

            var result = await _adminNotificationService.BroadcastAsync(request, _deptScope.GetCurrentDepartmentId(User));
            return Ok(ApiResponse<AdminBroadcastNotificationResultDto>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpDelete("campaign")]
    public async Task<IActionResult> DeleteCampaign([FromBody] AdminDeleteNotificationCampaignRequest request)
    {
        try
        {
            var deleted = await _adminNotificationService.DeleteCampaignAsync(request);
            if (deleted == 0)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Notification campaign not found" }));

            return Ok(ApiResponse<object>.Ok(new { deletedCount = deleted }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }
}
