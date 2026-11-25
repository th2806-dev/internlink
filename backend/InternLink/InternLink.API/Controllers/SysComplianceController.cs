using InternLink.API.Authorization;
using InternLink.Application.DTOs;
using InternLink.Application.Exceptions;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>SuperAdmin controls for retention policies and student data anonymization.</summary>
[ApiController]
[Route("api/v1/system/compliance")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public sealed class SysComplianceController(ISystemComplianceService complianceService) : ControllerBase
{
    /// <summary>Lists configured data-retention policies.</summary>
    [HttpGet("policies")]
    [RequirePermission(SystemPermissionCodes.ComplianceView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<DataRetentionPolicyResponse>>>> GetPolicies(
        CancellationToken cancellationToken)
    {
        var result = await complianceService.GetPoliciesAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<DataRetentionPolicyResponse>>.Ok(result));
    }

    /// <summary>Updates a data-retention period and whether its policy is enabled.</summary>
    [HttpPut("policies/{code}")]
    [RequirePermission(SystemPermissionCodes.ComplianceUpdate)]
    public async Task<ActionResult<ApiResponse<DataRetentionPolicyResponse>>> UpdatePolicy(
        string code,
        [FromBody] UpdateDataRetentionPolicyRequest request,
        CancellationToken cancellationToken)
    {
        var result = await complianceService.UpdatePolicyAsync(code, request, cancellationToken);
        return result == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy chính sách lưu trữ." }))
            : Ok(ApiResponse<DataRetentionPolicyResponse>.Ok(result));
    }

    /// <summary>Counts completed internship profiles past the configured retention period.</summary>
    [HttpGet("anonymize/preview")]
    [RequirePermission(SystemPermissionCodes.ComplianceView)]
    public async Task<ActionResult<ApiResponse<AnonymizationPreviewResponse>>> GetAnonymizationPreview(
        CancellationToken cancellationToken)
    {
        var result = await complianceService.GetAnonymizationPreviewAsync(cancellationToken);
        return Ok(ApiResponse<AnonymizationPreviewResponse>.Ok(result));
    }

    /// <summary>Anonymizes eligible profiles after an explicit phrase and current preview count are confirmed.</summary>
    [HttpPost("anonymize/execute")]
    [RequirePermission(SystemPermissionCodes.ComplianceAnonymize)]
    public async Task<ActionResult<ApiResponse<ComplianceExecutionResponse>>> ExecuteAnonymization(
        [FromBody] ExecuteAnonymizationRequest request,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(request.ConfirmationPhrase, "ANONYMIZE", StringComparison.Ordinal))
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError
            {
                Title = "Cụm từ xác nhận không hợp lệ. Không có hồ sơ nào được thay đổi."
            }));
        }

        var principal = HttpContext?.User;
        var actor = principal?.Identity?.Name
            ?? principal?.FindFirst("sub")?.Value
            ?? "system";
        try
        {
            var result = await complianceService.ExecuteAnonymizationAsync(
                request.ExpectedEligibleCount,
                actor,
                cancellationToken);
            return Ok(ApiResponse<ComplianceExecutionResponse>.Ok(result));
        }
        catch (AnonymizationPreviewChangedException exception)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Lists paginated anonymization and compliance execution history.</summary>
    [HttpGet("audit-logs")]
    [RequirePermission(SystemPermissionCodes.ComplianceView)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ComplianceLogResponse>>>> GetAuditLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        if (page < 1 || pageSize is < 1 or > 100)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError
            {
                Title = "Trang phải lớn hơn 0 và kích thước trang phải từ 1 đến 100."
            }));
        }

        var result = await complianceService.GetAuditLogsAsync(page, pageSize, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ComplianceLogResponse>>.Ok(result));
    }
}
