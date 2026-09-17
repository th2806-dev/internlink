using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireLecturerOrAdmin")]
public class LecturerProfileController : ControllerBase
{
    private readonly ILecturerProfileService _service;
    private readonly IDepartmentScopeService _deptScope;

    public LecturerProfileController(ILecturerProfileService service, IDepartmentScopeService deptScope)
    {
        _service = service;
        _deptScope = deptScope;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int skip = 0, [FromQuery] int take = 100, [FromQuery] Guid? semesterId = null, [FromQuery] Guid? departmentId = null)
    {
        if (skip < 0 || take < 1 || take > 1000)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid pagination" }));

        var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
        var items = await _service.GetAllAsync(skip, take, semesterId, deptId);
        return Ok(ApiResponse<IEnumerable<LecturerDto>>.Ok(items));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var item = await _service.GetByIdAsync(id);
        if (item == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Lecturer not found" }));

        return Ok(ApiResponse<LecturerDto>.Ok(item));
    }

    [HttpGet("{id:guid}/overview")]
    [Authorize(Policy = AdminPolicies.DepartmentAdmin)]
    public async Task<IActionResult> GetOverview(Guid id)
    {
        var lecturer = await _service.GetByIdAsync(id);
        if (lecturer == null || !_deptScope.HasAccess(User, lecturer.DepartmentId))
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Lecturer not found" }));

        var overview = await _service.GetOverviewAsync(id);
        if (overview == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Lecturer not found" }));

        return Ok(ApiResponse<LecturerOverviewDto>.Ok(overview));
    }

    [HttpPost]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Create([FromBody] CreateLecturerRequest request)
    {
        try
        {
            var created = await _service.CreateAsync(request, _deptScope.GetCurrentDepartmentId(User));
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<LecturerDto>.Ok(created));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateLecturerRequest request)
    {
        try
        {
            var existing = await _service.GetByIdAsync(id);
            if (existing == null || !_deptScope.HasAccess(User, existing.DepartmentId))
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Lecturer not found" }));

            var updated = await _service.UpdateAsync(id, request);
            if (updated == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Lecturer not found" }));

            return Ok(ApiResponse<LecturerDto>.Ok(updated));
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
        try
        {
            var existing = await _service.GetByIdAsync(id);
            if (existing == null || !_deptScope.HasAccess(User, existing.DepartmentId))
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Lecturer not found" }));

            var ok = await _service.DeleteAsync(id);
            if (!ok)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Lecturer not found" }));

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
        var bytes = _service.GetImportTemplate();
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Mau-danh-sach-GV.xlsx");
    }

    [HttpPost("import")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> Import(IFormFile file, [FromQuery] Guid? semesterId = null, [FromQuery] bool grantAccount = false)
    {
        try
        {
            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Excel file is required" }));

            if (!string.Equals(Path.GetExtension(file.FileName), ".xlsx", StringComparison.OrdinalIgnoreCase))
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Only .xlsx files are supported" }));

            await using var stream = file.OpenReadStream();
            var deptId = _deptScope.GetCurrentDepartmentId(User);
            var result = await _service.ImportFromExcelAsync(stream, semesterId, deptId, grantAccount);
            return Ok(ApiResponse<LecturerImportResultDto>.Ok(result));
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
    public async Task<IActionResult> Export()
    {
        var bytes = await _service.ExportLecturersExcelAsync(_deptScope.GetCurrentDepartmentId(User));
        var fileName = $"Danh-sach-GV-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }
}
