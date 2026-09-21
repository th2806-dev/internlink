namespace InternLink.Application.DTOs.Export;

/// <summary>
/// Container holding all query datasets for generating the multi-sheet Excel export.
/// </summary>
public class InternshipExportDataDto
{
    public int TotalWeeks { get; set; }
    public List<InternshipStudentExportDto> Students { get; set; } = new();
    public List<CompanyExportDto> Companies { get; set; } = new();
    public List<LecturerAssignmentExportDto> LecturerAssignments { get; set; } = new();
}
