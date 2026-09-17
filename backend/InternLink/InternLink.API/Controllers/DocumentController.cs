using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DocumentController : ControllerBase
{
    private readonly IDocumentService _documentService;
    private readonly ILogger<DocumentController> _logger;

    public DocumentController(IDocumentService documentService, ILogger<DocumentController> logger)
    {
        _documentService = documentService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllDocuments([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));
        var isLecturerOrAdmin = User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin");
        var documents = await _documentService.GetAllDocumentsAsync(skip, take, userId.Value, isLecturerOrAdmin);
        return Ok(ApiResponse<IEnumerable<DocumentListItemDto>>.Ok(documents));
    }

    [HttpPost("filter")]
    public async Task<IActionResult> GetDocumentsWithFilter([FromBody] DocumentFilterRequest filter)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));
        var isLecturerOrAdmin = User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin");
        var result = await _documentService.GetDocumentsWithFilterAsync(filter, userId.Value, isLecturerOrAdmin);
        return Ok(ApiResponse<PaginatedResponse<DocumentListItemDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDocumentById(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

        try
        {
            var isLecturerOrAdmin = User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin");
            var document = await _documentService.GetDocumentByIdAsync(id, userId.Value, isLecturerOrAdmin);
            if (document == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Document not found" }));

            return Ok(ApiResponse<DocumentDetailDto>.Ok(document));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("internship/{internshipId:guid}")]
    public async Task<IActionResult> GetDocumentsByInternship(Guid internshipId, [FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

        try
        {
            var isLecturerOrAdmin = User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin");
            var documents = await _documentService.GetDocumentsByInternshipAsync(internshipId, skip, take, userId.Value, isLecturerOrAdmin);
            return Ok(ApiResponse<IEnumerable<DocumentListItemDto>>.Ok(documents));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("upload")]
    [Authorize(Policy = "RequireLecturerOrAdmin")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadDocument([FromForm] UploadDocumentFormRequest form)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

        var files = form.Files?.ToList() ?? new List<IFormFile>();
        if (files.Count == 0 || files.All(f => f.Length == 0))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "File is required" }));

        var created = new List<DocumentDetailDto>();

        foreach (var file in files)
        {
            if (file.Length == 0)
                continue;

            var createRequest = new CreateDocumentRequest
            {
                InternshipId = form.InternshipId,
                Title = string.IsNullOrWhiteSpace(form.Title)
                    ? Path.GetFileNameWithoutExtension(file.FileName)
                    : form.Title,
                Description = form.Description,
                Category = form.Category,
                IsRequired = form.IsRequired
            };

            try
            {
                await using var stream = file.OpenReadStream();
                var document = await _documentService.UploadDocumentAsync(createRequest, stream, file.FileName, userId.Value);
                created.Add(document);
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

        if (created.Count == 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "No valid files were uploaded" }));

        return Ok(ApiResponse<object>.Ok(new { count = created.Count, documents = created }));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireLecturerOrAdmin")]
    public async Task<IActionResult> UpdateDocument(Guid id, [FromBody] UpdateDocumentRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

        try
        {
            var document = await _documentService.UpdateDocumentAsync(id, request, userId.Value);
            if (document == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Document not found" }));

            return Ok(ApiResponse<DocumentDetailDto>.Ok(document));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> DownloadDocument(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

        try
        {
            var isLecturerOrAdmin = User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin");
            var document = await _documentService.DownloadDocumentAsync(id, userId.Value, isLecturerOrAdmin);
            if (document == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Document not found" }));

            return File(document.FileContent, document.MimeType, document.FileName);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "RequireLecturerOrAdmin")]
    public async Task<IActionResult> DeleteDocument(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

        try
        {
            var result = await _documentService.DeleteDocumentAsync(id, userId.Value);
            if (!result)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Document not found" }));

            return Ok(ApiResponse<object>.Ok(null));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("internship/{internshipId:guid}/count")]
    public async Task<IActionResult> GetDocumentCount(Guid internshipId)
    {
        var userId = User.GetUserId();
        var isLecturerOrAdmin = User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin");
        try
        {
            var count = await _documentService.GetDocumentCountByInternshipAsync(internshipId, userId, isLecturerOrAdmin);
            return Ok(ApiResponse<int>.Ok(count));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates(
        [FromQuery] Guid? semesterId = null,
        [FromQuery] string? department = null,
        [FromQuery] string? category = null,
        [FromQuery] bool? isPublishedOnly = null)
    {
        var isLecturerOrAdmin = User.IsInRole("Lecturer") || User.IsInRole("SuperAdmin");
        var publishedFilter = !isLecturerOrAdmin ? true : isPublishedOnly;

        var templates = await _documentService.GetTemplatesAsync(semesterId, department, category, publishedFilter);
        return Ok(ApiResponse<IEnumerable<DocumentListItemDto>>.Ok(templates));
    }

    [HttpGet("templates/stats")]
    [Authorize(Policy = AdminPolicies.DepartmentAdmin)]
    public async Task<IActionResult> GetTemplateStats()
    {
        var stats = await _documentService.GetTemplateStatsAsync();
        return Ok(ApiResponse<TemplateStatsDto>.Ok(stats));
    }

    [HttpPost("templates")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> CreateTemplate([FromForm] CreateTemplateRequest form)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

        if (form.File == null || form.File.Length == 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Tệp đính kèm không được để trống" }));

        try
        {
            var created = await _documentService.CreateTemplateAsync(form, userId.Value);
            return Ok(ApiResponse<DocumentDetailDto>.Ok(created));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
        catch (FileNotFoundException ex)
        {
            _logger.LogError(ex, "Google Drive credentials are not configured for template upload");
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                ApiResponse<object>.Fail(new ApiError { Title = "Google Drive chưa được cấu hình", Detail = "Đặt google-credentials.json cạnh file chạy API và share folder Drive cho Service Account." }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Template upload failed");
            return StatusCode(StatusCodes.Status502BadGateway,
                ApiResponse<object>.Fail(new ApiError { Title = "Không thể tải file lên Google Drive", Detail = ex.Message }));
        }
    }

    [HttpPut("templates/{id:guid}")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UpdateTemplate(Guid id, [FromForm] UpdateTemplateRequest form)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

        try
        {
            var updated = await _documentService.UpdateTemplateAsync(id, form, userId.Value);
            if (updated == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Biểu mẫu không tồn tại" }));

            return Ok(ApiResponse<DocumentDetailDto>.Ok(updated));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    [HttpDelete("templates/{id:guid}")]
    [Authorize(Policy = "RequireDepartmentAdmin")]
    public async Task<IActionResult> DeleteTemplate(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

        try
        {
            var success = await _documentService.DeleteDocumentAsync(id, userId.Value);
            if (!success)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Biểu mẫu không tồn tại" }));

            return Ok(ApiResponse<object>.Ok(null));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("{id:guid}/versions")]
    public async Task<IActionResult> GetDocumentVersions(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

        var versions = await _documentService.GetDocumentVersionsAsync(id);
        return Ok(ApiResponse<IEnumerable<DocumentVersionDto>>.Ok(versions));
    }

    [HttpGet("versions/{versionId:guid}/download")]
    public async Task<IActionResult> DownloadDocumentVersion(Guid versionId)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Unauthorized" }));

        try
        {
            var download = await _documentService.DownloadDocumentVersionAsync(versionId);
            if (download == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Phiên bản tài liệu không tồn tại hoặc tệp đã bị xóa" }));

            return File(download.FileContent, download.MimeType ?? "application/octet-stream", download.FileName);
        }
        catch (FileNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }
}
