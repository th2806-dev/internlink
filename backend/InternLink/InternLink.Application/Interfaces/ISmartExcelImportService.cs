using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISmartExcelImportService
{
    Task<ExcelPreviewResponse> AnalyzeExcelAsync(
        Stream fileStream,
        string fileName,
        string? sheetName,
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
