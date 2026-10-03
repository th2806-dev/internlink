using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>Creates and manages SQL Server backups for Super Admins.</summary>
[ApiController]
[Route(AdminApiRoutes.SuperAdminPrefix + "/backups")]
[Authorize(Policy = AdminPolicies.SuperAdmin)]
public sealed class SuperAdminBackupsController : ControllerBase
{
    private readonly IDatabaseBackupService _backupService;

    /// <summary>Initializes the backup controller.</summary>
    public SuperAdminBackupsController(IDatabaseBackupService backupService)
    {
        _backupService = backupService;
    }

    /// <summary>Lists available database backup files.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<BackupFileDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBackups(CancellationToken cancellationToken)
    {
        var backups = await _backupService.GetBackupsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<BackupFileDto>>.Ok(backups));
    }

    /// <summary>Creates a consistent SQL Server copy-only backup.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<BackupFileDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateBackup(CancellationToken cancellationToken)
    {
        var backup = await _backupService.CreateBackupAsync(cancellationToken);
        return CreatedAtAction(
            nameof(DownloadBackup),
            new { fileName = backup.FileName },
            ApiResponse<BackupFileDto>.Ok(backup));
    }

    /// <summary>Downloads a backup file.</summary>
    [HttpGet("{fileName}/download")]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadBackup(string fileName, CancellationToken cancellationToken)
    {
        try
        {
            var stream = await _backupService.OpenBackupAsync(fileName, cancellationToken);
            return stream is null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy tệp sao lưu." }))
                : File(stream, "application/octet-stream", fileName, enableRangeProcessing: true);
        }
        catch (ArgumentException)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Tên tệp sao lưu không hợp lệ." }));
        }
    }

    /// <summary>Deletes a stored backup file.</summary>
    [HttpDelete("{fileName}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteBackup(string fileName, CancellationToken cancellationToken)
    {
        try
        {
            return await _backupService.DeleteBackupAsync(fileName, cancellationToken)
                ? NoContent()
                : NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy tệp sao lưu." }));
        }
        catch (ArgumentException)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Tên tệp sao lưu không hợp lệ." }));
        }
    }

    /// <summary>Verifies a backup and replaces the current database after exact confirmation.</summary>
    [HttpPost("{fileName}/restore")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RestoreBackup(
        string fileName,
        [FromBody] RestoreBackupRequest request,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(request.Confirmation, "RESTORE", StringComparison.Ordinal))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Vui lòng xác nhận bằng chính xác từ RESTORE." }));

        try
        {
            await _backupService.RestoreBackupAsync(fileName, cancellationToken);
            return Ok(ApiResponse<object>.Ok(new { restored = true }));
        }
        catch (FileNotFoundException)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy tệp sao lưu." }));
        }
        catch (ArgumentException)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Tên tệp sao lưu không hợp lệ." }));
        }
    }
}
