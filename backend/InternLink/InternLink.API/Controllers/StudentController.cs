using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;

namespace InternLink.API.Controllers;

/// <summary>
/// Read-only student lookup scoped to assigned Lecturer (or global for SuperAdmin).
/// Master-data write/import is in <see cref="AdminStudentsController"/> (/api/Admin/students).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireLecturerOrAdmin")]
public class StudentController : ControllerBase
{
    private readonly IStudentService _studentService;
    private readonly ILecturerAccessService _lecturerAccessService;

    public StudentController(
        IStudentService studentService,
        ILecturerAccessService lecturerAccessService)
    {
        _studentService = studentService;
        _lecturerAccessService = lecturerAccessService;
    }

    private async Task<(bool isLecturer, Guid? lecturerId)> ResolveLecturerScopeAsync()
    {
        if (User.IsSuperAdmin())
            return (false, null);

        var userId = User.GetUserId();
        if (userId == null)
            return (true, Guid.Empty);

        var lecturerId = await _lecturerAccessService.ResolveLecturerIdAsync(userId.Value);
        return (true, lecturerId ?? Guid.Empty);
    }

    /// <summary>
    /// Get all students with pagination (scoped to assigned Lecturer if not Admin).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllStudents([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        try
        {
            if (skip < 0)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.SkipMustBeNonNegative }));

            if (take < 1 || take > 1000)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.TakeMustBeInRange }));

            var (isLecturer, lecturerId) = await ResolveLecturerScopeAsync();
            if (isLecturer && lecturerId == Guid.Empty)
                return Ok(ApiResponse<IEnumerable<StudentDto>>.Ok(Array.Empty<StudentDto>()));

            var students = await _studentService.GetAllStudentsAsync(skip, take, lecturerId);
            return Ok(ApiResponse<IEnumerable<StudentDto>>.Ok(students));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.InternalServerError, Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Get students with filtering (scoped to assigned Lecturer if not Admin).
    /// </summary>
    [HttpPost("search")]
    public async Task<IActionResult> SearchStudents([FromBody] StudentFilterRequest request)
    {
        try
        {
            if (request.Skip < 0)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.SkipMustBeNonNegative }));

            if (request.Take < 1 || request.Take > 1000)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.TakeMustBeInRange }));

            var (isLecturer, lecturerId) = await ResolveLecturerScopeAsync();
            if (isLecturer && lecturerId == Guid.Empty)
            {
                return Ok(ApiResponse<PaginatedResponse<StudentDto>>.Ok(new PaginatedResponse<StudentDto>
                {
                    Items = Array.Empty<StudentDto>(),
                    Total = 0,
                    Skip = request.Skip,
                    Take = request.Take
                }));
            }

            var result = await _studentService.GetStudentsWithFilterAsync(request, lecturerId);
            return Ok(ApiResponse<PaginatedResponse<StudentDto>>.Ok(result));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.InternalServerError, Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Get a specific student by ID (scoped to assigned Lecturer if not Admin).
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetStudentById(Guid id)
    {
        try
        {
            var (isLecturer, lecturerId) = await ResolveLecturerScopeAsync();
            if (isLecturer && lecturerId == Guid.Empty)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.StudentNotFound }));

            var student = await _studentService.GetStudentByIdAsync(id, lecturerId);
            if (student == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.StudentNotFound }));

            return Ok(ApiResponse<StudentDto>.Ok(student));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.InternalServerError, Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Get a student by student code (MSSV) (scoped to assigned Lecturer if not Admin).
    /// </summary>
    [HttpGet("by-number/{studentCode}")]
    public async Task<IActionResult> GetStudentByNumber(string studentCode)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(studentCode))
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Student number is required" }));

            var (isLecturer, lecturerId) = await ResolveLecturerScopeAsync();
            if (isLecturer && lecturerId == Guid.Empty)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.StudentNotFound }));

            var student = await _studentService.GetStudentByCodeAsync(studentCode, lecturerId);
            if (student == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.StudentNotFound }));

            return Ok(ApiResponse<StudentDto>.Ok(student));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.InternalServerError, Detail = ex.Message }));
        }
    }

    /// <summary>
    /// Check if a student number already exists (Admin only).
    /// </summary>
    [HttpGet("check/{studentCode}")]
    [Authorize(Policy = AdminPolicies.DepartmentAdmin)]
    public async Task<IActionResult> CheckStudentNumberExists(string studentCode)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(studentCode))
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Student number is required" }));

            var exists = await _studentService.StudentCodeExistsAsync(studentCode);
            return Ok(ApiResponse<bool>.Ok(exists));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.InternalServerError, Detail = ex.Message }));
        }
    }
}
