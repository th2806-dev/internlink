using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;

namespace InternLink.API.Controllers;

/// <summary>
/// Legacy & Admin API endpoints for global internship management.
/// NOTE: Lecturers should prefer using the consolidated portal endpoints under `/api/Lecturer/*` (e.g. `/api/Lecturer/internships`, `/api/Lecturer/students`).
/// Reads are scoped to assigned Lecturer when accessed by a Lecturer (global for admins — read-only oversight).
/// Writes: CRUD = DepartmentAdmin; company assignment = Lecturer or DepartmentAdmin.
/// SuperAdmin (system administration) has read-only access and does not take part in these operations.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireLecturerOrAdmin")]
public class InternshipController : ControllerBase
{
    private readonly IInternshipService _internshipService;
    private readonly ILecturerAccessService _lecturerAccessService;
    private readonly IDepartmentScopeService _deptScope;

    public InternshipController(
        IInternshipService internshipService,
        ILecturerAccessService lecturerAccessService,
        IDepartmentScopeService deptScope)
    {
        _internshipService = internshipService;
        _lecturerAccessService = lecturerAccessService;
        _deptScope = deptScope;
    }

    private async Task<(bool isLecturer, Guid? lecturerId)> ResolveLecturerScopeAsync()
    {
        if (User.IsSuperAdmin() || User.IsDepartmentAdmin())
            return (false, null);

        var userId = User.GetUserId();
        if (userId == null)
            return (true, Guid.Empty);

        var lecturerId = await _lecturerAccessService.ResolveLecturerIdAsync(userId.Value);
        return (true, lecturerId ?? Guid.Empty);
    }

    /// <summary>
    /// Get all internships with pagination (scoped to current Lecturer if not Admin)
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllInternships([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        try
        {
            if (skip < 0 || take < 1 || take > 1000)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid pagination parameters" }));

            var (isLecturer, lecturerId) = await ResolveLecturerScopeAsync();
            if (isLecturer && lecturerId == Guid.Empty)
                return Ok(ApiResponse<IEnumerable<InternshipListItemDto>>.Ok(Array.Empty<InternshipListItemDto>()));

            var deptId = _deptScope.GetCurrentDepartmentId(User);
            var internships = await _internshipService.GetAllInternshipsAsync(skip, take, lecturerId, deptId);
            return Ok(ApiResponse<IEnumerable<InternshipListItemDto>>.Ok(internships));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = "Internal server error", Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Search internships with advanced filtering and sorting (scoped to current Lecturer if not Admin)
    /// </summary>
    [HttpPost("search")]
    public async Task<IActionResult> SearchInternships([FromBody] InternshipFilterRequest request)
    {
        try
        {
            if (request.Skip < 0 || request.Take < 1 || request.Take > 1000)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid pagination parameters" }));

            var (isLecturer, lecturerId) = await ResolveLecturerScopeAsync();
            if (isLecturer && lecturerId == Guid.Empty)
            {
                return Ok(ApiResponse<PaginatedResponse<InternshipListItemDto>>.Ok(new PaginatedResponse<InternshipListItemDto>
                {
                    Items = Array.Empty<InternshipListItemDto>(),
                    Total = 0,
                    Skip = request.Skip,
                    Take = request.Take
                }));
            }

            var deptId = _deptScope.GetCurrentDepartmentId(User);
            var result = await _internshipService.GetInternshipsWithFilterAsync(request, lecturerId, deptId);
            return Ok(ApiResponse<PaginatedResponse<InternshipListItemDto>>.Ok(result));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = "Internal server error", Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Get internship by ID with all details (enforces assignment check)
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetInternshipById(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            // DepartmentAdmin: scoped to their own department's internships.            if (User.IsInRole("DepartmentAdmin"))
            {
                var adminInternship = await _internshipService.GetInternshipByIdForDepartmentAdminAsync(id, _deptScope.GetCurrentDepartmentId(User));
                if (adminInternship == null)
                    return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Internship not found" }));

                return Ok(ApiResponse<InternshipDetailFullDto>.Ok(adminInternship));
            }

            var isLecturerOrAdmin = User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin");
            var internship = await _internshipService.GetInternshipByIdAsync(id, userId.Value, isLecturerOrAdmin);
            if (internship == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Internship not found" }));

            return Ok(ApiResponse<InternshipDetailFullDto>.Ok(internship));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = "Internal server error", Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Get internships by student (scoped to Lecturer if not Admin)
    /// </summary>
    [HttpGet("student/{studentId}")]
    public async Task<IActionResult> GetInternshipsByStudent(Guid studentId, [FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        try
        {
            if (skip < 0 || take < 1 || take > 1000)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid pagination parameters" }));

            var (isLecturer, lecturerId) = await ResolveLecturerScopeAsync();
            if (isLecturer && lecturerId == Guid.Empty)
                return Ok(ApiResponse<IEnumerable<InternshipListItemDto>>.Ok(Array.Empty<InternshipListItemDto>()));

            var deptId = _deptScope.GetCurrentDepartmentId(User);
            var internships = await _internshipService.GetInternshipsByStudentAsync(studentId, skip, take, lecturerId, deptId);
            return Ok(ApiResponse<IEnumerable<InternshipListItemDto>>.Ok(internships));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = "Internal server error", Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Get internships by company (scoped to Lecturer if not Admin)
    /// </summary>
    [HttpGet("company/{companyId}")]
    public async Task<IActionResult> GetInternshipsByCompany(Guid companyId, [FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        try
        {
            if (skip < 0 || take < 1 || take > 1000)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid pagination parameters" }));

            var (isLecturer, lecturerId) = await ResolveLecturerScopeAsync();
            if (isLecturer && lecturerId == Guid.Empty)
                return Ok(ApiResponse<IEnumerable<InternshipListItemDto>>.Ok(Array.Empty<InternshipListItemDto>()));

            var deptId = _deptScope.GetCurrentDepartmentId(User);
            var internships = await _internshipService.GetInternshipsByCompanyAsync(companyId, skip, take, lecturerId, deptId);
            return Ok(ApiResponse<IEnumerable<InternshipListItemDto>>.Ok(internships));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = "Internal server error", Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Get internships by status (scoped to Lecturer if not Admin)
    /// </summary>
    [HttpGet("status/{status}")]
    public async Task<IActionResult> GetInternshipsByStatus(string status, [FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        try
        {
            if (skip < 0 || take < 1 || take > 1000)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid pagination parameters" }));

            var (isLecturer, lecturerId) = await ResolveLecturerScopeAsync();
            if (isLecturer && lecturerId == Guid.Empty)
                return Ok(ApiResponse<IEnumerable<InternshipListItemDto>>.Ok(Array.Empty<InternshipListItemDto>()));

            var deptId = _deptScope.GetCurrentDepartmentId(User);
            var internships = await _internshipService.GetInternshipsByStatusAsync(status, skip, take, lecturerId, deptId);
            return Ok(ApiResponse<IEnumerable<InternshipListItemDto>>.Ok(internships));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = "Internal server error", Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Create a new internship (Admin only)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> CreateInternship([FromBody] CreateInternshipRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

            var internship = await _internshipService.CreateInternshipAsync(request);
            return CreatedAtAction(nameof(GetInternshipById), new { id = internship.Id }, ApiResponse<InternshipDetailFullDto>.Ok(internship));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = "Internal server error", Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Update an internship (Admin only)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> UpdateInternship(Guid id, [FromBody] UpdateInternshipRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

            var internship = await _internshipService.UpdateInternshipAsync(id, request);
            if (internship == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Internship not found" }));

            return Ok(ApiResponse<InternshipDetailFullDto>.Ok(internship));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = "Internal server error", Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Update internship status (Admin only)
    /// </summary>
    [HttpPatch("{id}/status")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> UpdateInternshipStatus(Guid id, [FromBody] UpdateInternshipStatusRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

            var internship = await _internshipService.UpdateInternshipStatusAsync(id, request);
            if (internship == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Internship not found" }));

            return Ok(ApiResponse<InternshipDetailFullDto>.Ok(internship));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = "Internal server error", Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Assign or change company for an internship (Lecturer or Admin)
    /// </summary>
    [HttpPut("{id}/company")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> AssignCompany(Guid id, [FromBody] AssignCompanyRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

            var (isLecturer, lecturerId) = await ResolveLecturerScopeAsync();
            if (isLecturer && lecturerId == Guid.Empty)
                return Forbid();

            var internship = await _internshipService.AssignCompanyAsync(id, request, lecturerId);
            if (internship == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Internship not found" }));

            return Ok(ApiResponse<InternshipDetailFullDto>.Ok(internship));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = "Internal server error", Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Delete an internship (Admin only)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> DeleteInternship(Guid id)
    {
        try
        {
            var result = await _internshipService.DeleteInternshipAsync(id);
            if (!result)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Internship not found" }));

            return Ok(ApiResponse<object>.Ok(null));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = "Internal server error", Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Get internship statistics (scoped to current Lecturer if not Admin)
    /// </summary>
    [HttpGet("stats/overview")]
    public async Task<IActionResult> GetInternshipStats()
    {
        try
        {
            var (isLecturer, lecturerId) = await ResolveLecturerScopeAsync();
            if (isLecturer && lecturerId == Guid.Empty)
            {
                return Ok(ApiResponse<InternshipStatsDto>.Ok(new InternshipStatsDto()));
            }

            var deptId = _deptScope.GetCurrentDepartmentId(User);
            var stats = await _internshipService.GetInternshipStatsAsync(lecturerId, departmentId: deptId);
            return Ok(ApiResponse<InternshipStatsDto>.Ok(stats));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = "Internal server error", Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Check if student has active internship
    /// </summary>
    [HttpGet("student/{studentId}/has-active")]
    public async Task<IActionResult> HasActiveInternship(Guid studentId)
    {
        try
        {
            var hasActive = await _internshipService.StudentHasActiveInternshipAsync(studentId);
            return Ok(ApiResponse<bool>.Ok(hasActive));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = "Internal server error", Detail = ex.Message }));
        }
    }
}
