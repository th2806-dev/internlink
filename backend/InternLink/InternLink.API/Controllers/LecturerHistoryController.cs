using InternLink.API.Extensions;
using InternLink.Application.Interfaces;
using InternLink.Application.DTOs;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/lecturer/history")]
[Authorize(Policy = "RequireLecturer")]
public sealed class LecturerHistoryController : ControllerBase
{
    private readonly ILecturerParticipationHistoryService _historyService;
    private readonly ILecturerAccessService _lecturerAccessService;

    public LecturerHistoryController(
        ILecturerParticipationHistoryService historyService,
        ILecturerAccessService lecturerAccessService)
    {
        _historyService = historyService;
        _lecturerAccessService = lecturerAccessService;
    }

    [HttpGet("{semesterId:guid}")]
    public async Task<IActionResult> GetSemesterHistory(Guid semesterId)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
            return Unauthorized();

        var lecturerId = await _lecturerAccessService.ResolveLecturerIdAsync(userId.Value);
        if (!lecturerId.HasValue)
            return Forbid();

        var history = await _historyService.GetSemesterHistoryAsync(lecturerId.Value, semesterId);
        if (history == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy học kỳ." }));

        return Ok(ApiResponse<LecturerParticipationHistoryDto>.Ok(history));
    }
}