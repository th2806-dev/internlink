using InternLink.Application.DTOs.Export;

namespace InternLink.Application.Interfaces;

/// <summary>
/// Service responsible for loading relational datasets from the database
/// and generating production-ready multi-sheet Excel reports based on the institutional template.
/// </summary>
public interface IExcelExportService
{
    /// <summary>
    /// Queries the relational database tables using optimized joins to produce the full export DTOs.
    /// </summary>
    Task<InternshipExportDataDto> GetExportDataAsync(Guid? semesterId = null, Guid? lecturerId = null, string? department = null, Guid? departmentId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Loads relational database data, opens the Excel template, dynamically injects data and formulas,
    /// preserves all styles and supporting sheets, and returns the generated .xlsx byte array.
    /// </summary>
    Task<byte[]> GenerateInternshipExportExcelAsync(Guid? semesterId = null, Guid? lecturerId = null, string? department = null, Guid? departmentId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates the Excel file given an already-constructed InternshipExportDataDto and an optional custom template path.
    /// </summary>
    byte[] GenerateFromData(InternshipExportDataDto data, string? templatePath = null);

    /// <summary>
    /// Generates the official faculty Guidance Schedule Excel (.xlsx) based on Lich huong dan TTTN-C23-Cuong.xlsx
    /// customized for a specific lecturer and semester.
    /// </summary>
    Task<byte[]> GenerateGuidanceScheduleExcelAsync(Guid semesterId, Guid lecturerId, CancellationToken cancellationToken = default);
}
