using InternLink.API.Authorization;
using InternLink.Application.Common;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Infrastructure.Persistence;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/v1/system/grading-rule-sets")]
[Authorize(Policy = AdminPolicies.DepartmentAdmin)]
[RequirePermission(SystemPermissionCodes.ConfigurationUpdate)]
public sealed class SysGradingRuleSetsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ISemesterService _semesterService;
    private readonly IDepartmentScopeService _departmentScope;

    public SysGradingRuleSetsController(
        AppDbContext context,
        ISemesterService semesterService,
        IDepartmentScopeService departmentScope)
    {
        _context = context;
        _semesterService = semesterService;
        _departmentScope = departmentScope;
    }

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] Guid semesterId,
        [FromQuery] Guid? departmentId,
        CancellationToken cancellationToken)
    {
        if (semesterId == Guid.Empty)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Vui lòng chọn học kỳ." }));
        if (!TryResolveDepartmentScope(ref departmentId))
            return Forbid();

        var rule = await _context.SysGradingRuleSets
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.SemesterId == semesterId && item.DepartmentId == departmentId,
                cancellationToken);
        return Ok(ApiResponse<SysGradingRuleSetDto>.Ok(rule == null
            ? SysGradingRuleSetDto.Default(semesterId, departmentId)
            : ToDto(rule)));
    }

    [HttpPut]
    public async Task<IActionResult> Save(
        [FromQuery] Guid semesterId,
        [FromQuery] Guid? departmentId,
        [FromBody] SaveSysGradingRuleSetDto request,
        CancellationToken cancellationToken)
    {
        if (semesterId == Guid.Empty)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Vui lòng chọn học kỳ." }));
        if (!TryResolveDepartmentScope(ref departmentId))
            return Forbid();
        if (request.ProcessScoreWeight < 0 || request.ExamScoreWeight < 0 || request.EmployerScoreWeight < 0
            || request.ProcessScoreWeight + request.ExamScoreWeight + request.EmployerScoreWeight != 1m)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Tổng trọng số điểm phải bằng 100%." }));
        if (request.RequiredWeeklyReportsCount is < 0 or > 52)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Số tuần báo cáo phải nằm trong khoảng 0 đến 52." }));
        if (request.WeeklyDeadlineDay is < 1 or > 7)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Ngày deadline phải nằm trong khoảng thứ Hai đến Chủ nhật." }));
        if (request.LatePenaltyPointsPerDay is < 0 or > 10)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Mức trừ điểm mỗi ngày phải nằm trong khoảng 0 đến 10." }));
        if (request.MinimumPassingScore is < 0 or > 10)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Điểm đạt tối thiểu phải nằm trong khoảng 0 đến 10." }));

        var semester = await _context.Semesters
            .FirstOrDefaultAsync(item => item.Id == semesterId && !item.IsDeleted, cancellationToken);
        if (semester == null)
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy học kỳ." }));
        SemesterWritePolicy.EnsureWritable(semester);
        var totalWeeks = semester.TotalWeeks > 0 ? semester.TotalWeeks : 6;
        if (request.RequiredWeeklyReportsCount > totalWeeks)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = $"Số tuần bắt buộc không được vượt quá {totalWeeks} tuần của học kỳ." }));
        if (semester.DepartmentId.HasValue && departmentId.HasValue
            && semester.DepartmentId != departmentId)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Học kỳ không thuộc khoa đã chọn." }));
        if (departmentId.HasValue
            && !await _context.Departments.AnyAsync(
                item => item.Id == departmentId.Value && !item.IsDeleted,
                cancellationToken))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy khoa đã chọn." }));

        var rule = await _context.SysGradingRuleSets.FirstOrDefaultAsync(
            item => item.SemesterId == semesterId && item.DepartmentId == departmentId,
            cancellationToken);
        if (rule == null)
        {
            rule = new SysGradingRuleSet
            {
                SemesterId = semesterId,
                DepartmentId = departmentId,
                RuleSetName = request.RuleSetName?.Trim() is { Length: > 0 } name
                    ? name
                    : "Quy chế thực tập"
            };
            _context.SysGradingRuleSets.Add(rule);
        }

        rule.RuleSetName = string.IsNullOrWhiteSpace(request.RuleSetName)
            ? "Quy chế thực tập"
            : request.RuleSetName.Trim();
        rule.ProcessScoreWeight = request.ProcessScoreWeight;
        rule.ExamScoreWeight = request.ExamScoreWeight;
        rule.EmployerScoreWeight = request.EmployerScoreWeight;
        rule.RequiredWeeklyReportsCount = request.RequiredWeeklyReportsCount;
        rule.StepPenaltyPerLateReport = request.StepPenaltyPerLateReport;
        rule.StepPenaltyPerMissingReport = request.StepPenaltyPerMissingReport;
        rule.RequireFinalReportForExamEligibility = request.RequireFinalReportForExamEligibility;
        rule.WeeklyDeadlineDay = request.WeeklyDeadlineDay;
        rule.LatePenaltyPointsPerDay = request.LatePenaltyPointsPerDay;
        rule.MinimumPassingScore = request.MinimumPassingScore;

        await ApplyWeeklyDeadlineDayAsync(semester, departmentId, request.WeeklyDeadlineDay, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse<SysGradingRuleSetDto>.Ok(ToDto(rule)));
    }

    private async Task ApplyWeeklyDeadlineDayAsync(
        Semester semester,
        Guid? departmentId,
        int deadlineDay,
        CancellationToken cancellationToken)
    {
        var totalWeeks = semester.TotalWeeks > 0 ? semester.TotalWeeks : 6;
        var defaults = await _context.SemesterReportSchedules
            .Where(schedule => schedule.SemesterId == semester.Id
                && schedule.LecturerId == null
                && !schedule.IsDeleted
                && schedule.WeekNumber >= 1
                && schedule.WeekNumber <= totalWeeks)
            .OrderBy(schedule => schedule.WeekNumber)
            .ToListAsync(cancellationToken);
        if (defaults.Count == 0)
        {
            await _semesterService.GenerateDefaultSchedulesAsync(semester.Id);
            defaults = await _context.SemesterReportSchedules
                .Where(schedule => schedule.SemesterId == semester.Id
                    && schedule.LecturerId == null
                    && !schedule.IsDeleted
                    && schedule.WeekNumber >= 1
                    && schedule.WeekNumber <= totalWeeks)
                .OrderBy(schedule => schedule.WeekNumber)
                .ToListAsync(cancellationToken);
        }

        if (!departmentId.HasValue)
        {
            foreach (var schedule in defaults)
                schedule.DueDate = MoveToWeekday(schedule.DueDate, deadlineDay);
            return;
        }

        var lecturerIds = await _context.Lecturers
            .Where(lecturer => lecturer.DepartmentId == departmentId && !lecturer.IsDeleted)
            .Select(lecturer => lecturer.Id)
            .ToListAsync(cancellationToken);
        if (lecturerIds.Count == 0)
            return;

        var lecturerSchedules = await _context.SemesterReportSchedules
            .Where(schedule => schedule.SemesterId == semester.Id
                && schedule.LecturerId.HasValue
                && lecturerIds.Contains(schedule.LecturerId.Value)
                && !schedule.IsDeleted
                && schedule.WeekNumber >= 1
                && schedule.WeekNumber <= totalWeeks)
            .ToListAsync(cancellationToken);

        foreach (var lecturerId in lecturerIds)
        {
            foreach (var defaultSchedule in defaults)
            {
                var overrideSchedule = lecturerSchedules.FirstOrDefault(schedule =>
                    schedule.LecturerId == lecturerId
                    && schedule.WeekNumber == defaultSchedule.WeekNumber);
                if (overrideSchedule == null)
                {
                    overrideSchedule = new SemesterReportSchedule
                    {
                        SemesterId = semester.Id,
                        LecturerId = lecturerId,
                        WeekNumber = defaultSchedule.WeekNumber,
                        Title = defaultSchedule.Title,
                        StartDate = defaultSchedule.StartDate,
                        DueDate = defaultSchedule.DueDate,
                        IsSubmissionOpen = defaultSchedule.IsSubmissionOpen,
                        AllowLateSubmission = defaultSchedule.AllowLateSubmission,
                        Description = defaultSchedule.Description
                    };
                    _context.SemesterReportSchedules.Add(overrideSchedule);
                    lecturerSchedules.Add(overrideSchedule);
                }

                overrideSchedule.DueDate = MoveToWeekday(defaultSchedule.DueDate, deadlineDay);
            }
        }
    }

    private static DateTime MoveToWeekday(DateTime dueDate, int deadlineDay)
    {
        var currentMondayIndex = ((int)dueDate.DayOfWeek + 6) % 7;
        var requestedMondayIndex = (deadlineDay - 1) % 7;
        return dueDate.AddDays(requestedMondayIndex - currentMondayIndex);
    }

    private bool TryResolveDepartmentScope(ref Guid? departmentId)
    {
        var currentDepartmentId = _departmentScope.GetCurrentDepartmentId(User);
        if (!currentDepartmentId.HasValue)
            return true;
        if (departmentId.HasValue && departmentId != currentDepartmentId)
            return false;
        departmentId = currentDepartmentId;
        return true;
    }

    private static SysGradingRuleSetDto ToDto(SysGradingRuleSet rule) => new(
        rule.AutoId,
        rule.SemesterId,
        rule.DepartmentId,
        rule.RuleSetName,
        rule.ProcessScoreWeight,
        rule.ExamScoreWeight,
        rule.EmployerScoreWeight,
        rule.RequiredWeeklyReportsCount,
        rule.StepPenaltyPerLateReport,
        rule.StepPenaltyPerMissingReport,
        rule.RequireFinalReportForExamEligibility,
        rule.WeeklyDeadlineDay,
        rule.LatePenaltyPointsPerDay,
        rule.MinimumPassingScore);
}

public sealed record SysGradingRuleSetDto(
    long? Id,
    Guid SemesterId,
    Guid? DepartmentId,
    string RuleSetName,
    decimal ProcessScoreWeight,
    decimal ExamScoreWeight,
    decimal EmployerScoreWeight,
    int RequiredWeeklyReportsCount,
    decimal StepPenaltyPerLateReport,
    decimal StepPenaltyPerMissingReport,
    bool RequireFinalReportForExamEligibility,
    int WeeklyDeadlineDay,
    decimal LatePenaltyPointsPerDay,
    decimal MinimumPassingScore)
{
    public static SysGradingRuleSetDto Default(Guid semesterId, Guid? departmentId) => new(
        null, semesterId, departmentId, "Quy chế thực tập chuẩn 40-60",
        0.40m, 0.60m, 0m, 6, 0.5m, 2m, true, 5, 0m, 5m);
}

public sealed record SaveSysGradingRuleSetDto(
    string? RuleSetName,
    decimal ProcessScoreWeight,
    decimal ExamScoreWeight,
    decimal EmployerScoreWeight,
    int RequiredWeeklyReportsCount,
    decimal StepPenaltyPerLateReport,
    decimal StepPenaltyPerMissingReport,
    bool RequireFinalReportForExamEligibility,
    int WeeklyDeadlineDay,
    decimal LatePenaltyPointsPerDay,
    decimal MinimumPassingScore);
