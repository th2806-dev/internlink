using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using System.Text.Json;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubmissionController : ControllerBase
{
    private readonly ISubmissionService _submissionService;

    public SubmissionController(ISubmissionService submissionService)
    {
        _submissionService = submissionService;
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
            var submission = await _submissionService.GetByIdAsync(id, userId.Value, isLecturerOrAdmin);
            if (submission == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Submission not found" }));

            return Ok(ApiResponse<SubmissionDto>.Ok(submission));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
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
            var submissions = await _submissionService.GetByInternshipAsync(internshipId, userId.Value, isLecturerOrAdmin);
            return Ok(ApiResponse<IEnumerable<SubmissionDto>>.Ok(submissions));
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

        var submissions = await _submissionService.GetMineAsync(userId.Value);
        return Ok(ApiResponse<IEnumerable<SubmissionDto>>.Ok(submissions));
    }

    [HttpPost]
    [Authorize(Policy = "RequireStudent")]
    public async Task<IActionResult> Create([FromBody] CreateSubmissionRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var submission = await _submissionService.CreateAsync(userId.Value, request);
            return CreatedAtAction(nameof(GetById), new { id = submission.Id }, ApiResponse<SubmissionDto>.Ok(submission));
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
    public async Task<IActionResult> Upload([FromForm] UploadSubmissionFormRequest form)
    {
        try
        {
            if (form.File == null || form.File.Length == 0)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "File is required" }));

            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var createRequest = new CreateSubmissionRequest
            {
                InternshipId = form.InternshipId,
                Type = form.Type,
                Title = form.Title,
                Description = form.Description,
            };

            await using var stream = form.File.OpenReadStream();
            var submission = await _submissionService.CreateWithFileAsync(
                userId.Value,
                createRequest,
                stream,
                form.File.FileName);

            return CreatedAtAction(nameof(GetById), new { id = submission.Id }, ApiResponse<SubmissionDto>.Ok(submission));
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

    [HttpPost("bundle")]
    [Authorize(Policy = "RequireStudent")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadBundle([FromForm] UploadSubmissionBundleFormRequest form)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var links = string.IsNullOrWhiteSpace(form.LinksJson)
                ? new List<SubmissionAssetInput>()
                : JsonSerializer.Deserialize<List<SubmissionAssetInput>>(form.LinksJson) ?? new List<SubmissionAssetInput>();

            var files = form.Files
                .Where(file => file.Length > 0)
                .Select(file => (file.OpenReadStream(), file.FileName, file.Length, file.ContentType));

            var submission = await _submissionService.CreateBundleAsync(
                userId.Value,
                new CreateSubmissionRequest
                {
                    InternshipId = form.InternshipId,
                    Type = form.Type,
                    Title = form.Title,
                    Description = form.Description,
                },
                files,
                links);

            return CreatedAtAction(nameof(GetById), new { id = submission.Id }, ApiResponse<SubmissionDto>.Ok(submission));
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

    [HttpPost("{id:guid}/resubmit")]
    [Authorize(Policy = "RequireStudent")]
    public async Task<IActionResult> Resubmit(Guid id, [FromBody] ResubmitRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var submission = await _submissionService.ResubmitAsync(id, userId.Value, request);
            if (submission == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Submission not found" }));

            return Ok(ApiResponse<SubmissionDto>.Ok(submission));
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

    [HttpPost("{id:guid}/resubmit-upload")]
    [Authorize(Policy = "RequireStudent")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ResubmitUpload(Guid id, [FromForm] ResubmitSubmissionFormRequest form)
    {
        try
        {
            if (form.File == null || form.File.Length == 0)
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "File is required" }));

            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var resubmitRequest = new ResubmitRequest
            {
                Title = form.Title,
                Description = form.Description,
            };

            await using var stream = form.File.OpenReadStream();
            var submission = await _submissionService.ResubmitWithFileAsync(
                id,
                userId.Value,
                resubmitRequest,
                stream,
                form.File.FileName);

            if (submission == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Submission not found" }));

            return Ok(ApiResponse<SubmissionDto>.Ok(submission));
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
            var file = await _submissionService.DownloadFileAsync(id, userId.Value, isLecturerOrAdmin);
            if (file == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "File not found" }));

            return File(file.FileContent, file.MimeType, file.FileName);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("{id:guid}/assets/{assetId:guid}/download")]
    public async Task<IActionResult> DownloadAsset(Guid id, Guid assetId)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var isLecturerOrAdmin = User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin");
            var file = await _submissionService.DownloadAssetAsync(id, assetId, userId.Value, isLecturerOrAdmin);
            if (file == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Asset not found" }));

            return File(file.FileContent, file.MimeType, file.FileName);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateSubmissionStatusRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var submission = await _submissionService.UpdateStatusAsync(id, request, userId.Value);
            if (submission == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Submission not found" }));

            return Ok(ApiResponse<SubmissionDto>.Ok(submission));
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

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var deleted = await _submissionService.SoftDeleteAsync(id, userId.Value);
            if (!deleted)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Submission not found" }));

            return Ok(ApiResponse<object>.Ok(null));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("{id:guid}/feedbacks")]
    public async Task<IActionResult> GetFeedbacks(Guid id)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var isLecturer = User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin");
            var feedbacks = await _submissionService.GetFeedbacksAsync(id, userId.Value, isLecturer);
            return Ok(ApiResponse<IEnumerable<FeedbackDto>>.Ok(feedbacks));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("{id:guid}/feedback")]
    [Authorize(Policy = "RequireLecturer")]
    public async Task<IActionResult> AddFeedback(Guid id, [FromBody] CreateFeedbackRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

            var feedback = await _submissionService.AddFeedbackAsync(id, userId.Value, request);
            if (feedback == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Submission not found" }));

            return Ok(ApiResponse<FeedbackDto>.Ok(feedback));
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

            var feedback = await _submissionService.AddStudentReplyAsync(id, userId.Value, request.Comment);
            if (feedback == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Submission not found" }));

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
            var updated = await _submissionService.MarkFeedbacksReadAsync(id, userId.Value, isLecturer);
            return updated ? NoContent() : NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Submission not found" }));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}
