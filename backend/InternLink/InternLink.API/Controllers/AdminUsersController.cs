using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>
/// Admin user account management.
/// SuperAdmin can create DepartmentAdmin accounts and manage global users.
/// DepartmentAdmin can manage users within their own department only.
/// </summary>
[ApiController]
[Route("api/Admin/users")]
[Authorize(Policy = "RequireAdmin")]
public class AdminUsersController : ControllerBase
{
    private readonly IUserManagementService _userManagementService;
    private readonly IDepartmentScopeService _deptScope;

    public AdminUsersController(IUserManagementService userManagementService, IDepartmentScopeService deptScope)
    {
        _userManagementService = userManagementService;
        _deptScope = deptScope;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] UserFilterRequest filter)
    {
        if (filter.Skip < 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Skip must be greater than or equal to 0" }));
        if (filter.Take < 1 || filter.Take > 1000)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Take must be between 1 and 1000" }));

        var deptId = _deptScope.GetCurrentDepartmentId(User);
        var result = await _userManagementService.GetUsersAsync(filter, departmentId: deptId);
        return Ok(ApiResponse<PaginatedResponse<UserDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _userManagementService.GetUserByIdAsync(id);
        if (user == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "User not found" }));

        if (!_deptScope.HasAccess(User, user.DepartmentId))
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

            var creatorDepartmentId = _deptScope.GetCurrentDepartmentId(User);
            var user = await _userManagementService.CreateUserAsync(request, creatorDepartmentId);
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

            // Check access BEFORE mutating (avoid writing another department's record).
            var target = await _userManagementService.GetUserByIdAsync(id);
            if (target == null || !_deptScope.HasAccess(User, target.DepartmentId))
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "User not found" }));

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
        var target = await _userManagementService.GetUserByIdAsync(id);
        if (target == null || !_deptScope.HasAccess(User, target.DepartmentId))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "User not found" }));

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
        var target = await _userManagementService.GetUserByIdAsync(id);
        if (target == null || !_deptScope.HasAccess(User, target.DepartmentId))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "User not found" }));

        try
        {
            var ok = await _userManagementService.DeleteUserAsync(id);
            if (!ok)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "User not found" }));

            return Ok(ApiResponse<object>.Ok(null));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }
}
