using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>
/// Admin company master-data management (CRUD + Excel import).
/// </summary>
[ApiController]
[Route("api/Admin/companies")]
[Authorize(Policy = "RequireAdmin")]
public class AdminCompaniesController : ControllerBase
{
    private readonly ICompanyService _companyService;
    private readonly IDepartmentScopeService _deptScope;

    public AdminCompaniesController(ICompanyService companyService, IDepartmentScopeService deptScope)
    {
        _companyService = companyService;
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
        var companies = await _companyService.GetAllCompaniesAsync(skip, take, semesterId, deptId);
        return Ok(ApiResponse<IEnumerable<CompanyDto>>.Ok(companies));
    }

    [HttpPost("search")]
    public async Task<IActionResult> Search([FromBody] CompanyFilterRequest request)
    {
        if (request.Skip < 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Skip must be greater than or equal to 0" }));
        if (request.Take < 1 || request.Take > 1000)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Take must be between 1 and 1000" }));

        var result = await _companyService.GetCompaniesWithFilterAsync(request);
        return Ok(ApiResponse<PaginatedResponse<CompanyDto>>.Ok(result));
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActive([FromQuery] int skip = 0, [FromQuery] int take = 100, [FromQuery] Guid? semesterId = null)
    {
        if (skip < 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Skip must be greater than or equal to 0" }));
        if (take < 1 || take > 1000)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Take must be between 1 and 1000" }));

        var companies = await _companyService.GetActiveCompaniesAsync(skip, take, semesterId);
        return Ok(ApiResponse<IEnumerable<CompanyDto>>.Ok(companies));
    }

    /// <summary>
    /// Link / unlink a company for a semester ("ngưng liên kết" = isLinked false).
    /// Existing internships are kept; the company is just hidden from new assignments in that term.
    /// </summary>
    [HttpPut("{id:guid}/semester/{semesterId:guid}")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> SetSemesterLink(Guid id, Guid semesterId, [FromBody] SetSemesterLinkRequest request)
    {
        try
        {
            await _companyService.SetCompanySemesterStatusAsync(id, semesterId, request.IsLinked);
            return Ok(ApiResponse<object>.Ok(new { isLinked = request.IsLinked }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var company = await _companyService.GetCompanyByIdAsync(id);
        if (company == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Company not found" }));

        return Ok(ApiResponse<CompanyDto>.Ok(company));
    }

    [HttpGet("{id:guid}/detail")]
    public async Task<IActionResult> GetDetail(Guid id)
    {
        var detail = await _companyService.GetAdminCompanyDetailAsync(id);
        if (detail == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Company not found" }));

        return Ok(ApiResponse<AdminCompanyDetailDto>.Ok(detail));
    }

    [HttpGet("by-industry/{industry}")]
    public async Task<IActionResult> GetByIndustry(string industry, [FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        if (string.IsNullOrWhiteSpace(industry))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Industry is required" }));
        if (skip < 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Skip must be greater than or equal to 0" }));
        if (take < 1 || take > 1000)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Take must be between 1 and 1000" }));

        var companies = await _companyService.GetCompaniesByIndustryAsync(industry, skip, take);
        return Ok(ApiResponse<IEnumerable<CompanyDto>>.Ok(companies));
    }

    [HttpGet("check/{name}")]
    public async Task<IActionResult> CheckExists(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Company name is required" }));

        var exists = await _companyService.CompanyNameExistsAsync(name);
        return Ok(ApiResponse<bool>.Ok(exists));
    }

    [HttpPost]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Create([FromBody] CreateCompanyRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

            var company = await _companyService.CreateCompanyAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = company.Id }, ApiResponse<CompanyDto>.Ok(company));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCompanyRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Invalid input" }));

            var company = await _companyService.UpdateCompanyAsync(id, request);
            if (company == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Company not found" }));

            return Ok(ApiResponse<CompanyDto>.Ok(company));
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
            var ok = await _companyService.DeleteCompanyAsync(id);
            if (!ok)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Company not found" }));

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
        var bytes = _companyService.GetCompanyImportTemplate();
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Mau-danh-sach-doanh-nghiep.xlsx");
    }

    [HttpPost("import")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> Import(IFormFile file)
    {
        try
        {
            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Excel file is required" }));

            if (!string.Equals(Path.GetExtension(file.FileName), ".xlsx", StringComparison.OrdinalIgnoreCase))
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Only .xlsx files are supported" }));

            await using var stream = file.OpenReadStream();
            var result = await _companyService.ImportCompaniesFromExcelAsync(stream);
            return Ok(ApiResponse<CompanyImportResultDto>.Ok(result));
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
        var bytes = await _companyService.ExportCompaniesExcelAsync();
        var fileName = $"Danh-sach-doanh-nghiep-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    [HttpGet("{id:guid}/positions")]
    public async Task<IActionResult> GetPositions(Guid id, [FromQuery] Guid? semesterId = null)
    {
        var positions = await _companyService.GetPositionsAsync(id, semesterId);
        return Ok(ApiResponse<IEnumerable<CompanyPositionDto>>.Ok(positions));
    }

    [HttpGet("positions/{positionId:guid}")]
    public async Task<IActionResult> GetPositionById(Guid positionId)
    {
        var position = await _companyService.GetPositionByIdAsync(positionId);
        if (position == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Vị trí tuyển dụng không tồn tại" }));

        return Ok(ApiResponse<CompanyPositionDto>.Ok(position));
    }

    [HttpPost("{id:guid}/positions")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> CreatePosition(Guid id, [FromBody] CreateCompanyPositionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Tên vị trí tuyển dụng không được để trống" }));

        try
        {
            var position = await _companyService.CreatePositionAsync(id, request);
            return CreatedAtAction(nameof(GetPositionById), new { positionId = position.Id }, ApiResponse<CompanyPositionDto>.Ok(position));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPut("positions/{positionId:guid}")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> UpdatePosition(Guid positionId, [FromBody] UpdateCompanyPositionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Tên vị trí tuyển dụng không được để trống" }));

        var updated = await _companyService.UpdatePositionAsync(positionId, request);
        if (updated == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Vị trí tuyển dụng không tồn tại" }));

        return Ok(ApiResponse<CompanyPositionDto>.Ok(updated));
    }

    [HttpDelete("positions/{positionId:guid}")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> DeletePosition(Guid positionId)
    {
        var deleted = await _companyService.DeletePositionAsync(positionId);
        if (!deleted)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Vị trí tuyển dụng không tồn tại" }));

        return Ok(ApiResponse<object>.Ok(new { message = "Đã xóa vị trí tuyển dụng thành công" }));
    }
}
