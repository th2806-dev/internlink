using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WeeklyReportController : ControllerBase
{
    private readonly IWeeklyReportService _weeklyReportService;

    public WeeklyReportController(IWeeklyReportService weeklyReportService)
    {
        _weeklyReportService = weeklyReportService;
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var isLecturerOrAdmin = User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin");
            var report = await _weeklyReportService.GetByIdAsync(id, userId.Value, isLecturerOrAdmin);
            if (report == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Weekly report not found" }));

            return Ok(ApiResponse<WeeklyReportDto>.Ok(report));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("mine")]
    [Authorize(Policy = "RequireStudent")]
    public async Task<IActionResult> GetMine()
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

        var reports = await _weeklyReportService.GetMineAsync(userId.Value);
        return Ok(ApiResponse<IEnumerable<WeeklyReportDto>>.Ok(reports));
    }

    [HttpGet("internship/{internshipId:guid}")]
    [Authorize(Policy = "RequireLecturerOrAdmin")]
    public async Task<IActionResult> GetByInternship(Guid internshipId)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var isLecturerOrAdmin = User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin");
            var reports = await _weeklyReportService.GetByInternshipAsync(internshipId, userId.Value, isLecturerOrAdmin);
            return Ok(ApiResponse<IEnumerable<WeeklyReportDto>>.Ok(reports));
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

    [HttpPost]
    [Authorize(Policy = "RequireStudent")]
    public async Task<IActionResult> CreateDraft([FromBody] CreateWeeklyReportRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var report = await _weeklyReportService.CreateDraftAsync(userId.Value, request);
            return CreatedAtAction(nameof(GetById), new { id = report.Id }, ApiResponse<WeeklyReportDto>.Ok(report));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPost("upload")]
    [Authorize(Policy = "RequireStudent")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload([FromForm] UploadWeeklyReportFormRequest form)
    {
        try
        {
            if (form.File == null || form.File.Length == 0)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "File is required" }));

            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var request = new CreateWeeklyReportRequest
            {
                InternshipId = form.InternshipId,
                WeekNumber = form.WeekNumber,
                Title = form.Title,
                Content = form.File.FileName,
            };

            await using var stream = form.File.OpenReadStream();
            var report = await _weeklyReportService.CreateDraftWithFileAsync(
                userId.Value,
                request,
                stream,
                form.File.FileName,
                form.File.Length,
                form.File.ContentType);
            return CreatedAtAction(nameof(GetById), new { id = report.Id }, ApiResponse<WeeklyReportDto>.Ok(report));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireStudent")]
    public async Task<IActionResult> UpdateDraft(Guid id, [FromBody] UpdateWeeklyReportRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var report = await _weeklyReportService.UpdateDraftAsync(id, userId.Value, request);
            if (report == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Weekly report not found" }));

            return Ok(ApiResponse<WeeklyReportDto>.Ok(report));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPut("{id:guid}/upload")]
    [Authorize(Policy = "RequireStudent")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UpdateWithFile(Guid id, [FromForm] UploadWeeklyReportFormRequest form)
    {
        try
        {
            if (form.File == null || form.File.Length == 0)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "File is required" }));

            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            await using var stream = form.File.OpenReadStream();
            var report = await _weeklyReportService.UpdateDraftWithFileAsync(
                id,
                userId.Value,
                new UpdateWeeklyReportRequest { Title = form.Title },
                stream,
                form.File.FileName,
                form.File.Length,
                form.File.ContentType);
            if (report == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Weekly report not found" }));

            return Ok(ApiResponse<WeeklyReportDto>.Ok(report));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var isLecturerOrAdmin = User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin");
            var file = await _weeklyReportService.DownloadFileAsync(id, userId.Value, isLecturerOrAdmin);
            if (file == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "File not found" }));

            return File(file.FileContent, file.MimeType, file.FileName);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("{id:guid}/versions")]
    [Authorize]
    public async Task<IActionResult> GetVersions(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var versions = await _weeklyReportService.GetVersionsAsync(
                id,
                userId.Value,
                User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin"));
            return Ok(ApiResponse<IReadOnlyList<WeeklyReportVersionDto>>.Ok(versions));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("versions/{versionId:guid}/download")]
    [Authorize]
    public async Task<IActionResult> DownloadVersion(Guid versionId)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var file = await _weeklyReportService.DownloadVersionAsync(
                versionId,
                userId.Value,
                User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin"));
            if (file == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "File not found" }));

            return File(file.FileContent, file.MimeType, file.FileName);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("{id:guid}/submit")]
    [Authorize(Policy = "RequireStudent")]
    public async Task<IActionResult> Submit(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var report = await _weeklyReportService.SubmitAsync(id, userId.Value);
            if (report == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Weekly report not found" }));

            return Ok(ApiResponse<WeeklyReportDto>.Ok(report));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPost("{id:guid}/student-reply")]
    [Authorize(Policy = "RequireStudent")]
    public async Task<IActionResult> AddStudentReply(Guid id, [FromBody] StudentReplyRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var feedback = await _weeklyReportService.AddStudentReplyAsync(id, userId.Value, request.Comment);
            if (feedback == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Weekly report not found" }));

            return Ok(ApiResponse<FeedbackDto>.Ok(feedback));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpPost("{id:guid}/feedback/read")]
    [Authorize]
    public async Task<IActionResult> MarkFeedbacksRead(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var isLecturer = User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin");
            var updated = await _weeklyReportService.MarkFeedbacksReadAsync(id, userId.Value, isLecturer);
            return updated ? NoContent() : NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Weekly report not found" }));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("{id:guid}/review")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> Review(Guid id, [FromBody] ReviewWeeklyReportRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var report = await _weeklyReportService.ReviewAsync(id, userId.Value, request);
            if (report == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Weekly report not found" }));

            return Ok(ApiResponse<WeeklyReportDto>.Ok(report));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
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

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "RequireStudent")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var deleted = await _weeklyReportService.SoftDeleteAsync(id, userId.Value);
            if (!deleted)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Weekly report not found" }));

            return Ok(ApiResponse<object>.Ok(null));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }
}
