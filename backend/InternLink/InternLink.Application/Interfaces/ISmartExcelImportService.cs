using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISmartExcelImportService
{
    Task<ExcelPreviewResponse> AnalyzeExcelAsync(
        Stream fileStream,
        string fileName,
        string? sheetName,
        CancellationToken cancellationToken);

    Task<StagedExcelPreviewResponse> StageAndAnalyzeExcelAsync(
        Stream fileStream,
        string fileName,
        string? sheetName,
        string ownerKey,
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken);

    Task<ExcelValidationResult> ValidateImportAsync(
        ExcelImportRequest request,
        string ownerKey,
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken);

    Task<ImportCommitResult> ExecuteImportAsync(
        ExecuteExcelImportRequest request,
        string ownerKey,
        Guid? departmentId,
        string? tenantId,
        string? userName,
        CancellationToken cancellationToken);

    Task<ExcelErrorReportFile?> GetErrorReportAsync(
        Guid reportId,
        string ownerKey,
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<ExcelMappingPresetDto>> GetPresetsAsync(
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken);

    Task<ExcelMappingPresetDto?> GetPresetAsync(
        Guid id,
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken);

    Task<ExcelMappingPresetDto> SavePresetAsync(
        SaveExcelPresetRequest request,
        Guid? effectiveDepartmentId,
        string? tenantId,
        string? userName,
        CancellationToken cancellationToken);
}
