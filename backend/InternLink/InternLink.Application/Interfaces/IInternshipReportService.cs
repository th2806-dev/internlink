namespace InternLink.Application.Interfaces;

/// <summary>
/// Generates the institutional C22A summary report (Excel fallback + official Word template).
/// File Excel C23 đầy đủ đi qua IExcelExportService.GenerateInternshipExportExcelAsync.
/// </summary>
public interface IInternshipReportService
{
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
