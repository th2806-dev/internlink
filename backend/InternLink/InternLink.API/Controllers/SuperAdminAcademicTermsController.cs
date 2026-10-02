using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

[ApiController]
[Route(AdminApiRoutes.SuperAdminPrefix + "/academic-terms")]
[Authorize]
public sealed class SuperAdminAcademicTermsController : ControllerBase
{
    private readonly ISchoolAcademicTermService _service;

    /// <summary>Creates a controller for school-wide academic term configuration.</summary>
    public SuperAdminAcademicTermsController(ISchoolAcademicTermService service) => _service = service;

    /// <summary>Returns the configured school academic terms.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(ApiResponse<IEnumerable<SchoolAcademicTermDto>>.Ok(await _service.GetAllAsync()));

    /// <summary>Creates a school-wide academic term configuration.</summary>
    [HttpPost]
    [Authorize(Policy = AdminPolicies.SuperAdmin)]
    public async Task<IActionResult> Create([FromBody] SaveSchoolAcademicTermRequest request)
    {
        try
        {
            var result = await _service.CreateAsync(request);
            return Ok(ApiResponse<SchoolAcademicTermDto>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>Creates a whole academic year at once: Học kỳ I, Học kỳ II and Học kỳ Hè (atomic).</summary>
    [HttpPost("academic-year")]
    [Authorize(Policy = AdminPolicies.SuperAdmin)]
    public async Task<IActionResult> CreateAcademicYear([FromBody] CreateAcademicYearRequest request)
    {
        try
        {
            var result = await _service.CreateAcademicYearAsync(request);
            return Ok(ApiResponse<AcademicYearBatchResultDto>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>Updates a school-wide academic term configuration.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = AdminPolicies.SuperAdmin)]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveSchoolAcademicTermRequest request)
    {
        try
        {
            var result = await _service.UpdateAsync(id, request);
            return result == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy khung học kỳ." }))
                : Ok(ApiResponse<SchoolAcademicTermDto>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }
}