using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;

namespace InternLink.API.Controllers;

/// <summary>
/// Centralized portal API for Lecturers.
/// All lecturer interactions (profile, students, companies, internships, weekly reports, evaluations, documents, exports)
/// are routed through this controller.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireLecturerOrAdmin")]
public class LecturerController : ControllerBase
{
    private readonly ILecturerService _lecturerService;
    private readonly ILecturerProfileService _lecturerProfileService;
    private readonly IEvaluationService _evaluationService;
    private readonly IWeeklyReportService _weeklyReportService;
    private readonly IDocumentService _documentService;
    private readonly ILecturerAccessService _lecturerAccessService;
    private readonly IPdfExportService _pdfExportService;
    private readonly ISubmissionService _submissionService;
    private readonly ILogger<LecturerController> _logger;

    public LecturerController(
        ILecturerService lecturerService,
        ILecturerProfileService lecturerProfileService,
        IEvaluationService evaluationService,
        IWeeklyReportService weeklyReportService,
        IDocumentService documentService,
        ISubmissionService submissionService,
        ILecturerAccessService lecturerAccessService,
        IPdfExportService pdfExportService,
        ILogger<LecturerController> logger)
    {
        _lecturerService = lecturerService;
        _lecturerProfileService = lecturerProfileService;
        _evaluationService = evaluationService;
        _weeklyReportService = weeklyReportService;
        _documentService = documentService;
        _submissionService = submissionService;
        _lecturerAccessService = lecturerAccessService;
        _pdfExportService = pdfExportService;
        _logger = logger;
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

    // ==========================================
    // 1. PROFILE & DASHBOARD
    // ==========================================

    /// <summary>
    /// Get current lecturer profile and assigned overview
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var me = await _lecturerService.GetMeAsync(userId.Value);
        if (me == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.LecturerProfileNotFound }));

        return Ok(ApiResponse<LecturerOverviewDto>.Ok(me));
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateLecturerRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));
        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Họ tên không được để trống" }));

        var current = await _lecturerProfileService.GetByUserIdAsync(userId.Value);
        if (current == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.LecturerProfileNotFound }));

        try
        {
            var updated = await _lecturerProfileService.UpdateAsync(current.Id, request);
            return Ok(ApiResponse<LecturerDto>.Ok(updated!));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>
    /// Get dashboard statistics for current lecturer
    /// </summary>
    [HttpGet("dashboard")]
    [HttpGet("stats")]
    public async Task<IActionResult> GetDashboardStats([FromQuery] Guid? semesterId = null)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var stats = await _lecturerService.GetDashboardStatsAsync(userId.Value, semesterId);
        return Ok(ApiResponse<LecturerDashboardStatsDto>.Ok(stats));
    }

    /// <summary>
    /// Get weekly submission trend for analytics charts
    /// </summary>
    [HttpGet("analytics/weekly-trend")]
    public async Task<IActionResult> GetWeeklyTrend([FromQuery] Guid? semesterId = null)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var trend = await _lecturerService.GetWeeklyTrendAsync(userId.Value, semesterId);
        return Ok(ApiResponse<List<WeeklyTrendDto>>.Ok(trend));
    }

    /// <summary>
    /// Get grade distribution for analytics charts
    /// </summary>
    [HttpGet("analytics/grade-distribution")]
    public async Task<IActionResult> GetGradeDistribution([FromQuery] Guid? semesterId = null)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var distribution = await _lecturerService.GetGradeDistributionAsync(userId.Value, semesterId);
        return Ok(ApiResponse<GradeDistributionDto>.Ok(distribution));
    }

    /// <summary>
    /// Get company statistics for analytics
    /// </summary>
    [HttpGet("analytics/company-stats")]
    public async Task<IActionResult> GetCompanyStats([FromQuery] Guid? semesterId = null)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var stats = await _lecturerService.GetCompanyStatsAsync(userId.Value, semesterId);
        return Ok(ApiResponse<List<CompanyStatsDto>>.Ok(stats));
    }

    /// <summary>
    /// Get lecturer activity statistics
    /// </summary>
    [HttpGet("analytics/activity-stats")]
    public async Task<IActionResult> GetActivityStats([FromQuery] Guid? semesterId = null)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var stats = await _lecturerService.GetActivityStatsAsync(userId.Value, semesterId);
        return Ok(ApiResponse<LecturerActivityStatsDto>.Ok(stats));
    }

    // ==========================================
    // 2b. COMPANY DETAIL (ENTERPRISES)
    // ==========================================

    /// <summary>
    /// Get detail of a company (internships + submissions + weekly reports) for lecturer portal
    /// </summary>
    [HttpGet("enterprises/{companyId:guid}")]
    public async Task<IActionResult> GetCompanyDetail(Guid companyId, [FromQuery] Guid? semesterId = null)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var detail = await _lecturerService.GetCompanyDetailAsync(companyId, userId.Value, semesterId);
        if (detail == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.CompanyNotForYourStudents }));

        return Ok(ApiResponse<CompanyDetailDto>.Ok(detail));
    }

    // ==========================================
    // 2. ASSIGNED STUDENTS & COMPANIES
    // ==========================================

    /// <summary>
    /// Get all students assigned to the current lecturer
    /// </summary>
    [HttpGet("students")]
    public async Task<IActionResult> GetStudents([FromQuery] string? search = null, [FromQuery] string? status = null, [FromQuery] Guid? semesterId = null)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var students = await _lecturerService.GetAssignedStudentsAsync(userId.Value, search, status, semesterId);
        return Ok(ApiResponse<IEnumerable<LecturerStudentListItemDto>>.Ok(students));
    }

    /// <summary>
    /// Get companies of assigned students
    /// </summary>
    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies([FromQuery] Guid? semesterId = null)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var companies = await _lecturerService.GetAssignedCompaniesAsync(userId.Value, semesterId);
        return Ok(ApiResponse<IEnumerable<LecturerCompanySummaryDto>>.Ok(companies));
    }

    // ==========================================
    // 3. INTERNSHIPS & SUBMISSIONS
    // ==========================================

    /// <summary>
    /// Get all active internships assigned to current lecturer
    /// </summary>
    [HttpGet("internships")]
    public async Task<IActionResult> GetInternships([FromQuery] Guid? semesterId = null)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var internships = await _lecturerService.GetInternshipsAsync(userId.Value, semesterId);
        return Ok(ApiResponse<IEnumerable<InternshipDto>>.Ok(internships));
    }

    /// <summary>
    /// Get specific internship detail
    /// </summary>
    [HttpGet("internships/{id:guid}")]
    public async Task<IActionResult> GetInternship(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var internship = await _lecturerService.GetInternshipAsync(id, userId.Value);
        if (internship == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.InternshipNotFound }));

        return Ok(ApiResponse<InternshipDetailDto>.Ok(internship));
    }

    /// <summary>
    /// Update lecturer notes for a student's internship
    /// </summary>
    [HttpPut("internships/{id:guid}/notes")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> UpdateStudentNotes(Guid id, [FromBody] UpdateStudentNotesRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var updated = await _lecturerService.UpdateStudentNotesAsync(userId.Value, id, request.Notes);
            if (!updated)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.InternshipNotFoundOrDenied }));

            return Ok(ApiResponse<object>.Ok(new { message = "Notes updated successfully" }));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
    }

    /// <summary>
    /// Notify all assigned students
    /// </summary>
    [HttpPost("students/notify")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> NotifyStudents([FromBody] NotifyStudentsRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var count = await _lecturerService.NotifyAssignedStudentsAsync(userId.Value, request.Title, request.Message);
            return Ok(ApiResponse<object>.Ok(new { notifiedCount = count }));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
    }

    /// <summary>
    /// Send a reminder notification to a specific assigned student
    /// </summary>
    [HttpPost("students/{id:guid}/remind")]
    [HttpPost("internships/{id:guid}/remind")]
    [HttpPost("students/{id:guid}/notify")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> RemindStudent(Guid id, [FromBody] RemindStudentRequest? request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var sent = await _lecturerService.RemindStudentAsync(userId.Value, id, request?.Title, request?.Message);
            if (!sent)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.InternshipNotFoundOrDenied }));

            return Ok(ApiResponse<object>.Ok(new { message = "Reminder sent successfully" }));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
    }

    /// <summary>
    /// Get all submissions for students assigned to current lecturer
    /// </summary>
    [HttpGet("submissions")]
    public async Task<IActionResult> GetAssignedSubmissions([FromQuery] Guid? semesterId = null)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var submissions = await _lecturerService.GetAssignedSubmissionsAsync(userId.Value, semesterId);
        return Ok(ApiResponse<IEnumerable<SubmissionDto>>.Ok(submissions));
    }

    /// <summary>
    /// Get submissions for an assigned internship
    /// </summary>
    [HttpGet("internships/{id:guid}/submissions")]
    public async Task<IActionResult> GetSubmissions(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var submissions = await _lecturerService.GetSubmissionsByInternshipAsync(id, userId.Value);
        return Ok(ApiResponse<IEnumerable<SubmissionDto>>.Ok(submissions));
    }

    [HttpPost("submissions/download-zip")]
    public async Task<IActionResult> DownloadSubmissionsZip([FromBody] DownloadSubmissionsZipRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var zip = await _submissionService.DownloadZipAsync(request.SubmissionIds, userId.Value);
            if (zip == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.NoSubmissionFiles }));
            return File(zip.FileContent, "application/zip", zip.FileName);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>
    /// Give feedback on a submission
    /// </summary>
    [HttpPost("submissions/{id:guid}/feedback")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> AddFeedback(Guid id, [FromBody] CreateFeedbackRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var feedback = await _lecturerService.AddFeedbackAsync(id, userId.Value, request);
            if (feedback == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.SubmissionNotFound }));

            return Ok(ApiResponse<FeedbackDto>.Ok(feedback));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    // ==========================================
    // 4. WEEKLY REPORTS
    // ==========================================

    /// <summary>
    /// Get weekly reports for assigned internship or all assigned internships of lecturer
    /// </summary>
    [HttpGet("weekly-reports")]
    public async Task<IActionResult> GetWeeklyReports(
        [FromQuery] Guid? internshipId = null,
        [FromQuery] Guid? semesterId = null,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? searchTerm = null)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        if (internshipId.HasValue)
        {
            try
            {
                var reports = await _weeklyReportService.GetByInternshipAsync(internshipId.Value, userId.Value, isLecturerOrAdmin: true);
                return Ok(ApiResponse<IEnumerable<WeeklyReportDto>>.Ok(reports));
            }
            catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
        }

        var allReports = await _lecturerService.GetAssignedWeeklyReportsAsync(userId.Value, new WeeklyReportFilterRequest
        {
            SemesterId = semesterId,
            Skip = Math.Max(0, skip),
            Take = Math.Clamp(take, 1, 100),
            Status = status,
            SearchTerm = searchTerm,
        });
        return Ok(ApiResponse<PaginatedResponse<WeeklyReportDto>>.Ok(allReports));
    }

    /// <summary>
    /// Get weekly report detail
    /// </summary>
    [HttpGet("weekly-reports/{id:guid}")]
    public async Task<IActionResult> GetWeeklyReportById(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var report = await _weeklyReportService.GetByIdAsync(id, userId.Value, isLecturerOrAdmin: true);
            if (report == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.WeeklyReportNotFound }));

            return Ok(ApiResponse<WeeklyReportDto>.Ok(report));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
    }

    /// <summary>
    /// Review weekly report
    /// </summary>
    [HttpPost("weekly-reports/{id:guid}/review")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> ReviewWeeklyReport(Guid id, [FromBody] ReviewWeeklyReportRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var report = await _weeklyReportService.ReviewAsync(id, userId.Value, request);
            if (report == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.WeeklyReportNotFound }));

            return Ok(ApiResponse<WeeklyReportDto>.Ok(report));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    // ==========================================
    // 5. EVALUATIONS
    // ==========================================

    /// <summary>
    /// Get evaluations of assigned students
    /// </summary>
    [HttpGet("evaluations")]
    public async Task<IActionResult> GetEvaluations([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        var (isLecturer, lecturerId) = await ResolveLecturerScopeAsync();
        if (isLecturer && lecturerId == Guid.Empty)
            return Ok(ApiResponse<IEnumerable<EvaluationListItemDto>>.Ok(Array.Empty<EvaluationListItemDto>()));

        var evaluations = await _evaluationService.GetAllEvaluationsAsync(skip, take, lecturerId);
        return Ok(ApiResponse<IEnumerable<EvaluationListItemDto>>.Ok(evaluations));
    }

    /// <summary>
    /// Get evaluation by internship ID
    /// </summary>
    [HttpGet("evaluations/internship/{internshipId:guid}")]
    public async Task<IActionResult> GetEvaluationByInternship(Guid internshipId)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var eval = await _evaluationService.GetEvaluationByInternshipAsync(internshipId, userId.Value, isLecturerOrAdmin: true);
            if (eval == null)
                return Ok(ApiResponse<EvaluationDetailDto?>.Ok(null));

            return Ok(ApiResponse<EvaluationDetailDto>.Ok(eval));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
    }

    /// <summary>
    /// Create evaluation for assigned student
    /// </summary>
    [HttpPost("evaluations")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> CreateEvaluation([FromBody] CreateEvaluationRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var evaluation = await _evaluationService.CreateEvaluationAsync(request, userId.Value);
            return Ok(ApiResponse<EvaluationDetailDto>.Ok(evaluation));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>
    /// Update evaluation for assigned student
    /// </summary>
    [HttpPut("evaluations/{id:guid}")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> UpdateEvaluation(Guid id, [FromBody] UpdateEvaluationRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var evaluation = await _evaluationService.UpdateEvaluationAsync(id, request, userId.Value);
            if (evaluation == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.EvaluationNotFound }));

            return Ok(ApiResponse<EvaluationDetailDto>.Ok(evaluation));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>
    /// Finalize evaluation
    /// </summary>
    [HttpPost("evaluations/{id:guid}/finalize")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> FinalizeEvaluation(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var evaluation = await _evaluationService.FinalizeEvaluationAsync(id, userId.Value);
            if (evaluation == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.EvaluationNotFound }));

            return Ok(ApiResponse<EvaluationDetailDto>.Ok(evaluation));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
    }

    [HttpPut("evaluations/{id:guid}/defense")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> UpdateDefense(Guid id, [FromBody] UpdateDefenseRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var evaluation = await _evaluationService.UpdateDefenseAsync(id, request, userId.Value);
            if (evaluation == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.EvaluationNotFound }));

            return Ok(ApiResponse<EvaluationDetailDto>.Ok(evaluation));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
    }

    // ==========================================
    // 6. DOCUMENTS
    // ==========================================

    /// <summary>
    /// Get documents for assigned internships
    /// </summary>
    [HttpGet("documents")]
    public async Task<IActionResult> GetDocuments([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var documents = await _documentService.GetAllDocumentsAsync(skip, take, userId.Value, isLecturerOrAdmin: true);
        return Ok(ApiResponse<IEnumerable<DocumentListItemDto>>.Ok(documents));
    }

    /// <summary>
    /// Upload document for assigned internship
    /// </summary>
    [HttpPost("documents/upload")]
    [Consumes("multipart/form-data")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> UploadDocument([FromForm] UploadDocumentFormRequest form)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var files = form.Files?.ToList() ?? new List<IFormFile>();
        if (files.Count == 0 || files.All(f => f.Length == 0))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.FileRequired }));

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
            catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
            }
        }

        if (created.Count == 0)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.NoValidFilesUploaded }));

        return Ok(ApiResponse<object>.Ok(new { count = created.Count, documents = created }));
    }

    /// <summary>
    /// Download document
    /// </summary>
    [HttpGet("documents/{id:guid}/download")]
    public async Task<IActionResult> DownloadDocument(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var document = await _documentService.DownloadDocumentAsync(id, userId.Value, isLecturerOrAdmin: true);
            if (document == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.DocumentNotFound }));

            return File(document.FileContent, document.MimeType, document.FileName);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(new ApiError { Title = ex.Message, Status = 403 }));
        }
    }

    // ==========================================
    // 7. EXPORT
    // ==========================================

    [HttpGet("semester-summary/{semesterId:guid}")]
    public async Task<IActionResult> GetSemesterSummary(Guid semesterId)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();
        var summary = await _lecturerService.GetSemesterSummaryAsync(userId.Value, semesterId);
        return Ok(ApiResponse<LecturerSemesterSummaryDto>.Ok(summary ?? new LecturerSemesterSummaryDto { SemesterId = semesterId }));
    }

    [HttpPut("semester-summary/{semesterId:guid}")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> SaveSemesterSummary(Guid semesterId, [FromBody] SaveLecturerSemesterSummaryRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();
        var summary = await _lecturerService.SaveSemesterSummaryAsync(userId.Value, semesterId, request);
        return summary == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy học kỳ hoặc giảng viên" }))
            : Ok(ApiResponse<LecturerSemesterSummaryDto>.Ok(summary));
    }

    /// <summary>
    /// Export end-of-term summary for all internships assigned to the current lecturer (Excel format).
    /// </summary>
    [HttpGet("export/end-of-term")]
    public async Task<IActionResult> ExportEndOfTerm()
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        var bytes = await _lecturerService.ExportEndOfTermExcelAsync(userId.Value);
        var fileName = $"Tong-ket-cuoi-ky-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    /// <summary>
    /// Export end-of-term summary for all internships assigned to the current lecturer (Server-side PDF format).
    /// </summary>
    [HttpGet("export/end-of-term/pdf")]
    public async Task<IActionResult> ExportEndOfTermPdf()
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var pdfBytes = await _pdfExportService.GenerateLecturerSummaryPdfAsync(userId.Value);
            var fileName = $"bang-tong-hop-cuoi-ky-{DateTime.UtcNow:yyyyMMdd-HHmmss}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    /// <summary>
    /// Export official internship evaluation sheet PDF for an individual student.
    /// </summary>
    [HttpGet("export/evaluation/{internshipId:guid}/pdf")]
    public async Task<IActionResult> ExportStudentEvaluationPdf(Guid internshipId)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        try
        {
            var pdfBytes = await _pdfExportService.GenerateStudentEvaluationPdfAsync(internshipId, userId.Value);
            var fileName = $"phieu-danh-gia-thuc-tap-{internshipId.ToString()[..8]}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = ex.Message }));
        }
    }

    // ==========================================
    // 8. AI COMMENT GENERATION
    // ==========================================

    /// <summary>
    /// Generate AI-assisted comment for a student based on their progress data.
    /// </summary>
    [HttpPost("ai/generate-comment")]
    [Authorize(Policy = "RequireLecturerOrDepartmentAdmin")]
    public async Task<IActionResult> GenerateAiComment([FromBody] AiCommentRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

        // AI comment generation using template-based approach
        var comment = GenerateCommentFromTemplate(request);
        return Ok(ApiResponse<object>.Ok(new { comment }));
    }

    private static string GenerateCommentFromTemplate(AiCommentRequest req)
    {
        var progress = req.ProgressPercent;
        var status = progress >= 100 ? "hoàn thành" : progress >= 70 ? "đang tiến triển tốt" : progress >= 40 ? "cần đẩy nhanh tiến độ" : "chậm tiến độ";

        var parts = new List<string>();
        parts.Add($"Sinh viên {req.StudentName} ({req.StudentCode}) đã {status} với {progress}% khối lượng thực tập tại {(req.CompanyName ?? "doanh nghiệp")}.");

        if (req.WeeksReported > 0)
        {
            parts.Add($"Đã nộp {req.WeeksReported} báo cáo tuần, thể hiện sự {(req.WeeksReported >= 5 ? "chuyên cần và chủ động" : "cần duy trì đều đặn hơn")}.");
        }

        if (progress >= 80)
        {
            parts.Add("Đề xuất tiếp tục duy trì nhịp độ và hoàn thiện báo cáo tổng kết cuối kỳ.");
        }
        else if (progress >= 50)
        {
            parts.Add("Đề xuất sinh viên tập trung hoàn thành các phần còn lại đúng hạn.");
        }
        else
        {
            parts.Add("Cần nhắc nhở sinh viên tăng cường báo cáo và hoàn thành nhiệm vụ thực tập.");
        }

        return string.Join(" ", parts);
    }
}

