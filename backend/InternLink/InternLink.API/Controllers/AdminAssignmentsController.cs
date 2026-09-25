using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/Admin/assignments")]
[Route(AdminApiRoutes.DepartmentAdminPrefix + "/assignments")]
[Authorize(Policy = AdminPolicies.DepartmentAdmin)]
public class AdminAssignmentsController : ControllerBase
{
    private readonly IAssignmentService _assignmentService;
    private readonly IDepartmentScopeService _deptScope;

    public AdminAssignmentsController(IAssignmentService assignmentService, IDepartmentScopeService deptScope)
    {
        _assignmentService = assignmentService;
        _deptScope = deptScope;
    }

    [HttpPost]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> BulkAssign([FromBody] BulkAssignRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

            var deptId = _deptScope.GetCurrentDepartmentId(User);
            var result = await _assignmentService.BulkAssignAsync(request, deptId);
            return Ok(ApiResponse<BulkAssignResultDto>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            // Lỗi validate nghiệp vụ (GV không thuộc khoa, chưa có kỳ active…) → 400, không phải 404.
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? semesterId = null, [FromQuery] Guid? departmentId = null)
    {
        var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
        var items = await _assignmentService.GetAllAssignmentsAsync(semesterId, deptId);
        return Ok(ApiResponse<IReadOnlyList<LecturerAssignmentItemDto>>.Ok(items));
    }

    [HttpGet("by-lecturer/{lecturerId:guid}")]
    public async Task<IActionResult> GetByLecturer(Guid lecturerId, [FromQuery] Guid? semesterId = null)
    {
        try
        {
            // DepartmentAdmin may only view assignments of lecturers in their own department.
            var deptId = _deptScope.GetCurrentDepartmentId(User);
            var items = await _assignmentService.GetByLecturerAsync(lecturerId, semesterId, deptId);
            return Ok(ApiResponse<IReadOnlyList<LecturerAssignmentItemDto>>.Ok(items));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpDelete]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Unassign([FromBody] UnassignRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

        var deptId = _deptScope.GetCurrentDepartmentId(User);
        var ok = await _assignmentService.UnassignAsync(request, deptId);
        if (!ok)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Assignment not found" }));

        return Ok(ApiResponse<object>.Ok(null));
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int limit = 50, [FromQuery] Guid? semesterId = null, [FromQuery] Guid? departmentId = null)
    {
        var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
        var items = await _assignmentService.GetHistoryAsync(Math.Clamp(limit, 1, 200), semesterId, deptId);
        return Ok(ApiResponse<IReadOnlyList<AssignmentHistoryItemDto>>.Ok(items));
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportExcel([FromQuery] Guid? semesterId = null, [FromQuery] Guid? departmentId = null)
    {
        var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
        var bytes = await _assignmentService.ExportExcelAsync(semesterId, deptId);
        var fileName = $"Danh-sach-phan-cong-GVHD-{DateTime.UtcNow:yyyyMMdd}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    [HttpPost("auto")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> AutoAssign([FromBody] AutoAssignRequest request)
    {
        try
        {
            var deptId = _deptScope.GetCurrentDepartmentId(User);
            var result = await _assignmentService.AutoAssignAsync(request, deptId);
            return Ok(ApiResponse<AutoAssignResultDto>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    // ==================== COMPANY ALLOCATION ENDPOINTS ====================

    [HttpGet("company-allocation/template")]
    public IActionResult DownloadCompanyAllocationTemplate()
    {
        var bytes = _assignmentService.GetCompanyAllocationImportTemplate();
        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Mau-danh-sach-SV-thuc-tap-taiDN.xlsx");
    }

    [HttpPost("company-allocation/import")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> ImportCompanyAllocations(IFormFile file, [FromQuery] Guid? semesterId = null)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Vui lòng chọn file Excel để import" }));

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx" && ext != ".xls")
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Chỉ chấp nhận định dạng file .xlsx hoặc .xls" }));

        try
        {
            using var stream = file.OpenReadStream();
            var deptId = _deptScope.GetCurrentDepartmentId(User);
            var result = await _assignmentService.ImportCompanyAllocationsFromExcelAsync(stream, semesterId, deptId);
            return Ok(ApiResponse<CompanyAllocationImportResultDto>.Ok(result));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Lỗi khi xử lý file import", Detail = ex.Message }));
        }
    }

    [HttpGet("company-allocation/export")]
    public async Task<IActionResult> ExportCompanyAllocations([FromQuery] Guid? semesterId = null, [FromQuery] Guid? departmentId = null)
    {
        var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
        var bytes = await _assignmentService.ExportCompanyAllocationsExcelAsync(semesterId, deptId);
        var fileName = $"Danh-sach-SV-thuc-tap-taiDN-{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    [HttpGet("company-allocation")]
    public async Task<IActionResult> GetCompanyAllocations([FromQuery] Guid? semesterId = null, [FromQuery] Guid? departmentId = null)
    {
        var deptId = _deptScope.ResolveEffectiveDepartmentId(User, departmentId);
        var items = await _assignmentService.GetCompanyAllocationsAsync(semesterId, deptId);
        return Ok(ApiResponse<IReadOnlyList<CompanyAllocationItemDto>>.Ok(items));
    }

    // ==================== LECTURER ASSIGNMENT IMPORT ENDPOINTS ====================

    [HttpGet("template")]
    public IActionResult DownloadLecturerAssignmentTemplate()
    {
        var bytes = _assignmentService.GetLecturerAssignmentImportTemplate();
        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Mau-danh-sach-phan-cong-GVHD.xlsx");
    }

    [HttpPost("import")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> ImportLecturerAssignments(IFormFile file, [FromQuery] Guid? semesterId = null)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Vui lòng chọn file Excel để import" }));

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx" && ext != ".xls")
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Chỉ chấp nhận định dạng file .xlsx hoặc .xls" }));

        try
        {
            using var stream = file.OpenReadStream();
            var deptId = _deptScope.GetCurrentDepartmentId(User);
            var result = await _assignmentService.ImportLecturerAssignmentsFromExcelAsync(stream, semesterId, deptId);
            return Ok(ApiResponse<LecturerAssignmentImportResultDto>.Ok(result));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Lỗi khi xử lý file import", Detail = ex.Message }));
        }
    }

    [HttpPost("suggest-companies")]
    public async Task<IActionResult> SuggestCompanies([FromBody] CompanySuggestionRequest request, [FromServices] ICompanyService companyService)
    {
        if (request.SemesterId == Guid.Empty)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "SemesterId is required" }));

        var suggestions = await companyService.SuggestCompaniesAsync(request);
        return Ok(ApiResponse<IEnumerable<CompanySuggestionDto>>.Ok(suggestions));
    }
}
