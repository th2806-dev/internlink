using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>
/// Global user management for SuperAdmin.
/// </summary>
[ApiController]
[Route(AdminApiRoutes.SuperAdminPrefix + "/users")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public class SuperAdminUsersController : ControllerBase
{
    private readonly IUserManagementService _userManagementService;

    public SuperAdminUsersController(IUserManagementService userManagementService)
    {
        _userManagementService = userManagementService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] UserFilterRequest filter)
    {
        if (filter.Skip < 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Skip must be greater than or equal to 0" }));
        if (filter.Take < 1 || filter.Take > 1000)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Take must be between 1 and 1000" }));

        var result = await _userManagementService.GetUsersAsync(filter);
        return Ok(ApiResponse<PaginatedResponse<UserDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _userManagementService.GetUserByIdAsync(id);
        if (user == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "User not found" }));

        return Ok(ApiResponse<UserDto>.Ok(user));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

            var user = await _userManagementService.CreateUserAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = user.Id }, ApiResponse<UserDto>.Ok(user));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

            var user = await _userManagementService.UpdateUserAsync(id, request);
            if (user == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "User not found" }));

            return Ok(ApiResponse<UserDto>.Ok(user));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPost("{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id)
    {
        try
        {
            var result = await _userManagementService.ResetPasswordAsync(id);
            if (result == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "User not found" }));

            return Ok(ApiResponse<ResetPasswordResultDto>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var deleted = await _userManagementService.DeleteUserAsync(id);
            if (!deleted)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "User not found" }));

            return Ok(ApiResponse<object>.Ok(null));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }
}
