using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>
/// Account request management controller.
/// SuperAdmin manages global account provisioning and admin-khoa account approvals.
/// DepartmentAdmin is not allowed to process or approve requests that could create another DepartmentAdmin.
/// </summary>
[ApiController]
[Route("api/Admin/account-requests")]
[Authorize(Policy = "RequireSuperAdmin")]
public class AdminAccountRequestsController : ControllerBase
{
    private readonly IAccountRequestService _service;

    public AdminAccountRequestsController(IAccountRequestService service)
    {
        _service = service;
    }

    /// <summary>
    /// Get all account requests with optional filters
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status = null,
        [FromQuery] string? role = null,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 100)
    {
        var items = await _service.GetAllAsync(status, role, skip, take);
        return Ok(ApiResponse<IReadOnlyList<AccountRequestDto>>.Ok(items));
    }

    /// <summary>
    /// Get a single account request by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var item = await _service.GetByIdAsync(id);
        if (item == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Account request not found" }));
        return Ok(ApiResponse<AccountRequestDto>.Ok(item));
    }

    /// <summary>
    /// Create a new account request
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAccountRequestRequest request)
    {
        try
        {
            var item = await _service.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ApiResponse<AccountRequestDto>.Ok(item));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>
    /// Process an account request (approve, reject, need_info)
    /// </summary>
    [HttpPost("{id:guid}/process")]
    public async Task<IActionResult> Process(Guid id, [FromBody] ProcessAccountRequestRequest request)
    {
        try
        {
            var item = await _service.ProcessAsync(id, request);
            if (item == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Account request not found" }));
            return Ok(ApiResponse<AccountRequestDto>.Ok(item));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>
    /// Get count of pending requests
    /// </summary>
    [HttpGet("pending-count")]
    public async Task<IActionResult> GetPendingCount()
    {
        var count = await _service.GetPendingCountAsync();
        return Ok(ApiResponse<int>.Ok(count));
    }
}
