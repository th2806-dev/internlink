using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireLecturer")]
public class FeedbackController : ControllerBase
{
    private readonly ISubmissionService _submissionService;

    public FeedbackController(ISubmissionService submissionService)
    {
        _submissionService = submissionService;
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFeedbackRequest request)
    {
        try
        {
            var userId = User.GetUserId();
            if (userId == null)
                return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.Unauthorized }));

            var feedback = await _submissionService.UpdateFeedbackAsync(id, userId.Value, request);
            if (feedback == null)
                return NotFound(ApiResponse<object>.Fail(new ApiError { Title = InternLink.Shared.Responses.ErrorMessage.FeedbackNotFound }));

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
}
