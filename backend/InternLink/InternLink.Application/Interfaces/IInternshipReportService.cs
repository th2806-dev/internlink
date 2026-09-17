namespace InternLink.Application.Interfaces;

/// <summary>
/// Generates institutional Excel/Word reports matching the C23 & C22A templates.
/// </summary>
public interface IInternshipReportService
{
    /// <summary>
    /// Export "DANH SÁCH THỰC TẬP" multi-sheet Excel matching C23 template.
    /// Sheets: DANH SÁCH (tracking & grading), DATABASE (mapping), TÊN CÔNG TY (company directory).
    /// </summary>
    Task<byte[]> ExportC23ExcelAsync(Guid? semesterId = null, string? department = null, Guid? departmentId = null);

    /// <summary>
    /// Export "Báo cáo tổng kết công tác thực tập tốt nghiệp" as Excel (fallback).
    /// </summary>
    Task<byte[]> ExportC22ASummaryReportAsync(Guid? semesterId = null, string? department = null, Guid? departmentId = null);

    /// <summary>
    /// Export "Báo cáo tổng kết công tác thực tập tốt nghiệp" as Word (.docx)
    /// using the C22A template with placeholder replacement and dynamic table population.
    /// </summary>
    Task<byte[]> ExportC22AWordReportAsync(Guid? semesterId = null, string? department = null, Guid? departmentId = null, Guid? lecturerId = null);
}
