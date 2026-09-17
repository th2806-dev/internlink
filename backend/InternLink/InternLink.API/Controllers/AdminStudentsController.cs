using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>
/// Admin student master-data management (import, create accounts, invitation email).
/// DepartmentAdmin sees only their department's students.
/// </summary>
[ApiController]
[Route("api/Admin/students")]
[Route(AdminApiRoutes.DepartmentAdminPrefix + "/students")]
[Authorize(Policy = AdminPolicies.DepartmentAdmin)]
public class AdminStudentsController : ControllerBase
{
    private readonly IStudentService _studentService;
    private readonly IDepartmentScopeService _deptScope;

    public AdminStudentsController(IStudentService studentService, IDepartmentScopeService deptScope)
    {
        _studentService = studentService;
        _deptScope = deptScope;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int skip = 0, [FromQuery] int take = 100, [FromQuery] Guid? semesterId = null, [FromQuery] Guid? departmentId = null)
    {
        if (skip < 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Skip must be greater than or equal to 0" }));
        if (take < 1 || take > 1000)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Take must be between 1 and 1000" }));

        var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
        var students = await _studentService.GetAllStudentsAsync(skip, take, semesterId: semesterId, departmentId: deptId);
        return Ok(ApiResponse<IEnumerable<StudentDto>>.Ok(students));
    }

    [HttpPost("search")]
    public async Task<IActionResult> Search([FromBody] StudentFilterRequest request)
    {
        if (request.Skip < 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Skip must be greater than or equal to 0" }));
        if (request.Take < 1 || request.Take > 1000)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Take must be between 1 and 1000" }));

        var deptId = _deptScope.ResolveEffectiveDepartmentId(User, request.DepartmentId);
        var result = await _studentService.GetStudentsWithFilterAsync(request, departmentId: deptId);
        return Ok(ApiResponse<PaginatedResponse<StudentDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var student = await _studentService.GetStudentByIdAsync(id);
        if (student == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Student not found" }));

        if (!_deptScope.HasAccess(User, student.DepartmentId))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Student not found" }));

        return Ok(ApiResponse<StudentDto>.Ok(student));
    }

    [HttpGet("by-number/{studentCode}")]
    public async Task<IActionResult> GetByCode(string studentCode)
    {
        if (string.IsNullOrWhiteSpace(studentCode))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Student number is required" }));

        var student = await _studentService.GetStudentByCodeAsync(studentCode);
        if (student == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Student not found" }));

        if (!_deptScope.HasAccess(User, student.DepartmentId))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Student not found" }));

        return Ok(ApiResponse<StudentDto>.Ok(student));
    }

    [HttpGet("check/{studentCode}")]
    public async Task<IActionResult> CheckExists(string studentCode)
    {
        if (string.IsNullOrWhiteSpace(studentCode))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Student number is required" }));

        var exists = await _studentService.StudentCodeExistsAsync(studentCode);
        if (exists)
        {
            var existing = await _studentService.GetStudentByCodeAsync(studentCode);
            if (existing != null && !_deptScope.HasAccess(User, existing.DepartmentId))
                return Ok(ApiResponse<bool>.Ok(false));
        }

        return Ok(ApiResponse<bool>.Ok(exists));
    }

    [HttpPost]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Create([FromBody] CreateStudentRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

            // DepartmentAdmin creates within their own department; SuperAdmin's records start unassigned.
            var student = await _studentService.CreateStudentAsync(request, _deptScope.GetCurrentDepartmentId(User));
            return CreatedAtAction(nameof(GetById), new { id = student.Id }, ApiResponse<StudentDto>.Ok(student));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateStudentRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

            // Check access BEFORE mutating (avoid writing another department's record).
            var target = await _studentService.GetStudentByIdAsync(id);
            if (target == null || !_deptScope.HasAccess(User, target.DepartmentId))
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Student not found" }));

            var student = await _studentService.UpdateStudentAsync(id, request);
            if (student == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Student not found" }));

            return Ok(ApiResponse<StudentDto>.Ok(student));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var target = await _studentService.GetStudentByIdAsync(id);
        if (target == null || !_deptScope.HasAccess(User, target.DepartmentId))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Student not found" }));

        try
        {
            var ok = await _studentService.DeleteStudentAsync(id);
            if (!ok)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Student not found" }));

            return Ok(ApiResponse<object>.Ok(null));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpGet("import/template")]
    public IActionResult DownloadImportTemplate()
    {
        var bytes = _studentService.GetStudentImportTemplate();
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Mau-danh-sach-SV.xlsx");
    }

    [HttpPost("import")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Import(IFormFile file, [FromQuery] Guid? semesterId = null, [FromQuery] bool grantAccount = false)
    {
        try
        {
            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Excel file is required" }));

            if (!string.Equals(Path.GetExtension(file.FileName), ".xlsx", StringComparison.OrdinalIgnoreCase))
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Only .xlsx files are supported" }));

            var deptId = _deptScope.GetCurrentDepartmentId(User);
            await using var stream = file.OpenReadStream();
            var result = await _studentService.ImportStudentsFromExcelAsync(stream, semesterId, deptId, grantAccount);
            return Ok(ApiResponse<StudentImportResultDto>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] Guid? semesterId = null, [FromQuery] Guid? departmentId = null)
    {
        var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
        var bytes = await _studentService.ExportStudentsExcelAsync(semesterId, departmentId: deptId);
        var fileName = $"Danh-sach-SV-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }
}
